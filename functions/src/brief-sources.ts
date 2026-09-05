import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { request as httpsRequest } from 'node:https';
import { request as httpRequest } from 'node:http';
import { createHash } from 'node:crypto';
import sanitizeHtml = require('sanitize-html');

export const BRIEF_PIPELINE_VERSION = 2;
export const VALIDATION_TTL_MS = 24 * 60 * 60 * 1000;
export type SourceKind = 'news' | 'funding';
export type SourceStatus = 'verified' | 'dead' | 'unverified' | 'rejected';
export interface BriefSource {
  kind: SourceKind; title: string; url: string; publisher: string;
  relevance: string; evidence: string; date: string; deadline: string;
  eligibility: string; nextAction: string; score: number;
  status: SourceStatus; reason: string; checkedAt: number;
}
export interface SourcePage { url: string; status: number; text: string; title: string; }
export const escapeBriefHtml = (s: unknown): string => String(s || '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const briefContextKey = (context: string, now = Date.now()): string =>
  `v${BRIEF_PIPELINE_VERSION}_${Math.floor(now / (5 * VALIDATION_TTL_MS))}_${createHash('sha256').update(context).digest('hex').slice(0, 24)}`;

export function normalizeSourceUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
        (url.port && !['80', '443'].includes(url.port))) return '';
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_.+|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch { return ''; }
}
const blocked = new BlockList();
for (const [address, prefix] of [['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10],
  ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]] as const) blocked.addSubnet(address, prefix, 'ipv4');
// Only globally routed IPv6 unicast is eligible; also reject mapped IPv4 and transition ranges.
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, 'ipv4');
  if (family !== 6 || !/^[23][0-9a-f]{3}:/i.test(address)) return false;
  return !/^2001:(?:0{1,4}:|0?db8:|0?1[0-9a-f]:|0?2[0-9a-f]:)/i.test(address) && !/^2002:/i.test(address);
}

async function download(raw: string, deadline: number, redirects = 0, mediaProbe = false): Promise<{ url: string; status: number; type: string; body: Buffer }> {
  const normalized = normalizeSourceUrl(raw);
  if (!normalized || redirects > 5 || Date.now() >= deadline) throw new Error('Unsafe URL or request limit');
  const url = new URL(normalized);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) throw new Error('Private destination');
  const records = await Promise.race([
    lookup(hostname, { all: true }),
    new Promise<never>((_, reject) => { const timer = setTimeout(() => reject(new Error('DNS timeout')), Math.max(1, deadline - Date.now())); timer.unref(); }),
  ]);
  if (!records.length || records.some(r => !isPublicAddress(r.address))) throw new Error('Private destination');
  const address = records[0];
  const response = await new Promise<{ status: number; type: string; location: string; body: Buffer }>((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      method: 'GET', agent: false, family: address.family,
      // Pin the validated address so DNS cannot rebind between validation and connection.
      lookup: (_host, _options, cb) => cb(null, address.address, address.family),
      headers: { 'User-Agent': 'GlobalSolutionsLab/2.0 (+https://newworld-game.org)', Accept: 'text/html,application/pdf,text/plain', 'Accept-Encoding': 'identity', ...(mediaProbe ? { Range: 'bytes=0-2047' } : {}) },
    }, res => {
      const status = res.statusCode || 0;
      const location = String(res.headers.location || '');
      if (status >= 300 && status < 400 && location) {
        res.resume(); resolve({ status, location, type: '', body: Buffer.alloc(0) }); return;
      }
      const chunks: Buffer[] = []; let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (mediaProbe && size >= 2048) {
          resolve({ status, location, type: String(res.headers['content-type'] || ''), body: chunk.subarray(0, 2048) });
          res.destroy(); return;
        }
        if (size > 2 * 1024 * 1024) { request.destroy(new Error('Page exceeds size limit')); return; }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ status, location, type: String(res.headers['content-type'] || ''), body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    const timer = setTimeout(() => request.destroy(new Error('Request timed out')), Math.max(1, deadline - Date.now()));
    request.on('close', () => clearTimeout(timer)); request.on('error', reject); request.end();
  });
  if (response.location && response.status >= 300 && response.status < 400) {
    return download(new URL(response.location, url).toString(), deadline, redirects + 1, mediaProbe);
  }
  return { ...response, url: normalized };
}

export async function probePublicMedia(url: string, kind: 'video' | 'image'): Promise<boolean> {
  try {
    const response = await download(url, Date.now() + 8000, 0, true);
    return response.status >= 200 && response.status < 300 && response.type.toLowerCase().startsWith(`${kind}/`);
  } catch { return false; }
}

