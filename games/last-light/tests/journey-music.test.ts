import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { JourneyMusic, JOURNEY_TRACKS, MUSIC_CROSSFADE } from '../src/journey-music';
import { Soundtrack } from '../src/audio';
import { defaultSettings } from '../src/save';
import { CLINICS } from '../src/clinic-stories';
import type { GameEngine } from '../src/engine';

class FakeNode {
  gain = { value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
  frequency = { value: 0, setTargetAtTime: vi.fn() };
  pan = { value: 0, setTargetAtTime: vi.fn() };
  threshold = { value: 0 };
  ratio = { value: 0 };
  connect = vi.fn((node: FakeNode) => node);
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
class FakeContext {
  currentTime = 0;
  sampleRate = 1000;
  state = 'running';
  destination = new FakeNode();
  gains: FakeNode[] = [];
  sources: FakeNode[] = [];
  resume = vi.fn(async () => { this.state = 'running'; });
  close = vi.fn(async () => { this.state = 'closed'; });
  createGain() { const n = new FakeNode(); this.gains.push(n); return n; }
  createMediaElementSource() { const n = new FakeNode(); this.sources.push(n); return n; }
  createDynamicsCompressor() { return new FakeNode(); }
  createOscillator() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createBufferSource() { return new FakeNode(); }
  createStereoPanner() { return new FakeNode(); }
  createBuffer() { return { getChannelData: () => new Float32Array(2000) }; }
}
class FakeAudio {
  static instances: FakeAudio[] = [];
  hidden = false;
  dataset = {};
  preload = '';
  src = '';
  currentTime = 0;
  duration = 167;
  readyState = 4;
  paused = true;
  onerror: (() => void) | null = null;
  reject: string | null = null;
  get ended() { return this.currentTime >= this.duration; }
  constructor() { FakeAudio.instances.push(this); }
  play = vi.fn(() => {
    if (this.reject) return Promise.reject({ name: this.reject });
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => { this.paused = true; });
  removeAttribute = vi.fn(() => { this.src = ''; });
  load = vi.fn();
  remove = vi.fn();
}
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
let context: FakeContext;
let player: JourneyMusic;
let main: FakeAudio;
let next: FakeAudio;
beforeEach(() => {
  FakeAudio.instances = [];
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('document', { body: { appendChild: vi.fn() }, hidden: false, hasFocus: () => true });
  context = new FakeContext();
  player = new JourneyMusic(context as unknown as AudioContext, context.destination as unknown as AudioNode);
  [main, next] = FakeAudio.instances;
});
afterEach(() => { player.dispose(); vi.unstubAllGlobals(); });
const start = async () => { player.unlock(); await flush(); player.update(true, 0.06); await flush(); };
const finishFade = () => { for (let i = 0; i < 70; i++) player.update(true, 0.06); };

describe('streamed journey score', () => {
  it('bundles the original supplied songs byte-for-byte', () => {
    const hashes = ['3926e424fe6361323af61fd15dd788c9dfcffa622bae828316ff9825fbe468a8', '2650fc9979aa7c69d3cfa5959da8295a17bc347bab44fc885e43f10bdc416be1'];
    JOURNEY_TRACKS.forEach((track, i) => {
      const bytes = readFileSync(new URL(`../public/audio/${track.file}`, import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(hashes[i]);
    });
  });
  it('starts with Morning and primes both native players silently inside the gesture', async () => {
    expect(main.src).toContain('audio/morning-on-the-ridge.mp3');
    expect(next.src).toContain('audio/light-at-the-clearing.mp3');
    expect(context.gains.every((n) => n.gain.value === 0)).toBe(true);
    player.unlock();
    expect(main.play).toHaveBeenCalledTimes(1);
    expect(next.play).toHaveBeenCalledTimes(1);
    await flush();
    player.update(true, 0.06);
    await flush();
    expect(main.paused).toBe(false);
    expect(next.paused).toBe(true);
    expect(context.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.08);
  });
  it('crossfades into Clearing and cycles back without overlapping stray players', async () => {
    await start();
    main.currentTime = main.duration - MUSIC_CROSSFADE;
    player.update(true, 0.06);
    await flush();
    finishFade();
    expect(main.paused).toBe(true);
    expect(main.currentTime).toBe(0);
    expect(next.paused).toBe(false);
    next.currentTime = next.duration - MUSIC_CROSSFADE;
    player.update(true, 0.06);
    await flush();
    finishFade();
    expect(main.paused).toBe(false);
    expect(next.paused).toBe(true);
    expect(next.currentTime).toBe(0);
  });
  it('does not fade out Morning while Clearing buffers', async () => {
    await start();
    main.currentTime = main.duration - 4;
    next.readyState = 2;
    player.update(true, 0.06);
    await flush();
    finishFade();
    expect(context.gains[0].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.08);
    expect(main.paused).toBe(false);
    next.readyState = 4;
    finishFade();
    expect(main.paused).toBe(true);
  });
  it('requests the arrival track once without restarting its cursor', async () => {
    await start();
    main.currentTime = 80;
    player.request(1);
    player.update(true, .06);
    await flush();
    next.currentTime = 1.2;
    player.request(1);
    expect(next.currentTime).toBe(1.2);
    finishFade();
    player.request(1);
    expect(next.currentTime).toBe(1.2);
    expect(main.paused).toBe(true);
    expect(next.paused).toBe(false);
  });
  it('reverses a quick Next transition continuously, preserving both cursors', async () => {
    await start();
    main.currentTime = 80;
    player.request(1);
    player.update(true, .06);
    await flush();
    for (let i = 0; i < 20; i++) player.update(true, .06);
    next.currentTime = 1.2;
    const before = context.gains.map(n => n.gain.setTargetAtTime.mock.lastCall![0]);
    player.request(0);
    player.update(true, 0);
    context.gains.forEach((n, i) => expect(n.gain.setTargetAtTime.mock.lastCall![0]).toBeCloseTo(before[i]));
    expect(main.currentTime).toBe(80);
    expect(next.currentTime).toBe(1.2);
    finishFade();
    expect(main.paused).toBe(false);
    expect(next.paused).toBe(true);
    expect(main.currentTime).toBe(80);
  });
  it('cancels a scene request safely before the incoming song has buffered', async () => {
    await start();
    next.readyState = 2;
    player.request(1);
    player.update(true, .06);
    await flush();
    player.request(0);
    player.update(true, 0);
    expect(main.paused).toBe(false);
    expect(next.paused).toBe(true);
    expect(context.gains[0].gain.setTargetAtTime.mock.lastCall![0]).toBe(1);
  });
  it('handles the ended boundary even when a frame missed the crossfade window', async () => {
    await start();
    main.currentTime = main.duration;
    player.update(true, 0.06);
    await flush();
    finishFade();
    expect(next.paused).toBe(false);
    expect(main.currentTime).toBe(0);
  });
  it('preserves the cursor through pause, mute, and hidden tabs', async () => {
    await start();
    main.currentTime = 43;
    player.pause();
    player.update(false, 30);
    expect(main.paused).toBe(true);
    expect(main.currentTime).toBe(43);
    player.unlock();
    player.update(true, 0.06);
    await flush();
    expect(main.paused).toBe(false);
    expect(main.currentTime).toBe(43);
  });
  it('preserves both tracks and fade position when paused during a transition', async () => {
    await start();
    main.currentTime = 164;
    player.update(true, 0.06);
    await flush();
    for (let i = 0; i < 20; i++) player.update(true, 0.06);
    next.currentTime = 1.2;
    const level = context.gains[1].gain.setTargetAtTime.mock.lastCall![0];
    player.pause();
    player.update(false, 30);
    expect(main.currentTime).toBe(164);
    expect(next.currentTime).toBe(1.2);
    player.unlock();
    player.update(true, 0);
    await flush();
    player.update(true, 0);
    expect(context.gains[1].gain.setTargetAtTime.mock.lastCall![0]).toBe(level);
    finishFade();
    expect(main.paused).toBe(true);
  });
  it('pauses playback when the browser suspends the audio context', async () => {
    await start();
    context.state = 'suspended';
    player.update(true, 0.06);
    expect(main.paused).toBe(true);
  });
  it('does not restart a finished outgoing track when resuming a crossfade', async () => {
    await start();
    main.currentTime = main.duration;
    player.update(true, 0.06);
    await flush();
    player.pause();
    const attempts = main.play.mock.calls.length;
    player.unlock();
    player.update(true, 0.06);
    await flush();
    expect(main.play).toHaveBeenCalledTimes(attempts);
    finishFade();
    expect(next.paused).toBe(false);
  });
  it('uses Clearing if Morning is missing and loops it if the other song is missing', async () => {
    main.onerror!();
    await start();
    expect(next.paused).toBe(false);
    expect(player.unavailable).toBe(false);
    next.currentTime = next.duration;
    player.update(true, 0.06);
    await flush();
    expect(next.currentTime).toBe(0);
    expect(next.paused).toBe(false);
  });
  it('keeps the surviving main track after a failed incoming play', async () => {
    await start();
    next.reject = 'NotSupportedError';
    main.currentTime = 164;
    player.update(true, 0.06);
    await flush();
    main.currentTime = main.duration;
    player.update(true, 0.06);
    await flush();
    expect(main.currentTime).toBe(0);
    expect(main.paused).toBe(false);
    expect(player.unavailable).toBe(false);
  });
  it('reports unavailable when both assets fail, enabling the generated fallback', () => {
    main.onerror!(); next.onerror!();
    expect(player.unavailable).toBe(true);
    expect(() => player.update(true, 0.06)).not.toThrow();
  });
  it('does not spam blocked autoplay promises and can retry on a new gesture', async () => {
    main.reject = 'NotAllowedError';
    await start();
    const attempts = main.play.mock.calls.length;
    for (let i = 0; i < 100; i++) player.update(true, 0.06);
    expect(main.play).toHaveBeenCalledTimes(attempts);
    main.reject = null;
    player.unlock();
    player.update(true, 0.06);
    await flush();
    expect(main.paused).toBe(false);
  });
  it('releases streams, nodes, and DOM elements on menu/restart, including pending plays', async () => {
    player.unlock();
    player.dispose();
    player.dispose();
    await flush();
    expect(main.paused).toBe(true);
    expect(next.paused).toBe(true);
    for (const audio of [main, next]) {
      expect(audio.src).toBe('');
      expect(audio.load).toHaveBeenCalledTimes(1);
      expect(audio.remove).toHaveBeenCalledTimes(1);
    }
    expect(context.sources.every((source) => source.disconnect.mock.calls.length === 1)).toBe(true);
    expect(() => player.update(true, 0.06)).not.toThrow();
  });
});

describe('game audio integration', () => {
  it('keeps music connected to volume/mute, ducks only scene narration, and stops on failure', async () => {
    player.dispose();
    vi.stubGlobal('AudioContext', function () { return context; });
    vi.stubGlobal('window', {});
    vi.stubGlobal('speechSynthesis', { speaking: false });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const sound = new Soundtrack({ ...defaultSettings(), voice: false });
    const engine = {
      phase: 'ready', speed: 0, rpm: 800, throttle: 0, traffic: { cars: [] },
      mission: { rain: 0, night: 1 }, elapsed: 0, time: 200, impacts: 0,
      notice: { who: '', text: '' },
    } as unknown as GameEngine;
    try {
      await sound.unlock(); await flush();
      sound.update(engine, 0.06); await flush();
      const audio = FakeAudio.instances[2];
      expect(audio.paused).toBe(false);
      expect(context.gains[2].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.65, 0, 0.08);
      expect(context.gains[3].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.23, 0, 0.2);
      vi.stubGlobal('speechSynthesis', { speaking: true });
      sound.update(engine, 0.06);
      expect(context.gains[3].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.23, 0, 0.2);
      sound.settings.voice = true;
      sound.setStory('opening');
      sound.updateStory(0.06); await flush();
      sound.updateStory(0.06);
      expect(context.gains[3].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.07, 0, 0.2);
      engine.phase = 'driving';
      engine.encounters = [];
      engine.notice = { who: 'DISPATCH', text: 'Recover now', until: 10 };
      sound.update(engine, 0.06); await flush();
      expect(sound.narration.scene).toBeNull();
      expect(FakeAudio.instances.slice(4).every(a => a.paused)).toBe(true);
      expect(context.gains[3].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.23, 0, 0.2);
      // The default experience is music-only, with vehicle effects explicitly opt-in.
      expect(context.gains[6].gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.05);
      sound.settings.roadSounds = true;
      sound.update(engine, 0.06);
      expect(context.gains[6].gain.setTargetAtTime).toHaveBeenLastCalledWith(1, 0, 0.05);
      sound.settings.volume = 0;
      sound.update(engine, 0.06);
      expect(audio.paused).toBe(true);
      sound.settings.volume = 0.4;
      sound.update(engine, 0.06); await flush();
      expect(context.gains[2].gain.setTargetAtTime).toHaveBeenLastCalledWith(0.4, 0, 0.08);
      sound.settings.sound = false;
      sound.update(engine, 0.06);
      expect(audio.paused).toBe(true);
      sound.settings.sound = true;
      engine.phase = 'restoring';
      sound.update(engine, 0.06); await flush();
      expect(audio.paused).toBe(false);
      engine.phase = 'failed';
      sound.update(engine, 0.06);
      expect(audio.paused).toBe(true);
      // Results cannot be paused by the mission engine: the audio must still
      // honour lost focus and hidden tabs rather than undoing interruption.
      engine.phase = 'results';
      vi.spyOn(document, 'hasFocus').mockReturnValue(false);
      sound.update(engine, 0.06);
      expect(audio.paused).toBe(true);
      vi.spyOn(document, 'hasFocus').mockReturnValue(true);
      sound.update(engine, 0.06); await flush();
      expect(audio.paused).toBe(false);
      vi.stubGlobal('document', { body: document.body, hidden: true, hasFocus: () => true });
      sound.update(engine, 0.06);
      expect(audio.paused).toBe(true);
    } finally { sound.dispose(); }
  });
  it('reuses the score and audio context between clinics but disposes old narration', async () => {
    player.dispose();
    vi.stubGlobal('AudioContext', function () { return context; });
    vi.stubGlobal('window', {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const sound = new Soundtrack(defaultSettings());
    try {
      await sound.unlock(); sound.updateStory(.06); await flush();
      const score = FakeAudio.instances[2], oldVoice = FakeAudio.instances.slice(4);
      score.currentTime = 42;
      sound.beginChapter(CLINICS[1]);
      await sound.unlock(); sound.updateStory(.06); await flush();
      sound.updateStory(.06); await flush();
      expect(context.close).not.toHaveBeenCalled();
      expect(score.currentTime).toBe(42);
      expect(oldVoice.every(a => a.paused && a.src === '' && a.remove.mock.calls.length === 1)).toBe(true);
      expect(FakeAudio.instances[6].src).toContain('nganga-tsanga-opening.mp3');
      expect(sound.narration.scene).toBe('opening');
      expect(sound.narration.status).toBe('playing');
    } finally { sound.dispose(); }
  });
});
