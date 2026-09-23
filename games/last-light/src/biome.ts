import * as T from 'three';
import { geometries, materials } from './art';
import { atmosphereUniforms } from './atmosphere';
import type { PlantKind } from './scenery-layout';

/**
 * Procedural African vegetation. Every species is one merged geometry with
 * vertex colour, a foliage weight (wind + backlit translucency) and soft
 * "spherical" canopy normals, so a whole species is a single instanced draw.
 */

const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

class Builder {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];
  leaf: number[] = [];
  private v = new T.Vector3();
  private n = new T.Vector3();
  /**
   * Adds a geometry. `shade(y01)` darkens undersides; `center` bends normals
   * outward from a canopy's centre so clumps read as soft volumes.
   */
  add(
    source: T.BufferGeometry,
    matrix: T.Matrix4,
    color: T.ColorRepresentation,
    leaf: number,
    opts: { center?: T.Vector3; soft?: number; shade?: [number, number]; jitter?: number } = {},
  ) {
    const g = source.index ? source.toNonIndexed() : source;
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position,
      nrm = g.attributes.normal;
    const base = new T.Color(color);
    const normalMatrix = new T.Matrix3().getNormalMatrix(matrix);
    let minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < p.count; i++) {
      minY = Math.min(minY, p.getY(i));
      maxY = Math.max(maxY, p.getY(i));
    }
    const [lo, hi] = opts.shade ?? [1, 1];
    for (let i = 0; i < p.count; i++) {
      this.v.set(p.getX(i), p.getY(i), p.getZ(i));
      if (opts.jitter) {
        const j = (hash(this.v.x, this.v.y, this.v.z) - 0.5) * opts.jitter;
        this.v.multiplyScalar(1 + j);
      }
      const y01 = (this.v.y - minY) / Math.max(1e-4, maxY - minY);
      this.v.applyMatrix4(matrix);
      this.n.set(nrm.getX(i), nrm.getY(i), nrm.getZ(i)).applyMatrix3(normalMatrix).normalize();
      if (opts.center) {
        const out = this.v.clone().sub(opts.center).normalize();
        this.n.lerp(out, opts.soft ?? 0.7).normalize();
      }
      this.pos.push(this.v.x, this.v.y, this.v.z);
      this.nor.push(this.n.x, this.n.y, this.n.z);
      const k = T.MathUtils.lerp(lo, hi, y01) * (0.93 + hash(i, this.v.x, 3.1) * 0.12);
      this.col.push(base.r * k, base.g * k, base.b * k);
      this.leaf.push(leaf);
    }
    if (g !== source) g.dispose();
  }
  tri(a: T.Vector3, b: T.Vector3, c: T.Vector3, color: T.ColorRepresentation, leaf: number, up = 0.5) {
    const n = new T.Vector3().subVectors(b, a).cross(new T.Vector3().subVectors(c, a)).normalize();
    // Leaflets are thin; blend toward "up" so both faces catch the sky light.
    n.lerp(new T.Vector3(0, 1, 0), up).normalize();
    const col = new T.Color(color);
    for (const v of [a, b, c]) {
      this.pos.push(v.x, v.y, v.z);
      this.nor.push(n.x, n.y, n.z);
      const k = 0.9 + hash(v.x, v.y, v.z) * 0.2;
      this.col.push(col.r * k, col.g * k, col.b * k);
      this.leaf.push(leaf);
    }
  }
  build() {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new T.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(this.col, 3));
    g.setAttribute('leaf', new T.Float32BufferAttribute(this.leaf, 1));
    g.computeBoundingSphere();
    geometries.add(g);
    return g;
  }
}

const M = new T.Matrix4();
const Q = new T.Quaternion();
const E = new T.Euler();
const S = new T.Vector3();
const P = new T.Vector3();
const compose = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));

