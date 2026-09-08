import { engagementReportingPeriodsMatch, engagementsForEntity, groupProgress } from "./model.js";

// View-only diagnostics. Never infer audit readiness from reporting-period matches.
export function holdingComponentRows(store, engagement) {
  const entities = new Map(store.entities.map((entity) => [entity.id, entity]));
  const engagements = new Map(store.engagements.map((record) => [record.id, record]));
  return (engagement.consolidation?.components || []).map((component) => {
    const entity = entities.get(component.entityId) || null;
    const linked = engagements.get(component.engagementId);
    const target = entity && linked?.entityId === entity.id ? linked : null;
    const candidates = entity ? engagementsForEntity(store, entity.id) : [];
    const matches = candidates.filter((record) => engagementReportingPeriodsMatch(record, engagement));
    const conditions = component.readinessConditions || [];
    const status = !target ? "unassigned" : engagementReportingPeriodsMatch(target, engagement) ? "matched" : "mismatch";
    const ready = Boolean(entity && target && !entity.archived && !target.archived && status === 'matched'
      && (entity.kind === 'holding_company' ? groupProgress(store, target.id, new Set([engagement.id])).ready
        : conditions.length > 0 && conditions.every(c => c.done)));
    const reasons = !entity ? [{ kind: 'missing' }] : entity.archived || target?.archived ? [{ kind: 'archived' }]
      : !target ? [{ kind: 'unassigned' }] : status === 'mismatch' ? [{ kind: 'mismatch' }]
      : entity.kind === 'holding_company' ? ready ? [] : [{ kind: 'child' }]
      : !conditions.length ? [{ kind: 'no-conditions' }] : conditions.filter(c => !c.done).map(c => ({ kind: 'condition', label: c.label }));
    return { component, entity, target, candidates, matches, ready, reasons,
      name: entity?.legalName || component.entitySnapshot?.legalName || "",
      archived: Boolean(entity?.archived || target?.archived),
      historical: !entity || Boolean(entity.archived || target?.archived || (component.engagementId && !target)),
      status: !target ? "unassigned" : engagementReportingPeriodsMatch(target, engagement) ? "matched" : "mismatch",
      done: conditions.filter((condition) => condition.done).length, total: conditions.length };
  });
}

const normalizeQuery = (value) => String(value || "").normalize("NFKC").toLocaleLowerCase();
export function filterHoldingComponents(rows, query = "", status = "all") {
  const tokens = normalizeQuery(query).trim().split(/\s+/u).filter(Boolean);
  return rows.filter((row) => (status === "all" || (status === "notready" ? !row.ready : row.status === status))
    && tokens.every((token) => normalizeQuery([row.name, row.component.role, row.target?.owner].join(" ")).includes(token)));
}
