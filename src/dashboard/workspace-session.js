// One upgraded document owns this origin's workspace. Never steal a live lease.
export const WORKSPACE_SESSION_LOCK = 'audit-progress-workbench:workspace-session';
export function requestWorkspaceSession(manager, onState) {
  let disposed = false; let release;
  const lifetime = new Promise(resolve => { release = resolve; });
  const publish = state => { if (!disposed) onState(state); };
  const dispose = () => { disposed = true; release(); };
  if (!manager || typeof manager.request !== 'function') {
    publish('unsupported'); return dispose;
  }
  try {
    Promise.resolve(manager.request(WORKSPACE_SESSION_LOCK, { mode: 'exclusive', ifAvailable: true }, lock => {
      if (disposed) return;
      if (!lock) { publish('occupied'); return; }
      publish('ready');
      return lifetime;
    })).catch(() => publish('error'));
  } catch { publish('error'); }
  return dispose;
}
