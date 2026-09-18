import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const viteRequire = createRequire(require.resolve('vite/package.json'));
const { parseAst } = await import(pathToFileURL(viteRequire.resolve('rolldown/parseAst')));
export function walkAst(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const child of node) walkAst(child, visit); return; }
  if (node.type) visit(node);
  for (const [key, value] of Object.entries(node)) if (!['start', 'end', 'raw'].includes(key)) walkAst(value, visit);
}
export function chineseLiterals(code, filename = 'file.jsx') {
  const values = new Set(); walkAst(parseAst(code, { lang: filename.endsWith('.jsx') ? 'jsx' : 'js' }, filename), node => {
    if (node.type === 'Literal' && typeof node.value === 'string' && /[\u3400-\u9fff]/u.test(node.value)) values.add(node.value);
  }); return [...values];
}
// Derive JavaScript's insertion order from the declaration and explicit Object.assign
// extensions, including later overrides. No evaluation of JSX or arbitrary source.
export function translationKeys(code) {
  const keys = new Set(), ast = parseAst(code, { lang: 'jsx' }, 'i18n.jsx');
  const collect = obj => { if (obj?.type !== 'ObjectExpression') throw new Error('Translation dictionary must be a static object');
    for (const property of obj.properties) {
      if (property.type !== 'Property' || property.computed || property.key.type !== 'Literal' || typeof property.key.value !== 'string') throw new Error('Unsupported dictionary property');
      keys.add(property.key.value);
    }
  };
  for (const node of ast.body) {
    if (node.type === 'VariableDeclaration') for (const decl of node.declarations) if (decl.id.name === 'english') collect(decl.init);
    if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
      const call = node.expression;
      if (call.callee.type === 'MemberExpression' && call.callee.object.name === 'Object' && call.callee.property.name === 'assign'
        && call.arguments[0]?.name === 'english') for (const obj of call.arguments.slice(1)) collect(obj);
    }
  }
  // There must be no integer-like keys whose enumeration order differs from insertion order.
  if ([...keys].some(key => /^(?:0|[1-9]\d*)$/u.test(key))) throw new Error('Numeric translation keys are not supported');
  return [...keys];
}
export function compactTranslationCalls(code, keys, filename) {
  const index = new Map(keys.map((key, i) => [key, i])), edits = [];
  walkAst(parseAst(code, { lang: filename.endsWith('.jsx') ? 'jsx' : 'js' }, filename), node => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'Identifier' || node.callee.name !== 't') return;
    const addArgument = arg => {
      if (!arg) return;
      if (arg.type === 'Literal' && typeof arg.value === 'string' && index.has(arg.value))
        edits.push({ start: arg.start, end: arg.end, id: index.get(arg.value) + 1 });
      else if (arg.type === 'ConditionalExpression') { addArgument(arg.consequent); addArgument(arg.alternate); }
      else if (arg.type === 'LogicalExpression') { addArgument(arg.left); addArgument(arg.right); }
      else if (arg.type === 'MemberExpression' && arg.object.type === 'ObjectExpression')
        for (const prop of arg.object.properties) if (prop.type === 'Property') addArgument(prop.value);
    };
    // One-based indexes preserve truthiness in fallback expressions such as table[id] || text.
    addArgument(node.arguments[0]);
  });
  for (const edit of edits.sort((a, b) => b.start - a.start)) code = code.slice(0, edit.start) + String(edit.id) + code.slice(edit.end);
  return code;
}
// Losslessly share repeated long words in the static English dictionary. Decode
// synchronously before its key index is built; authored/user text is never touched.
export function packTranslationValues(code) {
  const ast = parseAst(code, { lang: 'jsx' }, 'i18n.jsx'), values = [];
  const collect = obj => {
    if (obj?.type !== 'ObjectExpression') throw new Error('Translation dictionary must be static');
    for (const property of obj.properties) {
      if (property.type !== 'Property' || property.value.type !== 'Literal'
        || typeof property.value.value !== 'string') throw new Error('Translation values must be strings');
      values.push(property.value);
    }
  };
  for (const node of ast.body) {
    if (node.type === 'VariableDeclaration') for (const decl of node.declarations) if (decl.id.name === 'english') collect(decl.init);
    if (node.type === 'ExpressionStatement' && node.expression.type === 'CallExpression') {
      const call = node.expression;
      if (call.callee.type === 'MemberExpression' && call.callee.object.name === 'Object' && call.callee.property.name === 'assign'
        && call.arguments[0]?.name === 'english') call.arguments.slice(1).forEach(collect);
    }
  }
  if (values.some(node => /~\d+~/u.test(node.value))) return code;
  const counts = new Map();
  for (const node of values) for (const word of node.value.match(/\b[A-Za-z]{8,}\b/gu) || []) counts.set(word, (counts.get(word) || 0) + 1);
  const words = [...counts].filter(([word, count]) => count * (word.length - 5) > word.length + 4)
    .sort((a, b) => b[1] * (b[0].length - 5) - a[1] * (a[0].length - 5)).slice(0, 100).map(([word]) => word);
  if (!words.length) return code;
  const ids = new Map(words.map((word, i) => [word, i]));
  for (const node of values.sort((a, b) => b.start - a.start)) {
    const packed = node.value.replace(/\b[A-Za-z]{8,}\b/gu, word => ids.has(word) ? `~${ids.get(word)}~` : word);
    code = code.slice(0, node.start) + JSON.stringify(packed) + code.slice(node.end);
  }
  const decoder = `const apwTranslationWords = ${JSON.stringify(words)};\nfor (const key of Object.keys(english)) english[key] = english[key].replace(/~(\\d+)~/g, (_, index) => apwTranslationWords[Number(index)]);\n`;
  return code.replace('const translationKeyIndex =', decoder + 'const translationKeyIndex =');
}
export function translationCompaction() {
  let keys;
  return { name: 'apw-static-translation-keys', apply: 'build', enforce: 'pre',
    buildStart() { keys = translationKeys(readFileSync(new URL('../src/dashboard/i18n.jsx', import.meta.url), 'utf8')); },
    transform(code, id) {
      if (!/[\\/]src[\\/].*\.(?:js|jsx)$/u.test(id)) return null;
      if (/[\\/]i18n\.jsx$/u.test(id)) return { code: packTranslationValues(code), map: null };
      const compact = compactTranslationCalls(code, keys, id);
      return compact === code ? null : { code: compact, map: null };
    } };
}
