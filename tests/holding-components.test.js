import test from "node:test";
import assert from "node:assert/strict";
import { filterHoldingComponents, holdingComponentRows } from "../src/dashboard/holding-components-model.js";
import { holdingWorkspace } from "./fixtures/holding-workspace.js";
const rowsFor = (store) => holdingComponentRows(store, store.engagements.find((entry) => entry.id === "holding-annual"));

test("component diagnostics retain saved order and do not mutate scope or conditions", () => {
  const store = holdingWorkspace(); const before = JSON.stringify(store); const rows = rowsFor(store);
  assert.deepEqual(rows.map((row) => row.component.id), ["part-alpha", "part-beta", "part-cedar", "part-missing"]);
  assert.deepEqual(rows.map((row) => row.status), ["mismatch", "unassigned", "matched", "unassigned"]);
  assert.equal(JSON.stringify(store), before);
});
test("missing companies retain their historical identity without opening unrelated records", () => {
  const store = holdingWorkspace(); const row = rowsFor(store).at(-1);
  assert.equal(row.name, "Former Example Limited"); assert.equal(row.entity, null);
  assert.equal(row.target, null); assert.deepEqual(row.candidates, []);
  store.engagements.find((entry) => entry.id === "holding-annual").consolidation.components[0].engagementId = "cedar-annual";
  assert.equal(rowsFor(store)[0].target, null); assert.equal(rowsFor(store)[0].status, "unassigned");
});
test("archived assigned projects remain explicit candidates rather than becoming unassigned", () => {
  const row = rowsFor(holdingWorkspace())[2];
  assert.equal(row.archived, true); assert.equal(row.status, "matched");
  assert.equal(row.target.id, "cedar-annual"); assert.equal(row.candidates[0].id, "cedar-annual");
});
test("period comparison uses the complete period set, not only its outer dates", () => {
  const store = holdingWorkspace(); const parent = store.engagements.find((entry) => entry.id === "holding-annual");
  const child = store.engagements.find((entry) => entry.id === "alpha-old");
  parent.reportingPeriods = [{ periodStart: "2025-01-01", periodEnd: "2025-12-31" }, { periodStart: "2026-01-01", periodEnd: "2026-12-31" }];
  child.reportingPeriods = [{ periodStart: "2025-01-01", periodEnd: "2026-12-31" }];
  assert.equal(rowsFor(store)[0].status, "mismatch");
  child.reportingPeriods = structuredClone(parent.reportingPeriods);
  assert.equal(rowsFor(store)[0].status, "matched");
});
test("search combines company, role and owner tokens without searching private notes", () => {
  const store = holdingWorkspace(); const rows = rowsFor(store);
  assert.equal(filterHoldingComponents(rows, "ＡＬＰＨＡ alex subsidiary").length, 1);
  assert.equal(filterHoldingComponents(rows, "alpha cedar").length, 0);
  assert.equal(filterHoldingComponents(rows, "review the component").length, 0);
  assert.equal(filterHoldingComponents(rows, "  former  ")[0].component.id, "part-missing");
});
test("assignment filters preserve all saved records and do not classify readiness", () => {
  const store = holdingWorkspace(); const before = JSON.stringify(store); const rows = rowsFor(store);
  assert.equal(filterHoldingComponents(rows, "", "unassigned").length, 2);
  assert.equal(filterHoldingComponents(rows, "", "mismatch").length, 1);
  const parent = store.engagements.find((entry) => entry.id === "holding-annual");
  parent.consolidation.components[2].readinessConditions = [];
  const empty = rowsFor(store)[2]; assert.equal(empty.total, 0); assert.equal(empty.done, 0); assert.equal(empty.status, "matched");
  parent.consolidation.components[2].readinessConditions = JSON.parse(before).engagements.find((entry) => entry.id === "holding-annual").consolidation.components[2].readinessConditions;
  assert.equal(JSON.stringify(store), before);
});
