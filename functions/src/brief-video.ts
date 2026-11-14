import { isIP } from 'node:net';
import { escapeBriefHtml as e, isPublicAddress, normalizeSourceUrl, probePublicMedia } from './brief-sources';
import { CURATED_BRIEF_VIDEOS } from './brief-curated-videos';
export interface BriefVideo {
  url: string; title: string; teaser: string; thumbnailUrl: string;
  durationSeconds: number; status: 'ready' | 'unavailable'; reason: string;
}
const origin = 'https://newworld-game.org';
// Reuse the site's existing Sofia artwork so legacy uploads have a visible face.
const fallback = `${origin}/assets/img/landing-intro-sofia-thumbnail.jpg`;

function youtubeVideoId(url: URL): string | undefined {
  const path = url.pathname.replace(/\/$/, '');
  const host = url.hostname.replace(/\.$/, '');
  if (host === 'youtu.be') return path.slice(1);
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    if (path === '/watch') return url.searchParams.get('v') || '';
    return path.match(/^\/(?:shorts|live|embed)\/([^/]+)$/)?.[1] || '';
  }
  if (['youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(host)) {
    return path.match(/^\/embed\/([^/]+)$/)?.[1] || '';
  }
  return undefined;
}

export async function resolveBriefVideo(raw: string, load: (id: string) => Promise<any>, probe: typeof probePublicMedia = probePublicMedia): Promise<BriefVideo | undefined> {
  if (!raw.trim()) return undefined;
  const url = normalizeSourceUrl(raw);
  const empty: BriefVideo = { url, title: "This week's video briefing", teaser: 'Watch the latest Global Solutions Lab news and opportunities.',
    thumbnailUrl: fallback, durationSeconds: 0, status: 'unavailable', reason: 'Invalid video link' };
  if (!url) return empty;
  const parsed = new URL(url);
  if (['newworld-game.org', 'www.newworld-game.org'].includes(parsed.hostname) && parsed.pathname.replace(/\/$/, '') === '/nwg-news') {
    const id = parsed.searchParams.get('v') || '';
    if (!id || !/^[a-zA-Z0-9_-]{1,150}$/.test(id)) return { ...empty, reason: 'Choose a specific NWG video using its share link.' };
    try {
      const video = await load(id) || CURATED_BRIEF_VIDEOS.find(v => v.id === id);
      if (!video || !normalizeSourceUrl(String(video.url || ''))) return { ...empty, reason: 'The selected video is no longer available.' };
      if (!(await probe(String(video.url), 'video'))) return { ...empty, reason: 'The selected video file could not be accessed. Check or replace it in NWG News.' };
      let thumb = '';
      try { thumb = video.thumbUrl ? normalizeSourceUrl(new URL(String(video.thumbUrl), origin).toString()) : ''; } catch { /* Use the default image for malformed legacy metadata. */ }
      if (thumb) {
        const thumbnail = new URL(thumb);
        if (['newworld-game.org', 'www.newworld-game.org'].includes(thumbnail.hostname) &&
            thumbnail.pathname === '/assets/img/weekly-brief-video.jpg') thumb = '';
      }
      if (video.thumbnailVideoRevision && video.thumbnailVideoRevision !== (video.storagePath || video.url)) thumb = '';
      if (thumb && !(await probe(thumb, 'image'))) thumb = '';
      return { ...empty, url: `${origin}/nwg-news?v=${encodeURIComponent(id)}`, title: String(video.title || empty.title).slice(0, 180),
        teaser: String(video.tagline || empty.teaser).slice(0, 350), thumbnailUrl: thumb || fallback,
        durationSeconds: Math.max(0, Number(video.durationSeconds) || 0), status: 'ready', reason: thumb ? '' : 'Using the default image. Edit this video to choose a frame.' };
    } catch { return { ...empty, reason: 'Video metadata could not be loaded. Try again.' }; }
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '');
  const publicHost = isIP(host) ? isPublicAddress(host) : host.includes('.') && !/\.(localhost|local|internal)$/.test(host);
  if (!publicHost) {
    return { ...empty, reason: 'Use a public video link.' };
  }

  // Keep the full share link for timestamps, unlisted videos and signed URLs.
  const shareUrl = new URL(raw.trim()).href;
  const youtubeId = youtubeVideoId(parsed);
  if (youtubeId !== undefined) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
      return { ...empty, reason: 'Paste the share link for a specific YouTube video.' };
    }
    return { ...empty, url: shareUrl, thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
      status: 'ready', reason: '' };
  }

  return { ...empty, url: shareUrl, status: 'ready',
    reason: 'Using the default image. Open the video to check that recipients can play it.' };
}
export function renderBriefVideo(video?: BriefVideo): string {
  if (!video || video.status !== 'ready' || !normalizeSourceUrl(video.url)) return '';
  const duration = Number.isFinite(video.durationSeconds) && video.durationSeconds > 0 ? `${Math.floor(video.durationSeconds / 60)}:${String(Math.floor(video.durationSeconds % 60)).padStart(2, '0')}` : '';
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="table-layout:fixed;margin:24px 0;background:#111827;border-radius:12px;">
    <tr><td><a href="${e(video.url)}" target="_blank" rel="noopener noreferrer" aria-label="${e(`Watch ${video.title}`)}"><img src="${e(normalizeSourceUrl(video.thumbnailUrl) || fallback)}" alt="${e(`Watch: ${video.title}`)}" width="592" style="display:block;width:100%;max-width:592px;height:auto;border:0;border-radius:12px 12px 0 0;" /></a></td></tr>
    <tr><td style="padding:22px;overflow-wrap:break-word;"><p style="margin:0 0 8px;color:#5eead4;font-size:12px;font-weight:bold;letter-spacing:1px;">WEEKLY VIDEO BRIEFING${duration ? ` · ${duration}` : ''}</p>
    <h2 style="margin:0 0 12px;font-size:24px;line-height:1.3;"><a href="${e(video.url)}" target="_blank" rel="noopener noreferrer" style="color:#ffffff;text-decoration:none;">${e(video.title)}</a></h2>
    <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">${e(video.teaser)}</p>
    <table cellpadding="0" cellspacing="0" role="presentation"><tr><td bgcolor="#14b8a6" style="border-radius:6px;"><a href="${e(video.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 20px;color:#062f2b;font-size:15px;font-weight:bold;text-decoration:none;">&#9654; Watch this week’s briefing${duration ? ` (${duration})` : ''}</a></td></tr></table>
    </td></tr></table>`;
}
