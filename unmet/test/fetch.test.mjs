// Runs the real fetch script against a stand-in for the World Bank API, so a
// change in how we read its responses is caught without touching the network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NEEDS } from '../src/needs.js';

const script = fileURLToPath(new URL('../scripts/fetch-data.mjs', import.meta.url));
const ids = Array.from({ length: 200 }, (_, i) => 'C' + String(i).padStart(2, '0').slice(-2) + String.fromCharCode(65 + (i % 26)) + i).map((s) => s.slice(0, 3) + s.slice(3));
const countries = [
  ...ids.map((id) => ({ id, iso2Code: id.slice(0, 2), name: `Country ${id}`, region: { id: 'SSF', value: 'Sub-Saharan Africa' }, incomeLevel: { id: 'LIC' } })),
  { id: 'WLD', iso2Code: '1W', name: 'World', region: { id: 'NA', value: 'Aggregates' }, incomeLevel: { id: 'NA' } },
];

function serve(broken) {
  return createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const send = (body) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.pathname === '/country') return send([{ page: 1, pages: 1 }, countries]);
    const meta = url.pathname.match(/^\/indicator\/(.+)$/);
    if (meta) return send([{ page: 1 }, [{ id: meta[1], name: meta[1] === 'SI.POV.DDAY' ? 'Poverty headcount ratio at $3.00 a day (2021 PPP) (% of population)' : `Name of ${meta[1]}`, sourceOrganization: 'Test org. Second sentence.' }]]);
    const code = url.pathname.match(/^\/country\/all\/indicator\/(.+)$/)?.[1];
    if (!code) { res.writeHead(404); return res.end(); }
    if (code === broken) return send([{ message: [{ id: '120', key: 'Invalid value', value: 'The provided parameter value is not valid' }] }]);
    // Two pages, newest first like the real API, with gaps (null) and an aggregate row.
    const page = +url.searchParams.get('page') || 1;
    const rows = [];
    for (const id of page === 1 ? [...ids.slice(0, 100), 'WLD'] : ids.slice(100))
      for (let year = 2023; year >= 2019; year--)
        rows.push({ countryiso3code: id, date: String(year), value: year === 2021 ? null : code === 'SP.POP.TOTL' ? 1_234_567 : 50 + (year - 2019) + 0.04 });
    send([{ page, pages: 2, lastupdated: '2026-07-01' }, rows]);
  });
}

async function run(broken) {
  const server = serve(broken);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const out = path.join(mkdtempSync(path.join(tmpdir(), 'unmet-')), 'unmet.json');
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, [script], { env: { ...process.env, UNMET_WB_API: `http://127.0.0.1:${server.address().port}`, UNMET_DATA_OUT: out } });
  let log = '';
  child.stdout.on('data', (d) => (log += d)); child.stderr.on('data', (d) => (log += d));
  const status = await new Promise((r) => child.on('exit', r));
  server.close();
  return { status, log, out };
}

test('writes a complete snapshot from paged World Bank responses', async () => {
  const { status, log, out } = await run();
  assert.equal(status, 0, log);
  const snap = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(snap.meta.sample, false);
  assert.equal(snap.meta.updated, '2026-07-01');
  assert.equal(Object.keys(snap.series).length, NEEDS.length);
  assert.equal(Object.keys(snap.countries).length, 200); // the aggregate is not a country
  const s = snap.series.electricity;
  assert.equal(s.y0, 1990);
  assert.equal(s.y1, 2023);
  const row = s.v[ids[150]]; // from the second page
  assert.equal(row.length, 2023 - 1990 + 1);
  assert.deepEqual(row.slice(-5), [50, 51, null, 53, 54]); // rounded to one decimal, gap kept as null
  assert.ok(s.v.WLD, 'keeps the world line');
  assert.equal(snap.pop.v[ids[0]].at(-1), 1235); // thousands
  assert.equal(snap.needs.poverty.line, '3.00');
  assert.equal(snap.needs.electricity.org, 'Test org');
});

test('one retired indicator is skipped, not fatal', async () => {
  const { status, log, out } = await run('IT.NET.USER.ZS');
  assert.equal(status, 0, log);
  const snap = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(snap.series.internet, undefined);
  assert.equal(Object.keys(snap.series).length, NEEDS.length - 1);
  assert.match(log, /internet\s+SKIPPED/);
});

test('a broken core indicator leaves the existing snapshot untouched', async () => {
  const { status, out } = await run('EG.ELC.ACCS.ZS');
  assert.equal(status, 1);
  assert.equal(existsSync(out), false);
});
