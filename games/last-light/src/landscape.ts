import * as T from 'three';
import { geometries, materials, textures } from './art';
import { atmosphereUniforms } from './atmosphere';
import { routePoint } from './routes';
import { random, type Mission } from './missions';
import { surfaceTexture } from './surfaces';

/** World-space bounds of the playable valley. */
export function routeBounds(m: Mission) {
  const box = new T.Box3();
  for (let s = -60; s <= m.length + 80; s += 10) {
    const p = routePoint(m, s);
    box.expandByPoint(new T.Vector3(p.x, p.y, p.z));
  }
  return box;
}

/**
 * Layered mountain ranges on rings around the valley. Each ring is a single
 * mesh; the atmospheric fog turns the layers into receding blue silhouettes.
 */
export function ridgelines(m: Mission, bounds: T.Box3, snow: boolean) {
  const group = new T.Group();
  const center = bounds.getCenter(new T.Vector3());
  const size = bounds.getSize(new T.Vector3());
  const rng = random(m.seed * 3 + 101);
  const rings = [
    { margin: 470, base: 55, amp: 70, color: '#3f5a36', seg: 220 },
    { margin: 760, base: 105, amp: 120, color: '#44584f', seg: 200 },
    { margin: 1150, base: 170, amp: 230, color: '#56626a', seg: 180 },
  ];
  rings.forEach((ring, r) => {
    const rx = size.x / 2 + ring.margin,
      rz = size.z / 2 + ring.margin;
    const phases = Array.from({ length: 5 }, () => rng() * 100);
    const peaks = Array.from({ length: 4 }, () => ({ at: rng(), w: 0.02 + rng() * 0.03, h: 0.6 + rng() * 0.9 }));
    const pos: number[] = [],
      col: number[] = [],
      idx: number[] = [];
    const cCrest = new T.Color(ring.color),
      cFoot = new T.Color(ring.color).multiplyScalar(0.55),
      cSnow = new T.Color('#e4e8ea');
    for (let i = 0; i <= ring.seg; i++) {
      const u = i / ring.seg,
        a = u * Math.PI * 2;
      const ca = Math.cos(a),
        sa = Math.sin(a);
      // Superellipse: follows the valley's long shape.
      const px = center.x + Math.sign(ca) * Math.pow(Math.abs(ca), 0.6) * rx;
      const pz = center.z + Math.sign(sa) * Math.pow(Math.abs(sa), 0.6) * rz;
      const n = new T.Vector3(px - center.x, 0, pz - center.z).normalize();
      let h = 0;
      h += (1 - Math.abs(Math.sin(a * 7 + phases[0]))) * 0.45;
      h += (1 - Math.abs(Math.sin(a * 17 + phases[1]))) * 0.25;
      h += Math.sin(a * 31 + phases[2]) * 0.08 + Math.sin(a * 63 + phases[3]) * 0.04;
      for (const p of peaks) {
        const d = Math.min(Math.abs(u - p.at), 1 - Math.abs(u - p.at));
        h += Math.exp(-(d * d) / (p.w * p.w)) * p.h * (r === 2 ? 1 : 0.5);
      }
      const crest = ring.base + h * ring.amp;
      const rows: [number, number, T.Color][] = [
        [-110, -140, cFoot],
        [0, crest, cCrest],
        [150, crest * 0.7, cCrest],
      ];
      for (const [out, y, c] of rows) {
        pos.push(px + n.x * out, y, pz + n.z * out);
        const snowy = snow && r === 2 && y > ring.base + ring.amp * 0.95;
        const shade = 0.85 + Math.sin(a * 41 + phases[4]) * 0.1;
        const cc = snowy ? cSnow : c.clone().multiplyScalar(shade);
        col.push(cc.r, cc.g, cc.b);
      }
      if (i < ring.seg)
        for (let k = 0; k < 2; k++) {
          const a0 = i * 3 + k,
            b0 = (i + 1) * 3 + k;
          idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1);
        }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    geometries.add(g);
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: T.DoubleSide });
    materials.add(mat);
    const mesh = new T.Mesh(g, mat);
    mesh.frustumCulled = false;
    mesh.userData.routeWorld = true;
    group.add(mesh);
  });
  group.userData.routeWorld = true;
  return group;
}

/** A single water surface fills every low hollow: rivers and lakes in the valleys. */
export function valleyWater(level: number, bounds: T.Box3) {
  const size = bounds.getSize(new T.Vector3()),
    center = bounds.getCenter(new T.Vector3());
  const g = new T.PlaneGeometry(size.x + 1400, size.z + 1400, 24, 40);
  g.rotateX(-Math.PI / 2);
  geometries.add(g);
  const mat = new T.MeshStandardMaterial({ color: '#1d3036', roughness: 0.07, metalness: 0.2 });
  mat.envMapIntensity = 1.35;
  // Plain distance fog: the lake lies below the height-fog base anyway.
  (mat as any).__atmosphere = true;
  const normal = surfaceTexture('ground-normal');
  if (normal) {
    normal.repeat.set(160, 160);
    mat.normalMap = normal;
    mat.normalScale.set(0.12, 0.12);
    textures.add(normal);
  }
  materials.add(mat);
  const mesh = new T.Mesh(g, mat);
  mesh.position.set(center.x, level, center.z);
  mesh.receiveShadow = true;
  mesh.userData.routeWorld = true;
  return mesh;
}

