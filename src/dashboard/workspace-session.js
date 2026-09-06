// One upgraded document owns this origin's workspace. Never steal a live lease.
export const WORKSPACE_SESSION_LOCK = 'audit-progress-workbench:workspace-session';
export function requestWorkspaceSession(manager, onState, { waitMs = 0, timers = globalThis } = {}) {
  let disposed = false; let release; let timer; let controller;
  const lifetime = new Promise(resolve => { release = resolve; });
  const publish = state => { if (!disposed) onState(state); };
  const clearWait = () => timers.clearTimeout(timer);
  const dispose = () => { disposed = true; clearWait(); controller?.abort(); release(); };
  if (!manager || typeof manager.request !== 'function') {
    publish('unsupported'); return dispose;
  }
  try {
    if (waitMs > 0) {
      controller = new AbortController();
      // A user-requested retry may briefly queue behind document cleanup.
      // Expiry only cancels our request; it never releases another window's lock.
      timer = timers.setTimeout(() => { publish('occupied'); controller.abort(); }, waitMs);
    }
    const options = controller ? { mode: 'exclusive', signal: controller.signal }
      : { mode: 'exclusive', ifAvailable: true };
    Promise.resolve(manager.request(WORKSPACE_SESSION_LOCK, options, lock => {
      if (disposed || controller?.signal.aborted) return;
      clearWait();
      if (!lock) { publish('occupied'); return; }
      publish('ready'); return lifetime;
    })).catch(error => {
      clearWait(); publish(error?.name === 'AbortError' && controller?.signal.aborted ? 'occupied' : 'error');
    });
  } catch { clearWait(); publish('error'); }
  return dispose;
}
