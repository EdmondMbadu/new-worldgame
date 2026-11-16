// Builds the game page (/unmet/play/) into unmet/dist/play, next to Unmet.
// Called by build.mjs after Unmet itself is built: the game shares Unmet's
// fonts, map files and data snapshot (the content-hashed folder `S`), and
// like Unmet it is a standalone document the Angular app never imports.
//
// The script is split by esbuild: the page itself is small, and the live
// back end (Firebase), the QR code and the admin screen are separate chunks
// fetched only when they are needed.
import { build, transform } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = fileURLToPath(new URL('../', import.meta.url));
const at = (...p) => path.join(here, ...p);
const BASE = '/unmet';

export async function buildPlay({ dist, S, sample = false, quiet = false }) {
  const result = await build({
    entryPoints: [at('src/play/main.js')],
    bundle: true,
    splitting: true,
    format: 'esm',
    minify: true,
    target: 'es2020',
    outdir: path.join(dist, 'assets'),
    entryNames: 'play-[hash]',
    chunkNames: 'play-[name]-[hash]',
    legalComments: 'none',
    metafile: true,
    logLevel: 'warning',
  });
  const outputs = Object.entries(result.metafile.outputs);
  const entry = outputs.find(([, o]) => o.entryPoint && o.entryPoint.endsWith('src/play/main.js'))[0];
  const js = `${BASE}/assets/${path.basename(entry)}`;
  const css = (await transform(readFileSync(at('src/play/styles.css'), 'utf8').replaceAll('%S%', S), { loader: 'css', minify: true })).code.trim();
  const html = readFileSync(at('src/play/page.html'), 'utf8')
    .replaceAll('%S%', S)
    .replaceAll('%JS%', js)
    .replace('%CSS%', () => css)
    .replace('%CONFIG%', JSON.stringify({ s: S, data: 'data.json', sample }));
  mkdirSync(path.join(dist, 'play'), { recursive: true });
  writeFileSync(path.join(dist, 'play/index.html'), html);

  if (!quiet) {
    const gz = (f) => (gzipSync(readFileSync(f)).byteLength / 1024).toFixed(1);
    const others = outputs.filter(([f]) => f.endsWith('.js') && f !== entry).map(([f]) => `${path.basename(f).replace(/^play-|-[A-Z0-9]+\.js$/g, '')} ${gz(f)}`);
    console.log(`Game built${sample ? ' WITH SAMPLE DATA (not for deployment)' : ''}:`);
    console.log(`  page   ${gz(path.join(dist, 'play/index.html'))} KiB gzip (HTML + all CSS)`);
    console.log(`  script ${gz(entry)} KiB gzip · on demand: ${others.join(', ') || 'none'} KiB`);
  }
}
