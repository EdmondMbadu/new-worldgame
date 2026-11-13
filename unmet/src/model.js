// The reasoning behind every label on the page. Pure functions over the data
// snapshot: no DOM, no network, so it is tested directly in Node.
import { NEEDS, needById, STALE_AFTER, PACE_WINDOW, HORIZON } from './needs.js';

/** How far a reading is from "everyone": larger is worse, in the need's unit. */
export const shortfall = (need, value) => (need.kind === 'access' ? 100 - value : value);
/** The shortfall at which we call the need met. */
export const goalShortfall = (need) => (need.kind === 'access' ? 100 - need.goal : need.goal);

/** The needs this snapshot actually contains, in display order. */
export const needsIn = (data) => NEEDS.filter((n) => data.series[n.id]);

/** [[year, value], ...] for one need in one country, oldest first. */
export function readings(data, needId, id) {
  const s = data.series[needId];
  const v = s?.v[id];
  if (!v) return [];
  const out = [];
  for (let i = 0; i < v.length; i++) if (v[i] != null) out.push([s.y0 + i, v[i]]);
  return out;
}

export function populationAt(data, id, year) {
  const v = data.pop?.v[id];
  if (!v) return null;
  const i = Math.min(v.length - 1, Math.max(0, year - data.pop.y0));
  for (let k = i; k >= 0; k--) if (v[k] != null) return v[k] * 1000;
  return null;
}

/** Least-squares slope of shortfall per year. Null when there is no trend to read. */
function slope(points) {
  if (points.length < 2 || points[points.length - 1][0] - points[0][0] < 3) return null;
  const n = points.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of points) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const d = n * sxx - sx * sx;
  return d === 0 ? null : (n * sxy - sx * sy) / d;
}

/**
 * Where one need stands in one country.
 *   state   met | closing | stuck | none      (the four labels)
 *   reason  why, in one word: met, closing, backwards, flat, century, few,
 *           stale (last reading too old), never (no reading at all)
 */
export function assess(data, needId, id, thisYear = new Date().getFullYear()) {
  const need = needById[needId];
  const s = data.series[needId];
  const points = readings(data, needId, id);
  const base = { need: needId, id, points, state: 'none', reason: 'never', year: null, value: null, short: null, people: null, pace: null, arrival: null, since: null };
  if (!s || !points.length) return base;
  const [year, value] = points[points.length - 1];
  if (year < s.y1 - STALE_AFTER) return { ...base, reason: 'stale', year, value };

  const short = shortfall(need, value);
  const goal = goalShortfall(need);
  const head = need.base === 'population' ? populationAt(data, id, year) : null;
  const people = head != null && short > goal ? Math.round((head * short) / 100) : null;
  const out = { ...base, year, value, short, people };

  if (short <= goal) {
    // Walk back to the first year of the current unbroken run at the goal.
    let k = points.length - 1;
    while (k > 0 && shortfall(need, points[k - 1][1]) <= goal) k--;
    return { ...out, state: 'met', reason: 'met', people: null, since: k > 0 ? points[k][0] : null };
  }

  const window = points.filter(([y]) => y >= year - PACE_WINDOW).map(([y, v]) => [y, shortfall(need, v)]);
  const m = slope(window);
  if (m == null) return { ...out, state: 'stuck', reason: 'few' };
  const pace = -m; // positive: the gap is closing
  if (pace <= 0.01) return { ...out, state: 'stuck', reason: pace < -0.05 ? 'backwards' : 'flat', pace };
  const raw = Math.ceil(year + (short - goal) / pace);
  if (raw > HORIZON) return { ...out, state: 'stuck', reason: 'century', pace, arrival: raw };
  return { ...out, state: 'closing', reason: 'closing', pace, arrival: Math.max(raw, thisYear), due: raw < thisYear };
}

/** All needs for one country, plus the counts behind the headline. */
export function summarize(data, id, thisYear) {
  const list = needsIn(data).map((n) => assess(data, n.id, id, thisYear));
  const count = (state) => list.filter((a) => a.state === state).length;
  const met = count('met'), closing = count('closing'), stuck = count('stuck'), none = count('none');
  return { id, list, total: list.length, met, closing, stuck, none, unmet: closing + stuck, measured: list.length - none, known: !!data.countries[id] };
}

