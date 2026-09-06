// In-memory file handles/permission store only; never touches a user's files or native picker.
export async function installMemoryFiles(page, payload, options = {}) {
  await page.addInitScript(({ payload, options }) => {
    const files = { selected: { text: payload, writes: [], reads: 0, fail: false, hold: false, waiters: [] } };
    const handles = {};
    const permissionWaiters = []; let pausePermission = Boolean(options.pausePermission);
    window.__permissionWaiters = permissionWaiters; window.__permissionResumed = 0;
    window.__releasePermissions = () => { pausePermission = false; permissionWaiters.splice(0).forEach(resolve => resolve()); };
    if (options.startupLinked) {
      localStorage.clear();
      localStorage.setItem('audit-progress-workbench:language', 'en');
      localStorage.setItem('audit-progress-workbench:v1', JSON.stringify(options.workspace));
      localStorage.setItem('audit-progress-workbench:persistence-settings', JSON.stringify({ mode: 'linked_file' }));
      localStorage.setItem('audit-progress-workbench:persistence-meta', JSON.stringify({ lastSyncedDigest: options.lastDigest }));
    }
    const handle = key => handles[key] ||= { name: `${key}.apw.json`, kind: 'file',
      queryPermission: async () => { if (pausePermission) { await new Promise(resolve => permissionWaiters.push(resolve)); window.__permissionResumed++; } return files[key].permission || 'granted'; }, requestPermission: async () => files[key].permission || 'granted',
      getFile: async () => { const f = files[key]; f.reads++; return new File([f.text], `${key}.apw.json`, { type: 'application/json', lastModified: f.reads }); },
      createWritable: async () => { const f = files[key]; let text;
        return { write: async value => { if (f.fail) throw new Error('Synthetic write failure'); text = value;
            if (f.hold) await new Promise(resolve => f.waiters.push(resolve)); },
          close: async () => { f.text = text; f.writes.push(text); }, abort: async () => {} }; },
    };
    window.__memoryFiles = files;
    window.__releaseFile = () => { files.selected.hold = false; files.selected.waiters.splice(0).forEach(resolve => resolve()); };
    window.showOpenFilePicker = async () => [handle('selected')];
    window.showSaveFilePicker = async () => handle('selected');
    const native = window.indexedDB; let remembered = options.startupLinked ? handle('selected') : undefined;
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: { open(name, version) {
      if (name !== 'audit-progress-workbench-persistence') return native.open(name, version);
      const request = {}; const database = { close() {}, objectStoreNames: { contains: () => true },
        transaction() { const tx = { objectStore() { const run = action => {
          const r = {}; setTimeout(() => { r.result = action(); r.onsuccess?.(); setTimeout(() => tx.oncomplete?.(), 0); }, 0); return r;
        }; return { get: () => run(() => remembered), put: value => run(() => { remembered = value; }), delete: () => run(() => { remembered = undefined; }) }; } }; return tx; } };
      setTimeout(() => { request.result = database; request.onsuccess?.(); }, 0); return request;
    } } });
  }, { payload, options });
}
