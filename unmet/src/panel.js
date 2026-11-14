// Builds the HTML for the country panel, the single-need view, the pace
// strip and the "How this works" overlay. Strings in, strings out.
import { NEEDS, needById, SDG_YEAR, HORIZON } from './needs.js';
import { goalShortfall, peers, percent, number, needsIn } from './model.js';
import { statLine, lackLine, countryName } from './i18n.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const glyph = (state) => `<i class="g g-${state}" aria-hidden="true"></i>`;

/** Every need drawn on one scale: the share of people for whom it is met. */
export const metShare = (need, value) => (need.kind === 'access' ? value : need.kind === 'lack' ? 100 - value : 100 - value / 10);
const goalShare = (need) => metShare(need, need.goal);

const ORDER = { stuck: 0, closing: 1, none: 2, met: 3 };
export function ranked(list) {
  return [...list].sort((a, b) => {
    if (ORDER[a.state] !== ORDER[b.state]) return ORDER[a.state] - ORDER[b.state];
    const gap = (x) => (x.short == null ? 0 : (x.short - goalShortfall(needById[x.need])) / (needById[x.need].kind === 'rate' ? 10 : 1));
    return gap(b) - gap(a);
  });
}

const reason = (t, a) => t.reason[a.reason](a);

export function countryPanel({ t, lang, summary, name, line }) {
  const { list, total, unmet, measured, known } = summary;
  const head = !known || !measured ? t.headlineNone : unmet === 0 ? t.headlineAll(measured) : t.headline(unmet, total);
  const withPeople = list.filter((a) => a.people != null).sort((a, b) => b.people - a.people)[0];
  const worst = ranked(list).find((a) => a.state === 'stuck' || a.state === 'closing');
  let widest = '';
  if (withPeople) widest = `<p class="widest">${t.widest} <b>${esc(lackLine(t, lang, needById[withPeople.need], withPeople, line))}.</b></p>`;
  else if (worst) widest = `<p class="widest">${t.widestRate} <b>${esc(statLine(t, lang, needById[worst.need], worst, line))}.</b></p>`;
  else if (!known || !measured) widest = `<p class="widest">${esc(t.noneBody(name))}</p>`;

  const cell = (state) => `<div class="s-${state}" title="${esc(t.stateHelp[state])}"${summary[state] ? '' : ' data-zero'}><strong>${glyph(state)}${summary[state]}</strong><span class="mono">${t.states[state]}</span></div>`;
  const rows = ranked(list).map((a) => {
    const need = needById[a.need];
    const share = a.value == null || a.state === 'none' ? null : metShare(need, a.value);
    return `<li><button class="need s-${a.state}" data-need="${a.need}">
      <span class="n-name">${esc(t.needs[a.need].name)}</span>
      <span class="n-val">${share == null ? '—' : percent(share, lang)}</span>
      <span class="bar">${share == null ? '' : `<i style="width:${Math.max(0.8, share).toFixed(1)}%"></i>`}<u style="left:${goalShare(need)}%"></u></span>
      <span class="n-state mono">${glyph(a.state)}<b>${t.states[a.state]}</b>${a.state === 'met' && !a.since ? '' : `<span>· ${esc(reason(t, a))}</span>`}</span>
    </button></li>`;
  }).join('');

  return `<header><div id="search-panel"></div></header>
  <section>
    <h2 class="name">${esc(name)}.</h2>
    <p class="verdict">${esc(head)}</p>${widest}
    <div class="row-actions"><button class="btn mono" data-act="share"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="M6 8V1M3.5 3.5 6 1l2.5 2.5M1.5 7v3.5h9V7"/></svg>${t.share}</button><button class="btn mono" data-act="compare"><svg width="13" height="12" viewBox="0 0 13 12" fill="none" stroke="currentColor"><path d="M1 3.5h9M7.5 1 10 3.5 7.5 6M12 8.5H3M5.5 6 3 8.5 5.5 11"/></svg>${t.compare}</button></div>
  </section>
  <section class="ladder">${['met', 'closing', 'stuck', 'none'].map(cell).join('')}</section>
  <div id="pace-slot"></div>
  <section>
    <div class="sec-h mono"><span>01 /</span><b>${t.needsTitle}</b><span>· ${t.needsOrder}</span></div>
    <ul class="needs">${rows}</ul>
  </section>`;
}

