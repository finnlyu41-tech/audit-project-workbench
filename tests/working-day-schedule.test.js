import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { HK_CALENDAR, HK_GENERAL_HOLIDAYS } from '../src/dashboard/hk-holidays.js';
import { estimateWorkingSchedule as estimate } from '../src/dashboard/working-day-schedule.js';
const plan = (startDate, workdays, workweek='five') => estimate({ startDate, workdays, workweek });
const dates = new Set(HK_GENERAL_HOLIDAYS.map(day => day.date));

test('one working day includes the effective start, not the next day', () => {
  const result=plan('2026-09-08',1); assert.equal(result.startDate,'2026-09-08');
  assert.equal(result.dueDate,'2026-09-08'); assert.equal(result.calendarDays,1); assert.deepEqual(result.skipped,[]);
});
test('weekends and National Day are skipped while the fifth/sixth day option is explicit', () => {
  assert.equal(plan('2026-09-30',3).dueDate,'2026-10-05');
  assert.equal(plan('2026-09-30',3,'six').dueDate,'2026-10-03');
  assert.equal(plan('2026-10-03',1).startDate,'2026-10-05');
  assert.equal(plan('2026-10-03',1,'six').startDate,'2026-10-03');
});
test('Easter and Ching Ming observed days follow the published calendar without double substitution', () => {
  const result=plan('2026-04-02',3);
  assert.equal(result.dueDate,'2026-04-09'); assert.equal(result.skipped.length,5);
  assert.deepEqual(result.skipped.filter(day=>day.reason==='holiday').map(day=>day.date),
    ['2026-04-03','2026-04-04','2026-04-06','2026-04-07']);
  assert.equal(new Set(result.skipped.map(day=>day.date)).size,5);
});
test('a requested holiday start is visibly rolled forward without consuming workdays', () => {
  const result=plan('2026-04-03',1); assert.equal(result.requestedStart,'2026-04-03');
  assert.equal(result.startDate,'2026-04-08'); assert.equal(result.dueDate,'2026-04-08'); assert.equal(result.shifted,true);
});
test('cross-year calculation includes the next year holidays', () => {
  const result=plan('2026-12-31',2); assert.equal(result.dueDate,'2027-01-04');
  assert.deepEqual(result.skipped.map(day=>day.date),['2027-01-01','2027-01-02','2027-01-03']);
});
test('Lunar New Year and Saturday holidays remain closed for a six-day week', () => {
  assert.equal(plan('2026-02-16',2).dueDate,'2026-02-20');
  assert.equal(plan('2026-09-25',2,'six').dueDate,'2026-09-28');
  assert.equal(plan('2027-02-05',2).dueDate,'2027-02-10');
});
test('unsupported years never produce a deceptively complete date pair', () => {
  for (const start of ['2024-12-31','2028-01-01','9999-12-31','0001-01-01']) {
    const r=plan(start,1); assert.equal(r.error,'coverage'); assert.equal(r.dueDate,undefined);
  }
  assert.equal(plan('2027-12-31',1).dueDate,'2027-12-31');
  assert.equal(plan('2027-12-31',2).error,'coverage');
  assert.equal(plan('2025-01-01',1000).error,'coverage');
});
test('malformed, fractional, zero and huge estimates are refused before date arithmetic', () => {
  for (const days of ['',0,-1,1.5,'1.5',' 3 ','1e2',1001,Infinity,NaN,true,{},[],null])
    assert.equal(plan('2026-09-08',days).error,'days');
  for (const start of ['2026-02-30','2026-13-01','2026-1-1','10000-01-01','',null])
    assert.equal(plan(start,1).error,'date');
  assert.equal(estimate(null).error,'date'); assert.equal(estimate().error,'date');
  assert.equal(plan('2026-09-08',2,'seven').error,'week');
  assert.equal(plan('2024-02-29',1).error,'coverage');
  assert.equal(plan('2025-02-29',1).error,'date');
});
test('bundled dates are unique, multilingual and cover all three verified years', () => {
  assert.equal(dates.size,51); assert.equal(HK_GENERAL_HOLIDAYS.length,51);
  assert.deepEqual(HK_CALENDAR.years,[2025,2026,2027]);
  for (const year of HK_CALENDAR.years) assert.equal([...dates].filter(day=>day.startsWith(String(year))).length,17);
  for (const day of HK_GENERAL_HOLIDAYS) {
    assert.ok(day.en && day['zh-Hans'] && day['zh-Hant']);
    assert.notEqual(new Date(`${day.date}T00:00:00Z`).getUTCDay(),0);
  }
  assert.equal(HK_CALENDAR.sources.length,6);
});
test('every supported start date agrees with independently enumerated working-date lists', () => {
  const days=[]; for (let t=Date.parse('2025-01-01T00:00:00Z');t<=Date.parse('2027-12-31T00:00:00Z');t+=86400000)
    days.push({date:new Date(t).toISOString().slice(0,10),weekday:new Date(t).getUTCDay()});
  for (const workweek of ['five','six']) {
    const eligible=days.filter(d=>d.weekday!==0&&(workweek==='six'||d.weekday!==6)&&!dates.has(d.date)).map(d=>d.date);
    for (const start of days) for (const n of [1,3,10,45]) {
      const index=eligible.findIndex(date=>date>=start.date), expected=index<0?undefined:eligible[index+n-1];
      const result=plan(start.date,n,workweek);
      if (!expected) { assert.equal(result.error,'coverage'); continue; }
      assert.equal(result.dueDate,expected); assert.equal(result.startDate,eligible[index]);
      assert.equal(new Set(result.skipped.map(d=>d.date)).size,result.skipped.length);
    }
  }
});
test('calculation is timezone independent, including dates around DST changes', () => {
  const moduleUrl=new URL('../src/dashboard/working-day-schedule.js',import.meta.url).href;
  const script=`import {estimateWorkingSchedule as f} from '${moduleUrl}'; console.log(JSON.stringify(f({startDate:'2026-03-06',workdays:12})));`;
  const outputs=['Asia/Hong_Kong','America/Los_Angeles','Pacific/Auckland'].map(TZ=> {
    const r=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ},encoding:'utf8'});
    assert.equal(r.status,0,r.stderr); return r.stdout;
  }); assert.equal(new Set(outputs).size,1);
});
test('calculating or repeating an estimate does not mutate inputs or holiday records', () => {
  const input=Object.freeze({startDate:'2026-09-30',workdays:3,workweek:'five'});
  const before=JSON.stringify(HK_GENERAL_HOLIDAYS);
  assert.deepEqual(estimate(input),estimate(input)); assert.equal(JSON.stringify(HK_GENERAL_HOLIDAYS),before);
});

