// The HTML of every screen. Strings in, strings out: no state lives here, so
// the same functions draw the solo game, a player's phone and the host's big
// screen. main.js decides which to show and fills in the live parts.
import * as E from './engine.js';
import { howVideoUrl } from './config.js';
import { LANGS, needName, questionHtml, saidLine, peopleLine, paceLine } from './strings.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const arrow = '<svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M0 6h14M9.5 1.5 14 6l-4.5 4.5"/></svg>';
const h1 = ([a, b, c]) => `${esc(a)} <em>${esc(b)}</em>${c ? (/^[-?.]/.test(c) ? '' : ' ') + esc(c) : ''}`;
const label = (n, text, right = '') => `<div class="label mono"><span>${n} / <b>${esc(text)}</b></span>${right ? `<span>${right}</span>` : ''}</div>`;

// ---------- landing ----------
export function landing({ t, tagline, day, today, resume, solo }) {
  return `<section class="col hero">
    <div class="eyebrow mono">${esc(tagline || t.tagline)}</div>
    <h1>${h1(t.h1)}</h1>
    <p class="lede">${esc(t.lede)}</p>
    ${label('01', t.joinLabel)}
    <form class="code-form" data-form="code" autocomplete="off">
      <input class="code-input mono" id="code" name="code" inputmode="text" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="4" placeholder="${esc(t.codePlaceholder)}" aria-label="${esc(t.joinLabel)}">
      <button class="go mono" type="submit">${esc(t.join)} ${arrow}</button>
    </form>
    <p class="form-note mono" id="code-note" role="alert"></p>
    <div class="alt">
      ${label('02', t.or)}
      <div class="choices">
        <button class="choice" data-act="host"><b>${esc(t.host)}</b><span class="mono">${esc(t.hostSub)}</span></button>
        ${solo ? `<button class="choice hot" data-act="solo"><b>${esc(t.solo)}</b><span class="mono">${esc(today ? t.soloDone(today.score, today.max) : t.soloSub(day))}</span></button>` : ''}
      </div>
      <button class="watch mono" data-act="watch"><span class="watch-icon" aria-hidden="true"><svg width="8" height="10" viewBox="0 0 8 10"><path d="M0 0l8 5-8 5z" fill="currentColor"/></svg></span>${esc(t.watch)} <span class="watch-len">· ${esc(t.watchLen)}</span></button>
      ${resume ? `<button class="resume mono" data-act="resume" data-code="${esc(resume)}">${esc(t.resume(resume))} ${arrow}</button>` : ''}
    </div>
    <a class="credit mono" href="/">${esc(t.credit)}</a>
  </section>`;
}

// ---------- joining ----------
export function nameStep({ t, code, value, busy, error }) {
  return `<section class="col hero">
    <div class="eyebrow mono">${esc(t.roomLabel(code))}</div>
    <h1>${h1(t.nameH)}</h1>
    <form class="code-form name-form" data-form="name" autocomplete="off">
      <input class="name-input" id="name" name="name" maxlength="16" enterkeyhint="go" autocapitalize="words" spellcheck="false" placeholder="${esc(t.namePlaceholder)}" value="${esc(value || '')}" aria-label="${esc(t.namePlaceholder)}">
      <button class="go mono" type="submit"${busy ? ' disabled' : ''}>${esc(busy ? t.joining : t.enter)} ${arrow}</button>
    </form>
    <p class="form-note mono" id="name-note" role="alert">${esc(error || '')}</p>
    <p class="fine">${esc(t.nameHint)}</p>
    <button class="back-link mono" data-act="home">← ${esc(t.back)}</button>
  </section>`;
}
export const busy = ({ t, text }) => `<section class="col hero"><div class="eyebrow mono">${esc(text || t.loading)}</div><div class="pulse" aria-hidden="true"><i></i><i></i><i></i></div></section>`;

