import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const REPOSITORY = 'finnlyu41-tech/audit-project-workbench';
const LIVE_URL = 'https://finnlyu41-tech.github.io/audit-project-workbench/';
const CI = '.github/workflows/ci.yml';
const PAGES = '.github/workflows/pages.yml';
const completed = run => run?.status === 'completed';
const latest = (runs, sha, workflow) => runs.filter(run => run.head_sha === sha
  && run.path?.split('@')[0] === workflow).sort((a, b) => b.id - a.id)[0];
const describe = run => run ? { id: run.id, sha: run.head_sha, status: run.status,
  conclusion: run.conclusion, url: run.html_url } : null;

// This classifier never writes, merges, retries, creates tasks or assumes a
// previous commit's passing check applies to the current commit.
export function pagesDeploymentVerified(jobs, sha) {
  if (!/^[0-9a-f]{40}$/.test(sha || '') || !Array.isArray(jobs)) return false;
  return jobs.some(job => job?.name === 'deploy' && job.head_sha === sha
    && job.status === 'completed' && job.conclusion === 'success'
    && Array.isArray(job.steps) && job.steps.some(step => step?.name === 'Verify deployed commit and core assets'
      && step.status === 'completed' && step.conclusion === 'success'));
}

export function decideAutomationAction(snapshot) {
  const { mainSha, pulls = [], runs = [], liveSha = null, liveCheck = 'not-needed', deploymentVerified = false } = snapshot;
  if (!/^[0-9a-f]{40}$/.test(mainSha || '')) throw new Error('Missing or invalid main SHA');
  const state = { repository: REPOSITORY, main_sha: mainSha, open_prs: pulls.map(pr => pr.number) };
  if (pulls.length > 1) return { ...state, action: 'CONSOLIDATE_OPEN_PRS', reason: 'Review overlapping work before starting another branch.' };
  if (pulls.length === 1) {
    const pr = pulls[0];
    if (!/^[0-9a-f]{40}$/.test(pr.head?.sha || '')) throw new Error('Missing PR head SHA');
    const ci = latest(runs, pr.head.sha, CI);
    const detail = { ...state, pr: pr.number, head_sha: pr.head.sha, ci: describe(ci) };
    if (!ci) return { ...detail, action: 'CHECK_MISSING_CI', reason: 'No CI run for the exact PR head.' };
    if (!completed(ci)) return { ...detail, action: 'WAIT_PR_CI', reason: 'CI is running; do not push a no-op change or launch another suite.' };
    if (ci.conclusion !== 'success') return { ...detail, action: 'DIAGNOSE_PR_FAILURE', reason: 'Read the exact failed step and artifact; do not blindly rerun or create a replacement PR.' };
    return { ...detail, action: 'RESUME_PR_REVIEW', draft: Boolean(pr.draft), reason: 'Finish review of this passing head; merge still requires authorization and a head check.' };
  }
  const ci = latest(runs, mainSha, CI), pages = latest(runs, mainSha, PAGES);
  const detail = { ...state, ci: describe(ci), pages: describe(pages) };
  if ([ci, pages].some(run => completed(run) && run.conclusion !== 'success'))
    return { ...detail, action: 'DIAGNOSE_RELEASE_FAILURE', reason: 'The exact main commit has a failed or cancelled release gate.' };
  if (!ci || !pages || !completed(ci) || !completed(pages))
    return { ...detail, action: 'WAIT_RELEASE', reason: 'Main CI and Pages must both finish for this exact commit.' };
  if (liveSha === mainSha) return { ...detail, action: 'READY_FOR_SCOPED_WORK', live_sha: liveSha,
    deployment_verified: true, verification_source: 'live_marker',
    reason: 'Current release gates and public commit marker agree. Report no-change runs too; a new change is not mandatory.' };
  if (liveSha === null && liveCheck === 'unavailable' && deploymentVerified) return { ...detail, action: 'READY_FOR_SCOPED_WORK', live_sha: null,
    deployment_verified: true, verification_source: 'pages_post_deploy',
    reason: 'The exact main Pages run completed its public commit-and-asset verification; the local live-marker fetch was unavailable.' };
  return { ...detail, action: 'VERIFY_DEPLOYMENT', live_sha: liveSha, deployment_verified: false,
    reason: 'A green deployment alone is not proof that the public site serves the expected commit.' };
}

function github(endpoint) {
  try { return JSON.parse(execFileSync('gh', ['api', endpoint], { encoding: 'utf8', timeout: 25_000,
    maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })); }
  catch (cause) {
    const detail = String(cause.stderr || cause.message || '');
    const error = new Error('GitHub read failed');
    error.category = /timeout|timed out|ENOTFOUND|resolve host|TLS handshake/i.test(detail) ? 'network'
      : /401|403|authentication|not logged/i.test(detail) ? 'access' : 'tool';
    throw error;
  }
}
export async function collectAutomationStatus() {
  const repo = github(`repos/${REPOSITORY}`);
  const branch = github(`repos/${REPOSITORY}/branches/${encodeURIComponent(repo.default_branch)}`);
  const pulls = github(`repos/${REPOSITORY}/pulls?state=open&per_page=100`);
  if (!Array.isArray(pulls) || pulls.length >= 100) throw new Error('Incomplete open-PR inventory; manual inspection required');
  const mainSha = branch.commit.sha;
  const shas = [...new Set([mainSha, ...pulls.slice(0, 2).map(pr => pr.head.sha)])];
  const runs = shas.flatMap(sha => {
    const data = github(`repos/${REPOSITORY}/actions/runs?head_sha=${sha}&per_page=100`);
    if (data.total_count > 100) throw new Error('Workflow history exceeds this bounded read; manual inspection required');
    return data.workflow_runs;
  });
  let liveSha = null, liveCheck = 'not-needed', deploymentVerified = false;
  if (!pulls.length) {
    try {
      const response = await fetch(`${LIVE_URL}apw-build-sha.txt?verify=${mainSha}`, {
        headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(15_000), redirect: 'error',
      });
      if (response.ok) { const text = (await response.text()).trim(); if (/^[0-9a-f]{40}$/.test(text)) liveSha = text; }
      liveCheck = `HTTP ${response.status}`;
    } catch { liveCheck = 'unavailable'; }
  }
  if (!pulls.length && liveSha === null) {
    const pages = latest(runs, mainSha, PAGES);
    if (pages && completed(pages) && pages.conclusion === 'success') {
      try {
        const jobs = github(`repos/${REPOSITORY}/actions/runs/${pages.id}/jobs?per_page=100`);
        if (jobs.total_count > 100) throw new Error('Pages job history exceeds this bounded read; manual inspection required');
        deploymentVerified = pagesDeploymentVerified(jobs.jobs, mainSha);
      } catch { deploymentVerified = false; }
    }
  }
  return { checked_at: new Date().toISOString(), scheduler_inspected: false, live_check: liveCheck,
    ...decideAutomationAction({ mainSha, pulls, runs, liveSha, liveCheck, deploymentVerified }) };

}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await collectAutomationStatus(), null, 2)); }
  catch (error) { console.error(JSON.stringify({ repository: REPOSITORY, action: 'TOOL_BLOCKED', category: error.category || 'inventory',
    reason: 'Repository state could not be read completely. No writes or retries were performed.', scheduler_inspected: false })); process.exitCode = 2; }
}
