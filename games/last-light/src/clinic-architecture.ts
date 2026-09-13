import * as T from 'three';
import { batch, box, cylinder, material } from './art';

/** Authored modular architecture; exported to GLB by scripts/build-clinic-assets.ts. */
export function createClinicArchitecture(id: number) {
  const root = new T.Group();
  root.name = `Clinic_${id}`;
  const wall = material(
    ['#bfb6a0', '#bfbdac', '#aec3bc', '#c9b4a5', '#bbc3ba'][id],
    0.96,
  );
  wall.name = 'Plaster';
  const trim = material(
    ['#356d63', '#4e8075', '#416e82', '#607b72', '#456c69'][id],
  );
  trim.name = 'Trim';
  const stone = material('#7c8277', 0.98);
  stone.name = 'Stone';
  const metal = material('#596d6a', 0.6, 0.45);
  metal.name = 'Roof';
  const frame = material('#c3c7b4', 0.55);
  frame.name = 'Frame';
  const glass = material('#8ca99a', 0.25);
  glass.name = 'WindowGlow';
  glass.emissive.set('#afc6ad');
  glass.emissiveIntensity = 0;
  const dark = material('#1c322e', 0.9);
  dark.name = 'Interior';
  const width = id === 4 ? 18 : 13;
  // A continuous foundation and full-length gutter give the core building depth and weight.
  box(root, stone, 0, 0.08, -0.2, width + 2.5, 0.16, 10);
  for (const x of [-width / 2 - 0.25, width / 2 + 0.25]) {
    cylinder(root, metal, x, 2.1, 1.45, 0.065, 0.065, 4.2, 10);
    const gutter = cylinder(
      root,
      metal,
      0,
      4.05,
      3.85,
      0.09,
      0.09,
      width + 1.4,
      10,
    );
    gutter.rotation.z = Math.PI / 2;
    box(root, stone, x, 0.12, 2.3, 0.8, 0.15, 2.3);
  }
  for (let x = -width / 2 + 0.5; x < width / 2; x += 0.55) {
    const batten = box(root, metal, x, 4.03, 2.6, 0.035, 0.055, 2.5);
    batten.rotation.x = 0.06;
  }
  const wing = (cx: number, cz: number, w: number, d: number, rotation = 0) => {
    const g = new T.Group();
    g.position.set(cx, 0, cz);
    g.rotation.y = rotation;
    root.add(g);
    box(g, stone, 0, 0.18, 0, w + 0.5, 0.36, d + 0.7);
    box(g, wall, 0, 2.05, -d / 2, w, 3.7, 0.22);
    for (const side of [-1, 1])
      box(g, wall, (side * w) / 2, 2.05, 0, 0.22, 3.7, d);
    // True front openings reveal a recessed interior and window frames.
    box(g, wall, 0, 0.82, d / 2, w, 1.3, 0.22);
    box(g, wall, 0, 3.48, d / 2, w, 0.86, 0.22);
    for (const xx of [-w / 2, -w / 4, 0, w / 4, w / 2])
      box(g, wall, xx, 2.3, d / 2, 0.22, 1.66, 0.24);
    box(g, dark, 0, 0.42, 0, w - 0.3, 0.06, d - 0.25);
    for (const xx of [-w * 0.375, -w * 0.125, w * 0.125, w * 0.375]) {
      box(g, glass, xx, 2.3, d / 2 - 0.16, w / 4 - 0.22, 1.65, 0.04);
      box(g, frame, xx, 2.3, d / 2 + 0.05, 0.04, 1.65, 0.08);
      for (const y of [1.47, 3.13])
        box(g, frame, xx, y, d / 2 + 0.05, w / 4 - 0.16, 0.08, 0.12);
      box(g, frame, xx, 1.2, d / 2 - 1.2, 0.8, 0.08, 1.1);
    }
    for (const side of [-1, 1]) {
      const roof = box(
        g,
        metal,
        0,
        4.24,
        side * d * 0.25,
        w + 0.9,
        0.11,
        d * 0.56,
      );
      roof.rotation.x = side * 0.21;
      box(g, frame, (side * w) / 2, 3.99, 0, 0.12, 0.2, d + 0.7);
    }
    for (let z = -d / 2; z < d / 2; z += 0.55)
      box(g, metal, 0, 4.52, z, w + 0.5, 0.035, 0.027);
  };
  const canopy = (x: number, z: number, w: number, d: number) => {
    box(root, stone, x, 0.12, z, w + 0.3, 0.24, d + 0.3);
    box(root, metal, x, 3.25, z, w + 0.6, 0.1, d + 0.6);
    for (const dx of [-w / 2, w / 2])
      for (const dz of [-d / 2, d / 2]) {
        box(root, trim, x + dx, 1.7, z + dz, 0.14, 3.25, 0.14);
        box(root, stone, x + dx, 0.45, z + dz, 0.28, 0.65, 0.28);
      }
    box(root, trim, x, 3.12, z + d / 2, w + 0.35, 0.22, 0.1);
  };
  if (id === 0) {
    canopy(0, 5.25, 4.5, 2.1);
    wing(-8, -2.8, 3.1, 4.2);
  } else if (id === 1) {
    wing(-9, -0.4, 4.6, 9.5);
    wing(9, -1.8, 4.6, 6.8);
    canopy(0, 7.6, 8, 2);
    for (const x of [-4, 4]) box(root, trim, x, 1.4, 5.5, 0.12, 2.7, 4.2);
  } else if (id === 2) {
    wing(-9.3, -2, 5, 7.5);
    canopy(7.8, 3.5, 3.5, 6);
    // An accessible raised walkway slopes onto the original receiving platform.
    const ramp = box(root, stone, 7.8, 0.26, 6.2, 2.9, 0.12, 5.5);
    ramp.rotation.x = 0.075;
    for (const x of [6.4, 9.2]) {
      box(root, frame, x, 1.15, 6.2, 0.06, 0.06, 5.8);
      for (const z of [3.7, 5.4, 7.2, 8.8])
        cylinder(root, frame, x, 0.69, z, 0.03, 0.03, 1.1, 8);
    }
    for (let x = -6; x <= 6; x += 2)
      box(root, stone, x, -0.4, -3.7, 0.65, 1.1, 0.7);
  } else if (id === 3) {
    wing(-9.4, -0.6, 5.2, 9.3);
    canopy(8.5, 2.9, 4.2, 5.2);
    for (const z of [1.3, 3.5]) {
      box(root, frame, 8.5, 0.62, z, 3.4, 0.09, 0.5);
      box(root, trim, 8.5, 1.02, z - 0.2, 3.4, 0.6, 0.07);
    }
  } else {
    wing(-12, -0.4, 5.2, 11);
    wing(12, -1.3, 5.2, 9);
    canopy(0, 6.4, 8, 5.1);
    wing(7.5, -9, 5, 4.5);
  }
  // Water tank, electrical cabinet, conduits and rain drainage belong to every compound.
  const tankX = width / 2 + 3.5;
  box(root, stone, tankX, 0.22, -4.5, 2.7, 0.44, 2.7);
  cylinder(root, trim, tankX, 1.65, -4.5, 1.12, 1.15, 2.6, 24);
  for (let y = 0.55; y < 2.8; y += 0.36) {
    const ring = new T.Mesh(new T.TorusGeometry(1.14, 0.02, 5, 24), metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(tankX, y, -4.5);
    root.add(ring);
  }
  box(root, metal, width * 0.47, 2.13, 1.83, 0.65, 0.8, 0.25, 0.035);
  box(root, frame, width * 0.47, 3.1, 1.86, 0.04, 1.2, 0.04);
  for (let i = 0; i < 4; i++)
    box(root, dark, width * 0.47, 2.12 + i * 0.08, 1.98, 0.35, 0.025, 0.01);
  batch(root);
  return root;
}