// ---------- people ----------
/** Name chips. `done` is a set of pids to mark (answered); `host` enables the remove/rename menu. */
export function peopleHtml(list, { t, me = null, done = null, hostPid = null, manage = false } = {}) {
  if (!list.length) return `<p class="empty mono">${esc(t.noPlayers)}</p>`;
  return list.map(([pid, p]) => {
    const cls = ['person', pid === me && 'me', p.on === false && 'off', done?.has(pid) && 'done'].filter(Boolean).join(' ');
    const tag = pid === me ? t.you : pid === hostPid ? t.hostTag : p.on === false ? t.away : '';
    const inner = `<b>${esc(p.name)}</b>${tag ? `<span class="mono">${esc(tag)}</span>` : ''}`;
    return manage ? `<button class="${cls}" data-act="manage" data-pid="${esc(pid)}" title="${esc(t.remove)} / ${esc(t.rename)}">${inner}</button>` : `<span class="${cls}">${inner}</span>`;
  }).join('');
}

// ---------- lobby ----------
const seg = (name, options, current) => `<div class="seg mono" role="group">${options.map(([v, text]) => `<button data-act="cfg" data-key="${name}" data-value="${esc(v)}" aria-pressed="${String(v) === String(current)}">${esc(text)}</button>`).join('')}</div>`;
const toggle = (act, key, on, text) => `<button class="tog" data-act="${act}" data-key="${key}" role="switch" aria-checked="${!!on}"><i></i><span>${esc(text)}</span></button>`;

export function lobbyHost({ t, lang, links, code, qrSvg, welcome, cfg, list, me, plays, showQr, nameValue }) {
  const topics = cfg.topics ? cfg.topics.split(',') : [];
  return `<section class="col lobby">
    ${welcome ? `<p class="welcome">${esc(welcome)}</p>` : ''}
    <div class="eyebrow mono">${esc(t.joinAt)}</div>
    <div class="addr">${esc(links.typed)}</div>
    <div class="code-row">
      <div><div class="label mono"><span>${esc(t.codeIs)}</span></div><div class="room-code mono" aria-label="${esc(code.split('').join(' '))}">${esc(code)}</div></div>
      ${showQr && qrSvg ? `<button class="qr-card" data-act="invite" aria-label="${esc(t.scan)}">${qrSvg}<span class="mono">${esc(t.scan)}</span></button>` : ''}
    </div>
    <div class="row-actions">
      <button class="btn mono" data-act="copy-link">${esc(t.copyLink)}</button>
      <button class="btn mono" data-act="invite">${esc(t.invite)}</button>
    </div>
  </section>
  <aside class="side">
    <section>
      <div class="sec-h mono"><b>${esc(t.players)}</b><span id="count">· ${list.length}</span></div>
      <div class="people" id="people">${peopleHtml(list, { t, me, manage: true })}</div>
    </section>
    <section class="opts">
      <details${plays ? '' : ''}>
        <summary class="mono">${esc(t.options)}</summary>
        <div class="opt"><span class="mono">${esc(t.rounds)}</span>${seg('rounds', [[5, '5'], [6, '6'], [8, '8'], [10, '10']], cfg.rounds)}</div>
        <div class="opt"><span class="mono">${esc(t.timer)}</span>${seg('secs', [[15, '15'], [20, '20'], [30, '30'], [45, '45']], cfg.secs)}</div>
        <div class="opt"><span class="mono">${esc(t.region)}</span><select class="pick-region mono" data-change="region" aria-label="${esc(t.region)}">${E.REGION_IDS.map((id) => `<option value="${id}"${id === cfg.region ? ' selected' : ''}>${esc(t.regions[id])}</option>`).join('')}</select></div>
        <div class="opt wrap"><span class="mono">${esc(t.topics)}</span><div class="topic-chips">
          <button class="chip mono" data-act="topic" data-value="" aria-pressed="${!topics.length}">${esc(t.allTopics)}</button>
          ${E.TOPIC_IDS.map((id) => `<button class="chip mono" data-act="topic" data-value="${id}" aria-pressed="${topics.includes(id)}">${esc(needName(lang, id))}</button>`).join('')}
        </div></div>
        ${toggle('cfg-toggle', 'auto', cfg.auto, t.auto)}
        ${toggle('cfg-toggle', 'locked', cfg.locked, t.lock)}
        ${toggle('cfg-toggle', 'email', cfg.email, t.askEmail)}
        ${toggle('ui-toggle', 'qr', showQr, t.showQr)}
      </details>
      ${toggle('plays', 'plays', plays, t.hostPlays)}
      <form class="inline-name" data-form="host-name" ${plays ? '' : 'hidden'} autocomplete="off">
        <input class="name-input" name="name" maxlength="16" placeholder="${esc(t.namePlaceholder)}" value="${esc(nameValue || '')}" aria-label="${esc(t.namePlaceholder)}">
        <button class="go mono" type="submit">${esc(t.enter)}</button>
      </form>
      <p class="form-note mono" id="host-note" role="alert"></p>
    </section>
    <section class="start">
      <button class="cta" data-act="start" id="start"${list.length ? '' : ' disabled'}><span><strong>${esc(t.start)}</strong><span id="start-sub">${esc(list.length ? t.startSub(cfg.rounds, cfg.secs) : t.startNeed)}</span></span>${arrow}</button>
    </section>
  </aside>`;
}

