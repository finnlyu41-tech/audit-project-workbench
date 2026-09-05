import test from "node:test";
import assert from "node:assert/strict";
import { companyAnnualRows, filterAnnualProjects } from "../src/dashboard/company-overview-model.js";
import { groupProgress, normalizeStore, projectStats } from "../src/dashboard/model.js";
import { companyOverviewFixture } from "./fixtures/company-overview.js";
const fixture = () => normalizeStore(companyOverviewFixture());
const rowsFor = (store, language = "en") => companyAnnualRows(store, store.entities.find((item) => item.id === "overview-company"), language);

test("annual progress is derived from existing project and group calculations without changing records", () => {
  const store = fixture(); const before = JSON.stringify(store);
  const rows = rowsFor(store);
  const combined = rows.find((row) => row.engagement.id === "overview-combined");
  assert.equal(combined.percentage, projectStats(store.projects.find((item) => item.id === "overview-combined")).percentage);
  const groups = companyAnnualRows(store, store.entities.find((item) => item.id === "overview-holding"));
  assert.ok(groups[0].percentage > 0);
  assert.equal(groups[0].percentage, groupProgress(store, "overview-group").percentage);
  assert.equal(JSON.stringify(store), before);
});
test("annual filtering matches all report years and owner tokens including full-width input", () => {
  const rows = rowsFor(fixture());
  assert.deepEqual(filterAnnualProjects(rows, "２０２５ ＡＬＥＸ").map((row) => row.engagement.id), ["overview-combined"]);
  assert.deepEqual(filterAnnualProjects(rows, "2026 bookkeeping").map((row) => row.engagement.id), ["overview-combined"]);
  assert.equal(filterAnnualProjects(rows, "2025 2026").length, 1);
  assert.equal(filterAnnualProjects(rows, "2024 2027").length, 0);
});
test("localized type search works without translating user-entered fields", () => {
  const store = fixture(); const before = JSON.stringify(store);
  assert.equal(filterAnnualProjects(rowsFor(store, "zh-Hans"), "2025 账务处理").length, 1);
  assert.equal(filterAnnualProjects(rowsFor(store, "zh-Hant"), "2025 賬務處理").length, 1);
  assert.equal(filterAnnualProjects(rowsFor(store, "zh-Hant"), "2025 bookkeeping").length, 1);
  assert.equal(JSON.stringify(store), before);
});
test("archived scope is explicit and a company archive cannot expose editable annual rows", () => {
  const store = fixture(); const rows = rowsFor(store);
  assert.equal(filterAnnualProjects(rows).length, 3);
  assert.equal(filterAnnualProjects(rows, "", "unarchived").length, 2);
  assert.equal(filterAnnualProjects(rows, "", "archived").length, 1);
  store.entities.find((item) => item.id === "overview-company").archived = true;
  assert.equal(filterAnnualProjects(rowsFor(store), "", "unarchived").length, 0);
});
test("view-only search preserves newest-first ordering and never indexes engagement notes", () => {
  const store = fixture(); const rows = rowsFor(store); const before = JSON.stringify(rows);
  assert.deepEqual(filterAnnualProjects(rows).map((row) => row.engagement.id), ["overview-next", "overview-combined", "overview-old"]);
  assert.equal(filterAnnualProjects(rows, "private-note-not-searchable").length, 0);
  assert.equal(JSON.stringify(rows), before);
});
test("empty and missing company views do not invent annual records", () => {
  const store = fixture(); const empty = store.entities.find((item) => item.id === "overview-empty");
  assert.deepEqual(companyAnnualRows(store, empty), []);
  assert.deepEqual(companyAnnualRows(store, null), []);
});
