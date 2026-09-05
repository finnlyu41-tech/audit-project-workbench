import test from 'node:test';
import assert from 'node:assert/strict';
import { templateLibraryFixture } from './fixtures/template-library.js';
import { normalizeStore } from '../src/dashboard/model.js';
import { createTemplatePackage, templatePackagePreview } from '../src/dashboard/template-packages.js';
import { templateExportRows, filterTemplateExportRows, toggleTemplateSelection,
  templateImportDecisions, templateImportDraft, templateImportCounts } from '../src/dashboard/template-transfer-view.js';
const fixture = () => normalizeStore(templateLibraryFixture());
const rowsFor = (store, language = 'en') => templateExportRows(store.samples, store.groupSamples, store.workstreamCategories, language);

test('package export rows keep stable order and original template identity', () => {
  const store = fixture(); const before = JSON.stringify(store); const rows = rowsFor(store);
  assert.equal(rows.length, 4); assert.equal(rows[0].sample, store.samples[0]);
  assert.deepEqual(filterTemplateExportRows(rows), rows); assert.equal(JSON.stringify(store), before);
});
test('export searches combine normalized metadata tokens without indexing workflow text', () => {
  const rows = rowsFor(fixture());
  assert.deepEqual(filterTemplateExportRows(rows, 'ｂｅｔａ ２０２５').map((row) => row.sample.id), ['library-beta']);
  assert.equal(filterTemplateExportRows(rows, 'holding review').length, 1);
  for (const word of ['NOTINDEXEDSTAGETEXT', 'NOTINDEXEDCRITERION', 'no-match-phrase']) assert.equal(filterTemplateExportRows(rows, word).length, 0);
});
test('selecting or deselecting matches preserves hidden selections and leaves inputs untouched', () => {
  const rows = rowsFor(fixture()); const selected = new Set([rows[0].key]); const visible = filterTemplateExportRows(rows, 'beta');
  const added = toggleTemplateSelection(selected, visible, true);
  assert.equal(added.size, 2); assert.equal(selected.size, 1);
  const removed = toggleTemplateSelection(added, visible, false); assert.deepEqual(removed, selected);
  assert.deepEqual(toggleTemplateSelection(selected, [], true), selected);
});
test('workstream and holding templates with the same ID remain distinct choices', () => {
  const store = fixture(); store.groupSamples[0].id = store.samples[0].id;
  const rows = rowsFor(store); assert.equal(new Set(rows.map((row) => row.key)).size, rows.length);
  assert.equal(toggleTemplateSelection(new Set(), rows, true).size, rows.length);
});
test('export category labels are searchable in each interface language', () => {
  const store = fixture();
  for (const language of ['en', 'zh-Hans', 'zh-Hant']) {
    const rows = rowsFor(store, language); const name = rows.find((row) => row.sample.id === 'library-tax').categoryName;
    assert.ok(name); assert.ok(filterTemplateExportRows(rows, name).some((row) => row.sample.id === 'library-tax'));
  }
});
test('import defaults remain copies and decision counts do not apply the package', () => {
  const store = fixture(); const before = JSON.stringify(store);
  const pkg = createTemplatePackage(store, { sampleIds: ['library-alpha'], groupSampleIds: ['library-group'] });
  const decisions = templateImportDecisions(templatePackagePreview(store, pkg));
  assert.deepEqual(templateImportCounts(decisions), { copy: 2, replace: 0, skip: 0 });
  const key = Object.keys(decisions)[0]; decisions[key].action = 'replace';
  assert.deepEqual(templateImportCounts(decisions), { copy: 1, replace: 1, skip: 0 });
  assert.equal(JSON.stringify(store), before);
});
test('draft comparison ignores inactive replacement targets and skipped mapping fields', () => {
  const a = { x: { action: 'copy', targetId: 'one', categoryId: 'audit' } };
  const b = { x: { action: 'copy', targetId: 'two', categoryId: 'audit' } };
  assert.deepEqual(templateImportDraft(a), templateImportDraft(b));
  a.x.action = b.x.action = 'replace'; assert.notDeepEqual(templateImportDraft(a), templateImportDraft(b));
  a.x.action = b.x.action = 'skip'; b.x.categoryId = 'tax';
  assert.deepEqual(templateImportDraft(a), templateImportDraft(b));
});

test('holding-company kind search uses the visible localized label without rewriting template metadata', () => {
  const store = fixture();
  store.groupSamples[0].name = 'Consolidation workflow';
  store.groupSamples[0].description = 'Fictional stages';
  store.groupSamples[0].tags = [];
  const before = JSON.stringify(store);
  for (const [language, label] of [['en', 'Holding company template'], ['zh-Hans', '控股公司范本'], ['zh-Hant', '控股公司範本']]) {
    const rows = templateExportRows(store.samples, store.groupSamples, store.workstreamCategories, language, label);
    assert.equal(rows.find((row) => row.kind === 'holding_company').categoryName, label);
    assert.deepEqual(filterTemplateExportRows(rows, label).map((row) => row.key), ['holding_company:library-group']);
  }
  assert.equal(JSON.stringify(store), before);
});
