import { readUnchangedFile, writeUnchangedFile, fileConflictSnapshot } from './linked-file-guard.js';
import React from "react";
import { STORAGE_KEY, isValidStore, normalizeStore, preserveLegacyRecovery } from "./model.js";
import {
  PersistenceError,
  classifyWorkspaceVersions,
  createLatestWriteQueue,
  deleteStoredFileHandle,
  digestText,
  downloadStorePayload,
  fileHandlePermission,
  loadPersistenceMeta,
  loadPersistenceSettings,
  loadStoredFileHandle,
  persistenceStatusIsUnsynced,
  readStoreFromFileHandle,
  recoveryFileName,
  savePersistenceMeta,
  savePersistenceSettings,
  saveStoredFileHandle,
  serializeStore,
  shouldWarnBeforeUnload,
  supportsFileSystemAccess,
  workspaceSummary,
  writeStoreToFileHandle,
} from "./persistence.js";

const WORKSPACE_FILE_TYPES = [{
  description: "Audit Project Workbench",
  accept: { "application/json": [".json"] },
}];

function errorCode(error) {
  if (error instanceof PersistenceError) return error.code;
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return "permission_required";
  return "unknown_error";
}

function pickerWasCancelled(error) {
  return error?.name === "AbortError";
}

export function useWorkbenchPersistence({ store, setStore }) {
  const [settings, setSettingsState] = React.useState(loadPersistenceSettings);
  const settingsRef = React.useRef(settings);
  const initialMetaRef = React.useRef(loadPersistenceMeta());
  const metaRef = React.useRef(initialMetaRef.current);
  const [status, setStatus] = React.useState(settings.mode === "linked_file" ? "reconnect_required" : "saved");
  const [linkedFileName, setLinkedFileName] = React.useState(initialMetaRef.current.linkedFileName);
  const [lastSavedAt, setLastSavedAt] = React.useState(settings.mode === "linked_file"
    ? initialMetaRef.current.lastSyncedAt : initialMetaRef.current.lastBrowserSavedAt);
  const [failure, setFailure] = React.useState("");
  const [browserWriteFailed, setBrowserWriteFailed] = React.useState(false);
  const [conflict, setConflict] = React.useState(null);
  const supported = supportsFileSystemAccess();
  const mountedRef = React.useRef(true);
  const serialized = React.useMemo(() => serializeStore(store), [store]);
  const currentPayloadRef = React.useRef(serialized);
  React.useLayoutEffect(() => { currentPayloadRef.current = serialized; }, [serialized]);
  const lastSyncedPayloadRef = React.useRef(null);
  const lastSyncedFileRef = React.useRef(null);
  const fileHandleRef = React.useRef(null);
  const fileReadyRef = React.useRef(false);
  const writerSessionRef = React.useRef(0);
  const writerRef = React.useRef(null);
  const callbackRef = React.useRef({});
  const fileOperationRef = React.useRef(false);
  const [fileOperationBusy, setFileOperationBusy] = React.useState(false);
  const withFileOperation = React.useCallback(async action => {
    if (fileOperationRef.current || !mountedRef.current) return false;
    fileOperationRef.current = true; setFileOperationBusy(true);
    try { return await action(); }
    finally { fileOperationRef.current = false; if (mountedRef.current) setFileOperationBusy(false); }
  }, []);

  const persistMeta = React.useCallback((patch) => {
    const next = { ...metaRef.current, ...patch };
    metaRef.current = next;
    try { savePersistenceMeta(next); } catch { /* metadata does not contain the workbench itself */ }
    return next;
  }, []);

  const applySettings = React.useCallback((patch) => {
    const next = { ...settingsRef.current, ...patch, version: 1 };
    try { savePersistenceSettings(next); } catch { /* workbench data remains separately protected */ }
    settingsRef.current = next;
    if (mountedRef.current) setSettingsState(next);
    return next;
  }, []);

  const markFailure = React.useCallback((error, fallback = "unknown_error") => {
    const code = errorCode(error) || fallback;
    if (code === "operation_cancelled") return;
    fileReadyRef.current = false;
    if (!mountedRef.current) return;
    setFailure(code);
    setStatus(code === "permission_required" || code === "missing_handle" ? "reconnect_required" : "error");
  }, []);

  const markLinkedSaved = React.useCallback(async (payload, handle = fileHandleRef.current) => {
    const session = writerSessionRef.current;
    const savedAt = new Date().toISOString();
    const digest = await digestText(payload);
    if (!mountedRef.current || session !== writerSessionRef.current) return;
    lastSyncedPayloadRef.current = payload;
    lastSyncedFileRef.current = payload;
    const fileName = handle?.name || metaRef.current.linkedFileName || "audit-project-workbench.apw.json";
    persistMeta({ linkedFileName: fileName, lastSyncedDigest: digest, lastSyncedAt: savedAt });
    if (!mountedRef.current) return;
    setLinkedFileName(fileName);
    setLastSavedAt(savedAt);
    setFailure("");
    setStatus(currentPayloadRef.current === payload ? "saved" : "unsynced");
  }, [persistMeta]);

  const markConflict = React.useCallback((handle, snapshot, changedSincePreview = false) => {
    fileReadyRef.current = false;
    if (!mountedRef.current) return;
    setConflict(fileConflictSnapshot(handle, snapshot, currentPayloadRef.current, workspaceSummary, changedSincePreview));
    setFailure(""); setStatus("conflict");
  }, []);
  callbackRef.current = { markFailure, markLinkedSaved, markConflict };

  const enqueueLinkedPayload = React.useCallback((payload) => {
    const handle = fileHandleRef.current;
    if (!handle || !fileReadyRef.current) return;
    writerRef.current?.enqueue({ payload, handle, session: writerSessionRef.current });
  }, []);

  const retireWriterSession = React.useCallback(async () => {
    fileReadyRef.current = false;
    writerSessionRef.current += 1;
    writerRef.current?.clear();
    await writerRef.current?.flush();
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    writerRef.current = createLatestWriteQueue(async (job) => {
      if (!job?.handle) throw new PersistenceError("missing_handle");
      if (await fileHandlePermission(job.handle) !== "granted") throw new PersistenceError("permission_required");
      const assertCurrent = () => { if (!mountedRef.current || job.session !== writerSessionRef.current
        || job.handle !== fileHandleRef.current) throw new PersistenceError("operation_cancelled"); };
      await writeUnchangedFile(job.handle, job.payload, lastSyncedFileRef.current || lastSyncedPayloadRef.current,
        { isValidStore, normalizeStore }, assertCurrent);
    }, {
      onQueued: (job) => job.session === writerSessionRef.current && mountedRef.current && setStatus("unsynced"),
      onStart: (job) => job.session === writerSessionRef.current && mountedRef.current && setStatus("saving"),
      onSaved: (job) => {
        if (job.session === writerSessionRef.current && job.handle === fileHandleRef.current) {
          return callbackRef.current.markLinkedSaved(job.payload, job.handle);
        }
        return undefined;
      },
      onError: (error, job) => {
        if (job.session === writerSessionRef.current && job.handle === fileHandleRef.current) {
          if (error.code === "operation_cancelled") return;
          if (error.code === "file_changed" && error.snapshot) return callbackRef.current.markConflict(job.handle, error.snapshot);
          return callbackRef.current.markFailure(error);
        }
        return undefined;
      },
    });
    return () => {
      mountedRef.current = false;
      writerRef.current?.dispose();
      writerRef.current = null;
    };
  }, []);

  const updateLinkedMetaFromPayload = React.useCallback(async (payload, handle, savedAt = new Date().toISOString(), fileSnapshot = null) => {
    const session = writerSessionRef.current;
    const digest = await digestText(payload);
    if (!mountedRef.current || session !== writerSessionRef.current) return;
    lastSyncedPayloadRef.current = payload;
    lastSyncedFileRef.current = fileSnapshot || payload;
    const fileName = handle?.name || metaRef.current.linkedFileName || "audit-project-workbench.apw.json";
    persistMeta({ linkedFileName: fileName, lastSyncedDigest: digest, lastSyncedAt: savedAt });
    if (mountedRef.current) {
      setLinkedFileName(fileName);
      setLastSavedAt(savedAt);
      setFailure("");
      setStatus("saved");
    }
  }, [persistMeta]);

  const reconcileHandle = React.useCallback(async (handle) => {
    const session = writerSessionRef.current;
    const assertCurrent = () => { if (!mountedRef.current || session !== writerSessionRef.current
      || settingsRef.current.mode !== "linked_file") throw new PersistenceError("operation_cancelled"); };
    assertCurrent();
    if (!handle) throw new PersistenceError("missing_handle");
    if (await fileHandlePermission(handle) !== "granted") throw new PersistenceError("permission_required");
    assertCurrent();
    if (mountedRef.current) setStatus("saving");
    const snapshot = await readStoreFromFileHandle(handle, { isValidStore, normalizeStore });
    const browserPayload = currentPayloadRef.current;
    const [browserDigest, fileDigest] = await Promise.all([digestText(browserPayload), digestText(snapshot.payload)]);
    assertCurrent();
    if (browserPayload !== currentPayloadRef.current) return reconcileHandle(handle);
    const resolution = classifyWorkspaceVersions({ browserDigest, fileDigest,
      lastSyncedDigest: metaRef.current.lastSyncedDigest });
    fileHandleRef.current = handle;
    if (mountedRef.current) setLinkedFileName(snapshot.fileName);

    if (resolution === "conflict") { markConflict(handle, snapshot); return "conflict"; }

    if (resolution === "browser_newer") {
      try { await writeUnchangedFile(handle, browserPayload, snapshot, { isValidStore, normalizeStore }, assertCurrent); }
      catch (error) {
        if (error.code === "file_changed" && error.snapshot) { markConflict(handle, error.snapshot, true); return "conflict"; }
        throw error;
      }
      fileReadyRef.current = true;
      await updateLinkedMetaFromPayload(browserPayload, handle);
      if (currentPayloadRef.current !== browserPayload) enqueueLinkedPayload(currentPayloadRef.current);
      return resolution;
    }

    fileReadyRef.current = true;
    if (resolution === "file_newer") {
      preserveLegacyRecovery(snapshot.sourcePayload);
      lastSyncedPayloadRef.current = snapshot.payload;
      setStore(snapshot.store);
      await updateLinkedMetaFromPayload(snapshot.payload, handle,
        snapshot.lastModified ? new Date(snapshot.lastModified).toISOString() : new Date().toISOString(), snapshot);
      return resolution;
    }

    await updateLinkedMetaFromPayload(browserPayload, handle,
      metaRef.current.lastSyncedAt || new Date().toISOString());
    if (currentPayloadRef.current !== browserPayload) enqueueLinkedPayload(currentPayloadRef.current);
    return resolution;
  }, [enqueueLinkedPayload, markConflict, setStore, updateLinkedMetaFromPayload]);

  React.useEffect(() => {
    let cancelled = false;
    const restoreLinkedFile = async () => {
      const session = writerSessionRef.current;
      const active = () => !cancelled && session === writerSessionRef.current && settingsRef.current.mode === "linked_file";
      if (!active()) return;
      if (!supported) {
        applySettings({ mode: "browser" });
        if (!cancelled) { setStatus("saved"); setFailure("unsupported"); }
        return;
      }
      try {
        const handle = await loadStoredFileHandle();
        if (!active()) return;
        if (!handle) throw new PersistenceError("missing_handle");
        fileHandleRef.current = handle;
        setLinkedFileName(handle.name || metaRef.current.linkedFileName);
        if (await fileHandlePermission(handle) !== "granted") throw new PersistenceError("permission_required");
        if (active()) await reconcileHandle(handle);
      } catch (error) {
        if (active()) markFailure(error);
      }
    };
    restoreLinkedFile();
    return () => { cancelled = true; };
  }, [applySettings, markFailure, reconcileHandle, supported]);

  React.useEffect(() => {
    const payload = serialized;
    currentPayloadRef.current = payload;
    const browserSavedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      setBrowserWriteFailed(false);
      persistMeta({ lastBrowserSavedAt: browserSavedAt });
    } catch (error) {
      if (mountedRef.current) setBrowserWriteFailed(true);
      return;
    }

    if (settingsRef.current.mode === "browser") {
      if (mountedRef.current) {
        setLastSavedAt(browserSavedAt);
        setFailure("");
        setStatus("saved");
      }
      return;
    }
    if (!fileReadyRef.current) return;
    if (payload === lastSyncedPayloadRef.current) {
      if (mountedRef.current) setStatus("saved");
      return;
    }
    enqueueLinkedPayload(payload);
  }, [enqueueLinkedPayload, persistMeta, serialized]);

  React.useEffect(() => {
    const shouldWarn = shouldWarnBeforeUnload(settings, browserWriteFailed ? "error" : status);
    if (!shouldWarn) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [settings.warnBeforeUnsyncedLeave, status, browserWriteFailed]);

  React.useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden" && settingsRef.current.mode === "linked_file") {
        writerRef.current?.flush();
      }
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => document.removeEventListener("visibilitychange", flushWhenHidden);
  }, []);

  const connectCurrentToNewFile = React.useCallback(async () => withFileOperation(async () => {
    if (!supported) { setFailure("unsupported"); return false; }
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: "audit-project-workbench.apw.json",
        types: WORKSPACE_FILE_TYPES });
      setStatus("saving");
      await retireWriterSession();
      const payload = currentPayloadRef.current;
      await writeStoreToFileHandle(handle, payload);
      await saveStoredFileHandle(handle);
      fileHandleRef.current = handle;
      fileReadyRef.current = true;
      applySettings({ mode: "linked_file" });
      setConflict(null);
      await updateLinkedMetaFromPayload(payload, handle);
      if (currentPayloadRef.current !== payload) enqueueLinkedPayload(currentPayloadRef.current);
      return true;
    } catch (error) {
      if (pickerWasCancelled(error)) return false;
      markFailure(error);
      return false;
    }
  }), [withFileOperation, applySettings, enqueueLinkedPayload, markFailure, retireWriterSession, supported, updateLinkedMetaFromPayload]);

  const chooseExistingFile = React.useCallback(async () => withFileOperation(async () => {
    if (!supported) { setFailure("unsupported"); return null; }
    try {
      const handles = await window.showOpenFilePicker({ multiple: false, types: WORKSPACE_FILE_TYPES });
      const handle = handles?.[0];
      if (!handle) return null;
      const snapshot = await readStoreFromFileHandle(handle, { isValidStore, normalizeStore });
      setFailure("");
      return { ...snapshot, handle, browserPayload: currentPayloadRef.current, currentSummary: workspaceSummary(JSON.parse(currentPayloadRef.current)) };
    } catch (error) {
      if (pickerWasCancelled(error)) return null;
      markFailure(error);
      return null;
    }
  }), [withFileOperation, markFailure, supported]);

  const activateExistingFile = React.useCallback(async (candidate) => withFileOperation(async () => {
    if (!candidate?.handle || !candidate?.store) return false;
    try {
      if (await fileHandlePermission(candidate.handle, true) !== "granted") throw new PersistenceError("permission_required");
      const verify = async () => {
        const snapshot = await readUnchangedFile(candidate.handle, candidate, { isValidStore, normalizeStore });
        if (candidate.browserPayload !== currentPayloadRef.current) throw new PersistenceError("preview_changed");
        return snapshot;
      };
      await verify(); setStatus("saving"); await retireWriterSession();
      const snapshot = await verify();
      await saveStoredFileHandle(candidate.handle);
      fileHandleRef.current = candidate.handle; fileReadyRef.current = true;
      lastSyncedPayloadRef.current = snapshot.payload;
      applySettings({ mode: "linked_file" }); setConflict(null); preserveLegacyRecovery(snapshot.sourcePayload);
      setStore(snapshot.store);
      await updateLinkedMetaFromPayload(snapshot.payload, candidate.handle,
        snapshot.lastModified ? new Date(snapshot.lastModified).toISOString() : new Date().toISOString(), snapshot);
      return true;
    } catch (error) { markFailure(error); return false; }
  }), [withFileOperation, applySettings, markFailure, retireWriterSession, setStore, updateLinkedMetaFromPayload]);

  const reconnect = React.useCallback(async () => withFileOperation(async () => {
    if (!supported) { setFailure("unsupported"); return false; }
    try {
      const handle = fileHandleRef.current || await loadStoredFileHandle();
      if (!handle) throw new PersistenceError("missing_handle");
      if (await fileHandlePermission(handle, true) !== "granted") throw new PersistenceError("permission_required");
      await retireWriterSession();
      await saveStoredFileHandle(handle);
      applySettings({ mode: "linked_file" });
      await reconcileHandle(handle);
      return true;
    } catch (error) {
      markFailure(error);
      return false;
    }
  }), [withFileOperation, applySettings, markFailure, reconcileHandle, retireWriterSession, supported]);

  const saveNow = React.useCallback(async () => {
    const payload = currentPayloadRef.current;
    try { localStorage.setItem(STORAGE_KEY, payload); }
    catch { setBrowserWriteFailed(true); return false; }
    setBrowserWriteFailed(false);
    try {
      const savedAt = new Date().toISOString();
      persistMeta({ lastBrowserSavedAt: savedAt });
      if (settingsRef.current.mode === "browser") {
        setLastSavedAt(savedAt); setFailure(""); setStatus("saved"); return true;
      }
      if (status === "conflict") return false;
      if (!fileReadyRef.current || !fileHandleRef.current) throw new PersistenceError("permission_required");
      enqueueLinkedPayload(payload);
      return await writerRef.current?.flush();
    } catch (error) {
      markFailure(error);
      return false;
    }
  }, [enqueueLinkedPayload, markFailure, persistMeta, status]);

  const disconnect = React.useCallback(async () => withFileOperation(async () => {
    await retireWriterSession();
    fileHandleRef.current = null;
    fileReadyRef.current = false;
    lastSyncedPayloadRef.current = null;
    setConflict(null);
    applySettings({ mode: "browser" });
    persistMeta({ linkedFileName: "", lastSyncedDigest: "", lastSyncedAt: "" });
    setLinkedFileName("");
    const saved = await saveNow();
    try { await deleteStoredFileHandle(); } catch { /* the external file is never deleted */ }
    return saved;
  }), [withFileOperation, applySettings, persistMeta, retireWriterSession, saveNow]);

  const setWarnBeforeUnsyncedLeave = React.useCallback((enabled) => {
    applySettings({ warnBeforeUnsyncedLeave: Boolean(enabled) });
  }, [applySettings]);

  const resolveConflict = React.useCallback(async (choice) => withFileOperation(async () => {
    if (!conflict || !['browser', 'file'].includes(choice)) return false;
    const handle = conflict.handle;
    try {
      await retireWriterSession();
      if (await fileHandlePermission(handle, true) !== 'granted') throw new PersistenceError('permission_required');
      const snapshot = await readUnchangedFile(handle, { payload: conflict.filePayload,
        sourcePayload: conflict.fileSourcePayload, store: conflict.fileStore }, { isValidStore, normalizeStore });
      const browserPayload = currentPayloadRef.current;
      if (snapshot.payload !== conflict.filePayload || browserPayload !== conflict.browserPayload) {
        markConflict(handle, snapshot, true); return false;
      }
      if (choice === 'browser') {
        downloadStorePayload(snapshot.sourcePayload, recoveryFileName('file'));
        setStatus('saving');
        await writeUnchangedFile(handle, browserPayload, snapshot, { isValidStore, normalizeStore });
        await saveStoredFileHandle(handle);
        fileHandleRef.current = handle; fileReadyRef.current = true; applySettings({ mode: 'linked_file' }); setConflict(null);
        await updateLinkedMetaFromPayload(browserPayload, handle);
        if (currentPayloadRef.current !== browserPayload) enqueueLinkedPayload(currentPayloadRef.current);
        return true;
      }
      await saveStoredFileHandle(handle);
      const final = await readUnchangedFile(handle, snapshot, { isValidStore, normalizeStore });
      if (browserPayload !== currentPayloadRef.current) { markConflict(handle, final, true); return false; }
      downloadStorePayload(browserPayload, recoveryFileName('browser'));
      fileHandleRef.current = handle; fileReadyRef.current = true; lastSyncedPayloadRef.current = final.payload;
      applySettings({ mode: 'linked_file' }); setConflict(null); setStore(final.store);
      await updateLinkedMetaFromPayload(final.payload, handle,
        final.lastModified ? new Date(final.lastModified).toISOString() : new Date().toISOString(), final);
      return true;
    } catch (error) {
      if (error.code === 'file_changed' && error.snapshot) markConflict(handle, error.snapshot, true);
      else markFailure(error);
      return false;
    }
  }), [withFileOperation, applySettings, conflict, enqueueLinkedPayload, markConflict, markFailure, retireWriterSession, setStore, updateLinkedMetaFromPayload]);

  return {
    settings,
    busy: fileOperationBusy,
    status: browserWriteFailed ? "error" : status,
    failure: browserWriteFailed ? "browser_write_failed" : failure,
    conflict,
    linkedFileName,
    lastSavedAt,
    supported,
    unsynced: browserWriteFailed || persistenceStatusIsUnsynced(status),
    connectCurrentToNewFile,
    chooseExistingFile,
    activateExistingFile,
    reconnect,
    saveNow,
    disconnect,
    setWarnBeforeUnsyncedLeave,
    resolveConflict,
  };
}
