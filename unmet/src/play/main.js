// The game page: boot, which screen is showing, and the wiring between the
// map, the room (room.js), the rules of the game (engine.js) and the HTML
// (views.js). One page, three ways to be on it:
//   solo    today's five questions, no network
//   host    runs a live room, usually on a big screen
//   player  joins a room from a phone
import { createMap } from '../map.js';
import { lens } from '../model.js';
import * as E from './engine.js';
import * as V from './views.js';
import { LANGS, countryName } from './strings.js';
import { cachedSettings, loadSettings, gameName, blockedWords, joinLinks, codeFromLocation } from './settings.js';
import { Host, Player, createRoom, findRoom, makeIdentity, validIdentity, normalCode, validCode, present, roundGuesses, path } from './room.js';
import { mockStore, BrowserHub } from './store.js';
import { sfx, buzz, countUp, confetti, setMuted } from './fx.js';

const cfg = window.PLAY;
const $ = (id) => document.getElementById(id);
const small = matchMedia('(max-width: 899px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const query = new URLSearchParams(location.search);
// ?mock on a local preview: rooms live in this browser only, so several tabs can play each other with no back end.
const mock = query.has('mock') && /^(localhost|127\.)/.test(location.hostname);
const BASE = '/unmet/play/';
const thisYear = new Date().getFullYear();

// Each tab is its own player in mock mode; otherwise a device is one player across tabs and reloads.
const box = (() => { try { const s = mock ? sessionStorage : localStorage; s.getItem('x'); return s; } catch { return null; } })();
const keep = {
  get: (k) => { try { return box?.getItem(k) ?? null; } catch { return null; } },
  set: (k, v) => { try { box?.setItem(k, v); } catch { /* private mode */ } },
  json: (k) => { try { return JSON.parse(box?.getItem(k) || 'null'); } catch { return null; } },
};

const app = {
  lang: ['en', 'fr'].includes(query.get('lang')) ? query.get('lang') : keep.get('play.lang') || (['en', 'fr'].includes(keep.get('unmet.lang')) ? keep.get('unmet.lang') : '') || ((navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en'),
  settings: cachedSettings(),
  screen: 'landing',
  mode: null, // 'solo' | 'live'
  code: '',
  store: null, host: null, player: null, room: null,
  key: '', // what is mounted, so a change of data patches the screen instead of redrawing it
  solo: null,
  draft: { value: null, touched: false, sent: false },
  showQr: true, qrSvg: '', qrFor: '',
  wantsToPlay: small.matches, // a host on a phone is almost always playing too
  emailSent: false,
  muted: keep.get('play.muted') === '1',
  lastCount: 0, lastSecond: -1,
};
let t = LANGS[app.lang];
let geo = null, data = null, known = new Set();
const byId = {}, outlines = new Map(), lenses = new Map();
let focused = null, pendingFocus = null;
setMuted(app.muted);

function identity() {
  let me = keep.json('play.me');
  if (!validIdentity(me)) { me = makeIdentity(); keep.set('play.me', JSON.stringify(me)); }
  return me;
}
const role = () => ({ host: !!app.host, plays: app.mode === 'solo' || !!app.player?.joined });
const now = () => (app.store ? app.store.now() : Date.now());
const name = () => gameName(app.settings, app.lang);
const povertyLine = () => String(parseFloat(data?.needs?.poverty?.line || '3'));
const nameOf = (id) => countryName(byId[id], app.lang);
const namesFor = (q) => ({ [q.a]: nameOf(q.a), ...(q.b ? { [q.b]: nameOf(q.b) } : {}) });
const links = () => joinLinks(app.settings, app.code || 'XXXX');
// Sound belongs to the shared screen and to solo play; a room full of phones stays quiet.
const loud = () => !!app.host || app.mode === 'solo';
const say = (which) => { if (loud()) sfx[which](); };

// ---------- the map ----------
const map = createMap($('map'), {
  reducedMotion: reduced,
  onPick: () => {},
  onHover: () => {},
  onView: () => { placeTags(); if (pendingFocus !== null && map.mode === 'map') { const q = pendingFocus; pendingFocus = null; focus(q); } },
});
const get = (file, as) => fetch(`${cfg.s}/${file}`).then((r) => { if (!r.ok) throw new Error(file); return r[as](); });
const dots = small.matches ? 's' : 'l';
const landP = get(`geo/dots-${dots}.land.bin`, 'arrayBuffer');
const xyP = get(`geo/dots-${dots}.xy.bin`, 'arrayBuffer');
const geoP = get('geo/map.json', 'json').then((json) => {
  geo = json;
  geo.countries.forEach((c, i) => {
    c.i = i + 1; byId[c.id] = c;
    // The map frames a country by this box. Unmet zooms right in; a guessing game wants
    // the neighbourhood in view, so small countries get a wider frame here.
    const [x0, y0, x1, y1] = c.frame, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const w = Math.max(x1 - x0, small.matches ? 84 : 120), h = Math.max(y1 - y0, small.matches ? 56 : 80);
    c.frame = [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2];
  });
  known = new Set(geo.countries.map((c) => c.id));
  map.setGeo(geo);
  layout(false);
  return landP;
}).then((land) => {
  map.setLand(land, geo.sets[dots]);
  xyP.then((xy) => { map.setXY(xy, geo.sets[dots]); if (pendingFocus !== null) map.unfold(); });
});
const dataP = get(cfg.data, 'json').then((json) => { data = json; renderChrome(); return json; });
const ready = () => Promise.all([geoP, dataP]);

function stageRect() {
  const rect = $('map').getBoundingClientRect(), W = rect.width, H = rect.height;
  if (small.matches) return { x: 10, y: 6, w: W - 20, h: H - 12 };
  const edge = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge')) || 44;
  const col = document.querySelector('#app .col'), side = document.querySelector('#app .side');
  const left = col ? col.offsetLeft + col.offsetWidth + 24 : edge;
  const right = side ? side.offsetLeft - 28 : W - edge;
  return { x: left, y: 104, w: Math.max(180, right - left), h: H - 104 - 92 };
}
function layout(animate) { if (geo) map.setStage(stageRect(), animate); }
new ResizeObserver(() => { map.resize(); layout(false); }).observe($('map'));
small.addEventListener('change', () => location.reload()); // dot density is chosen once, at load

function loadOutline(id) {
  if (outlines.has(id)) return;
  get(`geo/outlines/${id}.txt`, 'text').then((d) => { outlines.set(id, d); map.setOutline(byId[id].i, d); }).catch(() => {});
}
/** Points the map at a question's country (or pair of countries); null shows the whole world. */
function focus(q) {
  focused = q;
  if (!geo) return;
  if (map.mode !== 'map') {
    if (!q) return;
    pendingFocus = q;
    if (map.ready) map.unfold(); // the globe opens out into the Dymaxion map the first time a round starts
    return;
  }
  const a = q && byId[q.a], b = q && q.t === 'duel' && byId[q.b];
  map.select(a ? a.i : 0, a && outlines.get(a.id), b ? b.i : 0, b && outlines.get(b.id));
  if (a) loadOutline(a.id);
  if (b) loadOutline(b.id);
  layout(true);
  placeTags();
}
/** Colours every country by how one need stands there: the reveal lights up the whole world. */
function showLens(needId) {
  if (!data || !geo) return;
  if (!needId) return map.setLens(null, false);
  if (!lenses.has(needId)) {
    const l = lens(data, needId, thisYear);
    lenses.set(needId, [null, ...geo.countries.map((c) => (c.id in l ? l[c.id] : null))]);
  }
  map.setLens(lenses.get(needId), true);
}
function placeTags() {
  const q = focused, show = geo && q && map.mode === 'map';
  for (const [el, id] of [[$('tag-a'), q?.a], [$('tag-b'), q?.t === 'duel' ? q.b : null]]) {
    if (!show || !id || !byId[id]) { el.hidden = true; continue; }
    const [x, y] = map.toScreen(byId[id].c[0], byId[id].c[1]);
    el.hidden = false;
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    el.firstElementChild.textContent = nameOf(id);
  }
}

// ---------- chrome: brand, footer, toasts, sheets ----------
function renderChrome() {
  document.documentElement.lang = app.lang;
  $('brand-name').textContent = name();
  document.title = `${name()} · ${t.gsl}`;
  $('how').firstElementChild.textContent = t.how;
  $('sound').setAttribute('aria-pressed', String(!app.muted));
  $('sound').setAttribute('aria-label', t.sound);
  document.querySelectorAll('.lang button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === app.lang)));
  const chip = $('room-chip');
  chip.hidden = !(app.mode === 'live' && app.code && app.screen !== 'lobby');
  chip.textContent = app.code;
  if (data && geo) {
    $('f-count').textContent = t.footData(Object.keys(data.countries).filter((id) => byId[id]).length, Object.keys(data.series).length);
    $('f-source').textContent = data.meta.sample ? t.sample : t.footSource;
  } else $('f-count').textContent = t.loading;
  $('f-right').innerHTML = '<a href="?admin" data-act="admin">Admin</a>';
  if (cfg.sample && !document.querySelector('.sample')) document.body.insertAdjacentHTML('beforeend', `<div class="sample mono">${V.esc(t.sample)}</div>`);
}
let toastTimer = 0;
function toast(message, sticky) {
  const el = $('toast');
  clearTimeout(toastTimer);
  el.textContent = message || '';
  el.classList.toggle('on', !!message);
  if (message && !sticky) toastTimer = setTimeout(() => el.classList.remove('on'), 3600);
}
function banner(message) { const el = $('banner'); el.hidden = !message; el.textContent = message || ''; }
function openSheet(html, cls = '') {
  const el = $('sheet');
  el.className = `sheet ${cls}`.trim();
  el.innerHTML = html; el.hidden = false; el.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  (el.querySelector('input:not([type=hidden])') || el.querySelector('button'))?.focus();
}
function closeSheet() { $('sheet').hidden = true; $('sheet').innerHTML = ''; document.body.style.overflow = ''; }
function note(id, message) { const el = $(id); if (el) el.textContent = message || ''; }
async function copy(text, done) {
  try { await navigator.clipboard.writeText(text); toast(done); } catch { toast(text, true); }
}
async function shareText(text, done) {
  if (navigator.share && small.matches) { try { await navigator.share({ text }); } catch { /* dismissed */ } return; }
  copy(text, done);
}

function mount(screen, html) {
  app.screen = screen;
  document.body.dataset.screen = screen;
  $('app').innerHTML = html;
  $('clock').hidden = true;
  renderChrome();
  if (small.matches) window.scrollTo({ top: 0 });
  requestAnimationFrame(() => { layout(true); placeTags(); });
}

// ---------- landing ----------
const dailyRecord = () => { const r = keep.json('play.daily'); return r && r.key === E.dayKey() ? r : null; };
function recentRoom() {
  const r = keep.json('play.room');
  return r && validCode(r.code) && Date.now() - r.at < 4 * 3600 * 1000 ? r.code : '';
}
function showLanding(message) {
  app.mode = null; app.key = ''; app.code = '';
  focus(null); showLens(null);
  banner('');
  const tagline = (app.lang === 'fr' && app.settings.taglineFr) || app.settings.tagline;
  mount('landing', V.landing({ t, tagline, day: E.dayNumber(), today: dailyRecord(), resume: recentRoom(), solo: app.settings.solo }));
  if (message) note('code-note', message);
  if (!small.matches) $('code')?.focus();
}
function goHome(message) {
  app.host?.dispose(); app.player?.dispose();
  app.host = app.player = app.room = app.solo = null;
  if (location.pathname !== BASE || location.search.includes('r=')) history.pushState(null, '', BASE + (query.has('mock') ? '?mock' : ''));
  showLanding();
  if (message) toast(message);
}

// ---------- the live back end ----------
async function getStore() {
  if (app.store) return app.store;
  if (mock) app.store = mockStore(new BrowserHub());
  else app.store = (await import('./fb.js')).liveStore();
  return app.store;
}
const roomUrl = (code) => `${BASE}?r=${code}${query.has('mock') ? '&mock' : ''}`;
function remember(code) {
  app.code = code;
  keep.set('play.room', JSON.stringify({ code, at: Date.now() }));
  if (codeFromLocation() !== code) history.pushState(null, '', roomUrl(code));
}
async function loadQr() {
  const url = links().url;
  if (app.qrFor === url) return;
  const { qrSvg } = await import('./qr.js');
  app.qrSvg = qrSvg(url); app.qrFor = url;
}
const roomError = (e) => t.err[e?.code] || t.err.offline;

async function hostRoom() {
  mount('name', V.busy({ t, text: t.opening }));
  try {
    await ready();
    const store = await getStore();
    const s = app.settings;
    const code = await createRoom(store, identity(), { rounds: s.rounds, secs: s.secs, auto: s.auto, email: s.email, max: s.maxPlayers });
    app.showQr = s.qr;
    enterAsHost(code);
  } catch (e) { showLanding(roomError(e)); }
}
function enterAsHost(code) {
  app.mode = 'live'; app.key = ''; app.emailSent = false;
  remember(code);
  app.host = new Host(app.store, code, identity(), { data, known, onChange: onRoom, onError: (e) => toast(roomError(e)) });
  app.room = app.host.room;
  loadQr().then(() => { if (app.screen === 'lobby') { app.key = ''; sync(); } }).catch(() => {});
}
/** From the landing form, a link, or a reload: find the room and take the right seat in it. */
async function enterCode(raw) {
  const code = normalCode(raw);
  if (!validCode(code)) return showLanding(t.err.code);
  mount('name', V.busy({ t, text: t.joining }));
  try {
    await geoP;
    const store = await getStore(), me = identity();
    const hostPid = await findRoom(store, code);
    if (!hostPid) return showLanding(t.err['not-found']);
    app.code = code;
    if (hostPid === me.pid) { await ready(); app.showQr = app.settings.qr; return enterAsHost(code); }
    // Already in this room (a reload, or the phone woke up)? Walk straight back in.
    if (await store.get(path(code, 'pub', 'kicked', me.pid))) return showLanding(t.err.kicked);
    const mine = await store.get(path(code, 'pub', 'players', me.pid));
    if (mine && !mine.left) return joinRoom(mine.name, true);
    showName();
  } catch (e) { showLanding(roomError(e)); }
}
function showName(error, value) {
  mount('name', V.nameStep({ t, code: app.code, value: value ?? keep.get('play.name') ?? '', error }));
  const input = $('name');
  input?.focus(); input?.select();
}
async function joinRoom(typed, quiet) {
  if (!quiet) mount('name', V.nameStep({ t, code: app.code, value: typed, busy: true }));
  const player = new Player(app.store, app.code, identity(), { onChange: onRoom });
  try {
    const final = await player.join(typed, { blocked: blockedWords(app.settings) });
    keep.set('play.name', final);
    app.mode = 'live'; app.key = ''; app.emailSent = false;
    app.player = player; app.room = player.room;
    remember(app.code);
    buzz(20);
    sync();
  } catch (e) {
    if (e.code === 'name') return showName(roomError(e), typed);
    showLanding(roomError(e));
  }
}
/** The host joins their own room as a player (or stops playing). */
async function hostPlays(on, typed) {
  if (!app.host) return;
  if (!on) { app.wantsToPlay = false; await app.player?.leave(); app.player = null; app.host.setCfg({ hostPlays: false }); app.key = ''; return sync(); }
  const player = new Player(app.store, app.code, identity(), {});
  try {
    const final = await player.join(typed, { blocked: blockedWords(app.settings) });
    keep.set('play.name', final);
    app.player = player; app.wantsToPlay = true;
    app.host.setCfg({ hostPlays: true });
    app.key = ''; sync();
  } catch (e) { note('host-note', roomError(e)); }
}

// ---------- following a live room ----------
function onRoom() { if (app.mode === 'live') sync(); }
function people(room) { return present(room).sort((a, b) => (a[1].at || 0) - (b[1].at || 0)); }
function rows(room) { return E.board(room.scores, room.players); }

function sync() {
  const room = app.room, me = identity();
  if (!room || room.exists === undefined) return;
  if (room.exists === false) return goHome(t.roomClosed);
  if (!app.host && room.kicked[me.pid]) return goHome(t.removed);
  // A host who was playing before a reload takes their seat again.
  if (app.host && !app.player && room.cfg?.hostPlays && room.players[me.pid] && !room.players[me.pid].left) {
    app.player = new Player(app.store, app.code, me, {});
    app.player.joined = true; app.player.attach();
  }
  banner(!app.host && room.live === false ? t.hostGone : '');
  const s = room.state || { phase: 'lobby' };
  const key = s.phase === 'lobby' ? `lobby:${s.game}` : s.phase === 'final' ? `final:${s.game}` : `${s.phase}:${s.key}`;
  const mine = roundGuesses(room)[me.pid];
  const sig = `${key}|${app.lang}|${role().plays}|${mine ? 1 : 0}|${s.phase === 'lobby' ? JSON.stringify(room.cfg) + app.showQr : ''}`;
  if (sig !== app.key) { app.key = sig; mountLive(room, s); } else patchLive(room, s);
}

function mountLive(room, s) {
  const me = identity(), r = role(), list = people(room);
  if (s.phase === 'lobby') {
    focus(null); showLens(null);
    const open = !!document.querySelector('.opts details[open]');
    if (app.host) {
      mount('lobby', V.lobbyHost({ t, lang: app.lang, links: links(), code: app.code, qrSvg: app.qrSvg, welcome: app.settings.welcome, cfg: room.cfg, list, me: me.pid, plays: r.plays || app.wantsToPlay, showQr: app.showQr, nameValue: keep.get('play.name') || '' }));
      if (open) document.querySelector('.opts details').open = true;
      if (r.plays) document.querySelector('.inline-name').hidden = true;
    } else mount('lobby', V.lobbyPlayer({ t, name: room.players[me.pid]?.name || '', list, me: me.pid, hostPid: room.host, welcome: app.settings.welcome }));
    app.lastCount = list.length;
    return;
  }
  if (s.phase === 'guess') {
    const mine = roundGuesses(room)[me.pid] || null;
    if (!mine) app.draft = { value: null, touched: false, sent: false };
    focus(s.q); showLens(null);
    mount('guess', V.guess({ t, lang: app.lang, i: s.i, n: s.n, q: s.q, names: namesFor(s.q), line: povertyLine(), role: r, mine, answered: answered(room, list) }));
    bindAnswer(!!mine);
    $('clock').hidden = false; app.lastSecond = -1;
    return;
  }
  if (s.phase === 'reveal') {
    const mine = roundGuesses(room)[me.pid] || null, score = room.scores[me.pid], board = rows(room);
    const guesses = s.q.t === 'pct' ? Object.entries(roundGuesses(room)).filter(([, g]) => typeof g.v === 'number').map(([pid, g]) => ({ pid, v: g.v, name: room.players[pid]?.name || '' })) : [];
    focus(s.q); showLens(s.q.need);
    mount('reveal', V.reveal({ t, lang: app.lang, i: s.i, n: s.n, q: s.q, names: namesFor(s.q), line: povertyLine(), ans: s.ans, mine, guesses, rows: board, role: { ...r, plays: r.plays && !!score }, me: me.pid, last: s.i + 1 >= s.n, unmetUrl: `/unmet/?c=${s.q.a}&n=${s.q.need}`, result: score ? { pts: score.d || 0, rank: score.r, of: board.length, total: score.s } : null }));
    countUp($('truth'), s.ans.v);
    say('reveal');
    if (r.plays && score) { if (score.d >= E.maxScore(s.q) * 0.9) { buzz([40, 60, 40]); } else buzz(30); }
    return;
  }
  // final
  const board = rows(room), score = room.scores[me.pid];
  const view = score ? E.worldview(score.o, score.c) : null;
  focus(null); showLens(null);
  mount('final', V.final({ t, rows: board, won: room.final?.awards, role: r, me: me.pid, askEmail: room.cfg?.email !== false && app.settings.email, emailSent: app.emailSent, links: links(), result: r.plays && score ? { rank: score.r, of: board.length, total: score.s, view } : null }));
  confetti($('confetti'));
  say('win');
  if (r.plays && score?.r === 1) buzz([60, 80, 60, 80, 120]);
  if (app.host) saveGame(room, board);
}
function answered(room, list) {
  const g = roundGuesses(room), done = new Set(Object.keys(g));
  return { got: list.filter(([pid]) => done.has(pid)).length, of: list.length, html: V.peopleHtml(list, { t, me: identity().pid, done }) };
}
function patchLive(room, s) {
  const list = people(room);
  if (s.phase === 'lobby') {
    const el = $('people');
    if (el) el.innerHTML = V.peopleHtml(list, { t, me: identity().pid, hostPid: room.host, manage: !!app.host });
    if ($('count')) $('count').textContent = `· ${list.length}`;
    const start = $('start');
    if (start) { start.disabled = !list.length; $('start-sub').textContent = list.length ? t.startSub(room.cfg.rounds, room.cfg.secs) : t.startNeed; }
    if (list.length > app.lastCount) say('join');
    app.lastCount = list.length;
    const mine = room.players[identity().pid];
    const shown = document.querySelector('.you-name em');
    if (shown && mine && shown.textContent !== mine.name) shown.textContent = mine.name;
  } else if (s.phase === 'guess') {
    const a = answered(room, list);
    if ($('got')) $('got').textContent = t.inCount(a.got, a.of);
    if (app.host && $('people')) $('people').innerHTML = a.html;
  }
}

// ---------- answering ----------
function bindAnswer(locked) {
  const slider = $('slider');
  if (!slider) return;
  const box2 = $('answer');
  const paint = () => {
    const v = app.draft.value;
    slider.style.setProperty('--fill', `${v ?? 50}%`);
    $('num').textContent = v == null ? '?' : v;
    $('lock').disabled = v == null || app.draft.sent;
    if (v != null) { box2.classList.remove('is-fresh'); $('state').textContent = app.draft.sent ? (app.mode === 'solo' ? '' : t.waiting) : ''; }
  };
  if (locked) { slider.style.setProperty('--fill', `${slider.value}%`); return; }
  box2.classList.add('is-fresh');
  if (app.draft.touched) { slider.value = app.draft.value; }
  slider.addEventListener('input', () => { app.draft.value = +slider.value; app.draft.touched = true; paint(); });
  slider.addEventListener('keydown', (e) => { if (e.key === 'Enter') lockIn(); });
  paint();
  if (!small.matches) slider.focus();
}
function nudge(by) {
  const slider = $('slider');
  if (!slider || slider.disabled) return;
  const v = Math.min(100, Math.max(0, (app.draft.value ?? 50) + by));
  slider.value = v;
  slider.dispatchEvent(new Event('input'));
}
function showLocked(v) {
  app.draft.sent = true;
  const box2 = $('answer');
  if (box2) {
    box2.classList.add('is-locked');
    box2.querySelectorAll('input, button').forEach((el) => { el.disabled = true; });
    $('lock-text').textContent = t.locked;
    $('state').textContent = app.mode === 'solo' ? '' : t.waiting;
  }
  document.querySelectorAll('.pick').forEach((el) => { el.disabled = true; el.classList.toggle('chosen', el.dataset.value === v); });
  if ($('state') && !box2) $('state').textContent = t.locked;
}
async function lockIn(value = app.draft.value) {
  if (value == null || app.draft.sent) return;
  showLocked(value);
  say('lock'); buzz(25);
  if (app.mode === 'solo') return soloAnswer(value);
  const ok = await app.player?.submit(value);
  if (!ok && !roundGuesses(app.room)[identity().pid]) { app.draft.sent = false; app.key = ''; sync(); }
}

// ---------- the clock ----------
function tick() {
  app.host?.tick();
  if (app.mode !== 'live' || !app.room) return;
  const s = app.room.state;
  if (!s) return;
  if (s.phase === 'guess' && app.screen === 'guess') {
    const left = s.ends - now(), secs = Math.max(0, Math.ceil(left / 1000));
    const el = $('secs');
    if (el) { el.textContent = secs; el.classList.toggle('low', secs <= 5); }
    $('clock').classList.toggle('low', secs <= 5 && secs > 0);
    if (secs !== app.lastSecond) { app.lastSecond = secs; if (secs <= 5 && secs > 0) say('tick'); }
    // Time is up: an answer that was dialled in but not locked still counts.
    if (left <= 0 && role().plays && !app.draft.sent && app.draft.touched) lockIn();
    if (left <= 0 && $('state') && !app.draft.sent && role().plays) $('state').textContent = t.timeUp;
  } else if (s.phase === 'reveal' && app.screen === 'reveal') {
    const el = $('next-in'), last = s.i + 1 >= s.n;
    const secs = s.next ? Math.max(0, Math.ceil((s.next - now()) / 1000)) : null;
    if (el) el.textContent = s.paused ? t.paused : secs == null ? '' : last ? t.finishIn(secs) : t.nextIn(secs);
    const pause = $('pause');
    if (pause) { pause.textContent = s.paused || !s.next ? t.resumeGame : t.pause; pause.hidden = !app.room.cfg?.auto; }
  }
}
setInterval(tick, 200);
(function frame() {
  const s = app.mode === 'live' && app.room?.state;
  if (s && s.phase === 'guess' && app.screen === 'guess') {
    const k = Math.min(1, Math.max(0, (s.ends - now()) / Math.max(1, s.ends - s.starts)));
    $('clock').firstElementChild.style.transform = `scaleX(${k.toFixed(4)})`;
  }
  requestAnimationFrame(frame);
})();

// ---------- solo: today's five ----------
async function startSolo() {
  mount('name', V.busy({ t }));
  try { await ready(); } catch { return showLanding(t.failed); }
  const done = dailyRecord();
  app.mode = 'solo'; app.emailSent = !!done?.emailed;
  if (done) { app.solo = { ...done, done: true }; return showSoloFinal(); }
  app.solo = { key: E.dayKey(), day: E.dayNumber(), questions: E.dailyGame(data, known), i: 0, rounds: [], total: 0, o: 0, c: 0 };
  showSoloRound();
}
function showSoloRound() {
  const s = app.solo, q = s.questions[s.i];
  app.draft = { value: null, touched: false, sent: false };
  focus(q); showLens(null);
  mount('guess', V.guess({ t, lang: app.lang, i: s.i, n: s.questions.length, q, names: namesFor(q), line: povertyLine(), role: { host: false, plays: true }, mine: null, answered: { got: 0, of: 0, html: '' }, solo: true }));
  bindAnswer(false);
}
function soloAnswer(value) {
  const s = app.solo, q = s.questions[s.i], truth = E.truth(data, q);
  const pts = E.score(q, value, truth), tilt = E.rosy(q, value, truth);
  s.total += pts; s.rounds.push({ got: pts, max: E.maxScore(q) });
  if (tilt != null) { s.o += tilt; s.c += 1; }
  s.last = { value, truth, pts };
  setTimeout(showSoloReveal, reduced ? 0 : 450);
}
function showSoloReveal() {
  const s = app.solo, q = s.questions[s.i], { value, truth, pts } = s.last;
  showLens(q.need);
  mount('reveal', V.reveal({ t, lang: app.lang, i: s.i, n: s.questions.length, q, names: namesFor(q), line: povertyLine(), ans: truth, mine: { v: value }, guesses: q.t === 'pct' ? [{ pid: 'me', v: value, name: '' }] : [], rows: [], role: { host: false, plays: true }, me: 'me', solo: true, last: s.i + 1 >= s.questions.length, unmetUrl: `/unmet/?c=${q.a}&n=${q.need}`, result: { pts, total: s.total } }));
  countUp($('truth'), truth.v);
  if (pts >= E.maxScore(q) * 0.9) { say('good'); buzz([40, 60, 40]); } else say('reveal');
}
function soloNext() {
  const s = app.solo;
  if (s.i + 1 < s.questions.length) { s.i++; return showSoloRound(); }
  const view = E.worldview(s.o, s.c), was = keep.json('play.streak');
  const yesterday = E.dayKey(Date.parse(s.key) - 86400000);
  const streak = was?.last === s.key ? was.n : was?.last === yesterday ? was.n + 1 : 1;
  keep.set('play.streak', JSON.stringify({ last: s.key, n: streak }));
  const record = { key: s.key, day: s.day, score: s.total, max: E.totalMax(s.questions), rounds: s.rounds, view: view ? { kind: view.kind, by: view.by } : null, streak };
  keep.set('play.daily', JSON.stringify(record));
  app.solo = { ...record, done: true };
  showSoloFinal(true);
}
function showSoloFinal(fresh) {
  const s = app.solo;
  focus(null); showLens(null);
  mount('final', V.soloFinal({ t, day: s.day, score: s.score, max: s.max, rounds: s.rounds, view: s.view, streak: s.streak, askEmail: app.settings.email, emailSent: app.emailSent }));
  if (fresh && s.score >= s.max * 0.6) { confetti($('confetti')); say('win'); }
}

// ---------- sharing, email, records ----------
function shareResult() {
  const url = links().home;
  if (app.mode === 'solo') {
    const s = app.solo;
    return shareText(t.shareSolo({ name: name(), day: s.day, score: s.score, max: s.max, squares: E.squares(s.rounds), view: s.view?.kind, by: s.view?.by, url }), t.shareCopied);
  }
  const me = identity(), score = app.room?.scores[me.pid];
  if (!score) return;
  const view = E.worldview(score.o, score.c);
  shareText(t.shareLive({ name: name(), rank: score.r, n: rows(app.room).length, score: score.s, view: view?.kind, by: view?.by, url }), t.shareCopied);
}
async function sendEmail(form) {
  const email = String(new FormData(form).get('email') || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email) || email.length > 200) return note('email-note', t.emailBad);
  const me = identity(), button = form.querySelector('button');
  let lead;
  if (app.mode === 'solo') {
    const s = app.solo;
    lead = { room: `SOLO${s.key.replaceAll('-', '')}`, name: keep.get('play.name') || '', score: s.score, max: s.max, rank: 0, of: 0, view: s.view?.kind || '', by: s.view?.by || 0 };
  } else {
    const score = app.room.scores[me.pid] || { s: 0, r: 0 }, view = E.worldview(score.o, score.c);
    lead = { room: app.code, name: app.room.players[me.pid]?.name || '', score: score.s, max: E.totalMax(E.plan(app.room.state?.n || 0)), rank: score.r || 0, of: rows(app.room).length, view: view?.kind || '', by: view?.by || 0 };
  }
  button.disabled = true; note('email-note', '');
  try {
    if (!mock) {
      const { docCreate } = await import('./cloud.js');
      await docCreate('playLeads', `${lead.room}_${me.pid}`, { ...lead, pid: me.pid, email, lang: app.lang, at: new Date() }).catch((e) => { if (e.status !== 409) throw e; });
    }
    app.emailSent = true;
    if (app.mode === 'solo') { const r = dailyRecord(); if (r) keep.set('play.daily', JSON.stringify({ ...r, emailed: true })); }
    $('email-slot').innerHTML = V.emailForm({ t, sent: true });
  } catch { button.disabled = false; note('email-note', t.emailFail); }
}
/** The host keeps a record of each finished game (best effort; the game does not depend on it). */
async function saveGame(room, board) {
  const s = room.state, flag = `play.saved.${app.code}.${s.game}`;
  if (mock || keep.get(flag)) return;
  keep.set(flag, '1');
  try {
    const { docCreate } = await import('./cloud.js');
    await docCreate('playGames', `${app.code}_${s.game}_${Date.now().toString(36)}`, {
      code: app.code, game: s.game, host: identity().pid, at: new Date(), lang: app.lang,
      players: board.length, rounds: s.n, region: s.region || 'world', topics: s.topics || '',
      view: room.final?.awards?.room?.kind || '', by: room.final?.awards?.room?.by || 0,
      board: board.slice(0, 60).map((r) => ({ name: r.name, score: r.s })),
      questions: app.host.questions.map((q) => ({ t: q.t, need: q.need, a: q.a, b: q.b || '' })),
    });
  } catch { /* the record is a nicety */ }
}

// ---------- sheets ----------
async function openInvite() {
  await loadQr().catch(() => {});
  openSheet(V.invite({ t, name: name(), links: links(), code: app.code, qrSvg: app.qrSvg }));
}
async function openAdmin() {
  openSheet(`<article><p class="mono mut">${V.esc(t.loading)}</p></article>`, 'admin');
  const { adminScreen } = await import('./admin.js');
  adminScreen($('sheet'), { local: mock, onSaved: (next) => { app.settings = next; renderChrome(); if (app.screen === 'landing') showLanding(); } });
}

// ---------- events ----------
function setLang(lang) {
  if (lang === app.lang) return;
  app.lang = lang; t = LANGS[lang]; keep.set('play.lang', lang);
  renderChrome();
  if (app.mode === 'live') { app.key = ''; sync(); }
  else if (app.mode === 'solo') { const s = app.solo; if (s.done) showSoloFinal(); else if (s.last && app.screen === 'reveal') showSoloReveal(); else showSoloRound(); }
  else if (app.screen === 'name' && $('name')) showName('', $('name').value);
  else showLanding();
}
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act],[data-lang],#how,#sound,#brand');
  if (!el) return;
  if (el.id === 'how') return openSheet(V.how({ t, name: name() }));
  if (el.id === 'sound') { app.muted = !app.muted; setMuted(app.muted); keep.set('play.muted', app.muted ? '1' : '0'); return renderChrome(); }
  if (el.id === 'brand') { e.preventDefault(); if (app.mode === 'live' && !confirm(t.leaveAsk)) return; if (app.player && !app.host) app.player.leave(); return goHome(); }
  if (el.dataset.lang) return setLang(el.dataset.lang);
  const act = el.dataset.act, host = app.host;
  if (act === 'host') return hostRoom();
  if (act === 'solo') return startSolo();
  if (act === 'resume') return enterCode(el.dataset.code);
  if (act === 'home') return goHome();
  if (act === 'admin') { e.preventDefault(); return openAdmin(); }
  if (act === 'close-sheet') return closeSheet();
  if (act === 'copy-link') return copy(links().url, t.copied);
  if (act === 'share-link') return shareText(links().url, t.copied);
  if (act === 'invite') return openInvite();
  if (act === 'share-result') return shareResult();
  if (act === 'nudge') return nudge(+el.dataset.value);
  if (act === 'lock') return lockIn();
  if (act === 'pick') return lockIn(el.dataset.value);
  if (act === 'solo-next') return soloNext();
  if (act === 'leave') { if (!confirm(t.leaveAsk)) return; app.player?.leave(); return goHome(); }
  if (act === 'edit-name') return openSheet(V.manage({ t, pid: identity().pid, name: app.room.players[identity().pid]?.name || '', canRemove: false }));
  if (!host) return;
  if (act === 'start') return host.start();
  if (act === 'skip') return host.skip();
  if (act === 'pause') { const s = app.room.state; return s.paused || !s.next ? host.pause(false) : host.pause(true); }
  if (act === 'again') return host.again();
  if (act === 'cfg') return host.setCfg({ [el.dataset.key]: +el.dataset.value });
  if (act === 'cfg-toggle') return host.setCfg({ [el.dataset.key]: el.getAttribute('aria-checked') !== 'true' });
  if (act === 'ui-toggle') { app.showQr = !app.showQr; app.key = ''; return sync(); }
  if (act === 'topic') {
    const have = new Set((app.room.cfg.topics || '').split(',').filter(Boolean)), id = el.dataset.value;
    if (!id) have.clear(); else if (have.has(id)) have.delete(id); else have.add(id);
    return host.setCfg({ topics: [...have].join(',') });
  }
  if (act === 'plays') {
    const on = el.getAttribute('aria-checked') !== 'true';
    if (!on) return hostPlays(false);
    app.wantsToPlay = true; el.setAttribute('aria-checked', 'true');
    const form = document.querySelector('.inline-name');
    form.hidden = false; form.querySelector('input').focus();
    return undefined;
  }
  if (act === 'manage') { const p = app.room.players[el.dataset.pid]; if (p) openSheet(V.manage({ t, pid: el.dataset.pid, name: p.name })); return undefined; }
  if (act === 'kick') { host.kick(el.dataset.pid); return closeSheet(); }
  return undefined;
});
document.addEventListener('change', (e) => { if (e.target.dataset?.change === 'region') app.host?.setCfg({ region: e.target.value }); });
document.addEventListener('input', (e) => { if (e.target.id === 'code') { e.target.value = normalCode(e.target.value); note('code-note', ''); } });
document.addEventListener('submit', async (e) => {
  const form = e.target.closest('[data-form]');
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form, value = String(new FormData(form).get('name') || new FormData(form).get('code') || '').trim();
  if (kind === 'code') return enterCode(value);
  if (kind === 'name') return value ? joinRoom(value) : note('name-note', t.err.name);
  if (kind === 'host-name') return value ? hostPlays(true, value) : note('host-note', t.err.name);
  if (kind === 'email') return sendEmail(form);
  if (kind === 'rename') {
    const pid = form.dataset.pid;
    if (!value) return undefined;
    if (pid === identity().pid && app.player) { try { keep.set('play.name', await app.player.rename(value, { blocked: blockedWords(app.settings) })); } catch (err) { return toast(roomError(err)); } } else await app.host?.rename(pid, value);
    return closeSheet();
  }
  return undefined;
});
addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && document.activeElement.type !== 'range';
  if (e.key === 'Escape' && !$('sheet').hidden) return closeSheet();
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '?') openSheet(V.how({ t, name: name() }));
  if (app.screen === 'guess' && role().plays && !app.draft.sent) {
    if (e.key === 'ArrowLeft' && document.activeElement?.id !== 'slider') nudge(e.shiftKey ? -10 : -1);
    if (e.key === 'ArrowRight' && document.activeElement?.id !== 'slider') nudge(e.shiftKey ? 10 : 1);
    if (e.key === 'Enter' && document.activeElement?.id !== 'slider' && document.activeElement?.tagName !== 'BUTTON') lockIn();
    if ((e.key === 'a' || e.key === 'b') && $('duel')) lockIn(e.key);
  }
  if (app.host && (e.key === ' ' || e.key === 'n') && document.activeElement?.tagName !== 'BUTTON') {
    if (app.screen === 'reveal') { e.preventDefault(); app.host.skip(); }
  }
});
addEventListener('popstate', () => location.reload());
addEventListener('pagehide', () => { /* the server marks this device away by itself (see room.js) */ });

// ---------- boot ----------
renderChrome();
(mock ? Promise.resolve(cachedSettings()) : loadSettings()).then((next) => {
  const changed = JSON.stringify(next) !== JSON.stringify(app.settings);
  app.settings = next;
  if (!changed) return;
  renderChrome();
  if (app.screen === 'landing' && !$('code')?.value) showLanding();
});
geoP.catch((e) => { console.error(e); toast(t.failed, true); });
dataP.catch(() => {});
if (query.has('admin')) { showLanding(); openAdmin(); } else if (codeFromLocation()) enterCode(codeFromLocation());
else if (query.has('solo')) startSolo();
else showLanding();