test('holiday dates match the independently verified GovHK and 1823 source snapshot', () => {
  const digest=createHash('sha256').update(JSON.stringify([...dates].sort())).digest('hex');
  assert.equal(digest,'1bb425d34e8369342195b38776fa69e65eefa113a680d0ad2293e8d41ca4a710');
});
test('calculations leave the input and official holiday snapshot untouched', () => {
  const input={startDate:'2026-04-03',workdays:'3',workweek:'five'};
  const before=JSON.stringify({input,calendar:HK_CALENDAR,holidays:HK_GENERAL_HOLIDAYS});
  plan(input.startDate,input.workdays,input.workweek);
  assert.equal(JSON.stringify({input,calendar:HK_CALENDAR,holidays:HK_GENERAL_HOLIDAYS}),before);
  assert.ok(Object.isFrozen(HK_GENERAL_HOLIDAYS));
});
test('results do not depend on the device time zone or daylight-saving transitions', () => {
  const url=new URL('../src/dashboard/working-day-schedule.js',import.meta.url).href;
  const script=`import {estimateWorkingSchedule} from '${url}'; console.log(JSON.stringify(estimateWorkingSchedule({startDate:'2026-10-30',workdays:4})));`;
  const outputs=['Asia/Hong_Kong','UTC','America/New_York','Europe/Berlin'].map(TZ=>{
    const child=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ},encoding:'utf8'});
    assert.equal(child.status,0,child.stderr); return child.stdout;
  });
  assert.equal(new Set(outputs).size,1); assert.equal(JSON.parse(outputs[0]).dueDate,'2026-11-04');
});
test('holiday source provenance has per-source integrity hashes and a specific verification date', () => {
  assert.equal(HK_CALENDAR.checkedAt,'2026-09-08');
  assert.equal(Object.keys(HK_CALENDAR.sourceSha256).length,6);
  for(const hash of Object.values(HK_CALENDAR.sourceSha256)) assert.match(hash,/^[a-f0-9]{64}$/);
  const checksum=createHash('sha256').update([...dates].sort().join('\n')).digest('hex');
  assert.equal(checksum,'1c8911126845fc941758bddd6ab87b5f3f95806a76c8575ab6712fde45e794ff'); // Pinned after independent GovHK/1823 agreement.
});
