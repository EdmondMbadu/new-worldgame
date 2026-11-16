// The small pleasures: a few synthesised sounds (no audio files), a buzz on
// phones, numbers that count up, and confetti made of the map's own dots.
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let ctx = null, muted = false;
export const setMuted = (on) => { muted = !!on; };

function tone(freq, at, length, { type = 'sine', gain = 0.06 } = {}) {
  if (muted) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator(), amp = ctx.createGain(), t0 = ctx.currentTime + at;
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + length + 0.02);
  } catch { /* no audio on this device */ }
}
export const sfx = {
  tick: () => tone(880, 0, 0.07, { type: 'triangle', gain: 0.035 }),
  lock: () => { tone(440, 0, 0.09, { type: 'triangle' }); tone(660, 0.07, 0.12, { type: 'triangle' }); },
  join: () => tone(587, 0, 0.14, { gain: 0.04 }),
  reveal: () => { tone(392, 0, 0.5); tone(523, 0.12, 0.5); tone(659, 0.24, 0.7); },
  good: () => { tone(659, 0, 0.18); tone(880, 0.1, 0.4); },
  win: () => [523, 659, 784, 1047, 1319].forEach((f, k) => tone(f, k * 0.11, 0.6, { gain: 0.05 })),
};
export const buzz = (pattern) => { try { navigator.vibrate?.(pattern); } catch { /* not supported */ } };

/** Counts a number up to its value over about a second. */
export function countUp(el, to, { ms = 1100, from = 0 } = {}) {
  if (!el) return;
  if (reduced) { el.textContent = to; return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** A burst of dots in the page's colours, falling from the top of the canvas. */
export function confetti(canvas, { count = 150, ms = 3800 } = {}) {
  if (!canvas || reduced) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.display = 'block';
  const g = canvas.getContext('2d');
  g.scale(dpr, dpr);
  const colours = ['245,184,62', '116,186,140', '233,229,219', '46,112,190'];
  const bits = Array.from({ length: count }, () => ({ x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 1.6, vy: 2 + Math.random() * 3.4, r: 2 + Math.random() * 3.5, c: colours[Math.floor(Math.random() * colours.length)], w: Math.random() * 6.28 }));
  const t0 = performance.now();
  const draw = (now) => {
    const age = now - t0;
    g.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.x += b.vx + Math.sin(b.w + age / 400) * 0.6; b.y += b.vy;
      g.fillStyle = `rgba(${b.c},${Math.max(0, 1 - age / ms)})`;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.2832); g.fill();
    }
    if (age < ms) requestAnimationFrame(draw); else { g.clearRect(0, 0, W, H); canvas.style.display = 'none'; }
  };
  requestAnimationFrame(draw);
}
