import test from "node:test";
import assert from "node:assert/strict";
import { createDraftRegistry, isComposingKey } from "../src/dashboard/editor-draft-state.js";

test("draft registration and reverting values distinguish clean and dirty editors", () => {
  const states = []; const registry = createDraftRegistry((dirty) => states.push(dirty));
  registry.update("form", '"original"', '"original"');
  assert.equal(registry.isDirty(), false);
  registry.update("form", '"original"', '"changed"');
  registry.update("form", '"original"', '"changed again"');
  assert.equal(registry.isDirty(), true);
  registry.update("form", '"original"', '"original"');
  assert.equal(registry.isDirty(), false); assert.deepEqual(states, [true, false]);
});

test("removing one clean editor never clears another dirty editor", () => {
  const registry = createDraftRegistry();
  registry.update("first", "a", "b"); registry.update("second", "a", "a");
  registry.remove("second"); assert.equal(registry.isDirty(), true);
  registry.remove("first"); assert.equal(registry.isDirty(), false);
});

test("structural reorder and removal are unsaved changes even without input events", () => {
  const registry = createDraftRegistry(); const initial = JSON.stringify({ rows: ["a", "b"] });
  registry.update("rows", initial, JSON.stringify({ rows: ["b", "a"] })); assert.equal(registry.isDirty(), true);
  registry.update("rows", initial, JSON.stringify({ rows: ["a"] })); assert.equal(registry.isDirty(), true);
  registry.update("rows", initial, initial); assert.equal(registry.isDirty(), false);
});
test("IME guards cover native, React and legacy composing keys", () => {
  for (const event of [{ isComposing: true }, { nativeEvent: { isComposing: true } },
    { keyCode: 229 }, { nativeEvent: { keyCode: 229 } }]) assert.equal(isComposingKey(event), true);
  assert.equal(isComposingKey({ key: "Escape" }), false);
});
