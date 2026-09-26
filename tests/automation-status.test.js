import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAutomationAction as decide, pagesDeploymentVerified } from '../scripts/automation-status.mjs';
const main = 'a'.repeat(40), head = 'b'.repeat(40), old = 'c'.repeat(40);
const run = (id, sha, kind='ci', status='completed', conclusion='success') => ({ id, head_sha:sha,
  path:`.github/workflows/${kind}.yml`, status, conclusion, html_url:`https://example.test/runs/${id}` });
const pr = {number:75,head:{sha:head},draft:false};
const snapshot = extra => ({ mainSha:main, pulls:[pr], runs:[run(1,head)], ...extra });
test('automation resumes existing work rather than creating duplicate PRs', () => {
 assert.equal(decide(snapshot()).action, 'RESUME_PR_REVIEW');
 assert.equal(decide(snapshot({pulls:[pr,{...pr,number:76}]})).action, 'CONSOLIDATE_OPEN_PRS');
});
test('old green CI never authorizes a newer PR commit', () => {
 assert.equal(decide(snapshot({runs:[run(1,old)]})).action, 'CHECK_MISSING_CI');
 assert.equal(decide(snapshot({runs:[run(1,old),run(2,head,'ci','in_progress',null)]})).action, 'WAIT_PR_CI');
 for(const state of ['failure','cancelled','timed_out','skipped','neutral','action_required'])
  assert.equal(decide(snapshot({runs:[run(1,old),run(2,head,'ci','completed',state)]})).action,'DIAGNOSE_PR_FAILURE');
});
test('latest exact-head run takes precedence and drafts remain drafts', () => {
 assert.equal(decide(snapshot({runs:[run(3,head,'ci','queued',null),run(2,head)]})).action,'WAIT_PR_CI');
 assert.equal(decide(snapshot({pulls:[{...pr,draft:true}]})).draft,true);
});
test('release status distinguishes missing, failed, running and stale-public gates', () => {
 const base={mainSha:main,pulls:[],runs:[run(1,main),run(2,main,'pages')]};
 assert.equal(decide({...base,runs:[]}).action,'WAIT_RELEASE');
 assert.equal(decide({...base,runs:[run(1,main),run(2,main,'pages','completed','failure')]}).action,'DIAGNOSE_RELEASE_FAILURE');
 assert.equal(decide({...base,runs:[run(1,main),run(2,main,'pages','in_progress',null)]}).action,'WAIT_RELEASE');
 assert.equal(decide({...base,liveSha:old}).action,'VERIFY_DEPLOYMENT');
 assert.equal(decide({...base,liveSha:main}).action,'READY_FOR_SCOPED_WORK');
 const attested=decide({...base,liveSha:null,liveCheck:'unavailable',deploymentVerified:true});
 assert.equal(attested.action,'READY_FOR_SCOPED_WORK'); assert.equal(attested.verification_source,'pages_post_deploy');
 assert.equal(decide({...base,liveSha:null,liveCheck:'HTTP 404',deploymentVerified:true}).action,'VERIFY_DEPLOYMENT');
 assert.equal(decide({...base,liveSha:null,liveCheck:'HTTP 200',deploymentVerified:true}).action,'VERIFY_DEPLOYMENT');
 assert.equal(decide({...base,liveSha:old,liveCheck:'HTTP 200',deploymentVerified:true}).action,'VERIFY_DEPLOYMENT');
});
test('missing identity fails closed and classification is read-only', () => {
 assert.throws(()=>decide({mainSha:'main'}));
 assert.throws(()=>decide(snapshot({pulls:[{number:75}]})));
 const input=snapshot();const before=JSON.stringify(input);decide(input);assert.equal(JSON.stringify(input),before);
});

test('Pages verification fallback requires the exact successful deploy verification step', () => {
 const step=(name='Verify deployed commit and core assets',conclusion='success')=>({name,status:'completed',conclusion});
 const job=(sha=main,steps=[step()])=>({name:'deploy',head_sha:sha,status:'completed',conclusion:'success',steps});
 assert.equal(pagesDeploymentVerified([job()],main),true);
 assert.equal(pagesDeploymentVerified([job(old)],main),false);
 assert.equal(pagesDeploymentVerified([{...job(),conclusion:'failure'}],main),false);
 assert.equal(pagesDeploymentVerified([job(main,[step('Deploy to GitHub Pages')])],main),false);
 assert.equal(pagesDeploymentVerified([job(main,[step(undefined,'failure')])],main),false);
});

test('same-run deployment is recognised only with the real verified deploy job', () => {
 const step={name:'Verify deployed commit and core assets',status:'completed',conclusion:'success'};
 const deploy={id:22,run_id:11,name:'deploy',head_sha:main,status:'completed',conclusion:'success',steps:[step]};
 const base={mainSha:main,pulls:[],runs:[run(11,main)],releaseJobs:[deploy],liveSha:main};
 assert.equal(decide(base).action,'READY_FOR_SCOPED_WORK');
 assert.equal(decide(base).release_pipeline,'same-run-artifact');
 assert.equal(decide({...base,releaseJobs:[]}).action,'WAIT_RELEASE');
 assert.equal(decide({...base,releaseJobs:[{...deploy,run_id:10}]}).action,'WAIT_RELEASE');
 assert.equal(decide({...base,releaseJobs:[{...deploy,head_sha:old}]}).action,'WAIT_RELEASE');
 assert.equal(decide({...base,releaseJobs:[{...deploy,steps:[]}]}).action,'VERIFY_DEPLOYMENT');
 assert.equal(decide({...base,releaseJobs:[{...deploy,status:'in_progress',conclusion:null}]}).action,'WAIT_RELEASE');
 assert.equal(decide({...base,releaseJobs:[{...deploy,conclusion:'skipped'}]}).action,'DIAGNOSE_RELEASE_FAILURE');
 assert.equal(decide({...base,liveSha:old}).action,'VERIFY_DEPLOYMENT');
});
