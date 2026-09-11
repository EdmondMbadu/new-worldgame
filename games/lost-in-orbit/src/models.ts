import * as T from 'three';
import { CONFIG as C, ASTEROID_LAYOUT, CELL_LAYOUT } from './config';

export function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function buildWorld() {
  const root = new T.Group();
  const geometries = new Set<T.BufferGeometry>();
  const materials = new Set<T.Material>();
  const textures = new Set<T.Texture>();
  const geo = <G extends T.BufferGeometry>(g: G) => {
    geometries.add(g);
    return g;
  };
  const mat = <M extends T.Material>(m: M) => {
    materials.add(m);
    return m;
  };
  const standard = (
    color: string,
    extra: T.MeshStandardMaterialParameters = {},
  ) => mat(new T.MeshStandardMaterial({ color, roughness: 0.58, ...extra }));
  const basic = (color: string, opacity = 1) =>
    mat(
      new T.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity === 1,
      }),
    );
  const ivory = standard(C.colors.ivory),
    white = standard('#fff9ef'),
    orange = standard(C.colors.orange),
    navy = standard('#243c56'),
    slate = standard('#627c92', { flatShading: true, roughness: 0.95 });
  const dark = standard('#122536'),
    silver = standard('#98acbc', { metalness: 0.5 });
  const cyan = standard(C.colors.cyan, {
    emissive: C.colors.cyan,
    emissiveIntensity: 2,
  });
  const gold = standard(C.colors.gold, {
    emissive: '#ffad35',
    emissiveIntensity: 1.1,
    metalness: 0.4,
    roughness: 0.22,
  });
  const visor = mat(
    new T.MeshPhysicalMaterial({
      color: '#102f4a',
      roughness: 0.12,
      metalness: 0.5,
      clearcoat: 1,
    }),
  );
  const sphere = geo(new T.SphereGeometry(1, 24, 16));
  const box = geo(new T.BoxGeometry(1, 1, 1));
  const capsule = geo(new T.CapsuleGeometry(0.5, 1, 4, 10));
  const cylinder = geo(new T.CylinderGeometry(1, 1, 1, 16));
  const cone = geo(new T.ConeGeometry(1, 1, 12));
  const cellShape = geo(new T.OctahedronGeometry(0.53));
  function mesh(
    parent: T.Object3D,
    geometry: T.BufferGeometry,
    material: T.Material,
    pos: number[] = [0, 0, 0],
    scale: number[] = [1, 1, 1],
  ) {
    const object = new T.Mesh(geometry, material);
    object.position.set(pos[0], pos[1], pos[2]);
    object.scale.set(scale[0], scale[1], scale[2]);
    parent.add(object);
    return object;
  }
  function ring(
    parent: T.Object3D,
    radius: number,
    tube: number,
    material: T.Material,
    pos = [0, 0, 0],
  ) {
    const object = mesh(
      parent,
      geo(new T.TorusGeometry(radius, tube, 6, 64)),
      material,
      pos,
    );
    object.rotation.x = Math.PI / 2;
    return object;
  }
  function glowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,.9)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new T.CanvasTexture(canvas);
    textures.add(texture);
    return texture;
  }
  const glowMap = glowTexture();
  function glow(
    parent: T.Object3D,
    color: string,
    size: number,
    pos: number[],
    opacity = 0.6,
  ) {
    const material = mat(
      new T.SpriteMaterial({
        map: glowMap,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: T.AdditiveBlending,
      }),
    );
    const sprite = new T.Sprite(material);
    sprite.position.set(pos[0], pos[1], pos[2]);
    sprite.scale.setScalar(size);
    parent.add(sprite);
    return sprite;
  }

  const astronaut = new T.Group();
  root.add(astronaut);
  mesh(astronaut, capsule, ivory, [0, 0.05, 0], [0.91, 0.67, 0.63]);
  mesh(astronaut, sphere, ivory, [0, 1, 0], [0.76, 0.76, 0.71]);
  mesh(astronaut, sphere, navy, [0, 1.01, 0.39], [0.65, 0.56, 0.41]);
  mesh(astronaut, sphere, visor, [0, 1.05, 0.48], [0.59, 0.47, 0.36]);
  mesh(
    astronaut,
    sphere,
    basic('#b6eeff', 0.8),
    [-0.25, 1.25, 0.768],
    [0.16, 0.045, 0.028],
  ).rotation.z = -0.25;
  mesh(
    astronaut,
    sphere,
    basic('#b6eeff', 0.5),
    [0.14, 0.88, 0.804],
    [0.06, 0.025, 0.018],
  );
  const neck = mesh(
    astronaut,
    cylinder,
    navy,
    [0, 0.48, 0],
    [0.48, 0.18, 0.43],
  );
  neck.rotation.y = 0.2;
  mesh(astronaut, box, orange, [0, -0.18, 0.355], [0.84, 0.16, 0.06]);
  mesh(astronaut, box, navy, [0, 0.15, 0.37], [0.4, 0.36, 0.06]);
  mesh(astronaut, box, silver, [0, 0.16, 0.41], [0.29, 0.22, 0.04]);
  for (let i = 0; i < 3; i++)
    mesh(
      astronaut,
      sphere,
      i === 0 ? cyan : orange,
      [-0.08 + i * 0.08, 0.16, 0.444],
      [0.026, 0.026, 0.015],
    );
  mesh(astronaut, box, navy, [0, 0.04, -0.54], [0.78, 0.98, 0.35]);
  mesh(astronaut, box, orange, [0, 0.19, -0.745], [0.47, 0.4, 0.06]);
  const arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new T.Group();
    arm.position.set(side * 0.63, 0.26, 0);
    arm.rotation.z = side * 0.22;
    astronaut.add(arm);
    arms.push(arm);
    mesh(arm, capsule, ivory, [0, -0.29, 0], [0.29, 0.4, 0.3]);
    mesh(arm, cylinder, orange, [0, -0.45, 0], [0.31, 0.14, 0.31]);
    mesh(arm, sphere, navy, [0, -0.66, 0.03], [0.29, 0.25, 0.29]);
    const leg = mesh(
      astronaut,
      capsule,
      ivory,
      [side * 0.26, -0.83, 0],
      [0.32, 0.4, 0.34],
    );
    leg.rotation.z = -side * 0.08;
    mesh(
      astronaut,
      box,
      orange,
      [side * 0.27, -0.93, 0.29],
      [0.32, 0.18, 0.08],
    );
    mesh(
      astronaut,
      sphere,
      navy,
      [side * 0.29, -1.24, 0.12],
      [0.35, 0.25, 0.46],
    );
    mesh(
      astronaut,
      capsule,
      silver,
      [side * 0.43, -0.01, -0.6],
      [0.24, 0.46, 0.24],
    );
    mesh(
      astronaut,
      cylinder,
      dark,
      [side * 0.43, -0.49, -0.6],
      [0.25, 0.16, 0.25],
    );
    mesh(
      astronaut,
      sphere,
      cyan,
      [side * 0.43, -0.58, -0.6],
      [0.16, 0.08, 0.16],
    );
    mesh(astronaut, sphere, orange, [side * 0.73, 1, 0], [0.12, 0.23, 0.24]);
  }
  mesh(astronaut, cylinder, silver, [0.52, 1.79, -0.05], [0.02, 0.37, 0.02]);
  mesh(astronaut, sphere, cyan, [0.52, 1.98, -0.05], [0.05, 0.05, 0.05]);
  const flameMat = basic(C.colors.cyan, 0.8);
  const flames = [-1, 1].map((s) => {
    const flame = mesh(
      astronaut,
      cone,
      flameMat,
      [s * 0.43, -0.93, -0.6],
      [0.13, 0.7, 0.13],
    );
    flame.rotation.x = Math.PI;
    return flame;
  });
  const shieldMaterial = mat(
    new T.MeshBasicMaterial({
      color: '#80e8fa',
      transparent: true,
      opacity: 0,
      wireframe: true,
      depthWrite: false,
    }),
  );
  const shield = mesh(
    astronaut,
    geo(new T.IcosahedronGeometry(1.85, 1)),
    shieldMaterial,
    [0, 0.3, 0],
  );
  shield.visible = false;
  const astronautHalo = glow(root, '#78cfe8', 3.2, [0, -0.3, 0], 0.12);

  const ship = new T.Group();
  root.add(ship);
  mesh(ship, sphere, ivory, [0, 0.65, 0], [1.65, 0.8, 2.2]);
  mesh(ship, sphere, navy, [0, 0.58, -0.38], [1.36, 0.68, 1.73]);
  mesh(ship, sphere, visor, [0, 1.18, -0.68], [1.1, 0.64, 1.22]);
  mesh(
    ship,
    sphere,
    basic('#98dfee', 0.7),
    [-0.4, 1.63, -0.87],
    [0.36, 0.035, 0.5],
  ).rotation.z = -0.15;
  mesh(ship, sphere, ivory, [0, 0.95, 1.1], [1.42, 0.54, 0.8]);
  mesh(ship, box, orange, [0, 1.38, 0.7], [0.48, 0.05, 0.96]);
  for (const side of [-1, 1]) {
    mesh(ship, box, navy, [side * 1.65, 0.35, 0.3], [1.2, 0.25, 1.65]);
    mesh(ship, sphere, ivory, [side * 2.22, 0.47, 0.3], [0.56, 0.56, 1.52]);
    mesh(
      ship,
      cylinder,
      orange,
      [side * 2.22, 0.47, -0.05],
      [0.58, 0.32, 0.58],
    ).rotation.x = Math.PI / 2;
    mesh(
      ship,
      cylinder,
      navy,
      [side * 2.22, 0.47, 1.48],
      [0.51, 0.38, 0.51],
    ).rotation.x = Math.PI / 2;
    mesh(
      ship,
      cylinder,
      cyan,
      [side * 2.22, 0.47, 1.68],
      [0.32, 0.045, 0.32],
    ).rotation.x = Math.PI / 2;
    mesh(
      ship,
      box,
      silver,
      [side * 1.1, -0.27, -0.65],
      [0.16, 0.75, 0.2],
    ).rotation.z = side * 0.4;
    mesh(ship, sphere, navy, [side * 1.25, -0.65, -0.65], [0.5, 0.1, 0.45]);
    mesh(ship, sphere, cyan, [side * 0.85, 0.68, -1.8], [0.15, 0.08, 0.08]);
  }
  const hatch = mesh(ship, cylinder, navy, [0, 0.54, 2.08], [0.64, 0.15, 0.64]);
  hatch.rotation.x = Math.PI / 2;
  const hatchRing = mesh(
    ship,
    geo(new T.TorusGeometry(0.64, 0.085, 8, 32)),
    silver,
    [0, 0.54, 2.18],
  );
  hatchRing.rotation.z = 0.1;
  mesh(ship, box, silver, [0, 0.65, 2.24], [0.36, 0.08, 0.025]);
  const segments = Array.from({ length: 5 }, (_, i) => {
    const material = standard('#2b4b58', {
      emissive: '#56ddf5',
      emissiveIntensity: 0,
    });
    return mesh(
      ship,
      box,
      material,
      [-0.64 + i * 0.32, 1.45, 1.09],
      [0.21, 0.05, 0.38],
    );
  });
  const engineFlames = [-1, 1].map((side) => {
    const flame = mesh(
      ship,
      cone,
      basic('#70e8ff', 0.7),
      [side * 2.22, 0.47, 2.8],
      [0.35, 2.3, 0.35],
    );
    flame.rotation.x = -Math.PI / 2;
    flame.visible = false;
    return flame;
  });
  const dockMaterial = basic('#76d9de', 0.3);
  const dockingRing = ring(
    root,
    C.docking.radius,
    0.032,
    dockMaterial,
    [0, -0.36, 0],
  );
  ring(
    root,
    C.docking.radius + 0.2,
    0.013,
    basic('#72cecf', 0.13),
    [0, -0.36, 0],
  );
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const tick = mesh(
      root,
      box,
      basic('#71d9e4', 0.35),
      [Math.cos(angle) * 4.85, -0.36, Math.sin(angle) * 4.85],
      [0.3, 0.012, 0.06],
    );
    tick.rotation.y = -angle;
  }
  glow(root, '#3f8d9d', 12, [0, -1.5, 0], 0.11);

  const cells = CELL_LAYOUT.map(() => {
    const group = new T.Group();
    root.add(group);
    mesh(group, cellShape, gold, [0, 0.6, 0]);
    mesh(
      group,
      geo(new T.TorusGeometry(0.6, 0.035, 5, 24)),
      gold,
      [0, 0.6, 0],
    ).rotation.x = 0.8;
    glow(group, '#ffbb45', 3.3, [0, 0.6, 0], 0.4);
    const groundRing = ring(
      group,
      1,
      0.017,
      basic('#e1b673', 0.22),
      [0, -0.45, 0],
    );
    return { group, groundRing };
  });
  const asteroids = ASTEROID_LAYOUT.map((a, index) => {
    const geometry = geo(new T.IcosahedronGeometry(a.radius, 1));
    const positions = geometry.getAttribute('position');
    // Coordinate-based displacement keeps duplicated face vertices watertight.
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i);
      const scale = 0.86 + 0.13 * Math.sin(x * 2.1 + y * 3.7 + z * 2.6 + index);
      positions.setXYZ(i, x * scale, y * scale * 0.86, z * scale);
    }
    geometry.computeVertexNormals();
    const group = new T.Group();
    root.add(group);
    const rock = mesh(group, geometry, slate);
    rock.rotation.set(index * 0.3, index, 0.2);
    const detail = mesh(
      group,
      geo(new T.IcosahedronGeometry(a.radius * 0.28, 0)),
      standard(index % 3 ? '#3e586d' : '#718294', { flatShading: true }),
      [a.radius * 0.44, a.radius * 0.57, 0.1],
    );
    detail.scale.y = 0.3;
    return group;
  });

  const meteorGeo = geo(new T.IcosahedronGeometry(C.threats.radius, 1));
  const meteorMat = standard('#6f514d', {
    flatShading: true,
    emissive: '#ad4526',
    emissiveIntensity: 0.28,
  });
  const meteors = Array.from({ length: C.threats.pool }, () => {
    const group = new T.Group();
    root.add(group);
    group.visible = false;
    const rock = mesh(group, meteorGeo, meteorMat);
    const hot = mesh(
      group,
      geo(new T.IcosahedronGeometry(1.13, 0)),
      basic('#ffad66', 0.14),
    );
    const trail = mesh(
      group,
      cone,
      basic('#ff9b62', 0.22),
      [0, -3.2, 0],
      [0.75, 6.4, 0.75],
    );
    trail.rotation.z = Math.PI;
    glow(group, '#ff9b52', 4.5, [0, 0, 0], 0.3);
    const pathGeo = geo(new T.BufferGeometry());
    pathGeo.setAttribute(
      'position',
      new T.BufferAttribute(new Float32Array(6), 3),
    );
    const pathMaterial = mat(
      new T.LineDashedMaterial({
        color: '#ffbc86',
        transparent: true,
        opacity: 0.35,
        dashSize: 0.65,
        gapSize: 0.6,
        depthWrite: false,
      }),
    );
    const path = new T.Line(pathGeo, pathMaterial);
    path.frustumCulled = false;
    root.add(path);
    const target = new T.Group();
    root.add(target);
    const targetMat = basic('#ffbe8c', 0.7);
    mesh(target, geo(new T.TorusGeometry(1.5, 0.028, 4, 40)), targetMat);
    for (const side of [-1, 1]) {
      mesh(target, box, targetMat, [side * 1.6, 0, 0], [0.6, 0.035, 0.035]);
      mesh(target, box, targetMat, [0, side * 1.6, 0], [0.035, 0.6, 0.035]);
    }
    return { group, rock, hot, trail, path, pathMaterial, target };
  });
  const shelterMaterial = mat(
    new T.MeshBasicMaterial({
      color: '#69d8e9',
      transparent: true,
      opacity: 0.035,
      wireframe: true,
      depthWrite: false,
    }),
  );
  const shelter = mesh(
    root,
    geo(new T.IcosahedronGeometry(C.threats.shelter, 2)),
    shelterMaterial,
    [0, 1.45, 0],
  );

  const random = seeded(42);
  const starPositions = new Float32Array(C.rendering.stars * 3);
  const starColors = new Float32Array(C.rendering.stars * 3);
  for (let i = 0; i < C.rendering.stars; i++) {
    starPositions[i * 3] = (random() - 0.5) * 260;
    starPositions[i * 3 + 1] = (random() - 0.55) * 180;
    starPositions[i * 3 + 2] = (random() - 0.7) * 240;
    const color = new T.Color().setHSL(
      0.52 + random() * 0.15,
      0.2,
      0.55 + random() * 0.4,
    );
    starColors.set([color.r, color.g, color.b], i * 3);
  }
  const starsGeo = geo(new T.BufferGeometry());
  starsGeo.setAttribute('position', new T.BufferAttribute(starPositions, 3));
  starsGeo.setAttribute('color', new T.BufferAttribute(starColors, 3));
  root.add(
    new T.Points(
      starsGeo,
      mat(
        new T.PointsMaterial({
          size: 0.16,
          vertexColors: true,
          transparent: true,
          opacity: 0.8,
          sizeAttenuation: true,
        }),
      ),
    ),
  );

  const debrisGeo = geo(new T.IcosahedronGeometry(0.22, 0));
  const debris = new T.InstancedMesh(debrisGeo, standard('#3f5770'), 85);
  const dummy = new T.Object3D();
  for (let i = 0; i < 85; i++) {
    dummy.position.set(
      (random() - 0.5) * 115,
      -15 + random() * 34,
      (random() - 0.5) * 90,
    );
    dummy.scale.setScalar(0.3 + random());
    dummy.rotation.set(random() * 4, random() * 4, 0);
    dummy.updateMatrix();
    debris.setMatrixAt(i, dummy.matrix);
  }
  root.add(debris);

  const planet = new T.Group();
  planet.position.set(28, -7, -48);
  root.add(planet);
  const planetMaterial = mat(
    new T.ShaderMaterial({
      uniforms: {
        colorA: { value: new T.Color('#244e74') },
        colorB: { value: new T.Color('#0b152d') },
      },
      vertexShader:
        'varying vec3 vN; varying vec3 vP; void main(){vN=normalize(normalMatrix*normal);vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:
        'varying vec3 vN;varying vec3 vP;uniform vec3 colorA;uniform vec3 colorB;void main(){float bands=sin(vP.y*1.15+sin(vP.x*.45)*1.3)*.5+.5;float light=max(0.,dot(normalize(vN),normalize(vec3(-.7,.6,1.))));vec3 color=mix(colorB,colorA,bands*.28+light*.7);float rim=pow(1.-max(0.,vN.z),3.);gl_FragColor=vec4(color+vec3(.17,.37,.48)*rim*.55,1.);}',
    }),
  );
  mesh(planet, geo(new T.SphereGeometry(11, 48, 32)), planetMaterial);
  const planetRing = mesh(
    planet,
    geo(new T.RingGeometry(14, 16.6, 96)),
    mat(
      new T.MeshBasicMaterial({
        color: '#7195bd',
        transparent: true,
        opacity: 0.15,
        side: T.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  planetRing.rotation.set(-0.95, -0.2, 0.2);
  glow(planet, '#3973aa', 29, [0, 0, -2], 0.1);

  // A few very faint orbital arcs provide depth without suggesting a playable floor.
  for (const radius of [13, 25, 38])
    ring(root, radius, 0.008, basic('#7291c3', 0.075), [0, -3, 0]);
  const boundary = ring(root, 1, 0.0015, basic('#d9b58b', 0.35), [0, -0.5, 0]);
  boundary.scale.set(40, 30, 1);
  boundary.visible = false;

  const environmentCanvas = document.createElement('canvas');
  environmentCanvas.width = 256;
  environmentCanvas.height = 128;
  const ctx = environmentCanvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 256, 128);
  gradient.addColorStop(0, '#a3d5e1');
  gradient.addColorStop(0.23, '#344e6d');
  gradient.addColorStop(0.45, '#101d34');
  gradient.addColorStop(0.7, '#709aad');
  gradient.addColorStop(1, '#ddb892');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#e3eeed';
  ctx.fillRect(40, 22, 28, 40);
  const environment = new T.CanvasTexture(environmentCanvas);
  environment.mapping = T.EquirectangularReflectionMapping;
  environment.colorSpace = T.SRGBColorSpace;
  textures.add(environment);

  const particleMaterial = mat(
    new T.MeshBasicMaterial({
      vertexColors: false,
      color: '#80e9ff',
      transparent: true,
      opacity: 0.8,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const particleMesh = new T.InstancedMesh(
    geo(new T.OctahedronGeometry(0.11)),
    particleMaterial,
    C.rendering.particles,
  );
  particleMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  particleMesh.frustumCulled = false;
  root.add(particleMesh);
  const particleColors = new Float32Array(C.rendering.particles * 3);
  particleMesh.instanceColor = new T.InstancedBufferAttribute(
    particleColors,
    3,
  );
  particleMesh.instanceColor.setUsage(T.DynamicDrawUsage);
  particleMaterial.color.set('#ffffff');
  return {
    root,
    astronaut,
    arms,
    flames,
    shield,
    shieldMaterial,
    astronautHalo,
    ship,
    segments,
    engineFlames,
    dockingRing,
    dockMaterial,
    cells,
    asteroids,
    meteors,
    shelter,
    shelterMaterial,
    boundary,
    environment,
    particleMesh,
    dispose() {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
      particleMesh.dispose();
      debris.dispose();
    },
  };
}

export type World = ReturnType<typeof buildWorld>;
