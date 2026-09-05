import { engagementMatchesNavigationFilters, groupProgress, projectStats } from "./model.js";
import { resolveWorkspaceTarget } from "./ux-model.js";

export const emptyNavigationFilters = () => ({ owner: "", engagementType: "", reportingYear: "" });
export function navigationSnapshot(state) {
  return { workspaceView: state.workspaceView, selection: state.selection ? { ...state.selection } : null,
    search: state.search || "", filter: state.filter || "active", navigationView: state.navigationView || "companies",
    navigationFilters: { ...emptyNavigationFilters(), ...state.navigationFilters }, navigationFiltersOpen: Boolean(state.navigationFiltersOpen),
    activeWorkstreamId: state.activeWorkstreamId || null, scrollTop: Math.max(0, Number(state.scrollTop) || 0) };
}
export function sameNavigationDestination(left, right) {
  return left?.workspaceView === right?.workspaceView && left?.selection?.kind === right?.selection?.kind
    && left?.selection?.id === right?.selection?.id;
}
// History contains UI state only and stays in memory. Resolve stale identities against current records.
export function restoreNavigationSnapshot(store, saved) {
  if (!saved || !["home", "detail", "schedule", "report"].includes(saved.workspaceView)) return null;
  const entry = navigationSnapshot(saved);
  const target = saved.selection && resolveWorkspaceTarget(store, saved.selection.kind, saved.selection.id);
  if (!target) {
    if (saved.workspaceView === "detail" && saved.selection) return null;
    return { ...entry, selection: null, activeWorkstreamId: null };
  }
  entry.selection = { kind: target.kind, id: target.id };
  if (target.filter === "archived") entry.filter = "archived";
  else if (entry.filter === "archived" && !(target.kind === "entity"
    && store.engagements.some((item) => item.entityId === target.id && item.archived))) entry.filter = "all";
  const engagements = target.engagement ? [target.engagement] : store.engagements.filter((item) => item.entityId === target.entity.id);
  if (!engagements.some((item) => engagementMatchesNavigationFilters(item, entry.navigationFilters))) {
    entry.navigationFilters = emptyNavigationFilters();
  }
  if (target.engagement && ["active", "completed"].includes(entry.filter)) {
    const complete = target.kind === "group" ? groupProgress(store, target.id).ready : projectStats(target.engagement).complete;
    if ((entry.filter === "completed") !== Boolean(complete)) entry.filter = "all";
  }
  if (!target.engagement?.workstreams?.some((item) => item.id === entry.activeWorkstreamId)) entry.activeWorkstreamId = null;
  return entry;
}