/** Limb from a to b with radii ra→rb. */
function limb(b: Builder, a: T.Vector3, to: T.Vector3, ra: number, rb: number, color: string, seg = 6) {
  const len = a.distanceTo(to);
  const g = new T.CylinderGeometry(rb, ra, len, seg, 1, true);
  g.translate(0, len / 2, 0);
  const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), to.clone().sub(a).normalize());
  M.compose(a, q, S.set(1, 1, 1));
  b.add(g, M, color, 0, { shade: [0.7, 1.05] });
  g.dispose();
}

function blob(b: Builder, c: T.Vector3, r: number, sy: number, color: string, detail: number, leaf = 1) {
  const g = new T.IcosahedronGeometry(r, detail);
  compose(c.x, c.y, c.z, 0, hash(c.x, c.y, c.z) * 6, 0, 1, sy, 1);
  b.add(g, M, color, leaf, { center: c.clone(), soft: 0.75, shade: [0.5, 1.15], jitter: 0.32 });
  g.dispose();
}

export type Palette = { leaf: string; leafDry: string; bark: string };

export function speciesGeometry(kind: PlantKind, detail: number, palette: Palette) {
  const b = new Builder();
  const r = rng(kind.length * 977 + 13);
  const v = (x: number, y: number, z: number) => new T.Vector3(x, y, z);
  if (kind === 'acacia') {
    const bark = '#4b3b2d';
    limb(b, v(0, -0.3, 0), v(0.25, 2.3, 0.1), 0.26, 0.17, bark, 7);
    const tips: T.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const tip = v(0.25 + Math.cos(a) * 2.3, 4.2 + r() * 0.5, 0.1 + Math.sin(a) * 2.3);
      limb(b, v(0.25, 2.2, 0.1), tip, 0.15, 0.06, bark, 5);
      tips.push(tip);
    }
    // The flat umbrella: overlapping squashed clumps in a wide disc.
    blob(b, v(0.25, 4.85, 0.1), 2.5, 0.28, palette.leaf, detail);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r();
      const d = 2 + r() * 1.3;
      blob(b, v(0.25 + Math.cos(a) * d, 4.6 + r() * 0.5, 0.1 + Math.sin(a) * d), 1.5 + r() * 0.6, 0.3, i % 2 ? palette.leaf : palette.leafDry, detail);
    }
  } else if (kind === 'baobab') {
    const bark = '#8c7b6a';
    const profile = [
      [1.25, -0.5],
      [1.5, 0.4],
      [1.45, 2],
      [1.3, 4],
      [1.0, 5.8],
      [0.75, 6.8],
      [0.45, 7.2],
    ].map(([x, y]) => new T.Vector2(x, y));
    const g = new T.LatheGeometry(profile, 11);
    compose(0, 0, 0);
    b.add(g, M, bark, 0, { shade: [0.7, 1.05], jitter: 0.06 });
    g.dispose();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + r() * 0.4;
      const root = v(Math.cos(a) * 0.45, 6.9, Math.sin(a) * 0.45);
      const tip = v(Math.cos(a) * (2.2 + r()), 8.4 + r() * 1.2, Math.sin(a) * (2.2 + r()));
      limb(b, root, tip, 0.28, 0.08, bark, 5);
      const twig = tip.clone().add(v(Math.cos(a + 0.8) * 0.9, 0.7, Math.sin(a + 0.8) * 0.9));
      limb(b, tip, twig, 0.08, 0.03, bark, 4);
      if (i % 2 === 0) blob(b, tip.clone().add(v(0, 0.35, 0)), 0.75, 0.55, palette.leafDry, Math.max(0, detail - 1));
    }
  } else if (kind === 'palm') {
    const curve = new T.CubicBezierCurve3(v(0, -0.3, 0), v(0.2, 3, 0), v(1.1, 6.5, 0), v(1.5, 9.4, 0.1));
    const g = new T.TubeGeometry(curve, 12, 0.2, 7, false);
    // Taper and ring the trunk.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const t = Math.max(0, y) / 9.4;
      const c = curve.getPoint(Math.min(1, Math.max(0, t)));
      const ring = 1 + 0.07 * Math.sin(y * 9);
      p.setXYZ(i, c.x + (p.getX(i) - c.x) * (1.1 - t * 0.35) * ring, y, c.z + (p.getZ(i) - c.z) * (1.1 - t * 0.35) * ring);
    }
    g.computeVertexNormals();
    compose(0, 0, 0);
    b.add(g, M, '#6c5a45', 0, { shade: [0.75, 1.05] });
    g.dispose();
    const top = v(1.5, 9.4, 0.1);
    const fronds = 13;
    for (let f = 0; f < fronds; f++) {
      const a = (f / fronds) * Math.PI * 2 + r() * 0.3;
      const dir = v(Math.cos(a), 0, Math.sin(a));
      const side = v(-dir.z, 0, dir.x);
      const L = 3.6 + r() * 1.2,
        lift = 0.6 + r() * 1.3;
      const pts: T.Vector3[] = [];
      for (let i = 0; i <= 9; i++) {
        const t = i / 9;
        pts.push(top.clone().addScaledVector(dir, t * L).add(v(0, Math.sin(t * Math.PI * 0.75) * lift - t * t * 2.4, 0)));
      }
      for (let i = 0; i < 9; i++) {
        const a0 = pts[i],
          a1 = pts[i + 1];
        const len = (1 - i / 10) * 1.05 + 0.2;
        for (const s of [-1, 1]) {
          const tip = a0.clone().addScaledVector(side, s * len).addScaledVector(dir, 0.35).add(v(0, -0.35 - i * 0.03, 0));
          b.tri(a0, s > 0 ? a1 : tip, s > 0 ? tip : a1, i % 3 === 0 ? palette.leafDry : palette.leaf, 1);
        }
      }
    }
    blob(b, top.clone().add(v(0, -0.2, 0)), 0.45, 0.8, '#7a5a3a', 0, 0);
  } else if (kind === 'banana') {
    limb(b, v(0, -0.2, 0), v(0.05, 2.3, 0), 0.17, 0.12, '#6f7f3c', 7);
    for (let l = 0; l < 7; l++) {
      const a = (l / 7) * Math.PI * 2 + r() * 0.5;
      const dir = v(Math.cos(a), 0, Math.sin(a)),
        side = v(-dir.z, 0, dir.x);
      const base = v(0.05, 1.9 + r() * 0.5, 0);
      const L = 2.1 + r() * 0.7,
        W = 0.45 + r() * 0.15,
        rise = 0.9 + r() * 0.8;
      let prev: T.Vector3[] | null = null;
      for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const c = base.clone().addScaledVector(dir, t * L).add(v(0, Math.sin(t * Math.PI * 0.6) * rise - t * t * 1.2, 0));
        const w = Math.sin(Math.min(1, t * 1.15) * Math.PI) * W + 0.03;
        const row = [c.clone().addScaledVector(side, -w).add(v(0, -0.08, 0)), c, c.clone().addScaledVector(side, w).add(v(0, -0.08, 0))];
        if (prev) {
          const col = l % 3 === 0 && i > 3 ? palette.leafDry : '#5d8c2c';
          b.tri(prev[0], row[0], row[1], col, 1, 0.3);
          b.tri(prev[0], row[1], prev[1], col, 1, 0.3);
          b.tri(prev[1], row[1], row[2], col, 1, 0.3);
          b.tri(prev[1], row[2], prev[2], col, 1, 0.3);
        }
        prev = row;
      }
    }
  } else if (kind === 'euphorbia') {
    const skin = '#56703f';
    limb(b, v(0, -0.3, 0), v(0, 2.1, 0), 0.34, 0.27, '#5b4a36', 8);
    const arms = 7;
    for (let i = 0; i < arms; i++) {
      const a = (i / arms) * Math.PI * 2 + r() * 0.4;
      const out = 0.7 + r() * 0.7;
      const y0 = 1.7 + r() * 0.5;
      const elbow = v(Math.cos(a) * out, y0 + 0.35, Math.sin(a) * out);
      limb(b, v(0, y0, 0), elbow, 0.2, 0.18, skin, 6);
      const tip = elbow.clone().add(v(0, 1.8 + r() * 1.8, 0));
      limb(b, elbow, tip, 0.18, 0.13, skin, 6);
      blob(b, tip, 0.14, 1, '#6e8a48', 0, 0.3);
    }
    limb(b, v(0, 2, 0), v(0, 4.4, 0), 0.22, 0.14, skin, 6);
  } else {
    // Broadleaf: the dense, rounded trees of the green hills in the key art.
    const bark = '#4a3d2e';
    limb(b, v(0, -0.3, 0), v(0.1, 4.2, 0), 0.38, 0.24, bark, 8);
    const crowns: T.Vector3[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + r();
      const tip = v(Math.cos(a) * 1.8, 5.8 + r() * 1.2, Math.sin(a) * 1.8);
      limb(b, v(0.1, 3.8, 0), tip, 0.2, 0.09, bark, 5);
      crowns.push(tip);
    }
    blob(b, v(0.1, 7.6, 0), 2.6, 0.72, palette.leaf, detail);
    crowns.forEach((c, i) => blob(b, c.clone().add(v(0, 0.6, 0)), 1.9 + r() * 0.5, 0.75, i % 2 ? palette.leafDry : palette.leaf, detail));
    blob(b, v(0.9, 8.6, -0.6), 1.7, 0.8, palette.leaf, detail);
  }
  return b.build();
}

