import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function verificationReceipt(env, dev, production) {
  const phases = Object.fromEntries(['unit','browser','build','production'].map(key => [key, env[`OUTCOME_${key.toUpperCase()}`] || 'unknown']));
  const summary = report => report?.stats ? { ...report.stats, errors: report.errors?.length || 0 } : null;
  const browser = summary(dev), built = summary(production);
  const passed = s => s && s.expected > 0 && ['unexpected','flaky','skipped','errors'].every(k=>s[k]===0);
  return { recorded_at: new Date().toISOString(), run_id: env.GITHUB_RUN_ID || null,
    run_attempt: env.GITHUB_RUN_ATTEMPT || null, head_sha: env.HEAD_SHA || null,
    tested_sha: env.GITHUB_SHA || null, workflow: env.GITHUB_WORKFLOW || null,
    phases, browser, production: built,
    verification_passed: /^[0-9a-f]{40}$/.test(env.HEAD_SHA || '') && /^[0-9a-f]{40}$/.test(env.GITHUB_SHA || '') && Object.values(phases).every(s=>s==='success') && Boolean(passed(browser) && passed(built)),
    deployment_verified: false, scheduler_inspected: false };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const read = p => { try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return null;} };
  const receipt=verificationReceipt(process.env,read('playwright-results/dev.json'),read('playwright-results/production.json'));
  fs.mkdirSync('playwright-results',{recursive:true});
  fs.writeFileSync('playwright-results/receipt.json',JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    `## APW verification receipt\n\nHead: \`${receipt.head_sha}\`; tested: \`${receipt.tested_sha}\`.\n\n`
    +Object.entries(receipt.phases).map(([k,v])=>`- ${k}: ${v}`).join('\n')
    +'\n\nExact counts: `playwright-results/receipt.json`. Verification is not deployment.\n');
  if(Object.values(receipt.phases).every(s=>s==='success') && !receipt.verification_passed) process.exitCode=1;
}
