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
    <div class="row-actions"><button class="btn mono" data-act="share"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"><path d="M6 8V1M3.5 3.5 6 1l2.5 2.5M1.5 7v3.5h9V7"/></svg>${t.share}</button></div>
  </section>
  <section class="ladder">${['met', 'closing', 'stuck', 'none'].map(cell).join('')}</section>
  <div id="pace-slot"></div>
  <section>
    <div class="sec-h mono"><span>01 /</span><b>${t.needsTitle}</b><span>· ${t.needsOrder}</span></div>
    <ul class="needs">${rows}</ul>
  </section>`;
}

function chart({ t, lang, a, need, thisYear }) {
  const W = 400, H = 172, L = 30, R = 14, T = 14, B = 24;
  const pts = a.points.map(([y, v]) => [y, metShare(need, v)]);
  const goal = goalShare(need);
  const [ly, lv] = pts[pts.length - 1];
  const perYear = a.pace == null ? null : need.kind === 'rate' ? a.pace / 10 : a.pace;
  const landing = a.state === 'closing' ? ly + (goal - lv) / perYear : null;
  const x0 = Math.max(1990, Math.min(2000, pts[0][0]));
  const x1 = landing ? Math.min(HORIZON, Math.max(2040, Math.ceil((landing + 4) / 5) * 5)) : 2045;
  const lo = Math.min(goal, ...pts.map((p) => p[1]));
  const y0 = Math.max(0, Math.floor((lo - (100 - lo) * 0.12 - 2) / 5) * 5), y1 = 100;
  const X = (y) => L + ((y - x0) / (x1 - x0)) * (W - L - R);
  const Y = (v) => T + (1 - (Math.min(y1, Math.max(y0, v)) - y0) / (y1 - y0)) * (H - T - B);
  const f = (v) => v.toFixed(1);
  const seen = pts.filter((p) => p[0] >= x0);
  const d = seen.map((p, i) => `${i ? 'L' : 'M'}${f(X(p[0]))} ${f(Y(p[1]))}`).join('');
  const dots = seen.length <= 9 ? seen.map((p) => `<circle cx="${f(X(p[0]))}" cy="${f(Y(p[1]))}" r="2" fill="#e9e5db"/>`).join('') : '';
  let ahead = '';
  if (landing) {
    const ex = Math.min(landing, x1);
    ahead = `<path d="M${f(X(ly))} ${f(Y(lv))}L${f(X(ex))} ${f(Y(lv + perYear * (ex - ly)))}" stroke="#ff6e30" stroke-width="1.5" stroke-dasharray="3 4" fill="none"/>
      <circle cx="${f(X(ex))}" cy="${f(Y(goal))}" r="3.4" fill="none" stroke="#ff6e30" stroke-width="1.4"/>
      <text class="hot" x="${f(X(ex))}" y="${f(Y(goal) - 9)}" text-anchor="${ex > x1 - 6 ? 'end' : 'middle'}">${a.due ? esc(t.now.toUpperCase()) : a.arrival}</text>`;
  } else if (perYear != null && a.state === 'stuck') {
    const ex = x1;
    ahead = `<path d="M${f(X(ly))} ${f(Y(lv))}L${f(X(ex))} ${f(Y(lv + perYear * (ex - ly)))}" stroke="#ff6e30" stroke-width="1.5" stroke-dasharray="3 4" fill="none"/>`;
  }
  const years = [x0, SDG_YEAR, x1].filter((y, i, all) => all.indexOf(y) === i);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t.needs[need.id].name)}: ${percent(lv, lang)}, ${ly}">
    <line x1="${L}" x2="${W - R}" y1="${f(Y(goal))}" y2="${f(Y(goal))}" stroke="rgba(233,229,219,.3)" stroke-dasharray="1 4"/>
    <text x="${L + 3}" y="${f(Y(goal) - 5)}">${esc(t.goal.toUpperCase())} ${percent(goal, lang)}</text>
    <line x1="${f(X(SDG_YEAR))}" x2="${f(X(SDG_YEAR))}" y1="${T}" y2="${H - B}" stroke="rgba(233,229,219,.16)" stroke-dasharray="2 4"/>
    ${thisYear > ly && thisYear < x1 ? `<line x1="${f(X(thisYear))}" x2="${f(X(thisYear))}" y1="${H - B - 5}" y2="${H - B}" stroke="rgba(233,229,219,.5)"/>` : ''}
    <line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="rgba(233,229,219,.26)"/>
    <text x="${L - 6}" y="${f(Y(y0) + 3)}" text-anchor="end">${y0}</text>
    <text x="${L - 6}" y="${f(Y(y1) + 3)}" text-anchor="end">100</text>
    ${years.map((y) => `<text x="${f(X(y))}" y="${H - 8}" text-anchor="${y === x0 ? 'start' : y === x1 ? 'end' : 'middle'}">${y}</text>`).join('')}
    <path d="${d}" stroke="#e9e5db" stroke-width="1.7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>${dots}${ahead}
    <circle cx="${f(X(ly))}" cy="${f(Y(lv))}" r="3.2" fill="#e9e5db"/>
  </svg>`;
}

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
  ${a.points.length && a.value != null && a.state !== 'none' ? `<section>${chart({ t, lang, a, need, thisYear })}</section>` : ''}
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

export function paceStrip({ t, summary, thisYear, current }) {
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
  return `<div class="sec-h mono"><span>03 /</span><b>${t.paceTitle}</b><span>· ${t.paceSub}</span></div>
  <div class="track">
    <div class="zone"><div class="dots">${by('met').map(btn).join('')}</div><span class="mono">${by('met').length} ${t.states.met}</span></div>
    <div class="axis">${ticks}${marks}</div>
    <div class="zone"><div class="dots">${by('stuck').map(btn).join('')}</div><span class="mono">${by('stuck').length} ${t.paceStuck}</span></div>
  </div>`;
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
