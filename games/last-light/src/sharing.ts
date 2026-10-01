import { CLINICS } from './clinic-stories';
import { challengeUrl } from './journey';
import { t, formatText, getLocale } from './locale';
export function shareChallenge(mission: number, mode: string, variant: number, score?: number) {
  const url = challengeUrl(mission, mode, variant).replace(location.origin, 'https://newworld-game.org');
  const achievement = score === undefined ? '' : formatText('I scored {0} points driving solar panels and batteries to {1}.', score.toLocaleString(getLocale()), CLINICS[mission].shortName);
  const text = [
    t('This game is really cool! More than 25,000 health clinics lack reliable power. Nearly 1 billion people around the world are impacted. Can you help bring them the light?'),
    [achievement, t('Try this Last Light game and see how you do!')].filter(Boolean).join(' '),
    `(${t('Powered by Astra 6 and the Global Solutions Lab.')})`,
  ].join('\n\n');
  // X has a 280-character limit; the complete invitation remains available to copy.
  const xText = [t('25,000+ clinics need reliable power. Nearly 1 billion people affected.'), achievement, t('Play Last Light! (Astra 6 · Global Solutions Lab)')].filter(Boolean).join('\n\n');
  const links = {
    WhatsApp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    X: `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(url)}`,
    LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    Email: `mailto:?subject=${encodeURIComponent(t('Can you beat my Last Light delivery?'))}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  };
  return { url, text, xText, title: t('Last Light · a delivery challenge'), links };
}
/** A reusable driving screenshot with the selected clinic and real score. */
export async function challengeCard(mission: number, score?: number): Promise<Blob> {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 1200;
  const c = canvas.getContext('2d'); if (!c) throw new Error('Card unavailable');
  const picture = new Image();
  picture.src = `${import.meta.env.BASE_URL}story/share-drive.jpg`;
  await picture.decode();
  c.fillStyle = '#102e29'; c.fillRect(0, 0, 1200, 1200);
  c.fillStyle = '#f3d187'; c.font = '600 24px sans-serif';
  c.fillText('GLOBAL SOLUTIONS LAB', 48, 52);
  c.fillStyle = '#f5f0df'; c.font = 'bold 76px Georgia'; c.fillText('LAST LIGHT', 48, 140);
  const h = 1200 * picture.height / picture.width;
  c.drawImage(picture, 0, 180, 1200, h);
  c.fillStyle = '#f5f0df'; c.font = '600 32px sans-serif';
  c.fillText(CLINICS[mission].shortName, 48, 1075, 1104);
  c.fillStyle = '#f3d187'; c.font = '500 28px sans-serif';
  c.fillText(score === undefined ? t('Can you bring them the light?') : formatText('{0} points · your turn', score.toLocaleString(getLocale())), 48, 1124, 1104);
  c.fillStyle = '#f5f0df'; c.font = '24px sans-serif';
  c.fillText('newworld-game.org/games/last-light/', 48, 1170);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Card unavailable')),'image/png'));
}
