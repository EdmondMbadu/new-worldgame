// What a Global Solutions Lab admin can change about the game without a
// deploy: its name, how people are told to join, the defaults for a new room,
// and what happens after a game. Stored in Firestore at playSettings/main
// (anyone may read it; only platform admins may write it — see firestore.rules).
import { docGet } from './cloud.js';
import { normalCode } from './room.js';

export const DEFAULTS = {
  name: 'Out of 100', // the game's name, shown as its wordmark
  nameFr: 'Sur 100',
  tagline: '', // replaces the line above the headline, when set
  taglineFr: '',
  welcome: '', // a line shown in every lobby, e.g. "Welcome, ENTP 601"
  joinHost: '', // the address people are told to type, e.g. globalsolutionlab.com (empty: wherever the page is)
  shortLinks: true, // /play and /play/CODE (hosting redirects) rather than /unmet/play/?r=CODE
  qr: true, // show a QR code in the lobby
  rounds: 6,
  secs: 20,
  auto: true, // reveals move on by themselves
  maxPlayers: 60,
  solo: true, // offer the daily solo game
  email: true, // offer "email me my result" at the end
  signupUrl: '/signup', // where the emailed link goes; name and email are added to it
  blocked: '', // extra words not allowed in names, comma-separated
};
const TYPES = Object.fromEntries(Object.entries(DEFAULTS).map(([k, v]) => [k, typeof v]));
const LIMITS = { rounds: [3, 12], secs: [10, 60], maxPlayers: [2, 300] };
const CACHE = 'play.settings';

/** Keeps the known settings, each with the right type and within its limits. */
export function cleanSettings(raw = {}) {
  const out = { ...DEFAULTS };
  for (const [k, type] of Object.entries(TYPES)) {
    const v = raw?.[k];
    if (type === 'boolean' && typeof v === 'boolean') out[k] = v;
    if (type === 'string' && typeof v === 'string') out[k] = v.trim().slice(0, k === 'blocked' ? 600 : 160);
    if (type === 'number' && Number.isFinite(+v) && v !== '' && v !== null) out[k] = Math.min(LIMITS[k][1], Math.max(LIMITS[k][0], Math.round(+v)));
  }
  out.name = out.name || DEFAULTS.name;
  out.joinHost = out.joinHost.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  return out;
}

/** The settings this browser saw last, so the page can draw before the network answers. */
export function cachedSettings() {
  try { return cleanSettings(JSON.parse(localStorage.getItem(CACHE) || '{}')); } catch { return { ...DEFAULTS }; }
}
/** Fetches the current settings. Falls back to the cached ones if Firestore cannot be reached. */
export async function loadSettings() {
  try {
    const next = cleanSettings((await docGet('playSettings/main')) || {});
    try { localStorage.setItem(CACHE, JSON.stringify(next)); } catch { /* private mode */ }
    return next;
  } catch { return cachedSettings(); }
}
export const rememberSettings = (settings) => { try { localStorage.setItem(CACHE, JSON.stringify(settings)); } catch { /* private mode */ } };

export const gameName = (settings, lang) => (lang === 'fr' && settings.nameFr) || settings.name;
export const blockedWords = (settings) => settings.blocked.split(',').map((w) => w.trim()).filter(Boolean);

const LOCAL = /^(localhost|127\.|10\.|192\.168\.|\[::1\])/;
/**
 * How people reach a room.
 *   typed  the address to read out ("globalsolutionlab.com/play")
 *   url    the link and QR code for one room
 *   home   the game's front page
 */
export function joinLinks(settings, code, loc = globalThis.location) {
  const local = LOCAL.test(loc.hostname);
  const host = !local && settings.joinHost ? settings.joinHost : loc.host;
  const origin = `${local ? loc.protocol : 'https:'}//${host}`;
  if (settings.shortLinks && !local) return { typed: `${host}/play`, url: `${origin}/play/${code}`, home: `${origin}/play` };
  return { typed: `${host}/unmet/play`, url: `${origin}/unmet/play/?r=${code}`, home: `${origin}/unmet/play/` };
}
/** The room code in an address: /unmet/play/KXPT, /play/KXPT or ?r=KXPT. */
export function codeFromLocation(loc = globalThis.location) {
  const q = new URLSearchParams(loc.search).get('r');
  const tail = loc.pathname.replace(/\/+$/, '').split('/').pop();
  const code = normalCode(q || (/^[A-Za-z]{4}$/.test(tail) && tail.toLowerCase() !== 'play' ? tail : ''));
  return code.length === 4 ? code : '';
}