export function lobbyPlayer({ t, name, list, me, hostPid, welcome }) {
  return `<section class="col lobby">
    ${welcome ? `<p class="welcome">${esc(welcome)}</p>` : ''}
    <div class="eyebrow mono">${esc(t.youAreIn[0])}</div>
    <h1 class="you-name"><em>${esc(name)}</em>.</h1>
    <p class="lede">${esc(t.waitHost)}</p>
    <div class="pulse" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="row-actions">
      <button class="btn mono" data-act="invite">${esc(t.invite)}</button>
      <button class="btn mono" data-act="edit-name">${esc(t.editName)}</button>
      <button class="btn mono" data-act="leave">${esc(t.leave)}</button>
    </div>
  </section>
  <aside class="side">
    <section>
      <div class="sec-h mono"><b>${esc(t.players)}</b><span id="count">· ${list.length}</span></div>
      <div class="people" id="people">${peopleHtml(list, { t, me, hostPid })}</div>
    </section>
  </aside>`;
}

// ---------- a round ----------
function roundHead({ t, lang, i, n, q }) {
  const badge = q.x2 ? `<span class="badge mono">${esc(i === n - 1 ? `${t.final} · ${t.double}` : t.double)}</span>` : '';
  return `<div class="round-head mono"><span>${esc(t.round(i + 1, n))}</span><b>${esc(needName(lang, q.need))}</b>${badge}<span class="secs" id="secs" aria-live="off"></span></div>`;
}

/**
 * The question, and (for anyone playing) the control to answer it.
 *   role     { host, plays }
 *   mine     the answer already locked in, or null
 *   answered { got, of, html }  shown to the host
 */
export function guess({ t, lang, i, n, q, names, line, role, mine, answered, solo }) {
  const question = `<h2 class="q">${questionHtml(lang, q, { [q.a]: `${esc(names[q.a])}` }, line)}</h2>`;
  let control = '';
  if (role.plays) {
    if (q.t === 'duel') {
      control = `<div class="duel" id="duel">
        ${['a', 'b'].map((side) => `<button class="pick is-${side}${mine?.v === side ? ' chosen' : ''}" data-act="pick" data-value="${side}"${mine ? ' disabled' : ''}><span class="mono">${side.toUpperCase()}</span><b>${esc(names[q[side]])}</b></button>`).join('')}
      </div><p class="state mono" id="state">${mine ? esc(t.locked) : ''}</p>`;
    } else {
      const v = mine ? mine.v : null;
      control = `<div class="answer${mine ? ' is-locked' : ''}" id="answer">
        <div class="big"><output class="big-num" id="num">${v == null ? '?' : v}</output><span class="mono">${esc(t.outOf)}</span></div>
        <div class="slide"><button class="nudge mono" data-act="nudge" data-value="-1" aria-label="-1"${mine ? ' disabled' : ''}>−</button>
          <input type="range" id="slider" min="0" max="100" step="1" value="${v == null ? 50 : v}" aria-label="${esc(t.outOf)}"${mine ? ' disabled' : ''}>
          <button class="nudge mono" data-act="nudge" data-value="1" aria-label="+1"${mine ? ' disabled' : ''}>+</button></div>
        <div class="ticks mono" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
        <button class="cta" data-act="lock" id="lock"${mine || v == null ? ' disabled' : ''}><span><strong id="lock-text">${esc(mine ? t.locked : t.lockIn)}</strong><span id="state">${esc(mine ? (solo ? '' : t.waiting) : t.drag)}</span></span>${arrow}</button>
      </div>`;
    }
  }
  const hostPanel = role.host ? `<div class="answered"><div class="sec-h mono"><b id="got">${esc(t.inCount(answered.got, answered.of))}</b></div><div class="people" id="people">${answered.html}</div>
      <div class="row-actions"><button class="btn mono" data-act="skip">${esc(t.revealNow)}</button></div></div>` : !role.plays || solo ? '' : `<p class="mono mut in-count" id="got">${esc(t.inCount(answered.got, answered.of))}</p>`;
  return `<section class="col round is-guess${q.t === 'duel' ? ' is-duel' : ''}">
    ${roundHead({ t, lang, i, n, q })}
    ${question}
    ${control}
    ${hostPanel}
  </section>`;
}

