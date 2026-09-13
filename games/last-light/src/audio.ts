import type { GameEngine } from './engine';
import type { Settings } from './save';
export class Soundtrack {
  context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private motor: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private oscillators: AudioNode[] = [];
  private lastCue = '';
  private lastImpact = 0;
  private tuneTime = 0;
  private lastNote = -1;
  private stopped = false;
  constructor(public settings: Settings) {}
  async unlock() {
    try {
      if (!this.context) {
        const c = new AudioContext();
        this.context = c;
        this.gain = c.createGain();
        this.gain.connect(c.destination);
        this.motor = c.createOscillator();
        this.motor.type = 'triangle';
        this.motorGain = c.createGain();
        this.motorGain.gain.value = 0;
        this.motor.connect(this.motorGain).connect(this.gain);
        this.motor.start();
        const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = c.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 550;
        this.windGain = c.createGain();
        this.windGain.gain.value = 0;
        noise.connect(filter).connect(this.windGain).connect(this.gain);
        noise.start();
        this.oscillators.push(noise, filter);
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      /* Muted gameplay remains complete. */
    }
  }
  tone(hz: number, length: number, volume = 0.035, delay = 0) {
    const c = this.context;
    if (!c || !this.gain) return;
    const o = c.createOscillator(),
      g = c.createGain();
    o.type = 'sine';
    o.frequency.value = hz;
    g.gain.setValueAtTime(0, c.currentTime + delay);
    g.gain.linearRampToValueAtTime(volume, c.currentTime + delay + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + length);
    o.connect(g).connect(this.gain);
    o.start(c.currentTime + delay);
    o.stop(c.currentTime + delay + length + 0.05);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  update(e: GameEngine, dt: number) {
    if (this.stopped) return;
    const c = this.context;
    if (!c || !this.gain || !this.motor || !this.motorGain || !this.windGain)
      return;
    const active = e.phase !== 'paused' && e.phase !== 'failed';
    this.gain.gain.setTargetAtTime(
      this.settings.sound && active ? this.settings.volume : 0,
      c.currentTime,
      0.1,
    );
    this.motor.frequency.setTargetAtTime(
      35 + Math.abs(e.speed) * 7,
      c.currentTime,
      0.07,
    );
    this.motorGain.gain.setTargetAtTime(
      e.phase === 'driving' ? 0.035 + Math.abs(e.speed) * 0.002 : 0.008,
      c.currentTime,
      0.12,
    );
    this.windGain.gain.setTargetAtTime(
      active ? 0.012 + e.mission.rain * 0.017 + Math.abs(e.speed) * 0.001 : 0,
      c.currentTime,
      0.15,
    );
    if (!active) return;
    this.tuneTime += dt;
    const note = Math.floor(
      this.tuneTime / (e.phase === 'restoring' ? 1 : 2.2),
    );
    if (note !== this.lastNote) {
      this.lastNote = note;
      const scale =
        e.phase === 'restoring' || e.phase === 'results'
          ? [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66]
          : [146.83, 220, 293.66, 196, 174.61, 220, 261.63, 196];
      this.tone(scale[note % 8], 2, 0.023);
      this.tone(scale[note % 8] * 0.5, 2.6, 0.017, 0.13);
    }
    if (e.impacts > this.lastImpact) {
      this.lastImpact = e.impacts;
      this.tone(65, 0.18, 0.16);
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
        const utterance = new SpeechSynthesisUtterance(e.notice.text);
        utterance.lang = 'en-US';
        utterance.rate = 0.98;
        utterance.volume = this.settings.volume * 0.8;
        const voice = speechSynthesis
          .getVoices()
          .find((v) => v.localService && v.lang.startsWith('en'));
        if (voice) utterance.voice = voice;
        speechSynthesis.speak(utterance);
      }
      this.tone(740, 0.08, 0.025);
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
    this.silence();
    this.motor?.stop();
    this.oscillators.forEach((o) => {
      if (o instanceof AudioBufferSourceNode) o.stop();
      o.disconnect();
    });
    if (this.context && this.context.state !== 'closed')
      void this.context.close().catch(() => undefined);
  }
}
