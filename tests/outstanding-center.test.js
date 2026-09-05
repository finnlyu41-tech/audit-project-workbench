import test from "node:test";
import assert from "node:assert/strict";
import { createDefaultOutstandingStatuses } from "../src/dashboard/model.js";
import { filterOutstandingEntries, outstandingEntryKey, outstandingVisibilityCounts } from "../src/dashboard/outstanding-center-model.js";
const statuses = [...createDefaultOutstandingStatuses(), { id: "custom-closed", closed: true }];
const rows = () => [
  { sourceType: "project", sourceId: "one", companyName: "Example Limited", sourceName: "Annual 2026", sourceOwner: "Alex Search",
    moduleLabel: "Audit", moduleKey: "one:audit", item: { id: "same", title: "Signed confirmation", status: "missing_document", note: "secret-note" } },
  { sourceType: "group", sourceId: "two", companyName: "Example Holding", sourceName: "Group 2026", sourceOwner: "Blair",
    moduleLabel: "集团级", moduleKey: "two:project", item: { id: "same", title: "Final approval", status: "custom-closed" } },
];
test("outstanding search matches combined identifying fields and full-width input", () => {
  assert.equal(filterOutstandingEntries(rows(), statuses, { query: "ＡＬＥＸ ｓｉｇｎｅｄ example" }).length, 1);
  assert.equal(filterOutstandingEntries(rows(), statuses, { query: "signed Blair", visibility: "all" }).length, 0);
});
test("notes are not indexed by the outstanding search", () => {
  assert.equal(filterOutstandingEntries(rows(), statuses, { query: "secret-note", visibility: "all" }).length, 0);
});
test("visibility uses configured closed semantics rather than guessing from labels", () => {
  assert.deepEqual(outstandingVisibilityCounts(rows(), statuses), { all: 2, open: 1, closed: 1 });
  assert.equal(filterOutstandingEntries(rows(), statuses, { visibility: "closed", query: "集团" })[0].sourceId, "two");
});
test("workstream, status and visibility filters are conjunctive", () => {
  assert.equal(filterOutstandingEntries(rows(), statuses, { module: "one:audit", status: "missing_document" }).length, 1);
  assert.equal(filterOutstandingEntries(rows(), statuses, { module: "one:audit", status: "custom-closed", visibility: "all" }).length, 0);
});
test("identical item IDs from separate sources retain distinct focus identities", () => {
  assert.notEqual(outstandingEntryKey(rows()[0]), outstandingEntryKey(rows()[1]));
  assert.notEqual(outstandingEntryKey(rows()[0]), outstandingEntryKey({ ...rows()[0], sourceType: "group" }));
});
test("search retains source ordering and leaves all input records unchanged", () => {
  const entries = rows(); const before = JSON.stringify(entries);
  assert.deepEqual(filterOutstandingEntries(entries, statuses, { visibility: "all", query: "example" }), entries);
  assert.equal(JSON.stringify(entries), before);
  assert.deepEqual(filterOutstandingEntries([], statuses), []);
  assert.deepEqual(outstandingVisibilityCounts([], statuses), { all: 0, open: 0, closed: 0 });
});
