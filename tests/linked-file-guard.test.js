import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalStorePayload, emptyStore, isValidStore, makeEntity, normalizeStore } from '../src/dashboard/model.js';
import { PersistenceError, serializeStore, workspaceSummary } from '../src/dashboard/persistence.js';
import { readUnchangedFile, writeUnchangedFile, fileConflictSnapshot } from '../src/dashboard/linked-file-guard.js';
const validators = { isValidStore, normalizeStore };
function fixture() {
  const store = canonicalStorePayload(emptyStore()); store.entities = [makeEntity({ id: 'fictional', legalName: 'Fictional Test Limited', notes: 'Original' })];
  const payload = serializeStore(normalizeStore(store)); const changed = structuredClone(store); changed.entities[0].notes = 'Changed';
  const state = { text: payload, opens: 0, writes: 0, closes: 0, aborts: 0 };
  const handle = { name: 'fictional.apw.json', getFile: async () => ({ name: 'fictional.apw.json', text: async () => state.text }),
    createWritable: async () => { state.opens++; let pending;
      return { write: async text => { state.writes++; pending = text; await state.onWrite?.(); },
        close: async () => { state.closes++; state.text = pending; }, abort: async () => { state.aborts++; } }; } };
  return { payload, changed: serializeStore(normalizeStore(changed)), state, handle };
}
test('matching semantic contents allow whitespace-only file formatting differences', async () => {
  const f = fixture(); f.state.text = JSON.stringify(JSON.parse(f.payload), null, 4);
  const result = await readUnchangedFile(f.handle, f.payload, validators);
  assert.equal(result.payload, f.payload); assert.equal(f.state.opens, 0);
});
test('a changed external file is rejected before opening a writable stream', async () => {
  const f = fixture(); f.state.text = f.changed;
  await assert.rejects(writeUnchangedFile(f.handle, f.payload, f.payload, validators), e => e.code === 'file_changed' && e.snapshot.payload === f.changed);
  assert.equal(f.state.opens, 0); assert.equal(f.state.text, f.changed);
});
test('a normal write commits once after rechecking unchanged file contents', async () => {
  const f = fixture(); await writeUnchangedFile(f.handle, f.changed, f.payload, validators);
  assert.equal(serializeStore(normalizeStore(JSON.parse(f.state.text))), f.changed);
  assert.equal(f.state.closes, 1); assert.equal(f.state.aborts, 0);
});
test('external changes during the stream write abort before close without replacing the file', async () => {
  const f = fixture(); f.state.onWrite = () => { f.state.text = f.changed; };
  await assert.rejects(writeUnchangedFile(f.handle, f.payload, f.payload, validators), e => e.code === 'file_changed');
  assert.equal(f.state.closes, 0); assert.equal(f.state.aborts, 1); assert.equal(f.state.text, f.changed);
});
test('damaged files remain untouched and do not get replaced by a browser snapshot', async () => {
  const f = fixture(); f.state.text = '{broken';
  await assert.rejects(writeUnchangedFile(f.handle, f.changed, f.payload, validators), e => e.code === 'invalid_file');
  assert.equal(f.state.opens, 0); assert.equal(f.state.text, '{broken');
});
test('a missing baseline fails closed instead of overwriting an unverified file', async () => {
  const f = fixture(); await assert.rejects(writeUnchangedFile(f.handle, f.changed, null, validators), e => e.code === 'file_changed');
  assert.equal(f.state.opens, 0);
});
test('a retired session can abort an open stream before its final commit', async () => {
  const f = fixture(); let current = true; f.state.onWrite = () => { current = false; };
  await assert.rejects(writeUnchangedFile(f.handle, f.changed, f.payload, validators, () => {
    if (!current) throw new PersistenceError('operation_cancelled');
  }), e => e.code === 'operation_cancelled');
  assert.equal(f.state.text, f.payload); assert.equal(f.state.closes, 0); assert.equal(f.state.aborts, 1);
});
test('stream failure aborts without claiming a successful commit', async () => {
  const f = fixture(); f.state.onWrite = () => { throw new Error('Synthetic disk failure'); };
  await assert.rejects(writeUnchangedFile(f.handle, f.changed, f.payload, validators), e => e.code === 'write_failed');
  assert.equal(f.state.closes, 0); assert.equal(f.state.aborts, 1); assert.equal(f.state.text, f.payload);
});
test('refreshed conflicts contain the current browser copy and preserve the file source for backup', async () => {
  const f = fixture(); const snapshot = await readUnchangedFile(f.handle, f.payload, validators);
  const conflict = fileConflictSnapshot(f.handle, snapshot, f.changed, workspaceSummary, true);
  assert.equal(conflict.browserPayload, f.changed); assert.equal(conflict.filePayload, f.payload);
  assert.equal(conflict.fileSourcePayload, snapshot.sourcePayload); assert.equal(conflict.changedSincePreview, true);
  assert.equal(f.state.text, f.payload);
});
test('unchanged legacy file previews retain the reviewed migrated identities', async () => {
  const f = fixture(); f.state.text = JSON.stringify({ version: 10, projects: [{ id: 'legacy-job',
    name: 'Legacy Fictional', entity: 'Legacy Fictional', workstreams: [], outstandingItems: [], taxDeadlines: [] }], groups: [] });
  const { readStoreFromFileHandle } = await import('../src/dashboard/persistence.js');
  const reviewed = await readStoreFromFileHandle(f.handle, validators);
  const rechecked = await readUnchangedFile(f.handle, reviewed, validators);
  assert.equal(rechecked.payload, reviewed.payload); assert.deepEqual(rechecked.store, reviewed.store);
  assert.equal(f.state.opens, 0);
});
test('first save after a reviewed legacy import writes the same identities in current format', async () => {
  const f = fixture(); f.state.text = JSON.stringify({ version: 10, projects: [{ id: 'legacy-job',
    name: 'Legacy Fictional', entity: 'Legacy Fictional', workstreams: [], outstandingItems: [], taxDeadlines: [] }], groups: [] });
  const { readStoreFromFileHandle } = await import('../src/dashboard/persistence.js');
  const reviewed = await readStoreFromFileHandle(f.handle, validators);
  await writeUnchangedFile(f.handle, reviewed.payload, reviewed, validators);
  assert.deepEqual(JSON.parse(f.state.text), JSON.parse(reviewed.payload)); assert.equal(f.state.closes, 1);
});
