import assert from 'node:assert/strict';
import test from 'node:test';
import { clientFollowupFixture } from './fixtures/client-followup.js';
import { followupSource, followupSources, followupSnapshot, buildFollowupText, downloadFollowupText } from '../src/dashboard/client-followup-model.js';
for (const language of ['en', 'zh-Hans', 'zh-Hant']) {
  test(`client draft uses only allowlisted selected fields in ${language}`, () => {
    const { store, sourceId, selectedIds } = clientFollowupFixture(); const before = structuredClone(store);
    const snapshot = followupSnapshot(store, sourceId, selectedIds); const text = buildFollowupText(snapshot, language);
    assert.ok(text.includes('请提供签署账目')); assert.ok(text.includes('2025')); assert.ok(text.includes('2026'));
    assert.ok(text.includes('bank reconciliation')); assert.ok(text.includes(snapshot.company));
    assert.doesNotMatch(text, /PRIVATE_|INTERNAL_|PARENT_ONLY|CLOSED_ITEM|shared-item|second-item/);
    assert.deepEqual(store, before); assert.ok(!('notes' in snapshot));
  });
}
test('empty, deleted, cleared and unknown-status selections are rejected', () => {
  const { store, sourceId } = clientFollowupFixture();
  assert.equal(followupSnapshot(store, sourceId, []).error, 'empty');
  for (const id of ['missing', 'cleared-item']) assert.equal(followupSnapshot(store, sourceId, [id]).error, 'changed');
  store.engagements.find((e) => e.id === sourceId).outstandingItems[0].status = 'unknown-status';
  assert.equal(followupSnapshot(store, sourceId, ['shared-item']).error, 'changed');
});
test('same item identifiers in different companies never join into one draft', () => {
  const { store, sourceId, groupId } = clientFollowupFixture();
  const child = buildFollowupText(followupSnapshot(store, sourceId, ['shared-item']));
  const parent = buildFollowupText(followupSnapshot(store, groupId, ['shared-item']));
  assert.ok(parent.includes('PARENT_ONLY_REQUEST')); assert.ok(!child.includes('PARENT_ONLY_REQUEST'));
  assert.ok(!parent.includes('请提供签署账目'));
});
test('archived or missing companies and engagements cannot be used as follow-up sources', () => {
  const { store, sourceId, groupId } = clientFollowupFixture();
  const before = followupSources(store, [sourceId, groupId, sourceId, 'missing']); assert.equal(before.length, 2);
  store.engagements.find((e) => e.id === sourceId).archived = true; assert.equal(followupSource(store, sourceId), null);
  const group = store.engagements.find((e) => e.id === groupId);
  store.entities.find((e) => e.id === group.entityId).archived = true;
  assert.equal(followupSources(store, [sourceId, groupId]).length, 0);
});
test('selected-source changes invalidate a preview but private-note changes do not enter its fingerprint', () => {
  const { store, sourceId, selectedIds } = clientFollowupFixture(); const baseline = followupSnapshot(store, sourceId, selectedIds);
  const source = store.engagements.find((e) => e.id === sourceId); source.outstandingItems[0].note = 'Different private note';
  assert.equal(followupSnapshot(store, sourceId, selectedIds).signature, baseline.signature);
  source.outstandingItems[0].title = 'Updated request'; assert.notEqual(followupSnapshot(store, sourceId, selectedIds).signature, baseline.signature);
  source.outstandingItems[0].status = 'resolved'; assert.equal(followupSnapshot(store, sourceId, selectedIds).error, 'changed');
});
test('plain-text download is explicit and contains exactly the supplied preview', async () => {
  let blob; let clicked = false; let released = false; const anchor = { click() { clicked = true; } };
  const document = { createElement() { return anchor; } };
  const urls = { createObjectURL(value) { blob = value; return 'blob:synthetic'; }, revokeObjectURL() { released = true; } };
  downloadFollowupText('Subject: Fictional\n\nReview this text.', document, urls);
  assert.equal(await blob.text(), 'Subject: Fictional\n\nReview this text.');
  assert.equal(anchor.download, 'apw-client-follow-up.txt'); assert.ok(clicked && released);
  assert.throws(() => downloadFollowupText('', document, urls));
});
test('company identity, reporting period and selected title changes invalidate a generated snapshot', () => {
  for (const change of ['company', 'period', 'item']) {
    const { store, sourceId, selectedIds } = clientFollowupFixture(); const old = followupSnapshot(store, sourceId, selectedIds);
    const engagement = store.engagements.find((e) => e.id === sourceId);
    if (change === 'company') store.entities.find((e) => e.id === engagement.entityId).legalName = 'New fictional legal name';
    if (change === 'period') engagement.reportingPeriods[0].periodEnd = '2025-11-30';
    if (change === 'item') engagement.outstandingItems[0].title = 'Revised request';
    assert.notEqual(followupSnapshot(store, sourceId, selectedIds).signature, old.signature, change);
  }
});
