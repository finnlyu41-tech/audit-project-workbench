import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackTimer, feedbackDuration } from '../src/dashboard/feedback-timer.js';
function fakeClock() {
  let time = 0; let next = 0; const tasks = new Map(); const delivered = [];
  return {
    now: () => time,
    setTimer(action, delay) { const id = ++next; tasks.set(id, { action, at: time + delay }); delivered.push(action); return id; },
    clearTimer(id) { tasks.delete(id); }, delivered,
    advance(delta) {
      const target = time + delta;
      while (true) {
        const entry = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
        if (!entry || entry[1].at > target) break;
        time = entry[1].at; tasks.delete(entry[0]); entry[1].action();
      }
      time = target;
    },
  };
}
test('feedback allows at least eight seconds and extends long notices up to twenty', () => {
  assert.equal(feedbackDuration('Saved'), 8000);
  assert.equal(feedbackDuration('中文'.repeat(100)), 12000);
  assert.equal(feedbackDuration('x'.repeat(1000)), 20000);
  assert.equal(feedbackDuration('😀'.repeat(100)), 8000);
});
test('an ordinary feedback timer expires exactly once', () => {
  const clock = fakeClock(); let calls = 0; createFeedbackTimer(() => calls++, 8000, clock);
  clock.advance(7999); assert.equal(calls, 0); clock.advance(1); assert.equal(calls, 1);
  clock.advance(9000); assert.equal(calls, 1);
});
test('hover, keyboard and hidden-page pauses overlap without losing remaining reading time', () => {
  const clock = fakeClock(); let calls = 0; const timer = createFeedbackTimer(() => calls++, 8000, clock);
  clock.advance(3000); timer.pause('hover'); timer.pause('focus'); timer.pause('hidden');
  clock.advance(20000); timer.resume('hover'); clock.advance(20000); timer.resume('focus');
  clock.advance(20000); assert.equal(calls, 0); timer.resume('hidden');
  clock.advance(4999); assert.equal(calls, 0); clock.advance(1); assert.equal(calls, 1);
});
test('duplicate pause and unrelated resume do not restart or multiply timers', () => {
  const clock = fakeClock(); let calls = 0; const timer = createFeedbackTimer(() => calls++, 8000, clock);
  clock.advance(1000); timer.pause('hover'); timer.pause('hover'); timer.resume('other');
  clock.advance(10000); assert.equal(calls, 0); timer.resume('hover'); timer.resume('hover');
  clock.advance(7000); assert.equal(calls, 1);
});
test('cancelled and superseded timer callbacks cannot clear a newer notification', () => {
  const clock = fakeClock(); let shown = 'first';
  const old = createFeedbackTimer(() => { shown = ''; }, 8000, clock);
  const obsoleteCallback = clock.delivered[0]; clock.advance(7000); old.cancel(); shown = 'second';
  createFeedbackTimer(() => { shown = ''; }, 8000, clock);
  obsoleteCallback(); clock.advance(7999); assert.equal(shown, 'second');
  clock.advance(1); assert.equal(shown, '');
});
test('callbacks from a paused timer remain obsolete after it resumes', () => {
  const clock = fakeClock(); let calls = 0; const timer = createFeedbackTimer(() => calls++, 8000, clock);
  const oldCallback = clock.delivered[0]; clock.advance(2000); timer.pause('focus'); timer.resume('focus');
  oldCallback(); assert.equal(calls, 0); clock.advance(6000); assert.equal(calls, 1);
  timer.cancel(); timer.resume('focus'); clock.advance(10000); assert.equal(calls, 1);
});
