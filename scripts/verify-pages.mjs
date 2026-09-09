import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const hash = data => createHash('sha256').update(data).digest('hex');
const validSha = sha => /^[0-9a-f]{40}$/.test(sha || '');
export async function stampRelease(directory, sha) {
  if (!validSha(sha)) throw new Error('An exact commit SHA is required');
  const assets = (await fs.readdir(path.join(directory,'assets'))).filter(name => /\.(js|css)$/.test(name));
  const paths = ['index.html', ...assets.sort().map(name => `assets/${name}`)];
  const files = await Promise.all(paths.map(async file => {
    const data = await fs.readFile(path.join(directory,file));
    return {path:file,bytes:data.length,sha256:hash(data)};
  }));
  const manifest = {version:1,commit:sha,files}; validateManifest(manifest,sha);
  await fs.writeFile(path.join(directory,'apw-build-sha.txt'),sha+'\n');
  await fs.writeFile(path.join(directory,'apw-release.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
export function validateManifest(manifest, expectedSha) {
  if (!validSha(expectedSha) || manifest?.version !== 1 || manifest.commit !== expectedSha
    || !Array.isArray(manifest.files) || manifest.files.length < 3 || manifest.files.length > 100)
    throw new Error('Release manifest has the wrong commit or structure');
  const seen = new Set(); let total = 0;
  for (const file of manifest.files) {
    if (!/^(index\.html|assets\/[A-Za-z0-9_.-]+\.(js|css))$/.test(file?.path || '') || seen.has(file.path)
      || !Number.isInteger(file.bytes) || file.bytes < 1 || file.bytes > 5_000_000
      || !/^[0-9a-f]{64}$/.test(file.sha256 || '')) throw new Error('Unsafe or invalid asset manifest');
    seen.add(file.path); total += file.bytes;
  }
  if (!seen.has('index.html') || ![...seen].some(p=>p.endsWith('.js')) || ![...seen].some(p=>p.endsWith('.css')) || total > 20_000_000)
    throw new Error('Release manifest is missing core files or exceeds limits');
  return manifest;
}
export async function verifyReleaseOnce(base, sha, fetcher = fetch, timeout = 20_000) {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.hostname !== 'finnlyu41-tech.github.io'
    || url.pathname !== '/audit-project-workbench/' || url.search || url.hash || !validSha(sha))
    throw new Error('Unexpected Pages origin, path or commit');
  const get = async (file, maxBytes) => {
    const response = await fetcher(new URL(`${file}?verify=${sha}`,url), {
      headers:{'Cache-Control':'no-cache','User-Agent':'APW-release-verification'},
      redirect:'error', signal:AbortSignal.timeout(timeout),
    });
    if (response.status !== 200) throw new Error(`${file}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > maxBytes) throw new Error(`${file}: invalid size`);
    return bytes;
  };
  const marker = (await get('apw-build-sha.txt',100)).toString('utf8').trim();
  if (marker !== sha) throw new Error(`Public commit is ${marker || '<empty>'}, expected ${sha}`);
  const manifest = validateManifest(JSON.parse((await get('apw-release.json',50_000)).toString('utf8')),sha);
  const verified = await Promise.all(manifest.files.map(async file => {
    const data = await get(file.path,file.bytes);
    if (data.length !== file.bytes || hash(data) !== file.sha256) throw new Error(`${file.path}: content differs from the release build`);
    return {path:file.path,bytes:file.bytes,sha256:file.sha256};
  }));
  return {commit:sha,verified_at:new Date().toISOString(),files:verified,verified:true};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode,target,sha] = process.argv.slice(2);
    if (mode === 'stamp') console.log(JSON.stringify(await stampRelease(target,sha)));
    else if (mode === 'verify') {
      // Only deployment propagation is retried, within a fixed total budget.
      // Application tests and data-changing actions are never retried here.
      const end = Date.now()+240_000; let result, lastError;
      for (let attempt=1; attempt<=24 && Date.now()<end; attempt++) {
        try { result=await verifyReleaseOnce(target,sha,fetch,Math.max(1,Math.min(20_000,Math.floor((end-Date.now())/3)))); break; }
        catch(error) { lastError=error; console.error(`Propagation check ${attempt}: ${error.message}`); }
        if(attempt<24 && Date.now()<end) await new Promise(resolve=>setTimeout(resolve,Math.min(5000,end-Date.now())));
      }
      if(!result) throw lastError || new Error('Deployment verification timed out');
      console.log(JSON.stringify(result,null,2));
      if(process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
        `## Public release verified\n\nCommit: \`${sha}\`. Exact bytes verified for ${result.files.length} core files.\n`);
    } else throw new Error('Usage: verify-pages.mjs stamp <dist> <sha> | verify <Pages URL> <sha>');
  } catch(error) { console.error(error.message); process.exitCode=1; }
}
