import type { Settings } from './save';

/**
 * Three rendering tiers. High is the full look. Balanced keeps the golden-hour
 * sun shafts, bloom and full scenery, but drops multisampling (FXAA instead),
 * terrain self-shadowing and headlight shadows, and thins the far vegetation a
 * little. Light is built for older phones and integrated graphics.
 */
export type Tier = 0 | 1 | 2;
export const TIER_NAMES = ['Light', 'Balanced', 'High'] as const;
export const TIERS = {
  pixelCap: [1, 1.25, 1.5],
  shadowMap: [1024, 1536, 2048],
  terrainShadows: [false, false, true],
  headlightShadows: [false, false, true],
  grass: [2200, 3800, 5200],
  hills: [1400, 2500, 3200],
  pebbles: [600, 1100, 1500],
  rain: [200, 380, 550],
  birds: [9, 13, 17],
  fireflies: [60, 100, 140],
  smoke: [8, 12, 16],
  post: [
    { msaa: 0, shafts: false, bloom: false },
    { msaa: 0, shafts: true, bloom: true },
    { msaa: 4, shafts: true, bloom: true },
  ],
} as const;

type DeviceHints = {
  gpu: string;
  memory?: number;
  cores?: number;
  touch: boolean;
};
/** Mobile and integrated GPUs that struggle with the full look. */
const WEAK_GPU =
  /swiftshader|llvmpipe|software|softpipe|mali-(4|t\d|g31|g51|g52|g57)|adreno( \(tm\))? [1-5]\d\d|powervr|videocore|vivante|intel.*(gma|hd graphics( [2-6]\d\d\d?)?$)|intel\(r\) hd graphics/;
const CAPABLE_MOBILE = /apple|adreno( \(tm\))? [6-9]\d\d|mali-g(6[1-9]|7\d|[89]\d\d?)|xclipse|immortalis/;
const INTEGRATED = /intel|uhd|iris|radeon\(tm\) graphics|vega [3-8]\b/;

/** Pick a starting tier from what the browser tells us about the device. */
export function detectTier(settings: Pick<Settings, 'quality'>, hints: DeviceHints): Tier {
  if (settings.quality === 'high') return 2;
  if (settings.quality === 'medium') return 1;
  if (settings.quality === 'low') return 0;
  const gpu = hints.gpu.toLowerCase();
  const memory = hints.memory ?? 8,
    cores = hints.cores ?? 8;
  if (WEAK_GPU.test(gpu) || memory <= 2 || cores <= 2) return 0;
  if (hints.touch) return CAPABLE_MOBILE.test(gpu) && memory >= 4 ? 1 : 0;
  if (INTEGRATED.test(gpu) || memory <= 4 || cores <= 4) return 1;
  return 2;
}
/** Device hints from a live WebGL context. */
export function deviceHints(gl: WebGLRenderingContext | WebGL2RenderingContext): DeviceHints {
  let gpu = '';
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
  } catch {
    /* Unknown GPUs are judged by memory, cores and input alone. */
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    gpu,
    memory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    touch: typeof matchMedia !== 'undefined' && matchMedia('(pointer:coarse)').matches,
  };
}

/**
 * Keeps the frame rate smooth on whatever device is running the game. Every
 * 1.5 s of driving it reads the slow end of recent frame times: a struggling
 * device first renders fewer pixels (down to 60 %), then steps down a tier;
 * sustained headroom brings the resolution back. It never raises the tier, so
 * the look does not flicker between settings.
 */
export class FrameGovernor {
  scale = 1;
  private frames: number[] = [];
  private elapsed = 0;
  private settle = 2.5;
  private calm = 0;
  constructor(
    public tier: Tier,
    private adaptive: boolean,
  ) {}
  /** Returns what changed, if anything, after this frame. */
  sample(dt: number): 'scale' | 'tier' | null {
    if (!this.adaptive || dt <= 0) return null;
    // Tab switches and pauses are not rendering cost.
    if (dt > 0.25) return null;
    if (this.settle > 0) {
      this.settle -= dt;
      return null;
    }
    this.frames.push(dt);
    this.elapsed += dt;
    if (this.elapsed < 1.5) return null;
    const sorted = [...this.frames].sort((a, b) => a - b);
    const slow = sorted[Math.floor(sorted.length * 0.9)];
    this.frames = [];
    this.elapsed = 0;
    if (slow > 0.027) {
      this.calm = 0;
      if (this.scale > 0.6 + 1e-6) {
        this.scale = Math.max(0.6, this.scale - 0.1);
        return 'scale';
      }
      if (this.tier > 0) {
        this.tier = (this.tier - 1) as Tier;
        this.scale = 0.85;
        // Give the new settings a moment before judging them.
        this.settle = 2;
        return 'tier';
      }
      return null;
    }
    if (slow < 0.0185 && this.scale < 1) {
      if (++this.calm >= 3) {
        this.calm = 0;
        this.scale = Math.min(1, this.scale + 0.1);
        return 'scale';
      }
    } else this.calm = 0;
    return null;
  }
}
