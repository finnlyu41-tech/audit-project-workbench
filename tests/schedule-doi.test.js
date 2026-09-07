import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestedReportingPeriod, fiscalPeriodFromIncorporation, canonicalStorePayload, normalizeStore,
  makeEntity, emptyStore, makeEngagement, yearEndOrPeriodLabel, engagementReportingPeriodsMatch } from '../src/dashboard/model.js';
import { firstPeriodEndChoices, nextCalendarDate, periodEndAfterMonths, periodAfterEnd } from '../src/dashboard/reporting-period-tools.js';
import { makeTimeline, parseDate } from '../src/dashboard/schedule-timeline.js';
const entity=()=>makeEntity({id:'doi-example',legalName:'First Period Example Limited',incorporationDate:'2025-01-01',fiscalYearPreset:'calendar'});
const longPeriod={periodPreset:'doi_year_end',periodStart:'2025-01-01',periodEnd:'2026-06-30'};
test('first period suggestions include cross-year ends and 18 months without calendar-year clamping',()=>{
  assert.equal(periodEndAfterMonths('2025-01-01',18),'2026-06-30');
  const choices=firstPeriodEndChoices('2025-07-10','calendar');
  assert.ok(choices.some(c=>c.end==='2026-12-31'&&c.kind==='year_end'));
  assert.ok(choices.some(c=>c.end==='2027-01-09'&&c.months===18));
  assert.equal(suggestedReportingPeriod(entity()).periodStart,'2025-01-01');
});
test('month and leap boundaries use calendar dates, not fixed 30-day approximations',()=>{
  for(const [start,months,end] of [['2024-02-29',12,'2025-02-28'],['2024-02-29',18,'2025-08-28'],
    ['2025-08-31',6,'2026-02-28'],['2025-12-31',18,'2027-06-30'],['2025-07-01',18,'2026-12-31']])
    assert.equal(periodEndAfterMonths(start,months),end);
  assert.equal(nextCalendarDate('2024-02-28'),'2024-02-29'); assert.equal(nextCalendarDate('2024-02-29'),'2024-03-01');
});
test('18-month first period is followed by 12 months from its actual end',()=>{
  const proposal=suggestedReportingPeriod(entity(),[{entityId:'doi-example',...longPeriod}]);
  assert.deepEqual(proposal,{periodPreset:'custom',periodStart:'2026-07-01',periodEnd:'2027-06-30'});
  assert.equal(proposal.periodStart, nextCalendarDate(longPeriod.periodEnd));
});
test('custom and archived periods still anchor next-year suggestions without resetting to DOI',()=>{
  const old={entityId:'doi-example',archived:true,periodStart:'2025-01-01',periodEnd:'2026-09-30',periodPreset:'custom'};
  assert.deepEqual(suggestedReportingPeriod(entity(),[old]),{periodPreset:'custom',periodStart:'2026-10-01',periodEnd:'2027-09-30'});
});
test('multiple saved periods use the latest actual end and leave gaps and unrelated companies untouched',()=>{
  const inputs=[{entityId:'other',...longPeriod,periodEnd:'2099-12-31'},
    {entityId:'doi-example',reportingPeriods:[longPeriod,{periodStart:'2026-07-01',periodEnd:'2027-06-30'}]}];
  const before=structuredClone(inputs); const next=suggestedReportingPeriod(entity(),inputs);
  assert.equal(next.periodStart,'2027-07-01'); assert.equal(next.periodEnd,'2028-06-30'); assert.deepEqual(inputs,before);
});
test('invalid or out-of-range arithmetic cannot generate dates that break the next startup',()=>{
  for(const value of ['bad','2025-02-30','10000-01-01','']) {
    assert.equal(periodEndAfterMonths(value,18),''); assert.equal(nextCalendarDate(value),''); assert.deepEqual(firstPeriodEndChoices(value),[]);
  }
  assert.equal(nextCalendarDate('9999-12-31'),''); assert.equal(periodEndAfterMonths('9999-12-01',18),'');
  assert.equal(periodEndAfterMonths('2025-01-01',0),'');
});
test('DOI labels use the whole period even when its dates happen to make one normal year',()=>{
  const label=yearEndOrPeriodLabel({...longPeriod,periodEnd:'2025-12-31'},'en');
  assert.ok(label.startsWith('For the period')); assert.ok(!label.startsWith('YE')); assert.ok(label.includes('(DOI)'));
});
test('long DOI reporting period persists independently of operational work dates and company updates',()=>{
  const base=canonicalStorePayload(emptyStore()), company=entity(); base.entities.push(company);
  const job=makeEngagement({entityId:company.id,...longPeriod,startDate:'2026-08-01',dueDate:'2026-10-31',priority:'high'},
    {entity:company,store:base,sourceMode:'blank'}); base.engagements.push(job);
  const saved=canonicalStorePayload(normalizeStore(base));
  const restored=canonicalStorePayload(normalizeStore(JSON.parse(JSON.stringify(saved)))); assert.deepEqual(restored,saved);
  saved.entities[0].incorporationDate='2024-12-15'; saved.entities[0].fiscalYearPreset='apr_mar';
  const after=canonicalStorePayload(normalizeStore(saved)); assert.deepEqual(after.engagements,restored.engagements);
  assert.equal(after.engagements[0].periodEnd,'2026-06-30'); assert.equal(after.engagements[0].startDate,'2026-08-01');
});
test('a continuous 18-month period is not silently split or treated as two annual scopes',()=>{
  assert.equal(engagementReportingPeriodsMatch(longPeriod,{reportingPeriods:[{periodStart:'2025-01-01',periodEnd:'2025-12-31'},
    {periodStart:'2026-01-01',periodEnd:'2026-06-30'}]}),false);
});
test('schedule uses work dates, not a company DOI or an 18-month reporting range',()=>{
  const row={startDate:'2026-09-01',dueDate:'2026-11-30',engagement:longPeriod,incorporationDate:'2025-01-01'};
  const timeline=makeTimeline([row],'week',{now:new Date('2026-09-07T12:00:00Z')});
  assert.ok(timeline.rangeStart.toISOString().startsWith('2026-08')); assert.ok(timeline.rangeEnd.getUTCFullYear()===2026);
});
test('a large requested daily range is safely aggregated without omitting the endpoints',()=>{
  const rows=[{startDate:'0001-01-01',dueDate:'9999-12-31'}], before=structuredClone(rows);
  const timeline=makeTimeline(rows,'day',{minimumWidth:900,now:new Date('2026-09-07T12:00:00Z')});
  assert.equal(timeline.precision,'month'); assert.equal(timeline.coarse,true);
  assert.ok(timeline.ticks.length<=601); assert.ok(timeline.majorGroups.length<=601);
  assert.equal(timeline.rangeStart.toISOString().slice(0,10),'0001-01-01');
  assert.equal(timeline.rangeEnd.toISOString().slice(0,10),'9999-12-31');
  assert.ok(Number.isFinite(timeline.width)); assert.deepEqual(rows,before);
});
test('timeline fills available space and its tick widths account for the complete range',()=>{
  for(const precision of ['day','week','month']) {
    const t=makeTimeline([] ,precision,{minimumWidth:1700,now:new Date('2026-09-07T12:00:00Z')});
    assert.ok(t.width>=1699.99); assert.ok(Math.abs(t.ticks.reduce((n,x)=>n+x.width,0)-t.width)<.01);
    assert.ok(Math.abs(t.majorGroups.reduce((n,x)=>n+x.width,0)-t.width)<.01);
  }
});
test('dates near early years and leap months are parsed literally, never shifted into 1900',()=>{
  assert.equal(parseDate('0025-03-01').getUTCFullYear(),25); assert.equal(parseDate('2025-02-30'),null);
  const t=makeTimeline([{startDate:'2024-02-28',dueDate:'2024-03-02'}],'day',{now:new Date('2024-02-28T12:00:00Z')});
  assert.ok(t.ticks.some(x=>x.date.toISOString().slice(0,10)==='2024-02-29'));
});
