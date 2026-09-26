import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ENGINES, identity, requireIdentity, validateReport, recordPhase, combineDevelopment,
  validateReceipt, verifyLocalBuild, sealBuild } from '../scripts/pipeline-evidence.mjs';
import { stampRelease } from '../scripts/verify-pages.mjs';

const env = { GITHUB_REPOSITORY: 'finnlyu41-tech/audit-project-workbench', GITHUB_RUN_ID: '123',
  GITHUB_RUN_ATTEMPT: '1', GITHUB_SHA: 'a'.repeat(40), HEAD_SHA: 'b'.repeat(40) };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const report = (project = 'chromium') => ({ config: { projects: [{ name: project, retries: 0 }] },
  errors: [], stats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0 },
  suites: [{ specs: [{ id: 'case-one', tests: [{ projectName: project, expectedStatus: 'passed',
    status: 'expected', results: [{ status: 'passed', retry: 0, errors: [] }] }] }] }] });
const receipt = () => ({ ...identity(env), verification_passed: true,
  phases: { unit: 'success', browser: 'success', build: 'success', production: 'success' },
  browser: { expected: 2, unexpected: 0, skipped: 0, flaky: 0, errors: 0 },
  production: { expected: 2, unexpected: 0, skipped: 0, flaky: 0, errors: 0 } });

async function temporary(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'apw-evidence-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}
async function write(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value));
}

test('evidence requires repository, run, attempt and both exact commit identities', () => {
  const value = identity(env); requireIdentity(value, env);
  for (const key of Object.keys(value)) {
    assert.throws(() => requireIdentity({ ...value, [key]: `${value[key]}x` }, env), /Mismatched/);
  }
  assert.throws(() => identity({ ...env, GITHUB_RUN_ID: '' }));
  assert.throws(() => identity({ ...env, GITHUB_SHA: 'main' }));
});

test('full inventory accepts each configured case once and rejects missing, duplicate or substituted cases', () => {
  const good = report(); assert.equal(validateReport(good, good, ['chromium']), 1);
  for (const mutate of [r => { r.suites = []; }, r => { r.suites.push(structuredClone(r.suites[0])); },
    r => { r.suites[0].specs[0].id = 'substituted'; }, r => { r.stats.expected = 0; },
    r => { r.suites[0].specs[0].tests[0].projectName = 'other'; }]) {
    const bad = structuredClone(good); mutate(bad);
    assert.throws(() => validateReport(bad, good, ['chromium']));
  }
});

test('a green summary cannot conceal failure, skipped work, retries or report errors', () => {
  const good = report();
  const mutations = [r => r.errors.push({ message: 'runner error' }), r => { r.stats.flaky = 1; },
    r => { r.stats.skipped = 1; }, r => { r.stats.unexpected = 1; },
    r => { r.config.projects[0].retries = 1; },
    r => { r.suites[0].specs[0].tests[0].expectedStatus = 'failed'; },
    r => { r.suites[0].specs[0].tests[0].results[0].status = 'failed'; },
    r => { r.suites[0].specs[0].tests[0].results[0].retry = 1; },
    r => { r.suites[0].specs[0].tests[0].results = []; },
    r => { r.suites[0].specs[0].tests[0].results[0].errors.push({}); }];
  for (const mutate of mutations) { const bad = structuredClone(good); mutate(bad);
    assert.throws(() => validateReport(bad, good, ['chromium'])); }
});

test('combination refuses missing engines, changed report bytes and evidence from a different attempt', async t => {
  const directory = await temporary(t), old = process.cwd(); process.chdir(directory); t.after(() => process.chdir(old));
  const one = report(), two = report('webkit-stability');
  const inventory = { ...one, config: { projects: [...one.config.projects, ...two.config.projects] }, suites: [...one.suites, ...two.suites] };
  await write('playwright-results/inventory.json', inventory);
  await recordPhase('unit', { ...env, PHASE_OUTCOME: 'success' }, 'evidence/unit');
  for (const engine of ENGINES) {
    const folder = `evidence/${engine}/playwright-results`;
    await write(`${folder}/dev.json`, report(engine));
    await recordPhase(engine, { ...env, PHASE_OUTCOME: 'success' }, folder);
  }
  assert.equal((await combineDevelopment(env)).stats.expected, 2);
  const file = 'evidence/webkit-stability/playwright-results/phase.json';
  const original = await fs.readFile(file);
  const wrong = JSON.parse(original); wrong.run_attempt = '2'; await write(file, wrong);
  await assert.rejects(combineDevelopment(env), /run_attempt/);
  await fs.writeFile(file, original);
  await fs.appendFile('evidence/webkit-stability/playwright-results/dev.json', '\n');
  await assert.rejects(combineDevelopment(env), /artifact changed/);
  await fs.unlink(file); await assert.rejects(combineDevelopment(env));
});

