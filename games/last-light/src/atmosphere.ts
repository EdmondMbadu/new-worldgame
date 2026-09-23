import * as T from 'three';
import { smooth, type Mission } from './missions';
import { chapterLook, sunElevation } from './night';

export { LOOKS, chapterLook, sunElevation, type ChapterLook } from './night';

type Key = {
  e: number;
  zenith: string;
  horizon: string;
  sun: string;
  sunI: number;
  hemiSky: string;
  hemiGround: string;
  hemiI: number;
  fog: string;
  exposure: number;
};
const KEYS: Key[] = [
  { e: 30, zenith: '#3d78bd', horizon: '#cfe0e4', sun: '#fff3dc', sunI: 3.4, hemiSky: '#bdd5e8', hemiGround: '#6d5a3c', hemiI: 1.0, fog: '#c7d4d4', exposure: 0.82 },
  { e: 14, zenith: '#3868a8', horizon: '#e9cfa2', sun: '#ffe0b0', sunI: 3.2, hemiSky: '#a2bcd6', hemiGround: '#735536', hemiI: 0.9, fog: '#cdbfa0', exposure: 0.8 },
  { e: 6, zenith: '#34599a', horizon: '#f7b57a', sun: '#ffb86e', sunI: 2.9, hemiSky: '#8ea6c8', hemiGround: '#6c4a2e', hemiI: 0.8, fog: '#d6ab86', exposure: 0.86 },
  { e: 1.5, zenith: '#2b4884', horizon: '#ff9152', sun: '#ff8d48', sunI: 2.2, hemiSky: '#7c8cb9', hemiGround: '#5d3e29', hemiI: 0.7, fog: '#d0916f', exposure: 0.98 },
  { e: -1.5, zenith: '#233a73', horizon: '#e0706a', sun: '#f06a44', sunI: 0.55, hemiSky: '#66709f', hemiGround: '#433027', hemiI: 0.55, fog: '#96707e', exposure: 1.12 },
  { e: -5, zenith: '#172653', horizon: '#7b5577', sun: '#b77a7a', sunI: 0, hemiSky: '#56628f', hemiGround: '#302a2a', hemiI: 0.48, fog: '#4c4c6c', exposure: 1.3 },
  { e: -9, zenith: '#0e1837', horizon: '#2f3a60', sun: '#9ab0d6', sunI: 0, hemiSky: '#4d6189', hemiGround: '#28282a', hemiI: 0.46, fog: '#223050', exposure: 1.45 },
  { e: -16, zenith: '#070e20', horizon: '#15223a', sun: '#9ab0d6', sunI: 0, hemiSky: '#3f5578', hemiGround: '#222422', hemiI: 0.44, fog: '#142238', exposure: 1.55 },
];

export type SkyState = {
  elevation: number;
  sunDir: T.Vector3;
  lightDir: T.Vector3;
  lightColor: T.Color;
  lightIntensity: number;
  zenith: T.Color;
  horizon: T.Color;
  sunColor: T.Color;
  hemiSky: T.Color;
  hemiGround: T.Color;
  hemiIntensity: number;
  fog: T.Color;
  exposure: number;
  /** 0 in daylight → 1 in full night. Drives lamps, stars and headlights. */
  darkness: number;
  moon: number;
};

const c = (s: string) => new T.Color(s);
const scratch = { a: new T.Color(), b: new T.Color() };
function lerpKey(e: number, pick: (k: Key) => string) {
  const out = new T.Color();
  if (e >= KEYS[0].e) return out.set(pick(KEYS[0]));
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i],
      b = KEYS[i + 1];
    if (e <= a.e && e >= b.e) {
      const t = (a.e - e) / (a.e - b.e);
      scratch.a.set(pick(a));
      scratch.b.set(pick(b));
      return out.copy(scratch.a).lerp(scratch.b, t);
    }
  }
  return out.set(pick(KEYS[KEYS.length - 1]));
}
function lerpNum(e: number, pick: (k: Key) => number) {
  if (e >= KEYS[0].e) return pick(KEYS[0]);
  for (let i = 0; i < KEYS.length - 1; i++) {
    const a = KEYS[i],
      b = KEYS[i + 1];
    if (e <= a.e && e >= b.e) return T.MathUtils.lerp(pick(a), pick(b), (a.e - e) / (a.e - b.e));
  }
  return pick(KEYS[KEYS.length - 1]);
}

