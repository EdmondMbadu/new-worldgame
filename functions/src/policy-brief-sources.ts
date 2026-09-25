import { lookup } from 'node:dns/promises';
import { get } from 'node:https';
import { isIP } from 'node:net';
import type { PolicyResearchResponse } from './policy-brief-generation';
import { policyBriefPublicUrl } from './shared/policy-brief';

export function isPublicPolicySourceAddress(address: string): boolean {
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:db8:/i.test(address);
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 198 && (b === 18 || b === 19)));
}

const excludedHost = (host: string) => /(^|\.)(facebook\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|pinterest\.com|reddit\.com|youtube\.com|wikipedia\.org|scribd\.com|researchgate\.net)$/.test(host);
const cleanTitle = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&nbsp;/gi, ' ')
  .replace(/&#(\d+);/g, (_, n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : '')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => parseInt(n, 16) <= 0x10ffff ? String.fromCodePoint(parseInt(n, 16)) : '')
  .replace(/\s+/g, ' ').trim().slice(0, 400);

/** Fetch only search-provided public HTTPS sources; pin DNS addresses and check each redirect. */
async function inspectSource(initialUrl: string, signal: AbortSignal): Promise<{ url: string; title: string } | null> {
  let current = initialUrl;
  for (let hop = 0; hop < 5; hop++) {
    const safe = policyBriefPublicUrl(current);
    if (!safe) return null;
    const url = new URL(safe);
    if ((url.port && url.port !== '443') || excludedHost(url.hostname)) return null;
    signal.throwIfAborted();
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some((a) => !isPublicPolicySourceAddress(a.address))) return null;
    const address = addresses.find((a) => a.family === 4) || addresses[0];
    const response = await new Promise<{ status: number; location?: string; title: string }>((resolve, reject) => {
      const req = get({
        hostname: address.address, family: address.family, port: 443, servername: url.hostname,
        path: `${url.pathname}${url.search}`, signal,
        headers: { Host: url.host, 'User-Agent': 'GlobalSolutionsLab-PolicyBrief/1.0', Accept: 'text/html,application/pdf;q=0.9,*/*;q=0.5' },
      }, (res) => {
        let body = '';
        const status = res.statusCode || 0;
        const finish = () => {
          const title = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
          resolve({ status, location: res.headers.location, title: cleanTitle(title) });
          res.destroy();
        };
        if (status >= 300 || !String(res.headers['content-type']).includes('text/html')) { finish(); return; }
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          body += chunk;
          if (body.length >= 65536 || /<\/title>/i.test(body)) finish();
        });
        res.on('end', finish);
        res.on('error', reject);
      });
      req.on('error', reject);
    });
    if (response.status >= 300 && response.status < 400 && response.location) {
      current = new URL(response.location, url).href;
      continue;
    }
    if (response.status === 404 || response.status === 410) return null;
    // A blocked title request does not prove the public document is missing.
    return { url: safe, title: response.status >= 200 && response.status < 300 ? response.title : '' };
  }
  return null;
}

/** Retain grounding indices while replacing opaque search redirects with public source URLs. */
export async function preparePolicyResearchSources(
  response: PolicyResearchResponse,
  inspect: (url: string) => Promise<{ url: string; title: string } | null> = async (url) => {
    const signal = AbortSignal.timeout(6000);
    return Promise.race([
      inspectSource(url, signal),
      new Promise<null>((resolve) => signal.addEventListener('abort', () => resolve(null), { once: true })),
    ]);
  }
): Promise<PolicyResearchResponse> {
  const metadata = response.candidates?.[0]?.groundingMetadata;
  if (!metadata) return response;
  const chunks = await Promise.all((metadata.groundingChunks || []).slice(0, 32).map(async (chunk) => {
    const originalUrl = policyBriefPublicUrl(chunk.web?.uri);
    if (!originalUrl) return {};
    try {
      const resolved = await inspect(originalUrl);
      if (!resolved || !policyBriefPublicUrl(resolved.url) || excludedHost(new URL(resolved.url).hostname)) return {};
      const url = new URL(resolved.url);
      if (url.hostname === 'vertexaisearch.cloud.google.com') return {};
      const fileLabel = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || '').replace(/[-_]/g, ' ');
      return { web: { uri: resolved.url, title: resolved.title || (fileLabel.length > 12 ? `${fileLabel} — ${url.hostname}` : chunk.web?.title || url.hostname) } };
    } catch { return {}; }
  }));
  return { candidates: [{ groundingMetadata: { ...metadata, groundingChunks: chunks } }] };
}
