import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStartupPayload, readWorkspaceStartup, restoreStartupBackup } from '../src/dashboard/workspace-startup.js';
import { canonicalStorePayload, emptyStore, STORAGE_KEY } from '../src/dashboard/model.js';
import { PERSISTENCE_SETTINGS_KEY } from '../src/dashboard/persistence.js';
const valid = () => JSON.stringify(canonicalStorePayload(emptyStore()));
function memory(raw = null) {
  const data = new Map(raw === null ? [] : [[STORAGE_KEY, raw]]); const writes = [];
  return { data, writes, getItem: (key) => data.get(key) ?? null,
    setItem(key, value) { writes.push(key); data.set(key, value); } };
}
test('an absent workspace is distinct from damaged, empty or future data', () => {
  assert.ok(parseStartupPayload(null).store);
  for (const raw of ['', 'null', 'garbage', '{}', '{"version":11,"entities":[]}']) {
    const snapshot = parseStartupPayload(raw); assert.equal(snapshot.error, 'invalid_data'); assert.equal(snapshot.raw, raw);
  }
  assert.equal(parseStartupPayload('{"version":99}').error, 'newer_version');
});
test('startup reading is side-effect free for current, legacy and damaged records', () => {
  for (const raw of [valid(), '{"version":10,"projects":[],"groups":[]}', '{broken']) {
    const storage = memory(raw); const snapshot = readWorkspaceStartup(storage);
    assert.equal(snapshot.raw, raw); assert.deepEqual(storage.writes, []); assert.equal(storage.data.get(STORAGE_KEY), raw);
    if (!snapshot.error) assert.equal(snapshot.store.version, 11);
  }
});
test('permission failures do not manufacture an empty workspace', () => {
  const result = readWorkspaceStartup({ getItem() { throw new Error('denied'); } });
  assert.deepEqual(result, { raw: null, error: 'read_failed' });
});
test('invalid restore candidates never write data or preferences', () => {
  const storage = memory('{broken'); const snapshot = readWorkspaceStartup(storage);
  for (const raw of ['{bad', '{"version":99}', null]) assert.throws(() => restoreStartupBackup(snapshot, raw, storage), /invalid_backup/);
  assert.deepEqual(storage.writes, []);
});
test('recovery refuses a stale source and an unreadable original', () => {
  const storage = memory('{broken'); const snapshot = readWorkspaceStartup(storage);
  storage.data.set(STORAGE_KEY, valid());
  assert.throws(() => restoreStartupBackup(snapshot, valid(), storage), /source_changed/);
  assert.throws(() => restoreStartupBackup({ error: 'read_failed', raw: null }, valid(), storage), /source_changed/);
  assert.deepEqual(storage.writes, []);
});
test('confirmed recovery writes the valid backup and pauses rather than overwrites a linked file', () => {
  const storage = memory('{broken'); storage.data.set(PERSISTENCE_SETTINGS_KEY, '{"mode":"linked_file"}');
  const snapshot = readWorkspaceStartup(storage); const raw = valid();
  const next = restoreStartupBackup(snapshot, raw, storage);
  assert.ok(next.store); assert.deepEqual(JSON.parse(storage.data.get(STORAGE_KEY)), JSON.parse(raw));
  assert.equal(JSON.parse(storage.data.get(PERSISTENCE_SETTINGS_KEY)).mode, 'browser');
  assert.deepEqual(storage.writes, [PERSISTENCE_SETTINGS_KEY, STORAGE_KEY]);
});
test('a failed recovery write leaves the original bytes intact', () => {
  const storage = memory('{broken'); const snapshot = readWorkspaceStartup(storage);
  storage.setItem = (key) => { if (key === STORAGE_KEY) throw new Error('quota'); };
  assert.throws(() => restoreStartupBackup(snapshot, valid(), storage), /quota/);
  assert.equal(storage.data.get(STORAGE_KEY), '{broken');
});
test('a blocked preference write stops recovery before replacing browser records', () => {
  const storage = memory('{broken'); const snapshot = readWorkspaceStartup(storage);
  storage.setItem = () => { throw new Error('denied'); };
  assert.throws(() => restoreStartupBackup(snapshot, valid(), storage), /denied/); assert.equal(storage.data.get(STORAGE_KEY), '{broken');
});
