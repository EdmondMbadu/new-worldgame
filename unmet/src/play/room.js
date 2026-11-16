// A live room: what the host's device does, what a player's device does, and
// the shape of what they share. It talks to the back end only through a store
// (see store.js), so the whole protocol is exercised in Node against an
// in-memory hub and against the real security rules (test/play-room.test.mjs).
//
// Nobody signs in. Each device makes itself an identity once: a public id
// (pid) and a secret key that never leaves the device except into places the
// rules let no one read. Every write carries a one-time proof of that key:
//
//   play/rooms/{CODE}
//     pub/                      anyone may read
//       host      pid of the device running the game
//       created   server time
//       live      false while the host's device is disconnected
//       hw        the host's latest proof number
//       cfg       { rounds, secs, region, topics, auto, hostPlays, email, locked, max }
//       state     { phase: lobby | guess | reveal | final, game, i, n, key, q, starts, ends, ans, next, paused }
//       players   { pid: { name, at, on, left, w } }
//       kicked    { pid: true }
//       guesses   { key: { pid: { v, at, w } } }     key = g{game}r{round}
//       scores    { pid: { s, d, n, o, c, b, r, p } }   written by the host at each reveal
//       final     { at, players, awards }
//     sec/                      no one may read; the rules compare against it
//       hk        the host's key
//       pk        { pid: that player's key }, claimed once
//       px        { proofNumber: key }, each written once
//
// A write by a player to their own entry must come with a new proof number
// (`w`) and, in the same update, sec/px/{w} = their key. The rules check that
// px/{w} did not exist before and now equals sec/pk/{pid}; only someone who
// knows the key can do that. The host does the same with hw and hk. See
// database.rules.json.
import * as E from './engine.js';
import { TS, denied } from './store.js';

export const ROOT = 'play/rooms';
/** Room codes are four consonants: easy to read out, and they cannot spell anything. */
export const LETTERS = 'BCDFGHJKLMNPQRSTVWXZ';
/** After the clock runs out, wait this long for answers already on their way. */
export const GRACE_MS = 1500;
/** Once everyone has answered, hold a beat before the reveal. */
export const EARLY_MS = 900;
/** How long a reveal stays up when the game moves on by itself. */
export const REVEAL_MS = 15000;
export const MAX_PLAYERS = 60;
export const DEFAULT_CFG = { rounds: 6, secs: 20, region: 'world', topics: '', auto: true, hostPlays: false, email: true, locked: false, max: MAX_PLAYERS };

export const path = (code, ...rest) => [ROOT, code, ...rest].join('/');
export const normalCode = (text) => String(text || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
export const validCode = (code) => /^[A-Z]{4}$/.test(code || '');
export const makeCode = (rand = Math.random) => Array.from({ length: 4 }, () => LETTERS[Math.floor(rand() * LETTERS.length)]).join('');
const clamp = (v, lo, hi, fallback) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : fallback);

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
/** A random string of letters and digits, from the system's secure source. */
export function token(length) {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALNUM[b % ALNUM.length]).join('');
}
/** A new identity for a device: { pid, key }. Keep it (localStorage) so a reload is the same player. */
export const makeIdentity = () => ({ pid: token(12), key: token(32) });
export const validIdentity = (me) => /^[A-Za-z0-9]{8,24}$/.test(me?.pid || '') && /^[A-Za-z0-9]{20,64}$/.test(me?.key || '');

/** Keeps only the settings a room understands, each within its limits. */
export function cleanCfg(cfg = {}) {
  const base = { ...DEFAULT_CFG, ...cfg };
  return {
    rounds: clamp(base.rounds, 3, 12, DEFAULT_CFG.rounds),
    secs: clamp(base.secs, 10, 60, DEFAULT_CFG.secs),
    region: E.REGION_IDS.includes(base.region) ? base.region : 'world',
    topics: String(base.topics || '').split(',').filter((id) => E.TOPIC_IDS.includes(id)).join(','),
    auto: base.auto !== false,
    hostPlays: !!base.hostPlays,
    email: base.email !== false,
    locked: !!base.locked,
    max: clamp(base.max, 2, 300, MAX_PLAYERS),
  };
}

