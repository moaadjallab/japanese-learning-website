// Post-build: write dist/_headers with security headers and a strict CSP.
// Inline <script> blocks emitted by Astro (island bootstrap) are allowed by SHA-256 hash,
// so we never need 'unsafe-inline' for scripts.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCsp, SECURITY_HEADERS } from '../src/lib/security/headers.js';

const DIST = new URL('../dist/', import.meta.url);

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_worker.js') continue;
      yield* htmlFiles(full);
    } else if (entry.name.endsWith('.html')) yield full;
  }
}

const hashes = new Set();
const inlineScript = /<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g;
for await (const file of htmlFiles(fileURLToPath(DIST))) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(inlineScript)) {
    const body = match[1];
    if (!body.trim()) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
}


const lines = ['/*'];
for (const [name, value] of Object.entries(SECURITY_HEADERS)) lines.push(`  ${name}: ${value}`);
lines.push(`  Content-Security-Policy: ${buildCsp([...hashes])}`);
lines.push('', '/_astro/*', '  Cache-Control: public, max-age=31536000, immutable', '');
lines.push('/fonts/*', '  Cache-Control: public, max-age=31536000, immutable', '');

await writeFile(new URL('_headers', DIST), lines.join('\n') + '\n');
console.log(`[postbuild-csp] wrote dist/_headers with ${hashes.size} inline script hash(es).`);
