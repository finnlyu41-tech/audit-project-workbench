import { PersistenceError, readStoreFromFileHandle, writeStoreToFileHandle } from './persistence.js';

// This is optimistic content checking, not an atomic lock against other programs/devices.
export async function readUnchangedFile(handle, expected, validators) {
  const snapshot = await readStoreFromFileHandle(handle, validators);
  const expectedPayload = typeof expected === 'string' ? expected : expected?.payload;
  // An unchanged legacy source must reuse its reviewed migration identity, not generate fresh IDs.
  if (expected?.store && snapshot.sourcePayload === expected.sourcePayload) {
    return { ...snapshot, payload: expected.payload, store: expected.store };
  }
  if (typeof expectedPayload !== 'string' || snapshot.payload !== expectedPayload) {
    const error = new PersistenceError('file_changed'); error.snapshot = snapshot; throw error;
  }
  return snapshot;
}
export async function writeUnchangedFile(handle, payload, expectedPayload, validators, assertCurrent = () => {}) {
  assertCurrent();
  await readUnchangedFile(handle, expectedPayload, validators);
  assertCurrent();
  await writeStoreToFileHandle(handle, payload, { beforeCommit: async () => {
    await readUnchangedFile(handle, expectedPayload, validators); assertCurrent();
  } });
}
export function fileConflictSnapshot(handle, snapshot, browserPayload, summary, changedSincePreview = false) {
  return { handle, browserPayload, browserSummary: summary(JSON.parse(browserPayload)),
    filePayload: snapshot.payload, fileSourcePayload: snapshot.sourcePayload, fileStore: snapshot.store,
    fileSummary: snapshot.summary, fileName: snapshot.fileName, fileLastModified: snapshot.lastModified,
    changedSincePreview };
}