/** Everyone's guesses on one line from 0 to 100, with the truth marked. */
export function strip({ t, guesses, truth, avg, me }) {
  const lanes = [];
  const dots = [...guesses].sort((a, b) => a.v - b.v).map((g) => {
    // Stack dots that would overlap.
    let lane = 0;
    while (lanes[lane] != null && g.v - lanes[lane] < 2.2) lane++;
    lanes[lane] = g.v;
    return `<i class="dot${g.pid === me ? ' me' : ''}" style="left:${g.v}%;bottom:${6 + lane * 9}px" title="${esc(g.name)} · ${g.v}"></i>`;
  }).join('');
  const height = 22 + Math.max(0, lanes.length - 1) * 9;
  return `<div class="strip" style="--h:${height}px">
    <div class="strip-plot">${dots}<u class="true" style="left:${truth}%"><span class="mono">${truth}</span></u>${avg != null ? `<u class="avg" style="left:${avg}%"></u>` : ''}</div>
    <div class="ticks mono" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    ${avg != null && guesses.length > 1 ? `<p class="mono mut">${esc(t.roomAvg(avg))}</p>` : ''}
  </div>`;
}

export function boardHtml(rows, { t, me = null, limit = 8, delta = true } = {}) {
  if (!rows.length) return '';
  let shown = rows.slice(0, limit);
  const mine = rows.find((r) => r.uid === me);
  if (mine && !shown.includes(mine)) shown = [...shown.slice(0, limit - 1), mine];
  return `<ol class="board">${shown.map((r, k) => {
    const move = !delta ? '' : r.p && r.r < r.p ? '<i class="up" aria-hidden="true">▲</i>' : r.p && r.r > r.p ? '<i class="down" aria-hidden="true">▼</i>' : '';
    return `<li class="${r.uid === me ? 'me' : ''}" style="--k:${k}"><span class="rk mono">${r.r}</span><span class="nm">${esc(r.name)}${move}</span>${delta && r.d ? `<span class="dl mono">${esc(t.points(r.d))}</span>` : '<span></span>'}<span class="sc">${r.s}</span></li>`;
  }).join('')}</ol>`;
}

/**
 * The truth, and how everyone did.
 *   ans     the truth plus the room summary (engine.truth + engine.roundSummary)
 *   mine    this device's answer, or null
 *   result  { pts, rank, of, total } for this device when it is playing
 *   guesses [{ pid, name, v }] for the strip (may be empty)
 *   rows    leaderboard rows
 *   role    { host, plays }
 */
