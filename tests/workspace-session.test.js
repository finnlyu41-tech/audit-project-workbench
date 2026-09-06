import test from 'node:test';
import assert from 'node:assert/strict';
import { requestWorkspaceSession, WORKSPACE_SESSION_LOCK } from '../src/dashboard/workspace-session.js';
const tick = () => new Promise(resolve => setImmediate(resolve));
test('session requests one non-stealing exclusive lock and holds until cleanup', async () => {
  let finished = false; const states = [];
  const manager = { async request(name, options, run) {
    assert.equal(name, WORKSPACE_SESSION_LOCK);
    assert.deepEqual(options, { mode: 'exclusive', ifAvailable: true });
    await run({ name }); finished = true;
  } };
  const dispose = requestWorkspaceSession(manager, value => states.push(value));
  assert.deepEqual(states, ['ready']); await tick(); assert.equal(finished, false);
  dispose(); dispose(); await tick(); assert.equal(finished, true); assert.deepEqual(states, ['ready']);
});
test('occupied locks never start the workspace or enter an automatic retry loop', async () => {
  let requests = 0; const states = [];
  requestWorkspaceSession({ request(name, options, run) { requests++; return run(null); } }, s => states.push(s));
  await tick(); assert.equal(requests, 1); assert.deepEqual(states, ['occupied']);
});
test('missing API is distinguished from denied access', async () => {
  const states = []; requestWorkspaceSession(undefined, s => states.push(s));
  requestWorkspaceSession({ request() { return Promise.reject(new Error('denied')); } }, s => states.push(s));
  await tick(); assert.deepEqual(states, ['unsupported', 'error']);
});
test('synchronous API failures fail closed', () => {
  const states = []; requestWorkspaceSession({ request() { throw new Error('unavailable'); } }, s => states.push(s));
  assert.deepEqual(states, ['error']);
});
test('late lock callbacks after unmount cannot start a stale workbench', async () => {
  let callback; const states = [];
  const stop = requestWorkspaceSession({ request(name, options, run) { callback = run; return new Promise(() => {}); } }, s => states.push(s));
  stop(); assert.equal(callback({ name: WORKSPACE_SESSION_LOCK }), undefined); assert.deepEqual(states, []);
});
test('a disposed request does not surface late failures', async () => {
  let reject; const states = [];
  const stop = requestWorkspaceSession({ request() { return new Promise((resolve, fail) => { reject = fail; }); } }, s => states.push(s));
  stop(); reject(new Error('late')); await tick(); assert.deepEqual(states, []);
});
test('cooperating sessions grant one owner and require an explicit retry after release', async () => {
  let held = false;
  const manager = { async request(name, options, callback) {
    if (held) return callback(null);
    held = true; try { await callback({ name }); } finally { held = false; }
  } };
  const first = []; const second = [];
  const stopFirst = requestWorkspaceSession(manager, s => first.push(s));
  requestWorkspaceSession(manager, s => second.push(s));
  assert.deepEqual(first, ['ready']); assert.deepEqual(second, ['occupied']);
  stopFirst(); await tick(); assert.deepEqual(second, ['occupied']);
  const stopSecond = requestWorkspaceSession(manager, s => second.push(s));
  assert.deepEqual(second, ['occupied', 'ready']); stopSecond(); await tick(); assert.equal(held, false);
});
