/** Foreground intervals, including stalls. Bounded storage; never filters slow frames. */
export class FrameHealth {
  private samples = new Float64Array(1800);
  private cursor = 0;
  private count = 0;
  private untilReport = 0;
  private total = 0;
  private elapsed = 0;
  private physics = 0;
  private render = 0;
  stats = {
    fps: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    max: 0,
    over50: 0,
    over100: 0,
    over250: 0,
    over650: 0,
    physicsMs: 0,
    renderMs: 0,
  };
  record(seconds: number, physicsMs = 0, renderMs = 0) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    const ms = seconds * 1000;
    this.samples[this.cursor] = ms;
    this.cursor = (this.cursor + 1) % this.samples.length;
    this.count = Math.min(this.count + 1, this.samples.length);
    this.total++;
    this.elapsed += seconds;
    this.physics += physicsMs;
    this.render += renderMs;
    this.stats.max = Math.max(this.stats.max, ms);
    if (ms > 50) this.stats.over50++;
    if (ms > 100) this.stats.over100++;
    if (ms > 250) this.stats.over250++;
    if (ms > 650) this.stats.over650++;
    this.untilReport += seconds;
    if (this.untilReport < 1) return;
    this.untilReport = 0;
    const sorted = this.samples.slice(0, this.count).sort();
    const percentile = (p: number) =>
      sorted[Math.min(this.count - 1, Math.floor(this.count * p))];
    Object.assign(this.stats, {
      fps: this.total / this.elapsed,
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
      physicsMs: this.physics / this.total,
      renderMs: this.render / this.total,
    });
  }
}
