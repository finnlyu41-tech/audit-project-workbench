import test from "node:test";
import assert from "node:assert/strict";
import { scheduleRows, filterScheduleRows } from "../src/dashboard/schedule-view-model.js";
import { normalizeStore, makeTaxDeadline } from "../src/dashboard/model.js";
import { scheduleWorkspace } from "./fixtures/schedule-workspace.js";
const fixture = () => normalizeStore(scheduleWorkspace());

test("schedule search combines normalized company, year, owner and localized project types", () => {
  const rows = scheduleRows(fixture(), "all", "en");
  assert.deepEqual(filterScheduleRows(rows, { query: "ＳＣＨＥＤＵＬＥ ２０２６ alex bookkeeping" }).map((row) => row.id), ["schedule-current"]);
  assert.equal(filterScheduleRows(rows, { query: "2026 账务处理", language: "zh-Hans" }).length, 1);
  assert.equal(filterScheduleRows(rows, { query: "2026 賬務處理", language: "zh-Hant" }).length, 1);
});
test("schedule date filters retain both partial and wholly missing date records", () => {
  const rows = scheduleRows(fixture(), "all");
  assert.deepEqual(filterScheduleRows(rows, { dateScope: "incomplete" }).map((row) => row.id), ["schedule-partial", "schedule-missing"]);
  assert.equal(filterScheduleRows(rows, { dateScope: "scheduled" }).length, 2);
  assert.equal(filterScheduleRows(rows, { query: "blair", dateScope: "scheduled" }).length, 0);
});
test("view filtering never sorts, mutates, searches notes or broadens the archived scope", () => {
  const store = fixture(); const before = JSON.stringify(store);
  const rows = scheduleRows(store, "all");
  assert.deepEqual(filterScheduleRows(rows), rows);
  assert.equal(filterScheduleRows(rows, { query: "PRIVATE-SCHEDULE-NOTE" }).length, 0);
  assert.equal(filterScheduleRows(rows, { query: "2024" }).length, 0);
  assert.deepEqual(filterScheduleRows(scheduleRows(store, "archived"), { query: "2024 alex" }).map((row) => row.id), ["schedule-archived"]);
  assert.equal(JSON.stringify(store), before);
});
test("searching older years does not reassign unlinked company tax deadlines", () => {
  const store = fixture(); const company = store.entities.find((item) => item.id === "schedule-company");
  company.taxDeadlines.push(makeTaxDeadline({ id: "unlinked", category: "tax_payment", dueDate: "2026-12-01" }));
  const rows = scheduleRows(store, "all");
  assert.ok(rows.find((row) => row.id === "schedule-partial").taxDeadlines.some((deadline) => deadline.id === "unlinked"));
  const older = filterScheduleRows(rows, { query: "2025" });
  assert.deepEqual(older[0].taxDeadlines.map((deadline) => deadline.id), ["tax-schedule-previous"]);
});
test("every reporting period remains searchable for multi-year engagements", () => {
  const store = fixture();
  store.engagements.find((item) => item.id === "schedule-current").reportingPeriods = [
    { periodStart: "2021-01-01", periodEnd: "2021-12-31" }, { periodStart: "2023-01-01", periodEnd: "2023-12-31" },
  ];
  const rows = scheduleRows(store, "all");
  assert.equal(filterScheduleRows(rows, { query: "2021 2023" })[0].id, "schedule-current");
});
test("company archival and missing companies retain source selection rules", () => {
  const store = fixture(); store.entities[0].archived = true;
  assert.deepEqual(scheduleRows(store, "all").map((row) => row.id), ["schedule-missing"]);
  assert.equal(scheduleRows(store, "archived").length, 4);
  store.entities = []; assert.deepEqual(scheduleRows(store, "all"), []);
  assert.deepEqual(filterScheduleRows([], { query: "anything" }), []);
});
