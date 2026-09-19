import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { webkit } from '@playwright/test';
import { webkitLaunchOptions } from '../scripts/playwright-webkit.mjs';
import base from '../playwright.config.js';
import production from '../playwright.production.config.js';

test('WebKit launch override is macOS-only and keeps the managed browser and environment', () => {
  assert.deepEqual(webkitLaunchOptions('linux'), {});
  assert.deepEqual(webkitLaunchOptions('win32'), {});
  const options = webkitLaunchOptions('darwin');
  assert.equal(options.env.APW_WEBKIT_EXECUTABLE, webkit.executablePath());
  for (const [key, value] of Object.entries(process.env)) {
    if (key !== 'APW_WEBKIT_EXECUTABLE') assert.equal(options.env[key], value);
  }
  assert.notEqual(options.env, process.env);
  assert.match(options.executablePath, /launch-webkit-macos\.sh$/);
  assert.deepEqual(Object.keys(options).sort(), ['env', 'executablePath']);
});

test('development and production preserve one WebKit launch policy and zero retries', () => {
  assert.deepEqual(production.projects[1].use, base.projects[1].use);
  assert.deepEqual(base.projects[1].use.launchOptions, webkitLaunchOptions());
  assert.equal(base.retries, 0);
  assert.equal(production.retries, 0);
  assert.equal(base.expect.timeout, 8000);
  assert.equal(base.use.trace, 'retain-on-failure');
});

test('macOS wrapper forwards flags literally, uses a volatile argument and fails closed', () => {
  const wrapper = webkitLaunchOptions('darwin').executablePath;
  const script = readFileSync(wrapper, 'utf8');
  assert.match(script, /exec "\$APW_WEBKIT_EXECUTABLE" "\$@" -NSAutomaticWindowAnimationsEnabled NO/);
  assert.doesNotMatch(script, /defaults\s+write|pmset|caffeinate|eval|ignoreDefaultArgs/);
  // Only macOS uses this shell launcher; Windows still validates its exact source contract.
  if (process.platform === 'win32') return;
  const directory = mkdtempSync(path.join(tmpdir(), 'apw-webkit-launch-'));
  try {
    const fake = path.join(directory, 'managed browser.sh');
    writeFileSync(fake, '#!/bin/sh\nprintf "%s\\n" "$@"\nprintf "pipe-preserved" >&3\nexit 23\n');
    chmodSync(fake, 0o755);
    const args = ['--inspector-pipe', '--headless', '--user-data-dir=/tmp/fake path', 'literal;not-a-command'];
    const result = spawnSync('/bin/sh', [wrapper, ...args], {
      env: { ...process.env, APW_WEBKIT_EXECUTABLE: fake }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
    });
    assert.equal(result.status, 23);
    assert.deepEqual(result.stdout.trim().split('\n'), [...args, '-NSAutomaticWindowAnimationsEnabled', 'NO']);
    assert.equal(result.output[3], 'pipe-preserved');
    const env = { ...process.env }; delete env.APW_WEBKIT_EXECUTABLE;
    const missing = spawnSync('/bin/sh', [wrapper], { env, encoding: 'utf8' });
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /Expected the Playwright-managed WebKit launcher/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
