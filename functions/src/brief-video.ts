import { escapeBriefHtml as e, normalizeSourceUrl, fetchSourcePage, pageProblem, probePublicMedia } from './brief-sources';
import { CURATED_BRIEF_VIDEOS } from './brief-curated-videos';
export interface BriefVideo {
  url: string; title: string; teaser: string; thumbnailUrl: string;
  durationSeconds: number; status: 'ready' | 'unavailable'; reason: string;
}
const origin = 'https://newworld-game.org';
const fallback = `${origin}/assets/img/weekly-brief-video.jpg`;
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
      if (video.thumbnailVideoRevision && video.thumbnailVideoRevision !== (video.storagePath || video.url)) thumb = '';
      if (thumb && !(await probe(thumb, 'image'))) thumb = '';
      return { ...empty, url: `${origin}/nwg-news?v=${encodeURIComponent(id)}`, title: String(video.title || empty.title).slice(0, 180),
        teaser: String(video.tagline || empty.teaser).slice(0, 350), thumbnailUrl: thumb || fallback,
        durationSeconds: Math.max(0, Number(video.durationSeconds) || 0), status: 'ready', reason: thumb ? '' : 'Using the default image. Edit this video to choose a frame.' };
    } catch { return { ...empty, reason: 'Video metadata could not be loaded. Try again.' }; }
  }
  if (/\.(mp4|webm|mov|m4v)(?:$|[?])/i.test(url) && await probe(url, 'video')) {
    return { ...empty, status: 'ready', reason: 'Direct video: using the default image.' };
  }
  // Preserve existing external page links, but do not invent video metadata.
  try {
    const page = await fetchSourcePage(url);
    if (pageProblem(page)) return { ...empty, reason: 'The external video page could not be verified.' };
    return { ...empty, url: page.url, status: 'ready', reason: 'External video: using the default image.' };
  } catch { return { ...empty, reason: 'The external video page could not be verified.' }; }
}
export function renderBriefVideo(video?: BriefVideo): string {
  if (!video || video.status !== 'ready' || !normalizeSourceUrl(video.url)) return '';
  const duration = Number.isFinite(video.durationSeconds) && video.durationSeconds > 0 ? `${Math.floor(video.durationSeconds / 60)}:${String(Math.floor(video.durationSeconds % 60)).padStart(2, '0')}` : '';
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="table-layout:fixed;margin:24px 0;background:#111827;border-radius:12px;">
    <tr><td><a href="${e(video.url)}" aria-label="${e(`Watch ${video.title}`)}"><img src="${e(normalizeSourceUrl(video.thumbnailUrl) || fallback)}" alt="${e(`Watch: ${video.title}`)}" width="592" style="display:block;width:100%;max-width:592px;height:auto;border:0;border-radius:12px 12px 0 0;" /></a></td></tr>
    <tr><td style="padding:22px;overflow-wrap:break-word;"><p style="margin:0 0 8px;color:#5eead4;font-size:12px;font-weight:bold;letter-spacing:1px;">WEEKLY VIDEO BRIEFING${duration ? ` · ${duration}` : ''}</p>
    <h2 style="margin:0 0 12px;font-size:24px;line-height:1.3;"><a href="${e(video.url)}" style="color:#ffffff;text-decoration:none;">${e(video.title)}</a></h2>
    <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.6;">${e(video.teaser)}</p>
    <table cellpadding="0" cellspacing="0" role="presentation"><tr><td bgcolor="#14b8a6" style="border-radius:6px;"><a href="${e(video.url)}" style="display:inline-block;padding:14px 20px;color:#062f2b;font-size:15px;font-weight:bold;text-decoration:none;">&#9654; Watch this week’s briefing${duration ? ` (${duration})` : ''}</a></td></tr></table>
    </td></tr></table>`;
}
