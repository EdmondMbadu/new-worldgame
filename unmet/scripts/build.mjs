// Builds the standalone /unmet page into unmet/dist.
//
//   npm run unmet:build                     real data (fetches it first if missing)
//   node unmet/scripts/build.mjs --dev      real data if there is any, else sample data with a warning
//   node unmet/scripts/build.mjs --sample   invented sample data, for development
//
// It uses the esbuild that Angular already installs, and nothing else. The
// Angular app never imports this page; angular.json copies unmet/dist as-is.
import { build, transform } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = fileURLToPath(new URL('../', import.meta.url));
const at = (...p) => path.join(here, ...p);
const BASE = '/unmet';
const gslLogo = at('../src/assets/img/gsl-logo.png');

function walk(dir) {
  return readdirSync(dir).sort().flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const isSample = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')).meta.sample !== false; } catch { return true; } };

/** Picks the data file to ship. Real numbers, unless --sample was asked for. */
function dataFile(sample, dev) {
  const snapshot = at('data/unmet.json');
  if (dev && !sample && (!existsSync(snapshot) || isSample(snapshot))) {
    console.warn('Unmet: no real data snapshot yet, so this local build uses INVENTED sample data. Run "npm run unmet:data" to fetch the real numbers.');
    sample = true;
  }
  if (sample) {
    if (!existsSync(at('data/sample.json'))) spawnSync(process.execPath, [at('scripts/make-sample-data.mjs')], { stdio: 'inherit' });
    return at('data/sample.json');
  }
  const real = at('data/unmet.json');
  if (!existsSync(real) || isSample(real)) {
    console.log('Unmet: no data snapshot yet, fetching it from the World Bank…');
    spawnSync(process.execPath, [at('scripts/fetch-data.mjs')], { stdio: 'inherit' });
  }
  if (!existsSync(real) || isSample(real)) {
    console.error('\nUnmet has no real data to ship.\nRun "npm run unmet:data" with an internet connection, then build again.\n(For local development only: node unmet/scripts/build.mjs --sample)\n');
    process.exit(1);
  }
  return real;
}

export async function buildUnmet({ sample = false, dev = false, quiet = false } = {}) {
  const data = dataFile(sample, dev);
  sample = isSample(data);
  const dist = at('dist');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });

  // Everything that is not code lives under one content-hashed folder, so it
  // can be cached forever and a data refresh simply gets a new folder name.
  const statics = [...walk(at('data/geo')), ...walk(at('public')), data, gslLogo];
  const hash = createHash('sha256');
  for (const f of statics) hash.update(path.relative(here, f)).update(readFileSync(f));
  const S = `${BASE}/s-${hash.digest('hex').slice(0, 10)}`;
  const sdir = path.join(dist, S.slice(BASE.length + 1));
  cpSync(at('data/geo'), path.join(sdir, 'geo'), { recursive: true, filter: (f) => !f.endsWith('outlines.json') });
  mkdirSync(path.join(sdir, 'geo/outlines'), { recursive: true });
  for (const [id, d] of Object.entries(JSON.parse(readFileSync(at('data/geo/outlines.json'), 'utf8')))) writeFileSync(path.join(sdir, 'geo/outlines', `${id}.txt`), d);
  cpSync(at('public'), sdir, { recursive: true });
  cpSync(data, path.join(sdir, 'data.json'));
  cpSync(gslLogo, path.join(sdir, 'gsl-logo.png'));

  const result = await build({
    entryPoints: [at('src/main.js')],
    bundle: true,
    format: 'esm',
    minify: true,
    target: 'es2020',
    outdir: path.join(dist, 'assets'),
    entryNames: 'unmet-[hash]',
    legalComments: 'none',
    metafile: true,
    logLevel: 'warning',
  });
  const js = `${BASE}/assets/${path.basename(Object.keys(result.metafile.outputs).find((f) => f.endsWith('.js')))}`;
  const css = (await transform(readFileSync(at('src/styles.css'), 'utf8').replaceAll('%S%', S), { loader: 'css', minify: true })).code.trim();
  const html = readFileSync(at('index.html'), 'utf8')
    .replaceAll('%S%', S)
    .replaceAll('%JS%', js)
    .replace('%CSS%', () => css)
    .replace('%CONFIG%', JSON.stringify({ s: S, data: 'data.json' }));
  writeFileSync(path.join(dist, 'index.html'), html);

  if (!quiet) {
    const gz = (f) => (gzipSync(readFileSync(f)).byteLength / 1024).toFixed(1);
    const kb = (f) => (statSync(f).size / 1024).toFixed(1);
    console.log(`Unmet built${sample ? ' WITH SAMPLE DATA (not for deployment)' : ''}:`);
    console.log(`  page   ${gz(path.join(dist, 'index.html'))} KiB gzip (HTML + all CSS)`);
    console.log(`  script ${gz(path.join(dist, js.slice(BASE.length)))} KiB gzip`);
    console.log(`  data   ${gz(path.join(sdir, 'data.json'))} KiB gzip · map ${gz(path.join(sdir, 'geo/map.json'))} KiB gzip · dots ${kb(path.join(sdir, 'geo/dots-l.land.bin'))} + ${kb(path.join(sdir, 'geo/dots-l.xy.bin'))} KiB (desktop), ${kb(path.join(sdir, 'geo/dots-s.land.bin'))} + ${kb(path.join(sdir, 'geo/dots-s.xy.bin'))} KiB (phone)`);
  }
  return { dist, sample };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildUnmet({ sample: process.argv.includes('--sample'), dev: process.argv.includes('--dev') });
}