/**
 * "It has been done": countries that once stood where this one stands now
 * (or worse) and went on to meet the need. Fastest first. If too few made it
 * all the way, the list is topped up with the countries that climbed furthest.
 */
export function peers(data, needId, id, limit = 3) {
  const need = needById[needId];
  const mine = assess(data, needId, id);
  if (mine.short == null || mine.state === 'met') return [];
  const goal = goalShortfall(need);
  const reached = [], climbed = [];
  for (const other of Object.keys(data.series[needId].v)) {
    if (other === id || other === 'WLD' || !data.countries[other]) continue;
    const head = populationAt(data, other, data.pop.y1);
    if (head != null && head < 300_000) continue; // keep the examples recognisable
    const pts = readings(data, needId, other);
    let a = -1;
    for (let k = pts.length - 1; k >= 0; k--) if (shortfall(need, pts[k][1]) >= mine.short) { a = k; break; }
    if (a < 0 || a === pts.length - 1) continue;
    const from = { fromYear: pts[a][0], fromValue: pts[a][1] };
    const b = pts.findIndex(([, v], k) => k > a && shortfall(need, v) <= goal);
    if (b > 0) reached.push({ id: other, ...from, toYear: pts[b][0], toValue: pts[b][1], years: pts[b][0] - pts[a][0], reached: true });
    else {
      const last = pts[pts.length - 1];
      const gain = shortfall(need, pts[a][1]) - shortfall(need, last[1]);
      if (gain > 0) climbed.push({ id: other, ...from, toYear: last[0], toValue: last[1], years: last[0] - pts[a][0], reached: false, gain });
    }
  }
  reached.sort((x, y) => x.years - y.years || x.id.localeCompare(y.id));
  climbed.sort((x, y) => y.gain - x.gain || x.id.localeCompare(y.id));
  return [...reached, ...climbed].slice(0, limit);
}

/**
 * One number per country for colouring the map, 0 (met) to 1 (furthest from
 * met); null where nothing is measured. With no need chosen it is the share
 * of measured needs that are unmet.
 */
export function lens(data, needId, thisYear) {
  const out = {};
  for (const id of Object.keys(data.countries)) {
    if (!needId) {
      const s = summarize(data, id, thisYear);
      out[id] = s.measured ? s.unmet / s.measured : null;
      continue;
    }
    const a = assess(data, needId, id, thisYear);
    if (a.state === 'none') { out[id] = null; continue; }
    if (a.state === 'met') { out[id] = 0; continue; }
    const need = needById[needId];
    const scale = need.kind === 'rate' ? 120 : 80;
    out[id] = Math.min(1, 0.12 + (0.88 * (a.short - goalShortfall(need))) / scale);
  }
  return out;
}

/** The world's own line for one need, when the snapshot carries it. */
export function world(data, needId, thisYear) {
  return data.series[needId]?.v.WLD ? assess(data, needId, 'WLD', thisYear) : null;
}

// ---- formatting ----
const nf = (lang, opts) => new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', opts);
/** 83,214,000 -> "83.2 million" / "83,2 millions". Never more precise than the data. */
export function people(n, lang = 'en') {
  if (n == null) return '';
  const fr = lang === 'fr';
  if (n >= 1e9) return `${nf(lang, { maximumFractionDigits: 2 }).format(n / 1e9)} ${fr ? (n >= 2e9 ? 'milliards' : 'milliard') : 'billion'}`;
  if (n >= 1e6) return `${nf(lang, { maximumFractionDigits: n >= 1e7 ? 0 : 1 }).format(n / 1e6)} ${fr ? (n >= 2e6 ? 'millions' : 'million') : 'million'}`;
  if (n >= 1e4) return nf(lang).format(Math.round(n / 1000) * 1000);
  return nf(lang).format(Math.round(n / 100) * 100);
}
export const number = (v, lang = 'en', digits = 1) => nf(lang, { maximumFractionDigits: digits }).format(v);
/** Percentages keep one decimal only where it carries information. */
export const percent = (v, lang = 'en') => `${number(v, lang, v < 10 || v > 90 ? 1 : 0)}${lang === 'fr' ? ' %' : '%'}`;