export function skyState(m: Mission, progress: number, out?: SkyState): SkyState {
  const look = chapterLook(m);
  const e = sunElevation(m, progress);
  const rad = T.MathUtils.degToRad(e);
  const sunDir = (out?.sunDir ?? new T.Vector3()).set(
    Math.sin(look.azimuth) * Math.cos(rad),
    Math.sin(rad),
    Math.cos(look.azimuth) * Math.cos(rad),
  );
  const storm = look.storm;
  const sunI = lerpNum(e, (k) => k.sunI) * (1 - storm * 0.42);
  const moon = smooth(-4, -11, e) * 0.62;
  const moonDir = new T.Vector3(-0.45, 0.72, -0.55).normalize();
  const useSun = sunI >= moon;
  const state: SkyState = {
    elevation: e,
    sunDir,
    lightDir: (out?.lightDir ?? new T.Vector3()).copy(useSun ? sunDir : moonDir),
    lightColor: useSun ? lerpKey(e, (k) => k.sun) : c('#a9bddb'),
    lightIntensity: Math.max(sunI, moon),
    zenith: lerpKey(e, (k) => k.zenith).lerp(c('#3d4652'), storm * 0.45),
    horizon: lerpKey(e, (k) => k.horizon).lerp(c('#8a7c72'), storm * 0.25),
    sunColor: lerpKey(e, (k) => k.sun),
    hemiSky: lerpKey(e, (k) => k.hemiSky),
    hemiGround: lerpKey(e, (k) => k.hemiGround),
    hemiIntensity: lerpNum(e, (k) => k.hemiI) * (1 - storm * 0.18),
    fog: lerpKey(e, (k) => k.fog).lerp(c('#6f7475'), storm * 0.22),
    exposure: lerpNum(e, (k) => k.exposure) * (1 + storm * 0.08),
    darkness: smooth(4, -7, e),
    moon,
  };
  if (out) Object.assign(out, state);
  return state;
}

/** Shared uniforms for sky, fog and foliage. The same objects are bound to every shader. */
export const atmosphereUniforms = {
  uSunDir: { value: new T.Vector3(0, 0.2, 1) },
  uSunColor: { value: new T.Color('#ffb870') },
  uZenith: { value: new T.Color('#34599a') },
  uHorizon: { value: new T.Color('#ffbd7e') },
  uFogBase: { value: 0 },
  uFogFalloff: { value: 0.07 },
  uHaze: { value: 1 },
  uMist: { value: 0.6 },
  uTime: { value: 0 },
  uCloud: { value: 0.4 },
  uStorm: { value: 0.2 },
  uDark: { value: 0 },
  uFlash: { value: 0 },
};

const FOG_VERTEX_PARS = `
#ifdef USE_FOG
varying vec3 vFogWorld;
#endif
`;
const FOG_VERTEX = `
#ifdef USE_FOG
  vec4 fogWorldP = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    fogWorldP = instanceMatrix * fogWorldP;
  #endif
  fogWorldP = modelMatrix * fogWorldP;
  vFogWorld = fogWorldP.xyz;
  vFogDepth = - mvPosition.z;
#endif
`;
const FOG_FRAGMENT_PARS = `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorld;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uFogBase;
  uniform float uFogFalloff;
  uniform float uHaze;
  uniform float uMist;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif
`;
const FOG_FRAGMENT = `
#ifdef USE_FOG
  vec3 fogRay = vFogWorld - cameraPosition;
  float fogDist = max(length(fogRay), 0.0001);
  vec3 fogDir = fogRay / fogDist;
  #ifdef FOG_EXP2
    // Height fog: dense mist settles in valleys, thin air on the ridges.
    float fogH = max(vFogWorld.y - uFogBase, 0.0);
    float fogLocal = fogDensity * (1.0 + uMist * 3.0 * exp(-fogH * uFogFalloff));
    float fogFactor = 1.0 - exp(-fogDist * fogLocal * uHaze);
  #else
    float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  // Aerial perspective: warm toward the sun, cooler away from it.
  float fogSun = pow(max(dot(fogDir, uSunDir), 0.0), 6.0);
  vec3 fogTint = mix(fogColor, uSunColor * 0.95, fogSun * 0.42);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogTint, clamp(fogFactor, 0.0, 1.0));
#endif
`;

