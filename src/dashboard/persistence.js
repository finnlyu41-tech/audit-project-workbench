export const PERSISTENCE_SETTINGS_KEY = "audit-progress-workbench:persistence-settings";
export const PERSISTENCE_META_KEY = "audit-progress-workbench:persistence-meta";
export const PERSISTENCE_DB_NAME = "audit-progress-workbench-persistence";
export const PERSISTENCE_HANDLE_STORE = "file-handles";
export const PERSISTENCE_HANDLE_KEY = "workspace";

export const DEFAULT_PERSISTENCE_SETTINGS = Object.freeze({
  version: 1,
  mode: "browser",
  warnBeforeUnsyncedLeave: true,
});

export class PersistenceError extends Error {
  constructor(code, cause = null) {
    super(code);
    this.name = "PersistenceError";
    this.code = code;
    this.cause = cause;
  }
}

export function normalizePersistenceSettings(value) {
  return {
    version: 1,
    mode: value?.mode === "linked_file" ? "linked_file" : "browser",
    warnBeforeUnsyncedLeave: value?.warnBeforeUnsyncedLeave !== false,
  };
}

export function normalizePersistenceMeta(value) {
  return {
    version: 1,
    linkedFileName: typeof value?.linkedFileName === "string" ? value.linkedFileName : "",
    lastSyncedDigest: typeof value?.lastSyncedDigest === "string" ? value.lastSyncedDigest : "",
    lastSyncedAt: typeof value?.lastSyncedAt === "string" ? value.lastSyncedAt : "",
    lastBrowserSavedAt: typeof value?.lastBrowserSavedAt === "string" ? value.lastBrowserSavedAt : "",
  };
}

function loadJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem?.(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function loadPersistenceSettings(storage = globalThis.localStorage) {
  return normalizePersistenceSettings(loadJson(storage, PERSISTENCE_SETTINGS_KEY, null));
}

export function savePersistenceSettings(settings, storage = globalThis.localStorage) {
  const normalized = normalizePersistenceSettings(settings);
  storage?.setItem?.(PERSISTENCE_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadPersistenceMeta(storage = globalThis.localStorage) {
  return normalizePersistenceMeta(loadJson(storage, PERSISTENCE_META_KEY, null));
}

export function savePersistenceMeta(meta, storage = globalThis.localStorage) {
  const normalized = normalizePersistenceMeta(meta);
  storage?.setItem?.(PERSISTENCE_META_KEY, JSON.stringify(normalized));
  return normalized;
}

export function serializeStore(store) {
  if (Number(store?.version) >= 11 && Array.isArray(store?.entities) && Array.isArray(store?.engagements)) {
    const { projects: _projects, groups: _groups, ...canonical } = store;
    return JSON.stringify(canonical);
  }
  return JSON.stringify(store);
}

export function formatStorePayload(payload) {
  return `${JSON.stringify(JSON.parse(payload), null, 2)}\n`;
}

export async function digestText(text, cryptoApi = globalThis.crypto) {
  if (cryptoApi?.subtle && typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(text);
    const digest = await cryptoApi.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fallback-${text.length}-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function classifyWorkspaceVersions({ browserDigest, fileDigest, lastSyncedDigest }) {
  if (browserDigest === fileDigest) return "same";
  if (!lastSyncedDigest) return "conflict";
  if (fileDigest === lastSyncedDigest && browserDigest !== lastSyncedDigest) return "browser_newer";
  if (browserDigest === lastSyncedDigest && fileDigest !== lastSyncedDigest) return "file_newer";
  return "conflict";
}

export function persistenceStatusIsUnsynced(status) {
  return ["saving", "unsynced", "reconnect_required", "conflict", "error"].includes(status);
}

export function shouldWarnBeforeUnload(settings, status) {
  return settings?.warnBeforeUnsyncedLeave !== false && persistenceStatusIsUnsynced(status);
}

export function supportsFileSystemAccess(windowApi = globalThis.window) {
  return Boolean(windowApi?.isSecureContext
    && typeof windowApi.showSaveFilePicker === "function"
    && typeof windowApi.showOpenFilePicker === "function");
}

export function workspaceSummary(store) {
  const records = Number(store?.version) >= 11 && Array.isArray(store?.entities)
    ? [...store.entities, ...(store.engagements || [])]
    : [...(store?.projects || []), ...(store?.groups || [])];
  const timestamps = records
    .map((item) => item?.updatedAt).filter(Boolean).sort();
  const entities = Array.isArray(store?.entities) ? store.entities.length
    : (store?.projects?.length || 0) + (store?.groups?.length || 0);
  const engagements = Array.isArray(store?.engagements) ? store.engagements.length
    : (store?.projects?.length || 0) + (store?.groups?.length || 0);
  const holdingCompanies = Array.isArray(store?.entities)
    ? store.entities.filter((entity) => entity.kind === "holding_company").length : (store?.groups?.length || 0);
  return {
    version: Number(store?.version) || 0,
    entities,
    engagements,
    holdingCompanies,
    projects: Array.isArray(store?.projects) ? store.projects.length : 0,
    groups: Array.isArray(store?.groups) ? store.groups.length : 0,
    updatedAt: timestamps.at(-1) || "",
  };
}

export function recoveryFileName(source, now = new Date()) {
  const timestamp = now.toISOString().replace(/[:.]/gu, "-");
  return `audit-project-workbench-recovery-${source}-${timestamp}.json`;
}

export function downloadStorePayload(payload, filename, documentApi = globalThis.document, urlApi = globalThis.URL) {
  if (!documentApi?.createElement || !urlApi?.createObjectURL) return false;
  const blob = new Blob([formatStorePayload(payload)], { type: "application/json" });
  const url = urlApi.createObjectURL(blob);
  const anchor = documentApi.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  urlApi.revokeObjectURL(url);
  return true;
}

export async function fileHandlePermission(handle, request = false) {
  if (!handle) return "denied";
  if (typeof handle.queryPermission !== "function") return "granted";
  let permission = await handle.queryPermission({ mode: "readwrite" });
  if (permission === "prompt" && request && typeof handle.requestPermission === "function") {
    permission = await handle.requestPermission({ mode: "readwrite" });
  }
  return permission;
}

export async function readStoreFromFileHandle(handle, { isValidStore, normalizeStore }) {
  try {
    const file = await handle.getFile();
    const sourcePayload = await file.text();
    const parsed = JSON.parse(sourcePayload);
    if (!isValidStore(parsed)) throw new PersistenceError("invalid_file");
    const store = normalizeStore(parsed);
    return {
      fileName: file.name || handle.name || "audit-project-workbench.apw.json",
      lastModified: Number(file.lastModified) || 0,
      store,
      payload: serializeStore(store),
      sourcePayload,
      sourceVersion: Number(parsed.version) || 1,
      summary: workspaceSummary(store),
    };
  } catch (error) {
    if (error instanceof PersistenceError) throw error;
    if (error instanceof SyntaxError) throw new PersistenceError("invalid_file", error);
    throw new PersistenceError("read_failed", error);
  }
}

export async function writeStoreToFileHandle(handle, payload) {
  let writable;
  try {
    writable = await handle.createWritable();
    await writable.write(formatStorePayload(payload));
    await writable.close();
  } catch (error) {
    try { await writable?.abort?.(); } catch { /* best effort */ }
    throw new PersistenceError("write_failed", error);
  }
}

export function createLatestWriteQueue(write, { delay = 300, onQueued, onStart, onSaved, onError } = {}) {
  let pending = null;
  let timer = null;
  let running = false;
  let drainPromise = Promise.resolve(true);
  let disposed = false;

  const clearTimer = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };

  const drain = () => {
    clearTimer();
    if (running) return drainPromise;
    running = true;
    drainPromise = (async () => {
      let succeeded = true;
      while (!disposed && pending !== null) {
        const payload = pending;
        pending = null;
        onStart?.(payload);
        try {
          await write(payload);
          await onSaved?.(payload);
        } catch (error) {
          succeeded = false;
          pending = null;
          await onError?.(error, payload);
          break;
        }
      }
      return succeeded;
    })().finally(() => { running = false; });
    return drainPromise;
  };

  return {
    enqueue(payload) {
      if (disposed) return;
      pending = payload;
      onQueued?.(payload);
      clearTimer();
      timer = setTimeout(drain, delay);
    },
    flush() {
      return drain();
    },
    clear() {
      pending = null;
      clearTimer();
    },
    dispose() {
      disposed = true;
      pending = null;
      clearTimer();
    },
  };
}

function openPersistenceDatabase(indexedDb = globalThis.indexedDB) {
  if (!indexedDb?.open) return Promise.reject(new PersistenceError("handle_storage_unavailable"));
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(PERSISTENCE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PERSISTENCE_HANDLE_STORE)) {
        request.result.createObjectStore(PERSISTENCE_HANDLE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new PersistenceError("handle_storage_failed", request.error));
  });
}

async function withHandleStore(mode, operation, indexedDb = globalThis.indexedDB) {
  const database = await openPersistenceDatabase(indexedDb);
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(PERSISTENCE_HANDLE_STORE, mode);
      const store = transaction.objectStore(PERSISTENCE_HANDLE_STORE);
      const request = operation(store);
      let result;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(new PersistenceError("handle_storage_failed", request.error));
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(new PersistenceError("handle_storage_failed", transaction.error));
      transaction.onerror = () => reject(new PersistenceError("handle_storage_failed", transaction.error));
    });
  } finally {
    database.close();
  }
}

export function loadStoredFileHandle(indexedDb = globalThis.indexedDB) {
  return withHandleStore("readonly", (store) => store.get(PERSISTENCE_HANDLE_KEY), indexedDb);
}

export function saveStoredFileHandle(handle, indexedDb = globalThis.indexedDB) {
  return withHandleStore("readwrite", (store) => store.put(handle, PERSISTENCE_HANDLE_KEY), indexedDb);
}

export function deleteStoredFileHandle(indexedDb = globalThis.indexedDB) {
  return withHandleStore("readwrite", (store) => store.delete(PERSISTENCE_HANDLE_KEY), indexedDb);
}
