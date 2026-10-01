import { t, campaignHref } from './locale';

/** Both actions remain available to guests, new accounts, and returning players. */
export function SupportActions({ onShare }: { onShare: () => void }) {
  return <aside className="support-actions" aria-label={t('Help power the real clinics.')}>
    <p>{t('Help power the real clinics.')}</p>
    <div><button onClick={onShare}>{t('Invite 10 friends')} ↗</button>
      <a href={campaignHref()} target="_blank" rel="noopener noreferrer">{t('Contribute $10')} ↗</a></div>
    <small>{t('Sharing and contributing are optional. Everyone can help bring the light.')}</small>
  </aside>;
}
