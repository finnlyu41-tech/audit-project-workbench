import { componentsForCurrentStructure, localizeGroupSample, makeEngagement } from './model.js';

export class AnnualSourceError extends Error {
  constructor(code) { super(code); this.name = 'AnnualSourceError'; this.code = code; }
}
// The initial shortcut is not authoritative. Resolve the submitted choice against current records.
export function resolveAnnualSource(store, entityId, options, selections = []) {
  const entity = store.entities.find((item) => item.id === entityId);
  if (!entity || entity.archived) throw new AnnualSourceError('company_unavailable');
  const sourceMode = options.sourceMode;
  if (!['previous', 'template', 'blank'].includes(sourceMode)) throw new AnnualSourceError('source_unavailable');
  const sourceId = options.sourceEngagementId ?? options.sourceEngagement?.id;
  const sourceEngagement = sourceMode === 'previous'
    ? store.engagements.find((item) => item.id === sourceId && item.entityId === entityId) : null;
  if (sourceMode === 'previous' && !sourceEngagement) throw new AnnualSourceError('source_unavailable');
  if (sourceMode === 'template') {
    for (const selection of selections) {
      const category = store.workstreamCategories.find((item) => item.id === selection.categoryId);
      if (!category || (selection.sampleId && !store.samples.some((item) => item.id === selection.sampleId
        && item.categoryId === category.id))) throw new AnnualSourceError('template_unavailable');
    }
  }
  const groupSample = store.groupSamples.find((item) => item.id === store.selectedGroupSampleId)
    || (!store.selectedGroupSampleId ? store.groupSamples[0] : null);
  if (entity.kind === 'holding_company' && store.selectedGroupSampleId && !groupSample) {
    throw new AnnualSourceError('template_unavailable');
  }
  return { entity, sourceMode, sourceEngagement, groupSample: groupSample || { name: '', description: '', nodes: [], readinessTemplates: {} } };
}

export function annualSourcePreview(store, entityId, options, selections = []) {
  const resolved = resolveAnnualSource(store, entityId, options, selections);
  const { entity, sourceMode, sourceEngagement, groupSample } = resolved;
  const workstreams = sourceMode === 'blank' ? [] : sourceMode === 'previous' ? sourceEngagement.workstreams
    : selections.map((selection) => ({ ...selection,
      nodes: store.samples.find((sample) => sample.id === selection.sampleId)?.nodes || [] }));
  const consolidationNodes = entity.kind !== 'holding_company' || sourceMode === 'blank' ? []
    : sourceMode === 'previous' && sourceEngagement.consolidation ? sourceEngagement.consolidation.nodes : groupSample.nodes;
  const nodes = [...workstreams.flatMap((workstream) => workstream.nodes), ...consolidationNodes];
  return { ...resolved, modules: workstreams.length, nodes: nodes.length,
    conditions: nodes.reduce((count, node) => count + node.conditions.length, 0),
    consolidationNodes: consolidationNodes.length };
}

// Validate everything before returning a new record. Existing records are never mutated.
export function buildAnnualEngagement(store, entityId, values, options, language = 'en') {
  const resolved = resolveAnnualSource(store, entityId, options, values.workstreamSelections || []);
  const { entity } = resolved;
  const groupSample = localizeGroupSample(resolved.groupSample, language);
  let engagement = makeEngagement({ ...values, id: undefined, entityId }, { ...resolved, groupSample,
    store, samples: store.samples, workstreamCategories: store.workstreamCategories,
    outstandingStatuses: store.outstandingStatuses });
  if (engagement.consolidation) engagement = { ...engagement, consolidation: { ...engagement.consolidation,
    components: componentsForCurrentStructure(store, entity.id, engagement.periodStart, engagement.periodEnd,
      groupSample, engagement.reportingPeriods) } };
  return { engagement, kind: entity.kind === 'holding_company' ? 'group' : 'project' };
}
