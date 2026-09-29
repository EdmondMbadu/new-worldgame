import { CLINICS } from './clinic-stories';
import { challengeUrl } from './journey';
import { t, formatText, getLocale } from './locale';
export function shareChallenge(mission: number, mode: string, variant: number, score?: number) {
  const url = challengeUrl(mission, mode, variant);
  const achievement = score === undefined ? '' : formatText('I scored {0} points at {1}.', score.toLocaleString(getLocale()), CLINICS[mission].shortName).trim() + ' ';
  const text = formatText('Can you bring them the light? {0}Try this Last Light delivery and see how you do.', achievement);
  const links = {
    WhatsApp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    Facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    X: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    Email: `mailto:?subject=${encodeURIComponent(t('Can you beat my Last Light delivery?'))}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
  };
  return { url, text, title: t('Last Light · a delivery challenge'), links };
}
/** Locally rendered story card. Contains only the selected public challenge. */
export async function challengeCard(mission: number, score?: number): Promise<Blob> {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const c = canvas.getContext('2d'); if (!c) throw new Error('Card unavailable');
  c.fillStyle = '#102e29'; c.fillRect(0, 0, 1080, 1920);
  try {
    const picture = new Image(); picture.src = `${import.meta.env.BASE_URL}key-art.webp`; await picture.decode();
    const scale = Math.max(1080 / picture.width, 1920 / picture.height);
    c.drawImage(picture, (1080-picture.width*scale)/2, 0, picture.width*scale, picture.height*scale);
  } catch { /* The card remains useful when artwork is unavailable offline. */ }
  const shade = c.createLinearGradient(0, 0, 0, 1920); shade.addColorStop(0, '#0c252be6'); shade.addColorStop(.5, '#0c252b65'); shade.addColorStop(1, '#0c252b'); c.fillStyle=shade;c.fillRect(0,0,1080,1920);
  c.textAlign='left'; c.fillStyle='#f3d187';c.font='600 30px sans-serif';c.fillText('GLOBAL SOLUTIONS LAB',80,130);
  c.fillStyle='#f5f0df';c.font='bold 115px Georgia';c.fillText('LAST LIGHT',80,295);
  const lines=(text:string,y:number,size:number)=>{c.font=`500 ${size}px sans-serif`;let line='';for(const word of text.replace(/ ([?!:;])/g, '\u00a0$1').split(' ')){const next=line ? `${line} ${word}` : word;if(c.measureText(next).width>920 && line){c.fillText(line,80,y);y+=size*1.35;line=word;}else line=next;}c.fillText(line,80,y);return y+size*1.35;};
  lines(t('Can you bring them the light?'),410,54);
  c.fillStyle='#f3d187';lines(t('Invite 10 friends'),1310,52);
  c.fillStyle='#f5f0df';let y=lines(CLINICS[mission].shortName,1410,42);
  if(score!==undefined)y=lines(formatText('{0} points · your turn',score.toLocaleString(getLocale())),y+20,42);
  lines(t('Play free · guest or account'),y+45,32);
  lines(t('Add the challenge link to your story.'),1770,29);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Card unavailable')),'image/png'));
}
