// The admin screen (English only): the game's name, how people join, the
// defaults for new rooms, and the emails and games collected so far. It is
// its own chunk, opened from the "Admin" link or /unmet/play/?admin.
//
// Who may save: whoever is signed in to the main site as a platform admin.
// This page only reads that session; Firestore's rules do the enforcing
// (playSettings is writable by isPlatformAdmin() alone).
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { firebaseConfig } from './config.js';
import { docGet, docSet, docList } from './cloud.js';
import { DEFAULTS, cleanSettings, cachedSettings, rememberSettings, joinLinks } from './settings.js';
import { qrSvg } from './qr.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let authP = null;
/** The main site's signed-in user in this browser, or null. Never signs anyone in or out. */
function siteUser() {
  authP ||= (async () => {
    const app = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
    const auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
    await auth.authStateReady();
    return auth;
  })();
  return authP.then((auth) => (auth.currentUser && !auth.currentUser.isAnonymous ? auth.currentUser : null));
}

const head = (close = true) => `<header><div><span class="brand">Game settings<i>.</i></span></div>${close ? '<button class="mono" data-act="close-sheet">Close <kbd>esc</kbd></button>' : ''}</header>`;
const text = (k, label, hint, s, placeholder = '') => `<div class="field"><label for="a-${k}">${label}</label><input type="text" id="a-${k}" name="${k}" value="${esc(s[k])}" placeholder="${esc(placeholder)}" maxlength="${k === 'blocked' ? 600 : 160}">${hint ? `<small>${hint}</small>` : ''}</div>`;
const number = (k, label, hint, s, lo, hi) => `<div class="field"><label for="a-${k}">${label}</label><input type="number" id="a-${k}" name="${k}" value="${s[k]}" min="${lo}" max="${hi}">${hint ? `<small>${hint}</small>` : ''}</div>`;
const toggle = (k, label, hint, s) => `<div class="field"><span>${label}</span><button type="button" class="tog" role="switch" data-admin-toggle="${k}" aria-checked="${!!s[k]}"><i></i><span>${s[k] ? 'On' : 'Off'}</span></button>${hint ? `<small>${hint}</small>` : ''}</div>`;

function formHtml(s, who) {
  return `${head()}
  <article>
    <h2>Game <em>settings.</em></h2>
    <p class="gate">Signed in as ${esc(who)}. Changes apply to everyone the next time the page loads; rooms already open keep the options they started with.</p>
    <form id="admin-form" autocomplete="off">
      <fieldset><legend>01 / Name</legend>
        ${text('name', 'Game name', 'The wordmark in the top corner and the browser tab.', s, DEFAULTS.name)}
        ${text('nameFr', 'Name in French', 'Leave empty to use the same name in French.', s, DEFAULTS.nameFr)}
        ${text('tagline', 'Line above the headline', 'Optional. Replaces “A live guessing game on real data”.', s)}
        ${text('taglineFr', 'That line in French', '', s)}
        ${text('welcome', 'Lobby message', 'Optional. Shown at the top of every lobby, for example “Welcome, ENTP 601”.', s)}
      </fieldset>
      <fieldset><legend>02 / Joining</legend>
        ${text('joinHost', 'Address people type', 'The domain shown on the big screen and used in links and the QR code. Empty means whichever domain the host is on.', s, 'globalsolutionlab.com')}
        ${toggle('shortLinks', 'Short links', 'On: yoursite/play and yoursite/play/CODE (needs the hosting redirects in firebase.json to be deployed). Off: yoursite/unmet/play/?r=CODE.', s)}
        ${toggle('qr', 'QR code in the lobby', 'A host can still hide or show it for their own room.', s)}
        <div class="field"><span>Preview</span><div class="preview" id="a-preview"></div></div>
      </fieldset>
      <fieldset><legend>03 / New rooms start with</legend>
        ${number('rounds', 'Rounds', '3 to 12. The last round always counts double.', s, 3, 12)}
        ${number('secs', 'Seconds per round', '10 to 60.', s, 10, 60)}
        ${toggle('auto', 'Move on automatically', 'Off: every reveal waits for the host to press Next.', s)}
        ${number('maxPlayers', 'Most players in a room', '2 to 300.', s, 2, 300)}
      </fieldset>
      <fieldset><legend>04 / Player names</legend>
        ${text('blocked', 'Extra words to refuse', 'Comma-separated. Added to the built-in list; a name containing any of them is turned away. Hosts can also rename or remove a player by clicking their name.', s, 'e.g. a school nickname')}
      </fieldset>
      <fieldset><legend>05 / After a game</legend>
        ${toggle('email', 'Offer “email me my result”', 'Players may leave an email at the end. Turn this off for groups of children.', s)}
        ${text('signupUrl', 'Where the emailed link goes', 'The player’s name and email are added to this address so the sign-up form can be pre-filled.', s, DEFAULTS.signupUrl)}
        ${toggle('solo', 'Daily solo game', 'Five questions a day, the same for everyone, for anyone who arrives alone.', s)}
      </fieldset>
      <div class="save"><button class="cta" type="submit"><span><strong>Save settings</strong></span></button><span class="mono mut" id="admin-note" role="status"></span></div>
    </form>
    <fieldset><legend>06 / Emails left by players</legend><div id="a-leads"><p class="mono mut">Loading…</p></div></fieldset>
    <fieldset><legend>07 / Recent games</legend><div id="a-games"><p class="mono mut">Loading…</p></div></fieldset>
  </article>`;
}
const when = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };

