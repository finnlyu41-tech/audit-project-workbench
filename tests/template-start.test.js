import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplateStart, resolveTemplateStarter, templateStarterCompanies } from '../src/dashboard/template-start-model.js';
import { makeEntity, normalizeStore } from '../src/dashboard/model.js';
import { templateStartFixture } from './fixtures/template-start.js';
const fixture = () => normalizeStore(templateStartFixture());
const values = { periodStart: '2030-01-01', periodEnd: '2030-12-31', engagementTypes: ['Audit'], owner: '', startDate: '', dueDate: '' };
const request = (store) => ({ starter: resolveTemplateStarter(store, 'workstream', 'library-beta'), entityId: 'overview-company' });

test('explicit nondefault template creates only its reset workflow without changing source or defaults', () => {
  const store = fixture(); const before = JSON.stringify(store);
  const result = buildTemplateStart(store, request(store), values);
  assert.equal(result.engagement.workstreams.length, 1);
  assert.equal(result.engagement.workstreams[0].nodes[0].title, 'Chosen nondefault procedure');
  assert.equal(result.engagement.workstreams[0].nodes[0].conditions[0].done, false);
  assert.deepEqual(result.store.engagements.slice(1), store.engagements);
  assert.equal(result.store.entities, store.entities);
  assert.equal(result.store.samples, store.samples);
  assert.deepEqual(result.store.selectedSampleIdsByCategory, store.selectedSampleIdsByCategory);
  assert.equal(result.engagement.outstandingItems.length, 0);
  assert.equal(JSON.stringify(store), before);
});
test('new company and engagement are built together and no failed candidate can modify input', () => {
  const store = fixture(); const before = JSON.stringify(store);
  const pendingCompany = makeEntity({ legalName: 'Atomic Example Limited', kind: 'company' });
  const req = { ...request(store), pendingCompany };
  assert.throws(() => buildTemplateStart(store, req, { ...values, periodEnd: '' }));
  assert.equal(JSON.stringify(store), before);
  const result = buildTemplateStart(store, req, values);
  assert.equal(result.store.entities.length, store.entities.length + 1);
  assert.equal(result.engagement.entityId, pendingCompany.id);
  assert.equal(result.store.engagements.length, store.engagements.length + 1);
  assert.equal(JSON.stringify(store), before);
});
test('holding template is explicit, preserves its global default and resets consolidation conditions', () => {
  const store = fixture();
  const starter = resolveTemplateStarter(store, 'holding_company', 'start-group');
  const result = buildTemplateStart(store, { starter, entityId: 'overview-holding' }, { ...values, engagementTypes: ['Group consolidation'] });
  assert.equal(result.kind, 'group');
  assert.equal(result.engagement.workstreams.length, 0);
  assert.equal(result.engagement.consolidation.nodes[0].title, 'Chosen consolidation procedure');
  assert.equal(result.engagement.consolidation.nodes[0].conditions[0].done, false);
  assert.equal(result.store.selectedGroupSampleId, 'library-group');
});
test('changed or deleted templates and categories reject rather than falling back to a default', () => {
  for (const mutate of [s => { s.samples.find(x => x.id === 'library-beta').name = 'changed'; },
    s => { s.samples = s.samples.filter(x => x.id !== 'library-beta'); },
    s => { s.workstreamCategories = s.workstreamCategories.filter(x => x.id !== 'audit'); }]) {
    const store = fixture(); const req = request(store); mutate(store);
    const before = JSON.stringify(store);
    assert.throws(() => buildTemplateStart(store, req, values), { code: 'template_changed' });
    assert.equal(JSON.stringify(store), before);
  }
});
test('archived, missing and incompatible companies cannot receive a new template engagement', () => {
  for (const mutate of [s => { s.entities.find(x => x.id === 'overview-company').archived = true; },
    s => { s.entities = s.entities.filter(x => x.id !== 'overview-company'); },
    s => { s.entities.find(x => x.id === 'overview-company').kind = 'holding_company'; }]) {
    const store = fixture(); const req = request(store); mutate(store);
    assert.throws(() => buildTemplateStart(store, req, values), { code: 'company_changed' });
  }
});
test('existing reporting periods including archived periods cannot be recreated', () => {
  const store = fixture(); const before = JSON.stringify(store);
  for (const year of [2024, 2025, 2026, 2027]) assert.throws(() => buildTemplateStart(store, request(store), {
    ...values, periodStart: `${year}-01-01`, periodEnd: `${year}-12-31`,
  }), /already exists/);
  assert.equal(JSON.stringify(store), before);
});
test('company search is view-only and only includes compatible non-archived entities', () => {
  const store = fixture(); const starter = request(store).starter;
  const before = JSON.stringify(store);
  assert.deepEqual(templateStarterCompanies(store, starter, 'ＯＶＥＲＶＩＥＷ INTERNATIONAL').map(x => x.id), ['overview-company']);
  assert.equal(templateStarterCompanies(store, starter, 'holding').length, 0);
  assert.equal(JSON.stringify(store), before);
  store.entities.find(x => x.id === 'overview-company').archived = true;
  assert.equal(templateStarterCompanies(store, starter, 'international').length, 0);
});
test('a stale new-company parent or ID collision cannot create partial records', () => {
  const store = fixture(); const before = JSON.stringify(store);
  for (const pendingCompany of [makeEntity({ id: 'overview-company', legalName: 'Collision' }),
    makeEntity({ legalName: 'Missing Parent', parentEntityId: 'missing' })]) {
    assert.throws(() => buildTemplateStart(store, { ...request(store), pendingCompany }, values), { code: 'company_changed' });
  }
  assert.equal(JSON.stringify(store), before);
});
test('custom categories and tax templates stay in their own workstreams', () => {
  const store = fixture();
  const tax = resolveTemplateStarter(store, 'workstream', 'library-tax');
  assert.equal(tax.selections[0].categoryId, 'tax_computation_filing');
  store.workstreamCategories.push({ id: 'custom-assurance', name: 'Special assurance', builtinType: null });
  const custom = { ...store.samples.find(x => x.id === 'library-beta'), id: 'custom-starter', categoryId: 'custom-assurance', workstreamType: 'custom' };
  store.samples.push(custom);
  const starter = resolveTemplateStarter(store, 'workstream', custom.id);
  const result = buildTemplateStart(store, { starter, entityId: 'overview-company' }, { ...values, engagementTypes: starter.engagementTypes });
  assert.equal(result.engagement.workstreams[0].categoryId, 'custom-assurance');
  assert.equal(result.engagement.workstreams[0].customName, 'Special assurance');
  assert.equal(result.engagement.workstreams.length, 1);
});
