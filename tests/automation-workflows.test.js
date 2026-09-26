import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import config from '../playwright.config.js';
const file = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('one pipeline retains all verification phases and both existing browser projects', () => {
  const ci = file('.github/workflows/ci.yml');
  assert.equal(existsSync(new URL('../.github/workflows/pages.yml', import.meta.url)), false);
  for (const command of ['pnpm test\n', 'pnpm test:e2e --project=${{ matrix.project }}\n', 'pnpm build\n', 'pnpm test:production\n'])
    assert.equal(ci.split('run: ' + command).length - 1, 1, command);
  assert.deepEqual([...ci.matchAll(/- project: (\S+)/g)].map(m => m[1]), config.projects.map(p => p.name));
  assert.match(ci, /browser:\n    needs: unit/);
  assert.match(ci, /check:\n    needs: \[unit, browser\]\n    if: \$\{\{ !cancelled\(\) \}\}/);
  assert.match(ci, /fail-fast: false/);
  assert.doesNotMatch(ci, /continue-on-error|--grep|--retries|workflow_run:|pull_request_target:/);
  assert.equal([...ci.matchAll(/timeout-minutes: (\d+)/g)].length, 4);
  for (const m of ci.matchAll(/timeout-minutes: (\d+)/g)) assert.equal(Number(m[1]), 40);
  assert.match(ci, /Record exact-commit verification receipt\n        if: always\(\)/);
  assert.match(ci, /Upload browser-test report\n        if: always\(\)/);
});

test('only exact trusted-main artifacts deploy with no rebuild or second application suite', () => {
  const ci = file('.github/workflows/ci.yml'), deploy = ci.split('\n  deploy:\n')[1];
  assert.match(ci, /cancel-in-progress:.*github.event_name == 'pull_request'/);
  assert.match(deploy, /cancel-in-progress: false/);
  assert.match(deploy, /needs: check/);
  assert.match(deploy, /github.ref == 'refs\/heads\/main'/);
  assert.match(deploy, /github.event_name == 'push'.*github.event_name == 'workflow_dispatch'/);
  assert.match(deploy, /artifact-ids: \$\{\{ needs.check.outputs.pages_artifact_id \}\}/);
  assert.match(deploy, /VERIFIED_MANIFEST_DIGEST: \$\{\{ needs.check.outputs.manifest_sha256 \}\}/);
  assert.match(deploy, /pipeline-evidence.mjs verify/);
  assert.match(deploy, /git\/ref\/heads\/main/);
  assert.match(deploy, /verify-pages.mjs verify/);
  assert.match(deploy, /environment:\n      name: github-pages/);
  assert.doesNotMatch(deploy, /pnpm|npm |vite |test:e2e|test:production|run-id:/);
  assert.doesNotMatch(ci.split('\n  deploy:\n')[0], /pages: write|id-token: write/);
  for (const match of ci.matchAll(/uses: ([^\n]+)/g)) assert.match(match[1], /^[\w/-]+@[a-f0-9]{40}(?: #.*)?$/);
});

test('test reports remain separate and test-level retries stay disabled', () => {
  const base = file('playwright.config.js'), production = file('playwright.production.config.js');
  assert.match(base, /retries: 0/); assert.match(base, /playwright-results\/dev.json/);
  assert.match(production, /playwright-results\/production.json/);
  assert.match(base, /--port 4173 --strictPort/);
});
