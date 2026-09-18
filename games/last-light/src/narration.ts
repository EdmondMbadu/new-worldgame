import { storyClip, type ClinicStory, type StoryScene } from './clinic-stories';

export type NarrationStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'blocked' | 'error';
export type NarrationState = { status: NarrationStatus; progress: number; scene: StoryScene | null };
type Clip = {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  pending: boolean;
  failed: boolean;
  blocked: boolean;
};

/** Prerecorded speech has only two legal scenes. Engine notices never enter here. */
export class SceneNarrator {
  private clips = new Map<StoryScene, Clip>();
  private scene: StoryScene | null = null;
  private wanted = false;
  private enabled = false;
  private disposed = false;

  constructor(private context: AudioContext, destination: AudioNode, clinic: ClinicStory) {
    try {
      for (const scene of ['opening', 'closing'] as const) {
        const audio = new Audio();
        audio.hidden = true;
        audio.preload = scene === 'opening' ? 'auto' : 'metadata';
        audio.dataset.lastLightNarration = scene;
        const source = context.createMediaElementSource(audio);
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(destination);
        const clip: Clip = { audio, source, gain, pending: false, failed: false, blocked: false };
        this.clips.set(scene, clip);
        audio.onerror = () => { clip.failed = true; };
        audio.src = storyClip(clinic, scene);
        document.body.appendChild(audio);
      }
    } catch {
      this.dispose();
    }
  }

  /** Prime both media elements silently inside Start's gesture for mobile playback. */
  unlock() {
    if (this.disposed) return;
    for (const [scene, clip] of this.clips) {
      clip.blocked = false;
      this.play(scene, clip, true);
    }
  }

  select(scene: StoryScene | null, autoplay = true) {
    if (this.disposed || this.scene === scene) return;
    for (const clip of this.clips.values()) {
      clip.gain.gain.value = 0;
      clip.audio.pause();
    }
    this.scene = scene;
    this.wanted = scene !== null && autoplay;
    const clip = scene && this.clips.get(scene);
    if (clip) {
      clip.audio.currentTime = 0;
      clip.audio.preload = 'auto';
    }
  }

  private play(scene: StoryScene, clip: Clip, prime = false) {
    if (this.disposed || clip.failed || clip.blocked || clip.pending || !clip.audio.paused) return;
    if (!prime && (!this.enabled || !this.wanted || this.scene !== scene || clip.audio.ended)) return;
    clip.pending = true;
    try {
      void clip.audio.play().then(() => {
        // A resolved old play request must not leak into the road or a later chapter.
        if (this.disposed || !this.enabled || !this.wanted || this.scene !== scene) {
          clip.audio.pause();
          clip.gain.gain.value = 0;
          if (this.scene !== scene && !this.disposed) clip.audio.currentTime = 0;
        }
      }).catch((error: unknown) => {
        const name = (error as { name?: string })?.name;
        if (name === 'NotAllowedError') clip.blocked = true;
        else if (name !== 'AbortError' && !this.disposed) clip.failed = true;
      }).finally(() => { clip.pending = false; });
    } catch {
      clip.pending = false;
      clip.failed = true;
    }
  }

  toggle() {
    if (this.disposed || !this.scene) return;
    const clip = this.clips.get(this.scene);
    if (!clip || clip.failed) return;
    if (this.wanted && !clip.audio.ended && !clip.blocked) {
      this.wanted = false;
      clip.gain.gain.value = 0;
      clip.audio.pause();
    } else {
      if (clip.audio.ended) clip.audio.currentTime = 0;
      clip.blocked = false;
      this.wanted = true;
      this.play(this.scene, clip);
    }
  }

  resume() {
    if (this.disposed || !this.scene) return;
    const clip = this.clips.get(this.scene);
    if (!clip || clip.failed) return;
    if (clip.audio.ended) clip.audio.currentTime = 0;
    clip.blocked = false;
    this.wanted = true;
    this.play(this.scene, clip);
  }

  update(enabled: boolean) {
    this.enabled = enabled && this.context.state === 'running' && !this.disposed;
    for (const [scene, clip] of this.clips) {
      const active = this.enabled && this.scene === scene && this.wanted && !clip.failed;
      clip.gain.gain.value = active ? 1 : 0;
      if (active) this.play(scene, clip);
      else if (!clip.audio.paused) clip.audio.pause();
    }
  }

  get playing() {
    const clip = this.scene && this.clips.get(this.scene);
    return !!(clip && this.enabled && this.wanted && !clip.audio.paused && !clip.audio.ended && clip.audio.readyState >= 3);
  }

  get state(): NarrationState {
    const clip = this.scene && this.clips.get(this.scene);
    if (!clip) return { scene: this.scene, status: this.disposed ? 'error' : 'idle', progress: 0 };
    const { audio } = clip;
    const progress = Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.min(1, audio.currentTime / audio.duration) : 0;
    const status = clip.failed ? 'error' : clip.blocked ? 'blocked' : audio.ended ? 'ended'
      : !this.wanted || !this.enabled ? 'paused' : this.playing ? 'playing' : 'loading';
    return { scene: this.scene, status, progress };
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.wanted = false;
    this.enabled = false;
    this.scene = null;
    for (const clip of this.clips.values()) {
      clip.gain.gain.value = 0;
      clip.audio.pause();
      clip.audio.onerror = null;
      clip.audio.removeAttribute('src');
      clip.audio.load();
      clip.audio.remove();
      clip.source.disconnect();
      clip.gain.disconnect();
    }
    this.clips.clear();
  }
}