export function htmlPage(url: string, status: number, html: string): SourcePage {
  const title = sanitizeHtml(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '', { allowedTags: [], allowedAttributes: {} });
  const text = sanitizeHtml(html.replace(/<(script|style|nav|footer)[\s\S]*?<\/\1>/gi, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  return { url, status, title, text: text.slice(0, 45000) };
}
export async function fetchSourcePage(url: string): Promise<SourcePage> {
  let response = await download(url, Date.now() + 8000);
  if ([429, 502, 503, 504].includes(response.status)) {
    await new Promise(resolve => setTimeout(resolve, 300));
    response = await download(url, Date.now() + 8000);
  }
  if (response.type.includes('application/pdf') && response.status === 200) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const parse = require('pdf-parse');
    const pdf = await parse(response.body, { max: 8 });
    return { url: response.url, status: response.status, title: String(pdf.info?.Title || ''), text: String(pdf.text || '').replace(/\s+/g, ' ').slice(0, 45000) };
  }
  if (!/text\/(html|plain)|application\/xhtml/i.test(response.type) && response.status >= 200 && response.status < 300) throw new Error('Unsupported page type');
  return htmlPage(response.url, response.status, response.body.toString('utf8'));
}
export function pageProblem(page: SourcePage): string {
  if ([404, 410].includes(page.status)) return 'dead';
  if (page.status < 200 || page.status >= 300) return `HTTP ${page.status}`;
  if (/\b(page not found|404 not found|access denied|just a moment|verify you are human|robot check|page unavailable)\b/i.test(page.title)) return 'Unavailable page';
  if (page.text.length < 180) return 'Insufficient page content';
  if (page.text.length < 1600 && /page (?:you .{0,30})?(?:not found|does not exist)|checking your browser|verify you are human/i.test(page.text)) return 'Unavailable page';
  return '';
}
export function parseJsonObject(text: string): any {
  try { return JSON.parse(text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')); } catch { return {}; }
}
export function evidenceInPage(quote: string, text: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const q = normalize(quote); return q.length >= 30 && normalize(text).includes(q);
}
export function eligibleSource(source: BriefSource, now = Date.now()): boolean {
  if (source.status !== 'verified' || !source.checkedAt || now - source.checkedAt >= VALIDATION_TTL_MS || source.checkedAt > now + 60000) return false;
  if (source.kind === 'news') {
    const date = Date.parse(source.date);
    if (!Number.isFinite(date) || date > now + VALIDATION_TTL_MS || now - date > 90 * VALIDATION_TTL_MS) return false;
  }
  if (source.deadline && /^\d{4}-\d{2}-\d{2}$/.test(source.deadline) && Date.parse(source.deadline) + VALIDATION_TTL_MS <= now) return false;
  return source.score >= 75;
}
export function selectBriefSources(sources: BriefSource[], kind: SourceKind, now = Date.now()): BriefSource[] {
  const urls = new Set<string>(); const titles = new Set<string>(); const hosts = new Map<string, number>();
  return sources.filter(s => s.kind === kind && eligibleSource(s, now)).sort((a, b) => b.score - a.score).filter(s => {
    const url = normalizeSourceUrl(s.url); if (!url) return false;
    const host = new URL(url).hostname.replace(/^www\./, ''); const title = s.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (urls.has(url) || titles.has(title) || (hosts.get(host) || 0) >= 2) return false;
    urls.add(url); titles.add(title); hosts.set(host, (hosts.get(host) || 0) + 1); return true;
  }).slice(0, 5);
}
export function renderBriefSources(sources: BriefSource[], kind: SourceKind): string {
  const items = selectBriefSources(sources, kind);
  if (!items.length) return `<tr><td style="padding:16px 0;color:#6b7280;">No verified ${kind === 'news' ? 'news' : 'funding'} links available today.</td></tr>`;
  return items.map(s => `<tr><td style="padding:16px 0;border-bottom:1px solid #f1f5f9;">
    <p style="margin:0 0 6px;font-size:16px;font-weight:600;color:#111827;">${escapeBriefHtml(s.title)}</p>
    <p style="margin:0;font-size:12px;color:#6b7280;">${escapeBriefHtml(s.publisher)}${s.date ? ` · ${escapeBriefHtml(s.date)}` : ''}</p>
    <p style="margin:8px 0;font-size:14px;line-height:1.6;color:#4b5563;">${escapeBriefHtml(s.relevance)}</p>
    ${kind === 'funding' ? `<p style="font-size:13px;color:#4b5563;">${escapeBriefHtml(s.eligibility || 'Confirm eligibility with the funder.')}<br>Cycle / deadline: ${escapeBriefHtml(s.deadline || 'Check current cycle')}</p>` : ''}
    <a href="${escapeBriefHtml(normalizeSourceUrl(s.url))}" style="font-size:14px;color:#2563eb;">${escapeBriefHtml(s.nextAction || (kind === 'news' ? 'Read article' : 'View eligibility'))} →</a>
    </td></tr>`).join('');
}
