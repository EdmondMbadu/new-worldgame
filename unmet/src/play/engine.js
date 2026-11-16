// The rules of the game, with no DOM and no network: which questions get
// asked, what the true answer is, how a guess scores, who wins which award.
// Everything is a pure function over the Unmet data snapshot, so it is tested
// directly in Node (test/play-engine.test.mjs) and gives the same game on
// every device that is handed the same seed.
import { NEEDS, needById } from '../needs.js';
import { readings, populationAt, assess } from '../model.js';

/** A reading older than this (against the newest year of its series) is not asked about. */
export const FRESH_YEARS = 6;
/** Points lost for every point a guess is away from the truth. */
export const SLOPE = 3;
export const MAX_POINTS = 100;
/** Within this many points counts as a bullseye. */
export const BULLSEYE = 1;
export const DAILY_ROUNDS = 5;
export const DAILY_EPOCH = Date.UTC(2026, 10, 16); // daily #1

// ---------- seeded randomness ----------
function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}
/** A repeatable random stream: the same seed always deals the same game. */
export function rng(seed) {
  let a = hash(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled(list, rand) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
/** Picks one item, favouring heavier ones. */
function weighted(list, weight, rand) {
  let total = 0;
  for (const x of list) total += weight(x);
  let r = rand() * total;
  for (const x of list) { r -= weight(x); if (r <= 0) return x; }
  return list[list.length - 1];
}

// ---------- which places and needs are in play ----------
const NORTH_AFRICA = ['DZA', 'EGY', 'LBY', 'MAR', 'TUN', 'DJI'];
const SOUTH_WEST_ASIA = ['AFG', 'PAK'];
/** World Bank regions grouped the way people say them out loud. */
export const REGIONS = {
  world: null,
  africa: (c, id) => c.r === 'SSF' || NORTH_AFRICA.includes(id),
  asia: (c, id) => c.r === 'EAS' || c.r === 'SAS' || SOUTH_WEST_ASIA.includes(id),
  americas: (c) => c.r === 'LCN' || c.r === 'NAC',
  europe: (c) => c.r === 'ECS',
  mena: (c) => c.r === 'MEA',
};
export const REGION_IDS = Object.keys(REGIONS);
export const TOPIC_IDS = NEEDS.map((n) => n.id);

/** Every need on one scale: the share of people for whom it is met (0–100). */
export const good = (need, value) => (need.kind === 'access' ? value : need.kind === 'lack' ? 100 - value : 100 - value / 10);

/** The latest usable reading for one need in one country, or null. */
export function latest(data, needId, id) {
  const s = data.series[needId];
  const pts = readings(data, needId, id);
  if (!s || !pts.length) return null;
  const [y, v] = pts[pts.length - 1];
  return y < s.y1 - FRESH_YEARS ? null : { y, v };
}

/**
 * Every (need, country) reading the game may ask about.
 *   known   ids of the countries the map can draw
 *   region  one of REGION_IDS
 *   topics  need ids to keep (empty or missing: all of them)
 */
export function buildPool(data, known, { region = 'world', topics = null } = {}) {
  const inRegion = REGIONS[region] || null;
  // Smaller regions need smaller countries to have enough to ask about.
  const minPop = inRegion ? 2e6 : 5e6;
  const keep = topics && topics.length ? new Set(topics) : null;
  const out = [];
  for (const need of NEEDS) {
    if (!data.series[need.id] || (keep && !keep.has(need.id))) continue;
    for (const id of Object.keys(data.series[need.id].v)) {
      const c = data.countries[id];
      if (!c || id === 'WLD' || !known.has(id) || (inRegion && !inRegion(c, id))) continue;
      const pop = populationAt(data, id, data.pop.y1);
      if (!pop || pop < minPop) continue;
      const r = latest(data, need.id, id);
      if (!r) continue;
      out.push({ need: need.id, id, v: r.v, y: r.y, pop, rich: c.inc === 'HIC' });
    }
  }
  return out;
}

// ---------- dealing a game ----------
/** The shape of a game: mostly "out of 100" rounds, a head-to-head every third round, the last one worth double. */
export function plan(rounds) {
  const out = [];
  for (let i = 0; i < rounds; i++) out.push({ t: i % 3 === 2 && i !== rounds - 1 ? 'duel' : 'pct', x2: i === rounds - 1 && rounds > 1 });
  return out;
}

// Answers are spread across the whole scale so no one can win by always guessing high.
const BUCKETS = [[1, 15], [15, 35], [35, 65], [65, 85], [85, 100.01]];
const askable = (e) => {
  const need = needById[e.need];
  if (need.kind === 'rate') return false; // per-1,000 rates only appear head-to-head
  if (e.need === 'food' && e.v <= 2.5) return false; // the FAO does not report below 2.5
  if (e.v < 1) return false;
  if (e.rich && good(need, e.v) >= 97) return false; // "100 out of 100 in a rich country" is no fun
  return true;
};

/**
 * Deals the questions for one game. Same data + same options = same game.
 * Each question is { t: 'pct', need, a, x2 } or { t: 'duel', need, a, b, x2 }.
 */
export function makeGame(data, known, { seed, rounds = 6, region = 'world', topics = null } = {}) {
  const rand = rng(seed);
  let pool = buildPool(data, known, { region, topics });
  if (pool.filter(askable).length < 4) pool = buildPool(data, known, { region }); // a topic filter too narrow to play
  if (pool.filter(askable).length < 4) pool = buildPool(data, known, {});
  const usedNeed = new Map(), usedPlace = new Set();
  const order = shuffled(BUCKETS, rand);
  const byPop = (e) => Math.sqrt(e.pop);
  const fresh = (list, strictNeed) => list.filter((e) => !usedPlace.has(e.id) && (!strictNeed || !usedNeed.has(e.need)));
  const least = (list) => { // when every need has been used, reuse the least-used ones first
    const min = Math.min(...list.map((e) => usedNeed.get(e.need) || 0));
    return list.filter((e) => (usedNeed.get(e.need) || 0) === min);
  };
  const take = (e) => { usedNeed.set(e.need, (usedNeed.get(e.need) || 0) + 1); usedPlace.add(e.id); };
  const out = [];
  let pctCount = 0;
  for (const slot of plan(rounds)) {
    if (slot.t === 'duel') {
      const duel = dealDuel(pool, rand, usedNeed, usedPlace);
      if (duel) { out.push({ ...duel, x2: slot.x2 }); continue; }
    }
    const [lo, hi] = order[pctCount++ % order.length];
    const all = pool.filter(askable);
    const inBucket = all.filter((e) => e.v >= lo && e.v < hi);
    let options = fresh(inBucket, true);
    if (!options.length) options = least(fresh(inBucket, false));
    if (!options.length) options = fresh(all, true);
    if (!options.length) options = least(fresh(all, false));
    if (!options.length) options = all;
    if (!options.length) break;
    const pick = weighted(options, byPop, rand);
    take(pick);
    out.push({ t: 'pct', need: pick.need, a: pick.id, x2: slot.x2 });
  }
  return out;
}

function dealDuel(pool, rand, usedNeed, usedPlace) {
  const needs = shuffled([...new Set(pool.map((e) => e.need))], rand).sort((p, q) => (usedNeed.get(p) || 0) - (usedNeed.get(q) || 0));
  for (const needId of needs) {
    const need = needById[needId];
    const list = pool.filter((e) => e.need === needId && !usedPlace.has(e.id));
    // Far enough apart to have a clear answer, close enough to be a real question.
    const [min, max] = need.kind === 'rate' ? [1.5, 9] : [6, 40];
    for (let tries = 0; tries < 24 && list.length > 1; tries++) {
      const a = weighted(list, (e) => Math.sqrt(e.pop), rand);
      const rivals = list.filter((e) => e.id !== a.id && Math.abs(good(need, e.v) - good(need, a.v)) >= min && Math.abs(good(need, e.v) - good(need, a.v)) <= max);
      if (!rivals.length) continue;
      const b = weighted(rivals, (e) => Math.sqrt(e.pop), rand);
      usedNeed.set(needId, (usedNeed.get(needId) || 0) + 1); usedPlace.add(a.id); usedPlace.add(b.id);
      return { t: 'duel', need: needId, a: a.id, b: b.id };
    }
  }
  return null;
}

// ---------- the truth ----------
/**
 * The answer to a question, read from the data.
 *   pct   { v, raw, y, people, pace }   v is the whole number shown and scored against;
 *                                 people is how many lack the need, when it can be counted
 *   duel  { a: { v, y }, b: { v, y }, right: 'a' | 'b' }   v is the indicator's own value
 */
export function truth(data, q) {
  const need = needById[q.need];
  if (q.t === 'duel') {
    const a = latest(data, q.need, q.a), b = latest(data, q.need, q.b);
    if (!a || !b) return null;
    return { a, b, right: good(need, a.v) >= good(need, b.v) ? 'a' : 'b' };
  }
  const r = latest(data, q.need, q.a);
  if (!r) return null;
  const head = need.base === 'population' ? populationAt(data, q.a, r.y) : null;
  const lacking = need.kind === 'access' ? 100 - r.v : r.v;
  // Where the need is heading, in the words Unmet uses ("On pace for 2041", "Going backwards"...).
  const a = assess(data, q.need, q.a);
  const pace = { r: a.reason };
  for (const k of ['arrival', 'since', 'due', 'year']) if (a[k]) pace[k] = a[k];
  return { v: Math.round(r.v), raw: r.v, y: r.y, people: head != null ? Math.round((head * lacking) / 100) : null, pace };
}

/** What a head-to-head shows for one side: "962 of 1,000" or "76 of 100", always the good direction. */
export function duelFigure(needId, value) {
  const need = needById[needId];
  return need.kind === 'rate' ? { n: Math.round(1000 - value), of: 1000 } : { n: Math.round(good(need, value)), of: 100 };
}

// ---------- scoring ----------
export const scorePct = (guess, v) => Math.max(0, Math.round(MAX_POINTS - SLOPE * Math.abs(guess - v)));
export const scoreDuel = (pick, right) => (pick === right ? MAX_POINTS : 0);
/** Points for one answer; null guess scores nothing. */
export function score(q, guess, t) {
  if (guess == null || !t) return 0;
  return (q.t === 'duel' ? scoreDuel(guess, t.right) : scorePct(guess, t.v)) * (q.x2 ? 2 : 1);
}
export const maxScore = (q) => MAX_POINTS * (q.x2 ? 2 : 1);
export const totalMax = (questions) => questions.reduce((sum, q) => sum + maxScore(q), 0);

/**
 * How rosy a guess was: positive means the player pictured things better
 * than they are, negative means worse. Only "out of 100" rounds count.
 */
export function rosy(q, guess, t) {
  if (q.t !== 'pct' || guess == null || !t) return null;
  return (guess - t.v) * (needById[q.need].kind === 'access' ? 1 : -1);
}
export const WORLDVIEW_BAND = 6;
/** { kind: 'optimist' | 'pessimist' | 'realist', by } from a running sum and count of rosy(). */
export function worldview(sum, count) {
  if (!count) return null;
  const mean = sum / count;
  return { kind: mean > WORLDVIEW_BAND ? 'optimist' : mean < -WORLDVIEW_BAND ? 'pessimist' : 'realist', by: Math.round(Math.abs(mean)), mean };
}

/**
 * Folds one round into the running scores.
 *   scores   { uid: { s, d, n, o, c, b, r, p } } (may be empty)
 *   guesses  { uid: { v } }
 * Returns new scores for everyone in `uids`, ranked.
 *   s total · d points this round · n answers given · o, c rosy sum and count
 *   b best (smallest) miss on an "out of 100" round · r rank · p rank before this round
 */
export function tally(scores, uids, q, guesses, t) {
  const next = {};
  for (const uid of uids) {
    const was = scores?.[uid] || { s: 0, n: 0, o: 0, c: 0 };
    const g = guesses?.[uid]?.v;
    const d = score(q, g, t);
    const row = { s: (was.s || 0) + d, d, n: (was.n || 0) + (g == null ? 0 : 1), o: was.o || 0, c: was.c || 0, p: was.r || 0 };
    if (was.b != null) row.b = was.b;
    const tilt = rosy(q, g, t);
    if (tilt != null) {
      row.o += tilt; row.c += 1;
      const miss = Math.abs(g - t.v);
      if (row.b == null || miss < row.b) row.b = miss;
    }
    next[uid] = row;
  }
  for (const [uid, r] of Object.entries(ranks(next))) next[uid].r = r;
  return next;
}

/** { uid: rank } with ties sharing a rank (1, 2, 2, 4). */
export function ranks(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1].s - a[1].s);
  const out = {};
  let rank = 0, last = null;
  sorted.forEach(([uid, row], i) => { if (row.s !== last) { rank = i + 1; last = row.s; } out[uid] = rank; });
  return out;
}