class RoomError extends Error {
  constructor(code) { super(code); this.code = code; }
}
/** not-found · kicked · locked · full · name · backend (the rules are not deployed) · offline */
export const fail = (code) => new RoomError(code);
const wrap = (e) => (e instanceof RoomError ? e : fail(denied(e) ? 'backend' : 'offline'));

/** Opens a new room owned by this device and returns its code. */
export async function createRoom(store, me, cfg, rand = Math.random) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = makeCode(rand), w = token(20);
    try {
      await store.set(path(code), {
        pub: { host: me.pid, created: TS, live: true, hw: w, cfg: cleanCfg(cfg), state: { phase: 'lobby', game: 1 } },
        sec: { hk: me.key, px: { [w]: me.key } },
      });
      return code;
    } catch (e) {
      if (!denied(e)) throw wrap(e);
      // Refused: either the code is in use, or the back end is not set up at all.
      let taken = false;
      try { taken = !!(await store.get(path(code, 'pub', 'host'))); } catch { /* the read is refused too */ }
      if (!taken) throw fail('backend');
    }
  }
  throw fail('offline');
}

/** The pid of a room's host, or null when there is no such room. */
export async function findRoom(store, code) {
  if (!validCode(code)) return null;
  try { return (await store.get(path(code, 'pub', 'host'))) || null; } catch (e) { throw wrap(e); }
}

const blank = (code) => ({ code, exists: undefined, host: null, live: true, cfg: null, state: null, players: {}, kicked: {}, guesses: {}, scores: {}, final: null });
/** Follows the public half of a room. `onChange(room)` runs on every change. */
export function watchRoom(store, code, onChange, onError = () => {}) {
  const room = blank(code);
  const stop = store.on(path(code, 'pub'), (pub) => {
    Object.assign(room, blank(code), pub || {}, { code, exists: !!pub });
    onChange(room);
  }, onError);
  return { room, stop };
}
/** The players still in the room, as [pid, player] pairs. */
export const present = (room) => Object.entries(room.players || {}).filter(([, p]) => !p.left);
/** The answers given in the round that is open or just revealed. */
export const roundGuesses = (room) => (room.state?.key && room.guesses?.[room.state.key]) || {};

// ---------- the host ----------
export class Host {
  /** `me` is this device's identity, `data` the Unmet snapshot, `known` the country ids the map can draw. */
  constructor(store, code, me, { data, known, onChange = () => {}, onError = () => {} }) {
    Object.assign(this, { store, code, me, data, known, onChange, onError, busy: false, allAt: 0, dealt: null });
    this.watch = watchRoom(store, code, (room) => this.onChange(room));
    this.room = this.watch.room;
    this.stopConn = store.connected((on) => {
      if (!on) return;
      store.onDisconnectUpdate(path(code), this.sign({ 'pub/live': false }));
      this.write({ 'pub/live': true }).catch(() => {});
    });
  }
  dispose() { this.watch.stop(); this.stopConn?.(); }

  /** Adds this device's one-time proof to a set of changes. */
  sign(patch) {
    const w = token(20);
    return { ...patch, 'pub/hw': w, [`sec/px/${w}`]: this.me.key };
  }
  write(patch) { return this.store.update(path(this.code), this.sign(patch)); }

  /** The questions of a game are dealt from its seed, so a reloaded host deals the same ones. */
  questionsFor({ game, n, region, topics }) {
    const sig = `${game}|${n}|${region}|${topics}`;
    if (this.dealt?.sig !== sig) this.dealt = { sig, list: E.makeGame(this.data, this.known, { seed: `${this.code}:${game}`, rounds: n, region, topics: topics ? topics.split(',') : null }) };
    return this.dealt.list;
  }
  get questions() { return this.room.state?.n ? this.questionsFor(this.room.state) : []; }
  get guesses() { return roundGuesses(this.room); }

