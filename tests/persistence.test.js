import assert from "node:assert/strict";
import test from "node:test";
import { emptyStore, isValidStore, normalizeStore } from "../src/dashboard/model.js";
import {
  classifyWorkspaceVersions,
  createLatestWriteQueue,
  digestText,
  fileHandlePermission,
  formatStorePayload,
  normalizePersistenceMeta,
  normalizePersistenceSettings,
  persistenceStatusIsUnsynced,
  readStoreFromFileHandle,
  serializeStore,
  shouldWarnBeforeUnload,
  supportsFileSystemAccess,
  workspaceSummary,
  writeStoreToFileHandle,
} from "../src/dashboard/persistence.js";

test("persistence settings default to browser autosave and keep leave protection enabled", () => {
  assert.deepEqual(normalizePersistenceSettings(null), {
    version: 1,
    mode: "browser",
    warnBeforeUnsyncedLeave: true,
  });
  assert.deepEqual(normalizePersistenceSettings({ version: 99, mode: "linked_file", warnBeforeUnsyncedLeave: false }), {
    version: 1,
    mode: "linked_file",
    warnBeforeUnsyncedLeave: false,
  });
  assert.deepEqual(normalizePersistenceSettings({ mode: "cloud" }), {
    version: 1,
    mode: "browser",
    warnBeforeUnsyncedLeave: true,
  });
});

test("device metadata is normalized independently from the version 9 workbench", () => {
  assert.deepEqual(normalizePersistenceMeta({ linkedFileName: 123, lastSyncedDigest: "abc", lastSyncedAt: null }), {
    version: 1,
    linkedFileName: "",
    lastSyncedDigest: "abc",
    lastSyncedAt: "",
    lastBrowserSavedAt: "",
  });
  assert.equal(emptyStore().version, 9);
});

test("startup reconciliation distinguishes one-sided changes from a true conflict", () => {
  assert.equal(classifyWorkspaceVersions({ browserDigest: "same", fileDigest: "same", lastSyncedDigest: "old" }), "same");
  assert.equal(classifyWorkspaceVersions({ browserDigest: "new", fileDigest: "old", lastSyncedDigest: "old" }), "browser_newer");
  assert.equal(classifyWorkspaceVersions({ browserDigest: "old", fileDigest: "new", lastSyncedDigest: "old" }), "file_newer");
  assert.equal(classifyWorkspaceVersions({ browserDigest: "browser", fileDigest: "file", lastSyncedDigest: "old" }), "conflict");
  assert.equal(classifyWorkspaceVersions({ browserDigest: "browser", fileDigest: "file", lastSyncedDigest: "" }), "conflict");
});

test("only incomplete persistence states require leave protection", () => {
  assert.equal(persistenceStatusIsUnsynced("saved"), false);
  for (const state of ["saving", "unsynced", "reconnect_required", "conflict", "error"]) {
    assert.equal(persistenceStatusIsUnsynced(state), true, state);
  }
  assert.equal(shouldWarnBeforeUnload({ warnBeforeUnsyncedLeave: true }, "unsynced"), true);
  assert.equal(shouldWarnBeforeUnload({ warnBeforeUnsyncedLeave: false }, "unsynced"), false);
  assert.equal(shouldWarnBeforeUnload({ warnBeforeUnsyncedLeave: true }, "saved"), false);
});

test("workbench serialization is stable and file output stays valid JSON", async () => {
  const store = emptyStore();
  const payload = serializeStore(store);
  assert.equal(serializeStore(JSON.parse(payload)), payload);
  assert.deepEqual(JSON.parse(formatStorePayload(payload)), store);
  assert.equal(await digestText(payload), await digestText(payload));
  assert.notEqual(await digestText(payload), await digestText(`${payload} `));
  assert.deepEqual(workspaceSummary(store), { version: 9, projects: 0, groups: 0, updatedAt: "" });
});

test("linked-file reads validate and normalize the same V9 structure used by backups", async () => {
  const source = emptyStore();
  source.projects.push({ id: "legacy", name: "Legacy", nodes: [], version: 1 });
  const handle = {
    name: "engagement.apw.json",
    async getFile() {
      return { name: this.name, lastModified: Date.UTC(2026, 8, 3), async text() {
        return JSON.stringify({ version: 1, projects: source.projects });
      } };
    },
  };
  const snapshot = await readStoreFromFileHandle(handle, { isValidStore, normalizeStore });
  assert.equal(snapshot.store.version, 9);
  assert.equal(snapshot.store.projects[0].id, "legacy");
  assert.equal(snapshot.fileName, "engagement.apw.json");
  assert.equal(JSON.parse(snapshot.payload).version, 9);
});

test("file writes close successfully and preserve the complete payload", async () => {
  const writes = [];
  let closed = false;
  const handle = { async createWritable() { return {
    async write(value) { writes.push(value); },
    async close() { closed = true; },
  }; } };
  const payload = serializeStore(emptyStore());
  await writeStoreToFileHandle(handle, payload);
  assert.equal(closed, true);
  assert.deepEqual(JSON.parse(writes[0]), JSON.parse(payload));
});

test("the serial writer drops superseded pending versions and writes the latest one last", async () => {
  const writes = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => { releaseFirst = resolve; });
  const queue = createLatestWriteQueue(async (payload) => {
    writes.push(payload);
    if (payload === "first") await firstGate;
  }, { delay: 60000 });

  queue.enqueue("first");
  const flushing = queue.flush();
  await Promise.resolve();
  queue.enqueue("second");
  queue.enqueue("latest");
  releaseFirst();
  await flushing;
  queue.dispose();
  assert.deepEqual(writes, ["first", "latest"]);
});

test("file-system mode is offered only in a secure browser with both picker APIs", () => {
  assert.equal(supportsFileSystemAccess({ isSecureContext: true, showSaveFilePicker() {}, showOpenFilePicker() {} }), true);
  assert.equal(supportsFileSystemAccess({ isSecureContext: false, showSaveFilePicker() {}, showOpenFilePicker() {} }), false);
  assert.equal(supportsFileSystemAccess({ isSecureContext: true, showSaveFilePicker() {} }), false);
});

test("file permission is queried silently and requested only for a user-triggered reconnect", async () => {
  let requested = 0;
  const handle = {
    async queryPermission() { return "prompt"; },
    async requestPermission() { requested += 1; return "granted"; },
  };
  assert.equal(await fileHandlePermission(handle, false), "prompt");
  assert.equal(requested, 0);
  assert.equal(await fileHandlePermission(handle, true), "granted");
  assert.equal(requested, 1);
});
