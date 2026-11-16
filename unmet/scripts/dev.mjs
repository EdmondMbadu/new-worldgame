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
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.txt': 'text/plain', '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.png': 'image/png' };

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
  // On the deployed site Firebase Hosting sends /play and /play/CODE to the game; do the same here.
  const short = url.match(/^\/play(?:\/([A-Za-z]{4}))?\/?$/);
  if (short) return res.writeHead(302, { location: `/unmet/play/${short[1] || ''}` }).end();
  // /unmet/play/KXPT is a room link: the game page reads the code from the address.
  let file = path.join(here, 'dist', url.replace(/^\/unmet\/?/, '').replace(/^play\/[A-Za-z]{4}\/?$/, 'play/'));
  if (!url.startsWith('/unmet') || !file.startsWith(path.join(here, 'dist'))) return res.writeHead(404).end('Not found');
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end('Not found');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' }).end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Unmet preview: http://localhost:${port}/unmet/${sample ? '  (sample data)' : ''}\nGame preview:  http://localhost:${port}/unmet/play/?mock  (rooms stay in this browser; drop ?mock to use the real back end)`));
