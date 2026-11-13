// Writes unmet/data/sample.json: INVENTED numbers in the real snapshot's
// shape, for development and tests only. The page shows a "sample data"
// banner when it loads this file, and production builds refuse to ship it.
//
//   node unmet/scripts/make-sample-data.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NEEDS, FIRST_YEAR } from '../src/needs.js';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const map = JSON.parse(readFileSync(here('../data/geo/map.json'), 'utf8'));
const LAST = 2023;
const skip = new Set(['ATA', 'ESH', 'TWN', 'ATF', 'FLK', 'SGS', 'HMD', 'IOT']);

// Small deterministic generator so the file is identical on every run.
let seed = 20261113;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round1 = (v) => Math.round(v * 10) / 10;

const countries = {}, pop = {}, series = {};
for (const need of NEEDS) series[need.id] = { y0: FIRST_YEAR, y1: LAST, v: {} };
const years = LAST - FIRST_YEAR + 1;

for (const c of map.countries) {
  if (skip.has(c.id)) continue;
  // A rough "how far along" level: lower in the tropics, with noise.
  const level = clamp(0.25 + Math.abs(c.lat) / 70 + (rand() - 0.5) * 0.45, 0.03, 1);
  countries[c.id] = { n: c.name, r: '', inc: level > 0.75 ? 'HIC' : level > 0.5 ? 'UMC' : level > 0.3 ? 'LMC' : 'LIC' };
  const people = Math.round(10 ** (2.5 + rand() * 2.6));
  pop[c.id] = Array.from({ length: LAST - 2008 + 1 }, (_, i) => Math.round(people * (1 + 0.018 * (i - 15))));
  for (const need of NEEDS) {
    const sparse = ['poverty', 'account', 'birth', 'school'].includes(need.id);
    if (rand() < (sparse ? 0.12 : 0.03)) continue; // never reported
    const end = clamp(level * 100 + (rand() - 0.35) * 45, 4, 100);
    const pace = rand() < 0.14 ? -(rand() * 0.5) : rand() * 2.6; // points a year; some go backwards
    const stopsAt = rand() < 0.06 ? LAST - 12 - Math.floor(rand() * 8) : LAST - Math.floor(rand() * 3);
    const out = [];
    for (let i = 0; i < years; i++) {
      const year = FIRST_YEAR + i;
      if (year > stopsAt || (sparse && (year + c.id.charCodeAt(0)) % 4 !== 0) || year < 1995 + Math.floor(rand() * 2)) { out.push(null); continue; }
      const met = clamp(end - pace * (stopsAt - year) + (rand() - 0.5) * 0.8, 1, 100);
      const value = need.kind === 'access' ? met : need.kind === 'lack' ? Math.max(need.id === 'food' ? 2.5 : 0, 100 - met) : Math.max(2, (100 - met) * 1.9);
      out.push(round1(value));
    }
    while (out.length && out[out.length - 1] == null) out.pop();
    if (out.some((v) => v != null)) series[need.id].v[c.id] = out;
  }
}
for (const need of NEEDS) {
  const world = [];
  for (let i = 0; i < years; i++) {
    const vals = Object.values(series[need.id].v).map((v) => v[i]).filter((v) => v != null);
    world.push(vals.length > 20 ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null);
  }
  series[need.id].v.WLD = world;
}
pop.WLD = Array.from({ length: LAST - 2008 + 1 }, (_, i) => Object.values(pop).reduce((a, v) => a + (v[i] || 0), 0));

const needs = Object.fromEntries(NEEDS.map((n) => [n.id, { code: n.code, name: `Sample series for ${n.id}`, org: 'Invented for development' }]));
needs.poverty.line = '3.00';
writeFileSync(here('../data/sample.json'), JSON.stringify({
  meta: { fetched: '2026-11-13T00:00:00.000Z', updated: '', source: 'SAMPLE DATA · invented numbers', licence: '', sample: true },
  needs, countries, pop: { y0: 2008, y1: LAST, v: pop }, series,
}));
console.log(`sample.json: ${Object.keys(countries).length} countries of invented data`);
