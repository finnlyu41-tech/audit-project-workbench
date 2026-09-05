import { nodeIsComplete } from "./model.js";

export const RECENT_RECORDS_KEY = "audit-progress-workbench:recent-records:v1";
export const PRIORITY_FILTERS = ["all", "today", "overdue", "week", "outstanding", "setup"];
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

export function nextEngagementAction(engagement) {
  for (const workstream of engagement?.workstreams || []) {
    const node = (workstream.nodes || []).find((item) => !nodeIsComplete(item));
    if (node) return { workstreamId: workstream.id, node };
    if (!(workstream.nodes || []).length) return { workstreamId: workstream.id, node: null };
  }
  return null;
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
export function prepareQuickUpdate(store, id, baseline, values) {
  const engagement = store.engagements.find((item) => item.id === id);
  const entity = store.entities.find((item) => item.id === engagement?.entityId);
  if (!engagement || !entity || engagement.archived || entity.archived) return { error: "readonly" };
  const current = quickUpdateValues(engagement);
  const cleaned = quickUpdateValues(values);
  cleaned.owner = cleaned.owner.trim();
  const patch = {};
  for (const field of QUICK_FIELDS) {
    if (cleaned[field] === baseline[field]) continue;
    if (current[field] !== baseline[field] && current[field] !== cleaned[field]) return { error: "conflict" };
    if (current[field] !== cleaned[field]) patch[field] = cleaned[field];
  }
  const merged = { ...current, ...patch };
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