/** Leaderboard rows, best first; names come from the players list. */
export function board(scores, players) {
  return Object.entries(scores || {})
    .filter(([uid]) => players?.[uid])
    .map(([uid, row]) => ({ uid, name: players[uid].name, ...row }))
    .sort((a, b) => b.s - a.s || a.name.localeCompare(b.name));
}

/** What one round looked like across the room, for the reveal. */
export function roundSummary(q, guesses, t, uids) {
  const given = uids.map((uid) => [uid, guesses?.[uid]?.v]).filter(([, v]) => v != null);
  if (q.t === 'duel') return { n: given.length, ok: given.filter(([, v]) => v === t.right).length };
  const values = given.map(([, v]) => v);
  const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
  const top = given.map(([uid, v]) => [uid, Math.abs(v - t.v)]).sort((a, b) => a[1] - b[1]).slice(0, 3).map(([uid]) => uid);
  return { n: given.length, avg, top };
}

/** End-of-game awards, each given only when someone has clearly earned it. */
export function awards(scores, players) {
  const rows = board(scores, players);
  const out = {};
  const sharp = rows.filter((r) => r.b != null).sort((a, b) => a.b - b.b || b.s - a.s)[0];
  if (sharp) out.sharp = { uid: sharp.uid, name: sharp.name, by: sharp.b };
  const tilted = rows.filter((r) => r.c >= 2).map((r) => ({ ...r, mean: r.o / r.c }));
  const sunny = [...tilted].sort((a, b) => b.mean - a.mean)[0];
  const cloudy = [...tilted].sort((a, b) => a.mean - b.mean)[0];
  if (sunny && sunny.mean > WORLDVIEW_BAND) out.optimist = { uid: sunny.uid, name: sunny.name, by: Math.round(sunny.mean) };
  if (cloudy && cloudy.mean < -WORLDVIEW_BAND && cloudy.uid !== sunny?.uid) out.pessimist = { uid: cloudy.uid, name: cloudy.name, by: Math.round(-cloudy.mean) };
  const sum = tilted.reduce((a, r) => a + r.o, 0), count = tilted.reduce((a, r) => a + r.c, 0);
  out.room = worldview(sum, count);
  return out;
}

