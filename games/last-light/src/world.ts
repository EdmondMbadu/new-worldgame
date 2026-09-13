import * as T from 'three';
import { GameEngine } from './engine';
import {
  batch,
  box,
  createClinic,
  createPerson,
  createTruck,
  cylinder,
  disposeArt,
  geometries,
  label,
  material,
  materials,
  mesh,
  sphere,
  texture,
  textures,
} from './art';
import {
  clamp,
  forkOffset,
  heightAt,
  isMud,
  onBridge,
  random,
  roadDistance,
  roadX,
  roadY,
  routeX,
  smooth,
  type Mission,
} from './missions';
import type { Settings } from './save';
import { canopyTexture, grassGeometry } from './foliage';
import { surfaceTexture } from './surfaces';

export class GameWorld {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(56, 1, 0.15, 900);
  truck: ReturnType<typeof createTruck>;
  clinic: ReturnType<typeof createClinic>;
  people: ReturnType<typeof createPerson>[] = [];
  sun = new T.DirectionalLight();
  rain: T.LineSegments;
  rainData: Float32Array;
  dust: T.Points;
  dustData: Float32Array;
  headlights: T.SpotLight[] = [];
  transferKit = new T.Group();
  private resizeObserver: ResizeObserver;
  private clock = 0;
  private aim = new T.Vector3();
  private eye = new T.Vector3();
  private camReady = false;
  private sky: T.Mesh;
  private low = false;
  private frameSamples: number[] = [];
  private adaptTimer = 0;
  private particles: Float32Array;
  private disposed = false;
  constructor(
    public canvas: HTMLCanvasElement,
    public engine: GameEngine,
    public settings: Settings,
  ) {
    const m = engine.mission;
    this.low =
      settings.quality === 'low' ||
      (settings.quality === 'auto' && matchMedia('(pointer:coarse)').matches);
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: !this.low,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.low ? 1 : 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.scene.background = new T.Color(m.sky);
    this.scene.fog = new T.FogExp2(m.sky, 0.0018 + m.night * 0.0012);
    const hemi = new T.HemisphereLight(
      m.night > 0.5 ? '#8baec5' : '#e3e8d4',
      '#4b4830',
      m.night > 0.5 ? 1.35 : 2,
    );
    this.scene.add(hemi);
    this.sun.color.set(m.sun);
    this.sun.intensity = m.night > 0.5 ? 0.8 : 3;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.low ? 1024 : 2048, this.low ? 1024 : 2048);
    this.sun.shadow.camera.left = -55;
    this.sun.shadow.camera.right = 55;
    this.sun.shadow.camera.top = 65;
    this.sun.shadow.camera.bottom = -45;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 240;
    this.sun.shadow.bias = -0.0003;
    this.sun.shadow.normalBias = 0.08;
    this.scene.add(this.sun, this.sun.target);
    this.sky = this.makeSky(m);
    this.scene.add(this.sky);
    this.buildTerrain(m);
    this.buildNature(m);
    this.buildRoute(m);
    this.truck = createTruck();
    this.scene.add(this.truck.root);
    for (const x of [-0.72, 0.72]) {
      const light = new T.SpotLight(
        '#fff0cc',
        m.night > 0.4 ? 48 : 12,
        65,
        0.47,
        0.55,
        1.25,
      );
      light.position.set(x, 0.85, 2.2);
      light.target.position.set(x, 0.1, 24);
      this.truck.root.add(light, light.target);
      this.headlights.push(light);
    }
    const kitFrame = material('#90a49a', 0.32, 0.6);
    box(this.transferKit, kitFrame, 0, 1.15, 0, 1.55, 0.08, 1.05);
    box(this.transferKit, this.truck.panelMat, 0, 1.2, 0, 1.46, 0.015, 0.96);
    box(
      this.transferKit,
      material('#263d37'),
      0,
      0.56,
      0,
      0.64,
      0.64,
      0.62,
      0.04,
    );
    this.transferKit.visible = false;
    this.scene.add(batch(this.transferKit));
    this.clinic = createClinic(m.place, m.id === 4);
    this.clinic.root.position.set(0, roadY(m, m.length), m.length + 19);
    this.clinic.root.rotation.y = Math.PI;
    this.scene.add(this.clinic.root);
    for (let i = 0; i < 7; i++) {
      const p = createPerson(
        [
          '#e5e2ca',
          '#d3bf84',
          '#aab9ad',
          '#bb743f',
          '#58847c',
          '#d6a36b',
          '#d5ddd1',
        ][i],
        i % 2 ? '#61412c' : '#7b5239',
        i === 5 ? 0.76 : 1,
      );
      p.group.position.set(
        (i % 2 ? 1 : -1) * (3.2 + Math.floor(i / 2) * 1.25),
        roadY(m, m.length),
        m.length + 10 + (i % 3),
      );
      this.people.push(p);
      this.scene.add(p.group);
    }
    // The delivery bay uses world geometry, so it remains legible without HUD colour.
    const bay = new T.Group();
    const bayMat = material('#d5c890');
    for (const side of [-1, 1])
      for (const z of [m.length - 6, m.length + 5]) {
        box(
          bay,
          bayMat,
          side * 5,
          heightAt(m, side * 5, z) + 0.03,
          z,
          1.1,
          0.035,
          0.15,
        );
        box(
          bay,
          bayMat,
          side * 5,
          heightAt(m, side * 5, z) + 0.03,
          z,
          0.15,
          0.035,
          1.1,
        );
      }
    this.scene.add(batch(bay));
    this.rainData = new Float32Array((this.low ? 200 : 550) * 6);
    const rainGeo = new T.BufferGeometry();
    rainGeo.setAttribute('position', new T.BufferAttribute(this.rainData, 3));
    geometries.add(rainGeo);
    const rainMat = new T.LineBasicMaterial({
      color: '#b0d0d0',
      transparent: true,
      opacity: m.rain * 0.27,
      depthWrite: false,
    });
    materials.add(rainMat);
    this.rain = new T.LineSegments(rainGeo, rainMat);
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
    this.dustData = new Float32Array(180 * 3);
    this.particles = new Float32Array(180);
    this.dustData.fill(-100);
    const dg = new T.BufferGeometry();
    dg.setAttribute('position', new T.BufferAttribute(this.dustData, 3));
    geometries.add(dg);
    const dm = new T.PointsMaterial({
      color: m.rain > 0.3 ? '#b2a48a' : '#bfa376',
      size: 0.12,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    materials.add(dm);
    this.dust = new T.Points(dg, dm);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.render(0);
    this.renderer.compile(this.scene, this.camera);
  }
  private resize() {
    const width = this.canvas.clientWidth,
      height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.fov = width < height ? 65 : 56;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
  private makeSky(m: Mission) {
    const mat = new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new T.Color(m.night > 0.5 ? '#102736' : '#719aab') },
        bottom: { value: new T.Color(m.sky) },
        sun: { value: new T.Color(m.sun) },
        night: { value: m.night },
      },
      vertexShader:
        'varying vec3 v; void main(){v=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:
        'varying vec3 v;uniform vec3 top,bottom,sun;uniform float night;void main(){vec3 d=normalize(v);float h=clamp(d.y,0.,1.);vec3 c=mix(bottom,top,pow(h,.55));float s=pow(max(0.,dot(d,normalize(vec3(-.5,.25,.7)))),180.);c+=sun*s*(1.-night)*.7;float clouds=sin(d.x*16.+sin(d.z*13.))*sin(d.z*23.+d.y*19.);c=mix(c,bottom*.86,smoothstep(.2,.7,clouds)*smoothstep(.06,.2,h)*.4);gl_FragColor=vec4(c,1.); #include <tonemapping_fragment> #include <colorspace_fragment> }'.replaceAll(
          ' #include',
          '\n#include',
        ),
    });
    materials.add(mat);
    const geo = new T.SphereGeometry(760, 24, 16);
    geometries.add(geo);
    return new T.Mesh(geo, mat);
  }
  private buildTerrain(m: Mission) {
    const data = this.engine.terrain;
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      'position',
      new T.BufferAttribute(data.vertices.slice(), 3),
    );
    geometry.setIndex(new T.BufferAttribute(data.indices.slice(), 1));
    const uv = new Float32Array((data.vertices.length / 3) * 2),
      colors = new Float32Array(data.vertices.length);
    for (let i = 0; i < data.vertices.length / 3; i++) {
      const x = data.vertices[i * 3],
        z = data.vertices[i * 3 + 2];
      uv[i * 2] = x * 0.07;
      uv[i * 2 + 1] = z * 0.07;
      const d = roadDistance(m, x, z),
        v = 0.8 + Math.sin(x * 0.08 + z * 0.025) * 0.17;
      const c = new T.Color(d < 7 ? '#a09572' : '#9da37a').multiplyScalar(v);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const mat = material('#ffffff');
    mat.map = surfaceTexture('ground-color') || texture('grass');
    mat.normalMap = surfaceTexture('ground-normal') || null;
    mat.normalScale.set(0.55, 0.55);
    textures.add(mat.map);
    if (mat.normalMap) textures.add(mat.normalMap);
    mat.vertexColors = true;
    mesh(geometry, mat, this.scene);
    for (const alt of [false, true]) {
      const geo = new T.BufferGeometry(),
        p: number[] = [],
        u: number[] = [],
        idx: number[] = [];
      const start = alt ? m.fork[0] : -30,
        end = alt ? m.fork[1] : m.length + 12;
      for (let z = start, j = 0; z <= end; z += 2, j++) {
        const width = onBridge(m, z) && !alt ? 2.5 : 5.8;
        for (let i = 0; i < 5; i++) {
          const x = routeX(m, z, alt) + ((i / 4) * 2 - 1) * width;
          p.push(x, heightAt(m, x, z) + 0.055, z);
          u.push(i * 0.44, z * 0.14);
          if (i < 4 && z + 2 <= end) {
            const a = j * 5 + i;
            idx.push(a, a + 5, a + 1, a + 1, a + 5, a + 6);
          }
        }
      }
      geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(u, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const dirt = material('#f5d8b8', m.rain > 0.3 ? 0.68 : 0.95);
      dirt.map = surfaceTexture('road-color') || texture('earth');
      dirt.normalMap = surfaceTexture('road-normal') || null;
      dirt.normalScale.set(0.7, 0.7);
      textures.add(dirt.map);
      if (dirt.normalMap) textures.add(dirt.normalMap);
      mesh(geo, dirt, this.scene);
    }
    const patches = new T.Group(),
      mud = material('#574330', 0.24),
      rut = material('#332b23', 0.95);
    for (const [a, b] of m.mud) {
      for (let z = a; z < b; z += 4) {
        const x = roadX(m, z);
        const o = mesh(
          new T.CircleGeometry(1, 20),
          mud,
          patches,
          x,
          heightAt(m, x, z) + 0.08,
          z,
        );
        o.rotation.x = -Math.PI / 2;
        o.scale.set(5, 2.7, 1);
        o.castShadow = false;
      }
    }
    for (const o of this.engine.obstacles) {
      if (o.kind === 'rut') {
        const pothole = mesh(
          new T.CircleGeometry(o.radius, 16),
          rut,
          patches,
          o.x,
          heightAt(m, o.x, o.z) + 0.082,
          o.z,
        );
        pothole.rotation.x = -Math.PI / 2;
        pothole.scale.set(1, 1.45, 1);
      } else if (o.kind === 'rock') {
        sphere(
          patches,
          material('#76735e'),
          o.x,
          heightAt(m, o.x, o.z),
          o.z,
          o.radius,
          1,
          0.8,
          1.1,
        );
      } else {
        const tree = cylinder(
          patches,
          material('#65543b'),
          o.x,
          heightAt(m, o.x, o.z) + 0.4,
          o.z,
          0.36,
          0.5,
          4,
        );
        tree.rotation.z = 1.32;
      }
    }
    this.scene.add(batch(patches));
    if (m.bridge) {
      const water = material('#718d8d', 0.15, 0.3);
      const mid = (m.bridge[0] + m.bridge[1]) / 2;
      const river = box(
        this.scene,
        water,
        roadX(m, mid),
        roadY(m, mid) - 4.4,
        mid,
        410,
        0.05,
        40,
      );
      river.castShadow = false;
      const bridge = new T.Group(),
        wood = material('#9c8c6c'),
        rail = material('#d0cbb0');
      for (let z = m.bridge[0]; z <= m.bridge[1]; z += 1.4) {
        box(bridge, wood, roadX(m, z), roadY(m, z) + 0.11, z, 5, 0.18, 1.25);
        if (Math.round(z * 10) % 28 === 0)
          for (const side of [-1, 1]) {
            box(
              bridge,
              rail,
              roadX(m, z) + side * 2.4,
              roadY(m, z) + 0.8,
              z,
              0.09,
              1.6,
              0.1,
            );
            box(
              bridge,
              rail,
              roadX(m, z) + side * 2.4,
              roadY(m, z) + 1.4,
              z,
              0.08,
              0.08,
              2.8,
            );
          }
      }
      this.scene.add(batch(bridge));
    }
  }
  private buildNature(m: Mission) {
    const rng = random(m.seed * 11),
      nature = new T.Group(),
      trunkGeo = new T.CylinderGeometry(0.17, 0.32, 5, 6),
      leafGeo = new T.PlaneGeometry(2, 2);
    geometries.add(trunkGeo);
    geometries.add(leafGeo);
    const trunkMat = material('#534b34'),
      leafMats = [
        material('#f0f3c6'),
        material('#dce6bf'),
        material('#f1e5b9'),
      ];
    const leafMap = canopyTexture();
    leafMats.forEach((mat) => {
      mat.map = leafMap;
      mat.alphaTest = 0.45;
      mat.side = T.DoubleSide;
    });
    const count = this.low ? 450 : 800;
    const trunks = new T.InstancedMesh(trunkGeo, trunkMat, count);
    const crowns = leafMats.map(
      (mat) => new T.InstancedMesh(leafGeo, mat, count * 3),
    );
    const obj = new T.Object3D();
    let ci = [0, 0, 0];
    for (let i = 0; i < count; i++) {
      const z = rng() * (m.length + 130) - 45,
        x = roadX(m, z) + (rng() > 0.5 ? 1 : -1) * (11 + rng() * 125);
      if (
        roadDistance(m, x, z) < 10 ||
        (z > m.length - 25 && Math.abs(x) < 30)
      ) {
        obj.position.set(0, -300, 0);
        obj.updateMatrix();
        trunks.setMatrixAt(i, obj.matrix);
        continue;
      }
      const y = heightAt(m, x, z),
        s = 0.65 + rng() * 1.25;
      obj.position.set(x, y + 2.2 * s, z);
      obj.rotation.set(rng() * 0.12, 0, rng() * 0.12);
      obj.scale.set(s, s, s);
      obj.updateMatrix();
      trunks.setMatrixAt(i, obj.matrix);
      for (let j = 0; j < 7; j++) {
        const variant = i % 3;
        obj.position.set(
          x + (rng() - 0.5) * 3.3 * s,
          y + (4 + rng() * 2.8) * s,
          z + (rng() - 0.5) * 3 * s,
        );
        obj.scale.set((2 + rng()) * s, (1.7 + rng()) * s, 1);
        obj.rotation.set(
          (rng() - 0.5) * 0.75,
          rng() * 6.28,
          (rng() - 0.5) * 0.6,
        );
        obj.updateMatrix();
        crowns[variant].setMatrixAt(ci[variant]++, obj.matrix);
      }
    }
    trunks.castShadow = true;
    trunks.receiveShadow = true;
    this.scene.add(trunks);
    crowns.forEach((c, i) => {
      c.count = ci[i];
      c.castShadow = !this.low;
      c.receiveShadow = true;
      this.scene.add(c);
    });
    const grassGeo = grassGeometry();
    geometries.add(grassGeo);
    const grassMat = material('#8f9e63');
    grassMat.side = T.DoubleSide;
    const gc = this.low ? 4000 : 9500;
    const grass = new T.InstancedMesh(grassGeo, grassMat, gc);
    for (let i = 0; i < gc; i++) {
      const z = rng() * (m.length + 80) - 20,
        x =
          roadX(m, z) +
          (rng() > 0.5 ? 1 : -1) * (6.5 + Math.pow(rng(), 2) * 35);
      obj.position.set(
        x,
        roadDistance(m, x, z) < 6.3 || (z > m.length - 18 && Math.abs(x) < 24)
          ? -200
          : heightAt(m, x, z),
        z,
      );
      obj.rotation.set(0, rng() * 6.28, 0);
      obj.scale.setScalar(0.6 + rng() * 0.95);
      obj.updateMatrix();
      grass.setMatrixAt(i, obj.matrix);
    }
    grass.receiveShadow = true;
    this.scene.add(grass);
    const rockGeo = new T.IcosahedronGeometry(1, 0);
    geometries.add(rockGeo);
    const rocks = new T.InstancedMesh(rockGeo, material('#797b60'), 300);
    for (let i = 0; i < 300; i++) {
      const z = rng() * m.length,
        x = roadX(m, z) + (rng() > 0.5 ? 1 : -1) * (9 + rng() * 100);
      obj.position.set(x, heightAt(m, x, z) - 0.3, z);
      obj.rotation.set(rng(), rng(), rng());
      obj.scale.set(1 + rng() * 2, 0.5 + rng() * 2, 1 + rng() * 2);
      obj.updateMatrix();
      rocks.setMatrixAt(i, obj.matrix);
    }
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    this.scene.add(rocks);
    // Broad silhouettes extend the landscape beyond the playable road corridor.
    const mountain = material(m.night > 0.5 ? '#294959' : '#798e80');
    for (let i = 0; i < 28; i++) {
      const z = i * 70 - 100;
      const x = (i % 2 ? 1 : -1) * (230 + rng() * 150);
      const o = mesh(
        new T.SphereGeometry(1, 22, 12),
        mountain,
        nature,
        x,
        -17,
        z,
      );
      o.scale.set(100 + rng() * 110, 45 + rng() * 60, 110 + rng() * 100);
      o.rotation.y = rng() * 6;
    }
    this.scene.add(batch(nature));
  }
  private buildRoute(m: Mission) {
    const fixtures = new T.Group(),
      post = material('#d9d5b6'),
      black = material('#394c3f'),
      reflector = material('#f4da7d');
    reflector.emissive.set('#a99148');
    reflector.emissiveIntensity = 0.35;
    for (let z = 5; z < m.length; z += 18) {
      for (const side of [-1, 1]) {
        const x = roadX(m, z) + side * 6.4,
          y = heightAt(m, x, z);
        cylinder(fixtures, post, x, y + 0.45, z, 0.045, 0.05, 0.9, 5);
        box(fixtures, reflector, x, y + 0.8, z, 0.12, 0.18, 0.055);
      }
    }
    const sign = (z: number, text: string, side = 1) => {
      const x = roadX(m, z) + side * 7.3,
        y = heightAt(m, x, z);
      box(fixtures, black, x, y + 1, z, 0.09, 2, 0.09);
      const p = box(fixtures, label(text), x, y + 1.9, z, 4, 0.85, 0.08);
      p.rotation.y = Math.PI;
    };
    sign(35, 'CLINIC ↑');
    sign(m.fork[0] - 28, '← SHORT   /   FIRMER →');
    sign(m.length - 75, 'CLINIC 75 m ↑');
    if (m.bridge) sign(m.bridge[0] - 35, 'NARROW BRIDGE · SLOW');
    for (const [a] of m.mud) sign(a - 25, 'MUD · STEADY SPEED', -1);
    this.scene.add(batch(fixtures));
  }
  render(dt: number) {
    if (this.disposed) return;
    const e = this.engine,
      m = e.mission;
    this.clock += dt;
    const p = e.position,
      q = e.rotation;
    this.truck.root.position.set(p.x, p.y, p.z);
    this.truck.root.quaternion.set(q.x, q.y, q.z, q.w);
    for (let i = 0; i < 4; i++) {
      const wheel = this.truck.wheels[i];
      wheel.position.y = -(e.vehicle.wheelSuspensionLength(i) ?? 0.45);
      wheel.rotation.set(e.wheelSpin, i < 2 ? e.steering : 0, 0);
    }
    this.truck.tail.emissiveIntensity =
      e.phase === 'driving' && Math.abs(e.speed) < 2 ? 3 : 1.1;
    const restoring = e.phase === 'restoring' || e.phase === 'results';
    const t = restoring ? e.restoreTime : 0;
    this.truck.cargo.visible = t < 2;
    this.transferKit.visible = t >= 2 && t < 6;
    const transfer = smooth(2, 6, t);
    this.transferKit.position.set(
      T.MathUtils.lerp(p.x, -6, transfer),
      T.MathUtils.lerp(p.y - 0.7, roadY(m, m.length), transfer),
      T.MathUtils.lerp(p.z - 1.5, m.length + 16, transfer),
    );
    this.clinic.battery.visible = t > 3;
    this.clinic.roofPanels.visible = t > 11;
    this.clinic.panes.forEach((pane, i) => {
      const a = smooth(5 + i * 0.6, 7 + i * 0.6, t);
      const mat = pane.material as T.MeshStandardMaterial;
      mat.color.set(a > 0.1 ? '#f3ddac' : '#0a2325');
      mat.emissiveIntensity = a * 2.6;
    });
    this.clinic.lights[0].intensity = smooth(6, 9, t) * 90;
    this.clinic.lights[1].intensity = smooth(7, 10, t) * 65;
    this.clinic.fixture.emissiveIntensity = smooth(6, 9, t) * 2;
    this.clinic.glowMat.opacity = smooth(6, 10, t) * 0.15;
    for (let i = 0; i < this.people.length; i++) {
      const person = this.people[i];
      const walk = i < 2 && t > 0 && t < 6;
      const wave = t > 8 && (i === 3 || i === 4);
      if (walk) {
        const targetX = p.x + (i ? 1.5 : -1.5);
        person.group.position.x = T.MathUtils.lerp(
          targetX,
          i ? 6 : -3,
          smooth(2, 6, t),
        );
        person.group.position.z = T.MathUtils.lerp(
          p.z - 1,
          m.length + 13,
          smooth(2, 6, t),
        );
        person.group.position.y = heightAt(
          m,
          person.group.position.x,
          person.group.position.z,
        );
        person.limbs[2].rotation.x = Math.sin(t * 8) * 0.3;
        person.limbs[3].rotation.x = -Math.sin(t * 8) * 0.3;
        person.limbs[0].rotation.x = -0.9;
        person.limbs[1].rotation.x = -0.9;
      } else {
        person.limbs[0].rotation.z = wave
          ? -0.9 + Math.sin(this.clock * 4) * 0.3
          : 0.08;
        person.limbs[1].rotation.z = -0.08;
        person.limbs[2].rotation.x = person.limbs[3].rotation.x = 0;
      }
      person.group.rotation.y =
        t > 5
          ? Math.PI
          : Math.atan2(
              p.x - person.group.position.x,
              p.z - person.group.position.z,
            );
    }
    const heading = e.heading;
    const forward = new T.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const portrait = this.camera.aspect < 1;
    if (restoring) {
      const a = this.settings.reducedMotion ? 1 : smooth(0, 5, t);
      const targetEye = new T.Vector3(
        -18,
        roadY(m, m.length) + 10,
        m.length - 9,
      );
      this.eye
        .set(p.x - forward.x * 8, p.y + 4, p.z - forward.z * 8)
        .lerp(targetEye, a);
      this.aim.set(0, roadY(m, m.length) + 2.5, m.length + 17);
    } else {
      this.eye.set(
        p.x - forward.x * (portrait ? 10 : 9.5),
        p.y + (portrait ? 4.9 : 3.7),
        p.z - forward.z * (portrait ? 10 : 9.5),
      );
      const ground = heightAt(m, this.eye.x, this.eye.z);
      this.eye.y = Math.max(this.eye.y, ground + 1.8);
      this.aim.set(p.x + forward.x * 9, p.y + 0.6, p.z + forward.z * 9);
    }
    const lerp = this.camReady
      ? 1 -
        Math.exp(-Math.max(dt, 0.001) * (this.settings.reducedMotion ? 12 : 6))
      : 1;
    this.camera.position.lerp(this.eye, lerp);
    this.camera.lookAt(this.aim);
    this.camReady = true;
    this.sky.position.copy(this.camera.position);
    this.sun.position.set(p.x - 50, p.y + 75, p.z + 45);
    this.sun.target.position.set(p.x, p.y, p.z + 15);
    for (let i = 0; i < this.rainData.length; i += 6) {
      const a = i / 6;
      const x = p.x + Math.sin(a * 78.23) * 24;
      const z = p.z + Math.cos(a * 14.23) * 25;
      const y = p.y + ((((a * 0.77 - this.clock * 15) % 20) + 20) % 20);
      this.rainData.set([x, y, z, x - 0.13, y - 0.9, z + 0.04], i);
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    this.rain.visible = m.rain > 0;
    (this.rain.material as T.LineBasicMaterial).opacity =
      m.rain * (0.12 + 0.18 * smooth(0, m.length * 0.55, e.progress));
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i] -= dt;
      const k = i * 3;
      if (
        this.particles[i] <= 0 &&
        Math.abs(e.speed) > 2 &&
        e.phase === 'driving'
      ) {
        this.particles[i] = 0.5 + Math.random() * 0.6;
        this.dustData[k] = p.x - forward.x * 1.5 + (Math.random() - 0.5) * 1.9;
        this.dustData[k + 1] = p.y - 0.5;
        this.dustData[k + 2] = p.z - forward.z * 1.5;
      } else {
        this.dustData[k] += Math.sin(i) * 0.8 * dt;
        this.dustData[k + 1] += dt * 0.6;
        if (this.particles[i] <= 0) this.dustData[k + 1] = -100;
      }
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    if (this.settings.quality === 'auto' && dt > 0 && dt < 0.2) {
      this.frameSamples.push(dt);
      this.adaptTimer += dt;
      if (this.adaptTimer > 5) {
        const mean =
          this.frameSamples.reduce((a, b) => a + b, 0) /
          this.frameSamples.length;
        if (mean > 0.024 && this.renderer.getPixelRatio() > 0.85)
          this.renderer.setPixelRatio(
            Math.max(0.85, this.renderer.getPixelRatio() - 0.2),
          );
        this.frameSamples = [];
        this.adaptTimer = 0;
      }
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.renderer.dispose();
    disposeArt();
    this.scene.clear();
  }
}