/** A single canopy clump for the forested hillsides beyond the road. */
export function hillCanopyGeometry(palette: Palette) {
  const b = new Builder();
  blob(b, new T.Vector3(0, 0, 0), 1, 0.8, palette.leaf, 0);
  blob(b, new T.Vector3(0.7, -0.2, 0.3), 0.7, 0.8, palette.leafDry, 0);
  return b.build();
}

/** Tall elephant-grass clump: curved, tapered blades with golden tips. */
export function grassClumpGeometry(base: string, tip: string, blades = 9) {
  const b = new Builder();
  const r = rng(4242);
  const cb = new T.Color(base),
    ct = new T.Color(tip);
  for (let i = 0; i < blades; i++) {
    const a = r() * Math.PI * 2;
    const h = 0.8 + r() * 1.1,
      lean = 0.25 + r() * 0.5,
      w = 0.045 + r() * 0.03;
    const dir = new T.Vector3(Math.cos(a), 0, Math.sin(a)),
      side = new T.Vector3(-dir.z, 0, dir.x);
    const root = new T.Vector3(Math.cos(a) * 0.12 * r(), 0, Math.sin(a) * 0.12 * r());
    const seg = 3;
    let pl: T.Vector3 | null = null,
      pr: T.Vector3 | null = null,
      pc: T.Color | null = null;
    for (let s = 0; s <= seg; s++) {
      const t = s / seg;
      const c = root.clone().addScaledVector(dir, t * t * lean * h).add(new T.Vector3(0, t * h, 0));
      const ww = w * (1 - t * 0.9);
      const l = c.clone().addScaledVector(side, -ww),
        rr = c.clone().addScaledVector(side, ww);
      const col = cb.clone().lerp(ct, Math.pow(t, 1.3));
      if (pl && pr && pc) {
        b.tri(pl, l, rr, col, t, 0.6);
        b.tri(pl, rr, pr, pc, t, 0.6);
      }
      pl = l;
      pr = rr;
      pc = col;
    }
  }
  return b.build();
}

