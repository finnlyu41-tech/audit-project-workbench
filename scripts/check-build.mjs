import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const BUNDLE_LIMITS = Object.freeze({ chunk: 500_000, total: 1_000_000, gzip: 300_000 });

// Audit the actual emitted graph, not filenames guessed from a previous deployment.
export function manifestFiles(manifest) {
  const entries = Object.keys(manifest).filter(key => manifest[key].isEntry);
  assert.deepEqual(entries, ['index.html'], 'Expected the existing single application entry');
  const visiting = new Set(); const visited = new Set(); const files = new Set();
  const add = file => {
    assert.match(file, /^assets\/[A-Za-z0-9_.-]+$/, 'Unsafe or non-local asset path');
    files.add(file);
  };
  const visit = key => {
    assert.ok(manifest[key], `Missing manifest dependency: ${key}`);
    assert.ok(!visiting.has(key), `Circular chunk dependency: ${key}`);
    if (visited.has(key)) return;
    visiting.add(key); const chunk = manifest[key]; add(chunk.file);
    for (const file of [...(chunk.css || []), ...(chunk.assets || [])]) add(file);
    for (const child of [...(chunk.imports || []), ...(chunk.dynamicImports || [])]) visit(child);
    visiting.delete(key); visited.add(key);
  };
  entries.forEach(visit);
  assert.equal(visited.size, Object.keys(manifest).length, 'Unreachable build manifest entries');
  return [...files].sort();
}

export function checkBundle(assets, limits = BUNDLE_LIMITS) {
  const js = Object.entries(assets).filter(([file]) => file.endsWith('.js'));
  assert.ok(js.length > 0, 'No JavaScript output');
  let bytes = 0; let gzipBytes = 0;
  const chunks = js.map(([file, content]) => {
    const size = Buffer.byteLength(content); const gzip = gzipSync(content).length;
    assert.ok(size <= limits.chunk, `Oversized JavaScript chunk: ${file} (${size} bytes)`);
    bytes += size; gzipBytes += gzip;
    return { file, bytes: size, gzipBytes: gzip };
  });
  assert.ok(bytes <= limits.total, `Total JavaScript budget exceeded: ${bytes}`);
  assert.ok(gzipBytes <= limits.gzip, `Gzip JavaScript budget exceeded: ${gzipBytes}`);
  return { chunks, bytes, gzipBytes, largestChunkBytes: Math.max(...chunks.map(chunk => chunk.bytes)) };
}

export function inspectBuild(directory = 'dist') {
  const manifest = JSON.parse(readFileSync(resolve(directory, '.vite/manifest.json'), 'utf8'));
  const assets = Object.fromEntries(manifestFiles(manifest).map(file => [file, readFileSync(resolve(directory, file))]));
  const summary = checkBundle(assets);
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { inspectBuild(process.argv[2] || 'dist'); }
  catch (error) { console.error(`Build verification failed: ${error.message}`); process.exitCode = 1; }
}
