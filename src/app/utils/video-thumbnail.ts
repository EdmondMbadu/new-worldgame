/** Extract real video frames locally; no video is sent to an AI provider. */
export interface VideoThumbnail { dataUrl: string; seconds: number; duration: number; qualityScore?: number; }
export async function extractVideoThumbnails(source: File | string, timestamp?: number): Promise<VideoThumbnail[]> {
  const video = document.createElement('video');
  const objectUrl = source instanceof File ? URL.createObjectURL(source) : '';
  video.crossOrigin = 'anonymous'; video.preload = 'auto'; video.muted = true;
  const waitFor = (event: string, action: () => void): Promise<void> => new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); video.removeEventListener(event, done); video.removeEventListener('error', failed); };
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error('Unable to read video frames. Try a custom thumbnail.')); };
    const timer = setTimeout(failed, 20000);
    video.addEventListener(event, done, { once: true }); video.addEventListener('error', failed, { once: true }); action();
  });
  try {
    await waitFor('loadeddata', () => { video.src = objectUrl || source as string; video.load(); });
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('Video duration is unavailable.');
    const points = timestamp !== undefined ? [Math.max(0, Math.min(timestamp, Math.max(0, duration - .05)))] : [.12, .35, .65].map(f => Math.min(duration - .05, Math.max(.01, duration * f)));
    const results: VideoThumbnail[] = [];
    for (const seconds of points) {
      if (Math.abs(video.currentTime - seconds) > .001) await waitFor('seeked', () => { video.currentTime = seconds; });
      results.push({ dataUrl: drawVideoThumbnail(video, video.videoWidth, video.videoHeight), seconds, duration, qualityScore: frameClarity(video) });
    }
    return results.sort((a, b) => (b.qualityScore || 0) - (a.qualityScore || 0));
  } finally { video.removeAttribute('src'); video.load(); if (objectUrl) URL.revokeObjectURL(objectUrl); }
}
export function drawVideoThumbnail(source: CanvasImageSource, width: number, height: number): string {
  const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 675;
  const ctx = canvas.getContext('2d'); if (!ctx || !width || !height) throw new Error('Image cannot be processed.');
  ctx.fillStyle = '#111827'; ctx.fillRect(0, 0, 1200, 675);
  // Fit the whole frame so presentation text and faces are never cropped out.
  const scale = Math.min(1200 / width, 675 / height);
  ctx.drawImage(source, (1200 - width * scale) / 2, (675 - height * scale) / 2, width * scale, height * scale);
  ctx.fillStyle = 'rgba(15,23,42,.8)'; ctx.beginPath(); ctx.arc(600, 337.5, 62, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(584, 306); ctx.lineTo(584, 369); ctx.lineTo(634, 337.5); ctx.closePath(); ctx.fill();
  let quality = .82; let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > 275000 && quality > .45) { quality -= .1; result = canvas.toDataURL('image/jpeg', quality); }
  return result;
}
export async function customVideoThumbnail(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP image under 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    return drawVideoThumbnail(image, image.naturalWidth, image.naturalHeight);
  } finally { URL.revokeObjectURL(url); }
}

// Prefer visible detail over black frames or blurry transitions; administrators can still choose any frame.
function frameClarity(video: HTMLVideoElement): number {
  const sample = document.createElement('canvas'); sample.width = 96; sample.height = 54;
  const ctx = sample.getContext('2d'); if (!ctx) return 0;
  ctx.drawImage(video, 0, 0, 96, 54);
  const pixels = ctx.getImageData(0, 0, 96, 54).data;
  let visible = 0; let edges = 0; let previous = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
    if (luminance > 20) visible++;
    if ((i / 4) % 96) edges += Math.abs(luminance - previous);
    previous = luminance;
  }
  return (visible / (96 * 54)) * (1 + edges / (96 * 54));
}
