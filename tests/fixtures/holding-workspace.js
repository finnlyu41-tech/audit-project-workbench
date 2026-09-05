import { canonicalStorePayload, emptyStore, makeEngagement, makeEntity, makeNode,
  makeWorkstream, normalizeStore } from "../../src/dashboard/model.js";

// Fictional records only. One matched, one unassigned, one mismatched and one missing company.
export function holdingWorkspace() {
  const base = canonicalStorePayload(emptyStore());
  const parent = makeEntity({ id: "holding-parent", legalName: "Example Consolidation Holdings", kind: "holding_company" });
  const alpha = makeEntity({ id: "holding-alpha", legalName: "Alpha Example International Services and Advisory Limited",
    parentEntityId: parent.id, relationshipRole: "Subsidiary" });
  const beta = makeEntity({ id: "holding-beta", legalName: "Beta Example Limited", parentEntityId: parent.id });
  const cedar = makeEntity({ id: "holding-cedar", legalName: "Cedar Example Limited", parentEntityId: parent.id });
  const job = (entity, id, year, owner) => makeEngagement({ id, entityId: entity.id,
    periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`, owner },
  { entity, store: base, sourceMode: "blank", workstreamCategories: base.workstreamCategories });
  const parentJob = job(parent, "holding-annual", 2026, "Morgan Keeper");
  const alphaOld = job(alpha, "alpha-old", 2025, "Alex Example");
  const alphaCurrent = job(alpha, "alpha-current", 2026, "Alex Example");
  const cedarJob = job(cedar, "cedar-annual", 2026, "Cedar Owner"); cedarJob.archived = true;
  alphaOld.workstreams = [makeWorkstream({ type: "audit", categoryId: "audit" }, [makeNode({ title: "Fictional stage",
    conditions: ["Existing workflow completion"] })])];
  const part = (id, entity, target) => ({ id, entityId: entity.id, engagementId: target?.id || null,
    role: "Subsidiary", auditType: "internal_team", entitySnapshot: { id: entity.id, legalName: entity.legalName, kind: "company" },
    readinessConditions: [{ id: `${id}-ready`, label: "Review the component reporting package and all supporting schedules", done: false }] });
  parentJob.consolidation.components = [part("part-alpha", alpha, alphaOld), part("part-beta", beta),
    part("part-cedar", cedar, cedarJob), part("part-missing", { id: "deleted-entity", legalName: "Former Example Limited" })];
  return canonicalStorePayload(normalizeStore({ ...base, entities: [parent, alpha, beta, cedar],
    engagements: [parentJob, alphaOld, alphaCurrent, cedarJob], entityOrder: [parent.id, alpha.id, beta.id, cedar.id] }));
}