  run(job) {
    if (this.busy) return Promise.resolve();
    this.busy = true;
    return job().catch((e) => this.onError(wrap(e))).finally(() => { this.busy = false; });
  }
  start() {
    return this.run(async () => {
      const { cfg, state } = this.room;
      if (state?.phase !== 'lobby' || !cfg) return;
      const deal = { game: state.game || 1, n: cfg.rounds, region: cfg.region || 'world', topics: cfg.topics || '' };
      deal.n = this.questionsFor(deal).length; // normally the number asked for
      await this.begin(0, deal);
    });
  }
  async begin(i, deal = this.room.state) {
    const { game, n, region, topics } = deal;
    const q = this.questionsFor({ game, n, region, topics })[i];
    if (!q) return this.finish();
    const now = this.store.now();
    this.allAt = 0;
    await this.write({ 'pub/state': { phase: 'guess', game, n, region, topics, i, key: `g${game}r${i}`, q, starts: now, ends: now + this.room.cfg.secs * 1000 } });
  }
  async reveal() {
    const s = this.room.state;
    if (s?.phase !== 'guess') return;
    const t = E.truth(this.data, s.q), guesses = this.guesses;
    const pids = present(this.room).map(([pid]) => pid);
    await this.write({
      'pub/state/phase': 'reveal',
      'pub/state/ans': { ...t, ...E.roundSummary(s.q, guesses, t, pids) },
      'pub/state/next': this.room.cfg.auto ? this.store.now() + REVEAL_MS : null,
      'pub/state/paused': null,
      'pub/scores': E.tally(this.room.scores, pids, s.q, guesses, t),
    });
  }
  async advance() {
    const s = this.room.state;
    if (s?.phase !== 'reveal') return;
    if (s.i + 1 < s.n) return this.begin(s.i + 1);
    return this.finish();
  }
  async finish() {
    const { players, scores } = this.room;
    await this.write({
      'pub/state/phase': 'final', 'pub/state/next': null, 'pub/state/paused': null,
      'pub/final': { at: TS, players: present(this.room).length, awards: JSON.parse(JSON.stringify(E.awards(scores, players))) },
    });
  }

  /** Call a few times a second: moves the game on when the clock or the room says so. */
  tick() {
    const s = this.room.state;
    if (!s || this.busy) return;
    const now = this.store.now();
    if (s.phase === 'guess') {
      const here = present(this.room).filter(([, p]) => p.on !== false).map(([pid]) => pid), guesses = this.guesses;
      const everyone = here.length > 0 && here.every((pid) => guesses[pid]);
      this.allAt = everyone ? this.allAt || now : 0;
      if (now >= s.ends + GRACE_MS || (this.allAt && now >= this.allAt + EARLY_MS)) this.run(() => this.reveal());
    } else if (s.phase === 'reveal' && s.next && !s.paused && now >= s.next) this.run(() => this.advance());
  }
  /** The host's "next" button: reveal now, or move on now. */
  skip() {
    const phase = this.room.state?.phase;
    if (phase === 'guess') return this.run(() => this.reveal());
    if (phase === 'reveal') return this.run(() => this.advance());
    return Promise.resolve();
  }
  /** Holds a reveal on screen (to talk about it), or lets the game run on. */
  pause(on) {
    if (this.room.state?.phase !== 'reveal') return Promise.resolve();
    return this.write({ 'pub/state/paused': on ? true : null, 'pub/state/next': on ? null : this.store.now() + 3000 }).catch((e) => this.onError(wrap(e)));
  }
  /** Back to the lobby with the same people, for another game. */
  again() {
    return this.run(() => this.write({ 'pub/state': { phase: 'lobby', game: (this.room.state?.game || 1) + 1 }, 'pub/scores': null, 'pub/final': null }));
  }
  setCfg(patch) {
    return this.write({ 'pub/cfg': cleanCfg({ ...this.room.cfg, ...patch }) }).catch((e) => this.onError(wrap(e)));
  }
  kick(pid) {
    return this.write({ [`pub/kicked/${pid}`]: true, [`pub/players/${pid}`]: null, [`pub/scores/${pid}`]: null }).catch((e) => this.onError(wrap(e)));
  }
  rename(pid, name) {
    const clean = E.cleanName(name);
    if (!clean || !this.room.players[pid]) return Promise.resolve();
    const taken = present(this.room).filter(([id]) => id !== pid).map(([, p]) => p.name);
    return this.write({ [`pub/players/${pid}/name`]: E.uniqueName(clean, taken) }).catch((e) => this.onError(wrap(e)));
  }
}

