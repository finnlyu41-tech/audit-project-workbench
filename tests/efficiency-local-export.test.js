import { normalizeStore } from "../src/dashboard/model.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { safeFilePart, outputFileName, splitMessage, spreadsheetCell, delimitedTable, reportTableMatrix, workspaceDifferences } from '../src/dashboard/efficiency-export.js';
import { setDraftRecoveryEnabled, draftRecoveryEnabled, writeLocalDraft, readLocalDraft, deleteLocalDraft, resetLocalProductivity,
  LOCAL_DRAFTS_KEY, DRAFT_TTL, savedFilters, saveFilter, deleteFilter, validCompanyDraft, validAnnualDraft, validQuickDraft, validScheduleDraft } from '../src/dashboard/local-productivity.js';
import { initialScheduleDraft, calculateWorkingSchedule } from '../src/dashboard/working-days.js';
import { compactTranslationCalls, translationKeys, chineseLiterals } from '../scripts/translation-compaction.mjs';
import { efficiencyWorkspace } from './fixtures/efficiency-workspace.js';
import { buildPortfolioReport, DEFAULT_MANAGEMENT_REPORT_FILTERS } from '../src/dashboard/reporting.js';
const storage = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k) }; };

test('recoverable drafts are off by default, opt-in, separate from business records, expiring, and baseline-scoped', () => {
  const s = storage(), now = 10000000000;
  assert.equal(draftRecoveryEnabled(s), false); assert.equal(writeLocalDraft('k','b',{ text: 'draft' },s,now), false);
  setDraftRecoveryEnabled(true,s); assert.equal(writeLocalDraft('k','b',{ text: 'draft' },s,now), true);
  assert.equal(readLocalDraft('k','b',s,now).stale, false); assert.equal(readLocalDraft('k','changed',s,now).stale, true);
  assert.equal(readLocalDraft('k','b',s,now+DRAFT_TTL), null); assert.equal(s.getItem('audit-progress-workbench'), null);
  deleteLocalDraft('k',s); assert.equal(readLocalDraft('k','b',s,now), null);
});
test('local draft caps and disabled storage never change committed workspace data', () => {
  const s=storage(), now=10000000000; setDraftRecoveryEnabled(true,s);
  for(let i=0;i<20;i++) writeLocalDraft('key'+i,'b'.repeat(200000),{ text:'x'.repeat(90000) },s,now+i);
  const rows=JSON.parse(s.getItem(LOCAL_DRAFTS_KEY)); assert.ok(rows.length<=12); assert.ok(s.getItem(LOCAL_DRAFTS_KEY).length<=900000);
  assert.equal(readLocalDraft('key0','b',s,now+20),null);
  assert.throws(()=>writeLocalDraft('k','b',{text:'x'.repeat(100001)},s,now));
  const broken={...s,setItem(){throw new Error('quota');}}; assert.throws(()=>writeLocalDraft('new','b',{text:'x'},broken,now));
  setDraftRecoveryEnabled(false,s); assert.equal(s.getItem(LOCAL_DRAFTS_KEY),null);
});
test('workspace replacement clears drafts and named filters, ordinary reads/reloads do not', () => {
  const s=storage(); setDraftRecoveryEnabled(true,s); writeLocalDraft('key','baseline',{text:'x'},s);
  saveFilter('report','Current',{status:'active'},s); assert.equal(savedFilters('report',s).length,1);
  assert.ok(readLocalDraft('key','baseline',s)); resetLocalProductivity(s);
  assert.equal(readLocalDraft('key','baseline',s),null); assert.equal(savedFilters('report',s).length,0);
  assert.equal(draftRecoveryEnabled(s),true);
});
test('saved filter replacement, removal and limits are scoped and do not store report rows', () => {
  const s=storage(); saveFilter('one','Example',{owner:'A'},s); saveFilter('two','Example',{owner:'B'},s);
  saveFilter('one','Example',{owner:'C'},s); assert.deepEqual(savedFilters('one',s)[0].values,{owner:'C'});
  deleteFilter('one','Example',s); assert.equal(savedFilters('one',s).length,0); assert.equal(savedFilters('two',s).length,1);
  for(let i=0;i<12;i++)saveFilter('one',String(i),{status:'active'},s);
  assert.throws(()=>saveFilter('one','overflow',{},s)); assert.throws(()=>saveFilter('one','',{},s));
});
test('draft shape guards reject malformed nested values before an editor can render them', () => {
  const schedule = initialScheduleDraft({}); assert.equal(validScheduleDraft(schedule),true);
  assert.equal(validScheduleDraft({...schedule, snapshot:{startDate:'2026-09-08',dueDate:'2026-09-09',schedulePlan:{}}}),false);
  const values={legalName:'A',aliasesText:'',entityType:'',incorporationDate:'',kind:'company',parentEntityId:'',relationshipRole:'',fiscalYearPreset:'calendar',notes:''};
  const company={values,creationMode:'single',batchCompanies:[{id:'1',legalName:'',entityType:'',fiscalYearPreset:'calendar',relationshipRole:''}]};
  assert.equal(validCompanyDraft(company),true); assert.equal(validCompanyDraft({...company,batchCompanies:[null]}),false);
  assert.equal(validCompanyDraft({...company,values:{...values,legalName:[]}}),false);
  const quick={baselineContext:'context',baseline:{owner:'',startDate:'',dueDate:'',notes:''},values:{owner:'A',startDate:'',dueDate:'',notes:''},scheduleDraft:schedule};
  assert.equal(validQuickDraft(quick),true); assert.equal(validQuickDraft({...quick,baseline:null}),false);
  const annual={values:{internalName:'',engagementType:'Audit',reportingFramework:'',owner:'',priority:'normal',startDate:'',dueDate:'',notes:'',consolidationMode:'full',consolidationEnabled:true,
    engagementTypes:['Audit'],reportingPeriods:[{id:'period',periodPreset:'calendar',periodStart:'2026-01-01',periodEnd:'2026-12-31',baseYear:2026}]},
    sourceMode:'blank',sourceEngagementId:'',customEngagementType:'',selections:[],scheduleDraft:schedule};
  assert.equal(validAnnualDraft(annual),true); assert.equal(validAnnualDraft({...annual,values:{...annual.values,reportingPeriods:[null]}}),false);
  assert.equal(validAnnualDraft({...annual,selections:[{id:'bad'}]}),false);
});
test('meaningful and generic output names are bounded, distinguish same-day outputs and never allow path/control characters', () => {
  const now=new Date('2026-09-09T00:00:00Z'), args={purpose:'apw-follow-up',company:'测试客户'.repeat(60)+'../../\n',periods:[{periodStart:'2025-01-01',periodEnd:'2026-06-30'}],generic:false,now};
  const a=outputFileName(args),b=outputFileName(args); assert.notEqual(a,b); assert.ok(new TextEncoder().encode(a).length<=240);
  assert.equal(/[\r\n\/:\\]/.test(a),false); assert.equal(outputFileName({...args,generic:true}).includes('测试'),false);
  assert.equal(safeFilePart('.. / \\ x\u202ey ' ).includes('\u202e'),false);
});
test('subject/body splitting preserves raw user content and does not imply sending', () => {
  assert.deepEqual(splitMessage('Subject: Example\n\nBody\nLast line'),{subject:'Example',body:'Body\nLast line'});
  assert.deepEqual(splitMessage('主題：核對\r\n\r\n正文'),{subject:'核對',body:'正文'});
  assert.deepEqual(splitMessage('Raw title'),{subject:'Raw title',body:''});
});
test('CSV/TSV neutralize formula prefixes including leading whitespace; quotes alone are not treated as protection', () => {
  for(const v of ['=1+1','  =HYPERLINK("x")','+cmd','-42','@SUM(A1)','\ttext','\ntext','\uFEFF=1']) assert.equal(spreadsheetCell(v).startsWith("'"),true);
  assert.equal(spreadsheetCell(-42),'-42'); assert.equal(spreadsheetCell('plain'),'plain');
  assert.equal(delimitedTable([['a,b','c"d'],['=1','line\nnext']]),'"a,b","c""d"\r\n"\'=1","line\nnext"');
});
test('report projection follows provided display order and omits private fields', () => {
  const before=efficiencyWorkspace(), report=buildPortfolioReport(normalizeStore(before),DEFAULT_MANAGEMENT_REPORT_FILTERS,new Date('2026-09-09'));
  const rows=report.rows.slice().reverse(), matrix=reportTableMatrix(rows,'en',s=>s);
  assert.equal(matrix.length,rows.length+1); assert.deepEqual(matrix.slice(1).map(r=>r[0]),rows.map(r=>r.name));
  for(const row of rows) Object.assign(row,{notes:'PRIVATE-ADDED',reference:'SECRET'});
  const text=delimitedTable(reportTableMatrix(rows,'en',s=>s)); assert.equal(/PRIVATE|SECRET/.test(text),false);
});
test('same-count backups show actual changes, do not disclose note/reference contents, and remain read-only', () => {
  const before=efficiencyWorkspace(),after=structuredClone(before);
  after.engagements[0].dueDate='2026-10-09'; after.engagements[0].notes='CHANGED-SECRET';
  after.engagements[0].outstandingItems[0].note='SECOND-SECRET'; after.entities[0].taxDeadlines[0].reference='THIRD-SECRET';
  const snapshot=JSON.stringify([before,after]), diff=workspaceDifferences(before,after);
  assert.ok(diff.rows.some(r=>r.field==='dueDate'&&r.after==='2026-10-09'));
  assert.ok(diff.rows.some(r=>r.field==='outstanding'&&r.changed===1)); assert.ok(diff.rows.some(r=>r.field==='private-note'));
  assert.equal(/CHANGED-SECRET|SECOND-SECRET|THIRD-SECRET|PRIVATE-ITEM/.test(JSON.stringify(diff)),false);
  assert.equal(JSON.stringify([before,after]),snapshot);
  assert.equal(workspaceDifferences(before,after,1).truncated,true); assert.equal(workspaceDifferences({version:10},after).unavailable,true);
});
test('static translation compaction preserves nested, conditional and fallback expression semantics without touching user data', () => {
  const keys=['甲','乙','丙'];
  const code=`const user={title:'甲'}; const literal='乙'; [t('甲'),t(flag?'乙':'丙'),t(({a:'甲',b:'乙'})[kind]||'丙'),t(t('甲')),user.title,literal,t('unknown')]`;
  const transformed=compactTranslationCalls(code,keys,'sample.js');
  for(const flag of [true,false])for(const kind of ['a','b','missing']){
    const raw=vm.runInNewContext(code,{flag,kind,t:k=>'VALUE:'+k});
    const compact=vm.runInNewContext(transformed,{flag,kind,t:k=>'VALUE:'+(typeof k==='number'?keys[k-1]:k)});
    assert.deepEqual(JSON.parse(JSON.stringify(compact)),JSON.parse(JSON.stringify(raw)));
  }
  assert.ok(transformed.includes("title:'甲'")); assert.ok(transformed.includes("literal='乙'"));
});
test('translation key enumeration matches source object assignment order and reject ambiguous dynamic/numeric keys', () => {
  const code=`const english={'甲':'one','乙':'two'}; Object.assign(english,{'甲':'override','丙':'three'});`;
  assert.deepEqual(translationKeys(code),['甲','乙','丙']);
  assert.throws(()=>translationKeys(`const english={'1':'bad'}`)); assert.throws(()=>translationKeys(`const english={...other}`));
  const real=readFileSync(new URL('../src/dashboard/i18n.jsx',import.meta.url),'utf8'); assert.ok(translationKeys(real).length>2000);
  assert.deepEqual(chineseLiterals(`t('甲'); const x='乙'; /* '丙' */`,'source.js'),['甲','乙']);
});