/**
 * The trend chart. One line per country in `series`; `line` and `ahead` are
 * the CSS colours of its readings and of its dashed projection.
 */
function chart({ t, lang, need, thisYear, series }) {
  const W = 400, H = 172, L = 30, R = 14, T = 14, B = 24;
  const goal = goalShare(need);
  const lines = series.map(({ a, line, ahead }) => {
    const pts = a.points.map(([y, v]) => [y, metShare(need, v)]);
    const [ly, lv] = pts[pts.length - 1];
    const perYear = a.pace == null ? null : need.kind === 'rate' ? a.pace / 10 : a.pace;
    return { a, pts, ly, lv, perYear, line, ahead, landing: a.state === 'closing' ? ly + (goal - lv) / perYear : null };
  });
  const furthest = Math.max(0, ...lines.map((l) => l.landing || 0));
  const x0 = Math.max(1990, Math.min(2000, ...lines.map((l) => l.pts[0][0])));
  const x1 = furthest ? Math.min(HORIZON, Math.max(2040, Math.ceil((furthest + 4) / 5) * 5)) : 2045;
  const lo = Math.min(goal, ...lines.flatMap((l) => l.pts.map((p) => p[1])));
  const y0 = Math.max(0, Math.floor((lo - (100 - lo) * 0.12 - 2) / 5) * 5), y1 = 100;
  const X = (y) => L + ((y - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v) => T + (1 - (Math.min(y1, Math.max(y0, v)) - y0) / (y1 - y0)) * (H - T - B);
  const f = (v) => v.toFixed(1);
  const drawn = lines.map((l, n) => {
    const seen = l.pts.filter((p) => p[0] >= x0);
    const d = seen.map((p, i) => `${i ? 'L' : 'M'}${f(X(p[0]))} ${f(Y(p[1]))}`).join('');
    const dots = seen.length <= 9 ? seen.map((p) => `<circle cx="${f(X(p[0]))}" cy="${f(Y(p[1]))}" r="2" style="fill:${l.line}"/>`).join('') : '';
    const dash = (ex) => `<path d="M${f(X(l.ly))} ${f(Y(l.lv))}L${f(X(ex))} ${f(Y(l.lv + l.perYear * (ex - l.ly)))}" style="stroke:${l.ahead}" stroke-width="1.5" stroke-dasharray="3 4" fill="none"/>`;
    let ahead = '';
    if (l.landing) {
      const ex = Math.min(l.landing, x1);
      // A second country's year sits under the goal line, so two labels never collide.
      ahead = `${dash(ex)}<circle cx="${f(X(ex))}" cy="${f(Y(goal))}" r="3.4" fill="none" style="stroke:${l.ahead}" stroke-width="1.4"/>
      <text style="fill:${l.ahead}" x="${f(X(ex))}" y="${f(Y(goal) + (n ? 16 : -9))}" text-anchor="${ex > x1 - 6 ? 'end' : 'middle'}">${l.a.due ? esc(t.now.toUpperCase()) : l.a.arrival}</text>`;
    } else if (l.perYear != null && l.a.state === 'stuck') ahead = dash(x1);
    return `<path d="${d}" style="stroke:${l.line}" stroke-width="1.7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>${dots}${ahead}
    <circle cx="${f(X(l.ly))}" cy="${f(Y(l.lv))}" r="3.2" style="fill:${l.line}"/>`;
  }).join('');
  const latest = Math.max(...lines.map((l) => l.ly));
  const years = [x0, SDG_YEAR, x1].filter((y, i, all) => all.indexOf(y) === i);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.needs[need.id].name)}: ${lines.map((l) => `${percent(l.lv, lang)} (${l.ly})`).join(', ')}">
    <line x1="${L}" x2="${W - R}" y1="${f(Y(goal))}" y2="${f(Y(goal))}" stroke="rgba(233,229,219,.3)" stroke-dasharray="1 4"/>
    <text x="${L + 3}" y="${f(Y(goal) - 5)}">${esc(t.goal.toUpperCase())} ${percent(goal, lang)}</text>
    <line x1="${f(X(SDG_YEAR))}" x2="${f(X(SDG_YEAR))}" y1="${T}" y2="${H - B}" stroke="rgba(233,229,219,.16)" stroke-dasharray="2 4"/>
    ${thisYear > latest && thisYear < x1 ? `<line x1="${f(X(thisYear))}" x2="${f(X(thisYear))}" y1="${H - B - 5}" y2="${H - B}" stroke="rgba(233,229,219,.5)"/>` : ''}
    <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="rgba(233,229,219,.26)"/>
    <text x="${L - 6}" y="${f(Y(y0) + 3)}" text-anchor="end">${y0}</text>
    <text x="${L - 6}" y="${f(Y(y1) + 3)}" text-anchor="end">100</text>
    ${years.map((y) => `<text x="${f(X(y))}" y="${H - 8}" text-anchor="${y === x0 ? 'start' : y === x1 ? 'end' : 'middle'}">${y}</text>`).join('')}
    ${drawn}
  </svg>`;
}
const charted = (a) => a.points.length && a.value != null && a.state !== 'none';

export function needPanel({ t, lang, data, geo, summary, country, name, a, line, thisYear }) {
  const need = needById[a.need];
  const words = t.needs[need.id];
  const order = needsIn(data).map((n) => n.id);
  const at = order.indexOf(need.id);
  const lack = lackLine(t, lang, need, a, line);
  const stat = statLine(t, lang, need, a, line);
  const big = a.value == null ? reason(t, a) : cap(lack || stat);
  const sub = a.value == null ? '' : `${lack ? `${cap(stat)} · ` : ''}${t.reading(a.year)}`;
  const info = data.needs[need.id] || {};

  let done = '';
  if (a.state === 'closing' || a.state === 'stuck') {
    const list = peers(data, need.id, country.id);
    const byId = Object.fromEntries(geo.countries.map((c) => [c.id, c]));
    const fmt = (v) => (need.kind === 'rate' ? `${number(v, lang, 0)} ${words.unit}` : percent(metShare(need, v), lang));
    const items = list.filter((p) => byId[p.id]).map((p) => `<li><button class="peer" data-country="${p.id}" data-keep-need>
        <b>${esc(countryName(byId[p.id], lang))}</b><i>${t.years(p.years)}</i>
        <span>${esc((p.reached ? t.peerReached : t.peerClimbed)(p, fmt(p.fromValue), fmt(p.toValue)))}</span>
      </button></li>`).join('');
    done = `<section><div class="sec-h mono"><span>02 /</span><b>${t.done}</b></div>
      ${items ? `<p class="fine" style="margin-bottom:6px">${cap(t.doneSub)}.</p><ul class="peers">${items}</ul>` : `<p class="fine">${t.doneNone}</p>`}</section>`;
  }
  // The starter reads `problem` as an editable first line (see community-starter).
  const seed = a.value == null ? '' : t.seed(name, lack || stat, a.year);
  const href = `/start-a-solution?from=unmet&place=${encodeURIComponent(country.name)}&need=${need.id}${seed ? `&problem=${encodeURIComponent(seed)}` : ''}`;
  return `<header><div id="search-panel"></div></header>
  <section class="s-${a.state}">
    <div class="d-top mono">
      <button data-act="all">← ${t.allNeeds}</button>
      <span class="d-nav"><button data-need="${order[(at - 1 + order.length) % order.length]}" aria-label="‹">‹</button>${at + 1} / ${order.length}<button data-need="${order[(at + 1) % order.length]}" aria-label="›">›</button></span>
    </div>
    <div class="sec-h mono" style="margin:20px 0 0"><b>${esc(words.name)}</b><span>· ${esc(name)}</span></div>
    <h2 class="d-h">${esc(big)}.</h2>
    ${sub ? `<p class="d-sub">${esc(sub)}</p>` : ''}
  </section>
  ${charted(a) ? `<section>${chart({ t, lang, need, thisYear, series: [{ a, line: 'var(--ink)', ahead: 'var(--accent)' }] })}</section>` : ''}
  <section class="s-${a.state}">
    <div class="pace-big"><span class="mono mut">${glyph(a.state)}&nbsp; ${t.states[a.state]}<br>${t.atThisPace}</span><strong>${esc(t.paceBig[a.reason](a))}</strong></div>
    <p class="pace-note">${esc(t.paceNote[a.reason](a, SDG_YEAR))}</p>
  </section>
  ${done}
  <section>
    <a class="cta" href="${href}"><span><strong>${t.start}</strong><span>${esc(t.startFor(name, words.name))}</span></span>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11h14M12 5l6 6-6 6"/></svg></a>
    <p class="fine" style="margin-top:12px">${t.startNote}</p>
  </section>
  <section><p class="fine"><span class="mono">${t.source}</span><br>${esc(t.sourceLine(info.name || need.code, need.code))} ${t.goal}: ${esc(t.goalText(need))}.</p></section>`;
}

function paceTrack({ t, summary, thisYear, current, side = '' }) {
  const pos = (year) => Math.pow(Math.min(1, Math.max(0, (year - thisYear) / (HORIZON - thisYear))), 0.62) * 100;
  const tipOf = (a) => `data-tip="${esc(t.needs[a.need].name)}|${esc(reason(t, a))}"`;
  const btn = (a) => `<button data-need="${a.need}" ${tipOf(a)} aria-label="${esc(t.needs[a.need].name)}"${current === a.need ? ' aria-current="true"' : ''}>${glyph(a.state)}</button>`;
  const by = (state) => summary.list.filter((a) => a.state === state);
  const closing = by('closing').sort((a, b) => a.arrival - b.arrival);
  let lastX = -99, row = 0;
  const marks = closing.map((a) => {
    const x = pos(a.arrival);
    row = x - lastX < 5.5 ? (row + 1) % 3 : 0;
    lastX = x;
    return `<button class="mark" style="left:${x.toFixed(1)}%;top:${30 - row * 13}px" data-need="${a.need}" ${tipOf(a)} aria-label="${esc(t.needs[a.need].name)}: ${a.arrival}"${current === a.need ? ' aria-current="true"' : ''}>${glyph('closing')}</button>`;
  }).join('');
  const ticks = [[thisYear, t.now], [SDG_YEAR, SDG_YEAR], [2050, 2050], [2075, 2075], [HORIZON, HORIZON]]
    .map(([y, label]) => `<span class="yr mono${y === SDG_YEAR ? ' sdg' : y === 2075 ? ' far' : ''}" style="left:${pos(y).toFixed(1)}%">${label}</span>`).join('');
  return `<div class="track ${side}">
    <div class="zone"><div class="dots">${by('met').map(btn).join('')}</div><span class="mono">${by('met').length} ${t.states.met}</span></div>
    <div class="axis">${ticks}${marks}</div>
    <div class="zone"><div class="dots">${by('stuck').map(btn).join('')}</div><span class="mono">${by('stuck').length} ${t.paceStuck}</span></div>
  </div>`;
}
const paceHead = (t) => `<div class="sec-h mono"><span>03 /</span><b>${t.paceTitle}</b><span>· ${t.paceSub}</span></div>`;

export function paceStrip({ t, summary, thisYear, current }) {
  return paceHead(t) + paceTrack({ t, summary, thisYear, current });
}

/** Two countries on the same time axis, one above the other. */
export function comparePace({ t, A, B, nameA, nameB, thisYear, current }) {
  return `${paceHead(t)}
  <div class="who is-a mono">${esc(nameA)}</div>${paceTrack({ t, summary: A, thisYear, current, side: 'is-a' })}
  <div class="who is-b mono">${esc(nameB)}</div>${paceTrack({ t, summary: B, thisYear, current, side: 'is-b' })}`;
}

// ---------- comparing two countries ----------
const shortPace = (t, a) => (a.state === 'met' ? t.states.met : a.state === 'none' ? '—' : t.paceBig[a.reason](a));
const icons = {
  share: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="M6 8V1M3.5 3.5 6 1l2.5 2.5M1.5 7v3.5h9V7"/></svg>',
  swap: '<svg width="13" height="12" viewBox="0 0 13 12" fill="none" stroke="currentColor"><path d="M1 3.5h9M7.5 1 10 3.5 7.5 6M12 8.5H3M5.5 6 3 8.5 5.5 11"/></svg>',
};

/** Shown while the visitor is choosing the second country. */
export function pickPanel({ t, name, nearby }) {
  const [before, , after] = t.compareWith(name);
  return `<header><div id="search-panel"></div></header>
  <section>
    <h2 class="pick-h">${esc(before)} <em>${esc(name)}</em> ${esc(after)}</h2>
    <p class="widest">${t.comparePick}</p>
    ${nearby.length ? `<div class="label mono" style="margin-top:26px"><span>${t.nearby}</span></div>
    <div class="chips">${nearby.map((c) => `<button class="chip mono" data-vs="${c.id}">${esc(c.name)}</button>`).join('')}</div>` : ''}
    <div class="row-actions" style="margin-top:28px"><button class="btn mono" data-act="end-compare">${t.cancel}</button></div>
  </section>`;
}

export function comparePanel({ t, lang, A, B, nameA, nameB }) {
  const usable = (s) => s.known && s.measured;
  const verdict = !usable(A) ? t.compareNoData(nameA) : !usable(B) ? t.compareNoData(nameB)
    : A.unmet === B.unmet ? t.compareEqual(A.unmet, A.total)
    : t.compareFewer(A.unmet < B.unmet ? nameA : nameB, Math.abs(A.unmet - B.unmet));
  const side = (s, name, cls) => `<div class="${cls}"><h2 class="name">${esc(name)}</h2><span class="mono">${usable(s) ? t.unmetOf(s.unmet, s.total) : t.headlineNone}</span></div>`;
  const tally = ['met', 'closing', 'stuck', 'none'].map((state) => `<div class="s-${state}"><span class="mono">${glyph(state)}${t.states[state]}</span><b class="is-a">${A[state]}</b><b class="is-b">${B[state]}</b></div>`).join('');

  const pairs = A.list.map((a, i) => {
    const b = B.list[i], need = needById[a.need];
    const sa = a.state === 'none' || a.value == null ? null : metShare(need, a.value);
    const sb = b.state === 'none' || b.value == null ? null : metShare(need, b.value);
    return { a, b, need, sa, sb, gap: sa == null || sb == null ? -1 : Math.abs(sa - sb) };
  }).sort((x, y) => y.gap - x.gap);
  const line = (a, share, need, cls, lead) => `<span class="cmp-line ${cls} s-${a.state}">${glyph(a.state)}
      <span class="bar">${share == null ? '' : `<i style="width:${Math.max(0.8, share).toFixed(1)}%"></i>`}<u style="left:${goalShare(need)}%"></u></span>
      <b${lead ? ' class="lead"' : ''}>${share == null ? '—' : percent(share, lang)}</b><span class="mono">${esc(shortPace(t, a))}</span></span>`;
  const rows = pairs.map(({ a, b, need, sa, sb, gap }) => {
    const points = Math.round(gap);
    const ahead = gap < 0 || points === 0 ? '' : t.ahead(sa > sb ? nameA : nameB, points);
    return `<li><button class="cmp" data-need="${a.need}">
      <span class="n-name">${esc(t.needs[a.need].name)}</span><span class="cmp-gap mono">${esc(ahead)}</span>
      ${line(a, sa, need, 'is-a', sa != null && sb != null && sa > sb)}${line(b, sb, need, 'is-b', sa != null && sb != null && sb > sa)}
    </button></li>`;
  }).join('');

  return `<header><div id="search-panel"></div></header>
  <section>
    <div class="cmp-names">${side(A, nameA, 'is-a')}<span class="vs mono">${t.vs}</span>${side(B, nameB, 'is-b')}</div>
    <p class="verdict">${esc(verdict)}</p>
    <div class="row-actions">
      <button class="btn mono" data-act="swap">${icons.swap}${t.swap}</button>
      <button class="btn mono" data-act="share">${icons.share}${t.share}</button>
      <button class="btn mono" data-act="end-compare">× ${t.endCompare}</button>
    </div>
  </section>
  <section class="tally"><div class="tally-h mono"><span></span><b class="is-a">${esc(nameA)}</b><b class="is-b">${esc(nameB)}</b></div>${tally}</section>
  <div id="pace-slot"></div>
  <section>
    <div class="sec-h mono"><span>01 /</span><b>${t.needsTitle}</b><span>· ${t.compareOrder}</span></div>
    <ul class="needs">${rows}</ul>
  </section>`;
}

/** One need, both countries: the two trends on one chart, then each country's own line. */
export function compareNeedPanel({ t, lang, data, a, b, countryA, nameA, nameB, line, thisYear }) {
  const need = needById[a.need], words = t.needs[need.id];
  const order = needsIn(data).map((n) => n.id), at = order.indexOf(need.id);
  const info = data.needs[need.id] || {};
  const series = [{ a, line: 'var(--accent)', ahead: 'var(--accent)' }, { a: b, line: 'var(--ink)', ahead: 'var(--ink)' }].filter((x) => charted(x.a));
  const block = (x, name, cls, id) => {
    const fact = x.value == null ? reason(t, x) : cap(lackLine(t, lang, need, x, line) || statLine(t, lang, need, x, line));
    return `<div class="cmp-block ${cls} s-${x.state}">
      <h3 class="name">${esc(name)}</h3>
      <p class="fact">${esc(fact)}.</p>
      <p class="mono mut">${glyph(x.state)}&nbsp; ${esc(x.state === 'met' || x.state === 'none' ? reason(t, x) : `${t.states[x.state]} · ${shortPace(t, x)}`)}${x.year && x.state !== 'none' ? ` · ${esc(t.reading(x.year))}` : ''}</p>
      <button class="solo mono" data-solo="${id}">${esc(t.alone(name))} →</button>
    </div>`;
  };
  const seed = a.value == null ? '' : t.seed(nameA, lackLine(t, lang, need, a, line) || statLine(t, lang, need, a, line), a.year);
  const href = `/start-a-solution?from=unmet&place=${encodeURIComponent(countryA.name)}&need=${need.id}${seed ? `&problem=${encodeURIComponent(seed)}` : ''}`;
  return `<header><div id="search-panel"></div></header>
  <section>
    <div class="d-top mono">
      <button data-act="all">← ${t.allNeeds}</button>
      <span class="d-nav"><button data-need="${order[(at - 1 + order.length) % order.length]}" aria-label="‹">‹</button>${at + 1} / ${order.length}<button data-need="${order[(at + 1) % order.length]}" aria-label="›">›</button></span>
    </div>
    <div class="sec-h mono" style="margin:20px 0 0"><b>${esc(words.name)}</b><span>· ${esc(nameA)} ${t.vs} ${esc(nameB)}</span></div>
  </section>
  ${series.length ? `<section>${chart({ t, lang, need, thisYear, series })}</section>` : ''}
  <section class="cmp-blocks">${block(a, nameA, 'is-a', a.id)}${block(b, nameB, 'is-b', b.id)}</section>
  <section>
    <a class="cta" href="${href}"><span><strong>${t.start}</strong><span>${esc(t.startFor(nameA, words.name))}</span></span>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11h14M12 5l6 6-6 6"/></svg></a>
  </section>
  <section><p class="fine"><span class="mono">${t.source}</span><br>${esc(t.sourceLine(info.name || need.code, need.code))} ${t.goal}: ${esc(t.goalText(need))}.</p></section>`;
}

export function aboutHtml({ t, lang, data }) {
  const a = t.about;
  const date = (iso) => (iso ? new Date(iso).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const rows = NEEDS.filter((n) => data?.series[n.id]).map((n) => `<tr><td>${esc(t.needs[n.id].name)}</td>
      <td>${esc(data.needs[n.id]?.name || n.code)}<small>${n.code} · SDG ${n.sdg}</small></td>
      <td><b>${esc(t.goalText(n))}</b><br>${esc(t.why[n.why])}</td></tr>`).join('');
  const pairs = (list) => `<dl>${list.map(([k, v]) => `<div><dt class="mono">${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  return `<header><div><a class="brand" href="/unmet/">Unmet<i>.</i></a><span class="mono mut">/ ${a.crumb}</span></div>
    <button class="mono" data-act="close-about">${a.close} <kbd>ESC</kbd></button></header>
  <article>
    <h2 id="about-h">${a.h[0]}<br><em>${a.h[1]}</em></h2>
    <p class="lede">${a.lede}</p>
    <div class="num mono">00</div><h3>${a.short}</h3>${pairs(a.qa)}
    <div class="num mono">01</div><h3>${a.where}</h3><p>${a.whereBody}</p>
    <table><thead><tr><th>${a.tableNeed}</th><th>${a.tableMeasure}</th><th>${a.tableGoal}</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="num mono">02</div><h3>${a.labels}</h3>
    ${pairs(['met', 'closing', 'stuck', 'none'].map((s) => [`${glyph(s)} ${t.states[s]}`, t.stateHelp[s]]))}
    <div class="num mono">03</div><h3>${a.pace}</h3>${pairs(a.paceBody)}
    <div class="num mono">04</div><h3>${a.limits}</h3><p>${a.limitsBody}</p>
    <div class="num mono">05</div><h3>${a.map}</h3><p>${a.mapBody}</p>
    <p class="mono mut" style="margin-top:64px">${data ? esc(a.data(date(data.meta.fetched), data.meta.updated)) : ''}<br>${a.made}</p>
  </article>`;
}