// ---------- a player ----------
export class Player {
  constructor(store, code, me, { onChange = () => {} } = {}) {
    Object.assign(this, { store, code, me, pid: me.pid, onChange, joined: false, sending: false, room: blank(code) });
  }
  /** One of this player's own changes, with the proof that it is theirs. */
  write(fields, extra = {}) {
    const w = token(20), patch = { ...extra, [`sec/px/${w}`]: this.me.key, [`pub/players/${this.pid}/w`]: w };
    for (const [k, v] of Object.entries(fields)) patch[`pub/players/${this.pid}/${k}`] = v;
    return this.store.update(path(this.code), patch);
  }
  /** Checks the room will have this player, then adds them. Returns the name they ended up with. */
  async join(name, { blocked = [] } = {}) {
    const { store, code, pid } = this;
    let pub;
    try { pub = await store.get(path(code, 'pub')); } catch (e) { throw wrap(e); }
    if (!pub?.host) throw fail('not-found');
    if (pub.kicked?.[pid]) throw fail('kicked');
    const mine = pub.players?.[pid], others = Object.entries(pub.players || {}).filter(([id, p]) => id !== pid && !p.left);
    if (!mine && pub.cfg?.locked) throw fail('locked');
    if (!mine && others.length >= (pub.cfg?.max || MAX_PLAYERS)) throw fail('full');
    const clean = E.cleanName(name);
    if (!clean || E.nameBlocked(clean, blocked)) throw fail('name');
    const final = E.uniqueName(clean, others.map(([, p]) => p.name));
    const fields = { name: final, on: true, left: null, at: mine?.at || TS };
    try {
      // The first time in, this also claims the player's key; after that the claim would be refused.
      if (mine) await this.write(fields);
      else await this.write(fields, { [`sec/pk/${pid}`]: this.me.key }).catch((e) => { if (!denied(e)) throw e; return this.write(fields); });
    } catch (e) { throw wrap(e); }
    this.joined = true;
    this.attach();
    return final;
  }
  attach() {
    if (this.watch) return;
    const { store, code } = this;
    this.watch = watchRoom(store, code, (room) => this.onChange(room));
    this.room = this.watch.room;
    this.stopConn = store.connected((on) => {
      if (!on || !this.joined || this.room.kicked[this.pid]) return;
      // If this device drops, the server marks the player away: the room does not wait for them.
      const w = token(20);
      store.onDisconnectUpdate(path(code), { [`sec/px/${w}`]: this.me.key, [`pub/players/${this.pid}/w`]: w, [`pub/players/${this.pid}/on`]: false });
      if (this.room.exists !== false) this.write({ on: true }).catch(() => {});
    });
  }
  get self() { return this.room.players[this.pid] || null; }
  /** This player's answer in the current round, if they have given one. */
  get mine() { return roundGuesses(this.room)[this.pid] || null; }
  /** Everyone's answers, once the round is over. */
  get all() { return this.room.state && this.room.state.phase !== 'guess' ? roundGuesses(this.room) : null; }
  /** Locks in an answer. One per round; returns false if it was not accepted. */
  async submit(v) {
    const s = this.room.state;
    if (s?.phase !== 'guess' || this.mine || this.sending) return false;
    this.sending = true;
    const w = token(20);
    try {
      await this.store.update(path(this.code), { [`sec/px/${w}`]: this.me.key, [`pub/guesses/${s.key}/${this.pid}`]: { v, at: TS, w } });
      return true;
    } catch { return false; } finally { this.sending = false; }
  }
  async rename(name, { blocked = [] } = {}) {
    const clean = E.cleanName(name);
    if (!clean || E.nameBlocked(clean, blocked)) throw fail('name');
    const final = E.uniqueName(clean, present(this.room).filter(([id]) => id !== this.pid).map(([, p]) => p.name));
    try { await this.write({ name: final }); } catch (e) { throw wrap(e); }
    return final;
  }
  async leave() {
    const was = this.joined;
    this.joined = false;
    if (was) await this.write({ on: false, left: true }).catch(() => {});
    this.dispose();
  }
  dispose() { this.watch?.stop(); this.watch = null; this.stopConn?.(); this.stopConn = null; }
}
