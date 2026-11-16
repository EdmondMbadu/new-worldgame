// The email a player gets after leaving their address at the end of a game
// (/unmet/play). Pure functions: no Firebase, no network, so they are tested
// directly (test/play.test.js).

export interface PlayLead {
  pid: string;
  room: string;
  email: string;
  name?: string;
  lang?: string;
  score?: number;
  max?: number;
  rank?: number;
  of?: number;
  view?: string;
  by?: number;
}
export interface PlaySettings {
  name?: string;
  nameFr?: string;
  joinHost?: string;
  shortLinks?: boolean;
  signupUrl?: string;
}

const DEFAULT_SITE = 'https://globalsolutionlab.com';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);

/** A name is only ever letters, digits, spaces, apostrophes and hyphens: nothing a mail app could turn into a link. */
export function safeName(name: unknown): string {
  return String(name ?? '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} '’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20);
}

/** True when a lead is well-formed enough to answer. */
export function validLead(lead: Partial<PlayLead> | undefined): lead is PlayLead {
  return (
    !!lead &&
    typeof lead.email === 'string' &&
    lead.email.length <= 200 &&
    EMAIL.test(lead.email) &&
    typeof lead.pid === 'string' &&
    /^[A-Za-z0-9]{8,24}$/.test(lead.pid) &&
    typeof lead.room === 'string' &&
    /^([A-Z]{4}|SOLO[0-9]{8})$/.test(lead.room)
  );
}

