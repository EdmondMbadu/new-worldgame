import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Keeps Last Light playable on slow and intermittent connections: after the
 * first visit, every game file comes from the device instead of the network.
 * The cache name is a hash of the built files, so each deploy replaces the
 * previous cache in one step. Pages are fetched network-first (a new release is
 * picked up at once, and the cached page still opens offline); ranged media
 * requests (streamed music) go straight to the network.
 */
export function serviceWorkerSource(version: string) {
  return `const CACHE = 'last-light-${version}';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('last-light-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (url.pathname.endsWith('/sw.js')) return;
  const page = request.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');
  const store = (response) => {
    if (response.ok && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  };
  event.respondWith(
    page
      ? fetch(request).then(store).catch(() => caches.match(request).then((hit) => hit || Response.error()))
      : caches.match(request).then((hit) => hit || fetch(request).then(store)),
  );
});
`;
}
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
/** Writes sw.js into the build output, versioned by the content of every file. */
export function offlineCache(): Plugin {
  let outDir = 'dist';
  return {
    name: 'last-light-offline-cache',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const hash = createHash('sha256');
      for (const file of files(outDir).sort()) {
        if (file.endsWith('sw.js')) continue;
        hash.update(path.relative(outDir, file));
        hash.update(readFileSync(file));
      }
      writeFileSync(path.join(outDir, 'sw.js'), serviceWorkerSource(hash.digest('hex').slice(0, 12)));
    },
  };
}
