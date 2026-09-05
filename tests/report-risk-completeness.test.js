import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStore } from '../src/dashboard/model.js';
import { buildPortfolioReport, buildRecordReport } from '../src/dashboard/reporting.js';
import { reportUsabilityFixture } from './fixtures/report-usability.js';
const now = new Date('2026-09-06T04:00:00Z');

test('report source contains every risk beyond twenty and preserves source records', () => {
  const store = normalizeStore(reportUsabilityFixture()); const before = JSON.stringify(store);
  const report = buildPortfolioReport(store, {}, now);
  assert.equal(report.outstandingRisks.length, 24); assert.equal(report.taxRisks.length, 23);
  assert.equal(report.metrics.openOutstanding, 24); assert.equal(report.metrics.taxAttention, 23);
  assert.equal(JSON.stringify(store), before);
});
test('filtered risk counts continue to come from the original report scope', () => {
  const store = normalizeStore(reportUsabilityFixture());
  const report = buildPortfolioReport(store, { owner: 'Alex Report Long Owner Name' }, now);
  assert.equal(report.rows.length, 1); assert.equal(report.outstandingRisks.length, 23);
  assert.equal(report.metrics.openOutstanding, report.outstandingRisks.length);
  assert.equal(report.taxRisks.length, 23);
});
test('report risk identities include the source and never expose notes or references', () => {
  const store = normalizeStore(reportUsabilityFixture()); const report = buildRecordReport(store, 'group', 'overview-group', now);
  assert.equal(report.outstanding.length, 24);
  const keys = report.outstanding.map((entry) => JSON.stringify([entry.sourceType, entry.sourceId, entry.item.id]));
  assert.equal(new Set(keys).size, 24);
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_REPORT/);
  assert.doesNotMatch(JSON.stringify(buildPortfolioReport(store, {}, now)), /PRIVATE_REPORT/);
});
