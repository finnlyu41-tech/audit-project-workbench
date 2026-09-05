import { engagementLatestPeriodEnd, engagementReportingYears, engagementTypeValues, engagementTypesLabel, groupProgress, projectStats, workspaceScheduleOrder, yearEndOrPeriodLabel } from "./model.js";

function matchesFilter(item, complete, filter) {
  if (filter === "archived") return item.archived;
  if (item.archived) return false;
  if (filter === "completed") return complete;
  if (filter === "active") return !complete;
  return true;
}

export function scheduleRows(store, filter, language = "en") {
  if (Array.isArray(store.entities) && Array.isArray(store.engagements)) {
    const entityById = new Map(store.entities.map((entity) => [entity.id, entity]));
    const latestByEntity = new Map();
    store.engagements.filter((engagement) => !engagement.archived).forEach((engagement) => {
      const current = latestByEntity.get(engagement.entityId);
      if (!current || engagementLatestPeriodEnd(engagement) > engagementLatestPeriodEnd(current)) {
        latestByEntity.set(engagement.entityId, engagement);
      }
    });
    const order = new Map(workspaceScheduleOrder(store).map((key, index) => [key, index]));
    return store.engagements.flatMap((engagement) => {
      const entity = entityById.get(engagement.entityId);
      if (!entity) return [];
      const kind = entity.kind === "holding_company" ? "group" : "project";
      const view = kind === "group" ? store.groups.find((group) => group.id === engagement.id)
        : store.projects.find((project) => project.id === engagement.id);
      const complete = kind === "group" ? Boolean(view && groupProgress(store, engagement.id).ready)
        : Boolean(view && projectStats(view).complete);
      const row = {
        id: engagement.id,
        kind,
        name: entity.legalName,
        engagement,
        periodLabel: yearEndOrPeriodLabel(engagement, language),
        engagementTypes: engagement.engagementTypes || [],
        engagementType: engagement.engagementType || "",
        secondaryName: "",
        owner: engagement.owner,
        startDate: engagement.startDate,
        dueDate: engagement.dueDate,
        taxDeadlines: (entity.taxDeadlines || []).filter((deadline) => deadline.state === "open" && deadline.dueDate
          && (deadline.linkedEngagementId === engagement.id
            || (!deadline.linkedEngagementId && latestByEntity.get(entity.id)?.id === engagement.id))),
        archived: Boolean(entity.archived || engagement.archived),
        complete,
      };
      return matchesFilter(row, complete, filter) ? [row] : [];
    }).sort((left, right) => (order.get(`${left.kind}:${left.id}`) ?? Number.MAX_SAFE_INTEGER)
      - (order.get(`${right.kind}:${right.id}`) ?? Number.MAX_SAFE_INTEGER) || left.name.localeCompare(right.name));
  }
  const projects = store.projects.map((project) => ({
    id: project.id,
    kind: "project",
    name: project.entity || project.name,
    secondaryName: project.entity && project.name !== project.entity ? project.name : "",
    owner: project.owner,
    startDate: project.startDate,
    dueDate: project.dueDate,
    taxDeadlines: (project.taxDeadlines || []).filter((deadline) => deadline.state === "open" && deadline.dueDate),
    archived: project.archived,
    complete: projectStats(project).complete,
  }));
  const groups = store.groups.map((group) => ({
    id: group.id,
    kind: "group",
    name: group.name,
    secondaryName: "",
    owner: group.owner,
    startDate: group.startDate,
    dueDate: group.dueDate,
    taxDeadlines: (group.taxDeadlines || []).filter((deadline) => deadline.state === "open" && deadline.dueDate),
    archived: group.archived,
    complete: groupProgress(store, group.id).ready,
  }));
  const order = new Map(workspaceScheduleOrder(store).map((key, index) => [key, index]));
  return [...projects, ...groups].filter((row) => matchesFilter(row, row.complete, filter)).sort((left, right) =>
    (order.get(`${left.kind}:${left.id}`) ?? Number.MAX_SAFE_INTEGER)
      - (order.get(`${right.kind}:${right.id}`) ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name));
}

// View-only filters. Keep source order, tax attachment rules and schedule dates untouched.
const normalizeQuery = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase();
export function filterScheduleRows(rows, { query = "", dateScope = "all", language = "en" } = {}) {
  const tokens = normalizeQuery(query).trim().split(/\s+/u).filter(Boolean);
  return rows.filter((row) => {
    const scheduled = Boolean(row.startDate && row.dueDate);
    if (dateScope === "incomplete" && scheduled || dateScope === "scheduled" && !scheduled) return false;
    const text = normalizeQuery([row.name, row.secondaryName, row.owner, row.periodLabel,
      engagementTypesLabel(row, language), ...engagementTypeValues(row),
      ...engagementReportingYears(row.engagement || row)].join(" "));
    return tokens.every((token) => text.includes(token));
  });
}