function siteOrigin(settings: PlaySettings): string {
  const host = String(settings.joinHost || '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? `https://${host}` : DEFAULT_SITE;
}

/** The sign-up link, with the player's name and email attached so the form can be pre-filled. */
export function signupLink(lead: PlayLead, settings: PlaySettings): string {
  const origin = siteOrigin(settings);
  let url: URL;
  try {
    url = new URL(settings.signupUrl || '/signup', origin);
  } catch {
    url = new URL('/signup', origin);
  }
  // Never send people anywhere but our own site, whatever the setting says.
  if (url.origin !== origin && url.origin !== DEFAULT_SITE) url = new URL('/signup', origin);
  const name = safeName(lead.name);
  if (name) url.searchParams.set('name', name);
  url.searchParams.set('email', lead.email);
  url.searchParams.set('from', 'play');
  return url.toString();
}

export function playLink(settings: PlaySettings): string {
  return `${siteOrigin(settings)}${settings.shortLinks === false ? '/unmet/play/' : '/play'}`;
}

const WORDS = {
  en: {
    subject: (game: string, score: string) => `Your ${game} result: ${score}`,
    hello: (name: string) => (name ? `Hi ${name},` : 'Hi,'),
    played: (game: string) => `Thanks for playing ${game}.`,
    score: (score: number, max: number) => `You scored ${score}${max ? ` out of ${max}` : ''}.`,
    rank: (rank: number, of: number) => `You finished ${rank}${['th', 'st', 'nd', 'rd'][rank % 100 > 10 && rank % 100 < 14 ? 0 : rank % 10] || 'th'} of ${of}.`,
    view: {
      optimist: (n: number) => `Your guesses pictured the world ${n} points better than it is.`,
      pessimist: (n: number) => `Your guesses pictured the world ${n} points worse than it is.`,
      realist: () => 'Your guesses saw the world about as it is.',
    } as Record<string, (n: number) => string>,
    next: 'Every number in the game is a real one, and behind each is a problem people are working on. Global Solutions Lab is a free place to work on one with others:',
    cta: 'Create your free account',
    ctaNote: 'Your name is already filled in.',
    again: 'Play again or host your own room:',
    footer: 'You are receiving this once because you asked for your result at the end of a game. We will not write again unless you sign up.',
  },
  fr: {
    subject: (game: string, score: string) => `Votre résultat à ${game} : ${score}`,
    hello: (name: string) => (name ? `Bonjour ${name},` : 'Bonjour,'),
    played: (game: string) => `Merci d’avoir joué à ${game}.`,
    score: (score: number, max: number) => `Votre score : ${score}${max ? ` sur ${max}` : ''}.`,
    rank: (rank: number, of: number) => `Vous terminez ${rank === 1 ? '1er' : `${rank}e`} sur ${of}.`,
    view: {
      optimist: (n: number) => `Vos réponses imaginent le monde ${n} points meilleur qu’il ne l’est.`,
      pessimist: (n: number) => `Vos réponses imaginent le monde ${n} points pire qu’il ne l’est.`,
      realist: () => 'Vos réponses voient le monde à peu près tel qu’il est.',
    } as Record<string, (n: number) => string>,
    next: 'Chaque chiffre du jeu est réel, et derrière chacun se trouve un problème sur lequel des gens travaillent. Le Global Solutions Lab est un espace gratuit pour s’y attaquer à plusieurs :',
    cta: 'Créer votre compte gratuit',
    ctaNote: 'Votre nom est déjà rempli.',
    again: 'Rejouer ou créer votre propre salle :',
    footer: 'Vous recevez ce message une seule fois, parce que vous avez demandé votre résultat à la fin d’une partie. Nous ne vous écrirons plus, sauf si vous créez un compte.',
  },
};

/** The whole message: subject, plain text and HTML. */
export function buildLeadEmail(lead: PlayLead, settings: PlaySettings = {}) {
  const fr = lead.lang === 'fr';
  const t = fr ? WORDS.fr : WORDS.en;
  const game = String((fr && settings.nameFr) || settings.name || 'Out of 100').slice(0, 60);
  const name = safeName(lead.name);
  const score = Number.isFinite(lead.score) ? Math.max(0, Math.round(lead.score as number)) : 0;
  const max = Number.isFinite(lead.max) ? Math.max(0, Math.round(lead.max as number)) : 0;
  const rank = Number.isFinite(lead.rank) ? Math.round(lead.rank as number) : 0;
  const of = Number.isFinite(lead.of) ? Math.round(lead.of as number) : 0;
  const by = Number.isFinite(lead.by) ? Math.abs(Math.round(lead.by as number)) : 0;
  const lines = [t.played(game), t.score(score, max)];
  if (rank > 0 && of > 1) lines.push(t.rank(rank, of));
  const view = lead.view && t.view[lead.view];
  if (view) lines.push(view(by));
  const signup = signupLink(lead, settings);
  const play = playLink(settings);
  const text = [t.hello(name), '', lines.join(' '), '', t.next, signup, `(${t.ctaNote})`, '', t.again, play, '', '—', 'Global Solutions Lab', '', t.footer].join('\n');
  const html = `<!doctype html><html lang="${fr ? 'fr' : 'en'}"><body style="margin:0;background:#f4f1e8;font-family:Helvetica,Arial,sans-serif;color:#15161a">
<div style="max-width:520px;margin:0 auto;padding:36px 24px">
<p style="font:400 26px Georgia,serif;margin:0 0 28px">${esc(game)}<span style="color:#c98a12">.</span></p>
<p style="font-size:16px;line-height:1.55;margin:0 0 14px">${esc(t.hello(name))}</p>
<p style="font-size:16px;line-height:1.55;margin:0 0 14px">${lines.map(esc).join(' ')}</p>
<p style="font-size:16px;line-height:1.55;margin:0 0 22px">${esc(t.next)}</p>
<p style="margin:0 0 8px"><a href="${esc(signup)}" style="display:inline-block;background:#f5b83e;color:#1a1100;text-decoration:none;font-weight:bold;font-size:16px;padding:13px 20px">${esc(t.cta)} &rarr;</a></p>
<p style="font-size:13px;color:#6b6a64;margin:0 0 28px">${esc(t.ctaNote)}</p>
<p style="font-size:15px;line-height:1.55;margin:0 0 28px">${esc(t.again)} <a href="${esc(play)}" style="color:#15161a">${esc(play.replace(/^https:\/\//, ''))}</a></p>
<p style="font-size:12px;line-height:1.5;color:#8a8982;border-top:1px solid #dcd8cb;padding-top:16px;margin:0">Global Solutions Lab<br>${esc(t.footer)}</p>
</div></body></html>`;
  return { subject: t.subject(game, max ? `${score}/${max}` : String(score)), text, html };
}
