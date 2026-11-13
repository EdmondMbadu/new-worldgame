// Local preview: builds, serves http://localhost:5176/unmet/ and rebuilds
// when a source file changes.
//
//   npm run unmet:dev            real data
//   npm run unmet:dev -- --sample   invented sample data
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, watch } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildUnmet } from './build.mjs';

const here = fileURLToPath(new URL('../', import.meta.url));
const sample = process.argv.includes('--sample');
const port = Number(process.env.PORT) || 5176;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain', '.woff2': 'font/woff2', '.bin': 'application/octet-stream' };

await buildUnmet({ sample });
let timer;
for (const dir of ['src', 'index.html']) {
  watch(path.join(here, dir), { recursive: dir === 'src' }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => buildUnmet({ sample, quiet: true }).then(() => console.log('rebuilt'), (e) => console.error(e.message)), 80);
  });
}
createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url === '/') return res.writeHead(302, { location: '/unmet/' }).end();
  let file = path.join(here, 'dist', url.replace(/^\/unmet\/?/, ''));
  if (!url.startsWith('/unmet') || !file.startsWith(path.join(here, 'dist'))) return res.writeHead(404).end('Not found');
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end('Not found');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Unmet preview: http://localhost:${port}/unmet/${sample ? '  (sample data)' : ''}`));
