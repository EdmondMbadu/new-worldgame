export const JOURNEY_TRACKS = [
  { title: 'Morning on the Ridge', file: 'morning-on-the-ridge.mp3' },
  { title: 'Light at the Clearing', file: 'light-at-the-clearing.mp3' },
] as const;
export const MUSIC_CROSSFADE = 4;

type Track = {
  audio: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  pending: boolean;
  blocked: boolean;
  failed: boolean;
};

/** Stream the score, rather than decoding several minutes into game memory. */
export class JourneyMusic {
  private tracks: Track[] = [];
  private current = 0;
  private incoming: number | null = null;
  private fade = 0;
  private active = false;
  private stopped = false;

  /** A scene may request the arrival song once; never restart an audible track. */
  request(index: number) {
    if (this.stopped || !this.tracks[index] || this.tracks[index].failed || index === this.incoming) return;
    if (index === this.current) {
      if (this.incoming !== null) {
        // A quick Next may reverse an arrival transition. Complementary equal-power
        // curves keep both levels and cursors continuous instead of restarting.
        this.current = this.incoming;
        this.incoming = index;
        this.fade = MUSIC_CROSSFADE - this.fade;
      }
      return;
    }
    this.incoming = index;
    this.fade = 0;
    this.tracks[index].audio.currentTime = 0;
    this.tracks[index].audio.preload = 'auto';
  }

  constructor(private context: AudioContext, destination: AudioNode) {
    try {
      for (const [index, info] of JOURNEY_TRACKS.entries()) {
        const audio = new Audio();
        // Hidden native elements also make playback inspectable without a QA hook.
        audio.hidden = true;
        audio.dataset.lastLightTrack = info.title;
        audio.preload = index === 0 ? 'auto' : 'metadata';
        const source = context.createMediaElementSource(audio);
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(destination);
        const track = { audio, source, gain, pending: false, blocked: false, failed: false };
        this.tracks.push(track);
        audio.onerror = () => { track.failed = true; };
        audio.src = `${import.meta.env.BASE_URL}audio/${info.file}`;
        document.body.appendChild(audio);
      }
    } catch {
      this.dispose();
    }
  }

  get unavailable() {
    return this.stopped || this.tracks.every((track) => track.failed);
  }

  /** Called synchronously from Start/Resume/Enable sound, inside the gesture.
   * Prime both elements silently so later playlist changes work on mobile too. */
  unlock() {
    if (this.stopped) return;
    for (const [index, track] of this.tracks.entries()) {
      track.blocked = false;
      if (index !== this.current && index !== this.incoming)
        track.gain.gain.value = 0;
      // Resume the transition, not an already-finished outgoing song.
      if (index !== this.current || !track.audio.ended) this.play(index);
    }
  }

  private play(index: number) {
    const track = this.tracks[index];
    if (this.stopped || track.failed || track.blocked || track.pending || !track.audio.paused)
      return;
    track.pending = true;
    try {
      void track.audio.play().then(() => {
        if (this.stopped || !this.active || (index !== this.current && index !== this.incoming)) {
          track.audio.pause();
          if (!this.stopped && index !== this.current && index !== this.incoming)
            track.audio.currentTime = 0;
        }
      }).catch((error: unknown) => {
        const name = (error as { name?: string } | null)?.name;
        if (name === 'NotAllowedError') track.blocked = true;
        else if (name !== 'AbortError' && !this.stopped) track.failed = true;
      }).finally(() => { track.pending = false; });
    } catch {
      track.pending = false;
      track.failed = true;
    }
  }

  update(enabled: boolean, dt: number) {
    if (this.stopped) return;
    if (!enabled || this.context.state !== 'running') {
      this.pause();
      return;
    }
    this.active = true;
    if (this.unavailable) return;
    if (this.tracks[this.current].failed) {
      this.current = this.tracks.findIndex((track) => !track.failed);
      this.incoming = null;
      this.fade = 0;
    }
    const main = this.tracks[this.current];
    if (this.incoming !== null && this.tracks[this.incoming].failed) {
      this.tracks[this.incoming].audio.pause();
      this.tracks[this.incoming].gain.gain.value = 0;
      this.incoming = null;
      this.fade = 0;
    }
    const remaining = main.audio.duration - main.audio.currentTime;
    if (this.incoming === null && (main.audio.ended || (Number.isFinite(remaining) && remaining <= MUSIC_CROSSFADE))) {
      const next = (this.current + 1) % this.tracks.length;
      if (!this.tracks[next].failed) {
        this.incoming = next;
        this.fade = 0;
        this.tracks[next].audio.preload = 'auto';
        this.tracks[next].audio.currentTime = 0;
      } else if (main.audio.ended) {
        // One missing track never silences the surviving song permanently.
        main.audio.currentTime = 0;
      }
    }
    if (!main.audio.ended) this.play(this.current);
    let blend = 0;
    if (this.incoming !== null) {
      const next = this.tracks[this.incoming];
      this.play(this.incoming);
      // Don't fade out the audible track while its successor is still buffering.
      if (!next.pending && !next.audio.paused && next.audio.readyState >= 3) {
        this.fade += Math.max(0, Math.min(dt, 0.06));
        blend = Math.min(1, this.fade / MUSIC_CROSSFADE);
        next.gain.gain.setTargetAtTime(Math.sin(blend * Math.PI / 2), this.context.currentTime, 0.08);
      } else {
        blend = Math.min(1, this.fade / MUSIC_CROSSFADE);
      }
    }
    main.gain.gain.setTargetAtTime(Math.cos(blend * Math.PI / 2), this.context.currentTime, 0.08);
    if (blend >= 1 && this.incoming !== null) {
      main.audio.pause();
      main.gain.gain.value = 0;
      main.audio.currentTime = 0;
      this.current = this.incoming;
      this.incoming = null;
      this.fade = 0;
    }
  }

  pause() {
    this.active = false;
    // Preserve both cursors and the crossfade through pause, mute, and tab hiding.
    for (const track of this.tracks) {
      if (!track.audio.paused) track.audio.pause();
    }
  }

  dispose() {
    if (this.stopped) return;
    this.stopped = true;
    this.pause();
    for (const track of this.tracks) {
      track.audio.onerror = null;
      track.audio.removeAttribute('src');
      track.audio.load();
      track.audio.remove();
      track.source.disconnect();
      track.gain.disconnect();
    }
  }
}
