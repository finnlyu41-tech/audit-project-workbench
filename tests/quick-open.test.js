import test from "node:test";
import assert from "node:assert/strict";
import { findQuickOpenRecords, quickOpenIndex, QUICK_OPEN_LIMIT } from "../src/dashboard/quick-open-model.js";
import { navigationSnapshot, restoreNavigationSnapshot } from "../src/dashboard/navigation-state.js";

const fixture = () => ({ entities: [{ id: "co", kind: "company", legalName: "Example Finance Limited" }],
  engagements: [{ id: "job", entityId: "co", owner: "Alex Chan", engagementTypes: ["Audit"],
    periodStart: "2026-01-01", periodEnd: "2026-12-31", notes: "Confidential note marker", workstreams: [] }] });

test("quick open combines identity terms, years, full-width characters and case-insensitive owners", () => {
  const index = quickOpenIndex(fixture());
  assert.equal(findQuickOpenRecords(index, "EXAMPLE ２０２６ chan").records[0].id, "job");
  assert.equal(findQuickOpenRecords(index, "chan example").total, 1);
  assert.equal(findQuickOpenRecords(index, " ").total, 2);
  assert.equal(findQuickOpenRecords(index, "Confidential note marker").total, 0);
});
test("archived records require opt-in and missing companies are excluded", () => {
  const store = fixture(); store.engagements[0].archived = true;
  assert.equal(findQuickOpenRecords(quickOpenIndex(store), "2026").total, 0);
  assert.equal(findQuickOpenRecords(quickOpenIndex(store), "2026", true).records[0].archived, true);
  store.entities[0].archived = true;
  assert.equal(findQuickOpenRecords(quickOpenIndex(store)).total, 0);
  store.entities = []; assert.deepEqual(quickOpenIndex(store), []);
});
test("recent entries rank first and only bounded matching results render without dropping the total", () => {
  const index = quickOpenIndex(fixture());
  assert.equal(findQuickOpenRecords(index, "", false, [{ kind: "project", id: "job" }]).records[0].id, "job");
  const many = Array.from({ length: 70 }, (_, i) => ({ ...index[0], key: `entity:${i}`, id: `${i}` }));
  const result = findQuickOpenRecords(many); assert.equal(result.total, 70); assert.equal(result.records.length, QUICK_OPEN_LIMIT);
});
test("indexing does not mutate records and folds simplified/traditional names only for matching", () => {
  const store = fixture(); store.entities[0].legalName = "测试财务有限公司";
  const before = JSON.stringify(store); const index = quickOpenIndex(store, "zh-Hant");
  assert.equal(findQuickOpenRecords(index, "測試財務").total, 2);
  assert.equal(findQuickOpenRecords(index, "财务 2026").records[0].name, "测试财务有限公司");
  assert.equal(JSON.stringify(store), before);
});
test("history snapshots copy UI values without retaining company records", () => {
  const source = { workspaceView: "detail", selection: { kind: "project", id: "job" },
    navigationFilters: { owner: "Alex Chan" }, search: "Example", scrollTop: 220 };
  const entry = navigationSnapshot(source); source.navigationFilters.owner = "Changed";
  assert.equal(entry.navigationFilters.owner, "Alex Chan");
  assert.equal(entry.scrollTop, 220); assert.equal(entry.search, "Example");
  assert.equal("engagements" in entry, false);
});
test("history discards missing detail records and resolves current archive state", () => {
  const store = fixture(); const entry = navigationSnapshot({ workspaceView: "detail", selection: { kind: "project", id: "job" } });
  store.engagements[0].archived = true;
  assert.equal(restoreNavigationSnapshot(store, entry).filter, "archived");
  store.engagements = []; assert.equal(restoreNavigationSnapshot(store, entry), null);
});
test("history does not let an obsolete owner or removed workstream conceal its destination", () => {
  const store = fixture(); const before = JSON.stringify(store);
  const entry = navigationSnapshot({ workspaceView: "detail", selection: { kind: "project", id: "job" },
    activeWorkstreamId: "removed", navigationFilters: { owner: "Former owner" } });
  const result = restoreNavigationSnapshot(store, entry);
  assert.equal(result.navigationFilters.owner, ""); assert.equal(result.activeWorkstreamId, null);
  assert.equal(JSON.stringify(store), before); assert.equal(entry.navigationFilters.owner, "Former owner");
});
test("history preserves the archive filter for an active company with archived years", () => {
  const store = fixture(); store.engagements[0].archived = true;
  const entry = navigationSnapshot({ workspaceView: "detail", selection: { kind: "entity", id: "co" }, filter: "archived" });
  assert.equal(restoreNavigationSnapshot(store, entry).filter, "archived");
  store.engagements[0].archived = false;
  assert.equal(restoreNavigationSnapshot(store, entry).filter, "all");
});
