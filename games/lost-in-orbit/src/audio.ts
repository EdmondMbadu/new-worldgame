import type { GameEvent } from './engine';

export function readSaved(key: string): string | null {
  try {
    return localStorage.getItem(`lio.v1.${key}`);
  } catch {
    return null;
  }
}
export function save(key: string, value: string) {
  try {
    localStorage.setItem(`lio.v1.${key}`, value);
  } catch {
    /* Private browsing can deny storage; the round still works. */
  }
}

export class AudioManager {
  muted = readSaved('muted') === 'true';
  unavailable = false;
  private context?: AudioContext;
  private master?: GainNode;
  private thrustGain?: GainNode;
  private noise?: AudioBufferSourceNode;
  private filter?: BiquadFilterNode;
  private voices = new Set<OscillatorNode>();
  async unlock() {
    if (this.muted || this.unavailable) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.33;
        this.master.connect(this.context.destination);
        const buffer = this.context.createBuffer(
          1,
          this.context.sampleRate,
          this.context.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noise = this.context.createBufferSource();
        this.noise.buffer = buffer;
        this.noise.loop = true;
        this.filter = this.context.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 360;
        this.thrustGain = this.context.createGain();
        this.thrustGain.gain.value = 0;
        this.noise.connect(this.filter);
        this.filter.connect(this.thrustGain);
        this.thrustGain.connect(this.master);
        this.noise.start();
      }
      if (this.context.state === 'suspended') await this.context.resume();
    } catch {
      this.unavailable = true;
    }
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    save('muted', String(muted));
    if (this.master && this.context)
      this.master.gain.setTargetAtTime(
        muted ? 0 : 0.33,
        this.context.currentTime,
        0.05,
      );
    if (muted) this.suspend();
    else void this.unlock();
  }
  thrust(amount: number, boosted: boolean) {
    if (this.context?.state !== 'running' || !this.thrustGain) return;
    this.thrustGain.gain.setTargetAtTime(
      this.muted ? 0 : amount * (boosted ? 0.17 : 0.09),
      this.context.currentTime,
      0.08,
    );
  }
  suspend() {
    if (this.context && this.thrustGain) {
      this.thrustGain.gain.value = 0;
      void this.context.suspend().catch(() => {});
    }
  }
  play(event: GameEvent) {
    if (this.muted || this.context?.state !== 'running' || !this.master) return;
    const notes: Partial<Record<GameEvent['type'], number[]>> = {
      warning: [330, 330, 440],
      dodge: [784, 1175],
      pickup: [659, 988, 1318],
      deposit: [523, 659, 784, 1047],
      impact: [110, 82],
      boost: [180, 360, 720],
      recharge: [587, 880],
      win: [523, 659, 784, 1047, 1318, 1568],
    };
    notes[event.type]?.forEach((frequency, index) => {
      if (this.voices.size > 24) return;
      const ctx = this.context!;
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      const start =
        ctx.currentTime + index * (event.type === 'win' ? 0.19 : 0.075);
      const length = event.type === 'win' ? 0.7 : 0.26;
      oscillator.type = event.type === 'impact' ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + length);
      oscillator.connect(gain);
      gain.connect(this.master!);
      oscillator.start(start);
      oscillator.stop(start + length + 0.02);
      this.voices.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
        this.voices.delete(oscillator);
      };
    });
  }
  dispose() {
    for (const voice of this.voices) {
      try {
        voice.stop();
      } catch {}
      voice.disconnect();
    }
    this.voices.clear();
    this.noise?.stop();
    this.noise?.disconnect();
    this.filter?.disconnect();
    this.thrustGain?.disconnect();
    this.master?.disconnect();
    if (this.context) void this.context.close().catch(() => {});
  }
}
