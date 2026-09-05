import test from 'node:test';
import assert from 'node:assert/strict';
import { batchCompanyEdited, prepareCompanyEntry } from '../src/dashboard/company-entry-state.js';
const values = () => ({ legalName: 'Fictional Holdings', entityType: '', kind: 'company', parentEntityId: '',
  fiscalYearPreset: 'calendar', relationshipRole: '', notes: '', incorporationDate: '2020-01-02' });
const member = (legalName = 'Fictional Member') => ({ id: 'draft-row', legalName, entityType: '', fiscalYearPreset: 'calendar', relationshipRole: '子公司' });
test('company entry rejects empty and whitespace-only legal names', () => {
  for (const legalName of ['', '   ', '　', '\t\n', '\u00a0']) {
    assert.deepEqual(prepareCompanyEntry({ ...values(), legalName }), { error: { field: 'legalName' } });
  }
});
test('an incomplete later member is rejected rather than removed from the submitted list', () => {
  const rows = [member('First member'), { ...member(''), entityType: 'Partnership', relationshipRole: 'Associate' }];
  const before = JSON.stringify(rows);
  assert.deepEqual(prepareCompanyEntry(values(), rows, true), { error: { field: 'batchCompanies', index: 1 } });
  assert.equal(JSON.stringify(rows), before);
});
test('batch creation requires at least one member and rejects unnamed visible rows', () => {
  assert.deepEqual(prepareCompanyEntry(values(), [], true), { error: { field: 'batchCompanies' } });
  assert.equal(prepareCompanyEntry(values(), [member('First'), member('　')], true).error.index, 1);
});
test('valid batch input preserves row order and only applies existing edge trimming', () => {
  const form = { ...values(), legalName: '  Fictional Holdings  ', notes: '  原文 Note  ' };
  const rows = [member('  第一 成员  '), { ...member(' Second  Member '), fiscalYearPreset: 'apr_mar' }];
  const before = JSON.stringify({ form, rows }); const result = prepareCompanyEntry(form, rows, true).values;
  assert.equal(result.kind, 'holding_company'); assert.equal(result.legalName, 'Fictional Holdings');
  assert.deepEqual(result.batchCompanies.map((row) => row.legalName), ['第一 成员', 'Second  Member']);
  assert.equal(result.batchCompanies[1].fiscalYearPreset, 'apr_mar'); assert.equal(result.notes, '原文 Note');
  assert.equal(result.incorporationDate, form.incorporationDate); assert.equal('id' in result.batchCompanies[0], false);
  assert.equal(JSON.stringify({ form, rows }), before);
});
test('single company keeps its existing kind and parent-role handling', () => {
  const form = { ...values(), kind: 'holding_company', relationshipRole: '  Associate  ' };
  const result = prepareCompanyEntry(form, [member('')], false).values;
  assert.equal(result.kind, 'holding_company'); assert.equal(result.parentEntityId, null);
  assert.equal(result.relationshipRole, ''); assert.deepEqual(result.batchCompanies, []);
  const withParent = prepareCompanyEntry({ ...form, parentEntityId: 'parent' }).values;
  assert.equal(withParent.relationshipRole, 'Associate');
});
test('batch mode switch checks all edited fields against the actual row defaults', () => {
  const baseline = { ...member(''), fiscalYearPreset: 'apr_mar' };
  assert.equal(batchCompanyEdited({ ...baseline }, baseline), false);
  for (const patch of [{ legalName: '　' }, { entityType: 'Partnership' }, { relationshipRole: '' }, { fiscalYearPreset: 'calendar' }]) {
    assert.equal(batchCompanyEdited({ ...baseline, ...patch }, baseline), true);
  }
});
test('company entry does not invent a company-name uniqueness constraint', () => {
  const result = prepareCompanyEntry(values(), [member('Same name'), member('Same name')], true);
  assert.equal(result.error, undefined); assert.equal(result.values.batchCompanies.length, 2);
});
