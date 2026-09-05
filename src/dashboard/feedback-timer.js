// Ordinary feedback only; storage conflicts and validation keep their own controls.
export function feedbackDuration(text) {
  return Math.min(20000, Math.max(8000, Array.from(String(text || '')).length * 60));
}

// Injected clock makes overlapping pauses and obsolete callbacks deterministic in tests.
export function createFeedbackTimer(onExpire, duration, clock) {
  const paused = new Set();
  let remaining = Math.max(0, duration);
  let started = 0;
  let handle = null;
  let disposed = false;
  let generation = 0;
  const stop = () => {
    generation += 1;
    if (handle !== null) {
      clock.clearTimer(handle); handle = null;
      remaining = Math.max(0, remaining - Math.max(0, clock.now() - started));
    }
  };
  const start = () => {
    if (disposed || paused.size || handle !== null) return;
    started = clock.now(); const token = ++generation;
    handle = clock.setTimer(() => {
      if (disposed || paused.size || token !== generation) return;
      disposed = true; handle = null; onExpire();
    }, remaining);
  };
  start();
  return {
    pause(reason) {
      if (disposed || paused.has(reason)) return;
      stop(); paused.add(reason);
    },
    resume(reason) {
      if (disposed || !paused.delete(reason)) return;
      start();
    },
    cancel() { stop(); disposed = true; paused.clear(); },
  };
}