export function reveal({ t, lang, i, n, q, names, line, ans, mine, result, guesses, rows, role, me, solo, last, unmetUrl }) {
  let body;
  if (q.t === 'duel') {
    const fig = { a: E.duelFigure(q.need, ans.a.v), b: E.duelFigure(q.need, ans.b.v) };
    const widest = Math.max(fig.a.n, fig.b.n);
    body = `<h2 class="q small">${questionHtml(lang, q, {}, line)}</h2>
    <div class="duel-result">${['a', 'b'].map((side) => `<div class="side-${side}${ans.right === side ? ' won' : ''}${mine?.v === side ? ' chosen' : ''}">
        <div class="duel-name"><b>${esc(names[q[side]])}</b>${ans.right === side ? '<span class="mono">✓</span>' : ''}</div>
        <div class="bar"><i style="width:${(100 * fig[side].n) / (fig[side].of === 1000 ? 1000 : Math.max(widest, 100))}%"></i></div>
        <div class="duel-fig"><strong>${fig[side].n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')}</strong><span class="mono">/ ${fig[side].of.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} · ${ans[side].y}</span></div>
      </div>`).join('')}</div>
    ${!solo && ans.n ? `<p class="mono mut">${esc(t.gotIt(ans.ok || 0, ans.n))}</p>` : ''}`;
  } else {
    const people = peopleLine(lang, q, ans.people, line), pace = paceLine(lang, ans.pace);
    body = `<p class="place mono"><b>${esc(names[q.a])}</b> · ${esc(t.source(ans.y))}</p>
    <div class="truth"><strong class="truth-num" id="truth" data-to="${ans.v}">${ans.v}</strong><span class="mono">${esc(t.outOf)}</span></div>
    <p class="said">${esc(saidLine(lang, q, ans.v, line))}</p>
    ${people ? `<p class="fact">${esc(people)}</p>` : ''}
    ${pace ? `<p class="pace-line mono">${['closing', 'backwards', 'flat', 'century'].includes(ans.pace.r) ? `<span>${esc(t.atPace)}</span> ` : ''}<b>${esc(pace)}</b></p>` : ''}
    ${guesses.length ? strip({ t, guesses, truth: ans.v, avg: solo ? null : ans.avg, me }) : ''}`;
  }
  let you = '';
  if (role.plays) {
    const miss = q.t === 'pct' && mine ? Math.abs(mine.v - ans.v) : null;
    const verdict = !mine ? t.noAnswer : q.t === 'duel' ? (mine.v === ans.right ? t.right : t.wrong) : miss <= E.BULLSEYE ? t.bullseye : t.off(miss);
    you = `<div class="you${mine && result.pts >= E.maxScore(q) * 0.9 ? ' great' : ''}">
      <div><span class="mono">${esc(!mine ? t.noAnswer : q.t === 'duel' ? names[q[mine.v]] : t.youGuessed(mine.v))}</span><b>${esc(verdict)}</b></div>
      <div class="pts"><strong>${esc(t.points(result.pts))}</strong>${solo ? `<span class="mono">${result.total} ${esc(t.pts)}</span>` : `<span class="mono">${esc(t.rank(result.rank, result.of))} · ${result.total} ${esc(t.pts)}</span>`}</div>
    </div>`;
  }
  const controls = solo
    ? `<div class="row-actions"><button class="cta slim" data-act="solo-next"><span><strong>${esc(last ? t.results : t.next)}</strong></span>${arrow}</button></div>`
    : role.host ? `<div class="row-actions"><button class="btn mono" data-act="pause" id="pause"></button><button class="btn mono solid" data-act="skip">${esc(last ? t.results : t.next)} ${arrow}</button><span class="mono mut" id="next-in"></span></div>` : `<p class="mono mut" id="next-in"></p>`;
  const explore = unmetUrl && (role.host || solo) ? `<a class="explore mono" href="${esc(unmetUrl)}" target="_blank" rel="noopener">${esc(t.seeUnmet)} ↗</a>` : '';
  return `<section class="col round is-reveal${q.t === 'duel' ? ' is-duel' : ''}">
    ${roundHead({ t, lang, i, n, q })}
    ${body}
    ${you}
    ${controls}
    ${explore}
  </section>
  ${!solo && rows.length ? `<aside class="side"><section><div class="sec-h mono"><b>${esc(t.board)}</b><span>· ${rows.length}</span></div>${boardHtml(rows, { t, me, limit: 8 })}</section></aside>` : ''}`;
}

// ---------- the end ----------
const cta = (href, strong, sub, attrs = '', cls = '') => `<a class="cta${cls}" href="${esc(href)}"${attrs}><span><strong>${esc(strong)}</strong><span>${esc(sub)}</span></span>${arrow}</a>`;
export function emailForm({ t, sent }) {
  return sent ? `<div class="email sent"><b>${esc(t.emailSent)}</b></div>` : `<form class="email" data-form="email" novalidate>
    <b>${esc(t.emailH)}</b><p>${esc(t.emailSub)}</p>
    <div class="code-form"><input class="name-input" type="email" name="email" inputmode="email" autocomplete="email" autocapitalize="off" placeholder="${esc(t.emailPlaceholder)}" aria-label="${esc(t.emailPlaceholder)}"><button class="go mono" type="submit">${esc(t.emailSend)} ${arrow}</button></div>
    <p class="form-note mono" id="email-note" role="alert"></p>
  </form>`;
}
function viewCard({ t, view }) {
  if (!view) return '';
  return `<div class="view-card is-${view.kind}"><span class="mono">${esc(t.view[view.kind])}</span><p>${esc(t.viewLine[view.kind](view.by))}</p></div>`;
}

/**
 * The end of a live game.
 *   rows    final leaderboard rows
 *   won     awards from engine.awards
 *   result  this device's own outcome, when it played: { rank, of, total, view }
 */
export function final({ t, rows, won, result, role, me, askEmail, emailSent, links }) {
  const top = rows.slice(0, 3), leader = rows[0];
  const tied = rows.length > 1 && rows[1].s === leader?.s;
  const title = !leader ? ['', '', ''] : tied ? t.tie : t.wins(leader.name);
  const podium = top.length ? `<ol class="podium">${[1, 0, 2].filter((k) => top[k]).map((k) => `<li class="p${top[k].r}"><b>${esc(top[k].name)}</b><span class="mono">${top[k].s} ${esc(t.pts)}</span><i>${top[k].r}</i></li>`).join('')}</ol>` : '';
  const awardList = ['sharp', 'optimist', 'pessimist'].filter((k) => won?.[k]).map((k) => `<li><span class="mono">${esc(t.award[k])}</span><b>${esc(won[k].name)}</b><span>${esc(t.awardBy[k](won[k].by))}</span></li>`).join('');
  const room = won?.room ? `<p class="room-view">${esc(t.roomView[won.room.kind](won.room.by))}</p>` : '';
  const mine = result ? `<div class="mine">
      <div class="mine-rank"><strong>${esc(t.rank(result.rank, result.of))}</strong><span class="mono">${result.total} ${esc(t.pts)}</span></div>
      ${viewCard({ t, view: result.view })}
      <div class="row-actions"><button class="btn mono solid" data-act="share-result">${esc(t.shareResult)}</button></div>
      ${askEmail ? `<div id="email-slot">${emailForm({ t, sent: emailSent })}</div>` : ''}
    </div>` : '';
  return `<section class="col end">
    <div class="eyebrow mono">${esc(t.podium)}</div>
    <h1 class="winner">${tied ? h1([title[0], title[1], '']) : `<em>${esc(title[0])}</em> ${esc(title[1])}`}</h1>
    ${podium}
    ${room}
    ${mine}
    <div class="end-actions">
      ${role.host ? `<button class="cta" data-act="again"><span><strong>${esc(t.again)}</strong><span>${esc(t.players)} · ${rows.length}</span></span>${arrow}</button>` : ''}
      ${cta('/unmet/', t.explore, t.exploreSub, ' target="_blank" rel="noopener"', role.host ? ' ghost' : '')}
      ${role.host ? '' : `<button class="btn mono" data-act="host">${esc(t.newRoom)}</button>`}
    </div>
  </section>
  <aside class="side">
    ${awardList ? `<section><div class="sec-h mono"><b>${esc(t.awards)}</b></div><ul class="awards">${awardList}</ul></section>` : ''}
    <section><div class="sec-h mono"><b>${esc(t.board)}</b><span>· ${rows.length}</span></div>${boardHtml(rows, { t, me, limit: 60, delta: false })}</section>
  </aside>`;
}

/** The end of a solo game. `rounds` is [{ got, max }]. */
export function soloFinal({ t, day, score, max, rounds, view, streak, askEmail, emailSent }) {
  return `<section class="col end solo-end">
    <div class="eyebrow mono">${esc(t.soloSub(day).split(' · ')[0])}${streak > 1 ? ` · ${esc(t.streak(streak))}` : ''}</div>
    <h1 class="winner"><em>${score}</em> / ${max}</h1>
    <div class="squares" aria-hidden="true">${rounds.map(({ got, max: m }) => { const f = m ? got / m : 0; return `<i class="${f >= 0.9 ? 's4' : f >= 0.6 ? 's3' : f >= 0.3 ? 's2' : 's1'}"></i>`; }).join('')}</div>
    ${viewCard({ t, view })}
    <div class="row-actions"><button class="btn mono solid" data-act="share-result">${esc(t.shareResult)}</button></div>
    ${askEmail ? `<div id="email-slot">${emailForm({ t, sent: emailSent })}</div>` : ''}
    <div class="end-actions">
      <button class="cta" data-act="host"><span><strong>${esc(t.host)}</strong><span>${esc(t.soloLive)}</span></span>${arrow}</button>
      ${cta('/unmet/', t.explore, t.exploreSub, ' target="_blank" rel="noopener"', ' ghost')}
    </div>
    <p class="fine">${esc(t.comeBack)}</p>
    <button class="back-link mono" data-act="home">← ${esc(t.back)}</button>
  </section>`;
}

// ---------- sheets ----------
export function how({ t, name, s }) {
  return `<header><div><span class="brand">${esc(name)}<i>.</i></span></div><button class="mono" data-act="close-sheet">${esc(t.close)} <kbd>esc</kbd></button></header>
  <article>
    <h2>${h1([t.howH[0], t.howH[1], ''])}</h2>
    <figure class="how-video">
      <video controls playsinline preload="none" poster="${s}/video/how-to-play.jpg">
        <source src="${esc(howVideoUrl)}" type="video/mp4">
      </video>
      <figcaption class="mono">${esc(t.howVideo)}</figcaption>
    </figure>
    <ol class="steps">${t.howSteps.map(([a, b], k) => `<li><span class="mono">0${k + 1}</span><div><h3>${esc(a)}</h3><p>${esc(b)}</p></div></li>`).join('')}</ol>
    <p class="fine">${esc(t.howData)}</p>
    <p class="fine">${esc(t.howMap)}</p>
  </article>`;
}
export function invite({ t, name, links, code, qrSvg }) {
  return `<header><div><span class="brand">${esc(name)}<i>.</i></span></div><button class="mono" data-act="close-sheet">${esc(t.close)} <kbd>esc</kbd></button></header>
  <article class="invite">
    <div class="eyebrow mono">${esc(t.joinAt)}</div>
    <div class="addr">${esc(links.typed)}</div>
    <div class="room-code mono">${esc(code)}</div>
    ${qrSvg ? `<div class="qr-big">${qrSvg}</div>` : ''}
    <div class="row-actions"><button class="btn mono solid" data-act="copy-link">${esc(t.copyLink)}</button><button class="btn mono" data-act="share-link">${esc(t.share)}</button></div>
  </article>`;
}
export function manage({ t, pid, name, canRemove = true }) {
  return `<header><div><span class="mono">${esc(t.players)}</span></div><button class="mono" data-act="close-sheet">${esc(t.close)} <kbd>esc</kbd></button></header>
  <article class="manage">
    <h2><em>${esc(name)}</em></h2>
    <form class="code-form" data-form="rename" data-pid="${esc(pid)}" autocomplete="off"><input class="name-input" name="name" maxlength="16" placeholder="${esc(t.rename)}" aria-label="${esc(t.rename)}"><button class="go mono" type="submit">${esc(t.rename)}</button></form>
    ${canRemove ? `<div class="row-actions"><button class="btn mono danger" data-act="kick" data-pid="${esc(pid)}">${esc(t.remove)}</button></div>` : ''}
  </article>`;
}
export { LANGS };
