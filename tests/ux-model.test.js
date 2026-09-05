import test from "node:test";
import assert from "node:assert/strict";
import { nextEngagementAction, prepareQuickUpdate, priorityItemsFor, quickUpdateValues,
  recentRecordsFor, rememberRecord, sanitizeRecentRecords } from "../src/dashboard/ux-model.js";
const fixture = () => ({ entities: [{ id: "co", kind: "company", legalName: "Example Limited" }],
  engagements: [{ id: "job", entityId: "co", owner: "Alex", startDate: "2026-09-01", dueDate: "2026-10-01",
    notes: "Existing note", reportingPeriods: [{ periodStart: "2026-01-01", periodEnd: "2026-12-31" }], workstreams: [] }] });

test("action filters use inclusive seven-day boundaries and deduplicate engagement deadlines", () => {
  const record = { id: "job", engagement: { owner: "Alex" } };
  const overview = { priorityItems: [
    { category: "deadline", urgency: "due_today", alert: { targetId: "job", daysUntil: 0 }, record, sortDate: "2026-09-05" },
    { category: "upcoming", urgency: "due_today", record, daysUntil: 0, sortDate: "2026-09-05" },
    { category: "upcoming", record: { ...record, id: "seven" }, daysUntil: 7 },
    { category: "upcoming", record: { ...record, id: "eight" }, daysUntil: 8 },
    { category: "outstanding", record, item: { id: "wait" } },
    { category: "setup", record },
  ] };
  assert.equal(priorityItemsFor(overview, "today").length, 1);
  assert.equal(priorityItemsFor(overview, "week").length, 2);
  assert.equal(priorityItemsFor(overview, "outstanding").length, 1);
  assert.equal(priorityItemsFor(overview, "setup").length, 1);
  assert.equal(priorityItemsFor(overview, "all", "Other").length, 0);
});

test("recent history rejects malformed entries, deduplicates and stores IDs only", () => {
  assert.deepEqual(sanitizeRecentRecords({}), []);
  assert.deepEqual(sanitizeRecentRecords([null, {}, { kind: "project", id: "job", name: "Do not store" }]), [{ kind: "project", id: "job" }]);
  const recent = sanitizeRecentRecords(Array.from({ length: 12 }, (_, i) => ({ kind: "project", id: `${i}` })));
  assert.equal(recent.length, 8);
  const moved = rememberRecord(recent, { kind: "project", id: "3" });
  assert.equal(moved[0].id, "3");
  assert.equal(moved.filter((item) => item.id === "3").length, 1);
  assert.equal(rememberRecord(moved, moved[0]), moved);
});
test("recent shortcuts exclude archived or missing records and resolve the current kind", () => {
  const store = fixture();
  const visits = [{ kind: "project", id: "job" }, { kind: "entity", id: "missing" }];
  assert.equal(recentRecordsFor(store, visits).length, 1);
  store.entities[0].kind = "holding_company";
  assert.equal(recentRecordsFor(store, visits)[0].kind, "group");
  store.entities[0].archived = true;
  assert.deepEqual(recentRecordsFor(store, visits), []);
});
test("next steps do not bypass unfinished or unconfigured completion conditions", () => {
  const engagement = { workstreams: [{ id: "work", nodes: [
    { id: "done", conditions: [{ done: true }] }, { id: "next", conditions: [{ done: false }] },
  ] }] };
  assert.equal(nextEngagementAction(engagement).node.id, "next");
  engagement.workstreams[0].nodes[1].conditions = [];
  assert.equal(nextEngagementAction(engagement).node.id, "next");
  engagement.workstreams[0].nodes = [];
  assert.equal(nextEngagementAction(engagement).workstreamId, "work");
  assert.equal(nextEngagementAction({ workstreams: [] }), null);
});
test("quick updates preserve unrelated fields", () => {
  const store = fixture();
  const baseline = quickUpdateValues(store.engagements[0]);
  store.engagements[0].notes = "Updated note";
  const before = JSON.stringify(store);
  const result = prepareQuickUpdate(store, "job", baseline, { ...baseline, owner: "Jamie" });
  assert.deepEqual(result, { patch: { owner: "Jamie" } });
  assert.equal(JSON.stringify(store), before);
});
test("conflicting quick edits are rejected", () => {
  const store = fixture(); const baseline = quickUpdateValues(store.engagements[0]);
  store.engagements[0].owner = "Taylor";
  assert.equal(prepareQuickUpdate(store, "job", baseline, { ...baseline, owner: "Jamie" }).error, "conflict");
});
test("quick edits validate calendar dates and ranges", () => {
  const store = fixture(); const baseline = quickUpdateValues(store.engagements[0]);
  assert.equal(prepareQuickUpdate(store, "job", baseline, { ...baseline, dueDate: "2026-02-30" }).error, "date");
  assert.equal(prepareQuickUpdate(store, "job", baseline, { ...baseline, dueDate: "2026-08-31" }).error, "range");
  assert.deepEqual(prepareQuickUpdate(store, "job", baseline, baseline), { patch: {} });
});
test("archived and missing engagements stay read-only", () => {
  const store = fixture(); const baseline = quickUpdateValues(store.engagements[0]);
  assert.equal(prepareQuickUpdate(store, "missing", baseline, baseline).error, "readonly");
  store.engagements[0].archived = true;
  assert.equal(prepareQuickUpdate(store, "job", baseline, baseline).error, "readonly");
});
