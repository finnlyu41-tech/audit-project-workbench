import { canonicalStorePayload, emptyStore, makeEngagement, makeEntity, makeNode,
  makeWorkstream, normalizeStore } from "../../src/dashboard/model.js";

// Fictional annual records. No client data or snapshots from a user's workspace.
export function companyOverviewFixture() {
  const base = canonicalStorePayload(emptyStore());
  const company = makeEntity({ id: "overview-company", legalName: "Overview Example International Limited" });
  const holding = makeEntity({ id: "overview-holding", legalName: "Overview Holding Limited", kind: "holding_company" });
  const empty = makeEntity({ id: "overview-empty", legalName: "Overview Empty Limited" });
  const job = (entity, id, year, overrides = {}) => makeEngagement({ id, entityId: entity.id,
    periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`, owner: "Alex Search", ...overrides },
  { entity, store: base, sourceMode: "blank", workstreamCategories: base.workstreamCategories });
  const old = job(company, "overview-old", 2024); old.archived = true;
  const combined = job(company, "overview-combined", 2025, { reportingPeriods: [
    { periodStart: "2025-01-01", periodEnd: "2025-12-31" }, { periodStart: "2026-01-01", periodEnd: "2026-12-31" }],
    startDate: "2026-09-01", dueDate: "2026-12-20", engagementTypes: ["Audit", "Bookkeeping"] });
  const next = job(company, "overview-next", 2027, { owner: "Long Owner Example With Several Names",
    dueDate: "2027-10-31", notes: "private-note-not-searchable" });
  combined.workstreams = [makeWorkstream({ type: "audit", categoryId: "audit" }, [
    makeNode({ title: "Fictional completed stage", conditions: ["Fictional completion"] })])];
  combined.workstreams[0].nodes[0].conditions[0].done = true;
  old.outstandingItems = [{ id: "archived-query", title: "Archived fictional query", status: "missing_document", note: "" }];
  combined.outstandingItems = [{ id: "current-query", title: "Current fictional query", status: "missing_document", note: "" }];
  const group = job(holding, "overview-group", 2026);
  group.consolidation.nodes = [makeNode({ title: "Fictional consolidation", conditions: ["Done step", "Pending step"] })];
  group.consolidation.nodes[0].conditions[0].done = true;
  group.consolidation.components = [{ id: "overview-part", entityId: company.id, engagementId: combined.id,
    role: "Subsidiary", auditType: "internal_team", readinessConditions: [
      { id: "overview-ready", label: "Fictional readiness review", done: false }] }];
  return canonicalStorePayload(normalizeStore({ ...base, entities: [company, holding, empty],
    engagements: [old, combined, next, group], entityOrder: [company.id, holding.id, empty.id] }));
}
