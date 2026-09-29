import { useSyncExternalStore } from 'react';
import { getLanguage, setLanguage, LANGUAGE_EVENT, type GameLanguage } from '../../../content/last-light-locale';
export { t, formatText, getLanguage, getLocale, setLanguage, campaignHref } from '../../../content/last-light-locale';
export type { GameLanguage } from '../../../content/last-light-locale';
const subscribe = (callback: () => void) => {
  window.addEventListener(LANGUAGE_EVENT, callback);
  return () => window.removeEventListener(LANGUAGE_EVENT, callback);
};
export const useLanguage = () => useSyncExternalStore(subscribe, getLanguage, () => 'en' as GameLanguage);
export function LanguageSwitch({ onChange }: { onChange?: (language: GameLanguage) => void }) {
  const language = useLanguage();
  return <div className="language-switch" role="group" aria-label="Language / Langue">
    {(['en', 'fr'] as const).map(code => <button key={code} type="button" lang={code} aria-pressed={language === code}
      onClick={() => { setLanguage(code); onChange?.(code); }}>{code === 'en' ? 'English' : 'Français'}</button>)}
  </div>;
}
