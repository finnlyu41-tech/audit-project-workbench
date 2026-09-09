import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CI and Pages retain every existing verification phase in order and do not bypass failures',()=>{
 for(const name of ['ci','pages']) {
  const text=file(`.github/workflows/${name}.yml`);
  const positions=['pnpm test\n','pnpm test:e2e\n','pnpm build\n','pnpm test:production\n'].map(s=>text.indexOf('run: '+s));
  assert.ok(positions.every(p=>p>=0));assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
  assert.doesNotMatch(text,/continue-on-error/);assert.match(text,/timeout-minutes: 40/);
  assert.match(text,/Record exact-commit verification receipt[\s\S]*?if: always\(\)/);
  assert.match(text,/Upload browser-test report[\s\S]*?if: always\(\)/);
 }
});
test('only superseded PR checks cancel; active Pages releases are not interrupted',()=>{
 const ci=file('.github/workflows/ci.yml'),pages=file('.github/workflows/pages.yml');
 assert.match(ci,/cancel-in-progress:.*github.event_name == 'pull_request'/);
 assert.match(pages,/cancel-in-progress: false/);
 assert.match(pages,/verify-pages.mjs stamp/);assert.match(pages,/verify-pages.mjs verify/);
});
test('test reports remain separate and test-level retries stay disabled',()=>{
 const base=file('playwright.config.js'),production=file('playwright.production.config.js');
 assert.match(base,/retries: 0/);assert.match(base,/playwright-results\/dev.json/);
 assert.match(production,/playwright-results\/production.json/);
 assert.match(base,/--port 4173 --strictPort/);
});
