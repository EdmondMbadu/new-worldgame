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
  const ivory = material('#d7d6c3', 0.36, 0.2),
    dark = material('#172327', 0.7, 0.3),
    rubber = material('#171b18', 0.93),
    steel = material('#78827c', 0.32, 0.75),
    glass = material('#243e47', 0.16, 0.45),
    rust = material('#796043', 0.95),
    teal = material('#1e6b62', 0.45),
    seat = material('#473f31');
  box(fixed, dark, 0, 0.03, 0, 1.73, 0.3, 4.15, 0.07);
  box(fixed, ivory, 0, 0.45, 0.15, 1.85, 0.65, 4.3, 0.09);
  box(fixed, ivory, 0, 0.92, 1.3, 1.81, 0.3, 1.12, 0.07);
  box(fixed, ivory, 0, 1.25, 0.08, 1.83, 0.88, 1.86, 0.08);
  box(fixed, ivory, 0, 1.79, 0.11, 1.95, 0.16, 1.97, 0.07);
  box(fixed, glass, 0, 1.37, 1.015, 1.58, 0.61, 0.028);
  box(fixed, glass, 0, 1.38, -0.855, 1.59, 0.56, 0.028);
  for (const side of [-1, 1]) {
    box(fixed, glass, side * 0.932, 1.38, 0.48, 0.02, 0.55, 0.73);
    box(fixed, glass, side * 0.932, 1.38, -0.37, 0.02, 0.55, 0.71);
    box(fixed, ivory, side * 0.95, 1.38, 0.025, 0.028, 0.66, 0.09);
    box(fixed, steel, side * 1.075, 0.98, 0, 0.3, 0.08, 1.7, 0.02);
    box(fixed, dark, side * 1.08, 1.18, 0.79, 0.25, 0.17, 0.14, 0.03);
    for (const z of [-0.41, 0.45])
      box(fixed, dark, side * 0.97, 0.95, z, 0.03, 0.045, 0.16, 0.01);
    box(fixed, ivory, side * 0.87, 0.78, -1.55, 0.12, 0.43, 1.21, 0.03);
    box(fixed, rust, side * 0.94, 0.36, -0.1, 0.025, 0.16, 3.7);
  }
  box(fixed, dark, 0, 0.65, -1.52, 1.52, 0.1, 1.15);
  box(fixed, ivory, 0, 0.78, -2.02, 1.8, 0.45, 0.12, 0.035);
  box(fixed, steel, 0, 0.2, 2.25, 1.95, 0.14, 0.18, 0.04);
  box(fixed, steel, 0, 0.19, -2.25, 1.95, 0.15, 0.2, 0.04);
  box(fixed, dark, 0, 0.68, 2.22, 0.98, 0.26, 0.02);
  for (let i = 0; i < 9; i++)
    box(fixed, steel, (i - 4) * 0.105, 0.68, 2.24, 0.025, 0.2, 0.01);
  box(
    fixed,
    label('LAST LIGHT', '#fbf7df', '#27665b', 512, 120),
    0,
    0.85,
    -2.09,
    1.05,
    0.23,
    0.02,
  );
  const headlights = material('#fff2bd', 0.2);
  headlights.emissive.set('#ffe5a8');
  headlights.emissiveIntensity = 2;
  const tail = material('#731b0e');
  tail.emissive.set('#fc4424');
  tail.emissiveIntensity = 1.2;
  for (const side of [-1, 1]) {
    box(fixed, headlights, side * 0.7, 0.77, 2.24, 0.4, 0.22, 0.035, 0.025);
    box(fixed, tail, side * 0.76, 0.72, -2.095, 0.2, 0.27, 0.03, 0.02);
    box(fixed, teal, side * 0.968, 0.65, 0.47, 0.02, 0.29, 0.37);
  }
  // Visible cab interior and driver silhouette.
  for (const x of [-0.43, 0.43]) {
    box(fixed, seat, x, 1.06, 0.08, 0.5, 0.45, 0.35, 0.06);
    sphere(fixed, material('#754b31'), x, 1.41, 0.15, 0.13, 1, 1.25, 1);
  }
  const steering = cylinder(
    fixed,
    dark,
    -0.43,
    1.04,
    0.59,
    0.21,
    0.21,
    0.04,
    16,
  );
  steering.rotation.x = 1.1;
  batch(fixed);
  const wheels: T.Group[] = [];
  for (const z of [1.25, -1.3])
    for (const x of [-0.96, 0.96]) {
      const g = new T.Group();
      g.position.set(x, -0.4, z);
      root.add(g);
      const tyre = cylinder(g, rubber, 0, 0, 0, 0.43, 0.43, 0.3, 24);
      tyre.rotation.z = Math.PI / 2;
      const hub = cylinder(
        g,
        steel,
        x < 0 ? -0.16 : 0.16,
        0,
        0,
        0.24,
        0.24,
        0.025,
        12,
      );
      hub.rotation.z = Math.PI / 2;
      for (let j = 0; j < 6; j++) {
        const a = (j * Math.PI) / 3;
        sphere(
          g,
          dark,
          x < 0 ? -0.18 : 0.18,
          Math.sin(a) * 0.14,
          Math.cos(a) * 0.14,
          0.028,
        );
      }
      for (let j = 0; j < 20; j++) {
        const a = (j * Math.PI) / 10;
        const tread = box(
          g,
          rust,
          0,
          Math.sin(a) * 0.435,
          Math.cos(a) * 0.435,
          0.28,
          0.05,
          0.07,
        );
        tread.rotation.x = -a;
      }
      batch(g);
      wheels.push(g);
    }
  const cargo = new T.Group();
  root.add(cargo);
  const panelMat = material('#b9d3dc', 0.22, 0.5);
  panelMat.map = texture('panel');
  panelMat.envMapIntensity = 1.2;
  const panel = (parent: T.Group, x: number, y: number, z: number) => {
    box(parent, steel, x, y, z, 1.55, 0.065, 0.94, 0.02);
    box(parent, panelMat, x, y + 0.04, z, 1.47, 0.012, 0.86);
  };
  for (const side of [-1, 1]) {
    box(cargo, steel, side * 0.76, 1.05, -1.5, 0.07, 0.9, 0.08);
    box(cargo, steel, side * 0.76, 1.46, -1.5, 0.08, 0.06, 1.25);
  }
  for (let i = 0; i < 3; i++) panel(cargo, 0, 1.1 + i * 0.105, -1.5);
  for (const x of [-0.54, 0.54])
    box(cargo, rust, x, 1.46, -1.5, 0.06, 0.025, 1.08);
  box(cargo, dark, 0, 0.87, -1.44, 0.64, 0.42, 0.65, 0.04);
  batch(cargo);
  return { root, wheels, cargo, headlights, tail, panelMat };
}
export function createPerson(shirt: string, skin = '#67432d', scale = 1) {
  const group = new T.Group();
  group.scale.setScalar(scale);
  const cloth = material(shirt),
    face = material(skin, 0.92),
    pants = material('#343c36'),
    hair = material('#20231d');
  sphere(group, face, 0, 1.53, 0, 0.13, 1, 1.25, 1);
  sphere(group, hair, 0, 1.63, -0.02, 0.132, 1, 0.55, 1);
  box(group, cloth, 0, 1.17, 0, 0.35, 0.47, 0.23, 0.07);
  const limbs: T.Group[] = [];
  for (const x of [-0.23, 0.23]) {
    const arm = new T.Group();
    group.add(arm);
    arm.position.set(x, 1.35, 0);
    cylinder(arm, cloth, 0, -0.13, 0, 0.075, 0.067, 0.28);
    cylinder(arm, face, 0, -0.36, 0, 0.055, 0.045, 0.22);
    sphere(arm, face, 0, -0.49, 0, 0.058);
    limbs.push(arm);
  }
  for (const x of [-0.105, 0.105]) {
    const leg = new T.Group();
    group.add(leg);
    leg.position.set(x, 0.97, 0);
    cylinder(leg, pants, 0, -0.27, 0, 0.09, 0.065, 0.55);
    box(leg, hair, 0, -0.58, 0.05, 0.13, 0.13, 0.27, 0.035);
    limbs.push(leg);
  }
  return { group, limbs };
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
  box(staticPart, plaster, 0, 2.3, -1.5, w, 4.2, 6, 0.06);
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
  const lightMat = material('#071f23', 0.3, 0.08);
  lightMat.emissive.set('#ffe4a5');
  for (const x of [-w * 0.34, 0, w * 0.34]) {
    box(
      staticPart,
      trim,
      x,
      2.25,
      1.53,
      x === 0 ? 2.5 : 2.8,
      x === 0 ? 3.4 : 2.2,
      0.14,
    );
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
  return { root, panes, roofPanels, battery, lights, fixture, glowMat };
}
export function disposeArt() {
  for (const x of geometries) x.dispose();
  for (const x of materials) x.dispose();
  for (const x of textures) x.dispose();
  geometries.clear();
  materials.clear();
  textures.clear();
}