test('failed phases leave an explicit false receipt, not a passing handoff', async t => {
  const directory = await temporary(t);
  for (const state of ['failure', 'cancelled', 'skipped', 'unknown']) {
    const result = await recordPhase('unit', { ...env, PHASE_OUTCOME: state }, directory);
    assert.equal(result.passed, false); assert.equal(result.outcome, state);
  }
  const absent = await recordPhase('chromium', { ...env, PHASE_OUTCOME: 'success' }, directory);
  assert.equal(absent.passed, false);
});

test('only exact successful four-phase receipts can seal a release', () => {
  const good = receipt(); validateReceipt(good, env);
  for (const phase of Object.keys(good.phases)) for (const outcome of ['cancelled', 'failure', 'skipped']) {
    const bad = structuredClone(good); bad.phases[phase] = outcome;
    assert.throws(() => validateReceipt(bad, env));
  }
  for (const section of ['browser', 'production']) {
    const bad = structuredClone(good); bad[section].expected = 0;
    assert.throws(() => validateReceipt(bad, env));
  }
  assert.throws(() => validateReceipt({ ...good, run_id: '999' }, env));
});

test('release handoff binds tested bytes, commit, receipt and final manifest digest without rebuilding', async t => {
  const directory = await temporary(t), old = process.cwd(); process.chdir(directory); t.after(() => process.chdir(old));
  await fs.mkdir('dist/assets', { recursive: true });
  for (const [name, text] of [['index.html', '<html>test</html>'], ['assets/app.js', 'console.log(1)'], ['assets/app.css', 'body{}']])
    await fs.writeFile(`dist/${name}`, text);
  await stampRelease('dist', env.GITHUB_SHA);
  const digest = hash(await fs.readFile('dist/apw-release.json'));
  await write('playwright-results/receipt.json', receipt());
  const sealed = await sealBuild('dist', { ...env, TESTED_MANIFEST_DIGEST: digest });
  await verifyLocalBuild('dist', env, sealed);
  await assert.rejects(verifyLocalBuild('dist', env, '0'.repeat(64)), /manifest changed/);
  await assert.rejects(verifyLocalBuild('dist', { ...env, GITHUB_SHA: 'c'.repeat(40) }, sealed));
  await fs.appendFile('dist/assets/app.js', '/*changed*/');
  await assert.rejects(verifyLocalBuild('dist', env, sealed), /Size differs/);
  await fs.writeFile('dist/assets/app.js', 'console.log(2)');
  await assert.rejects(verifyLocalBuild('dist', env, sealed), /Content differs/);
});

test('Pages extraction refuses traversal and links before writing files', async t => {
  const directory = await temporary(t);
  const script = new URL('../scripts/unpack-pages.py', import.meta.url).pathname;
  const result = execFileSync('python3', ['-c', `
import importlib.util, io, pathlib, tarfile
spec=importlib.util.spec_from_file_location('unpack', ${JSON.stringify(script)})
m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
root=pathlib.Path(${JSON.stringify(directory)})
for label, name, kind in [('ok','./index.html',tarfile.REGTYPE),('parent','../outside',tarfile.REGTYPE),('absolute','/outside',tarfile.REGTYPE),('sym','link',tarfile.SYMTYPE),('hard','link',tarfile.LNKTYPE)]:
 source=root/(label+'.tar'); dest=root/label
 with tarfile.open(source,'w') as archive:
  item=tarfile.TarInfo(name); item.type=kind; item.linkname='../outside'; item.size=1 if kind==tarfile.REGTYPE else 0
  archive.addfile(item,io.BytesIO(b'x') if item.size else None)
 try:
  m.unpack(source,dest)
  assert label=='ok'
 except ValueError:
  assert label!='ok' and not dest.exists()
assert (root/'ok/index.html').read_text()=='x'
print('safe extraction cases passed')
`], { encoding: 'utf8' });
  assert.match(result, /safe extraction cases passed/);
});