/** Draws the admin screen into `el`. `onSaved(settings)` runs after a successful save. */
export async function adminScreen(el, { onSaved, local = false }) {
  let user = null;
  // A local preview (?mock) shows the form to anyone and saves to this browser only.
  if (local) user = { email: 'local preview: saved in this browser only', uid: 'preview', getIdToken: async () => '' };
  else try { user = await siteUser(); } catch { /* treated as signed out */ }
  if (!user) {
    el.innerHTML = `${head()}<article><h2>Game <em>settings.</em></h2><p class="gate">Sign in to Global Solutions Lab with an admin account, then open this page again.</p><div class="row-actions"><a class="btn mono solid" href="/login">Sign in</a><button class="btn mono" data-act="close-sheet">Not now</button></div></article>`;
    return;
  }
  const token = () => user.getIdToken();
  let current;
  try { current = local ? cachedSettings() : cleanSettings((await docGet('playSettings/main', await token())) || {}); } catch { current = cleanSettings({}); }
  el.innerHTML = formHtml(current, user.email || user.displayName || 'an admin');
  const form = el.querySelector('#admin-form'), note = el.querySelector('#admin-note');
  const read = () => {
    const raw = Object.fromEntries(new FormData(form));
    for (const b of form.querySelectorAll('[data-admin-toggle]')) raw[b.dataset.adminToggle] = b.getAttribute('aria-checked') === 'true';
    return cleanSettings(raw);
  };
  const preview = () => {
    const s = read(), l = joinLinks(s, 'KXPT', { hostname: s.joinHost || location.hostname, host: s.joinHost || location.host, protocol: 'https:' });
    el.querySelector('#a-preview').innerHTML = `${s.qr ? `<div class="qr-card">${qrSvg(l.url)}</div>` : ''}<div><div class="addr">${esc(l.typed)}</div><div class="mono">${esc(l.url)}</div></div>`;
  };
  preview();
  form.addEventListener('input', preview);
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-admin-toggle]');
    if (!b) return;
    const on = b.getAttribute('aria-checked') !== 'true';
    b.setAttribute('aria-checked', String(on)); b.lastElementChild.textContent = on ? 'On' : 'Off';
    preview();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); e.stopPropagation();
    const next = read();
    note.textContent = 'Saving…';
    try {
      if (!local) await docSet('playSettings/main', { ...next, updatedAt: new Date(), updatedBy: user.uid }, await token());
      rememberSettings(next);
      note.textContent = 'Saved.';
      onSaved?.(next);
    } catch (err) {
      note.textContent = err.status === 403 ? 'Not saved: this account is not a platform admin.' : 'Not saved. Check your connection and try again.';
    }
  });

  // The records are for admins only; anyone else simply sees that they could not be loaded.
  const table = (rows, cols) => (rows.length ? `<table><thead><tr>${cols.map(([h]) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map(([, f]) => `<td>${esc(f(r))}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '<p class="mono mut">Nothing yet.</p>');
  if (local) { el.querySelector('#a-leads').innerHTML = el.querySelector('#a-games').innerHTML = '<p class="mono mut">Not shown in a local preview.</p>'; return; }
  try {
    const leads = await docList('playLeads', await token(), { pageSize: 200, orderBy: 'at desc' });
    const csv = ['email,name,room,score,max,rank,of,worldview,language,when', ...leads.map((r) => [r.email, r.name, r.room, r.score, r.max, r.rank, r.of, r.view, r.lang, r.at].map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    el.querySelector('#a-leads').innerHTML = `${table(leads.slice(0, 50), [['Email', (r) => r.email], ['Name', (r) => r.name], ['Room', (r) => r.room], ['Score', (r) => `${r.score}/${r.max}`], ['When', (r) => when(r.at)]])}${leads.length ? `<div class="row-actions"><a class="btn mono" download="game-emails.csv" href="data:text/csv;charset=utf-8,${encodeURIComponent(csv)}">Download all ${leads.length} as CSV</a></div>` : ''}`;
  } catch { el.querySelector('#a-leads').innerHTML = '<p class="mono mut">Could not load (admins only).</p>'; }
  try {
    const games = await docList('playGames', await token(), { pageSize: 50, orderBy: 'at desc' });
    el.querySelector('#a-games').innerHTML = table(games, [['Room', (r) => r.code], ['Players', (r) => r.players], ['Rounds', (r) => r.rounds], ['Winner', (r) => (r.board?.[0] ? `${r.board[0].name} (${r.board[0].score})` : '')], ['When', (r) => when(r.at)]]);
  } catch { el.querySelector('#a-games').innerHTML = '<p class="mono mut">Could not load (admins only).</p>'; }
}