/** Wrap any built-in material so it uses height fog and sun-tinted aerial perspective. */
export function atmospheric(mat: T.Material) {
  if ((mat as any).__atmosphere || (mat as T.ShaderMaterial).isShaderMaterial || !(mat as any).fog) return;
  (mat as any).__atmosphere = true;
  const previous = mat.onBeforeCompile;
  // Three's default cache key is the onBeforeCompile source: capture it now,
  // before wrapping, or every wrapped material would share one program.
  const baseKey = mat.hasOwnProperty('customProgramCacheKey')
    ? mat.customProgramCacheKey.call(mat)
    : previous.toString();
  mat.onBeforeCompile = (shader, renderer) => {
    previous.call(mat, shader, renderer);
    Object.assign(shader.uniforms, atmosphereUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <fog_pars_vertex>', '#include <fog_pars_vertex>\n' + FOG_VERTEX_PARS)
      .replace('#include <fog_vertex>', FOG_VERTEX);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <fog_pars_fragment>', FOG_FRAGMENT_PARS)
      .replace('#include <fog_fragment>', FOG_FRAGMENT);
  };
  mat.customProgramCacheKey = () => baseKey + '|atm';
  mat.needsUpdate = true;
}

const NOISE = `
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 r=mat2(.8,.6,-.6,.8); for(int i=0;i<6;i++){ v+=a*vnoise(p); p=r*p*2.03+11.7; a*=.5; } return v; }
`;

export function skyMaterial() {
  return new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: atmosphereUniforms,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position = p.xyww; }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 uSunDir, uSunColor, uZenith, uHorizon;
      uniform float uTime, uCloud, uStorm, uDark, uFlash, uHaze;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        float mu = dot(d, uSunDir);
        // Sky gradient with a broad, warm glow along the sun side of the horizon.
        float up = clamp(h, 0., 1.);
        vec3 col = mix(uHorizon, uZenith, pow(up, 0.42));
        float sunSide = pow(max(mu, 0.) , 2.0);
        col = mix(col, uSunColor * 1.0, sunSide * exp(-up * 6.) * 0.6);
        // Below the horizon: haze that meets the fog.
        col = mix(col, uHorizon * 0.9, smoothstep(0.02, -0.12, h));
        // Mie halo and sun disc.
        float halo = pow(max(mu, 0.), 110.) * 1.2 + pow(max(mu, 0.), 12.) * 0.18;
        col += uSunColor * halo * (1. - uDark * 0.9) * (1. - uStorm * 0.4);
        float disc = smoothstep(0.99955, 0.99975, mu) * (1. - uDark);
        col += uSunColor * disc * 9.;
        // Clouds: a flowing deck projected on a dome.
        vec2 uv = d.xz / (max(h, 0.) + 0.09);
        vec2 wind = vec2(uTime * 0.006, uTime * 0.0022);
        float base = fbm(uv * 0.55 + wind);
        float detail = fbm(uv * 1.9 - wind * 1.6);
        float cover = mix(0.72, 0.28, uCloud);
        float density = smoothstep(cover, cover + 0.34, base * 0.72 + detail * 0.38);
        density *= smoothstep(-0.02, 0.12, h);
        // Keep a window around the sun on stormy chapters, like light breaking through.
        density *= 1. - smoothstep(0.93, 0.995, mu) * 0.55;
        float thin = 1. - smoothstep(0.1, 0.9, density);
        vec3 belly = mix(uHorizon * 0.55 + uZenith * 0.25, vec3(0.16, 0.18, 0.22), uStorm * 0.75);
        vec3 lit = mix(uHorizon * 1.05, uSunColor * 1.35, pow(max(mu, 0.) * .5 + .5, 3.));
        float silver = pow(max(mu, 0.), 6.) * thin * 2.6 * (1. - uDark);
        vec3 cloudCol = mix(belly, lit, 0.35 + 0.45 * thin) + uSunColor * silver;
        cloudCol = mix(cloudCol, cloudCol * vec3(0.35, 0.4, 0.55), uDark);
        col = mix(col, cloudCol, density * (0.92));
        // Horizon haze band softens the join between terrain and sky.
        col = mix(col, uHorizon, exp(-abs(h) * 16.) * 0.35 * uHaze);
        // Stars appear as the light goes.
        vec2 sp = d.xz / (h + 1.2) * 180.;
        float star = step(0.9965, hash12(floor(sp))) * smoothstep(0.05, 0.3, h);
        col += vec3(0.8, 0.85, 1.) * star * uDark * (1. - density) * 1.2;
        col += vec3(0.75, 0.8, 1.) * uFlash * (0.5 + density);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/** JS mirror of the sky's horizon colour in a direction; keeps distant fog on-palette. */
export function horizonTint(state: SkyState, dir: T.Vector3, out: T.Color) {
  const mu = Math.max(0, dir.x * state.sunDir.x + dir.z * state.sunDir.z);
  return out.copy(state.fog).lerp(state.sunColor, Math.pow(mu, 3) * 0.25 * (1 - state.darkness));
}
