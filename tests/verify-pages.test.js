import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {stampRelease,validateManifest,verifyReleaseOnce} from '../scripts/verify-pages.mjs';
const sha='a'.repeat(40), old='b'.repeat(40), base='https://finnlyu41-tech.github.io/audit-project-workbench/';
async function fixture(t) {
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'apw-release-test-'));t.after(()=>fs.rm(dir,{recursive:true,force:true}));
 await fs.mkdir(path.join(dir,'assets'));
 await fs.writeFile(path.join(dir,'index.html'),'<title>APW</title><div id="root"></div>');
 await fs.writeFile(path.join(dir,'assets','app.js'),'console.log("fictional")');
 await fs.writeFile(path.join(dir,'assets','app.css'),'body { margin:0; }');
 const manifest=await stampRelease(dir,sha);const calls=[];
 const fetcher=async(url,opts)=>{
  const u=new URL(url);calls.push(u.href);assert.equal(u.origin,new URL(base).origin);assert.equal(u.searchParams.get('verify'),sha);assert.equal(opts.redirect,'error');
  try { const file = path.join(dir,u.pathname.slice(new URL(base).pathname.length)); return new Response(await fs.readFile(file),{status:200}); }
  catch{return new Response('missing',{status:404});}
 };
 return {dir,manifest,fetcher,calls};
}
test('release stamp and public check match exact index and all JS/CSS bytes',async t=>{
 const f=await fixture(t);const result=await verifyReleaseOnce(base,sha,f.fetcher);
 assert.equal(result.verified,true);assert.equal(result.files.length,3);assert.equal(f.calls.length,5);
});
test('a new marker with stale HTML cannot be declared a verified release',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.dir,'index.html'),'old index');
 await assert.rejects(verifyReleaseOnce(base,sha,f.fetcher),/content differs|invalid size/);
});
test('missing or altered assets and stale commit markers fail closed',async t=>{
 const f=await fixture(t);await fs.writeFile(path.join(f.dir,'apw-build-sha.txt'),old);
 await assert.rejects(verifyReleaseOnce(base,sha,f.fetcher),/Public commit/);
 await fs.writeFile(path.join(f.dir,'apw-build-sha.txt'),sha);await fs.unlink(path.join(f.dir,'assets/app.css'));
 await assert.rejects(verifyReleaseOnce(base,sha,f.fetcher),/HTTP 404/);
});
test('unsafe manifest paths, duplicate files and wrong commits are rejected',async t=>{
 const f=await fixture(t);
 assert.throws(()=>validateManifest({...f.manifest,commit:old},sha));
 for(const p of ['../Database/client.json','https://evil.test/a.js','assets/../../x.js'])
  assert.throws(()=>validateManifest({...f.manifest,files:[...f.manifest.files,{...f.manifest.files[0],path:p}]},sha));
 assert.throws(()=>validateManifest({...f.manifest,files:[...f.manifest.files,f.manifest.files[0]]},sha));
});
test('unexpected origins do not trigger a request',async()=>{
 let calls=0;await assert.rejects(verifyReleaseOnce('https://example.test/',sha,()=>{calls++;}));assert.equal(calls,0);
});
