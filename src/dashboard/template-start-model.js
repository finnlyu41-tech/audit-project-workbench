import { componentsForCurrentStructure, localizeGroupSample, makeEngagement, makeEntity,
  workstreamCategoryLabel } from './model.js';

export class TemplateStartError extends Error {
  constructor(code) { super(code); this.name = 'TemplateStartError'; this.code = code; }
}

export function resolveTemplateStarter(store, kind, id) {
  if (!['workstream', 'holding_company'].includes(kind)) return null;
  const sample = (kind === 'workstream' ? store.samples : store.groupSamples).find((item) => item.id === id);
  if (!sample) return null;
  const category = kind === 'workstream' ? store.workstreamCategories.find((item) => item.id === sample.categoryId) : null;
  if (kind === 'workstream' && !category) return null;
  return { kind, id, name: sample.name, entityKind: kind === 'workstream' ? 'company' : 'holding_company',
    fingerprint: JSON.stringify({ sample, category }),
    engagementTypes: [kind === 'holding_company' ? 'Group consolidation' : workstreamCategoryLabel(category, 'en')],
    selections: category ? [{ categoryId: category.id, type: category.builtinType || 'custom',
      customName: category.name || (category.builtinType ? '' : sample.name), sampleId: sample.id }] : [],
  };
}

export function templateStarterCompanies(store, starter, query = '') {
  if (!starter) return [];
  const normalize = (value) => String(value || '').normalize('NFKC').toLocaleLowerCase();
  const terms = normalize(query).trim().split(/\s+/u).filter(Boolean);
  return store.entities.filter((entity) => !entity.archived && entity.kind === starter.entityKind
    && terms.every((term) => normalize(entity.legalName).includes(term)))
    .sort((left, right) => left.legalName.localeCompare(right.legalName));
}

// Build a single candidate update. No draft company or partial project is persisted.
export function buildTemplateStart(store, request, values, language = 'en') {
  const initial = request.starter;
  const starter = resolveTemplateStarter(store, initial?.kind, initial?.id);
  if (!starter || starter.fingerprint !== initial.fingerprint) throw new TemplateStartError('template_changed');
  const pending = request.pendingCompany;
  if (pending && store.entities.some((entity) => entity.id === pending.id)) throw new TemplateStartError('company_changed');
  const entity = pending ? makeEntity(pending) : store.entities.find((item) => item.id === request.entityId);
  if (!entity || entity.archived || entity.kind !== starter.entityKind) throw new TemplateStartError('company_changed');
  if (pending && !entity.legalName.trim()) throw new TemplateStartError('company_changed');
  if (pending?.parentEntityId && !store.entities.some((item) => item.id === pending.parentEntityId
    && !item.archived && item.kind === 'holding_company')) throw new TemplateStartError('company_changed');
  const candidate = pending ? { ...store, entities: [entity, ...store.entities],
    entityOrder: [entity.id, ...(store.entityOrder || [])] } : store;
  const groupSample = starter.kind === 'holding_company'
    ? localizeGroupSample(store.groupSamples.find((sample) => sample.id === starter.id), language) : null;
  let engagement = makeEngagement({ ...values, id: undefined, entityId: entity.id,
    workstreamSelections: starter.selections }, { sourceMode: 'template', entity, store: candidate,
    samples: store.samples, workstreamCategories: store.workstreamCategories,
    outstandingStatuses: store.outstandingStatuses, groupSample });
  if (engagement.consolidation) engagement = { ...engagement, consolidation: { ...engagement.consolidation,
    components: componentsForCurrentStructure(candidate, entity.id, engagement.periodStart, engagement.periodEnd,
      groupSample, engagement.reportingPeriods) } };
  const kind = entity.kind === 'holding_company' ? 'group' : 'project';
  return { entity, engagement, kind, store: { ...candidate,
    engagements: [engagement, ...candidate.engagements],
    scheduleOrder: [`${kind}:${engagement.id}`, ...(candidate.scheduleOrder || [])] } };
}
