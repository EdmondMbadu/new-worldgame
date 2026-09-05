import * as admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { extractSavedVideoFrame } from './video-frame';

const MAX_BYTES = 256 * 1024 * 1024;
const RETRY_MS = 60 * 60 * 1000;
export function videoRevision(video: any): string {
  return `${String(video?.storagePath || '')}\n${String(video?.url || '')}`;
}
export function needsVideoThumbnail(video: any): boolean {
  if (!video) return false;
  const thumb = String(video.thumbUrl || '').trim();
  if (!thumb) return true;
  if (video.thumbnailVideoRevision && video.thumbnailVideoRevision !== (video.storagePath || video.url)) return true;
  try {
    const url = new URL(thumb, 'https://newworld-game.org');
    if (!['http:', 'https:'].includes(url.protocol)) return true;
    return ['newworld-game.org', 'www.newworld-game.org'].includes(url.hostname) &&
      ['/assets/img/weekly-brief-video.jpg', '/assets/img/landing-intro-sofia-thumbnail.jpg', '/assets/img/design-science.jpg'].includes(url.pathname);
  } catch { return true; }
}
export function canPublishVideoThumbnail(current: any, original: any, token: string): boolean {
  return !!current && videoRevision(current) === videoRevision(original) &&
    current.thumbnailGeneration?.token === token && needsVideoThumbnail(current) &&
    String(current.thumbUrl || '') === String(original.thumbUrl || '');
}
const inFlight = new Map<string, Promise<any>>();
// Downloads use temporary storage (memory on Cloud Functions); process one per instance.
let queue: Promise<unknown> = Promise.resolve();
export async function loadNewsVideoWithThumbnail(id: string): Promise<any> {
  if (!/^[a-zA-Z0-9_-]{1,150}$/.test(id)) return undefined;
  if (inFlight.has(id)) return inFlight.get(id);
  const work = queue.then(() => prepare(id)).finally(() => inFlight.delete(id));
  queue = work.catch(() => undefined); inFlight.set(id, work); return work;
}
async function prepare(id: string): Promise<any> {
  const ref = admin.firestore().collection('nwgNewsVideos').doc(id);
  const token = randomUUID();
  const claim = await admin.firestore().runTransaction(async tx => {
    const snapshot = await tx.get(ref); const video = snapshot.data();
    if (!video || !needsVideoThumbnail(video) ||
        !new RegExp(`^nwgNewsVideos/videos/\\d{4}/${id}-[^/]+$`).test(String(video.storagePath || ''))) return { video, acquired: false };
    const state = video.thumbnailGeneration;
    if (state?.revision === videoRevision(video) && Number(state.retryAfterMs) > Date.now()) return { video, acquired: false };
    tx.update(ref, { thumbnailGeneration: { token, status: 'processing', revision: videoRevision(video), retryAfterMs: Date.now() + 120000 } });
    return { video, acquired: true };
  });
  if (!claim.acquired || !claim.video) return claim.video;
  const video = claim.video;
  let directory = ''; let uploadedPath = '';
  let bucket: ReturnType<ReturnType<typeof admin.storage>['bucket']> | undefined;
  try {
    bucket = admin.storage().bucket();
    const object = bucket.file(String(video.storagePath));
    const [metadata] = await object.getMetadata();
    const size = Number(metadata.size);
    if (!size || size > MAX_BYTES || !String(metadata.contentType || '').startsWith('video/')) throw new Error('Video exceeds automatic thumbnail limits or has unsupported content type');
    directory = await mkdtemp(join(tmpdir(), 'nwg-video-frame-'));
    const input = join(directory, 'input.mp4');
    let transferred = 0;
    const limiter = new Transform({ transform(chunk: Buffer, _encoding, callback) {
      transferred += chunk.length;
      callback(transferred > MAX_BYTES ? new Error('Video exceeds thumbnail size limit') : null, chunk);
    } });
    // Pin this storage generation; a replacement must not change bytes mid-download.
    await pipeline(bucket.file(String(video.storagePath), { generation: metadata.generation }).createReadStream(), limiter, createWriteStream(input), { signal: AbortSignal.timeout(15000) });
    const frame = await extractSavedVideoFrame(input, directory);
    uploadedPath = `nwgNewsVideos/thumbnails/${id}/auto-${token}.jpg`;
    await bucket.file(uploadedPath).save(frame.bytes, { resumable: false, metadata: {
      contentType: 'image/jpeg', cacheControl: 'public,max-age=31536000,immutable', metadata: { firebaseStorageDownloadTokens: token },
    } });
    const thumbUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(uploadedPath)}?alt=media&token=${token}`;
    const result = await admin.firestore().runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (!canPublishVideoThumbnail(current, video, token)) return { video: current, saved: false };
      const patch = { thumbUrl, thumbnailStoragePath: uploadedPath, thumbnailSeconds: frame.seconds,
        durationSeconds: frame.duration, thumbnailVideoRevision: video.storagePath || video.url,
        thumbnailGeneration: { token, status: 'ready', revision: videoRevision(video), retryAfterMs: 0 },
      };
      tx.update(ref, patch); return { video: { ...current, ...patch }, saved: true };
    });
    if (!result.saved) await bucket.file(uploadedPath).delete({ ignoreNotFound: true });
    return result.video;
  } catch (error: any) {
    console.warn('Automatic news video thumbnail failed', id, error?.code || error?.name || 'extraction_failed');
    if (uploadedPath && bucket) await bucket.file(uploadedPath).delete({ ignoreNotFound: true }).catch(() => undefined);
    await admin.firestore().runTransaction(async tx => {
      const current = (await tx.get(ref)).data();
      if (current?.thumbnailGeneration?.token === token) tx.update(ref, { thumbnailGeneration: {
        token, status: 'failed', revision: videoRevision(video), retryAfterMs: Date.now() + RETRY_MS,
      } });
    }).catch(() => undefined);
    return video; // The existing renderer retains its fallback when extraction fails.
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined);
  }
}
