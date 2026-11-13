// Pulls the twelve indicators from the World Bank's open data API and writes
// one compact snapshot the page can load in a single request.
//
//   npm run unmet:data          (or: node unmet/scripts/fetch-data.mjs)
//
// The snapshot is committed, so the site never calls the API while a visitor
// waits. Run this whenever you want fresher numbers; the World Bank updates
// most of these series once or twice a year.
//
// Data: World Bank, World Development Indicators. Licence CC BY 4.0.
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { NEEDS, POPULATION_CODE, FIRST_YEAR, STALE_AFTER } from '../src/needs.js';

const API = process.env.UNMET_WB_API || 'https://api.worldbank.org/v2';
const target = process.env.UNMET_DATA_OUT || fileURLToPath(new URL('../data/unmet.json', import.meta.url));
const POP_FROM = 2008;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The World Bank API sometimes stalls on a request and answers at once when
// asked again, so give up on a slow one quickly, say so, and retry.
async function get(url, tries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25_000), headers: { accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (!Array.isArray(body) || body[0]?.message) {
        const reason = body?.[0]?.message?.[0]?.value || 'unexpected response';
        throw Object.assign(new Error(reason), { permanent: true });
      }
      return body;
    } catch (error) {
      lastError = error;
      if (error.permanent) break;
      const why = error.name === 'TimeoutError' ? 'no answer after 25 s' : error.message;
      if (attempt < tries) console.log(`    … ${new URL(url).pathname.split('/').pop()}: ${why}; trying again (${attempt + 1} of ${tries})`);
      await sleep(600 * attempt);
    }
  }
  throw new Error(`${new URL(url).pathname}: ${lastError?.name === 'TimeoutError' ? 'the World Bank API did not answer' : lastError?.message || lastError}`);
}

/** Every row of one indicator, for every country and year, across all pages. */
async function rows(code) {
  const all = [];
  let updated = '';
  for (let page = 1, pages = 1; page <= pages; page++) {
    const [meta, data] = await get(`${API}/country/all/indicator/${code}?format=json&per_page=20000&date=${FIRST_YEAR}:2100&page=${page}`);
    pages = meta.pages || 1;
    updated = meta.lastupdated || updated;
    all.push(...(data || []));
  }
  return { all, updated };
}

const round1 = (v) => Math.round(v * 10) / 10;

/** rows -> { A3: [v(y0), v(y0+1), ...] } with nulls for missing years. */
function toSeries(all, y0, keep, transform = round1) {
  const out = {};
  let last = y0;
  for (const row of all) {
    const id = row.countryiso3code;
    const year = +row.date;
    if (!id || !keep.has(id) || row.value == null || !(year >= y0)) continue;
    (out[id] ||= [])[year - y0] = transform(row.value);
    if (year > last) last = year;
  }
  for (const id of Object.keys(out)) out[id] = Array.from(out[id], (v) => (v == null ? null : v));
  return { y0, y1: last, v: out };
}

async function main() {
  console.log('Unmet · fetching from the World Bank…');
  const [, list] = await get(`${API}/country?format=json&per_page=400`);
  const countries = {};
  for (const c of list) {
    if (!c.id || c.region?.value === 'Aggregates') continue;
    countries[c.id] = { n: c.name, r: c.region?.id || '', inc: c.incomeLevel?.id || '' };
  }
  const keep = new Set([...Object.keys(countries), 'WLD']);
  if (keep.size < 180) throw new Error(`Only ${keep.size} countries came back; refusing to continue.`);

  const needs = {};
  const series = {};
  let updated = '';
  for (const need of NEEDS) {
    try {
      const [[, info], data] = await Promise.all([get(`${API}/indicator/${need.code}?format=json`), rows(need.code)]);
      const s = toSeries(data.all, FIRST_YEAR, keep);
      const recent = Object.entries(s.v).filter(([id, v]) => id !== 'WLD' && v.slice(Math.max(0, s.y1 - STALE_AFTER - FIRST_YEAR)).some((x) => x != null)).length;
      if (recent < 60) throw new Error(`only ${recent} countries have a recent reading`);
      series[need.id] = s;
      const name = info?.[0]?.name || need.code;
      needs[need.id] = { code: need.code, name, org: (info?.[0]?.sourceOrganization || '').split(/[.;]/)[0].slice(0, 160) };
      const line = name.match(/\$(\d+(?:\.\d+)?)/);
      if (need.id === 'poverty' && line) needs[need.id].line = line[1];
      if (data.updated > updated) updated = data.updated;
      console.log(`  ${need.id.padEnd(12)} ${String(recent).padStart(3)} countries with a reading since ${s.y1 - STALE_AFTER} · latest ${s.y1} · ${name}`);
    } catch (error) {
      // One retired or renamed indicator must not sink the other eleven.
      console.warn(`  ${need.id.padEnd(12)} SKIPPED — ${error.message}`);
    }
    await sleep(250); // be a polite client
  }
  const got = Object.keys(series).length;
  if (got < 8 || !series.electricity) throw new Error(`Only ${got} of ${NEEDS.length} indicators loaded; keeping the existing snapshot.`);

  const pop = toSeries((await rows(POPULATION_CODE)).all, POP_FROM, keep, (v) => Math.round(v / 1000));
  if (Object.keys(pop.v).length < 180) throw new Error('Population series is incomplete; keeping the existing snapshot.');

  const snapshot = {
    meta: {
      fetched: new Date().toISOString(),
      updated,
      source: 'World Bank · World Development Indicators',
      licence: 'CC BY 4.0',
      sample: false,
    },
    needs,
    countries,
    pop,
    series,
  };
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target + '.tmp', JSON.stringify(snapshot));
  renameSync(target + '.tmp', target);
  console.log(`Wrote ${path.relative(process.cwd(), target)} · ${got} needs · ${Object.keys(countries).length} countries · World Bank data last updated ${updated || 'unknown'}.`);
  if (got < NEEDS.length) console.log('Some indicators were skipped (see above). The page shows the needs that loaded; run this again later to pick up the rest.');
}

main().catch((error) => {
  console.error(`\nUnmet data fetch failed:\n  ${error.message}\n`);
  process.exit(1);
});
