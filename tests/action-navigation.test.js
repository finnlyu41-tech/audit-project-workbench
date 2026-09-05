import test from "node:test";
import assert from "node:assert/strict";
import { resolveWorkspaceTarget } from "../src/dashboard/ux-model.js";
const fixture = () => ({ entities: [{ id: "company", kind: "company" }], engagements: [{ id: "job", entityId: "company" }] });

test("cross-workspace links resolve current company and engagement kinds without changing data", () => {
  const store = fixture(); const before = JSON.stringify(store);
  assert.equal(resolveWorkspaceTarget(store, "group", "job").kind, "project");
  assert.equal(resolveWorkspaceTarget(store, "entity", "company").filter, "all");
  assert.equal(JSON.stringify(store), before);
  store.entities[0].kind = "holding_company";
  assert.equal(resolveWorkspaceTarget(store, "project", "job").kind, "group");
});
test("archived sources select the archive instead of disappearing from an active view", () => {
  const store = fixture();
  store.engagements[0].archived = true;
  assert.equal(resolveWorkspaceTarget(store, "project", "job").filter, "archived");
  store.engagements[0].archived = false;
  store.entities[0].archived = true;
  assert.equal(resolveWorkspaceTarget(store, "project", "job").filter, "archived");
});
test("missing records and malformed requests do not resolve to unrelated sources", () => {
  const store = fixture();
  for (const [kind, id] of [["project", "missing"], ["entity", "job"], ["other", "company"], ["project", null]]) {
    assert.equal(resolveWorkspaceTarget(store, kind, id), null);
  }
  store.entities = [];
  assert.equal(resolveWorkspaceTarget(store, "project", "job"), null);
});
