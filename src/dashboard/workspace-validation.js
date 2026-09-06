// Validate persisted structure before normalization can discard or reinterpret supplied data.
// Historical component references may be missing; a live engagement's company may not.
const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const optional = (row, key, check) => row[key] === undefined || check(row[key]);
const string = value => typeof value === 'string';
const boolean = value => typeof value === 'boolean';
const reference = value => value === null || string(value);
export function calendarDate(value) {
  if (!string(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validWorkspaceRecords(value, legacy = false) {
  if (!record(value)) return false;
  const date = value => string(value) && (legacy || value === '' || calendarDate(value));
  const fields = (row, texts = [], flags = [], dates = [], refs = []) => record(row)
    && texts.every(key => optional(row, key, string)) && flags.every(key => optional(row, key, boolean))
    && dates.every(key => optional(row, key, date)) && refs.every(key => optional(row, key, reference));
  const rows = (items, check, identified = true) => {
    if (!Array.isArray(items)) return false;
    const seen = new Set();
    return items.every(item => {
      if (!record(item)) return legacy && string(item) && !identified;
      if (identified && ((!legacy && (!string(item.id) || !item.id))
        || (item.id !== undefined && (!string(item.id) || seen.has(item.id))))) return false;
      if (identified && item.id) seen.add(item.id);
      return check(item);
    });
  };
  const list = (row, key, check, identified = true) => optional(row, key, items => rows(items, check, identified));
  const strings = value => Array.isArray(value) && value.every(string);
  const condition = row => fields(row, ['label'], ['done']);
  const node = row => fields(row, ['title', 'description']) && list(row, 'conditions', condition, !legacy);
  const builtinTypes = ['quote_collection', 'bookkeeping', 'audit', 'tax_computation_filing', 'cdd', 'custom'];
  const workstream = row => (legacy || builtinTypes.includes(row.type)) && fields(row, ['type', 'categoryId', 'customName', 'owner'], [], ['dueDate'])
    && list(row, 'nodes', node);
  const outstanding = row => fields(row, ['title', 'note', 'status'], [], [], ['workstreamId']);
  const period = row => fields(row, ['periodPreset', 'label'], [], ['periodStart', 'periodEnd'])
    && (!row.periodStart || !row.periodEnd || row.periodEnd >= row.periodStart);
  const revision = row => fields(row, ['reason', 'changedAt'], [], ['fromDueDate', 'toDueDate']);
  const tax = row => fields(row, ['category', 'customName', 'taxYear', 'owner', 'state', 'reference', 'note', 'completedAt'], [],
    ['dueDate', 'originalDueDate'], ['linkedEngagementId', 'linkedWorkstreamId'])
    && list(row, 'revisions', revision, false)
    && optional(row, 'reminderDays', n => legacy || (Number.isInteger(n) && n >= 0 && n <= 365));
  const component = row => fields(row, ['role', 'auditType'], [], [], ['entityId', 'engagementId', 'refId'])
    && list(row, 'readinessConditions', condition, !legacy)
    && optional(row, 'entitySnapshot', s => fields(s, ['id', 'legalName', 'entityType', 'kind']))
    && optional(row, 'periodSnapshot', s => period(s) && fields(s, ['engagementId']) && list(s, 'reportingPeriods', period));
  const consolidation = row => fields(row, ['structureSyncedAt'], ['enabled'])
    && list(row, 'nodes', node) && list(row, 'components', component);
  const engagement = row => fields(row, ['internalName', 'name', 'entity', 'entityId', 'owner', 'notes', 'reportingFramework'],
    ['archived'], ['periodStart', 'periodEnd', 'startDate', 'dueDate'])
    && list(row, 'reportingPeriods', period) && list(row, 'workstreams', workstream)
    && list(row, 'outstandingItems', outstanding) && list(row, 'taxDeadlines', tax)
    && list(row, 'nodes', node) && list(row, 'members', component)
    && optional(row, 'consolidation', v => v === null || consolidation(v))
    && optional(row, 'engagementTypes', strings)
    && optional(row, 'conversionState', state => record(state)
      && optional(state, 'project', v => fields(v, ['entity', 'reportingFramework']) && list(v, 'workstreams', workstream))
      && optional(state, 'group', v => fields(v, [], ['consolidationEnabled']) && list(v, 'nodes', node)));
  const entity = row => fields(row, ['legalName', 'entityType', 'kind', 'relationshipRole', 'notes', 'fiscalYearPreset'],
    ['archived'], ['incorporationDate'], ['parentEntityId']) && list(row, 'taxDeadlines', tax);
  const sample = row => fields(row, ['name', 'description', 'workstreamType', 'categoryId']) && list(row, 'nodes', node)
    && optional(row, 'tags', strings) && optional(row, 'readinessTemplates', values => record(values)
      && Object.values(values).every(items => rows(items, condition, !legacy)));
  if (!list(value, 'entities', entity) || !list(value, 'engagements', engagement)
    || !list(value, 'projects', engagement) || !list(value, 'groups', engagement)
    || !list(value, 'samples', sample) || !list(value, 'groupSamples', sample)
    || !list(value, 'outstandingStatuses', row => fields(row, ['label', 'color'], ['closed']))
    || !list(value, 'workstreamCategories', row => fields(row, ['name', 'builtinType']))) return false;
  if (legacy) return true;
  const entities = new Map((value.entities || []).map(e => [e.id, e]));
  const jobs = new Map((value.engagements || []).map(e => [e.id, e]));
  for (const entity of entities.values()) {
    const seen = new Set([entity.id]); let parent = entity.parentEntityId;
    while (parent) {
      if (seen.has(parent) || !entities.has(parent) || entities.get(parent).kind !== 'holding_company') return false;
      seen.add(parent); parent = entities.get(parent).parentEntityId;
    }
  }
  for (const job of jobs.values()) {
    if (!entities.has(job.entityId)) return false;
    const periods = (job.reportingPeriods || []).map(p => `${p.periodStart || ''}|${p.periodEnd || ''}`);
    if (new Set(periods).size !== periods.length) return false;
    const types = (job.workstreams || []).filter(w => w.type !== 'custom').map(w => w.type);
    if (new Set(types).size !== types.length) return false;
    if (value.outstandingStatuses && (job.outstandingItems || []).some(item =>
      !value.outstandingStatuses.some(status => status.id === item.status))) return false;
    for (const component of job.consolidation?.components || []) {
      const linked = jobs.get(component.engagementId);
      if (linked && component.entityId && linked.entityId !== component.entityId) return false;
    }
  }
  return true;
}
