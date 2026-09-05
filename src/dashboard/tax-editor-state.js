import { makeTaxDeadline, reviseTaxDeadline } from "./model.js";

// Resolve company ownership without changing the reporting-period or workflow records.
export function taxEditorSource(store, kind, id) {
  if (!["entity", "project", "group"].includes(kind)) return null;
  const engagement = kind === "entity" ? null : store.engagements.find((entry) => entry.id === id);
  if (kind !== "entity" && !engagement) return null;
  const entity = store.entities.find((entry) => entry.id === (engagement?.entityId || id));
  return entity && !entity.archived && !engagement?.archived ? entity : null;
}

export function prepareTaxDeadlineSave(store, kind, id, baseline, values, reason = "") {
  const entity = taxEditorSource(store, kind, id);
  if (!entity) return { error: "source" };
  const current = baseline ? entity.taxDeadlines?.find((entry) => entry.id === baseline.id) : null;
  if (baseline && !current) return { error: "missing" };
  if (baseline && JSON.stringify(current) !== JSON.stringify(baseline)) return { error: "changed" };
  const revisionReason = typeof reason === "string" ? reason.trim() : "";
  if (current?.dueDate && values.dueDate && current.dueDate !== values.dueDate && !revisionReason) {
    return { error: "reason" };
  }
  const linked = store.engagements.find((entry) => entry.id === values.linkedEngagementId && entry.entityId === entity.id);
  const cleaned = { ...values, linkedEngagementId: linked?.id || null,
    linkedWorkstreamId: linked?.workstreams.some((entry) => entry.id === values.linkedWorkstreamId)
      ? values.linkedWorkstreamId : null };
  return { entityId: entity.id, deadline: current ? reviseTaxDeadline(current, cleaned, revisionReason) : makeTaxDeadline(cleaned) };
}

export function prepareTaxDeadlineRemoval(store, kind, id, deadlineId, baseline) {
  const entity = taxEditorSource(store, kind, id);
  if (!entity) return { error: "source" };
  const current = entity.taxDeadlines?.find((entry) => entry.id === deadlineId);
  if (!current) return { error: "missing" };
  if (baseline && JSON.stringify(current) !== JSON.stringify(baseline)) return { error: "changed" };
  return { entityId: entity.id };
}
