import type { GameEngine } from './engine';
import type { Settings } from './save';
import { encounterPose } from './encounters';
import { herdPose } from './traffic';
import { clamp } from './missions';

export class Soundtrack {
  context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private music: GainNode | null = null;
  private motor: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private engineLoop: AudioBufferSourceNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private windGain: GainNode | null = null;
  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private sources: (AudioBufferSourceNode | OscillatorNode)[] = [];
  private nodes: AudioNode[] = [];
  private lastCue = '';
  private lastImpact = 0;
  private tuneTime = 0;
  private lastNote = -1;
  private lastBird = -1;
  private lastPower = 0;
  private lastRoadSound = -1;
  private load: Promise<void> | null = null;
  private abort = new AbortController();
  private stopped = false;
  constructor(public settings: Settings) {}
  async unlock() {
    if (this.stopped) return;
    try {
      if (!this.context) {
        const c = new AudioContext();
        this.context = c;
        this.gain = c.createGain();
        this.gain.gain.value = 0;
        const limiter = c.createDynamicsCompressor();
        limiter.threshold.value = -12;
        limiter.ratio.value = 5;
        this.gain.connect(limiter).connect(c.destination);
        this.nodes.push(limiter);
        this.music = c.createGain();
        this.music.connect(this.gain);
        this.motor = c.createOscillator();
        this.motor.type = 'triangle';
        this.motorGain = c.createGain();
        this.motorGain.gain.value = 0;
        this.motor.connect(this.motorGain).connect(this.gain);
        this.motor.start();
        this.sources.push(this.motor);
        const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
          data = buffer.getChannelData(0);
        let brown = 0;
        for (let i = 0; i < data.length; i++) {
          brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.025;
          data[i] = brown * 3;
        }
        this.noiseBuffer = buffer;
        const layer = (type: BiquadFilterType, frequency: number) => {
          const source = c.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          const filter = c.createBiquadFilter();
          filter.type = type;
          filter.frequency.value = frequency;
          const gain = c.createGain();
          gain.gain.value = 0;
          source.connect(filter).connect(gain).connect(this.gain!);
          source.start();
          this.sources.push(source);
          this.nodes.push(filter, gain);
          return { gain, filter };
        };
        this.windGain = layer('lowpass', 400).gain;
        const tires = layer('bandpass', 950);
        this.tireGain = tires.gain;
        this.tireFilter = tires.filter;
        this.rainGain = layer('highpass', 1100).gain;
        // Local CC0 recording is optional: the fallback remains usable offline or if decoding fails.
        this.load = (async () => {
          try {
            const response = await fetch(
              `${import.meta.env.BASE_URL}audio/engine.wav`,
              { signal: this.abort.signal },
            );
            if (!response.ok) return;
            const decoded = await c.decodeAudioData(
              await response.arrayBuffer(),
            );
            if (this.stopped || !this.gain) return;
            let peak = 0;
            for (let k = 0; k < decoded.numberOfChannels; k++) {
              const d = decoded.getChannelData(k);
              for (let i = 0; i < d.length; i++)
                peak = Math.max(peak, Math.abs(d[i]));
            }
            if (peak > 0)
              for (let k = 0; k < decoded.numberOfChannels; k++) {
                const d = decoded.getChannelData(k);
                for (let i = 0; i < d.length; i++) d[i] *= 0.65 / peak;
              }
            this.engineLoop = c.createBufferSource();
            this.engineLoop.buffer = decoded;
            this.engineLoop.loop = true;
            this.engineGain = c.createGain();
            this.engineGain.gain.value = 0;
            this.engineFilter = c.createBiquadFilter();
            this.engineFilter.type = 'lowpass';
            this.engineFilter.frequency.value = 700;
            this.engineLoop
              .connect(this.engineFilter)
              .connect(this.engineGain)
              .connect(this.gain);
            this.engineLoop.start();
            this.sources.push(this.engineLoop);
            this.nodes.push(this.engineFilter, this.engineGain);
          } catch {
            /* Playback is independent of optional asset decoding. */
          }
        })();
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      /* Muted gameplay remains complete. */
    }
  }
  tone(
    hz: number,
    length: number,
    volume = 0.025,
    delay = 0,
    music = false,
    pan = 0,
  ) {
    const c = this.context;
    if (!c || !this.gain || this.stopped) return;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = 'sine';
    o.frequency.value = hz;
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + length);
    const stereo = c.createStereoPanner();
    stereo.pan.value = pan;
    o.connect(g)
      .connect(stereo)
      .connect(music && this.music ? this.music : this.gain);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + length + 0.03);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      stereo.disconnect();
    };
  }
  private impact(volume: number, frequency = 240) {
    const c = this.context;
    if (!c || !this.noiseBuffer || !this.gain) return;
    const n = c.createBufferSource(),
      filter = c.createBiquadFilter(),
      g = c.createGain();
    n.buffer = this.noiseBuffer;
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.23);
    n.connect(filter).connect(g).connect(this.gain);
    n.start();
    n.stop(c.currentTime + 0.25);
    n.onended = () => {
      n.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }
  update(e: GameEngine, dt: number) {
    const c = this.context;
    if (
      this.stopped ||
      !c ||
      !this.gain ||
      !this.motor ||
      !this.motorGain ||
      !this.windGain
    )
      return;
    const active = e.phase !== 'paused' && e.phase !== 'failed',
      driving = e.phase === 'driving',
      v = Math.abs(e.speed),
      talking =
        typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking;
    this.gain.gain.setTargetAtTime(
      this.settings.sound && active ? this.settings.volume : 0,
      c.currentTime,
      0.08,
    );
    this.music?.gain.setTargetAtTime(talking ? 0.35 : 1, c.currentTime, 0.2);
    this.motor.frequency.setTargetAtTime(e.rpm / 30, c.currentTime, 0.08);
    this.motorGain.gain.setTargetAtTime(
      this.engineLoop ? 0 : driving ? 0.025 + e.throttle * 0.025 : 0.006,
      c.currentTime,
      0.1,
    );
    if (this.engineLoop && this.engineGain && this.engineFilter) {
      this.engineLoop.playbackRate.setTargetAtTime(
        0.48 + e.rpm / 3800,
        c.currentTime,
        0.07,
      );
      this.engineGain.gain.setTargetAtTime(
        driving
          ? (0.15 + e.throttle * 0.12) * (1 - e.shiftPulse * 0.2)
          : e.phase === 'ready'
            ? 0.04
            : 0.01,
        c.currentTime,
        0.09,
      );
      this.engineFilter.frequency.setTargetAtTime(
        380 + e.throttle * 900 + v * 32,
        c.currentTime,
        0.1,
      );
    }
    this.windGain.gain.setTargetAtTime(
      active ? 0.02 + Math.pow(v / 22, 2) * 0.18 : 0,
      c.currentTime,
      0.15,
    );
    this.rainGain?.gain.setTargetAtTime(
      active ? e.mission.rain * 0.35 : 0,
      c.currentTime,
      0.2,
    );
    this.tireFilter?.frequency.setTargetAtTime(
      e.surface === 'Mud' ? 330 : e.surface === 'Bridge' ? 180 : 850 + v * 30,
      c.currentTime,
      0.1,
    );
    this.tireGain?.gain.setTargetAtTime(
      driving
        ? Math.min(
            0.42,
            v * 0.008 + e.roadPulse * 0.15 + (e.braking > 0.5 ? v * 0.004 : 0),
          )
        : 0,
      c.currentTime,
      0.05,
    );
    if (!active) return;
    const beat = Math.floor(e.elapsed * 1.6);
    if (driving && beat !== this.lastRoadSound) {
      this.lastRoadSound = beat;
      const event = e.encounters.find(
        (event) =>
          !event.resolved &&
          ['herd', 'minibus', 'traffic', 'bridge'].includes(event.kind) &&
          Math.abs(event.z - e.progress) < 65,
      );
      if (event) {
        const p =
          event.kind === 'herd'
            ? herdPose(e.mission, event, beat % 3)
            : encounterPose(e.mission, event);
        const dx = p.x - e.position.x,
          dz = p.z - e.position.z,
          distance = Math.hypot(dx, dz);
        const pan = clamp(
          (-Math.cos(e.heading) * dx + Math.sin(e.heading) * dz) / 14,
          -1,
          1,
        );
        const level = 0.017 * Math.max(0, 1 - distance / 65);
        if (event.kind === 'herd') {
          this.tone(1050 + (beat % 3) * 170, 0.24, level, 0, false, pan);
          this.tone(1780, 0.13, level * 0.35, 0.06, false, pan);
        } else if (event.actorSpeed !== 0) {
          this.tone(
            73 + Math.abs(event.actorSpeed) * 5,
            0.7,
            level * 1.5,
            0,
            false,
            pan,
          );
        }
      }
    }
    this.tuneTime += dt;
    const restoring = e.phase === 'restoring' || e.phase === 'results';
    const note = Math.floor(
      this.tuneTime / (restoring ? 1.7 : e.time < 35 ? 1.8 : 3),
    );
    if (note !== this.lastNote) {
      this.lastNote = note;
      const scale = restoring
        ? [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66]
        : [146.83, 220, 293.66, 196, 174.61, 220, 261.63, 196];
      this.tone(scale[note % 8], 2.8, 0.021, 0, true);
      this.tone(scale[note % 8] * 0.5, 3, 0.014, 0.12, true);
    }
    const bird = Math.floor(this.tuneTime / 9);
    if (
      bird !== this.lastBird &&
      e.mission.night < 0.5 &&
      e.mission.rain < 0.5
    ) {
      this.lastBird = bird;
      this.tone(1800 + Math.sin(bird) * 350, 0.12, 0.007);
      this.tone(2300, 0.09, 0.004, 0.17);
    }
    if (e.impacts > this.lastImpact) {
      this.lastImpact = e.impacts;
      this.impact(0.8);
      this.tone(58, 0.17, 0.055);
    }
    const power = restoring
      ? e.restoreTime > 12
        ? 3
        : e.restoreTime > 10
          ? 2
          : e.restoreTime > 8
            ? 1
            : 0
      : 0;
    if (power !== this.lastPower) {
      if (power > this.lastPower) {
        this.impact(0.1, 1700);
        this.tone([0, 329.63, 392, 523.25][power], 1.8, 0.04);
      }
      this.lastPower = power;
    }
    const cue = e.notice.who + e.notice.text;
    if (cue !== this.lastCue) {
      this.lastCue = cue;
      if (
        this.settings.sound &&
        this.settings.voice &&
        'speechSynthesis' in window
      ) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(e.notice.text);
        u.lang = 'en-US';
        u.rate = 1.02;
        u.volume = this.settings.volume * 0.85;
        const voice = speechSynthesis
          .getVoices()
          .find((v) => v.localService && v.lang.startsWith('en'));
        if (voice) u.voice = voice;
        speechSynthesis.speak(u);
      }
      this.tone(740, 0.075, 0.012);
      if (e.notice.who === 'ONCOMING VEHICLE') {
        this.tone(190, 0.4, 0.045);
        this.tone(238, 0.4, 0.024);
      }
    }
  }
  silence() {
    if (this.context && this.gain)
      this.gain.gain.setTargetAtTime(0, this.context.currentTime, 0.04);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
  dispose() {
    if (this.stopped) return;
    this.stopped = true;
    this.abort.abort();
    this.silence();
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {}
      source.disconnect();
    }
    this.nodes.forEach((n) => n.disconnect());
    if (this.context && this.context.state !== 'closed')
      void this.context.close().catch(() => undefined);
  }
}
