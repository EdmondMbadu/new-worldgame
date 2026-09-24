import { afterEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { JOURNEY_TRACKS, musicUrl } from '../src/journey-music';
import { allowHeavyDownloads, fastNetwork } from '../src/network';
import { detectTier, FrameGovernor, TIERS } from '../src/quality';
import { MISSIONS, roadX, roadY, heightAt } from '../src/missions';
import { roadWidth } from '../src/routes';
import { serviceWorkerSource } from '../scripts/offline-cache';

const asset = (path: string) => new URL(`../public/${path}`, import.meta.url);
const size = (path: string) => statSync(asset(path)).size;
afterEach(() => vi.unstubAllGlobals());

describe('what a first drive downloads', () => {
  it('keeps the essential art small and ships nothing the game does not use', () => {
    const base = ['road-color', 'road-normal', 'ground-color', 'ground-normal'];
    const textures = base.reduce((n, name) => n + size(`textures/${name}.webp`), 0);
    expect(textures).toBeLessThan(400 * 1024);
    for (const name of ['road-normal', 'ground-color', 'ground-normal'])
      expect(existsSync(asset(`textures/hd/${name}.webp`))).toBe(true);
    // The character is meshopt-compressed; clinics are built from code.
    expect(size('models/clinic-staff.glb')).toBeLessThan(350 * 1024);
    for (let id = 0; id < 5; id++) expect(existsSync(asset(`models/clinic-${id}.glb`))).toBe(false);
    // The unused sky HDR and roughness map are gone; the menu art is WebP.
    for (const gone of ['textures/sky.hdr', 'textures/road-arm.jpg', 'key-art.png']) expect(existsSync(asset(gone))).toBe(false);
    expect(size('key-art.webp')).toBeLessThan(250 * 1024);
    expect(size('key-art-small.webp')).toBeLessThan(100 * 1024);
    const story = JSON.parse(readFileSync(new URL('../../../content/drc-clinic-stories.json', import.meta.url), 'utf8'));
    for (const clinic of story.clinics.slice(0, 5))
      for (const scene of ['opening', 'closing']) expect(size(`audio/story/${clinic.id}-${scene}.mp3`)).toBeLessThan(150 * 1024);
  });
  it('streams a 96 kbps copy of each song unless the connection is known to be fast', () => {
    for (const track of JOURNEY_TRACKS) {
      const full = size(`audio/${track.file}`),
        lite = size(`audio/lite/${track.file}`);
      expect(lite).toBeGreaterThan(full * 0.4);
      expect(lite).toBeLessThan(full * 0.6);
      expect(musicUrl(track.file, true)).toMatch(new RegExp(`audio/${track.file}$`));
      expect(musicUrl(track.file, false)).toMatch(new RegExp(`audio/lite/${track.file}$`));
    }
    expect(fastNetwork()).toBe(false);
    vi.stubGlobal('navigator', { connection: { effectiveType: '4g', downlink: 12 } });
    expect(fastNetwork()).toBe(true);
    expect(allowHeavyDownloads()).toBe(true);
    vi.stubGlobal('navigator', { connection: { effectiveType: '4g', downlink: 12, saveData: true } });
    expect(fastNetwork()).toBe(false);
    expect(allowHeavyDownloads()).toBe(false);
    vi.stubGlobal('navigator', { connection: { effectiveType: '3g', downlink: 1.2 } });
    expect(fastNetwork()).toBe(false);
    expect(allowHeavyDownloads()).toBe(false);
  });
  it('caches every game file after the first visit, and replaces the cache on each release', () => {
    const a = serviceWorkerSource('aaa'),
      b = serviceWorkerSource('bbb');
    expect(a).toContain("'last-light-aaa'");
    expect(a).not.toBe(b);
    // Streamed music (ranged requests) and non-GET requests go to the network.
    expect(a).toContain("request.headers.has('range')");
    expect(a).toContain("request.method !== 'GET'");
    // Pages are network-first, so a new release is picked up at once.
    expect(a).toMatch(/page\s*\?\s*fetch\(request\)/);
    expect(() => new Function(a.replace(/self\./g, 'globalThis.').replace(/location\.origin/g, "''"))).not.toThrow();
  });
});

describe('rendering tiers', () => {
  const desktop = { gpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', memory: 8, cores: 12, touch: false };
  it('starts strong desktops on High, integrated graphics on Balanced, weak devices on Light', () => {
    expect(detectTier({ quality: 'auto' }, desktop)).toBe(2);
    expect(detectTier({ quality: 'auto' }, { ...desktop, gpu: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics)' })).toBe(1);
    expect(detectTier({ quality: 'auto' }, { ...desktop, gpu: 'ANGLE (Intel, Intel(R) HD Graphics 520)' })).toBe(0);
    expect(detectTier({ quality: 'auto' }, { ...desktop, memory: 2 })).toBe(0);
    expect(detectTier({ quality: 'auto' }, { gpu: 'Mali-G52', memory: 3, cores: 8, touch: true })).toBe(0);
    expect(detectTier({ quality: 'auto' }, { gpu: 'Adreno (TM) 650', memory: 6, cores: 8, touch: true })).toBe(1);
    expect(detectTier({ quality: 'auto' }, { gpu: 'Apple GPU', touch: true })).toBe(1);
    expect(detectTier({ quality: 'auto' }, { gpu: 'Google SwiftShader', touch: false })).toBe(0);
    // An explicit choice always wins.
    expect(detectTier({ quality: 'high' }, { ...desktop, memory: 1 })).toBe(2);
    expect(detectTier({ quality: 'medium' }, desktop)).toBe(1);
    expect(detectTier({ quality: 'low' }, desktop)).toBe(0);
  });
  it('keeps the full look on High and lightens only costly extras below it', () => {
    expect(TIERS.post[2]).toEqual({ msaa: 4, shafts: true, bloom: true });
    expect(TIERS.post[1].shafts && TIERS.post[1].bloom).toBe(true);
    for (const key of ['grass', 'hills', 'shadowMap', 'pixelCap'] as const) {
      expect(TIERS[key][0]).toBeLessThan(TIERS[key][1]);
      expect(TIERS[key][1]).toBeLessThan(TIERS[key][2]);
    }
  });
  it('lowers resolution first, then detail, when frames run long, and recovers resolution with headroom', () => {
    const g = new FrameGovernor(2, true);
    const run = (dt: number, seconds: number) => {
      const changes: string[] = [];
      for (let t = 0; t < seconds; t += dt) {
        const c = g.sample(dt);
        if (c) changes.push(c);
      }
      return changes;
    };
    run(1 / 60, 3); // settling after start
    // Four slow 1.5 s windows take the resolution from 100 % to 60 %…
    expect(run(1 / 20, 6.01)).toEqual(['scale', 'scale', 'scale', 'scale']);
    expect(g.scale).toBeCloseTo(0.6, 5);
    expect(g.tier).toBe(2);
    // …and the next one steps the detail down a tier.
    expect(run(1 / 20, 1.6)).toEqual(['tier']);
    expect(g.tier).toBe(1);
    const scaleAfterTier = g.scale;
    run(1 / 60, 12);
    expect(g.scale).toBeGreaterThan(scaleAfterTier);
    expect(g.tier).toBe(1); // never climbs back up a tier
    // Pauses and tab switches are not rendering cost.
    const calm = new FrameGovernor(2, true);
    for (let i = 0; i < 40; i++) expect(calm.sample(2)).toBe(null);
    expect(calm.scale).toBe(1);
    // A fixed choice never adapts.
    const fixed = new FrameGovernor(2, false);
    for (let i = 0; i < 600; i++) fixed.sample(1 / 10);
    expect([fixed.tier, fixed.scale]).toEqual([2, 1]);
  });
});

describe('faster world building', () => {
  it('remembers per-station profiles without mixing chapters or copies', () => {
    const m = MISSIONS[3],
      flat = { ...m, bend: 0 };
    for (const z of [10, 395, 10, 640.5, 395]) {
      const a = roadX(m, z),
        b = roadX(flat, z);
      expect(Math.abs(b)).toBe(0);
      expect(roadX(m, z)).toBe(a);
      expect(roadWidth(m, z)).toBe(roadWidth(m, z));
    }
    // Alternating stations always give the same answers as a fresh evaluation.
    const samples = [0, 250.25, 640, 1000.5].map((z) => [roadX(m, z), roadY(m, z), heightAt(m, roadX(m, z) + 7, z)]);
    for (let round = 0; round < 3; round++)
      [0, 250.25, 640, 1000.5].forEach((z, i) =>
        expect([roadX(m, z), roadY(m, z), heightAt(m, roadX(m, z) + 7, z)]).toEqual(samples[i]),
      );
  });
});
