// Unmet: boot, state, and the wiring between the map, the search field and
// the panel. The page is one screen with three depths:
//   world  ->  a country  ->  one need in that country
import { createMap } from './map.js';
import { summarize, assess, lens, world, needsIn } from './model.js';
import { needById } from './needs.js';
import { LANGS, countryName, lackParts } from './i18n.js';
import { countryPanel, needPanel, paceStrip, aboutHtml, esc } from './panel.js';

const cfg = window.UNMET;
const $ = (id) => document.getElementById(id);
const small = matchMedia('(max-width: 899px)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const thisYear = new Date().getFullYear();
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } } };

const query = new URLSearchParams(location.search);
const state = {
  lang: ['en', 'fr'].includes(query.get('lang')) ? query.get('lang') : store.get('unmet.lang') || (['en', 'fr'].includes(store.get('nwg_language')) ? store.get('nwg_language') : '') || ((navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en'),
  country: null, // ISO3
  need: null,
  pin: null, // { x, y, lat, lon, label } in map space
};
let t = LANGS[state.lang];
let geo = null, data = null;
let byId = {}, places = [];
const summaries = new Map(), lenses = new Map(), outlines = new Map();
let pending = null; // a selection made before the map had opened
let animateUntil = 0;
const set = small.matches ? 's' : 'l';

const map = createMap($('map'), {
  reducedMotion: reduced,
  onPick: (who) => { if (who) selectCountry(geo.countries[who - 1].id); },
  onHover: hover,
  onView: () => { placePin(); if (pending && map.mode === 'map') { const p = pending; pending = null; selectCountry(p.id, p); } },
});

// ---------- loading ----------
const get = (path, as) => fetch(`${cfg.s}/${path}`).then((r) => { if (!r.ok) throw new Error(path); return r[as](); });
const landP = get(`geo/dots-${set}.land.bin`, 'arrayBuffer');
const xyP = get(`geo/dots-${set}.xy.bin`, 'arrayBuffer');
const dataP = get(cfg.data, 'json');

boot().catch((error) => { console.error(error); toast(t.failed, true); });

async function boot() {
  renderStatic();
  geo = await get('geo/map.json', 'json');
  geo.countries.forEach((c, i) => { c.i = i + 1; byId[c.id] = c; });
  buildPlaces();
  map.setGeo(geo);
  layout(false);
  const wanted = byId[(query.get('c') || '').toUpperCase()];
  const landed = performance.now();
  if (wanted) {
    // Arriving on a shared link: skip the globe, open straight onto the map.
    const [land, xy] = await Promise.all([landP, xyP]);
    map.setLand(land, geo.sets[set]); map.setXY(xy, geo.sets[set]); map.showMap();
    selectCountry(wanted.id, { need: needById[query.get('n')] ? query.get('n') : null, replace: true });
  } else {
    map.setLand(await landP, geo.sets[set]);
    xyP.then((xy) => {
      map.setXY(xy, geo.sets[set]);
      // Let the globe turn for a moment, then open it out.
      setTimeout(() => map.unfold(), pending ? 0 : Math.max(0, 1900 - (performance.now() - landed)));
    });
  }
  data = await dataP;
  summaries.clear(); lenses.clear();
  if (data.meta.sample) document.body.insertAdjacentHTML('beforeend', `<div class="sample mono">${esc(t.sample)}</div>`);
  map.setLens(lensFor(state.need));
  renderStatic();
  render();
  tickWorld();
}

function buildPlaces() {
  places = geo.countries.filter((c) => c.id !== 'ATA').map((c) => ({
    c,
    names: [norm(c.name), norm(countryName(c, 'fr')), norm(c.id)],
    capital: norm(c.capital),
  }));
}

const summaryOf = (id) => { if (!summaries.has(id)) summaries.set(id, summarize(data, id, thisYear)); return summaries.get(id); };
function lensFor(needId) {
  const key = needId || '';
  if (!lenses.has(key)) {
    const l = lens(data, needId, thisYear);
    lenses.set(key, [null, ...geo.countries.map((c) => (c.id in l ? l[c.id] : null))]);
  }
  return lenses.get(key);
}
const nameOf = (id) => countryName(byId[id], state.lang);
const povertyLine = () => data?.needs.poverty?.line || '3.00';

// ---------- layout ----------
function stageRect() {
  const box = $('map').getBoundingClientRect(), W = box.width, H = box.height;
  if (small.matches) return { x: 10, y: 6, w: W - 20, h: H - 12 };
  const edge = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--edge')) || 44;
  if (state.country) {
    const panel = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel')) || 452;
    return { x: edge + 8, y: 130, w: W - panel - edge * 2 - 40, h: H - 130 - 150 - 76 - 34 };
  }
  const left = Math.min(W * 0.34, 520) + edge - 6;
  return { x: left, y: 104, w: W - left - edge + 8, h: H - 104 - 96 };
}
function layout(animate) {
  if (!geo) return;
  map.setStage(stageRect(), animate);
}
new ResizeObserver(() => { map.resize(); layout(performance.now() < animateUntil); }).observe($('map'));
small.addEventListener('change', () => location.reload()); // dot density is chosen once, at load

// ---------- state changes ----------
function selectCountry(id, { need = null, pin = null, replace = false, keepNeed = false } = {}) {
  if (!byId[id]) return;
  if (map.mode !== 'map') { pending = { id, need, pin, replace, keepNeed }; if (map.ready) map.unfold(); return; }
  const changed = state.country !== id;
  state.country = id;
  state.need = keepNeed ? state.need : need;
  state.pin = pin;
  const c = byId[id];
  map.select(c.i, outlines.get(id));
  if (!outlines.has(id)) get(`geo/outlines/${id}.txt`, 'text').then((d) => { outlines.set(id, d); map.setOutline(c.i, d); }).catch(() => {});
  if (data) map.setLens(lensFor(state.need), changed ? false : true);
  commit(replace);
  if (changed && small.matches) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
}
function selectNeed(needId, replace = false) {
  state.need = needId;
  if (data) map.setLens(lensFor(needId));
  commit(replace);
  $('panel').scrollTo?.({ top: 0 });
}
function goWorld() {
  state.country = null; state.need = null; state.pin = null;
  map.select(0);
  if (data) map.setLens(lensFor(null));
  commit();
}
function commit(replace) {
  animateUntil = performance.now() + 400;
  document.body.classList.toggle('is-country', !!state.country);
  render();
  layout(true);
  placePin();
  const url = shareUrl();
  if (url !== location.pathname + location.search) history[replace ? 'replaceState' : 'pushState'](null, '', url);
}
function shareUrl() {
  const q = new URLSearchParams();
  if (state.country) q.set('c', state.country);
  if (state.country && state.need) q.set('n', state.need);
  if (query.get('lang') || state.lang !== 'en') q.set('lang', state.lang);
  const s = q.toString();
  return location.pathname + (s ? `?${s}` : '');
}
addEventListener('popstate', () => {
  const q = new URLSearchParams(location.search);
  const c = byId[(q.get('c') || '').toUpperCase()];
  if (!c) { state.country = null; state.need = null; state.pin = null; map.select(0); if (data) map.setLens(lensFor(null)); }
  else {
    state.country = c.id; state.need = needById[q.get('n')] ? q.get('n') : null; state.pin = null;
    map.select(c.i, outlines.get(c.id));
    if (!outlines.has(c.id)) get(`geo/outlines/${c.id}.txt`, 'text').then((d) => { outlines.set(c.id, d); map.setOutline(c.i, d); }).catch(() => {});
    if (data) map.setLens(lensFor(state.need));
  }
  animateUntil = performance.now() + 400;
  document.body.classList.toggle('is-country', !!state.country);
  render(); layout(true); placePin();
});

// ---------- rendering ----------
function renderStatic() {
  document.documentElement.lang = state.lang;
  const [a, b, c] = t.h1;
  $('h1').innerHTML = `${esc(a)} <em>${esc(b)}</em>${c.startsWith('-') ? '' : ' '}${esc(c)}`;
  $('lede').textContent = t.lede;
  $('how').firstElementChild.textContent = t.how;
  $('l-place').textContent = t.place; $('l-try').textContent = t.orTry; $('l-click').textContent = t.orClick;
  $('credit').textContent = t.credit;
  $('back').textContent = `← ${t.world}`;
  document.querySelectorAll('.lang button').forEach((b2) => b2.setAttribute('aria-pressed', String(b2.dataset.lang === state.lang)));
  const needs = data ? needsIn(data).length : 12;
  const countries = data ? Object.keys(data.countries).filter((id) => byId[id]).length : 0;
  $('eyebrow').textContent = countries ? t.eyebrow(needs, countries) : t.loading;
  if (data) {
    $('f-count').textContent = t.footCount(countries, needs);
    $('f-source').textContent = data.meta.sample ? t.sample : t.footSource(new Date(data.meta.fetched).toLocaleDateString(state.lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }));
  }
  if (geo) {
    $('chips').innerHTML = ['COD', 'IND', 'BRA'].filter((id) => byId[id]).map((id) => `<button class="chip mono" data-country="${id}">${esc(nameOf(id))}</button>`).join('') + `<button class="chip hot mono" data-act="surprise">${t.surprise}</button>`;
  }
  // Re-label the hero search in place: rebuilding it would throw away
  // whatever the visitor has already typed.
  const field = $('search-hero').querySelector('input');
  if (!field) mountSearch($('search-hero'), false);
  else {
    field.placeholder = t.searchShort; field.setAttribute('aria-label', t.search);
    const here = $('search-hero').querySelector('[data-act="locate"]');
    here.lastElementChild.textContent = t.locate; here.setAttribute('aria-label', t.locate);
  }
}

function render() {
  const panel = $('panel'), pace = $('pace');
  document.title = state.country ? `${nameOf(state.country)} · Unmet` : t.title;
  $('back').hidden = !state.country;
  panel.hidden = !state.country;
  pace.hidden = !state.country || !data;
  if (!state.country) return;
  const country = byId[state.country], name = nameOf(state.country);
  if (!data) { panel.innerHTML = `<section><h2 class="name">${esc(name)}.</h2><p class="mono mut">${t.loading}</p></section>`; return; }
  const summary = summaryOf(state.country);
  const ctx = { t, lang: state.lang, data, geo, summary, country, name, line: povertyLine(), thisYear };
  const a = state.need && summary.list.find((x) => x.need === state.need);
  // Keep the pace strip out of the panel while we rebuild it.
  if (pace.parentElement !== document.body) document.body.insertBefore(pace, panel.nextSibling);
  panel.innerHTML = a ? needPanel({ ...ctx, a }) : countryPanel(ctx);
  pace.innerHTML = paceStrip({ t, summary, thisYear, current: state.need });
  if (small.matches) (panel.querySelector('#pace-slot') || panel).appendChild(pace);
  mountSearch(panel.querySelector('#search-panel'), true);
}

function tickWorld() {
  const lines = needsIn(data).map((n) => {
    const a = world(data, n.id, thisYear);
    return a?.people ? lackParts(t, state.lang, n, a, povertyLine()) : null;
  }).filter(Boolean);
  const el = $('f-world');
  if (!lines.length) return;
  let i = 0;
  const show = () => {
    const [who, what] = lines[i++ % lines.length];
    el.style.opacity = 0;
    setTimeout(() => { el.innerHTML = t.worldLine(`<b>${esc(who)}</b>`, esc(what)); el.style.opacity = 1; }, reduced ? 0 : 450);
  };
  show();
  clearInterval(tickWorld.timer);
  tickWorld.timer = setInterval(show, 5200);
}

// ---------- search ----------
function suggestions(q) {
  const k = norm(q);
  if (!k) return [];
  const out = [];
  for (const p of places) {
    let rank = 9;
    for (const name of p.names) {
      if (name === k) rank = Math.min(rank, 0);
      else if (name.startsWith(k)) rank = Math.min(rank, 1);
      else if (name.split(/[\s-]/).some((w) => w.startsWith(k))) rank = Math.min(rank, 3);
      else if (k.length > 2 && name.includes(k)) rank = Math.min(rank, 5);
    }
    let hint = '';
    if (p.capital && p.capital.startsWith(k) && rank > 2) { rank = 2; hint = t.capitalOf(countryName(p.c, state.lang)); }
    if (rank < 9) out.push({ rank, id: p.c.id, label: hint ? p.c.capital : countryName(p.c, state.lang), hint: hint || p.c.id });
  }
  return out.sort((x, y) => x.rank - y.rank || x.label.localeCompare(y.label)).slice(0, 6);
}

let lookup = null;
async function cities(q, signal) {
  // Towns and cities come from Open-Meteo's free geocoder. If it is slow or
  // unreachable, country search still works on its own.
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${state.lang}&format=json`;
  const res = await fetch(url, { signal });
  if (!res.ok) return [];
  const seen = new Set();
  return ((await res.json()).results || []).map((r) => {
    const c = geo.countries.find((x) => x.a2 === r.country_code);
    if (!c || seen.has(`${r.name}|${c.id}`)) return null;
    seen.add(`${r.name}|${c.id}`);
    return { id: c.id, label: r.name, hint: [r.admin1, countryName(c, state.lang)].filter(Boolean).join(' · '), spot: { lat: r.latitude, lon: r.longitude, label: r.name } };
  }).filter(Boolean).slice(0, 4);
}

function mountSearch(host, inPanel) {
  if (!host) return;
  const id = inPanel ? 'sg-panel' : 'sg-hero';
  host.innerHTML = `<div class="search" role="combobox" aria-expanded="false" aria-haspopup="listbox" aria-owns="${id}">
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="6.3" cy="6.3" r="4.8"/><path d="m10 10 4 4"/></svg>
    <input type="text" inputmode="search" enterkeyhint="go" autocomplete="off" autocapitalize="off" spellcheck="false" aria-autocomplete="list" aria-controls="${id}" aria-label="${esc(t.search)}" placeholder="${esc(t.searchShort)}" value="${inPanel && state.country ? esc(nameOf(state.country)) : ''}">
    ${inPanel ? `<button class="locate mono" data-act="change" style="color:var(--accent)">${t.change}</button>` : `<kbd>/</kbd>&nbsp;&nbsp;<button class="locate mono" data-act="locate" aria-label="${esc(t.locate)}"><svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"><circle cx="6.5" cy="6.5" r="3"/><path d="M6.5 0v3M6.5 10v3M0 6.5h3M10 6.5h3"/></svg><span>${t.locate}</span></button>`}
    <ul class="suggest" id="${id}" role="listbox" hidden></ul>
  </div>`;
  const box = host.firstElementChild, input = box.querySelector('input'), list = box.querySelector('ul');
  let items = [], active = 0, typed = '';
  const paint = () => {
    list.hidden = !typed.trim();
    box.setAttribute('aria-expanded', String(!list.hidden));
    list.innerHTML = items.length
      ? items.map((s, i) => `<li role="option" data-i="${i}" aria-selected="${i === active}"><span>${esc(s.label)}</span><span class="mono">${esc(s.hint)}</span></li>`).join('')
      : `<li class="none">${t.noMatch}</li>`;
  };
  const choose = (s) => {
    if (!s) return;
    list.hidden = true; typed = ''; input.blur();
    let pin = null;
    if (s.spot) { const d = map.nearestDot(s.spot.lon, s.spot.lat, byId[s.id].i); if (d) pin = { ...s.spot, x: d.x, y: d.y }; }
    selectCountry(s.id, { pin });
  };
  input.addEventListener('input', () => {
    typed = input.value; active = 0;
    items = suggestions(typed); paint();
    lookup?.abort();
    const q = typed.trim();
    if (q.length < 3 || items.some((s) => s.rank === 0)) return;
    const mine = (lookup = new AbortController());
    setTimeout(() => {
      if (mine.signal.aborted) return;
      cities(q, mine.signal).then((found) => {
        if (mine.signal.aborted || input.value !== typed) return;
        const have = new Set(items.map((s) => `${norm(s.label)}|${s.id}`));
        items = [...items, ...found.filter((f) => !have.has(`${norm(f.label)}|${f.id}`))].slice(0, 7); paint();
      }).catch(() => {});
    }, 260);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { active = (active + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; paint(); } }
    else if (e.key === 'Enter') { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') { e.stopPropagation(); list.hidden = true; input.blur(); if (inPanel) input.value = nameOf(state.country); }
  });
  input.addEventListener('focus', () => { if (inPanel) input.select(); });
  input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; if (inPanel && state.country) input.value = nameOf(state.country); }, 160));
  list.addEventListener('pointerdown', (e) => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); choose(items[+li.dataset.i]); } });
  box.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'change') { input.value = ''; input.focus(); }
    if (act === 'locate') locate();
  });
}

function locate() {
  if (!navigator.geolocation) return toast(t.locateDenied);
  toast(t.locating);
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    await xyP;
    const d = map.nearestDot(coords.longitude, coords.latitude);
    if (!d || d.degrees > 2.5) return toast(t.locateSea);
    toast('');
    selectCountry(geo.countries[d.owner - 1].id, { pin: { lat: coords.latitude, lon: coords.longitude, x: d.x, y: d.y, label: '' } });
  }, () => toast(t.locateDenied), { timeout: 12000, maximumAge: 600000 });
}

// ---------- small things ----------
function placePin() {
  const el = $('pin'), p = state.pin;
  if (!p || map.mode !== 'map') { el.hidden = true; return; }
  const [x, y] = map.toScreen(p.x, p.y);
  el.hidden = false;
  el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  const deg = (v, pos, neg, width) => `${Math.abs(v).toFixed(2).padStart(width, '0')}°${v >= 0 ? pos : neg}`;
  el.firstElementChild.innerHTML = `${deg(p.lat, 'N', 'S', 5)} ${deg(p.lon, 'E', 'W', 6)}${p.label ? `<b>${esc(p.label)}</b>` : ''}`;
}

const tip = $('tip');
function showTip(title, sub, x, y) {
  tip.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
  const w = tip.offsetWidth + 30;
  tip.style.left = `${Math.min(x, innerWidth - w)}px`; tip.style.top = `${y}px`;
  tip.classList.add('on');
}
function hover(who, x, y) {
  if (!who || !geo) return tip.classList.remove('on');
  const c = geo.countries[who - 1];
  let sub = '';
  if (data) { const s = summaryOf(c.id); sub = s.known && s.measured ? t.tip(s.unmet, s.total) : t.tipNone; }
  showTip(countryName(c, state.lang), sub, x, y);
}
document.addEventListener('pointerover', (e) => {
  const el = e.target.closest?.('[data-tip]');
  if (!el) return;
  const [title, sub] = el.dataset.tip.split('|'), r = el.getBoundingClientRect();
  showTip(title, sub, r.left + r.width / 2 - 14, r.top - 62);
});
document.addEventListener('pointerout', (e) => { if (e.target.closest?.('[data-tip]')) tip.classList.remove('on'); });

let toastTimer = 0;
function toast(message, sticky) {
  const el = $('toast');
  clearTimeout(toastTimer);
  el.textContent = message;
  el.classList.toggle('on', !!message);
  if (message && !sticky) toastTimer = setTimeout(() => el.classList.remove('on'), 3600);
}

async function share() {
  const url = location.origin + shareUrl();
  const title = state.country ? `${nameOf(state.country)} · Unmet` : t.title;
  if (navigator.share && small.matches) { try { await navigator.share({ title, url }); } catch { /* dismissed */ } return; }
  try { await navigator.clipboard.writeText(url); toast(t.copied); } catch { toast(url); }
}

function openAbout(open) {
  const el = $('about');
  el.hidden = !open;
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) { el.innerHTML = aboutHtml({ t, lang: state.lang, data }); el.scrollTop = 0; el.querySelector('button').focus(); } else $('how').focus();
}

function setLang(lang) {
  if (lang === state.lang) return;
  state.lang = lang; t = LANGS[lang]; store.set('unmet.lang', lang);
  buildPlaces(); renderStatic(); render();
  if (data) tickWorld();
  if (!$('about').hidden) openAbout(true);
  history.replaceState(null, '', shareUrl());
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-country],[data-need],[data-act],[data-lang],#how,#back,#brand');
  if (!el || el.closest('.search')) return;
  if (el.id === 'how') return openAbout(true);
  if (el.id === 'back') return goWorld();
  if (el.id === 'brand' || el.matches('.about .brand')) { e.preventDefault(); openAbout(false); return goWorld(); }
  if (el.dataset.lang) return setLang(el.dataset.lang);
  if (el.dataset.country) return selectCountry(el.dataset.country, { keepNeed: el.hasAttribute('data-keep-need') });
  if (el.dataset.need) return selectNeed(el.dataset.need);
  const act = el.dataset.act;
  if (act === 'all') selectNeed(null);
  else if (act === 'share') share();
  else if (act === 'close-about') openAbout(false);
  else if (act === 'surprise' && data) {
    const pool = geo.countries.filter((c) => data.countries[c.id] && summaryOf(c.id).unmet >= 3 && c.id !== state.country);
    if (pool.length) selectCountry(pool[Math.floor(Math.random() * pool.length)].id);
  }
});

addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName);
  if (e.key === 'Escape') {
    if (!$('about').hidden) return openAbout(false);
    if (typing) return;
    if (state.need) return selectNeed(null);
    if (state.country) return goWorld();
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === '/') { e.preventDefault(); (document.querySelector(state.country ? '#panel input' : '#search-hero input'))?.focus(); }
  if (e.key === '?') openAbout($('about').hidden);
});
