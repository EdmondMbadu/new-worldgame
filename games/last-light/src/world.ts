import { bendStatic } from './route-art';
import { FrameHealth } from './frame-health';
import { TrafficArt } from './traffic-art';
import {
  ridgeAt,
  roadWidth,
  routePoint,
  stationAhead,
  toRoute,
  worldHeight,
} from './routes';
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
  texture,
  textures,
} from './art';
import {
  clamp,
  heightAt,
  isMud,
  onBridge,
  roadDistance,
  roadX,
  roadY,
  routeX,
  smooth,
  rutDepthAt,
  TERRAIN_OFFSETS,
  type Mission,
} from './missions';
import type { Settings } from './save';
import { surfaceTexture } from './surfaces';
import { LivingWorld } from './living-world';
import { surfaceAt } from './vehicle';
import { branchSections } from './road-sections';
import { beamMode, chapterLook, nightProfile } from './night';
import { createStaff } from './staff';
import { clinicArchitecture } from './clinic-assets';
import { atmosphereUniforms, atmospheric, skyMaterial, skyState, type SkyState } from './atmosphere';
import {
  boulderGeometry,
  foliageMaterial,
  grassClumpGeometry,
  hillCanopyGeometry,
  moundGeometry,
  paletteFor,
  speciesGeometry,
  SPECIES,
} from './biome';
import { LUSH, sceneryLayout, villageSites, worldPose, type Post } from './scenery-layout';
import { Birds, Fireflies, mistDecks, ridgelines, routeBounds, Smoke, valleyWater } from './landscape';
import { CameraRig } from './camera-rig';
import { PostFX } from './post';

type Chunk = { mesh: T.Object3D; start: number; end: number; ahead: number; behind: number };
type Knock = { index: number; t: number; vx: number; vz: number; spin: number };

