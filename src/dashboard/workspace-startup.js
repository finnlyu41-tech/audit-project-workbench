import { emptyStore, isValidStore, normalizeStore, STORAGE_KEY, STORE_VERSION } from './model.js';
import { loadPersistenceSettings, savePersistenceSettings, serializeStore } from './persistence.js';

// Reading never writes. A failed read must not turn into an autosaved empty store.
export function parseStartupPayload(raw) {
  if (raw === null) return { store: emptyStore(), raw, error: null };
  try {
    const value = JSON.parse(raw);
    if (Number(value?.version) > STORE_VERSION) return { raw, error: 'newer_version' };
    if (!isValidStore(value)) return { raw, error: 'invalid_data' };
    return { store: normalizeStore(value), raw, error: null };
  } catch { return { raw, error: 'invalid_data' }; }
}
export function readWorkspaceStartup(storage) {
  try { return parseStartupPayload((storage || globalThis.localStorage).getItem(STORAGE_KEY)); }
  catch { return { raw: null, error: 'read_failed' }; }
}
// Called only after explicit recovery confirmation; never writes to linked files.
export function restoreStartupBackup(snapshot, raw, storage) {
  const next = parseStartupPayload(raw);
  if (next.error || raw === null) throw new Error('invalid_backup');
  const target = storage || globalThis.localStorage;
  if (snapshot.error === 'read_failed' || target.getItem(STORAGE_KEY) !== snapshot.raw) throw new Error('source_changed');
  // Pause file linking before changing browser data, so an old handle cannot autosync over a file.
  savePersistenceSettings({ ...loadPersistenceSettings(target), mode: 'browser' }, target);
  target.setItem(STORAGE_KEY, serializeStore(next.store));
  return next;
}
