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
  const [conflict, setConflict] = React.useState(null);
  const supported = supportsFileSystemAccess();
  const mountedRef = React.useRef(true);
  const currentPayloadRef = React.useRef(serializeStore(store));
  const lastSyncedPayloadRef = React.useRef(null);
  const fileHandleRef = React.useRef(null);
  const fileReadyRef = React.useRef(false);
  const writerSessionRef = React.useRef(0);
  const writerRef = React.useRef(null);
  const callbackRef = React.useRef({});

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
    fileReadyRef.current = false;
    if (!mountedRef.current) return;
    setFailure(code);
    setStatus(code === "permission_required" || code === "missing_handle" ? "reconnect_required" : "error");
  }, []);

  const markLinkedSaved = React.useCallback(async (payload, handle = fileHandleRef.current) => {
    const savedAt = new Date().toISOString();
    const digest = await digestText(payload);
    lastSyncedPayloadRef.current = payload;
    const fileName = handle?.name || metaRef.current.linkedFileName || "audit-project-workbench.apw.json";
    persistMeta({ linkedFileName: fileName, lastSyncedDigest: digest, lastSyncedAt: savedAt });
    if (!mountedRef.current) return;
    setLinkedFileName(fileName);
    setLastSavedAt(savedAt);
    setFailure("");
    setStatus(currentPayloadRef.current === payload ? "saved" : "unsynced");
  }, [persistMeta]);

  callbackRef.current = { markFailure, markLinkedSaved };

  const enqueueLinkedPayload = React.useCallback((payload) => {
    const handle = fileHandleRef.current;
    if (!handle) return;
    writerRef.current?.enqueue({ payload, handle, session: writerSessionRef.current });
  }, []);

  const retireWriterSession = React.useCallback(async () => {
    writerSessionRef.current += 1;
    writerRef.current?.clear();
    await writerRef.current?.flush();
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    writerRef.current = createLatestWriteQueue(async (job) => {
      if (!job?.handle) throw new PersistenceError("missing_handle");
      if (await fileHandlePermission(job.handle) !== "granted") throw new PersistenceError("permission_required");
      await writeStoreToFileHandle(job.handle, job.payload);
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

  const updateLinkedMetaFromPayload = React.useCallback(async (payload, handle, savedAt = new Date().toISOString()) => {
    const digest = await digestText(payload);
    lastSyncedPayloadRef.current = payload;
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
    if (!handle) throw new PersistenceError("missing_handle");
    if (await fileHandlePermission(handle) !== "granted") throw new PersistenceError("permission_required");
    if (mountedRef.current) setStatus("saving");
    const snapshot = await readStoreFromFileHandle(handle, { isValidStore, normalizeStore });
    const browserPayload = currentPayloadRef.current;
    const [browserDigest, fileDigest] = await Promise.all([digestText(browserPayload), digestText(snapshot.payload)]);
    if (browserPayload !== currentPayloadRef.current) return reconcileHandle(handle);
    const resolution = classifyWorkspaceVersions({ browserDigest, fileDigest,
      lastSyncedDigest: metaRef.current.lastSyncedDigest });
    fileHandleRef.current = handle;
    if (mountedRef.current) setLinkedFileName(snapshot.fileName);

    if (resolution === "conflict") {
      fileReadyRef.current = false;
      if (mountedRef.current) {
        setConflict({ handle, browserPayload, browserSummary: workspaceSummary(JSON.parse(browserPayload)),
          filePayload: snapshot.payload, fileStore: snapshot.store, fileSummary: snapshot.summary,
          fileName: snapshot.fileName, fileLastModified: snapshot.lastModified });
        setFailure("");
        setStatus("conflict");
      }
      return "conflict";
    }

    if (resolution === "browser_newer") {
      await writeStoreToFileHandle(handle, browserPayload);
      fileReadyRef.current = true;
      await updateLinkedMetaFromPayload(browserPayload, handle);
      if (currentPayloadRef.current !== browserPayload) enqueueLinkedPayload(currentPayloadRef.current);
      return resolution;
    }

    fileReadyRef.current = true;
    if (resolution === "file_newer") {
      preserveLegacyRecovery(snapshot.sourcePayload);
      lastSyncedPayloadRef.current = snapshot.payload;
      await updateLinkedMetaFromPayload(snapshot.payload, handle,
        snapshot.lastModified ? new Date(snapshot.lastModified).toISOString() : new Date().toISOString());
      setStore(snapshot.store);
      return resolution;
    }

    await updateLinkedMetaFromPayload(browserPayload, handle,
      metaRef.current.lastSyncedAt || new Date().toISOString());
    if (currentPayloadRef.current !== browserPayload) enqueueLinkedPayload(currentPayloadRef.current);
    return resolution;
  }, [enqueueLinkedPayload, setStore, updateLinkedMetaFromPayload]);

  React.useEffect(() => {
    let cancelled = false;
    const restoreLinkedFile = async () => {
      if (settingsRef.current.mode !== "linked_file") return;
      if (!supported) {
        applySettings({ mode: "browser" });
        if (!cancelled) { setStatus("saved"); setFailure("unsupported"); }
        return;
      }
      try {
        const handle = await loadStoredFileHandle();
        if (cancelled) return;
        if (!handle) throw new PersistenceError("missing_handle");
        fileHandleRef.current = handle;
        setLinkedFileName(handle.name || metaRef.current.linkedFileName);
        if (await fileHandlePermission(handle) !== "granted") throw new PersistenceError("permission_required");
        if (!cancelled) await reconcileHandle(handle);
      } catch (error) {
        if (!cancelled) markFailure(error);
      }
    };
    restoreLinkedFile();
    return () => { cancelled = true; };
  }, [applySettings, markFailure, reconcileHandle, supported]);

  React.useEffect(() => {
    const payload = serializeStore(store);
    currentPayloadRef.current = payload;
    const browserSavedAt = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, payload);
      persistMeta({ lastBrowserSavedAt: browserSavedAt });
    } catch (error) {
      if (mountedRef.current) { setFailure("browser_write_failed"); setStatus("error"); }
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
  }, [enqueueLinkedPayload, persistMeta, store]);

  React.useEffect(() => {
    const shouldWarn = shouldWarnBeforeUnload(settings, status);
    if (!shouldWarn) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [settings.warnBeforeUnsyncedLeave, status]);

  React.useEffect(() => {
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden" && settingsRef.current.mode === "linked_file") {
        writerRef.current?.flush();
      }
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => document.removeEventListener("visibilitychange", flushWhenHidden);
  }, []);

  const connectCurrentToNewFile = React.useCallback(async () => {
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
  }, [applySettings, enqueueLinkedPayload, markFailure, retireWriterSession, supported, updateLinkedMetaFromPayload]);

  const chooseExistingFile = React.useCallback(async () => {
    if (!supported) { setFailure("unsupported"); return null; }
    try {
      const handles = await window.showOpenFilePicker({ multiple: false, types: WORKSPACE_FILE_TYPES });
      const handle = handles?.[0];
      if (!handle) return null;
      const snapshot = await readStoreFromFileHandle(handle, { isValidStore, normalizeStore });
      return { ...snapshot, handle, currentSummary: workspaceSummary(JSON.parse(currentPayloadRef.current)) };
    } catch (error) {
      if (pickerWasCancelled(error)) return null;
      markFailure(error);
      return null;
    }
  }, [markFailure, supported]);

  const activateExistingFile = React.useCallback(async (candidate) => {
    if (!candidate?.handle || !candidate?.store) return false;
    try {
      if (await fileHandlePermission(candidate.handle, true) !== "granted") {
        throw new PersistenceError("permission_required");
      }
      setStatus("saving");
      await retireWriterSession();
      await saveStoredFileHandle(candidate.handle);
      fileHandleRef.current = candidate.handle;
      fileReadyRef.current = true;
      lastSyncedPayloadRef.current = candidate.payload;
      applySettings({ mode: "linked_file" });
      setConflict(null);
      preserveLegacyRecovery(candidate.sourcePayload);
      await updateLinkedMetaFromPayload(candidate.payload, candidate.handle,
        candidate.lastModified ? new Date(candidate.lastModified).toISOString() : new Date().toISOString());
      setStore(candidate.store);
      return true;
    } catch (error) {
      markFailure(error);
      return false;
    }
  }, [applySettings, markFailure, retireWriterSession, setStore, updateLinkedMetaFromPayload]);

  const reconnect = React.useCallback(async () => {
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
  }, [applySettings, markFailure, reconcileHandle, retireWriterSession, supported]);

  const saveNow = React.useCallback(async () => {
    const payload = currentPayloadRef.current;
    try {
      localStorage.setItem(STORAGE_KEY, payload);
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

  const disconnect = React.useCallback(async () => {
    await retireWriterSession();
    fileHandleRef.current = null;
    fileReadyRef.current = false;
    lastSyncedPayloadRef.current = null;
    setConflict(null);
    applySettings({ mode: "browser" });
    const meta = persistMeta({ linkedFileName: "", lastSyncedDigest: "", lastSyncedAt: "" });
    setLinkedFileName("");
    setLastSavedAt(meta.lastBrowserSavedAt || new Date().toISOString());
    setFailure("");
    setStatus("saved");
    try { await deleteStoredFileHandle(); } catch { /* the external file is never deleted */ }
    return true;
  }, [applySettings, persistMeta, retireWriterSession]);

  const setWarnBeforeUnsyncedLeave = React.useCallback((enabled) => {
    applySettings({ warnBeforeUnsyncedLeave: Boolean(enabled) });
  }, [applySettings]);

  const resolveConflict = React.useCallback(async (choice) => {
    if (!conflict) return false;
    const handle = conflict.handle;
    try {
      await retireWriterSession();
      if (choice === "browser") {
        downloadStorePayload(conflict.filePayload, recoveryFileName("file"));
        if (await fileHandlePermission(handle, true) !== "granted") throw new PersistenceError("permission_required");
        setStatus("saving");
        await writeStoreToFileHandle(handle, conflict.browserPayload);
        await saveStoredFileHandle(handle);
        fileHandleRef.current = handle;
        fileReadyRef.current = true;
        applySettings({ mode: "linked_file" });
        setConflict(null);
        await updateLinkedMetaFromPayload(conflict.browserPayload, handle);
        if (currentPayloadRef.current !== conflict.browserPayload) enqueueLinkedPayload(currentPayloadRef.current);
        return true;
      }
      downloadStorePayload(conflict.browserPayload, recoveryFileName("browser"));
      await saveStoredFileHandle(handle);
      fileHandleRef.current = handle;
      fileReadyRef.current = true;
      lastSyncedPayloadRef.current = conflict.filePayload;
      applySettings({ mode: "linked_file" });
      setConflict(null);
      await updateLinkedMetaFromPayload(conflict.filePayload, handle,
        conflict.fileLastModified ? new Date(conflict.fileLastModified).toISOString() : new Date().toISOString());
      setStore(conflict.fileStore);
      return true;
    } catch (error) {
      markFailure(error);
      return false;
    }
  }, [applySettings, conflict, enqueueLinkedPayload, markFailure, retireWriterSession, setStore, updateLinkedMetaFromPayload]);

  return {
    settings,
    status,
    failure,
    conflict,
    linkedFileName,
    lastSavedAt,
    supported,
    unsynced: persistenceStatusIsUnsynced(status),
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