export class GameWorld {
  renderer: T.WebGLRenderer;
  scene = new T.Scene();
  camera = new T.PerspectiveCamera(56, 1, 0.15, 3200);
  private storyCameraOffset = 0;
  private storyCameraOffsetY = 0;
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
  private sky: T.Mesh;
  private skyScene = new T.Scene();
  private moon: T.Mesh;
  private low = false;
  frames = new FrameHealth();
  private trafficArt: TrafficArt;
  private adaptTimer = 0;
  private particles: Float32Array;
  private disposed = false;
  private environmentTarget: T.WebGLRenderTarget | null = null;
  private envElevation = 999;
  private envTimer = 0;
  private living: LivingWorld;
  private windTime = { value: 0 };
  private chunks: Chunk[] = [];
  private water: T.Mesh | null = null;
  private staff: ReturnType<typeof createStaff>[] = [];
  private moonFill: T.HemisphereLight;
  private clinicWingGlow: T.MeshStandardMaterial[] = [];
  private speedFov = 56;
  private renderedPosition = new T.Vector3();
  private renderedRotation = new T.Quaternion();
  private forward = new T.Vector3();
  private dustVelocity = new Float32Array(260 * 3);
  private skyNow: SkyState;
  private rig = new CameraRig();
  private post: PostFX;
  private birds!: Birds;
  private fireflies!: Fireflies;
  private smoke!: Smoke;
  private dirtGround = { value: 0 };
  private posts: Post[] = [];
  private postMeshes: T.InstancedMesh[] = [];
  private postRest: T.Matrix4[] = [];
  private signGroups = new Map<number, T.Group>();
  private knocks: Knock[] = [];
  private seenKnocks = 0;
  private seenImpacts = 0;
  private seenContacts = 0;
  private burst = 0;
  private waterLevel = 0;
  private scratchColor = new T.Color();
  performance = { p95: 0, fps: 0, calls: 0, triangles: 0 };
  constructor(
    public canvas: HTMLCanvasElement,
    public engine: GameEngine,
    public settings: Settings,
  ) {
    const m = engine.mission;
    const night = nightProfile(m);
    const look = chapterLook(m);
    this.skyNow = skyState(m, 0);
    this.low =
      settings.quality === 'low' ||
      (settings.quality === 'auto' && matchMedia('(pointer:coarse)').matches);
    this.renderer = new T.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.low ? 1 : 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = this.skyNow.exposure;
    atmosphereUniforms.uCloud.value = look.cloud;
    atmosphereUniforms.uStorm.value = look.storm;
    atmosphereUniforms.uMist.value = look.mist;
    atmosphereUniforms.uHaze.value = look.haze;
    this.scene.fog = new T.FogExp2(this.skyNow.fog, 0.00135);
    this.moonFill = new T.HemisphereLight(this.skyNow.hemiSky, this.skyNow.hemiGround, this.skyNow.hemiIntensity);
    this.scene.add(this.moonFill);
    this.sun.castShadow = true;
    const shadow = this.low ? 1024 : 2048;
    this.sun.shadow.mapSize.set(shadow, shadow);
    this.sun.shadow.camera.left = -62;
    this.sun.shadow.camera.right = 62;
    this.sun.shadow.camera.top = 62;
    this.sun.shadow.camera.bottom = -62;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 420;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.06;
    this.scene.add(this.sun, this.sun.target);
    // The sky dome lives in its own scene too, so it can be baked into reflections.
    const skyMat = skyMaterial();
    materials.add(skyMat);
    const skyGeo = new T.SphereGeometry(2400, 48, 24);
    geometries.add(skyGeo);
    this.sky = new T.Mesh(skyGeo, skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    this.skyScene.add(new T.Mesh(skyGeo, skyMat));
    const moonMat = new T.MeshBasicMaterial({ color: '#e6eef2', fog: false, transparent: true });
    materials.add(moonMat);
    this.moon = mesh(new T.SphereGeometry(26, 20, 12), moonMat, this.sky, -0.45 * 2000, 0.72 * 2000, -0.55 * 2000);
    this.moon.castShadow = false;
    this.moon.receiveShadow = false;

    const staticStart = this.scene.children.length;
    this.buildTerrain(m);
    for (const object of this.scene.children.slice(staticStart))
      bendStatic(object, m);
    // Everything below is authored directly in world coordinates.
    this.buildRoute(m);
    this.buildNature(m);
    this.buildLandscape(m, look);
    this.living = new LivingWorld(m, engine.encounters, this.low);
    this.scene.add(this.living.group);
    this.trafficArt = new TrafficArt(engine.traffic, this.low, m.rain);
    this.scene.add(this.trafficArt.group);
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
    this.dirtTruck();
    this.post = new PostFX(this.renderer, this.scene, this.camera, !this.low);
    this.scene.traverse((o) => {
      const mat = (o as T.Mesh).material;
      if (Array.isArray(mat)) mat.forEach(atmospheric);
      else if (mat) atmospheric(mat);
    });
    this.applySky(0);
    this.updateEnvironment(true);
    if (import.meta.env.DEV) Object.assign(window as any, { __lastLight: this, __atm: atmospheric, __T: T });
    this.renderer.info.autoReset = false;
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
    if (this.storyCameraOffset !== 0 || this.storyCameraOffsetY !== 0)
      this.camera.setViewOffset(width, height, this.storyCameraOffset * width, this.storyCameraOffsetY * height, width, height);
    this.camera.fov = width < height ? 65 : 56;
    this.speedFov = this.camera.fov;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.post?.setSize(width, height);
  }
  /** Bake the current sky into image-based lighting and reflections. */
  private updateEnvironment(force = false) {
    const e = this.skyNow.elevation;
    if (!force && Math.abs(e - this.envElevation) < 2.2) return;
    this.envElevation = e;
    const pmrem = new T.PMREMGenerator(this.renderer);
    const target = pmrem.fromScene(this.skyScene, 0, 1, 3000);
    pmrem.dispose();
    this.environmentTarget?.dispose();
    this.environmentTarget = target;
    this.scene.environment = target.texture;
  }
  private applySky(progress: number) {
    const m = this.engine.mission;
    const s = skyState(m, progress, this.skyNow);
    const u = atmosphereUniforms;
    u.uSunDir.value.copy(s.sunDir);
    u.uSunColor.value.copy(s.sunColor);
    u.uZenith.value.copy(s.zenith);
    u.uHorizon.value.copy(s.horizon);
    u.uDark.value = s.darkness;
    (this.scene.fog as T.FogExp2).color.copy(s.fog);
    this.sun.color.copy(s.lightColor);
    this.moonFill.color.copy(s.hemiSky);
    this.moonFill.groundColor.copy(s.hemiGround);
    this.scene.environmentIntensity = 0.55 * (1 - s.darkness * 0.75);
    (this.moon.material as T.MeshBasicMaterial).opacity = smooth(0.3, 0.8, s.darkness);
    this.moon.visible = s.darkness > 0.3;
    return s;
  }
  private dirtTruck() {
    // Red laterite dust climbs the lower body: the truck belongs to this road.
    const ground = this.dirtGround;
    const dusted = new Set<T.Material>();
    this.truck.root.traverse((o) => {
      const mat = (o as T.Mesh).material as T.MeshStandardMaterial | undefined;
      if (!mat || Array.isArray(mat) || !mat.isMeshStandardMaterial || dusted.has(mat)) return;
      if (mat.transparent || (mat as any).map) return;
      dusted.add(mat);
      const previous = mat.onBeforeCompile;
      const key = mat.hasOwnProperty('customProgramCacheKey')
        ? mat.customProgramCacheKey.call(mat)
        : previous.toString();
      mat.onBeforeCompile = (shader, r) => {
        previous.call(mat, shader, r);
        shader.uniforms.uDirtGround = ground;
        shader.vertexShader =
          'varying float vDirtY;\n' +
          shader.vertexShader.replace(
            '#include <project_vertex>',
            '#include <project_vertex>\nvDirtY = (modelMatrix * vec4(transformed, 1.0)).y;',
          );
        shader.fragmentShader =
          'uniform float uDirtGround; varying float vDirtY;\n' +
          shader.fragmentShader.replace(
            '#include <color_fragment>',
            `#include <color_fragment>
            float dirtH = vDirtY - uDirtGround;
            float dirt = smoothstep(1.05, 0.15, dirtH) * (0.55 + 0.45 * sin(vDirtY * 23.0 + dirtH * 7.0) * 0.5 + 0.2);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.36, 0.14, 0.06), clamp(dirt, 0., 0.7));`,
          );
      };
      mat.customProgramCacheKey = () => key + '|dirt';
    });
  }
  private terrainColor(
    m: Mission,
    lx: number,
    lz: number,
    y: number,
    normalY: number,
    out: T.Color,
  ) {
    const lush = LUSH[m.id] ?? 0.5;
    const d = roadDistance(m, lx, lz);
    const width = roadWidth(m, lz);
    const n1 = valueNoise(lx * 0.018, lz * 0.018) * 2 - 1;
    const n2 = (valueNoise(lx * 0.11 + 31, lz * 0.11) * 0.6 + valueNoise(lx * 0.37, lz * 0.37 + 7) * 0.4) * 2 - 1;
    const dry = this.scratchColor.set('#b39a58');
    const green = new T.Color('#5c7a30').lerp(new T.Color('#3e6926'), lush);
    out.copy(dry).lerp(green, clamp(0.25 + lush * 0.75 + n1 * 0.35, 0, 1));
    // Laterite shoulders and bare patches.
    const earth = new T.Color('#9b4f2d');
    const verge = 1 - smooth(width + 0.4, width + 4.5 + n2 * 1.5, d);
    const bare = smooth(0.45, 0.85, n2 * 0.5 + 0.5) * 0.45 * (1 - lush * 0.6);
    out.lerp(earth, clamp(verge * 0.92 + bare, 0, 1));
    // Steep faces expose earth; the ridge's abyss is rock.
    const slope = 1 - normalY;
    const cliff = ridgeAt(m, lz) > 0.2 && y < roadY(m, lz) - 3;
    out.lerp(new T.Color(cliff ? '#6f675c' : '#8e4a2b'), smooth(0.28, 0.62, slope) * (cliff ? 0.95 : 0.75));
    // Wet mud where the mission says so.
    if (isMud(m, lx, lz)) out.lerp(new T.Color('#5a2f1c'), 0.5 * (1 - smooth(5, 9, Math.abs(lx - roadX(m, lz)))));
    out.multiplyScalar(0.88 + n2 * 0.08);
    return out;
  }
  private detailShader(mat: T.MeshStandardMaterial, key: string, extra?: (shader: any) => void) {
    // The photo textures supply only luminance detail; hue comes from our palette.
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 detailA = texture2D(map, vMapUv);
          vec4 detailB = texture2D(map, vMapUv * 0.23 + vec2(0.37, 0.11));
          float lumA = dot(detailA.rgb, vec3(0.299, 0.587, 0.114));
          float lumB = dot(detailB.rgb, vec3(0.299, 0.587, 0.114));
          float detail = clamp(mix(lumA, lumB, 0.45) / 0.115, 0.35, 2.2);
          diffuseColor.rgb *= mix(1.0, detail, 0.6);
        #endif`,
      );
      extra?.(shader);
    };
    mat.customProgramCacheKey = () => key;
  }
  private buildTerrain(m: Mission) {
    const full = this.engine.terrain;
    // The render mesh drops every other column away from the road (the road
    // mesh covers the centre). Kept vertices are identical to the collider's.
    const keep = TERRAIN_OFFSETS.map((o, i) => (Math.abs(o) <= 8 || i % 2 === 0 ? i : -1)).filter((i) => i >= 0);
    const cols = keep.length,
      rows = full.rows;
    const vertices = new Float32Array((rows + 1) * cols * 3);
    const indices: number[] = [];
    for (let j = 0; j <= rows; j++)
      keep.forEach((c, k) => {
        const from = (j * full.cols + c) * 3;
        vertices.set(full.vertices.subarray(from, from + 3), (j * cols + k) * 3);
        if (k < cols - 1 && j < rows) {
          const a = j * cols + k;
          indices.push(a, a + cols, a + 1, a + 1, a + cols, a + cols + 1);
        }
      });
    const data = { vertices, indices: new Uint32Array(indices), cols, rows };
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      'position',
      new T.BufferAttribute(data.vertices, 3),
    );
    geometry.setIndex(new T.BufferAttribute(data.indices, 1));
    geometry.computeVertexNormals();
    const count = data.vertices.length / 3;
    const uv = new Float32Array(count * 2),
      colors = new Float32Array(count * 3);
    const normals = geometry.attributes.normal;
    const c = new T.Color();
    const heights: number[] = [];
    for (let i = 0; i < count; i++) {
      const x = data.vertices[i * 3],
        y = data.vertices[i * 3 + 1],
        z = data.vertices[i * 3 + 2];
      uv[i * 2] = x * 0.07;
      uv[i * 2 + 1] = z * 0.07;
      const logical = toRoute(m, x, z);
      this.terrainColor(m, logical.x, logical.z, y, normals.getY(i), c);
      colors.set([c.r, c.g, c.b], i * 3);
      if (i % 7 === 0) heights.push(y);
    }
    heights.sort((a, b) => a - b);
    let minRoad = Infinity;
    for (let s = -40; s < m.length + 40; s += 5) minRoad = Math.min(minRoad, roadY(m, s));
    this.waterLevel = Math.min(heights[Math.floor(heights.length * 0.07)] + 2, minRoad - 14);
    geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
    const mat = material('#ffffff', 0.95);
    mat.map = surfaceTexture('ground-color') || texture('grass');
    mat.normalMap = surfaceTexture('ground-normal') || null;
    mat.normalScale.set(0.6, 0.6);
    textures.add(mat.map);
    if (mat.normalMap) textures.add(mat.normalMap);
    mat.vertexColors = true;
    this.detailShader(mat, 'terrain-detail');
    this.addTerrainChunks(geometry, mat, data.cols, data.rows, true);
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
      const laterite = new T.Color('#b0603a'),
        packed = new T.Color('#8c4629'),
        crown = new T.Color('#bf7449'),
        mud = new T.Color('#633420');
      for (let z = start, j = 0; z <= end; z += 1, j++) {
        const width =
          onBridge(m, z) && !alt ? 2.5 : alt ? 4.8 : roadWidth(m, z);
        for (let i = 0; i < 25; i++) {
          const across = (i / 24) * 2 - 1;
          const x = routeX(m, z, alt) + across * width;
          p.push(x, heightAt(m, x, z) + 0.055, z);
          u.push((x - roadX(m, z)) * 0.5, z * 0.5);
          const muddy = isMud(m, x, z),
            depth = rutDepthAt(m, x, z);
          const track = Math.exp(
            -Math.pow((Math.abs(x - routeX(m, z, alt)) - 1.1) / 0.55, 2),
          );
          const edge = smooth(0.78, 1, Math.abs(across));
          const color = c
            .copy(laterite)
            .lerp(crown, (1 - Math.abs(across)) * 0.35)
            .lerp(packed, track * 0.55)
            .lerp(mud, muddy ? 0.65 : 0)
            .lerp(new T.Color('#8a6a3a'), edge * 0.35)
            .multiplyScalar(1 - depth * 1.6);
          colors.push(color.r, color.g, color.b);
          wet.push(Math.max(surfaceAt(m, x, z).wet, depth > 0.05 ? 0.6 : 0));
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
      const dirt = material('#ffffff', 0.92);
      dirt.vertexColors = true;
      dirt.map = surfaceTexture('road-color') || texture('earth');
      dirt.normalMap = surfaceTexture('road-normal') || null;
      dirt.normalScale.set(0.7, 0.7);
      dirt.envMapIntensity = 0.85;
      this.detailShader(dirt, 'laterite-road', (shader) => {
        shader.vertexShader =
          'attribute float wetness; varying float vWet; varying vec2 vRoadXZ;\n' +
          shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvWet = wetness; vRoadXZ = position.xz;',
          );
        shader.fragmentShader =
          `varying float vWet; varying vec2 vRoadXZ;
          float rh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float rn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.-2.*f);
            return mix(mix(rh(i), rh(i+vec2(1,0)), u.x), mix(rh(i+vec2(0,1)), rh(i+vec2(1,1)), u.x), u.y); }\n` +
          shader.fragmentShader
            .replace(
              '#include <roughnessmap_fragment>',
              `#include <roughnessmap_fragment>
              float puddleNoise = rn(vRoadXZ * 0.32) * 0.65 + rn(vRoadXZ * 1.1) * 0.35;
              float puddle = smoothstep(0.58, 0.66, puddleNoise) * smoothstep(0.3, 0.75, vWet);
              roughnessFactor = mix(roughnessFactor, 0.32, vWet * 0.55);
              roughnessFactor = mix(roughnessFactor, 0.07, puddle);
              diffuseColor.rgb *= 1.0 - vWet * 0.28 - puddle * 0.5;`,
            )
            .replace(
              '#include <normal_fragment_maps>',
              '#include <normal_fragment_maps>\nnormal = normalize(mix(normal, nonPerturbedNormal, puddle * 0.92));',
            );
      });
      textures.add(dirt.map);
      if (dirt.normalMap) textures.add(dirt.normalMap);
      this.addTerrainChunks(geo, dirt, 25, Math.floor(end - start));
    }
    const patches = new T.Group(),
      puddleMat = material('#3a2216', 0.05);
    puddleMat.envMapIntensity = 1.4;
    // Small puddles occupy real depressions and mirror the sky.
    for (const o of this.engine.obstacles)
      if (o.kind === 'rut' && m.rain > 0.1) {
        const puddle = mesh(
          new T.CircleGeometry(o.radius * 0.58, 20),
          puddleMat,
          patches,
          o.x,
          heightAt(m, o.x, o.z) + 0.065,
          o.z,
        );
        puddle.rotation.x = -Math.PI / 2;
        puddle.scale.y = 1.65;
        puddle.castShadow = false;
      }
    const stone = material('#8d8474', 0.85);
    for (const o of this.engine.obstacles) {
      if (o.kind === 'rut') continue;
      else if (o.kind === 'rock') {
        const r = mesh(new T.IcosahedronGeometry(o.radius, 1), stone, patches, o.x, heightAt(m, o.x, o.z), o.z);
        r.scale.set(1, 0.8, 1.1);
      } else {
        const tree = cylinder(
          patches,
          material('#5a4533'),
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
      const water = material('#294a4a', 0.06, 0.1);
      water.envMapIntensity = 1.5;
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
      water.normalScale.set(0.16, 0.16);
      const bridge = new T.Group(),
        wood = material('#8a6e4c'),
        rail = material('#c9b48c');
      for (let z = m.bridge[0]; z <= m.bridge[1]; z += 1.4) {
        box(bridge, wood, roadX(m, z), roadY(m, z) + 0.11, z, 5, 0.18, 1.25);
        if (Math.round(z * 10) % 28 === 0)
          for (const side of [-1, 1])
            box(bridge, rail, roadX(m, z) + side * 2.4, roadY(m, z) + 0.8, z, 0.09, 1.6, 0.1);
      }
      for (const side of [-1, 1])
        for (let z = m.bridge[0] + 1.4; z < m.bridge[1] - 1.4; z += 2.8)
          box(bridge, rail, roadX(m, z) + side * 2.45, roadY(m, z) + 1.3, z, 0.09, 0.1, 2.85);
      this.scene.add(batch(bridge));
    }
  }
  private addTerrainChunks(
    geometry: T.BufferGeometry,
    mat: T.Material,
    cols: number,
    rows: number,
    worldCoordinates = false,
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
      o.userData.routeWorld = worldCoordinates;
      const pos = g.attributes.position;
      // Terrain stations come from the route; world z is not monotonic on the switchback.
      const a = pos.getZ(0),
        b = pos.getZ(pos.count - 1);
      this.chunks.push({
        mesh: o,
        start: worldCoordinates ? first - 60 : Math.min(a, b),
        end: worldCoordinates ? last - 60 : Math.max(a, b),
        ahead: 900,
        behind: 320,
      });
    }
    geometry.dispose();
  }
  private buildNature(m: Mission) {
    const layout = sceneryLayout(m);
    const lush = LUSH[m.id] ?? 0.5;
    const palette = paletteFor(lush);
    const detail = this.low ? 0 : 1;
    const treeMat = foliageMaterial(this.windTime, 0.09 + m.rain * 0.05, { double: true });
    const obj = new T.Object3D();
    const tint = new T.Color();
    const span = 180;
    const chunkOf = (z: number) => Math.floor((z + 60) / span);
    const chunkCount = chunkOf(m.length + 120) + 1;
    // Species meshes are split into route chunks so camera and shadow culling work.
    for (const kind of SPECIES) {
      const plants = layout.plants.filter((p) => p.kind === kind);
      if (!plants.length) continue;
      const geo = speciesGeometry(kind, detail, palette);
      for (let c = 0; c < chunkCount; c++) {
        const list = plants.filter((p) => chunkOf(p.z) === c);
        if (!list.length) continue;
        const inst = new T.InstancedMesh(geo, treeMat, list.length);
        list.forEach((p, i) => {
          const w = worldPose(m, p.x, p.z, p.yaw);
          obj.position.set(w.x, w.y - 0.05, w.z);
          obj.rotation.set((p.tint - 0.5) * 0.08, w.yaw, (p.tint - 0.5) * 0.06);
          obj.scale.setScalar(p.scale);
          obj.updateMatrix();
          inst.setMatrixAt(i, obj.matrix);
          inst.setColorAt(i, tint.setHSL(0.1 + p.tint * 0.05, 0.14, 0.5 + p.tint * 0.14).multiplyScalar(1.75));
        });
        inst.castShadow = true;
        inst.receiveShadow = true;
        inst.computeBoundingSphere();
        inst.userData.routeWorld = true;
        this.scene.add(inst);
        this.chunks.push({ mesh: inst, start: c * span - 60, end: (c + 1) * span - 60, ahead: 820, behind: 300 });
      }
    }
    // Forested hills: thousands of canopy clumps on the far slopes.
    const hill = hillCanopyGeometry(palette);
    const hillMat = foliageMaterial(this.windTime, 0.03);
    const hillCount = Math.round((this.low ? 1400 : 3200) * (0.45 + lush * 0.55));
    const hills = new T.InstancedMesh(hill, hillMat, hillCount);
    const rng = mulberry(m.seed * 7 + 3);
    let placed = 0;
    for (let i = 0; i < hillCount * 2 && placed < hillCount; i++) {
      const z = rng() * (m.length + 400) - 200;
      const side = rng() > 0.5 ? 1 : -1;
      const x = roadX(m, z) + side * (48 + Math.pow(rng(), 0.8) * 280);
      const y = heightAt(m, x, z);
      if (y < this.waterLevel + 1.5) continue;
      if (z > m.length - 40 && Math.abs(x) < 60) continue;
      const w = worldPose(m, x, z);
      const s = 2.2 + rng() * 2.8;
      obj.position.set(w.x, y + s * 0.45, w.z);
      obj.rotation.set(0, rng() * 6.28, 0);
      obj.scale.set(s * (1 + rng() * 0.6), s * (0.8 + rng() * 0.5), s * (1 + rng() * 0.6));
      obj.updateMatrix();
      hills.setMatrixAt(placed, obj.matrix);
      hills.setColorAt(placed, tint.setHSL(0.1 + rng() * 0.05, 0.16, 0.46 + rng() * 0.16).multiplyScalar(1.75));
      placed++;
    }
    hills.count = placed;
    hills.receiveShadow = true;
    hills.castShadow = false;
    hills.computeBoundingSphere();
    this.scene.add(hills);
    // Elephant grass and verge tufts.
    const lushTip = new T.Color('#d9c27a').lerp(new T.Color('#9bb24a'), lush);
    const clump = grassClumpGeometry(lush > 0.6 ? '#3f5a22' : '#5a5a2a', '#' + lushTip.getHexString());
    const grassMat = foliageMaterial(this.windTime, 0.18 + m.rain * 0.08, { double: true, grass: true });
    const grassCount = this.low ? 2200 : 5200;
    const grassChunks: T.Matrix4[][] = Array.from({ length: chunkCount }, () => []);
    for (let i = 0; i < grassCount; i++) {
      const z = rng() * (m.length + 100) - 30;
      const side = rng() > 0.5 ? 1 : -1;
      const near = rng() < 0.6;
      const x = roadX(m, z) + side * (roadWidth(m, z) + (near ? 1.2 + rng() * 5 : 6 + Math.pow(rng(), 1.6) * 45));
      if (roadDistance(m, x, z) < roadWidth(m, z) + 1 || (z > m.length - 22 && Math.abs(x) < 26)) continue;
      if (ridgeAt(m, z) > 0.1 && x < roadX(m, z)) continue;
      if (onBridge(m, z)) continue;
      const w = worldPose(m, x, z);
      const s = (near ? 0.55 : 0.8) + rng() * 0.8;
      obj.position.set(w.x, w.y - 0.05, w.z);
      obj.rotation.set((rng() - 0.5) * 0.2, rng() * 6.28, (rng() - 0.5) * 0.2);
      obj.scale.set(s, s * (0.8 + rng() * 0.5), s);
      obj.updateMatrix();
      const c = chunkOf(z);
      if (c >= 0 && c < chunkCount) grassChunks[c].push(obj.matrix.clone());
    }
    grassChunks.forEach((list, c) => {
      if (!list.length) return;
      const inst = new T.InstancedMesh(clump, grassMat, list.length);
      list.forEach((mtx, i) => inst.setMatrixAt(i, mtx));
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      this.scene.add(inst);
      this.chunks.push({ mesh: inst, start: c * span - 60, end: (c + 1) * span - 60, ahead: 420, behind: 160 });
    });
    // Granite kopjes and termite mounds.
    const rockGeo = boulderGeometry();
    const rockMat = foliageMaterial(this.windTime, 0);
    rockMat.roughness = 0.82;
    rockMat.map = surfaceTexture('ground-color') || null;
    if (rockMat.map) {
      rockMat.map.repeat.set(0.35, 0.35);
      textures.add(rockMat.map);
    }
    const rocks = new T.InstancedMesh(rockGeo, rockMat, Math.max(1, layout.boulders.length));
    layout.boulders.forEach((b, i) => {
      const w = worldPose(m, b.x, b.z, b.yaw);
      obj.position.set(w.x, w.y - b.sy * 0.25, w.z);
      obj.rotation.set(0, w.yaw, 0);
      obj.scale.set(b.sx, b.sy, b.sz);
      obj.updateMatrix();
      rocks.setMatrixAt(i, obj.matrix);
      rocks.setColorAt(i, tint.setHSL(0.07, 0.12, 0.55 + (i % 5) * 0.04).multiplyScalar(1.9));
    });
    rocks.count = layout.boulders.length;
    rocks.castShadow = true;
    rocks.receiveShadow = true;
    rocks.computeBoundingSphere();
    this.scene.add(rocks);
    if (layout.mounds.length) {
      const moundMat = foliageMaterial(this.windTime, 0);
      const mounds = new T.InstancedMesh(moundGeometry(), moundMat, layout.mounds.length);
      layout.mounds.forEach((d, i) => {
        const w = worldPose(m, d.x, d.z, d.yaw);
        obj.position.set(w.x, w.y, w.z);
        obj.rotation.set(0, w.yaw, 0);
        obj.scale.setScalar(d.scale);
        obj.updateMatrix();
        mounds.setMatrixAt(i, obj.matrix);
      });
      mounds.castShadow = true;
      mounds.receiveShadow = true;
      mounds.computeBoundingSphere();
      this.scene.add(mounds);
    }
    // Pebbles scattered on the road surface.
    const pebbleGeo = new T.IcosahedronGeometry(1, 0);
    geometries.add(pebbleGeo);
    const pebbleMat = material('#8a5a40', 0.9);
    const pebbles = new T.InstancedMesh(pebbleGeo, pebbleMat, this.low ? 600 : 1500);
    for (let i = 0; i < pebbles.count; i++) {
      const z = rng() * m.length,
        x = roadX(m, z) + (rng() - 0.5) * 8.8;
      const w = worldPose(m, x, z);
      obj.position.set(w.x, heightAt(m, x, z) + 0.075, w.z);
      obj.rotation.set(rng(), rng() * 6, rng());
      obj.scale.set(0.025 + rng() * 0.055, 0.018 + rng() * 0.035, 0.035 + rng() * 0.045);
      obj.updateMatrix();
      pebbles.setMatrixAt(i, obj.matrix);
    }
    pebbles.receiveShadow = true;
    pebbles.computeBoundingSphere();
    this.scene.add(pebbles);
  }
  private buildLandscape(m: Mission, look: ReturnType<typeof chapterLook>) {
    const bounds = routeBounds(m);
    this.scene.add(ridgelines(m, bounds, m.id >= 2));
    this.scene.add(valleyWater(this.waterLevel, bounds));
    this.scene.add(mistDecks(this.waterLevel, bounds, look.mist));
    this.birds = new Birds(this.low ? 9 : 17);
    this.scene.add(this.birds.mesh);
    this.fireflies = new Fireflies(this.low ? 60 : 140);
    this.scene.add(this.fireflies.points);
    const fires = villageSites(m).map((z, i) => {
      const x = roadX(m, z) + (i % 2 ? -1 : 1) * 19;
      const w = worldPose(m, x, z + 8);
      return new T.Vector3(w.x, w.y, w.z);
    });
    this.smoke = new Smoke(fires, this.low ? 8 : 16);
    this.scene.add(this.smoke.points);
    const ember = material('#ff9a4a', 0.6);
    ember.emissive.set('#ff7a2a');
    ember.emissiveIntensity = 3;
    const pit = material('#3b3029');
    for (const f of fires) {
      mesh(new T.CylinderGeometry(0.7, 0.8, 0.18, 10), pit, this.scene, f.x, f.y + 0.05, f.z);
      mesh(new T.IcosahedronGeometry(0.28, 0), ember, this.scene, f.x, f.y + 0.2, f.z);
    }
  }
  private buildRoute(m: Mission) {
    // Posts and signs are individually knockable; see `animateKnocks`.
    const layout = sceneryLayout(m);
    this.posts = layout.posts;
    const postGeo = new T.CylinderGeometry(0.045, 0.05, 0.9, 5);
    postGeo.translate(0, 0.45, 0);
    const reflectorGeo = new T.BoxGeometry(0.12, 0.18, 0.055);
    reflectorGeo.translate(0, 0.8, 0);
    geometries.add(postGeo);
    geometries.add(reflectorGeo);
    const postMat = material('#e6e1cc'),
      reflector = material('#f4da7d');
    reflector.emissive.set('#e0a640');
    reflector.emissiveIntensity = 0.6;
    const postList = this.posts.filter((p) => p.kind !== 'sign');
    const posts = new T.InstancedMesh(postGeo, postMat, postList.length);
    const lamps = new T.InstancedMesh(reflectorGeo, reflector, postList.length);
    const obj = new T.Object3D();
    let k = 0;
    this.posts.forEach((post, index) => {
      const w = worldPose(m, post.x, post.z, Math.PI);
      if (post.kind === 'sign') {
        const g = new T.Group();
        g.position.set(w.x, w.y, w.z);
        g.rotation.y = w.yaw;
        box(g, material('#3a3a30'), 0, 1, 0, 0.09, 2, 0.09);
        box(g, label(post.text!, '#f3ead2', '#2b4a3e'), 0, 1.9, 0, 4, 0.85, 0.08);
        g.userData.routeWorld = true;
        g.userData.postIndex = index;
        this.signGroups.set(index, g);
        this.scene.add(g);
        return;
      }
      const ridge = post.kind === 'ridge';
      obj.position.set(w.x, w.y, w.z);
      obj.rotation.set(0, w.yaw, 0);
      obj.scale.set(ridge ? 1.2 : 1, ridge ? 1.22 : 1, ridge ? 1.4 : 1);
      obj.updateMatrix();
      posts.setMatrixAt(k, obj.matrix);
      lamps.setMatrixAt(k, obj.matrix);
      this.postRest[index] = obj.matrix.clone();
      post.instance = k++;
      if (ridge && Math.round(post.z - 302) % 15 === 0) {
        const heading = Math.sin(
          Math.atan2(roadX(m, post.z + 8) - roadX(m, post.z), 8),
        );
        const g = new T.Group();
        g.position.set(w.x, w.y, w.z);
        g.rotation.y = w.yaw;
        box(g, label(heading > 0 ? '› ›' : '‹ ‹', '#ffdc82', '#263536', 256, 128), 0, 1.4, 0, 1.6, 0.65, 0.08);
        g.userData.routeWorld = true;
        this.signGroups.set(index, g);
        this.scene.add(g);
      }
    });
    for (const inst of [posts, lamps]) {
      inst.userData.routeWorld = true;
      inst.castShadow = true;
      inst.computeBoundingSphere();
      this.scene.add(inst);
      this.postMeshes.push(inst);
    }
  }
  private rumble(strength: number) {
    if (this.settings.reducedMotion || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    for (const pad of navigator.getGamepads()) {
      const actuator = (pad as any)?.vibrationActuator;
      actuator?.playEffect?.('dual-rumble', {
        duration: 90 + strength * 160,
        strongMagnitude: clamp(strength, 0.1, 1),
        weakMagnitude: clamp(strength * 0.6 + 0.2, 0.2, 1),
      })?.catch?.(() => {});
    }
  }
  /** Knocked posts and signs tumble away from the truck and come to rest. */
  private animateKnocks(dt: number) {
    const e = this.engine;
    while (this.seenKnocks < e.knocked.length) {
      const k = e.knocked[this.seenKnocks++];
      this.knocks.push({ index: k.index, t: 0, vx: k.vx, vz: k.vz, spin: (k.index % 2 ? 1 : -1) * (4 + (k.index % 5)) });
    }
    if (!this.knocks.length) return;
    const m = new T.Matrix4(),
      q = new T.Quaternion(),
      p = new T.Vector3(),
      s = new T.Vector3();
    let touched = false;
    for (const k of this.knocks) {
      if (k.t > 2.2) continue;
      k.t += dt;
      const t = Math.min(k.t, 1.1);
      const speed = Math.hypot(k.vx, k.vz) || 1;
      const push = Math.min(1.6, 0.35 + speed * 0.06);
      const dx = k.vx * push * t * 0.6,
        dz = k.vz * push * t * 0.6;
      const lift = Math.max(0, 2.2 * t - 4.9 * t * t) + 0;
      const fall = Math.min(Math.PI / 2, k.t * 3.2);
      const axis = new T.Vector3(k.vz, 0, -k.vx).normalize();
      const post = this.posts[k.index];
      const rest = this.postRest[k.index];
      if (rest && post.instance !== undefined) {
        rest.decompose(p, q, s);
        const turn = new T.Quaternion().setFromAxisAngle(axis, fall).multiply(q);
        const spin = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), k.spin * t * 0.3);
        m.compose(p.clone().add(new T.Vector3(dx, lift, dz)), spin.multiply(turn), s);
        for (const inst of this.postMeshes) inst.setMatrixAt(post.instance, m);
        touched = true;
      }
      const g = this.signGroups.get(k.index);
      if (g) {
        if (!g.userData.rest) g.userData.rest = { p: g.position.clone(), q: g.quaternion.clone() };
        const r = g.userData.rest as { p: T.Vector3; q: T.Quaternion };
        g.position.copy(r.p).add(new T.Vector3(dx, lift, dz));
        g.quaternion.setFromAxisAngle(axis, fall).multiply(r.q);
      }
    }
    if (touched) for (const inst of this.postMeshes) inst.instanceMatrix.needsUpdate = true;
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
    this.dirtGround.value = p.y - 0.95;
    this.windTime.value = this.clock;
    atmosphereUniforms.uTime.value = this.clock;
    this.living.update(e, this.clock);
    this.trafficArt.update(e, alpha, this.settings.reducedMotion);
    for (const chunk of this.chunks)
      chunk.mesh.visible =
        chunk.end > e.progress - chunk.behind && chunk.start < e.progress + chunk.ahead;
    if (this.water) {
      const mat = this.water.material as T.MeshStandardMaterial;
      if (mat.normalMap) {
        mat.normalMap.offset.x = this.clock * 0.019;
        mat.normalMap.offset.y = this.clock * 0.008;
      }
    }
    // Light: golden hour sliding into dusk as the clinic gets closer.
    const sky = this.applySky(e.progress);
    const brightness = this.settings.brightness ?? 1;
    this.renderer.toneMappingExposure = sky.exposure * brightness;
    const enhanced = this.settings.enhancedVisibility ? 1.6 : 1;
    this.moonFill.intensity = sky.hemiIntensity * (1 + (enhanced - 1) * sky.darkness);
    (this.scene.fog as T.FogExp2).density = 0.00072 * (1 + sky.darkness * 0.9) * (1 + m.rain * 0.7) * (m.id === 3 ? 1.5 : 1);
    atmosphereUniforms.uMist.value = chapterLook(m).mist * (0.45 + 0.55 * sky.darkness);
    atmosphereUniforms.uFogBase.value = p.y - 16;
    const lightning =
      m.id === 4 &&
      !this.settings.reducedFlashes &&
      !this.settings.reducedMotion
        ? Math.pow(Math.max(0, Math.sin(this.clock * 0.27)), 90) * sky.darkness
        : 0;
    atmosphereUniforms.uFlash.value = lightning;
    this.sun.intensity = sky.lightIntensity + lightning * 1.5;
    this.envTimer += dt;
    if (this.envTimer > 1) {
      this.envTimer = 0;
      this.updateEnvironment();
    }
    const night = nightProfile(m);
    const lampScale = 0.22 + 0.78 * sky.darkness;
    this.trafficArt.lightScale = lampScale;
    this.headlights.forEach((light, i) => {
      light.shadow.autoUpdate = sky.darkness > 0.15;
      const high = beamMode(m, Math.abs(e.speed)) === 'HIGH BEAMS';
      light.angle = high ? 0.35 : 0.46;
      light.distance = night.beam;
      light.intensity = (high ? 180 : 145) * lampScale;
      light.target.position.set(
        (i === 0 ? -0.72 : 0.72) + e.steering * 8,
        -0.5,
        55,
      );
    });
    this.sky.rotation.y = 0;
    this.animateKnocks(dt);
    this.birds.update(this.clock, p, sky.sunDir, sky.darkness < 0.75);
    this.fireflies.update(
      this.clock,
      p,
      (x, z) => worldHeight(m, x, z),
      smooth(0.45, 0.9, sky.darkness) * (m.rain > 0.5 ? 0.3 : 1),
    );
    this.smoke.update(dt, this.clock);
    // Contact feedback: every real knock shakes the operator, not only damage.
    if (e.impacts > this.seenImpacts) {
      this.seenImpacts = e.impacts;
      this.rig.addTrauma(0.55);
      this.rumble(1);
      this.burst = 1;
    }
    if (e.contactSerial > this.seenContacts) {
      this.seenContacts = e.contactSerial;
      this.rig.addTrauma(clamp(e.contactStrength, 0.08, 0.5));
      this.rumble(e.contactStrength);
      this.burst = Math.max(this.burst, e.contactStrength);
    }
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
    // Ease the final composition into the free side of the closing story panel.
    // The handover remains in the same scene and the player's truck stays visible.
    const closingFrame = restoring ? this.settings.reducedMotion ? 1 : smooth(14, 18, t) : 0;
    const offset = closingFrame * (portrait ? 0 : -0.22);
    const offsetY = closingFrame * (portrait ? .31 : 0);
    if (Math.abs(offset - this.storyCameraOffset) > .0005 || Math.abs(offsetY - this.storyCameraOffsetY) > .0005) {
      this.storyCameraOffset = offset;
      this.storyCameraOffsetY = offsetY;
      if (offset === 0 && offsetY === 0) this.camera.clearViewOffset();
      else this.camera.setViewOffset(1000 * this.camera.aspect, 1000, offset * 1000 * this.camera.aspect, offsetY * 1000, 1000 * this.camera.aspect, 1000);
    }
    if (restoring) {
      const a = this.settings.reducedMotion ? 1 : smooth(0, 5, t);
      const targetEye = new T.Vector3(
        portrait ? (m.id === 4 ? -25 : -20) : -21,
        roadY(m, m.length) + (portrait ? 13 : 11),
        m.length - (portrait ? (m.id === 4 ? 28 : 20) : 12),
      );
      targetEye.lerp(new T.Vector3(portrait ? -20 : -15, roadY(m, m.length) + (portrait ? 10 : 7), m.length + (portrait ? -10 : 2)), closingFrame);
      this.eye
        .set(p.x - forward.x * 8, p.y + 4, p.z - forward.z * 8)
        .lerp(targetEye, a);
      this.aim.set(0, roadY(m, m.length) + 2.5, m.length + 17);
      this.rig.place(this.eye, this.aim, dt, this.camera);
    } else {
      const lead = 10 + speed * 11;
      const turn = routePoint(
        m,
        stationAhead(m, e.progress, lead, e.isAlt),
        e.isAlt,
      );
      this.aim.set(
        T.MathUtils.lerp(p.x + forward.x * lead, turn.x, 0.28),
        p.y + 0.7,
        T.MathUtils.lerp(p.z + forward.z * lead, turn.z, 0.28),
      );
      this.rig.update(
        {
          dt: Math.max(dt, 0.001),
          position: p,
          heading,
          speed01: speed,
          lookAhead: this.aim,
          portrait,
          reducedMotion: !!this.settings.reducedMotion,
          roadPulse: e.roadPulse,
          impact: e.impactPulse,
          phase: e.phase,
          groundAt: (x, z) => worldHeight(m, x, z),
        },
        this.camera,
      );
    }
    this.sky.position.copy(this.camera.position);
    // The sun's shadow volume follows the truck; low sun, long shadows.
    this.sun.position.copy(p).addScaledVector(sky.lightDir, 200);
    this.sun.target.position.set(p.x + forward.x * 14, p.y, p.z + forward.z * 14);
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
    // Red laterite dust, backlit by the low sun; spray on wet ground.
    dustMat.color.copy(this.scratchColor.set(wet > 0.45 ? '#6e5a4c' : '#b5714a').lerp(sky.sunColor, 0.18 * (1 - sky.darkness)));
    dustMat.size = wet > 0.45 ? 0.12 : 0.34 + speed * 0.35;
    dustMat.opacity = (wet > 0.45 ? 0.25 : 0.16) + speed * 0.22;
    if (this.burst > 0) {
      // A contact throws up a puff of laterite dust and grit at the bumper.
      const n = Math.min(this.particles.length, Math.round(20 + this.burst * 60));
      for (let i = 0; i < n; i++) {
        const k = i * 3,
          a = Math.random() * Math.PI * 2;
        this.particles[i] = 0.5 + Math.random() * 0.7;
        this.dustData[k] = p.x + forward.x * 2.2 + (Math.random() - 0.5) * 1.8;
        this.dustData[k + 1] = p.y - 0.3 + Math.random() * 0.9;
        this.dustData[k + 2] = p.z + forward.z * 2.2 + (Math.random() - 0.5) * 1.8;
        const v = 1.5 + Math.random() * 3.5 * (0.5 + this.burst);
        this.dustVelocity[k] = Math.cos(a) * v + forward.x * 1.5;
        this.dustVelocity[k + 1] = 0.8 + Math.random() * 2.2;
        this.dustVelocity[k + 2] = Math.sin(a) * v + forward.z * 1.5;
      }
      this.burst = 0;
    }
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
    this.renderer.info.reset();
    this.post.render({
      dt: Math.max(dt, 0.0001),
      sun: sky.sunDir,
      sunColor: sky.sunColor,
      darkness: sky.darkness,
      shaftStrength: this.low ? 0 : 0.6 * (1 - chapterLook(m).storm * 0.2),
      impact: this.settings.reducedMotion ? 0 : e.impactPulse,
    });
  }
  recordFrame(dt: number, physicsMs: number, renderMs: number) {
    this.frames.record(dt, physicsMs, renderMs);
    const stats = this.frames.stats;
    this.performance = {
      fps: stats.fps,
      p95: stats.p95,
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
    this.adaptTimer += dt;
    if (this.adaptTimer > 5) {
      this.adaptTimer = 0;
      if (
        this.settings.quality === 'auto' &&
        stats.p95 > (this.low ? 40 : 25) &&
        this.renderer.getPixelRatio() > 0.75
      ) {
        this.renderer.setPixelRatio(
          Math.max(0.75, this.renderer.getPixelRatio() - 0.15),
        );
        this.post.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
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
    this.post.dispose();
    this.renderer.dispose();
    disposeArt();
    this.scene.clear();
    this.skyScene.clear();
  }
}

function hash2(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
/** Smooth 2D value noise in [0, 1]. */
function valueNoise(x: number, y: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy),
    b = hash2(ix + 1, iy),
    c = hash2(ix, iy + 1),
    d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
