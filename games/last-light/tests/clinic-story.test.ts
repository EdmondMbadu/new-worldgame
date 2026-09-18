import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { CLINICS, STORY_EDITION } from '../src/clinic-stories';
import { SceneNarrator } from '../src/narration';
import { defaultSettings, freshSave, parseSave, recordResult, unlocked } from '../src/save';
import { MISSIONS } from '../src/missions';

class Node {
  gain = { value: 0 };
  connect = vi.fn((node: Node) => node);
  disconnect = vi.fn();
}
class Clip {
  static all: Clip[] = [];
  hidden = false;
  preload = '';
  dataset = {};
  src = '';
  paused = true;
  currentTime = 0;
  duration = 20;
  readyState = 4;
  onerror: (() => void) | null = null;
  reject: string | null = null;
  deferred: (() => void) | null = null;
  delay = false;
  get ended() { return this.currentTime >= this.duration; }
  constructor() { Clip.all.push(this); }
  play = vi.fn(() => {
    if (this.reject) return Promise.reject({ name: this.reject });
    this.paused = false;
    return this.delay ? new Promise<void>(resolve => { this.deferred = resolve; }) : Promise.resolve();
  });
  pause = vi.fn(() => { this.paused = true; });
  load = vi.fn();
  remove = vi.fn();
  removeAttribute = vi.fn(() => { this.src = ''; });
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
let narrator: SceneNarrator;
let context: { state: string; createGain: () => Node; createMediaElementSource: () => Node };
beforeEach(() => {
  Clip.all = [];
  vi.stubGlobal('Audio', Clip);
  vi.stubGlobal('document', { body: { appendChild: vi.fn() } });
  context = { state: 'running', createGain: () => new Node(), createMediaElementSource: () => new Node() };
  narrator = new SceneNarrator(context as unknown as AudioContext, new Node() as unknown as AudioNode, CLINICS[0]);
});
afterEach(() => { narrator.dispose(); vi.unstubAllGlobals(); });

describe('scene narration boundaries', () => {
  it('starts the opening, stops it before driving, and plays the closing once', async () => {
    narrator.select('opening'); narrator.unlock(); narrator.update(true); await flush();
    expect(narrator.playing).toBe(true);
    expect(Clip.all[1].paused).toBe(true);
    Clip.all[0].currentTime = 6;
    narrator.select(null); narrator.update(true); await flush();
    expect(Clip.all.every(c => c.paused)).toBe(true);
    expect(narrator.state.scene).toBeNull();
    narrator.select('closing'); narrator.update(true); await flush();
    expect(Clip.all[1].paused).toBe(false);
    Clip.all[1].currentTime = 20;
    const count = Clip.all[1].play.mock.calls.length;
    for (let i = 0; i < 100; i++) { narrator.select('closing'); narrator.update(true); }
    expect(narrator.state.status).toBe('ended');
    expect(Clip.all[1].play).toHaveBeenCalledTimes(count);
    narrator.select(null); narrator.select('closing', false); narrator.update(true);
    expect(Clip.all[1].paused).toBe(true); // Arrival replay does not repeat the speech.
    narrator.toggle(); await flush();
    expect(Clip.all[1].paused).toBe(false);
  });
  it('cancels a delayed play promise when Start is pressed and releases it on chapter exit', async () => {
    Clip.all[0].delay = true;
    narrator.select('opening'); narrator.update(true);
    narrator.select(null);
    Clip.all[0].deferred!(); await flush();
    expect(Clip.all[0].paused).toBe(true);
    expect(narrator.playing).toBe(false);
    narrator.dispose(); narrator.dispose();
    expect(Clip.all.every(c => c.src === '' && c.remove.mock.calls.length === 1)).toBe(true);
    narrator.select('closing'); narrator.unlock(); narrator.update(true);
    expect(Clip.all.every(c => c.paused)).toBe(true);
  });
  it('preserves position through mute, settings, hidden tabs and suspended contexts', async () => {
    narrator.select('opening'); narrator.update(true); await flush();
    Clip.all[0].currentTime = 7.25;
    narrator.update(false);
    expect(Clip.all[0].paused).toBe(true);
    narrator.update(true); await flush();
    expect(Clip.all[0].currentTime).toBe(7.25);
    expect(narrator.playing).toBe(true);
    context.state = 'suspended'; narrator.update(true);
    expect(narrator.playing).toBe(false);
    context.state = 'running'; narrator.update(true); await flush();
    narrator.toggle(); narrator.update(false); narrator.update(true); await flush();
    expect(Clip.all[0].paused).toBe(true); // An explicit pause survives focus changes.
    narrator.resume(); await flush();
    expect(narrator.playing).toBe(true);
  });
  it('does not retry blocked or missing clips per frame, and recovers blocked audio by gesture', async () => {
    Clip.all[0].reject = 'NotAllowedError';
    narrator.select('opening'); narrator.update(true); await flush();
    const attempts = Clip.all[0].play.mock.calls.length;
    for (let i = 0; i < 100; i++) narrator.update(true);
    expect(Clip.all[0].play).toHaveBeenCalledTimes(attempts);
    expect(narrator.state.status).toBe('blocked');
    Clip.all[0].reject = null; narrator.resume(); await flush();
    expect(narrator.playing).toBe(true);
    narrator.select('closing'); Clip.all[1].onerror!();
    narrator.update(true); await flush();
    expect(narrator.state.status).toBe('error');
    expect(narrator.playing).toBe(false);
  });
  it('treats buffering as silence for music ducking', async () => {
    Clip.all[0].readyState = 2;
    narrator.select('opening'); narrator.update(true); await flush();
    expect(narrator.playing).toBe(false);
    expect(narrator.state.status).toBe('loading');
    Clip.all[0].readyState = 4;
    expect(narrator.playing).toBe(true);
  });
});

describe('campaign data and save continuity', () => {
  const result = { mission: 0, mode: 'standard' as const, remaining: 100, integrity: 90, lives: 3, score: 1615, stars: 3 };
  it('retains old records, settings and unlocks without crediting the new story', () => {
    const legacy = { version: 1, completed: [0, 1], best: { '0:standard': result }, settings: { ...defaultSettings(), voice: true, volume: .4 } };
    const save = parseSave(JSON.stringify(legacy));
    expect(save.best).toEqual(legacy.best);
    expect(save.completed).toEqual([0, 1]);
    expect(save.settings.volume).toBe(.4);
    expect(unlocked(save, 2)).toBe(true);
    expect(save.story).toEqual({ edition: STORY_EDITION, completed: [], best: {} });
    expect(save.settings.roadSounds).toBe(false);
  });
  it('records each new delivery once, excludes practice, and round-trips both editions', () => {
    let save = recordResult(freshSave(), result);
    save = recordResult(save, { ...result, score: 1500 });
    expect(save.story.completed).toEqual([0]);
    expect(save.story.best['0:standard'].score).toBe(1615);
    expect(recordResult(save, { ...result, practice: true })).toBe(save);
    expect(parseSave(JSON.stringify(save))).toEqual(save);
    const damaged = parseSave(JSON.stringify({ ...save, story: { ...save.story, best: { '0:standard': { ...result, lives: 10582 } } } }));
    expect(damaged.story.completed).toEqual([]);
  });
  it('uses the first five campaign clinics in exactly their source order', () => {
    const source = readFileSync(new URL('../../../src/app/components/drc-clinic-campaign/drc-clinic-campaign.component.ts', import.meta.url), 'utf8');
    const names = [...source.matchAll(/id: '([^']+)',\s*index: '\d+',\s*name: '([^']+)'/g)].slice(0, 5).map(m => ({ id: m[1], name: m[2] }));
    expect(CLINICS.map(c => ({ id: c.id, name: c.name }))).toEqual(names);
    expect(CLINICS.every(c => c.population === null)).toBe(true);
    expect(CLINICS[0].stage).toBe('online');
    expect(CLINICS[0].careAreas).toHaveLength(5);
    expect(MISSIONS.map(m => m.place)).toEqual(CLINICS.map(c => c.shortName));
    expect(MISSIONS.every(m => m.radio.length === 0)).toBe(true);
  });
});