// ---------- the daily game ----------
const DAY = 86400000;
/** The UTC date a daily game belongs to, as YYYY-MM-DD. */
export const dayKey = (when = Date.now()) => new Date(when).toISOString().slice(0, 10);
export const dayNumber = (when = Date.now()) => Math.floor((Date.parse(dayKey(when)) - DAILY_EPOCH) / DAY) + 1;
export const dailyGame = (data, known, when = Date.now()) => makeGame(data, known, { seed: `daily:${dayKey(when)}`, rounds: DAILY_ROUNDS });

/** One coloured square per round, for sharing a result without spoiling the answers. */
export function squares(rounds) {
  return rounds.map(({ got, max }) => { const f = max ? got / max : 0; return f >= 0.9 ? '🟩' : f >= 0.6 ? '🟨' : f >= 0.3 ? '🟧' : '🟥'; }).join('');
}

// ---------- names ----------
const A = ['Bright', 'Curious', 'Steady', 'Bold', 'Kind', 'Quick', 'Calm', 'Keen', 'Brave', 'Wise'];
const B = ['Heron', 'Baobab', 'Lantern', 'Sunbird', 'Comet', 'Okapi', 'Cedar', 'Falcon', 'Otter', 'Gazelle'];
/** A friendly stand-in name, e.g. "Curious Okapi". */
export function friendlyName(rand = Math.random) {
  return `${A[Math.floor(rand() * A.length)]} ${B[Math.floor(rand() * B.length)]}`;
}
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[@4]/g, 'a').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/0/g, 'o').replace(/[$5]/g, 's').replace(/[^a-z]/g, '');
// A short list of the words most likely to be typed for a laugh on a shared screen.
const BLOCKED = ['fuck', 'shit', 'bitch', 'cunt', 'nigg', 'fag', 'dick', 'cock', 'pussy', 'penis', 'vagina', 'porn', 'sex', 'rape', 'nazi', 'hitler', 'slut', 'whore', 'asshole', 'bastard', 'retard', 'merde', 'putain', 'salope', 'connard', 'connasse', 'encule', 'bite', 'nique', 'pute'];
/** Tidies a typed name: trims, collapses spaces, caps the length. */
export const cleanName = (name, max = 16) => String(name || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max).trim();
/** True when a name should not go on a shared screen. `extra` is the admin's own list. */
export function nameBlocked(name, extra = []) {
  const flat = fold(name);
  if (!flat) return !cleanName(name);
  return [...BLOCKED, ...extra.map(fold).filter((w) => w.length > 2)].some((w) => flat.includes(w));
}
/** Makes a name unique in a room by adding a number: "Sam", "Sam 2". */
export function uniqueName(name, taken) {
  const have = new Set(taken.map((n) => n.toLowerCase()));
  if (!have.has(name.toLowerCase())) return name;
  for (let i = 2; i < 99; i++) if (!have.has(`${name} ${i}`.toLowerCase())) return `${name} ${i}`;
  return name;
}
