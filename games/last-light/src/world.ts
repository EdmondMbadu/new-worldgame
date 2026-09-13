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
  rutDepthAt,
  type Mission,
} from './missions';
import type { Settings } from './save';
import { canopyTexture, grassGeometry } from './foliage';
import { surfaceTexture, environmentTexture } from './surfaces';
import { LivingWorld, windMaterial } from './living-world';
import { surfaceAt } from './vehicle';
import { branchSections } from './road-sections';
import { beamMode, nightProfile } from './night';
import { createStaff } from './staff';
import { clinicArchitecture } from './clinic-assets';

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
  private environmentTarget: T.WebGLRenderTarget | null = null;
  private living: LivingWorld;
  private windTime = { value: 0 };
  private chunks: { mesh: T.Object3D; start: number; end: number }[] = [];
  private water: T.Mesh | null = null;
  private staff: ReturnType<typeof createStaff>[] = [];
  private moonFill: T.HemisphereLight;
  private clinicWingGlow: T.MeshStandardMaterial[] = [];
  private speedFov = 56;
  private renderedPosition = new T.Vector3();
  private renderedRotation = new T.Quaternion();
  private groundNormal = new T.Vector3(0, 1, 0);
  private forward = new T.Vector3();
  private dustVelocity = new Float32Array(180 * 3);
  performance = { p95: 0, fps: 0, calls: 0, triangles: 0 };
  constructor(
    public canvas: HTMLCanvasElement,
    public engine: GameEngine,
    public settings: Settings,
  ) {
    const m = engine.mission;
    const night = nightProfile(m);
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
    this.renderer.toneMappingExposure = night.exposure;
    const environment = environmentTexture();
    if (environment) {
      const pmrem = new T.PMREMGenerator(this.renderer);
      this.environmentTarget = pmrem.fromEquirectangular(environment);
      this.scene.environment = this.environmentTarget.texture;
      this.scene.environmentIntensity = 0.11;
      pmrem.dispose();
    }
    this.scene.background = new T.Color(m.sky);
    this.scene.fog = new T.FogExp2(night.sky, night.fog);
    const hemi = new T.HemisphereLight(
      m.night > 0.5 ? '#8baec5' : '#e3e8d4',
      '#4b4830',
      night.fill,
    );
    this.moonFill = hemi;
    this.scene.add(hemi);
    this.sun.color.set(m.sun);
    this.sun.intensity = night.moon;
    this.sun.castShadow = false;
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
    const moonMat = new T.MeshBasicMaterial({ color: '#c4d8d8', fog: false });
    materials.add(moonMat);
    const moon = mesh(
      new T.SphereGeometry(4.8, 20, 12),
      moonMat,
      this.sky,
      -320,
      210,
      570,
    );
    moon.castShadow = false;
    const stars = new Float32Array(200 * 3),
      starRng = random(372);
    for (let i = 0; i < 200; i++) {
      const a = starRng() * Math.PI * 2,
        h = 0.12 + starRng() * 0.78;
      stars[i * 3] = Math.cos(a) * Math.sqrt(1 - h * h) * 690;
      stars[i * 3 + 1] = h * 690;
      stars[i * 3 + 2] = Math.sin(a) * Math.sqrt(1 - h * h) * 690;
    }
    const sg = new T.BufferGeometry();
    sg.setAttribute('position', new T.BufferAttribute(stars, 3));
    geometries.add(sg);
    const sm = new T.PointsMaterial({
      color: '#c4d8dc',
      size: 1.2,
      transparent: true,
      opacity: m.id === 0 ? 0.5 : 0.14,
      depthWrite: false,
      fog: false,
    });
    materials.add(sm);
    this.sky.add(new T.Points(sg, sm));
    this.buildTerrain(m);
    this.buildNature(m);
    this.buildRoute(m);
    this.living = new LivingWorld(m, engine.encounters, this.low);
    this.scene.add(this.living.group);
    this.truck = createTruck();
    this.scene.add(this.truck.root);
    for (const x of [-0.72, 0.72]) {
      const light = new T.SpotLight(
        '#fff0cc',
        145,
        night.beam,
        0.38,
        0.55,
        1.25,
      );
      light.position.set(x, 0.66, 2.3);
      light.target.position.set(x, -0.5, 55);
      light.castShadow = x < 0;
      light.shadow.mapSize.set(this.low ? 512 : 1024, this.low ? 512 : 1024);
      light.shadow.camera.near = 0.3;
      light.shadow.camera.far = night.beam;
      light.shadow.bias = -0.0003;
      light.shadow.normalBias = 0.035;
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
    const architecture = clinicArchitecture(m.id);
    this.clinic.root.add(architecture.root);
    this.clinicWingGlow = architecture.glow;
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
      const actor = createStaff(
        [
          '#b7d4c6',
          '#507d83',
          '#d1ba8c',
          '#7098a0',
          '#b78259',
          '#d6bc82',
          '#c4cbc2',
        ][i],
        i % 2 ? '#61412c' : '#7b5239',
        i === 5 ? 0.76 : 1,
      );
      this.staff.push(actor);
      if (actor) this.scene.add(actor.group);
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
    const sprayCanvas = document.createElement('canvas');
    sprayCanvas.width = sprayCanvas.height = 32;
    const sprayContext = sprayCanvas.getContext('2d')!;
    const sprayFade = sprayContext.createRadialGradient(16, 16, 0, 16, 16, 16);
    sprayFade.addColorStop(0, 'rgba(255,255,255,0.75)');
    sprayFade.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    sprayFade.addColorStop(1, 'rgba(255,255,255,0)');
    sprayContext.fillStyle = sprayFade;
    sprayContext.fillRect(0, 0, 32, 32);
    const sprayTexture = new T.CanvasTexture(sprayCanvas);
    textures.add(sprayTexture);
    const dm = new T.PointsMaterial({
      map: sprayTexture,
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
    this.speedFov = this.camera.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }
  private makeSky(m: Mission) {
    const env = environmentTexture();
    if (env) {
      const mat = new T.MeshBasicMaterial({
        map: env,
        side: T.BackSide,
        depthWrite: false,
        color: new T.Color(
          m.night > 0.5 ? '#405a71' : '#ced6d0',
        ).multiplyScalar(m.night > 0.5 ? 0.1 : 0.65),
      });
      materials.add(mat);
      const g = new T.SphereGeometry(760, 48, 24);
      geometries.add(g);
      return new T.Mesh(g, mat);
    }
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
      const c = new T.Color(d < 7 ? '#9c9973' : '#789760').multiplyScalar(v);
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
    this.addTerrainChunks(geometry, mat, data.cols, data.rows);
    for (const section of [
      { from: -30, to: m.length + 12, alt: false },
      ...branchSections(m).map(([from, to]) => ({ from, to, alt: true })),
    ]) {
      const alt = section.alt;
      const geo = new T.BufferGeometry(),
        p: number[] = [],
        u: number[] = [],
        colors: number[] = [],
        wet: number[] = [],
        idx: number[] = [];
      const start = section.from,
        end = section.to;
      for (let z = start, j = 0; z <= end; z += 1, j++) {
        const width =
          onBridge(m, z) && !alt
            ? 2.5
            : 4.8 + Math.sin(z * 0.047) * 0.32 + Math.sin(z * 0.18) * 0.1;
        for (let i = 0; i < 25; i++) {
          const x = routeX(m, z, alt) + ((i / 24) * 2 - 1) * width;
          p.push(x, heightAt(m, x, z) + 0.055, z);
          u.push((x - roadX(m, z)) * 0.5, z * 0.5);
          const muddy = isMud(m, x, z),
            depth = rutDepthAt(m, x, z);
          const track = Math.exp(
            -Math.pow((Math.abs(x - routeX(m, z, alt)) - 1.1) / 0.65, 2),
          );
          const color = new T.Color(
            muddy ? '#73674e' : '#c5b995',
          ).multiplyScalar(1 - depth * 1.7 - track * 0.08);
          colors.push(color.r, color.g, color.b);
          wet.push(surfaceAt(m, x, z).wet);
          if (i < 24 && z + 1 <= end) {
            const a = j * 25 + i;
            idx.push(a, a + 25, a + 1, a + 1, a + 25, a + 26);
          }
        }
      }
      geo.setAttribute('position', new T.Float32BufferAttribute(p, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(u, 2));
      geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      geo.setAttribute('wetness', new T.Float32BufferAttribute(wet, 1));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const dirt = material('#ffffff', 0.96);
      dirt.vertexColors = true;
      dirt.map = surfaceTexture('road-color') || texture('earth');
      dirt.normalMap = surfaceTexture('road-normal') || null;
      dirt.normalScale.set(0.55, 0.55);
      dirt.roughnessMap = surfaceTexture('road-arm') || null;
      if (dirt.roughnessMap) textures.add(dirt.roughnessMap);
      dirt.onBeforeCompile = (shader) => {
        shader.vertexShader =
          'attribute float wetness; varying float vWet;\n' +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvWet=wetness;',
        );
        shader.fragmentShader = 'varying float vWet;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.26,vWet*.65);',
        );
      };
      dirt.customProgramCacheKey = () => 'wet-road';
      textures.add(dirt.map);
      if (dirt.normalMap) textures.add(dirt.normalMap);
      this.addTerrainChunks(geo, dirt, 25, Math.floor(end - start));
    }
    const patches = new T.Group(),
      mud = material('#574330', 0.24),
      rut = material('#332b23', 0.95);
    // Small puddles occupy real depressions; the road itself supplies the muddy surface.
    for (const o of this.engine.obstacles)
      if (o.kind === 'rut' && m.rain > 0.1) {
        const puddle = mesh(
          new T.CircleGeometry(o.radius * 0.58, 20),
          mud,
          patches,
          o.x,
          heightAt(m, o.x, o.z) + 0.065,
          o.z,
        );
        puddle.rotation.x = -Math.PI / 2;
        puddle.scale.y = 1.65;
        puddle.castShadow = false;
      }
    for (const o of this.engine.obstacles) {
      if (o.kind === 'rut') {
        continue;
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
      this.water = river;
      water.normalMap = surfaceTexture('road-normal') || null;
      if (water.normalMap) {
        water.normalMap.repeat.set(30, 4);
        textures.add(water.normalMap);
      }
      water.normalScale.set(0.13, 0.13);
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
  private addTerrainChunks(
    geometry: T.BufferGeometry,
    mat: T.Material,
    cols: number,
    rows: number,
  ) {
    const original = geometry.index!.array;
    for (let first = 0; first < rows; first += 160) {
      const last = Math.min(rows, first + 160),
        base = first * cols,
        g = new T.BufferGeometry();
      for (const [name, attr] of Object.entries(geometry.attributes)) {
        const a = attr as T.BufferAttribute;
        g.setAttribute(
          name,
          new T.BufferAttribute(
            a.array.slice(base * a.itemSize, (last + 1) * cols * a.itemSize),
            a.itemSize,
          ),
        );
      }
      const count = (last - first) * (cols - 1) * 6,
        offset = first * (cols - 1) * 6;
      g.setIndex(
        Array.from(
          original.slice(offset, offset + count),
          (x) => Number(x) - base,
        ),
      );
      g.computeBoundingSphere();
      const o = mesh(g, mat, this.scene);
      o.castShadow = true;
      const pos = g.attributes.position;
      this.chunks.push({
        mesh: o,
        start: pos.getZ(0),
        end: pos.getZ(pos.count - 1),
      });
    }
    geometry.dispose();
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
      windMaterial(mat, this.windTime, 0.06 + m.rain * 0.035);
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
    windMaterial(grassMat, this.windTime, 0.12);
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
    const rockGeo = new T.IcosahedronGeometry(1, 2);
    const rp = rockGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) {
      const x = rp.getX(i),
        y = rp.getY(i),
        z = rp.getZ(i),
        n = 1 + Math.sin(x * 9 + z * 4) * Math.sin(y * 7) * 0.15;
      rp.setXYZ(i, x * n, y * n, z * n);
    }
    rockGeo.computeVertexNormals();
    geometries.add(rockGeo);
    const rockMat = material('#858978');
    rockMat.map = surfaceTexture('ground-color') || null;
    rockMat.normalMap = surfaceTexture('ground-normal') || null;
    rockMat.normalScale.set(0.3, 0.3);
    if (rockMat.map) textures.add(rockMat.map);
    if (rockMat.normalMap) textures.add(rockMat.normalMap);
    const rocks = new T.InstancedMesh(rockGeo, rockMat, 230);
    for (let i = 0; i < 230; i++) {
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
    const pebbleGeo = new T.IcosahedronGeometry(1, 0);
    geometries.add(pebbleGeo);
    const pebbles = new T.InstancedMesh(
      pebbleGeo,
      rockMat,
      this.low ? 600 : 1500,
    );
    for (let i = 0; i < pebbles.count; i++) {
      const z = rng() * m.length,
        x = roadX(m, z) + (rng() - 0.5) * 8.8;
      obj.position.set(x, heightAt(m, x, z) + 0.075, z);
      obj.rotation.set(rng(), rng() * 6, rng());
      obj.scale.set(
        0.025 + rng() * 0.055,
        0.018 + rng() * 0.035,
        0.035 + rng() * 0.045,
      );
      obj.updateMatrix();
      pebbles.setMatrixAt(i, obj.matrix);
    }
    pebbles.receiveShadow = true;
    this.scene.add(pebbles);
    // Broad silhouettes extend the landscape beyond the playable road corridor.
    const mountain = material(m.night > 0.5 ? '#263d46' : '#465f59');
    for (let i = 0; i < 18; i++) {
      const z = i * 100 - 100;
      const x = (i % 2 ? 1 : -1) * (330 + rng() * 160);
      const o = mesh(
        new T.SphereGeometry(1, 22, 12),
        mountain,
        nature,
        x,
        -17,
        z,
      );
      const points = o.geometry.attributes.position;
      for (let j = 0; j < points.count; j++) {
        const x = points.getX(j),
          y = points.getY(j),
          z = points.getZ(j),
          f = 1 + 0.06 * Math.sin(x * 8 + z * 7) * Math.sin(y * 6);
        points.setXYZ(j, x * f, y * f, z * f);
      }
      o.geometry.computeVertexNormals();
      o.scale.set(100 + rng() * 100, 40 + rng() * 50, 110 + rng() * 80);
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
    for (const [a] of branchSections(m))
      sign(a - 20, '← FIRMER DETOUR   /   SHORT →');
    sign(m.length - 75, 'CLINIC 75 m ↑');
    if (m.bridge) sign(m.bridge[0] - 35, 'NARROW BRIDGE · SLOW');
    for (const [a] of m.mud) sign(a - 25, 'MUD · STEADY SPEED', -1);
    this.scene.add(batch(fixtures));
  }
  render(dt: number, frameDelta = dt) {
    if (this.disposed) return;
    const e = this.engine,
      m = e.mission;
    this.clock += dt;
    const alpha = e.phase === 'driving' ? e.interpolation : 1;
    this.renderedPosition
      .set(e.previousPosition.x, e.previousPosition.y, e.previousPosition.z)
      .lerp(new T.Vector3(e.position.x, e.position.y, e.position.z), alpha);
    this.renderedRotation
      .set(
        e.previousRotation.x,
        e.previousRotation.y,
        e.previousRotation.z,
        e.previousRotation.w,
      )
      .slerp(
        new T.Quaternion(
          e.rotation.x,
          e.rotation.y,
          e.rotation.z,
          e.rotation.w,
        ),
        alpha,
      );
    const p = this.renderedPosition;
    this.truck.root.position.copy(p);
    this.truck.root.quaternion.copy(this.renderedRotation);
    this.windTime.value = this.clock;
    this.living.update(e, this.clock);
    for (const chunk of this.chunks)
      chunk.mesh.visible = chunk.end > p.z - 120 && chunk.start < p.z + 410;
    if (this.water) {
      const mat = this.water.material as T.MeshStandardMaterial;
      if (mat.normalMap) {
        mat.normalMap.offset.x = this.clock * 0.019;
        mat.normalMap.offset.y = this.clock * 0.008;
      }
    }
    const night = nightProfile(m);
    this.renderer.toneMappingExposure =
      night.exposure * (this.settings.brightness ?? 1);
    this.moonFill.intensity =
      night.fill * (this.settings.enhancedVisibility ? 1.7 : 1);
    const lightning =
      m.id === 4 &&
      !this.settings.reducedFlashes &&
      !this.settings.reducedMotion
        ? Math.pow(Math.max(0, Math.sin(this.clock * 0.27)), 90) * 0.45
        : 0;
    this.sun.intensity = night.moon + lightning;
    this.headlights.forEach((light, i) => {
      const high = beamMode(m, Math.abs(e.speed)) === 'HIGH BEAMS';
      light.angle = high ? 0.35 : 0.46;
      light.intensity = high ? 180 : 145;
      light.target.position.set(
        (i === 0 ? -0.72 : 0.72) + e.steering * 8,
        -0.5,
        55,
      );
    });
    this.sky.rotation.y = this.clock * 0.0007;
    for (let i = 0; i < 4; i++) {
      const wheel = this.truck.wheels[i];
      wheel.position.y = -(e.vehicle.wheelSuspensionLength(i) ?? 0.45);
      wheel.rotation.y = i < 2 ? e.steering : 0;
      this.truck.tires[i].rotation.x = e.wheelSpin;
    }
    this.truck.tail.emissiveIntensity = e.braking > 0.1 ? 3.5 : 0.7;
    for (const wiper of this.truck.wipers)
      wiper.rotation.z =
        m.rain > 0.2 ? Math.sin(this.clock * 4.5) * 0.72 : 0.65;
    this.truck.cargo.rotation.z =
      Math.sin(this.clock * 21) * e.roadPulse * 0.012;
    this.truck.cargo.position.y =
      e.roadPulse * Math.sin(this.clock * 25) * 0.008;
    const restoring = e.phase === 'restoring' || e.phase === 'results';
    const t = restoring ? e.restoreTime : 0;
    this.truck.tailgate.rotation.x = (-smooth(0.3, 2.5, t) * Math.PI) / 2;
    this.truck.cargo.visible = t < 3;
    const transfer = smooth(3, 8, t),
      ground = roadY(m, m.length);
    const kitX = T.MathUtils.lerp(p.x, -6, transfer),
      kitZ = T.MathUtils.lerp(p.z - 1.57, m.length + 16, transfer);
    this.transferKit.visible = t >= 3 && t < 8.5;
    this.transferKit.position.set(kitX, heightAt(m, kitX, kitZ), kitZ);
    this.clinic.battery.visible = t >= 8;
    // The installed array belongs to the later completed-clinic view, after the battery handover.
    this.clinic.roofPanels.visible = e.phase === 'results';
    this.clinic.panes.forEach((pane, i) => {
      const a = smooth(8.3 + i * 0.65, 9.3 + i * 0.65, t),
        mat = pane.material as T.MeshStandardMaterial;
      mat.color.set(a > 0 ? '#899c82' : '#102223');
      mat.emissiveIntensity = a * 0.025;
      mat.opacity = 0.13;
    });
    this.clinic.interiorLights.forEach(
      (light, i) =>
        (light.intensity =
          smooth(8.2 + i * 0.7, 9 + i * 0.7, t) * (i === 2 ? 16 : 24)),
    );
    const power = smooth(8.3, 10.5, t);
    this.clinicWingGlow.forEach((mat, i) => {
      mat.emissiveIntensity = smooth(10.5 + i * 0.35, 12 + i * 0.35, t) * 0.7;
    });
    this.clinic.interiorMats.forEach((mat, i) => {
      mat.color
        .copy(this.clinic.interiorColors[i])
        .multiplyScalar(0.13 + power * 0.87);
      mat.emissive
        .copy(this.clinic.interiorColors[i])
        .multiplyScalar(power * 0.08);
    });
    this.clinic.screen.emissiveIntensity = power * 0.8;
    this.clinic.fan.rotation.y =
      t > 10 ? (t - 10) * Math.min(12, (t - 10) * 3) : 0;
    this.clinic.lights[0].intensity = smooth(10, 12, t) * 80;
    this.clinic.lights[1].intensity = smooth(10.8, 12.6, t) * 55;
    this.clinic.fixture.emissiveIntensity = smooth(10, 12, t) * 3;
    this.clinic.glowMat.opacity = smooth(10, 12.5, t) * 0.1;
    for (let i = 0; i < this.people.length; i++) {
      const person = this.people[i],
        receiver = i < 2;
      const baseX = (i % 2 ? 1 : -1) * (3.2 + Math.floor(i / 2) * 1.25),
        baseZ = m.length + 10 + (i % 3);
      let walking = 0;
      if (receiver && restoring && t < 8.5) {
        const reach = smooth(0, 3, t),
          carry = t >= 3;
        person.group.position.x = carry
          ? kitX + (i ? 1.05 : -1.05)
          : T.MathUtils.lerp(baseX, p.x + (i ? 1.05 : -1.05), reach);
        person.group.position.z = carry
          ? kitZ
          : T.MathUtils.lerp(m.length + 3, p.z - 1.57, reach);
        person.group.rotation.y = carry
          ? i
            ? -Math.PI / 2
            : Math.PI / 2
          : Math.atan2(
              p.x - person.group.position.x,
              p.z - 1.57 - person.group.position.z,
            );
        walking = t < 7.7 ? 0.28 : 0;
        for (let a = 0; a < 2; a++) {
          person.limbs[a].rotation.x = carry
            ? -0.85
            : Math.sin(t * 7 + a * Math.PI) * 0.22;
          person.limbs[a].rotation.z = 0;
          person.forearms[a].rotation.x = carry ? -0.95 : -0.2;
        }
      } else {
        person.group.position.x =
          receiver && t >= 8.5 ? -6 + (i ? 1.1 : -1.1) : baseX;
        person.group.position.z = receiver && t >= 8.5 ? m.length + 15 : baseZ;
        if (receiver && !restoring)
          person.group.position.z = T.MathUtils.lerp(
            baseZ,
            m.length + 3,
            smooth(m.length - 50, m.length - 8, e.progress),
          );
        person.group.rotation.y = restoring
          ? Math.PI
          : Math.atan2(
              p.x - person.group.position.x,
              p.z - person.group.position.z,
            );
        const wave = t > 11 && (i === 3 || i === 4);
        for (let a = 0; a < 2; a++) {
          person.limbs[a].rotation.x = 0;
          person.limbs[a].rotation.z =
            a === 0 && wave
              ? 1.7 + Math.sin(this.clock * 4) * 0.2
              : a
                ? -0.09
                : 0.09;
          person.forearms[a].rotation.x = wave ? -0.6 : -0.15;
        }
        if (i === 0 && t > 8 && t < 10.5) {
          person.group.rotation.y = Math.PI;
          person.limbs[0].rotation.x = -1.1;
          person.forearms[0].rotation.x = -0.7;
        }
        if (
          !restoring &&
          receiver &&
          e.progress > m.length - 50 &&
          e.progress < m.length - 8
        )
          walking = 0.15;
      }
      const gait = Math.sin(this.clock * 7 + i);
      person.limbs[2].rotation.x = gait * walking;
      person.limbs[3].rotation.x = -gait * walking;
      person.calves[0].rotation.x = Math.max(0, -gait) * walking * 1.6;
      person.calves[1].rotation.x = Math.max(0, gait) * walking * 1.6;
      person.head.rotation.y = Math.sin(this.clock * 0.6 + i) * 0.07;
      person.group.position.y =
        heightAt(m, person.group.position.x, person.group.position.z) +
        Math.abs(gait) * walking * 0.025;
      const actor = this.staff[i];
      person.group.visible = !actor && p.z > m.length - 180;
      if (actor) {
        actor.group.position.copy(person.group.position);
        actor.group.rotation.copy(person.group.rotation);
        actor.group.visible = p.z > m.length - 180;
        const mode =
          receiver && restoring && t >= 3 && t < 8.5
            ? 'carry'
            : walking > 0
              ? 'walk'
              : i === 0 && t > 8 && t < 10.5
                ? 'connect'
                : restoring && t > 11 && (i === 3 || i === 4)
                  ? 'wave'
                  : 'idle';
        actor.animate(mode, dt);
        if (mode === 'carry') {
          actor.group.updateMatrixWorld(true);
          const gripX = kitX + (i ? 0.79 : -0.79),
            gripY = this.transferKit.position.y + 1.18;
          actor.hold(
            new T.Vector3(gripX, gripY, kitZ + (i ? -0.26 : 0.26)),
            new T.Vector3(gripX, gripY, kitZ + (i ? 0.26 : -0.26)),
          );
        }
      }
    }
    const heading = e.heading;
    const forward = this.forward.set(Math.sin(heading), 0, Math.cos(heading));
    const speed = clamp(Math.abs(e.speed) / 22.2, 0, 1);
    const goalFov =
      (this.camera.aspect < 1 ? 65 : 56) +
      (this.settings.reducedMotion || restoring ? 0 : speed * 9);
    this.speedFov += (goalFov - this.speedFov) * (1 - Math.exp(-dt * 3));
    if (Math.abs(this.camera.fov - this.speedFov) > 0.03) {
      this.camera.fov = this.speedFov;
      this.camera.updateProjectionMatrix();
    }
    const portrait = this.camera.aspect < 1;
    if (restoring) {
      const a = this.settings.reducedMotion ? 1 : smooth(0, 5, t);
      const targetEye = new T.Vector3(
        portrait ? (m.id === 4 ? -25 : -20) : -21,
        roadY(m, m.length) + (portrait ? 13 : 11),
        m.length - (portrait ? (m.id === 4 ? 28 : 20) : 12),
      );
      this.eye
        .set(p.x - forward.x * 8, p.y + 4, p.z - forward.z * 8)
        .lerp(targetEye, a);
      this.aim.set(0, roadY(m, m.length) + 2.5, m.length + 17);
    } else {
      this.eye.set(
        p.x - forward.x * (portrait ? 9.6 : 8.2 + speed * 0.9),
        p.y + (portrait ? 4.3 : 2.85 + speed * 0.2),
        p.z - forward.z * (portrait ? 9.6 : 8.2 + speed * 0.9),
      );
      const ground = heightAt(m, this.eye.x, this.eye.z);
      this.eye.y = Math.max(this.eye.y, ground + 1.8);
      const lead = 10 + speed * 11;
      const turnX = routeX(m, Math.min(m.length, p.z + lead), e.isAlt);
      this.aim.set(
        T.MathUtils.lerp(p.x + forward.x * lead, turnX, 0.28),
        p.y + 0.7,
        p.z + forward.z * lead,
      );
      if (!this.settings.reducedMotion)
        this.eye.y +=
          Math.sin(this.clock * 24) *
          (e.roadPulse * 0.045 + e.impactPulse * 0.085);
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
    const wet =
      e.wheelSurfaces.reduce((n, s) => n + s.wet, 0) /
      Math.max(1, e.wheelSurfaces.length);
    const dustMat = this.dust.material as T.PointsMaterial;
    dustMat.color.set(wet > 0.45 ? '#68736d' : '#837253');
    dustMat.size = wet > 0.45 ? 0.09 : 0.22;
    dustMat.opacity = 0.12 + speed * 0.15;
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i] -= dt;
      const k = i * 3;
      if (
        this.particles[i] <= 0 &&
        Math.abs(e.speed) > 2 &&
        e.phase === 'driving'
      ) {
        this.particles[i] = 0.35 + Math.random() * (wet > 0.4 ? 0.45 : 1);
        const side = i % 2 ? 1 : -1;
        this.dustData[k] =
          p.x -
          forward.x * 1.3 +
          forward.z * side * 0.95 +
          (Math.random() - 0.5) * 0.24;
        this.dustData[k + 1] = p.y - 0.72;
        this.dustData[k + 2] =
          p.z -
          forward.z * 1.3 -
          forward.x * side * 0.95 +
          (Math.random() - 0.5) * 0.3;
        this.dustVelocity[k] =
          forward.z * side * (0.4 + speed * 2) - forward.x * speed;
        this.dustVelocity[k + 1] =
          wet > 0.4 ? 0.7 + Math.random() * speed * 2 : 0.35;
        this.dustVelocity[k + 2] =
          -forward.x * side * (0.4 + speed * 2) - forward.z * speed;
      } else {
        this.dustData[k] += this.dustVelocity[k] * dt;
        this.dustData[k + 1] += this.dustVelocity[k + 1] * dt;
        this.dustData[k + 2] += this.dustVelocity[k + 2] * dt;
        if (wet > 0.4) this.dustVelocity[k + 1] -= dt * 3;
        if (this.particles[i] <= 0) this.dustData[k + 1] = -100;
      }
    }
    this.dust.geometry.attributes.position.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    if (frameDelta > 0 && frameDelta < 0.5) {
      this.frameSamples.push(frameDelta);
      this.adaptTimer += frameDelta;
      if (this.adaptTimer > 5) {
        const mean =
          this.frameSamples.reduce((a, b) => a + b, 0) /
          this.frameSamples.length;
        const sorted = [...this.frameSamples].sort((a, b) => a - b);
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || mean;
        this.performance = {
          fps: 1 / mean,
          p95: p95 * 1000,
          calls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
        };
        if (
          this.settings.quality === 'auto' &&
          p95 > (this.low ? 0.04 : 0.025) &&
          this.renderer.getPixelRatio() > 0.75
        )
          this.renderer.setPixelRatio(
            Math.max(0.75, this.renderer.getPixelRatio() - 0.15),
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
    this.living.dispose();
    this.people.forEach((p) => p.skin.skeleton.dispose());
    this.staff.forEach((p) => p?.dispose());
    this.environmentTarget?.dispose();
    this.renderer.dispose();
    disposeArt();
    this.scene.clear();
  }
}