/** Red termite mound: a lumpy, tapering spire. */
export function moundGeometry() {
  const b = new Builder();
  const profile = [
    [0.95, -0.3],
    [0.9, 0.3],
    [0.62, 1.1],
    [0.42, 1.9],
    [0.22, 2.6],
    [0.05, 2.9],
  ].map(([x, y]) => new T.Vector2(x, y));
  const g = new T.LatheGeometry(profile, 9);
  compose(0, 0, 0);
  b.add(g, M, '#9a4e2c', 0, { shade: [0.7, 1.1], jitter: 0.16 });
  g.dispose();
  const side = new T.LatheGeometry(profile.map((p) => p.clone().multiplyScalar(0.55)), 7);
  compose(0.55, -0.1, 0.2);
  b.add(side, M, '#a3572f', 0, { shade: [0.7, 1.1], jitter: 0.2 });
  side.dispose();
  return b.build();
}

/** Rounded granite boulder (kopje stone). */
export function boulderGeometry() {
  const g = new T.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i);
    const n = 1 + (hash(Math.round(x * 50), Math.round(y * 50), Math.round(z * 50)) - 0.5) * 0.12 + Math.sin(x * 3 + z * 2) * 0.06;
    p.setXYZ(i, x * n, Math.max(y, -0.55) * n, z * n);
  }
  g.computeVertexNormals();
  const b = new Builder();
  compose(0, 0, 0);
  b.add(g, M, '#8d8474', 0, { shade: [0.55, 1.1] });
  g.dispose();
  return b.build();
}

