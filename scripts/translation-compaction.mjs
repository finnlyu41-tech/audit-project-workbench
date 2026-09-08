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
export function translationCompaction() {
  let keys;
  return { name: 'apw-static-translation-keys', apply: 'build', enforce: 'pre',
    buildStart() { keys = translationKeys(readFileSync(new URL('../src/dashboard/i18n.jsx', import.meta.url), 'utf8')); },
    transform(code, id) {
      if (!/[\\/]src[\\/].*\.(?:js|jsx)$/u.test(id) || id.endsWith('/i18n.jsx')) return null;
      const compact = compactTranslationCalls(code, keys, id);
      return compact === code ? null : { code: compact, map: null };
    } };
}
