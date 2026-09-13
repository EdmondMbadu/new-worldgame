import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { random } from './missions';
export const materials = new Set<T.Material>(),
  geometries = new Set<T.BufferGeometry>(),
  textures = new Set<T.Texture>();
export function material(
  color: T.ColorRepresentation,
  roughness = 0.8,
  metalness = 0,
) {
  const m = new T.MeshStandardMaterial({ color, roughness, metalness });
  materials.add(m);
  return m;
}
export function mesh(
  geo: T.BufferGeometry,
  mat: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  geometries.add(geo);
  const o = new T.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
export function box(
  parent: T.Object3D,
  mat: T.Material,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  round = 0,
) {
  return mesh(
    round
      ? new RoundedBoxGeometry(w, h, d, 2, round)
      : new T.BoxGeometry(w, h, d),
    mat,
    parent,
    x,
    y,
    z,
  );
}
export function cylinder(
  parent: T.Object3D,
  mat: T.Material,
  x: number,
  y: number,
  z: number,
  rt: number,
  rb: number,
  h: number,
  segments = 10,
) {
  return mesh(
    new T.CylinderGeometry(rt, rb, h, segments),
    mat,
    parent,
    x,
    y,
    z,
  );
}
export function sphere(
  parent: T.Object3D,
  mat: T.Material,
  x: number,
  y: number,
  z: number,
  r: number,
  sx = 1,
  sy = 1,
  sz = 1,
) {
  const m = mesh(new T.SphereGeometry(r, 10, 8), mat, parent, x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
export function texture(
  kind: 'earth' | 'grass' | 'plaster' | 'metal' | 'panel' | 'leaf',
) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const rng = random(193 + kind.length);
  const base =
    kind === 'earth'
      ? [113, 72, 47]
      : kind === 'grass'
        ? [65, 80, 37]
        : kind === 'plaster'
          ? [183, 178, 145]
          : kind === 'metal'
            ? [96, 111, 104]
            : kind === 'leaf'
              ? [42, 78, 34]
              : [21, 51, 71];
  const image = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const grain =
        (rng() - 0.5) * 35 + Math.sin(x * 0.22) * Math.sin(y * 0.19) * 8;
      const n = (y * 256 + x) * 4;
      for (let k = 0; k < 3; k++) image.data[n + k] = base[k] + grain;
      image.data[n + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  if (kind === 'panel') {
    ctx.strokeStyle = '#a4c0c0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 32, 0);
      ctx.lineTo(i * 32, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * 32);
      ctx.lineTo(256, i * 32);
      ctx.stroke();
    }
    ctx.strokeStyle = '#456777';
    for (let i = 0; i < 64; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 4, 0);
      ctx.lineTo(i * 4, 256);
      ctx.stroke();
    }
  }
  if (kind === 'earth') {
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(35,25,16,${rng() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(
        rng() * 256,
        rng() * 256,
        1 + rng() * 4,
        1 + rng() * 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  if (kind === 'metal') {
    for (let i = 0; i < 32; i++) {
      ctx.fillStyle = i % 2 ? '#7e888277' : '#253b3e66';
      ctx.fillRect(i * 8, 0, 3, 256);
    }
  }
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  textures.add(t);
  return t;
}
export function label(
  text: string,
  color = '#efe6ce',
  background = '#234640',
  w = 1024,
  h = 160,
) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext('2d')!;
  c.fillStyle = background;
  c.fillRect(0, 0, w, h);
  c.fillStyle = color;
  c.font = `600 ${Math.floor(h * 0.43)}px sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, w / 2, h / 2, w * 0.9);
  const map = new T.CanvasTexture(canvas);
  map.colorSpace = T.SRGBColorSpace;
  textures.add(map);
  const mat = new T.MeshBasicMaterial({ map });
  materials.add(mat);
  return mat;
}
export function batch(group: T.Group) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const buckets = new Map<T.Material, T.BufferGeometry[]>();
  group.traverse((o) => {
    if (o instanceof T.Mesh && !Array.isArray(o.material)) {
      const g = (
        o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()
      ).applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      if (!g.getAttribute('uv'))
        g.setAttribute(
          'uv',
          new T.Float32BufferAttribute(
            new Float32Array(g.attributes.position.count * 2),
            2,
          ),
        );
      const a = buckets.get(o.material) || [];
      a.push(g);
      buckets.set(o.material, a);
    }
  });
  group.clear();
  for (const [mat, gs] of buckets) {
    const merged = mergeGeometries(gs, false);
    gs.forEach((g) => g.dispose());
    if (merged) mesh(merged, mat, group);
  }
  return group;
}
export function createTruck() {
  const root = new T.Group(),
    fixed = new T.Group();
  root.add(fixed);
  const ivory = material('#c9cebf', 0.32, 0.35),
    dark = material('#162422', 0.66, 0.2),
    rubber = material('#151917', 0.94),
    steel = material('#84958e', 0.24, 0.85),
    glass = material('#324e51', 0.1, 0.55),
    dirt = material('#756950', 0.96),
    teal = material('#267f70', 0.4, 0.2),
    seat = material('#393c32');
  glass.envMapIntensity = 1.7;
  // Cross sections shape the bonnet and body; glass follows the cab's raked pillars.
  const loft = (sections: number[][], mat: T.Material) => {
    const vertices: number[] = [],
      indices: number[] = [];
    for (const [z, w, bottom, top] of sections) {
      const bevel = 0.065;
      for (const [x, y] of [
        [-w + bevel, bottom],
        [-w, bottom + bevel],
        [-w, top - bevel],
        [-w + bevel, top],
        [w - bevel, top],
        [w, top - bevel],
        [w, bottom + bevel],
        [w - bevel, bottom],
      ])
        vertices.push(x, y, z);
    }
    for (let j = 0; j < sections.length - 1; j++)
      for (let i = 0; i < 8; i++) {
        const a = j * 8 + i,
          b = j * 8 + ((i + 1) % 8);
        indices.push(a, a + 8, b, b, a + 8, b + 8);
      }
    for (let i = 1; i < 7; i++) {
      indices.push(0, i, i + 1);
      const a = (sections.length - 1) * 8;
      indices.push(a, a + i + 1, a + i);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return mesh(g, mat, fixed);
  };
  const quad = (
    points: number[][],
    mat: T.Material,
    parent: T.Object3D = fixed,
  ) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(points.flat(), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    const o = mesh(g, mat, parent);
    o.material.side = T.DoubleSide;
    return o;
  };
  box(fixed, dark, 0, -0.2, 0, 1.52, 0.21, 4.3, 0.04);
  loft(
    [
      [-2.29, 0.83, -0.13, 0.36],
      [-1.9, 0.89, -0.18, 0.42],
      [-0.78, 0.9, -0.18, 0.6],
      [0.9, 0.89, -0.15, 0.63],
      [2.06, 0.85, -0.1, 0.6],
      [2.3, 0.77, 0.02, 0.5],
    ],
    ivory,
  );
  loft(
    [
      [0.88, 0.88, 0.56, 0.84],
      [1.32, 0.89, 0.52, 0.78],
      [2.14, 0.81, 0.5, 0.68],
      [2.29, 0.73, 0.4, 0.53],
    ],
    ivory,
  );
  box(fixed, dark, 0, 0.48, -1.62, 1.57, 0.08, 1.22);
  for (const side of [-1, 1]) {
    box(fixed, ivory, side * 0.85, 0.65, -1.64, 0.14, 0.4, 1.3, 0.045);
    box(fixed, dark, side * 0.86, 0.875, -1.64, 0.15, 0.045, 1.38, 0.02);
  }
  box(fixed, ivory, 0, 0.64, -2.25, 1.75, 0.43, 0.1, 0.045);
  box(fixed, ivory, 0, 1.45, -0.1, 1.72, 0.11, 1.56, 0.055);
  box(fixed, dark, 0, 0.79, -0.16, 1.54, 0.08, 1.6);
  quad(
    [
      [-0.78, 0.88, 1.02],
      [0.78, 0.88, 1.02],
      [0.74, 1.41, 0.63],
      [-0.74, 1.41, 0.63],
    ],
    glass,
  );
  quad(
    [
      [0.78, 0.85, -0.95],
      [-0.78, 0.85, -0.95],
      [-0.75, 1.41, -0.84],
      [0.75, 1.41, -0.84],
    ],
    glass,
  );
  for (const side of [-1, 1]) {
    const x = side * 0.862;
    quad(
      [
        [x, 0.84, -0.85],
        [x, 0.84, 0.91],
        [side * 0.77, 1.4, 0.61],
        [side * 0.77, 1.4, -0.78],
      ],
      glass,
    );
    for (const [z1, y1, z2, y2] of [
      [0.98, 0.8, 0.64, 1.45],
      [-0.94, 0.8, -0.84, 1.45],
      [-0.04, 0.8, -0.04, 1.45],
    ]) {
      const a = new T.Vector3(side * 0.84, y1, z1),
        b = new T.Vector3(side * 0.79, y2, z2),
        length = a.distanceTo(b);
      const pillar = cylinder(
        fixed,
        ivory,
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        (a.z + b.z) / 2,
        0.04,
        0.044,
        length,
        6,
      );
      pillar.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        b.sub(a).normalize(),
      );
    }
    for (const z of [-0.51, 0.45]) {
      box(fixed, dark, side * 0.905, 0.5, z, 0.022, 0.47, 0.77, 0.012);
      box(fixed, ivory, side * 0.917, 0.52, z, 0.025, 0.43, 0.73, 0.025);
      box(fixed, steel, side * 0.942, 0.66, z - 0.2, 0.036, 0.04, 0.14, 0.016);
    }
    box(fixed, teal, side * 0.937, 0.47, 0.48, 0.027, 0.2, 0.36, 0.018);
    box(fixed, steel, side * 1.02, -0.1, -0.04, 0.21, 0.08, 1.45, 0.025);
    box(fixed, dark, side * 0.99, 0.96, 0.83, 0.24, 0.13, 0.11, 0.045);
    box(fixed, steel, side * 1.11, 0.97, 0.82, 0.018, 0.095, 0.078, 0.008);
    for (const z of [1.25, -1.3]) {
      const arch = new T.TorusGeometry(0.52, 0.062, 6, 24, Math.PI);
      const trim = mesh(arch, dark, fixed, side * 0.96, -0.35, z);
      trim.rotation.y = Math.PI / 2;
      for (let j = 0; j < 9; j++) {
        const a = (j / 8) * Math.PI;
        sphere(
          fixed,
          steel,
          side * 1.019,
          -0.35 + Math.sin(a) * 0.52,
          z + Math.cos(a) * 0.52,
          0.017,
        );
      }
      box(fixed, rubber, side * 0.86, -0.36, z - 0.52, 0.24, 0.42, 0.035);
    }
    box(fixed, dirt, side * 0.934, -0.025, -0.05, 0.018, 0.08, 3.95);
  }
  box(fixed, dark, 0, 0.29, 2.3, 1.86, 0.25, 0.21, 0.055);
  box(fixed, steel, 0, 0.25, -2.39, 1.91, 0.14, 0.19, 0.035);
  box(fixed, dark, 0, 0.61, 2.265, 0.95, 0.19, 0.038, 0.02);
  for (let i = 0; i < 9; i++)
    box(fixed, steel, (i - 4) * 0.097, 0.61, 2.293, 0.027, 0.145, 0.02, 0.008);
  box(fixed, steel, 0, 0.12, 2.43, 0.57, 0.14, 0.08, 0.025);
  box(fixed, dark, 0, 0.06, 2.45, 0.24, 0.1, 0.08, 0.02);
  box(
    fixed,
    label('LAST LIGHT', '#eff1df', '#25665b', 512, 96),
    0,
    0.66,
    -2.312,
    1.05,
    0.19,
    0.014,
  );
  box(
    fixed,
    label('GSL  •  02', '#273a37', '#d5d4b9', 256, 64),
    0,
    0.23,
    -2.5,
    0.57,
    0.13,
    0.01,
  );
  const headlights = material('#fff2d1', 0.16);
  headlights.emissive.set('#ffe7b7');
  headlights.emissiveIntensity = 2.5;
  const tail = material('#70190e', 0.23);
  tail.emissive.set('#ef3219');
  tail.emissiveIntensity = 0.7;
  for (const side of [-1, 1]) {
    box(fixed, headlights, side * 0.67, 0.62, 2.277, 0.37, 0.155, 0.04, 0.035);
    box(fixed, tail, side * 0.766, 0.61, -2.315, 0.17, 0.28, 0.035, 0.023);
    box(fixed, steel, side * 0.766, 0.59, -2.34, 0.17, 0.05, 0.02);
    box(fixed, seat, side * 0.4, 0.97, -0.15, 0.44, 0.48, 0.22, 0.055);
    box(fixed, seat, side * 0.4, 0.74, 0.05, 0.43, 0.14, 0.52, 0.05);
    for (const z of [-0.76, 0.56])
      box(fixed, steel, side * 0.65, 1.54, z, 0.055, 0.08, 0.07);
    box(fixed, dark, side * 0.65, 1.61, -0.1, 0.065, 0.06, 1.57, 0.022);
  }
  box(fixed, dark, 0, 1.63, -0.1, 1.46, 0.06, 0.07, 0.02);
  box(fixed, dark, 0, 0.85, 0.8, 1.48, 0.18, 0.27, 0.04);
  sphere(fixed, material('#80563a'), -0.4, 1.22, 0.05, 0.13, 1, 1.2, 1);
  box(fixed, teal, -0.4, 0.98, 0.01, 0.36, 0.33, 0.24, 0.06);
  const sw = mesh(
    new T.TorusGeometry(0.17, 0.023, 6, 20),
    dark,
    fixed,
    -0.4,
    0.91,
    0.57,
  );
  sw.rotation.x = 0.4;
  const wipers: T.Group[] = [];
  for (const x of [-0.5, 0.28]) {
    const g = new T.Group();
    g.position.set(x, 0.86, 1.04);
    g.rotation.x = -0.64;
    root.add(g);
    box(g, dark, 0, 0.22, 0, 0.018, 0.44, 0.018);
    box(g, rubber, 0, 0.42, 0, 0.36, 0.026, 0.024);
    wipers.push(g);
  }
  for (const side of [-1, 1]) {
    box(fixed, steel, side * 0.77, 1.12, -1.64, 0.065, 0.48, 0.07);
    box(fixed, steel, side * 0.77, 1.36, -1.64, 0.075, 0.06, 1.3);
  }
  batch(fixed);
  const wheels: T.Group[] = [],
    tires: T.Group[] = [];
  for (const z of [1.25, -1.3])
    for (const x of [-0.96, 0.96]) {
      const pivot = new T.Group(),
        spin = new T.Group();
      pivot.position.set(x, -0.4, z);
      pivot.add(spin);
      root.add(pivot);
      const tyre = mesh(
        new T.TorusGeometry(0.326, 0.103, 12, 40),
        rubber,
        spin,
      );
      tyre.rotation.y = Math.PI / 2;
      const wall = cylinder(spin, rubber, 0, 0, 0, 0.406, 0.406, 0.23, 40);
      wall.rotation.z = Math.PI / 2;
      const hub = cylinder(spin, dark, 0, 0, 0, 0.246, 0.246, 0.25, 32);
      hub.rotation.z = Math.PI / 2;
      const rim = mesh(
        new T.TorusGeometry(0.23, 0.023, 6, 32),
        steel,
        spin,
        Math.sign(x) * 0.139,
        0,
        0,
      );
      rim.rotation.y = Math.PI / 2;
      for (let j = 0; j < 6; j++) {
        const a = (j * Math.PI) / 3;
        const spoke = box(
          spin,
          steel,
          Math.sign(x) * 0.145,
          Math.sin(a) * 0.12,
          Math.cos(a) * 0.12,
          0.038,
          0.07,
          0.22,
          0.018,
        );
        spoke.rotation.x = -a;
        sphere(
          spin,
          steel,
          Math.sign(x) * 0.169,
          Math.sin(a) * 0.062,
          Math.cos(a) * 0.062,
          0.023,
        );
      }
      for (let j = 0; j < 36; j++)
        for (const side of [-1, 1]) {
          const a = ((j + side * 0.18) * Math.PI) / 18;
          const tread = box(
            spin,
            rubber,
            side * 0.071,
            Math.sin(a) * 0.418,
            Math.cos(a) * 0.418,
            0.11,
            0.022,
            0.052,
            0.007,
          );
          tread.rotation.x = -a;
        }
      batch(spin);
      wheels.push(pivot);
      tires.push(spin);
    }
  const cargo = new T.Group();
  root.add(cargo);
  const panelMat = material('#a5c1c7', 0.2, 0.55);
  panelMat.map = texture('panel');
  panelMat.envMapIntensity = 1.4;
  for (let i = 0; i < 3; i++) {
    box(cargo, steel, 0, 1.01 + i * 0.095, -1.57, 1.54, 0.055, 1.08, 0.016);
    box(cargo, panelMat, 0, 1.044 + i * 0.095, -1.57, 1.46, 0.01, 1);
  }
  for (const x of [-0.53, 0.53]) {
    box(cargo, teal, x, 1.29, -1.57, 0.055, 0.024, 1.12);
    box(cargo, teal, x, 0.93, -2.13, 0.055, 0.73, 0.02);
    box(cargo, steel, x, 0.92, -2.15, 0.08, 0.1, 0.025, 0.015);
  }
  box(cargo, dark, 0, 0.73, -1.5, 0.62, 0.43, 0.61, 0.04);
  box(cargo, teal, 0, 0.75, -1.815, 0.35, 0.16, 0.013);
  batch(cargo);
  return { root, wheels, tires, cargo, headlights, tail, panelMat, wipers };
}
export function createPerson(shirt: string, skin = '#67432d', scale = 1) {
  const group = new T.Group(),
    rootBone = new T.Bone();
  group.add(rootBone);
  const cloth = material(shirt, 0.92),
    face = material(skin, 0.88),
    pants = material('#333e38', 0.98),
    hair = material('#1d2420', 0.94),
    white = material('#c8c8b0');
  const bones: T.Bone[] = [rootBone];
  const bone = (parent: T.Bone, x: number, y: number, z: number) => {
    const b = new T.Bone();
    b.position.set(x, y, z);
    parent.add(b);
    bones.push(b);
    return b;
  };
  const head = bone(rootBone, 0, 1.51, 0);
  const arms = [
    bone(rootBone, -0.215, 1.32, 0),
    bone(rootBone, 0.215, 1.32, 0),
  ];
  const forearms = arms.map((b) => bone(b, 0, -0.265, 0));
  const legs = [
    bone(rootBone, -0.102, 0.88, 0),
    bone(rootBone, 0.102, 0.88, 0),
  ];
  const calves = legs.map((b) => bone(b, 0, -0.39, 0));
  const parts = new Map<T.Material, T.BufferGeometry[]>();
  const add = (
    g: T.BufferGeometry,
    mat: T.Material,
    b: T.Bone,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => {
    rootBone.updateMatrixWorld(true);
    g.scale(sx, sy, sz).translate(x, y, z).applyMatrix4(b.matrixWorld);
    const count = g.attributes.position.count,
      index = bones.indexOf(b),
      weights = new Float32Array(count * 4),
      ids = new Uint16Array(count * 4);
    for (let i = 0; i < count; i++) {
      weights[i * 4] = 1;
      ids[i * 4] = index;
    }
    g.setAttribute('skinIndex', new T.Uint16BufferAttribute(ids, 4));
    g.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4));
    const a = parts.get(mat) || [];
    a.push(g.index ? g.toNonIndexed() : g);
    if (g.index) g.dispose();
    parts.set(mat, a);
  };
  const ball = (
    b: T.Bone,
    mat: T.Material,
    x: number,
    y: number,
    z: number,
    r: number,
    sx = 1,
    sy = 1,
    sz = 1,
  ) => add(new T.SphereGeometry(r, 12, 10), mat, b, x, y, z, sx, sy, sz);
  const tube = (
    b: T.Bone,
    mat: T.Material,
    y: number,
    rt: number,
    rb: number,
    h: number,
  ) => add(new T.CylinderGeometry(rt, rb, h, 12), mat, b, 0, y, 0);
  add(
    new T.CapsuleGeometry(0.19, 0.24, 5, 12),
    cloth,
    rootBone,
    0,
    1.125,
    0,
    1,
    0.95,
    0.64,
  );
  add(
    new T.CapsuleGeometry(0.16, 0.12, 4, 12),
    pants,
    rootBone,
    0,
    0.89,
    0,
    1.1,
    1,
    0.77,
  );
  tube(head, face, -0.13, 0.065, 0.071, 0.12);
  ball(head, face, 0, 0, 0, 0.127, 1, 1.28, 0.94);
  ball(head, hair, 0, 0.09, -0.025, 0.129, 1, 0.64, 0.92);
  ball(head, face, 0, -0.017, 0.117, 0.026, 0.85, 1.28, 1);
  for (const side of [-1, 1]) {
    ball(head, face, side * 0.123, -0.01, 0, 0.032, 0.55, 1, 0.75);
    ball(head, hair, side * 0.046, 0.021, 0.11, 0.012, 1.15, 0.52, 0.38);
  }
  for (let i = 0; i < 2; i++) {
    ball(arms[i], cloth, 0, -0.035, 0, 0.078, 1, 1.2, 1);
    tube(arms[i], cloth, -0.12, 0.075, 0.059, 0.24);
    ball(forearms[i], face, 0, 0, 0, 0.05);
    tube(forearms[i], face, -0.115, 0.05, 0.038, 0.23);
    ball(forearms[i], face, 0, -0.255, 0.005, 0.048, 0.8, 1.35, 0.65);
    tube(legs[i], pants, -0.18, 0.092, 0.067, 0.38);
    ball(calves[i], pants, 0, 0, 0, 0.066);
    tube(calves[i], pants, -0.175, 0.063, 0.043, 0.35);
    add(
      new RoundedBoxGeometry(0.135, 0.105, 0.25, 2, 0.035),
      hair,
      calves[i],
      0,
      -0.423,
      0.04,
    );
  }
  add(
    new T.BoxGeometry(0.085, 0.13, 0.01),
    white,
    rootBone,
    -0.085,
    1.18,
    0.127,
  );
  const merged: T.BufferGeometry[] = [],
    mats: T.Material[] = [];
  for (const [mat, gs] of parts) {
    const g = mergeGeometries(gs, false)!;
    gs.forEach((x) => x.dispose());
    merged.push(g);
    mats.push(mat);
  }
  const geometry = mergeGeometries(merged, true)!;
  merged.forEach((g) => g.dispose());
  geometries.add(geometry);
  const skinned = new T.SkinnedMesh(geometry, mats);
  skinned.castShadow = true;
  skinned.receiveShadow = true;
  skinned.frustumCulled = false;
  group.add(skinned);
  group.updateMatrixWorld(true);
  skinned.bind(new T.Skeleton(bones));
  group.scale.setScalar(scale);
  return {
    group,
    limbs: [...arms, ...legs],
    forearms,
    calves,
    head,
    skin: skinned,
  };
}
export function createClinic(name: string, large = false) {
  const root = new T.Group(),
    staticPart = new T.Group();
  root.add(staticPart);
  const plaster = material('#d9d5b9');
  plaster.map = texture('plaster');
  const roofMat = material('#a1b3ad', 0.48, 0.5);
  roofMat.map = texture('metal');
  roofMat.map.repeat.set(3, 1);
  const wood = material('#77684e'),
    trim = material('#437368'),
    dark = material('#132b2c'),
    concrete = material('#b6af97'),
    warm = material('#e3c788');
  const w = large ? 18 : 13;
  box(staticPart, concrete, 0, 0.18, 0, w + 2, 0.36, 8.5, 0.07);
  box(staticPart, plaster, 0, 2.3, -4.4, w, 4.2, 0.22);
  for (const side of [-1, 1])
    box(staticPart, plaster, side * (w / 2 - 0.1), 2.3, -1.5, 0.22, 4.2, 6);
  const openings = [-w * 0.34, 0, w * 0.34];
  let edge = -w / 2;
  for (const x of openings) {
    const width = x === 0 ? 2.24 : 2.54,
      bottom = x === 0 ? 0.36 : 1.28,
      top = x === 0 ? 3.83 : 3.22;
    const left = x - width / 2;
    box(
      staticPart,
      plaster,
      (edge + left) / 2,
      2.3,
      1.5,
      left - edge,
      4.2,
      0.22,
    );
    if (bottom > 0.36)
      box(
        staticPart,
        plaster,
        x,
        (bottom + 0.36) / 2,
        1.5,
        width,
        bottom - 0.36,
        0.22,
      );
    box(staticPart, plaster, x, (4.4 + top) / 2, 1.5, width, 4.4 - top, 0.22);
    edge = x + width / 2;
  }
  box(
    staticPart,
    plaster,
    (edge + w / 2) / 2,
    2.3,
    1.5,
    w / 2 - edge,
    4.2,
    0.22,
  );
  box(staticPart, wood, 0, 4.48, -1.5, w + 1, 0.15, 7.4);
  for (const side of [-1, 1]) {
    const roof = box(
      staticPart,
      roofMat,
      0,
      4.93,
      -1.5 + side * 1.75,
      w + 1.6,
      0.13,
      4.12,
    );
    roof.rotation.x = side * 0.27;
  }
  box(staticPart, concrete, 0, 0.35, 4.8, 6, 0.18, 1);
  box(staticPart, concrete, 0, 0.17, 5.35, 6.5, 0.16, 0.5);
  const panes: T.Mesh[] = [];
  const lightMat = material('#56736b', 0.12, 0.22);
  lightMat.transparent = true;
  lightMat.opacity = 0.15;
  lightMat.depthWrite = false;
  lightMat.emissive.set('#ffe4a5');
  for (const x of [-w * 0.34, 0, w * 0.34]) {
    const ww = x === 0 ? 2.5 : 2.8,
      hh = x === 0 ? 3.4 : 2.2;
    for (const side of [-1, 1]) {
      box(staticPart, trim, x + (side * ww) / 2, 2.25, 1.62, 0.1, hh, 0.16);
      box(staticPart, trim, x, 2.25 + (side * hh) / 2, 1.62, ww, 0.1, 0.16);
    }
    const pane = box(
      root,
      lightMat.clone(),
      x,
      2.25,
      1.62,
      x === 0 ? 2.24 : 2.54,
      x === 0 ? 3.16 : 1.94,
      0.025,
    );
    materials.add(pane.material as T.Material);
    panes.push(pane);
    if (x !== 0) {
      box(staticPart, trim, x, 2.25, 1.68, 0.06, 2.05, 0.06);
      box(staticPart, trim, x, 2.25, 1.68, 2.6, 0.06, 0.06);
    }
  }
  for (const x of [-w * 0.47, w * 0.47, -w * 0.18, w * 0.18]) {
    box(staticPart, plaster, x, 2.05, 3.45, 0.18, 3.7, 0.18);
    box(staticPart, wood, x, 0.9, 3.46, 0.23, 0.12, 0.23);
  }
  const porch = box(staticPart, roofMat, 0, 3.95, 2.65, w + 1, 0.14, 2.4);
  porch.rotation.x = 0.06;
  box(
    staticPart,
    label(name.toUpperCase()),
    0,
    3.75,
    3.9,
    Math.min(w - 1, 11),
    0.55,
    0.035,
  );
  box(staticPart, trim, 0, 5.17, 2, 0.22, 0.8, 0.06);
  box(staticPart, trim, 0, 5.17, 2, 0.72, 0.22, 0.06);
  for (const x of [-w * 0.35, w * 0.35]) {
    box(staticPart, wood, x, 0.62, 2.65, 2.2, 0.12, 0.53);
    for (const dx of [-0.9, 0.9])
      box(staticPart, dark, x + dx, 0.38, 2.65, 0.08, 0.5, 0.4);
  }
  const interior = new T.Group();
  root.add(interior);
  const wall = material('#abb9a0'),
    linen = material('#bdc7b0'),
    frameMat = material('#426158', 0.42, 0.4),
    equipment = material('#ccd3c2', 0.5),
    screen = material('#1c3330');
  const interiorMats = [wall, linen, frameMat, equipment];
  const interiorColors = interiorMats.map((mat) => mat.color.clone());
  box(interior, wall, 0, 2.3, -4.23, w - 0.5, 4, 0.04);
  box(interior, wall, 0, 0.4, -1.3, w - 0.5, 0.09, 5.5);
  for (const side of [-1, 1]) {
    box(interior, wall, side * w * 0.17, 2.3, -1.25, 0.12, 3.9, 5.7);
    const x = side * w * 0.34;
    box(interior, frameMat, x, 0.87, -0.95, 1.7, 0.09, 2.65, 0.03);
    box(interior, linen, x, 1.03, -0.95, 1.6, 0.22, 2.52, 0.07);
    box(interior, linen, x, 1.19, -1.72, 1.25, 0.15, 0.53, 0.07);
    for (const dx of [-0.67, 0.67])
      for (const z of [-1.95, 0.1])
        box(interior, frameMat, x + dx, 0.65, z, 0.07, 0.5, 0.07);
    box(interior, equipment, x + 0.85, 1.25, -2.15, 0.6, 1.5, 0.45, 0.045);
    box(interior, screen, x + 0.85, 1.64, -1.915, 0.43, 0.3, 0.025);
    box(interior, linen, x, 0.98, -0.45, 1.1, 0.15, 0.95, 0.05);
    for (let j = 0; j < 3; j++)
      box(interior, frameMat, x - 0.72, 1.58, -2.1 + j * 0.2, 0.03, 0.08, 0.04);
  }
  box(interior, frameMat, 0, 1.02, -2, 1.8, 0.08, 0.7);
  box(interior, equipment, 0, 1.27, -2, 0.44, 0.42, 0.35, 0.035);
  batch(interior);
  const fan = new T.Group();
  root.add(fan);
  fan.position.set(0, 3.75, -0.2);
  cylinder(root, frameMat, 0, 3.93, -0.2, 0.025, 0.025, 0.32);
  sphere(fan, frameMat, 0, 0, 0, 0.1, 1, 0.6, 1);
  for (let i = 0; i < 3; i++) {
    const blade = box(
      fan,
      linen,
      Math.sin(i * 2.094) * 0.34,
      0,
      Math.cos(i * 2.094) * 0.34,
      0.13,
      0.025,
      0.65,
      0.035,
    );
    blade.rotation.y = i * 2.094;
  }
  batch(fan);
  screen.emissive.set('#70eab2');
  const interiorLights = [
    new T.PointLight('#ffdca0', 0, 11, 2),
    new T.PointLight('#ecf8d9', 0, 11, 2),
    new T.PointLight('#ffdfa8', 0, 9, 2),
  ];
  interiorLights.forEach((light, i) => {
    light.position.set(i === 2 ? 0 : (i ? 1 : -1) * w * 0.34, 3.4, -0.4);
    root.add(light);
  });
  const roofPanels = new T.Group();
  root.add(roofPanels);
  const frame = material('#728987', 0.3, 0.65),
    panel = material('#d1e2e5', 0.25, 0.5);
  panel.map = texture('panel');
  for (let i = 0; i < (large ? 10 : 6); i++) {
    const x = ((i % 5) - 2) * 2;
    const z = -1 + (i >= 5 ? -1.7 : 0);
    const g = new T.Group();
    roofPanels.add(g);
    g.position.set(x, 5.46, z);
    g.rotation.x = 0.27;
    box(g, frame, 0, 0, 0, 1.85, 0.08, 1.4);
    box(g, panel, 0, 0.05, 0, 1.76, 0.01, 1.31);
  }
  batch(roofPanels);
  const battery = new T.Group();
  root.add(battery);
  box(battery, dark, w * 0.48, 1.05, 1.95, 0.85, 1.55, 0.65, 0.045);
  box(battery, warm, w * 0.48, 1.31, 2.29, 0.42, 0.32, 0.02);
  box(battery, trim, w * 0.48, 0.6, 2.3, 0.65, 0.06, 0.02);
  batch(battery);
  const fixture = material('#fff1ba', 0.25);
  fixture.emissive.set('#ffda85');
  const bulbs: T.Mesh[] = [];
  for (const x of [-w * 0.3, w * 0.3])
    bulbs.push(sphere(root, fixture, x, 3.66, 3.4, 0.12));
  const lights = [
    new T.PointLight('#ffe0a0', 0, 28, 2),
    new T.PointLight('#f2f4dc', 0, 24, 2),
  ];
  lights[0].position.set(-3, 3.4, 5);
  lights[1].position.set(3, 3.5, 3);
  lights.forEach((l) => root.add(l));
  // Warm light on the ground remains readable on low graphics too.
  const glowMat = new T.MeshBasicMaterial({
    color: '#f5cf76',
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  materials.add(glowMat);
  const glow = mesh(new T.PlaneGeometry(w + 2, 9), glowMat, root, 0, 0.385, 3);
  glow.rotation.x = -Math.PI / 2;
  glow.castShadow = false;
  batch(staticPart);
  roofPanels.visible = false;
  battery.visible = false;
  return {
    root,
    panes,
    roofPanels,
    battery,
    lights,
    fixture,
    glowMat,
    fan,
    screen,
    interiorMats,
    interiorColors,
    interiorLights,
  };
}
export function disposeArt() {
  for (const x of geometries) x.dispose();
  for (const x of materials) x.dispose();
  for (const x of textures) x.dispose();
  geometries.clear();
  materials.clear();
  textures.clear();
}
