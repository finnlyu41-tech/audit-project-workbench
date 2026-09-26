// Same-run evidence and immutable build handoff. No application or customer data.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verificationReceipt } from './verification-receipt.mjs';
import { validateManifest } from './verify-pages.mjs';

const REPOSITORY = 'finnlyu41-tech/audit-project-workbench';
export const ENGINES = ['chromium', 'webkit-stability'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const save = async (file, value) => { await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n'); };
export function identity(env) {
  const value = { repository: env.GITHUB_REPOSITORY, run_id: env.GITHUB_RUN_ID,
    run_attempt: env.GITHUB_RUN_ATTEMPT, head_sha: env.HEAD_SHA, tested_sha: env.GITHUB_SHA };
  assert.equal(value.repository, REPOSITORY, 'Unexpected repository');
  for (const key of ['head_sha', 'tested_sha']) assert.match(value[key] || '', /^[a-f0-9]{40}$/, `Invalid ${key}`);
  for (const key of ['run_id', 'run_attempt']) assert.match(value[key] || '', /^[1-9][0-9]*$/, `Invalid ${key}`);
  return value;
}
export function requireIdentity(value, env) {
  for (const [key, expected] of Object.entries(identity(env))) assert.equal(value?.[key], expected, `Mismatched ${key}`);
}
export function testEntries(report) {
  const entries = [];
  const visit = suite => {
    for (const spec of suite.specs || []) for (const test of spec.tests || [])
      entries.push({ key: `${spec.id}:${test.projectName}`, test });
    for (const child of suite.suites || []) visit(child);
  };
  assert.ok(Array.isArray(report?.suites), 'Missing test suites');
  report.suites.forEach(visit);
  assert.ok(entries.length, 'Empty test suite');
  assert.equal(new Set(entries.map(entry => entry.key)).size, entries.length, 'Duplicate test identity');
  return entries;
}
export function validateReport(report, inventory, projects) {
  assert.deepEqual(report?.errors, [], 'Report errors');
  const entries = testEntries(report);
  assert.equal(report.stats?.expected, entries.length, 'Incomplete test count');
  for (const key of ['unexpected', 'skipped', 'flaky']) assert.equal(report.stats[key], 0, key);
  for (const project of report.config?.projects || []) assert.equal(project.retries, 0, 'Retries changed');
  for (const { test } of entries) {
    assert.ok(projects.includes(test.projectName), 'Unexpected test project');
    assert.equal(test.expectedStatus, 'passed', 'Expected failure or skip');
    assert.equal(test.status, 'expected', 'Unexpected outcome');
    assert.equal(test.results?.length, 1, 'Missing result or retried test');
    assert.equal(test.results[0].status, 'passed');
    assert.equal(test.results[0].retry, 0);
    assert.deepEqual(test.results[0].errors, []);
  }
  for (const project of projects) assert.ok(entries.some(e => e.test.projectName === project), `Missing ${project}`);
  if (inventory) {
    const expected = testEntries(inventory).filter(e => projects.includes(e.test.projectName));
    assert.deepEqual(entries.map(e => e.key).sort(), expected.map(e => e.key).sort(), 'Test inventory differs');
  }
  return entries.length;
}
export async function recordPhase(phase, env, directory = 'playwright-results') {
  assert.ok(['unit', ...ENGINES].includes(phase), 'Unknown phase');
  const result = { ...identity(env), phase, outcome: env.PHASE_OUTCOME, passed: false };
  try {
    assert.equal(result.outcome, 'success', 'Phase did not succeed');
    if (phase !== 'unit') {
      const raw = await fs.readFile(path.join(directory, 'dev.json'));
      result.count = validateReport(JSON.parse(raw), null, [phase]);
      result.report_sha256 = hash(raw);
    }
    result.passed = true;
  } catch (error) { result.error = error.message; }
  await save(path.join(directory, 'phase.json'), result);
  return result;
}
export async function combineDevelopment(env, root = 'evidence', inventoryFile = 'playwright-results/inventory.json') {
  const inventory = await read(inventoryFile);
  assert.deepEqual([...new Set(testEntries(inventory).map(e => e.test.projectName))].sort(), [...ENGINES].sort());
  const unit = await read(path.join(root, 'unit', 'phase.json'));
  requireIdentity(unit, env);
  assert.equal(unit.phase, 'unit'); assert.equal(unit.outcome, 'success'); assert.equal(unit.passed, true);
  const reports = [];
  for (const engine of ENGINES) {
    const folder = path.join(root, engine, 'playwright-results');
    const evidence = await read(path.join(folder, 'phase.json'));
    requireIdentity(evidence, env);
    assert.equal(evidence.phase, engine); assert.equal(evidence.passed, true); assert.equal(evidence.outcome, 'success');
    const raw = await fs.readFile(path.join(folder, 'dev.json'));
    assert.equal(hash(raw), evidence.report_sha256, 'Report artifact changed');
    const report = JSON.parse(raw);
    assert.equal(validateReport(report, inventory, [engine]), evidence.count);
    reports.push(report);
  }
  const stats = { expected: reports.reduce((sum, r) => sum + r.stats.expected, 0), skipped: 0, unexpected: 0, flaky: 0 };
  const combined = { config: inventory.config, suites: reports.flatMap(r => r.suites), errors: [], stats };
  validateReport(combined, inventory, ENGINES);
  await save('playwright-results/dev.json', combined);
  return combined;
}
export function validateReceipt(receipt, env) {
  requireIdentity(receipt, env);
  assert.equal(receipt.verification_passed, true, 'Unverified receipt');
  assert.deepEqual(receipt.phases, { unit: 'success', browser: 'success', build: 'success', production: 'success' });
  for (const key of ['browser', 'production']) {
    assert.ok(Number.isInteger(receipt[key]?.expected) && receipt[key].expected > 0, 'Empty receipt');
    for (const field of ['unexpected', 'skipped', 'flaky', 'errors']) assert.equal(receipt[key][field], 0);
  }
}
export async function recordFinal(env) {
  let dev = null, production = null, error = null;
  try {
    dev = await combineDevelopment(env);
    production = await read('playwright-results/production.json');
    validateReport(production, await read('playwright-results/production-inventory.json'), ['chromium', 'webkit-production']);
  } catch (cause) { error = cause.message; }
  const result = { ...verificationReceipt(env, dev, production), ...identity(env) };
  if (error) { result.verification_passed = false; result.error = error; }
  await save('playwright-results/receipt.json', result);
  return result;
}
export async function verifyLocalBuild(directory, env, expectedDigest, requireReceipt = true) {
  assert.match(expectedDigest || '', /^[a-f0-9]{64}$/, 'Missing tested manifest digest');
  const raw = await fs.readFile(path.join(directory, 'apw-release.json'));
  assert.equal(hash(raw), expectedDigest, 'Release manifest changed');
  const manifest = validateManifest(JSON.parse(raw), identity(env).tested_sha);
  assert.equal((await fs.readFile(path.join(directory, 'apw-build-sha.txt'), 'utf8')).trim(), env.GITHUB_SHA);
  for (const file of manifest.files) {
    const location = path.join(directory, file.path);
    assert.equal((await fs.lstat(location)).isFile(), true, 'Non-regular core file');
    const bytes = await fs.readFile(location);
    assert.equal(bytes.length, file.bytes, `Size differs: ${file.path}`);
    assert.equal(hash(bytes), file.sha256, `Content differs: ${file.path}`);
  }
  if (requireReceipt) validateReceipt(manifest.verification, env);
  return manifest;
}
export async function sealBuild(directory, env) {
  const manifest = await verifyLocalBuild(directory, env, env.TESTED_MANIFEST_DIGEST, false);
  const receipt = await read('playwright-results/receipt.json'); validateReceipt(receipt, env);
  // Only release metadata is added after tests; never rebuild or rewrite tested assets.
  manifest.verification = receipt;
  await save(path.join(directory, 'apw-release.json'), manifest);
  return hash(await fs.readFile(path.join(directory, 'apw-release.json')));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, target] = process.argv.slice(2), env = process.env;
  try {
    if (mode === 'phase') { const result = await recordPhase(target, env); console.log(JSON.stringify(result)); if (!result.passed) process.exitCode = 1; }
    else if (mode === 'combine') { console.log(JSON.stringify((await combineDevelopment(env)).stats)); }
    else if (mode === 'final') { const result = await recordFinal(env); console.log(JSON.stringify(result, null, 2)); if (!result.verification_passed) process.exitCode = 1; }
    else if (mode === 'seal') {
      const digest = await sealBuild(target, env);
      assert.ok(env.GITHUB_OUTPUT, 'Missing job output');
      await fs.appendFile(env.GITHUB_OUTPUT, `manifest_sha256=${digest}\n`);
      console.log(`Verified release ${env.GITHUB_SHA}; manifest ${digest}`);
    } else if (mode === 'verify') { await verifyLocalBuild(target, env, env.VERIFIED_MANIFEST_DIGEST); console.log('Same-run tested artifact verified'); }
    else throw new Error('Unknown pipeline evidence command');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
