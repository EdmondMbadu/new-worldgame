import french from './last-light-fr.json';
export type GameLanguage = 'en' | 'fr';
export const LANGUAGE_KEY = 'last-light.language';
export const LANGUAGE_EVENT = 'last-light:language';
export function resolveLanguage(saved: unknown, hint: unknown, browser: string = 'en'): GameLanguage {
  if (saved === 'en' || saved === 'fr') return saved;
  if (hint === 'en' || hint === 'fr') return hint;
  return browser.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}
let current: GameLanguage | undefined;
export function getLanguage(): GameLanguage {
  if (current) return current;
  let saved: string | null = null;
  try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* Optional device preference. */ }
  const hint = typeof location === 'undefined' ? null : new URLSearchParams(location.search).get('lang');
  current = resolveLanguage(saved, hint, typeof navigator === 'undefined' ? 'en' : navigator.language);
  try { localStorage.setItem(LANGUAGE_KEY, current); } catch { /* Session preference still works. */ }
  return current;
}
export const getLocale = () => getLanguage() === 'fr' ? 'fr-FR' : 'en-US';
export function setLanguage(language: GameLanguage) {
  const changed = current !== language;
  current = language;
  try { localStorage.setItem(LANGUAGE_KEY, language); localStorage.setItem('nwg_language', language); } catch { /* Session still works. */ }
  if (typeof document !== 'undefined' && document.documentElement) document.documentElement.lang = language;
  if (changed && typeof window !== 'undefined') window.dispatchEvent(new Event(LANGUAGE_EVENT));
}
const catalog: Record<string, string> = french;
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
const insensitive = new Map(Object.entries(catalog).map(([en, fr]) => [en.toLowerCase(), fr]));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patterns = Object.entries(catalog).filter(([key]) => /\{\d+\}/.test(key)).map(([key, value]) => ({
  regex: new RegExp('^' + key.split(/\{\d+\}/).map(escape).join('(.+?)') + '$'), value,
}));
/** Translate presentation text only; never pass identifiers, links or player names here. */
export function t<T>(value: T): T {
  if (typeof value !== 'string' || getLanguage() !== 'fr') return value;
  const key = normalize(value);
  let translated: string | undefined = catalog[key];
  if (!translated && key === key.toUpperCase()) translated = insensitive.get(key.toLowerCase())?.toLocaleUpperCase('fr');
  if (!translated && key === key.toLowerCase()) translated = insensitive.get(key)?.toLocaleLowerCase('fr');
  if (!translated) for (const pattern of patterns) {
    const match = key.match(pattern.regex);
    if (match) { translated = pattern.value.replace(/\{(\d+)\}/g, (_, n) => match[Number(n) + 1]); break; }
  }
  if (!translated) return value;
  return (value.match(/^\s*/)?.[0] + translated + value.match(/\s*$/)?.[0]) as T;
}
export const formatText = (key: string, ...values: (string | number)[]) =>
  t(key).replace(/\{(\d+)\}/g, (_, i) => String(values[Number(i)] ?? ''));
export function campaignHref(section: 'donate' | 'team' | 'clinics' = 'donate') {
  return `/campaigns/power-drc-clinics?source=last-light&amount=10&lang=${getLanguage()}#${section}`;
}