export type Wind = { value: number };

/** Foliage/terrain-dressing material: wind on foliage, backlit translucency, vertex colour. */
export function foliageMaterial(time: Wind, strength: number, opts: { double?: boolean; grass?: boolean } = {}) {
  const mat = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.88,
    metalness: 0,
    side: opts.double ? T.DoubleSide : T.FrontSide,
  });
  materials.add(mat);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.windTime = time;
    shader.uniforms.uSunDir = atmosphereUniforms.uSunDir;
    shader.uniforms.uSunColor = atmosphereUniforms.uSunColor;
    shader.uniforms.uDark = atmosphereUniforms.uDark;
    shader.vertexShader =
      'uniform float windTime; attribute float leaf; varying float vLeaf; varying vec3 vLeafWorld;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vLeaf = leaf;
        vec3 wo = vec3(0.);
        #ifdef USE_INSTANCING
          wo = instanceMatrix[3].xyz;
        #endif
        float gust = 0.6 + 0.4 * sin(windTime * 0.35 + wo.x * 0.01);
        float sway = (sin(windTime * 1.6 + wo.x * 0.21 + wo.z * 0.13) + 0.4 * sin(windTime * 3.7 + wo.z * 0.41 + position.y)) * gust;
        float bend = ${opts.grass ? 'pow(max(position.y, 0.), 1.4)' : 'pow(max(position.y, 0.) / 9., 1.6) * 3.'} * ${strength.toFixed(3)};
        float flutter = leaf * sin(windTime * 7. + position.x * 4. + position.z * 3.) * ${(strength * 0.25).toFixed(3)};
        transformed.x += sway * bend + flutter;
        transformed.z += cos(windTime * 1.2 + wo.x * 0.3) * bend * 0.45 + flutter * 0.6;`,
      ).replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        vec4 lw = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          lw = instanceMatrix * lw;
        #endif
        vLeafWorld = (modelMatrix * lw).xyz;`,
      );
    shader.fragmentShader =
      '#ifndef USE_FOG\nuniform vec3 uSunDir; uniform vec3 uSunColor;\n#endif\nuniform float uDark; varying float vLeaf; varying vec3 vLeafWorld;\n' +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        vec3 toFrag = normalize(vLeafWorld - cameraPosition);
        float through = pow(max(dot(toFrag, uSunDir), 0.), 4.) * vLeaf;
        totalEmissiveRadiance += diffuseColor.rgb * uSunColor * through * ${opts.grass ? '0.5' : '0.3'} * (1. - uDark);`,
      );
  };
  mat.customProgramCacheKey = () => `foliage-${strength}-${opts.grass ? 1 : 0}-${opts.double ? 1 : 0}`;
  return mat;
}

export function paletteFor(lush: number): Palette {
  const leaf = new T.Color('#6d7a36').lerp(new T.Color('#3f6a26'), lush);
  const leafDry = new T.Color('#9a8c48').lerp(new T.Color('#5e8a30'), lush);
  return { leaf: '#' + leaf.getHexString(), leafDry: '#' + leafDry.getHexString(), bark: '#4b3b2d' };
}

export const SPECIES: PlantKind[] = ['acacia', 'baobab', 'palm', 'banana', 'euphorbia', 'broadleaf'];
