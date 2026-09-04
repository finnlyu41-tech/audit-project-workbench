import {
  collectGroupOutstandingEntries,
  collectGroupTaxDeadlineEntries,
  entityForEngagement,
  findParentMembership,
  groupProgress,
  memberIsReady,
  memberProgressPercentage,
  nodeStatus,
  outstandingIsOpen,
  projectStats,
  taxDeadlineUrgency,
  workstreamStats,
  yearEndOrPeriodLabel,
} from "./model.js";

export const DEFAULT_MANAGEMENT_REPORT_FILTERS = {
  status: "active",
  owner: "all",
  holdingCompanyId: "all",
  categoryId: "all",
  urgency: "all",
  dateFrom: "",
  dateTo: "",
};

function dayValue(value) {
  if (!value) return null;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? null : parsed;
}

function currentDay(now) {
  const date = now instanceof Date ? now : new Date(now);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function ageInDays(value, now) {
  const created = Date.parse(value || "");
  return Number.isNaN(created) ? 0 : Math.max(0, Math.floor((now.getTime() - created) / 86400000));
}

function deliveryUrgency(record, complete, now) {
  if (complete || !record.dueDate) return "none";
  const due = dayValue(record.dueDate);
  if (due === null) return "none";
  const days = Math.round((due - currentDay(now)) / 86400000);
  if (days < 0) return "overdue";
  if (days === 0) return "due_today";
  if (days <= 30) return "due_soon";
  return "none";
}

function directTaxSummary(record, now) {
  const open = (record.taxDeadlines || []).filter((deadline) => deadline.state === "open");
  const attention = open.filter((deadline) => ["overdue", "due_today", "due_soon"]
    .includes(taxDeadlineUrgency(deadline, now).level));
  const urgent = attention.map((deadline) => taxDeadlineUrgency(deadline, now).level);
  return {
    open: open.length,
    attention: attention.length,
    urgency: urgent.includes("overdue") ? "overdue" : urgent.includes("due_today") ? "due_today"
      : urgent.includes("due_soon") ? "due_soon" : "none",
  };
}

function directOutstanding(record, statuses) {
  return (record.outstandingItems || []).filter((item) => outstandingIsOpen(item, statuses));
}

function reportOutstanding(item, record = null) {
  const workstream = record?.workstreams?.find((candidate) => candidate.id === item.workstreamId);
  return {
    id: item.id,
    title: item.title || "",
    status: item.status,
    workstream: workstream ? { type: workstream.type, customName: workstream.customName || "" } : null,
    createdAt: item.createdAt || "",
  };
}

function reportTaxDeadline(deadline) {
  return {
    id: deadline.id,
    category: deadline.category,
    customName: deadline.customName || "",
    taxYear: deadline.taxYear || "",
    dueDate: deadline.dueDate || "",
    owner: deadline.owner || "",
    state: deadline.state,
  };
}

function reportSource(record, kind) {
  return { id: record.id, name: record.name || "", entity: kind === "project" ? record.entity || "" : "" };
}

function hierarchyPath(store, kind, id) {
  if (Array.isArray(store?.entities) && Array.isArray(store?.engagements)) {
    const engagement = store.engagements.find((item) => item.id === id);
    let entity = engagement ? entityForEngagement(store, engagement) : store.entities.find((item) => item.id === id);
    const path = [];
    const visited = new Set();
    while (entity?.parentEntityId && !visited.has(entity.id)) {
      visited.add(entity.id);
      const parent = store.entities.find((item) => item.id === entity.parentEntityId);
      if (!parent) break;
      path.unshift({ id: parent.id, name: parent.legalName });
      entity = parent;
    }
    return path;
  }
  const path = [];
  let currentKind = kind;
  let currentId = id;
  const visited = new Set();
  while (!visited.has(`${currentKind}:${currentId}`)) {
    visited.add(`${currentKind}:${currentId}`);
    const parent = findParentMembership(store, currentKind, currentId)?.group;
    if (!parent) break;
    path.unshift({ id: parent.id, name: parent.name });
    currentKind = "group";
    currentId = parent.id;
  }
  return path;
}

function groupContainsCategory(store, groupId, categoryId, visited = new Set()) {
  if (visited.has(groupId)) return false;
  const group = store.groups.find((item) => item.id === groupId);
  if (!group) return false;
  const nextVisited = new Set(visited).add(groupId);
  return group.members.some((member) => member.kind === "project"
    ? store.projects.some((project) => project.id === member.refId
      && project.workstreams.some((workstream) => workstream.categoryId === categoryId))
    : groupContainsCategory(store, member.refId, categoryId, nextVisited));
}

function insideHoldingCompany(store, kind, id, holdingCompanyId) {
  if (holdingCompanyId === "all") return true;
  if (Array.isArray(store?.entities) && Array.isArray(store?.engagements)) {
    const engagement = store.engagements.find((item) => item.id === id);
    const entity = engagement ? entityForEngagement(store, engagement) : store.entities.find((item) => item.id === id);
    return entity?.id === holdingCompanyId || hierarchyPath(store, kind, id).some((holding) => holding.id === holdingCompanyId);
  }
  if (kind === "group" && id === holdingCompanyId) return true;
  return hierarchyPath(store, kind, id).some((group) => group.id === holdingCompanyId);
}

function scheduleOverlaps(record, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true;
  const start = dayValue(record.startDate);
  const due = dayValue(record.dueDate);
  if (start === null && due === null) return false;
  const effectiveStart = start ?? due;
  const effectiveDue = due ?? start;
  if (dateFrom && effectiveDue < dayValue(dateFrom)) return false;
  if (dateTo && effectiveStart > dayValue(dateTo)) return false;
  return true;
}

function recordRow(store, kind, record, now) {
  const stats = kind === "project" ? projectStats(record) : groupProgress(store, record.id);
  const complete = kind === "project" ? stats.complete : stats.ready;
  const outstanding = directOutstanding(record, store.outstandingStatuses);
  const entity = Array.isArray(store?.entities) ? entityForEngagement(store, record.id) : null;
  const latestActive = entity && store.engagements.filter((engagement) => engagement.entityId === entity.id && !engagement.archived)
    .sort((left, right) => (right.periodEnd || "").localeCompare(left.periodEnd || ""))[0];
  const taxRecord = entity ? { taxDeadlines: (entity.taxDeadlines || []).filter((deadline) =>
    deadline.linkedEngagementId === record.id || (!deadline.linkedEngagementId && latestActive?.id === record.id)) } : record;
  const tax = directTaxSummary(taxRecord, now);
  const hierarchy = hierarchyPath(store, kind, record.id);
  return {
    kind,
    id: record.id,
    entityId: record.entityId || null,
    name: kind === "project" ? record.entity || record.name : record.name,
    periodLabel: Array.isArray(store?.engagements) ? yearEndOrPeriodLabel(record, "en") : "",
    periodPreset: record.periodPreset || "custom",
    periodStart: record.periodStart || "",
    periodEnd: record.periodEnd || "",
    reportingPeriods: record.reportingPeriods || [],
    engagementType: record.engagementType || "",
    secondaryName: kind === "project" && record.entity && record.name !== record.entity ? record.name : "",
    owner: record.owner || "",
    startDate: record.startDate || "",
    dueDate: record.dueDate || "",
    archived: Boolean(record.archived),
    complete,
    progress: kind === "project" ? stats.percentage : stats.percentage,
    completedWorkstreams: kind === "project" ? stats.completedWorkstreams : null,
    totalWorkstreams: kind === "project" ? stats.workstreams : null,
    hierarchy,
    deliveryUrgency: deliveryUrgency(record, complete, now),
    openOutstanding: outstanding.length,
    taxOpen: tax.open,
    taxAttention: tax.attention,
    taxUrgency: tax.urgency,
  };
}

function matchesStatus(row, status) {
  if (status === "archived") return row.archived;
  if (row.archived) return false;
  if (status === "completed") return row.complete;
  if (status === "active") return !row.complete;
  return true;
}

function matchesUrgency(row, urgency) {
  if (urgency === "all") return true;
  if (urgency === "open_outstanding") return row.openOutstanding > 0;
  return row.deliveryUrgency === urgency || row.taxUrgency === urgency;
}

export function buildPortfolioReport(store, suppliedFilters = {}, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  const filters = { ...DEFAULT_MANAGEMENT_REPORT_FILTERS, ...suppliedFilters };
  const rows = [
    ...store.projects.map((record) => recordRow(store, "project", record, now)),
    ...store.groups.map((record) => recordRow(store, "group", record, now)),
  ].filter((row) => {
    const record = row.kind === "project" ? store.projects.find((item) => item.id === row.id)
      : store.groups.find((item) => item.id === row.id);
    if (!matchesStatus(row, filters.status) || (filters.owner !== "all" && row.owner !== filters.owner)
      || !insideHoldingCompany(store, row.kind, row.id, filters.holdingCompanyId)
      || !scheduleOverlaps(record, filters.dateFrom, filters.dateTo) || !matchesUrgency(row, filters.urgency)) return false;
    if (filters.categoryId !== "all") return row.kind === "project"
      ? record.workstreams.some((workstream) => workstream.categoryId === filters.categoryId)
      : groupContainsCategory(store, row.id, filters.categoryId);
    return true;
  }).sort((left, right) => {
    const urgencyOrder = { overdue: 0, due_today: 1, due_soon: 2, none: 3 };
    const urgency = urgencyOrder[left.deliveryUrgency] - urgencyOrder[right.deliveryUrgency];
    return urgency || (left.dueDate || "9999").localeCompare(right.dueDate || "9999") || left.name.localeCompare(right.name);
  });

  const projectRows = rows.filter((row) => row.kind === "project" && !row.archived);
  const projectIds = new Set(projectRows.map((row) => row.id));
  const groupIds = new Set(rows.filter((row) => row.kind === "group" && !row.archived).map((row) => row.id));
  const completedWorkstreams = projectRows.reduce((sum, row) => sum + row.completedWorkstreams, 0);
  const totalWorkstreams = projectRows.reduce((sum, row) => sum + row.totalWorkstreams, 0);
  const selectedEntityIds = new Set(rows.map((row) => row.entityId).filter(Boolean));
  const taxRisks = (Array.isArray(store.entities) ? store.entities.filter((entity) => selectedEntityIds.has(entity.id))
    .flatMap((entity) => (entity.taxDeadlines || []).map((deadline) => ({
      record: { id: entity.id, name: entity.legalName, entity: entity.legalName }, kind: "entity",
      deadline: reportTaxDeadline(deadline),
    }))) : [
      ...store.projects.filter((record) => projectIds.has(record.id)).flatMap((record) => (record.taxDeadlines || []).map((deadline) => ({ record: reportSource(record, "project"),
        kind: "project", deadline: reportTaxDeadline(deadline) }))),
      ...store.groups.filter((record) => groupIds.has(record.id)).flatMap((record) => (record.taxDeadlines || []).map((deadline) => ({ record: reportSource(record, "group"),
        kind: "group", deadline: reportTaxDeadline(deadline) }))),
    ]).map((entry) => ({ ...entry, urgency: taxDeadlineUrgency(entry.deadline, now) }))
    .filter((entry) => ["overdue", "due_today", "due_soon"].includes(entry.urgency.level))
    .sort((left, right) => left.deadline.dueDate.localeCompare(right.deadline.dueDate));
  const outstandingRisks = [
    ...store.projects.filter((record) => projectIds.has(record.id)).flatMap((record) => directOutstanding(record, store.outstandingStatuses)
      .map((item) => ({ kind: "project", record: reportSource(record, "project"), item: reportOutstanding(item, record), ageDays: ageInDays(item.createdAt, now) }))),
    ...store.groups.filter((record) => groupIds.has(record.id)).flatMap((record) => directOutstanding(record, store.outstandingStatuses)
      .map((item) => ({ kind: "group", record: reportSource(record, "group"), item: reportOutstanding(item, record), ageDays: ageInDays(item.createdAt, now) }))),
  ].sort((left, right) => right.ageDays - left.ageDays);

  return {
    generatedAt: now.toISOString(),
    filters,
    metrics: {
      activeCompanies: new Set(rows.filter((row) => !row.archived).map((row) => row.entityId || `${row.kind}:${row.id}`)).size,
      annualEngagements: rows.filter((row) => !row.archived).length,
      completedWorkstreams,
      totalWorkstreams,
      overdueDeliveries: rows.filter((row) => row.deliveryUrgency === "overdue").length,
      taxAttention: taxRisks.length,
      openOutstanding: outstandingRisks.length,
    },
    rows,
    taxRisks,
    outstandingRisks,
  };
}

function projectRecordReport(store, project, now) {
  const stats = projectStats(project);
  const entity = project.entityId ? store.entities?.find((item) => item.id === project.entityId) : null;
  return {
    kind: "project",
    id: project.id,
    name: project.entity || project.name,
    secondaryName: project.entity && project.name !== project.entity ? project.name : "",
    engagementType: project.engagementType || "",
    owner: project.owner,
    periodStart: project.periodStart,
    periodEnd: project.periodEnd,
    reportingPeriods: project.reportingPeriods || [],
    period: project.period,
    reportingFramework: project.reportingFramework,
    startDate: project.startDate,
    dueDate: project.dueDate,
    archived: project.archived,
    complete: stats.complete,
    workstreams: project.workstreams.map((workstream) => {
      const workstreamResult = workstreamStats(workstream);
      const currentStage = workstream.nodes.find((node) => nodeStatus(node) !== "已完成") || null;
      return {
        id: workstream.id,
        type: workstream.type,
        customName: workstream.customName || "",
        stats: workstreamResult,
        currentStage: currentStage ? { id: currentStage.id, title: currentStage.title } : null,
      };
    }),
    outstanding: directOutstanding(project, store.outstandingStatuses).map((item) => ({
      ...reportOutstanding(item, project),
      ageDays: ageInDays(item.createdAt, now),
    })),
    taxDeadlines: (entity?.taxDeadlines || project.taxDeadlines || []).filter((deadline) => deadline.state === "open")
      .map((deadline) => ({ ...reportTaxDeadline(deadline), urgency: taxDeadlineUrgency(deadline, now) }))
      .sort((left, right) => (left.dueDate || "9999").localeCompare(right.dueDate || "9999")),
  };
}

function flattenGroupMembers(store, groupId, depth = 0, visited = new Set()) {
  if (visited.has(groupId)) return [];
  if (Array.isArray(store?.entities) && Array.isArray(store?.engagements)) {
    const engagement = store.engagements.find((item) => item.id === groupId);
    if (!engagement?.consolidation) return [];
    const nextVisited = new Set(visited).add(groupId);
    return engagement.consolidation.components.flatMap((component) => {
      const target = store.engagements.find((item) => item.id === component.engagementId);
      const entity = target ? entityForEngagement(store, target) : store.entities.find((item) => item.id === component.entityId);
      const kind = (entity?.kind || component.entitySnapshot?.kind) === "holding_company" ? "group" : "project";
      const conditions = component.readinessConditions || [];
      const childProgress = kind === "group" && target ? groupProgress(store, target.id) : null;
      const progress = target ? (kind === "group" ? childProgress.percentage
        : projectStats(target).workstreams ? ((target.workstreams || []).find((workstream) => workstream.type === "audit")
          ? workstreamStats(target.workstreams.find((workstream) => workstream.type === "audit")).percentage
          : (conditions.length ? Math.round((conditions.filter((condition) => condition.done).length / conditions.length) * 100) : 0)) : 0) : 0;
      const ready = target ? (kind === "group" ? childProgress.ready
        : conditions.length > 0 && conditions.every((condition) => condition.done)) : false;
      const row = {
        kind,
        id: target?.id || component.id,
        entityId: entity?.id || component.entityId,
        name: entity?.legalName || component.entitySnapshot?.legalName || "",
        periodLabel: target ? yearEndOrPeriodLabel(target, "en") : component.periodSnapshot?.label || "",
        owner: target?.owner || "",
        depth,
        archived: Boolean(target?.archived || entity?.archived),
        unresolved: !target,
        role: component.role || "",
        progress,
        ready,
        dueDate: target?.dueDate || "",
      };
      return kind === "group" && target ? [row, ...flattenGroupMembers(store, target.id, depth + 1, nextVisited)] : [row];
    });
  }
  const group = store.groups.find((item) => item.id === groupId);
  if (!group) return [];
  const nextVisited = new Set(visited).add(groupId);
  return group.members.flatMap((member) => {
    const target = member.kind === "project" ? store.projects.find((item) => item.id === member.refId)
      : store.groups.find((item) => item.id === member.refId);
    if (!target) return [];
    const row = {
      kind: member.kind,
      id: target.id,
      name: member.kind === "project" ? target.entity || target.name : target.name,
      owner: target.owner || "",
      depth,
      archived: Boolean(target.archived),
      role: member.role || "",
      progress: memberProgressPercentage(store, member),
      ready: memberIsReady(store, member),
      dueDate: target.dueDate || "",
    };
    return member.kind === "group" ? [row, ...flattenGroupMembers(store, target.id, depth + 1, nextVisited)] : [row];
  });
}

function groupRecordReport(store, group, now) {
  const progress = groupProgress(store, group.id);
  return {
    kind: "group",
    id: group.id,
    name: group.name,
    owner: group.owner,
    periodStart: group.periodStart,
    periodEnd: group.periodEnd,
    reportingPeriods: group.reportingPeriods || [],
    period: group.period,
    startDate: group.startDate,
    dueDate: group.dueDate,
    archived: group.archived,
    complete: progress.ready,
    progress,
    members: flattenGroupMembers(store, group.id),
    nodes: group.nodes.map((node) => ({ id: node.id, title: node.title, status: nodeStatus(node),
      completedConditions: node.conditions.filter((condition) => condition.done).length,
      conditions: node.conditions.length })),
    outstanding: collectGroupOutstandingEntries(store, group.id, new Set(), 0, group.archived)
      .filter((entry) => outstandingIsOpen(entry.item, store.outstandingStatuses))
      .map((entry) => { const source = entry.sourceType === "project"
        ? store.projects.find((project) => project.id === entry.sourceId) : null;
        return { sourceType: entry.sourceType, sourceId: entry.sourceId, sourceName: entry.sourceName, depth: entry.depth,
          item: reportOutstanding(entry.item, source), ageDays: ageInDays(entry.item.createdAt, now) }; }),
    taxDeadlines: collectGroupTaxDeadlineEntries(store, group.id, new Set(), 0, group.archived)
      .filter((entry) => entry.deadline.state === "open")
      .map((entry) => ({ sourceType: entry.sourceType, sourceId: entry.sourceId, sourceName: entry.sourceName, depth: entry.depth,
        deadline: reportTaxDeadline(entry.deadline), urgency: taxDeadlineUrgency(entry.deadline, now) }))
      .sort((left, right) => (left.deadline.dueDate || "9999").localeCompare(right.deadline.dueDate || "9999")),
  };
}

export function buildRecordReport(store, kind, id, nowValue = new Date()) {
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  if (kind === "entity") {
    const entity = store.entities?.find((item) => item.id === id);
    if (!entity) return null;
    const projects = (store.engagements || []).filter((engagement) => engagement.entityId === entity.id)
      .sort((left, right) => (right.periodEnd || "").localeCompare(left.periodEnd || "")).map((engagement) => {
        const viewKind = entity.kind === "holding_company" ? "group" : "project";
        const view = viewKind === "group" ? store.groups.find((item) => item.id === engagement.id)
          : store.projects.find((item) => item.id === engagement.id);
        const complete = viewKind === "group" ? Boolean(view && groupProgress(store, engagement.id).ready)
          : Boolean(view && projectStats(view).complete);
        return { id: engagement.id, kind: viewKind, label: yearEndOrPeriodLabel(engagement, "en"),
          engagementType: engagement.engagementType || "",
          periodStart: engagement.periodStart, periodEnd: engagement.periodEnd,
          reportingPeriods: engagement.reportingPeriods || [], owner: engagement.owner,
          startDate: engagement.startDate, dueDate: engagement.dueDate, archived: engagement.archived, complete };
      });
    return { kind: "entity", id: entity.id, name: entity.legalName, entityType: entity.entityType,
      entityKind: entity.kind,
      archived: entity.archived, fiscalYearPreset: entity.fiscalYearPreset, projects,
      children: (store.entities || []).filter((child) => child.parentEntityId === entity.id)
        .map((child) => ({ id: child.id, name: child.legalName, kind: child.kind, role: child.relationshipRole })),
      taxDeadlines: (entity.taxDeadlines || []).filter((deadline) => deadline.state === "open")
        .map((deadline) => ({ ...reportTaxDeadline(deadline), urgency: taxDeadlineUrgency(deadline, now) })),
      outstanding: (store.engagements || []).filter((engagement) => engagement.entityId === entity.id)
        .flatMap((engagement) => directOutstanding(engagement, store.outstandingStatuses).map((item) => ({
          engagementId: engagement.id,
          periodLabel: yearEndOrPeriodLabel(engagement, "en"),
          item: reportOutstanding(item, engagement),
          ageDays: ageInDays(item.createdAt, now),
        }))),
    };
  }
  if (kind === "project") {
    const project = store.projects.find((item) => item.id === id);
    return project ? projectRecordReport(store, project, now) : null;
  }
  const group = store.groups.find((item) => item.id === id);
  return group ? groupRecordReport(store, group, now) : null;
}