/** Soft mist decks: they intersect the hills, so mist only shows in valleys. */
export function mistDecks(level: number, bounds: T.Box3, density: number) {
  const group = new T.Group();
  group.userData.routeWorld = true;
  const size = bounds.getSize(new T.Vector3()),
    center = bounds.getCenter(new T.Vector3());
  [
    { y: level + 7, a: 0.62 },
    { y: level + 19, a: 0.4 },
    { y: level + 34, a: 0.22 },
  ].forEach((layer, i) => {
    const g = new T.PlaneGeometry(size.x + 1600, size.z + 1600, 20, 32);
    g.rotateX(-Math.PI / 2);
    geometries.add(g);
    const mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: {
        ...atmosphereUniforms,
        uAlpha: { value: layer.a * density },
        uSeed: { value: i * 17.3 },
      },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `
        uniform vec3 uHorizon, uSunColor, uSunDir, uZenith; uniform float uTime, uAlpha, uSeed, uDark;
        varying vec3 vW;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
          return mix(mix(h(i), h(i+vec2(1,0)), u.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), u.x), u.y); }
        float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++) { v += a * n(p); p = p * 2.07 + 5.3; a *= .5; } return v; }
        void main(){
          vec2 p = vW.xz * 0.006 + vec2(uTime * 0.004, uTime * 0.0015) + uSeed;
          float m = smoothstep(0.35, 0.8, fbm(p) * 0.7 + fbm(p * 3.1 - uTime * 0.01) * 0.4);
          vec3 ray = vW - cameraPosition; float d = length(ray);
          float near = smoothstep(35., 160., d);
          float far = 1. - smoothstep(1400., 2400., d);
          float sun = pow(max(dot(ray / d, uSunDir), 0.), 6.);
          vec3 c = mix(uHorizon * 0.95, uSunColor * 1.2, sun * 0.6);
          c = mix(c, uZenith * 0.6 + uHorizon * 0.2, uDark * 0.6);
          gl_FragColor = vec4(c, m * uAlpha * near * far);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    materials.add(mat);
    const mesh = new T.Mesh(g, mat);
    mesh.position.set(center.x, layer.y, center.z);
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    group.add(mesh);
  });
  return group;
}

/** Flocks crossing the evening sky. */
export class Birds {
  mesh: T.InstancedMesh;
  private birds: { phase: number; offset: T.Vector3; speed: number }[] = [];
  private time = { value: 0 };
  private center = new T.Vector3();
  private dummy = new T.Object3D();
  constructor(count: number) {
    const g = new T.BufferGeometry();
    // Two wings, hinged at the body. `wing` drives the flap in the shader.
    g.setAttribute(
      'position',
      new T.Float32BufferAttribute([0, 0, 0.35, -1, 0, -0.1, 0, 0, -0.25, 0, 0, 0.35, 0, 0, -0.25, 1, 0, -0.1], 3),
    );
    g.setAttribute('wing', new T.Float32BufferAttribute([0, 1, 0, 0, 0, 1], 1));
    g.computeVertexNormals();
    geometries.add(g);
    const mat = new T.MeshBasicMaterial({ color: '#16130f', side: T.DoubleSide });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.flapTime = this.time;
      shader.vertexShader =
        'uniform float flapTime; attribute float wing;\n' +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float ph = 0.;
          #ifdef USE_INSTANCING
            ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.21;
          #endif
          transformed.y += wing * sin(flapTime * 9. + ph) * 0.7;`,
        );
    };
    mat.customProgramCacheKey = () => 'birds';
    materials.add(mat);
    this.mesh = new T.InstancedMesh(g, mat, count);
    this.mesh.frustumCulled = false;
    this.mesh.userData.routeWorld = true;
    const r = random(9001);
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 2),
        side = i % 2 ? 1 : -1;
      this.birds.push({
        phase: r() * 6,
        offset: new T.Vector3(side * row * 2.4 + (r() - 0.5), (r() - 0.5) * 1.5, -row * 2.1),
        speed: 0.9 + r() * 0.2,
      });
    }
  }
  update(t: number, anchor: T.Vector3, sunDir: T.Vector3, visible: boolean) {
    this.time.value = t;
    this.mesh.visible = visible;
    if (!visible) return;
    // The flock drifts across the sun side of the sky, circling slowly ahead.
    const a = t * 0.045;
    this.center.set(
      anchor.x + sunDir.x * 160 + Math.cos(a) * 120,
      anchor.y + 55 + Math.sin(t * 0.13) * 8,
      anchor.z + sunDir.z * 160 + Math.sin(a) * 120,
    );
    const heading = a + Math.PI / 2;
    this.birds.forEach((b, i) => {
      this.dummy.position.copy(b.offset).applyAxisAngle(new T.Vector3(0, 1, 0), heading).add(this.center);
      this.dummy.position.y += Math.sin(t * 0.7 + b.phase) * 0.8;
      this.dummy.rotation.set(0, heading, Math.sin(t + b.phase) * 0.15);
      this.dummy.scale.setScalar(1.4);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Fireflies over the verges once the light goes. */
export class Fireflies {
  points: T.Points;
  private data: Float32Array;
  private seeds: Float32Array;
  private mat: T.ShaderMaterial;
  constructor(count: number) {
    this.data = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);
    const r = random(77);
    for (let i = 0; i < count; i++) this.seeds[i] = r() * 100;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(this.data, 3));
    g.setAttribute('seed', new T.BufferAttribute(this.seeds, 1));
    geometries.add(g);
    this.mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 } },
      vertexShader: `attribute float seed; uniform float uTime; varying float vGlow;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.);
          vGlow = pow(max(0., sin(uTime * (1.3 + fract(seed) ) + seed)), 6.);
          gl_PointSize = 140. / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uAmount; varying float vGlow;
        void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d);
          gl_FragColor = vec4(vec3(1.6, 1.9, 0.7) * a * vGlow * uAmount, 1.); }`,
    });
    materials.add(this.mat);
    this.points = new T.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.userData.routeWorld = true;
  }
  update(t: number, around: T.Vector3, groundAt: (x: number, z: number) => number, amount: number) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uAmount.value = amount;
    this.points.visible = amount > 0.02;
    if (!this.points.visible) return;
    for (let i = 0; i < this.seeds.length; i++) {
      const s = this.seeds[i];
      // Each firefly owns a cell on a 60 m grid that scrolls with the truck.
      const cell = 60;
      const ox = ((s * 37.1) % 1) * cell,
        oz = ((s * 91.7) % 1) * cell;
      let x = Math.floor((around.x - ox) / cell) * cell + ox + Math.sin(t * 0.3 + s) * 2;
      let z = Math.floor((around.z - oz) / cell) * cell + oz + Math.cos(t * 0.27 + s) * 2;
      x += ((s * 13.3) % 1) * cell - cell / 2;
      z += ((s * 7.7) % 1) * cell - cell / 2;
      this.data[i * 3] = x;
      this.data[i * 3 + 1] = groundAt(x, z) + 0.6 + Math.sin(t * 0.8 + s) * 0.4;
      this.data[i * 3 + 2] = z;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

/** Cooking-fire smoke rising from the villages, lit warm by the low sun. */
export class Smoke {
  points: T.Points;
  private data: Float32Array;
  private ages: Float32Array;
  private mat: T.ShaderMaterial;
  constructor(private sources: T.Vector3[], perSource = 16) {
    const n = sources.length * perSource;
    this.data = new Float32Array(n * 3);
    this.ages = new Float32Array(n);
    for (let i = 0; i < n; i++) this.ages[i] = (i % perSource) / perSource;
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(this.data, 3));
    g.setAttribute('age', new T.BufferAttribute(this.ages, 1));
    geometries.add(g);
    this.mat = new T.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { ...atmosphereUniforms },
      vertexShader: `attribute float age; varying float vAge;
        void main(){ vAge = age; vec4 mv = modelViewMatrix * vec4(position, 1.);
          gl_PointSize = (180. + age * 900.) / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uSunColor, uHorizon; uniform float uDark; varying float vAge;
        void main(){ vec2 c = gl_PointCoord - .5; float a = smoothstep(.5, .1, length(c));
          vec3 col = mix(vec3(.62, .6, .58), uSunColor * .9 + uHorizon * .2, .45);
          col = mix(col, vec3(.18, .2, .26), uDark * .7);
          gl_FragColor = vec4(col, a * (1. - vAge) * smoothstep(0., .08, vAge) * .38);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    materials.add(this.mat);
    this.points = new T.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.userData.routeWorld = true;
  }
  update(dt: number, t: number) {
    const per = this.ages.length / this.sources.length;
    for (let i = 0; i < this.ages.length; i++) {
      this.ages[i] = (this.ages[i] + dt * 0.07) % 1;
      const src = this.sources[Math.floor(i / per)];
      const a = this.ages[i];
      this.data[i * 3] = src.x + a * 7 + Math.sin(t * 0.5 + i) * a * 1.5;
      this.data[i * 3 + 1] = src.y + 0.5 + a * 16;
      this.data[i * 3 + 2] = src.z + a * 3 + Math.cos(t * 0.4 + i) * a * 1.5;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.age.needsUpdate = true;
  }
}
