import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { packTranslationValues, translationKeys } from '../scripts/translation-compaction.mjs';
const source = readFileSync(new URL('../src/dashboard/i18n.jsx', import.meta.url), 'utf8');
const dictionary = code => JSON.parse(runInNewContext(code.slice(code.indexOf('const english ='), code.indexOf('const LanguageContext'))
  + '\nJSON.stringify({ english, translationKeyIndex })'));
test('production packing retains every exact translation, override and key index', () => {
  const packed = packTranslationValues(source);
  assert.deepEqual(dictionary(packed), dictionary(source));
  assert.deepEqual(translationKeys(packed), translationKeys(source));
  assert.ok(Buffer.byteLength(packed) < Buffer.byteLength(source) - 5000);
});
test('token-like literal translations are left untouched', () => {
  const input = source.replace('Simple mode', '~10~ Simple mode');
  assert.equal(packTranslationValues(input), input);
});
