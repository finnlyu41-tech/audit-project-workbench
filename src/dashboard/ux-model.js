import { resolveScheduleDraft } from "./working-days.js";
import { nodeIsComplete, engagementReportingPeriods } from "./model.js";

export const RECENT_RECORDS_KEY = "audit-progress-workbench:recent-records:v1";
export const PRIORITY_FILTERS = ["all", "today", "overdue", "week", "manual", "outstanding", "setup"];
export const QUICK_FIELDS = ["owner", "startDate", "dueDate", "notes"];

export function priorityItemsFor(overview, filter = "all", owner = "") {
  const seen = new Set();
  return (overview.priorityItems || []).filter((item) => {
    const deadline = ["deadline", "upcoming"].includes(item.category);
    const key = deadline ? (item.alert?.scope === "tax" ? item.alert.id
      : `engagement:${item.record?.id || item.alert?.targetId}:${item.sortDate}`)
      : `${item.category}:${item.record?.id || item.entity?.id}:${item.item?.id || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    if (owner && (item.record?.engagement.owner || item.alert?.owner || "") !== owner) return false;
    if (filter === "manual") return item.category === "manual_priority";
    if (filter === "today") return item.urgency === "due_today";
    if (filter === "overdue") return item.urgency === "overdue";
    if (filter === "week") {
      const days = item.alert?.daysUntil ?? item.daysUntil;
      return deadline && Number.isFinite(days) && days >= 0 && days <= 7;
    }
    if (filter === "outstanding") return item.category === "outstanding";
    if (filter === "setup") return ["setup", "new_engagement"].includes(item.category);
    return true;
  });
}

export function sanitizeRecentRecords(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter((entry) => {
    if (!entry || !["entity", "project", "group"].includes(entry.kind)
      || typeof entry.id !== "string" || !entry.id || entry.id.length > 200) return false;
    const key = `${entry.kind}:${entry.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8).map(({ kind, id }) => ({ kind, id }));
}
export function rememberRecord(entries, entry) {
  if (!sanitizeRecentRecords([entry]).length) return entries;
  if (entries[0]?.id === entry.id && entries[0]?.kind === entry.kind) return entries;
  return sanitizeRecentRecords([entry, ...entries]);
}
export function recentRecordsFor(store, entries) {
  return sanitizeRecentRecords(entries).flatMap((entry) => {
    const engagement = entry.kind === "entity" ? null : store.engagements.find((item) => item.id === entry.id);
    const entity = store.entities.find((item) => item.id === (engagement?.entityId || entry.id));
    if (!entity || entity.archived || (entry.kind !== "entity" && (!engagement || engagement.archived))) return [];
    return [{ ...entry, kind: engagement ? (entity.kind === "holding_company" ? "group" : "project") : "entity",
      entity, engagement }];
  });
}

export function nextEngagementAction(engagement, statuses = []) {
  const pin = engagement?.nextAction;
  if (pin?.kind === 'outstanding') {
    const item = engagement.outstandingItems?.find(row => row.id === pin.itemId);
    if (item && !statuses.find(s => s.id === item.status)?.closed) return { item, workstreamId: item.workstreamId, node: null };
  }
  if (pin?.kind === 'workflow') {
    const nodes = pin.workstreamId ? engagement.workstreams?.find(w => w.id === pin.workstreamId)?.nodes : engagement.consolidation?.nodes;
    const node = nodes?.find(n => n.id === pin.nodeId && !nodeIsComplete(n));
    if (node) return { workstreamId: pin.workstreamId, node };
  }
  for (const workstream of engagement?.workstreams || []) {
    const node = (workstream.nodes || []).find((item) => !nodeIsComplete(item));
    if (node) return { workstreamId: workstream.id, node };
    if (!(workstream.nodes || []).length) return { workstreamId: workstream.id, node: null };
  }
  const node = engagement?.consolidation?.nodes?.find(n => !nodeIsComplete(n));
  return node ? { workstreamId: null, node } : null;
}
export function quickUpdateValues(engagement) {
  return Object.fromEntries(QUICK_FIELDS.map((key) => [key, String(engagement?.[key] || "")]));
}
function validDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
// Patch edited fields only; retain reporting periods, progress and concurrent edits.
export const quickUpdateContext = e => JSON.stringify([e?.entityId, engagementReportingPeriods(e).map(p => [p.periodStart, p.periodEnd])]);
export function prepareQuickUpdate(store, id, baseline, values, scheduleRequest = null) {
  const engagement = store.engagements.find((item) => item.id === id);
  const entity = store.entities.find((item) => item.id === engagement?.entityId);
  if (!engagement || !entity || engagement.archived || entity.archived) return { error: "readonly" };
  if (scheduleRequest?.baselineContext && scheduleRequest.baselineContext !== quickUpdateContext(engagement)) return { error: "conflict" };
  const current = quickUpdateValues(engagement);
  const cleaned = quickUpdateValues(values);
  cleaned.owner = cleaned.owner.trim();
  const patch = {};
  for (const field of QUICK_FIELDS) {
    if (cleaned[field] === baseline[field]) continue;
    if (current[field] !== baseline[field] && current[field] !== cleaned[field]) return { error: "conflict" };
    if (current[field] !== cleaned[field]) patch[field] = cleaned[field];
  }
  let merged = { ...current, ...patch };
  if (scheduleRequest) {
    const result = resolveScheduleDraft(scheduleRequest.draft, merged);
    if (result.error) return { error: result.error };
    for (const field of ['startDate', 'dueDate']) {
      if (result[field] === baseline[field]) continue;
      if (current[field] !== baseline[field] && current[field] !== result[field]) return { error: 'conflict' };
      if (current[field] !== result[field]) patch[field] = result[field];
    }
    const changedPlan = JSON.stringify(result.schedulePlan) !== JSON.stringify(scheduleRequest.baselinePlan);
    if (changedPlan || (('startDate' in patch || 'dueDate' in patch) && !result.schedulePlan && engagement.schedulePlan)) {
      if (JSON.stringify(engagement.schedulePlan) !== JSON.stringify(scheduleRequest.baselinePlan)
        && JSON.stringify(engagement.schedulePlan) !== JSON.stringify(result.schedulePlan)) return { error: 'conflict' };
      patch.schedulePlan = result.schedulePlan;
    }
    merged = { ...current, ...patch };
  } else if (Object.hasOwn(patch, 'startDate') || Object.hasOwn(patch, 'dueDate')) {
    // Legacy callers explicitly editing dates must not leave a stale formula.
    if (engagement.schedulePlan) patch.schedulePlan = undefined;
  }
  if (!validDate(merged.startDate) || !validDate(merged.dueDate)) return { error: "date" };
  if (merged.startDate && merged.dueDate && merged.dueDate < merged.startDate) return { error: "range" };
  return { patch };
}

// Cross-workspace links resolve current canonical identity, including archived sources.
export function resolveWorkspaceTarget(store, kind, id) {
  if (!["entity", "project", "group"].includes(kind) || typeof id !== "string" || !id) return null;
  const engagement = kind === "entity" ? null : store.engagements.find((item) => item.id === id);
  if (kind !== "entity" && !engagement) return null;
  const entity = store.entities.find((item) => item.id === (engagement?.entityId || id));
  if (!entity) return null;
  return { id, kind: engagement ? (entity.kind === "holding_company" ? "group" : "project") : "entity",
    entity, engagement, filter: entity.archived || engagement?.archived ? "archived" : "all" };
}
