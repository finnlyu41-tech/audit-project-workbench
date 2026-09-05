import test from "node:test";
import assert from "node:assert/strict";
import { makeTaxDeadline } from "../src/dashboard/model.js";
import { prepareTaxDeadlineSave, prepareTaxDeadlineRemoval, taxEditorSource } from "../src/dashboard/tax-editor-state.js";
const fixture = () => ({ entities: [{ id: "company", taxDeadlines: [makeTaxDeadline({ id: "notice", category: "custom",
  customName: "Example notice", dueDate: "2026-10-31", owner: "Alex", reference: "Example reference" })] }],
  engagements: [{ id: "job", entityId: "company", workstreams: [{ id: "tax" }] }] });

test("tax date edit retains original date and appends one reasoned revision without mutating the source", () => {
  const store = fixture(); const current = store.entities[0].taxDeadlines[0]; const before = JSON.stringify(store);
  const result = prepareTaxDeadlineSave(store, "entity", "company", current, { ...current, dueDate: "2026-11-30" }, "Example extension");
  assert.equal(result.entityId, "company"); assert.equal(result.deadline.id, "notice");
  assert.equal(result.deadline.originalDueDate, "2026-10-31");
  assert.equal(result.deadline.createdAt, current.createdAt);
  assert.equal(result.deadline.revisions.length, 1);
  assert.equal(result.deadline.revisions[0].reason, "Example extension");
  assert.equal(JSON.stringify(store), before);
});
test("unchanged dates do not create revision history and completion stays a tax-only edit", () => {
  const store = fixture(); const current = store.entities[0].taxDeadlines[0];
  const result = prepareTaxDeadlineSave(store, "project", "job", current, { ...current, state: "completed" });
  assert.equal(result.deadline.state, "completed"); assert.ok(result.deadline.completedAt);
  assert.deepEqual(result.deadline.revisions, []); assert.deepEqual(store.engagements[0].workstreams, [{ id: "tax" }]);
});
test("removed deadlines are rejected instead of being silently recreated", () => {
  const store = fixture(); const baseline = store.entities[0].taxDeadlines.pop();
  assert.equal(prepareTaxDeadlineSave(store, "entity", "company", baseline, baseline).error, "missing");
  assert.deepEqual(store.entities[0].taxDeadlines, []);
});
test("stale tax snapshots cannot overwrite or delete newer changes", () => {
  const store = fixture(); const current = store.entities[0].taxDeadlines[0]; const baseline = { ...current };
  current.owner = "New owner";
  assert.equal(prepareTaxDeadlineSave(store, "entity", "company", baseline, baseline).error, "changed");
  assert.equal(prepareTaxDeadlineRemoval(store, "entity", "company", "notice", baseline).error, "changed");
  assert.equal(current.owner, "New owner");
});
test("archived, orphaned and unsupported sources cannot be edited", () => {
  const store = fixture(); const current = store.entities[0].taxDeadlines[0];
  store.entities[0].archived = true;
  assert.equal(prepareTaxDeadlineSave(store, "entity", "company", current, current).error, "source");
  assert.equal(prepareTaxDeadlineRemoval(store, "entity", "company", "notice", current).error, "source");
  store.entities[0].archived = false; store.engagements[0].archived = true;
  assert.equal(taxEditorSource(store, "project", "job"), null);
  assert.equal(taxEditorSource(store, "project", "missing"), null);
  assert.equal(taxEditorSource(store, "other", "company"), null);
});
test("cross-company links are cleared while valid engagement/workstream links remain", () => {
  const store = fixture(); const values = { category: "custom", customName: "Example", dueDate: "2026-10-31",
    linkedEngagementId: "job", linkedWorkstreamId: "tax" };
  const good = prepareTaxDeadlineSave(store, "entity", "company", null, values);
  assert.equal(good.deadline.linkedEngagementId, "job"); assert.equal(good.deadline.linkedWorkstreamId, "tax");
  store.engagements[0].entityId = "another-company";
  const bad = prepareTaxDeadlineSave(store, "entity", "company", null, values);
  assert.equal(bad.deadline.linkedEngagementId, null); assert.equal(bad.deadline.linkedWorkstreamId, null);
});
test("changing a saved date still requires a nonblank revision reason", () => {
  const store = fixture(); const current = store.entities[0].taxDeadlines[0];
  assert.equal(prepareTaxDeadlineSave(store, "entity", "company", current, { ...current, dueDate: "2026-11-30" }, "  ").error, "reason");
});
test("deletion preparation validates the source without changing records", () => {
  const store = fixture(); const before = JSON.stringify(store); const current = store.entities[0].taxDeadlines[0];
  assert.deepEqual(prepareTaxDeadlineRemoval(store, "group", "job", "notice", current), { entityId: "company" });
  assert.equal(prepareTaxDeadlineRemoval(store, "entity", "company", "absent").error, "missing");
  assert.equal(JSON.stringify(store), before);
});
