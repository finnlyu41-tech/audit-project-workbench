import test from 'node:test';
import assert from 'node:assert/strict';
import {verificationReceipt as receipt} from '../scripts/verification-receipt.mjs';
const env={OUTCOME_UNIT:'success',OUTCOME_BROWSER:'success',OUTCOME_BUILD:'success',OUTCOME_PRODUCTION:'success',HEAD_SHA:'a'.repeat(40),GITHUB_SHA:'b'.repeat(40)};
const report={stats:{expected:10,unexpected:0,flaky:0,skipped:0},errors:[]};
test('receipt distinguishes successful checks from deployment and scheduler status',()=>{
 const r=receipt(env,report,report);assert.equal(r.verification_passed,true);assert.equal(r.deployment_verified,false);assert.equal(r.scheduler_inspected,false);assert.notEqual(r.head_sha,r.tested_sha);
});
test('missing reports, failed or skipped phases cannot produce a green receipt',()=>{
 assert.equal(receipt(env,report,null).verification_passed,false);
 assert.equal(receipt({...env,HEAD_SHA:undefined},report,report).verification_passed,false);
 for(const phase of ['UNIT','BROWSER','BUILD','PRODUCTION'])for(const state of ['failure','skipped','cancelled','unknown'])
  assert.equal(receipt({...env,[`OUTCOME_${phase}`]:state},report,report).verification_passed,false);
 for(const key of ['unexpected','flaky','skipped'])assert.equal(receipt(env,{...report,stats:{...report.stats,[key]:1}},report).verification_passed,false);
 assert.equal(receipt(env,{...report,errors:[{}]},report).verification_passed,false);
});
