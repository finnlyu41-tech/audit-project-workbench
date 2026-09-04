import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyStore,
  makeGroup,
  makeGroupMember,
  makeOutstandingItem,
  makeProject,
  makeTaxDeadline,
  normalizeStore,
} from "../src/dashboard/model.js";
import { buildPortfolioReport, buildRecordReport } from "../src/dashboard/reporting.js";

const now = new Date("2026-09-03T09:00:00+08:00");
const values = (entity, owner, startDate, dueDate) => ({ name: `${entity} FY2026`, entity, owner,
  periodStart: "2026-01-01", periodEnd: "2026-12-31", reportingFramework: "HKFRS Accounting Standards", startDate, dueDate });

function reportStore() {
  const base = emptyStore();
  const active = makeProject(values("Active Limited", "Alice", "2026-01-10", "2026-09-01"), true,
    base.samples, base.workstreamCategories);
  active.outstandingItems = [makeOutstandingItem({ title: "Client signature", note: "SECRET ITEM NOTE",
    workstreamId: active.workstreams[0].id, createdAt: "2026-08-20T00:00:00.000Z" }, base.outstandingStatuses)];
  active.taxDeadlines = [makeTaxDeadline({ category: "profits_tax_filing", taxYear: "2025/26", owner: "Tax owner",
    dueDate: "2026-09-10", reminderDays: 30, reference: "SECRET TAX REF", note: "SECRET TAX NOTE" })];
  const completed = makeProject(values("Completed Limited", "Bob", "2026-02-01", "2026-08-31"), true,
    base.samples, base.workstreamCategories);
  for (const node of completed.workstreams[0].nodes) for (const condition of node.conditions) condition.done = true;
  const archived = makeProject(values("Archived Limited", "Alice", "2026-01-01", "2026-08-01"), true,
    base.samples, base.workstreamCategories);
  archived.archived = true;
  archived.outstandingItems = [makeOutstandingItem({ title: "Archived blocker" }, base.outstandingStatuses)];
  const group = makeGroup({ name: "Top Holdings", owner: "Alice", startDate: "2026-01-01", dueDate: "2026-09-20",
    consolidationEnabled: false });
  group.members = [makeGroupMember({ kind: "project", refId: active.id })];
  const store = normalizeStore({ ...base, version: 10, entities: undefined, engagements: undefined,
    projects: [active, completed, archived], groups: [group] });
  const groupEntity = store.entities.find((entity) => entity.legalName === "Top Holdings");
  const activeEntity = store.entities.find((entity) => entity.legalName === "Active Limited");
  return { store, active: store.projects.find((item) => item.id === active.id),
    completed: store.projects.find((item) => item.id === completed.id),
    archived: store.projects.find((item) => item.id === archived.id),
    group: store.groups.find((item) => item.id === group.id), groupEntity, activeEntity };
}

test("portfolio reports exclude archives by default and avoid duplicating holding-company rollups", () => {
  const { store, active, group, activeEntity } = reportStore();
  const report = buildPortfolioReport(store, {}, now);
  assert.deepEqual(new Set(report.rows.map((row) => row.id)), new Set([active.id, group.id]));
  assert.equal(report.metrics.activeCompanies, 2);
  assert.equal(report.metrics.annualEngagements, 2);
  assert.equal(report.metrics.overdueDeliveries, 1);
  assert.equal(report.metrics.taxAttention, 1);
  assert.equal(report.metrics.openOutstanding, 1);
  assert.equal(report.taxRisks[0].record.id, activeEntity.id);
  assert.equal(report.outstandingRisks[0].record.id, active.id);
});

test("portfolio status, owner, hierarchy, category, urgency and date filters are composable", () => {
  const { store, active, completed, archived, group, groupEntity } = reportStore();
  assert.deepEqual(buildPortfolioReport(store, { status: "completed" }, now).rows.map((row) => row.id), [completed.id]);
  assert.deepEqual(buildPortfolioReport(store, { status: "archived" }, now).rows.map((row) => row.id), [archived.id]);
  assert.ok(buildPortfolioReport(store, { owner: "Alice" }, now).rows.every((row) => row.owner === "Alice"));
  assert.deepEqual(new Set(buildPortfolioReport(store, { holdingCompanyId: groupEntity.id }, now).rows.map((row) => row.id)),
    new Set([group.id, active.id]));
  assert.ok(buildPortfolioReport(store, { categoryId: "audit" }, now).rows.some((row) => row.id === active.id));
  assert.deepEqual(buildPortfolioReport(store, { urgency: "overdue" }, now).rows.map((row) => row.id), [active.id]);
  assert.equal(buildPortfolioReport(store, { dateFrom: "2027-01-01" }, now).rows.length, 0);
});

test("single-company reports expose only management fields and omit notes and references", () => {
  const { store, active } = reportStore();
  const report = buildRecordReport(store, "project", active.id, now);
  const text = JSON.stringify(report);
  assert.equal(report.name, "Active Limited");
  assert.equal(report.workstreams.length, 1);
  assert.equal(report.outstanding[0].title, "Client signature");
  assert.equal(report.outstanding[0].workstream.type, "audit");
  assert.equal(report.taxDeadlines[0].taxYear, "2025/26");
  assert.equal(report.taxDeadlines[0].urgency.level, "due_soon");
  for (const secret of ["SECRET ITEM NOTE", "SECRET TAX NOTE", "SECRET TAX REF", "reference", "revisions"]) {
    assert.equal(text.includes(secret), false, secret);
  }
});

test("holding-company reports retain hierarchy, progress and de-duplicated risk sources", () => {
  const { store, active, group } = reportStore();
  const report = buildRecordReport(store, "group", group.id, now);
  assert.equal(report.members.length, 1);
  assert.equal(report.members[0].id, active.id);
  assert.equal(report.outstanding.length, 1);
  assert.equal(report.outstanding[0].sourceId, active.id);
  assert.equal(report.taxDeadlines.length, 1);
  assert.equal(report.taxDeadlines[0].sourceId, active.id);
  assert.equal(JSON.stringify(report).includes("SECRET"), false);
});
