import * as T from 'three';
import { batch, box, createPerson, cylinder, label, material, materials, mesh, sphere, textures } from './art';
import { bendStatic } from './route-art';
import { encounterPose, type Encounter } from './encounters';
import { clamp, heightAt, roadX, roadY, type Mission } from './missions';
import { CREEK_DEPTH, PLANK_CENTRE, PLANK_HALF_WIDTH } from './road-sections';
import { roadWidth, toWorld } from './routes';
import { marketStalls, marketWalkers, slideRocks, walkerOffset, type Walker } from './set-pieces';
import { createStaff } from './staff';

type Figure = {
  group: T.Group;
  animate?: (mode: 'idle' | 'walk', dt: number) => void;
  dispose?: () => void;
};
/** A rigged villager when the character art is loaded, otherwise the built-in figure. */
function figure(shirt: string, skin = '#6d4a33', scale = 1): Figure {
  const actor = createStaff(shirt, skin, scale);
  if (actor) return { group: actor.group, animate: (mode, dt) => actor.animate(mode, dt), dispose: () => actor.dispose() };
  const person = createPerson(shirt, skin, scale);
  return { group: person.group, dispose: () => person.skin.skeleton.dispose() };
}
/** Hand-dyed wax-print cloth: bold stripes and chevrons for the market awnings. */
function printCloth(base: string, a: string, b: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = a;
  for (let y = 0; y < 128; y += 32) g.fillRect(0, y, 128, 9);
  g.fillStyle = b;
  for (let x = -16; x < 144; x += 32) {
    g.beginPath();
    g.moveTo(x, 20);
    g.lineTo(x + 16, 12);
    g.lineTo(x + 32, 20);
    g.lineTo(x + 32, 26);
    g.lineTo(x + 16, 18);
    g.lineTo(x, 26);
    g.fill();
  }
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  textures.add(map);
  const mat = new T.MeshStandardMaterial({ map, roughness: 0.9, side: T.DoubleSide });
  materials.add(mat);
  return mat;
}
/** Moving water with a slow ripple, shared by the creek crossing and the river. */
export function flowingWater(time: { value: number }, color = '#3d6468', opacity = 0.86) {
  const water = material(color, 0.08, 0.15);
  water.transparent = opacity < 1;
  water.opacity = opacity;
  water.envMapIntensity = 1.4;
  water.onBeforeCompile = (shader) => {
    shader.uniforms.flowTime = time;
    shader.vertexShader =
      'varying vec2 flowPosition;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nflowPosition=(modelMatrix*vec4(transformed,1.0)).xz;',
      );
    shader.fragmentShader =
      'uniform float flowTime;\nvarying vec2 flowPosition;\n' +
      shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        float ripple=sin(flowPosition.x*1.7+flowPosition.y*0.9+flowTime*1.9)*0.05+sin(flowPosition.x*4.3-flowPosition.y*3.1-flowTime*2.7)*0.035;
        normal=normalize(normal+vec3(ripple,cos(flowPosition.y*5.0+flowTime*2.1)*0.03,ripple*0.6));`,
      );
  };
  water.customProgramCacheKey = () => 'flowing-water';
  return water;
}
/** A leafy branch laid on the road: the roadside warning triangle of rural Africa. */
function branch(parent: T.Object3D, leaf: T.Material, dark: T.Material, bark: T.Material, x: number, y: number, z: number, yaw: number) {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const stick = cylinder(g, bark, 0, 0.07, 0, 0.03, 0.06, 2.2, 6);
  stick.rotation.z = Math.PI / 2;
  // Twigs fan out from the stem, each ending in a spray of leaves.
  for (let i = 0; i < 5; i++) {
    const along = -0.7 + i * 0.38,
      side = i % 2 ? 1 : -1;
    const twig = cylinder(g, bark, along + 0.18, 0.1, side * 0.28, 0.012, 0.02, 0.7, 5);
    twig.rotation.z = Math.PI / 2;
    twig.rotation.y = side * 0.7;
    for (let k = 0; k < 4; k++) {
      const leafy = mesh(
        new T.ConeGeometry(0.16 + (k % 2) * 0.05, 0.42, 5),
        (i + k) % 3 ? leaf : dark,
        g,
        along + 0.3 + k * 0.1,
        0.12 + (k % 2) * 0.08,
        side * (0.4 + k * 0.1),
      );
      leafy.rotation.set(Math.PI / 2 - 0.25, 0, side * (0.4 + k * 0.5));
      leafy.scale.set(1, 1, 0.35);
    }
  }
  parent.add(g);
  return g;
}
type Walking = { walker: Walker; figure: Figure; offset: number; basket?: T.Object3D };

export class SetPieceArt {
  group = new T.Group();
  private walkers: { event: Encounter; list: Walking[] }[] = [];
  private hazards: T.MeshStandardMaterial[] = [];
  private lanterns: T.MeshStandardMaterial[] = [];
  private figures: Figure[] = [];
  private crowds: { group: T.Group; z: number }[] = [];
  private lastClock = 0;
  constructor(
    private m: Mission,
    events: Encounter[],
    private low: boolean,
    private time: { value: number },
  ) {
    for (const event of events) {
      if (event.kind === 'market') this.market(event);
      if (event.kind === 'lorry') this.lorry(event);
      if (event.kind === 'planks') this.planks(event);
      if (event.kind === 'breakdown') this.breakdown(event);
      if (event.kind === 'landslide') this.landslide(event);
    }
  }
  private lantern(parent: T.Object3D, x: number, y: number, z: number, light = true) {
    const glass = material('#ffd58a', 0.3);
    glass.emissive.set('#ffb95c');
    glass.emissiveIntensity = 1.6;
    this.lanterns.push(glass);
    const frame = material('#3f3a30');
    cylinder(parent, frame, x, y + 0.2, z, 0.1, 0.1, 0.04, 8);
    cylinder(parent, glass, x, y + 0.08, z, 0.07, 0.07, 0.2, 10);
    if (light && !this.low) {
      const glow = new T.PointLight('#ffbf6b', 6, 11, 1.6);
      glow.position.set(x, y + 0.1, z);
      parent.add(glow);
    }
  }
  /** A hand-painted board on a post, set back from the road ahead of a hazard. */
  private roadSign(z: number, text: string, side = 1) {
    const g = new T.Group();
    const x = roadX(this.m, z) + side * (roadWidth(this.m, z) + 2.6),
      y = heightAt(this.m, x, z);
    cylinder(g, material('#625943'), x, y + 1, z, 0.05, 0.06, 2, 6);
    const board = box(g, label(text, '#f1ddb4', '#5b5237', 768, 160), x, y + 2, z, 3.5, 0.7, 0.08);
    board.rotation.y = Math.PI;
    batch(g);
    bendStatic(g, this.m);
    this.group.add(g);
  }
  private market(event: Encounter) {
    const m = this.m;
    const fixed = new T.Group();
    const crowd = new T.Group();
    this.group.add(crowd);
    this.crowds.push({ group: crowd, z: event.z });
    const timber = material('#6b5238'),
      table = material('#8d6a45'),
      cloth = [
        printCloth('#c4552a', '#f0c24a', '#1f6f73'),
        printCloth('#1f6f73', '#f2e3b5', '#d1462f'),
        printCloth('#e0a43b', '#7b2e5c', '#2a4f86'),
        printCloth('#7b2e5c', '#f0c24a', '#3d8a5a'),
      ],
      produce = ['#b8321f', '#e0a531', '#8fae3f', '#d9c7a1', '#5a3a26', '#c8672f'].map((c) => material(c, 0.7)),
      basin = material('#b9c3c0', 0.35, 0.6),
      sack = material('#cdbb95', 0.95),
      charcoal = material('#26221f', 0.95);
    let lit = 0;
    for (const stall of marketStalls(m).filter((s) => Math.abs(s.z - event.z) < event.length / 2 + 3)) {
      const g = new T.Group();
      g.position.set(stall.x, heightAt(m, stall.x, stall.z), stall.z);
      g.rotation.y = -stall.side * (Math.PI / 2);
      const w = stall.hz * 2,
        d = stall.hx * 2,
        h = stall.height;
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) cylinder(g, timber, sx * (w / 2 - 0.08), h / 2, sz * (d / 2 - 0.08), 0.045, 0.055, h, 6);
      box(g, table, 0, 0.82, 0.15, w - 0.15, 0.07, d * 0.72);
      box(g, timber, 0, 0.42, 0.15, w - 0.3, 0.05, d * 0.6);
      if (stall.hue > 0.82) {
        // A bright parasol instead of an awning.
        cylinder(g, timber, 0, h / 2 + 0.4, 0.2, 0.03, 0.03, h + 0.8, 6);
        const shade = mesh(new T.ConeGeometry(1.7, 0.55, 12, 1, true), cloth[Math.floor(stall.hue * 17) % 4], g, 0, h + 0.75, 0.2);
        shade.castShadow = true;
      } else {
        const awning = box(g, cloth[Math.floor(stall.hue * 4) % 4], 0, h + 0.05, 0.25, w + 0.5, 0.03, d + 0.9);
        awning.rotation.x = 0.16;
      }
      // Goods laid out on a cloth beside the stall.
      if (stall.hue < 0.35) {
        box(g, cloth[(Math.floor(stall.hue * 9) + 1) % 4], w / 2 + 0.95, 0.02, -0.1, 1.3, 0.02, 1.1);
        for (let k = 0; k < 5; k++) sphere(g, produce[(k + 2) % produce.length], w / 2 + 0.6 + (k % 3) * 0.3, 0.1, -0.35 + Math.floor(k / 3) * 0.45, 0.13, 1, 0.8, 1);
      }
      // Goods: pyramids of fruit, basins of cassava, a sack of charcoal.
      for (let i = 0; i < 7; i++) {
        const px = -w / 2 + 0.3 + (i / 6) * (w - 0.6);
        const mat = produce[(i + Math.floor(stall.hue * 10)) % produce.length];
        if (i % 3 === 1) {
          cylinder(g, basin, px, 0.93, 0.25, 0.24, 0.18, 0.14, 12);
          for (let k = 0; k < 3; k++) sphere(g, mat, px + (k - 1) * 0.09, 1.02, 0.25 + (k % 2) * 0.06, 0.08);
        } else for (let k = 0; k < 4; k++) sphere(g, mat, px + (k % 2) * 0.1 - 0.05, 0.92 + Math.floor(k / 2) * 0.09, 0.2 + (k % 2) * 0.08, 0.07);
      }
      const s = sphere(g, stall.hue > 0.5 ? sack : charcoal, w / 2 + 0.25, 0.32, 0.55, 0.3, 1, 1.2, 1);
      s.rotation.z = 0.2;
      // Every lit lantern costs light on every surface: two glow for real, the rest are emissive.
      if (stall.hue > 0.55) this.lantern(g, 0, h - 0.35, 0.4, stall.hue > 0.8 && lit++ < 2);
      fixed.add(g);
      if (this.low && stall.hue < 0.6) continue;
      // Vendors stand behind their tables; shoppers browse in front.
      const people: [number, number, number][] = [[stall.side * 0.55, 0, -stall.side * (Math.PI / 2) + (stall.hue - 0.5) * 0.4]];
      if (stall.hue > 0.45 && !this.low) people.push([-stall.side * 1.15, (stall.hue - 0.7) * 2, stall.side * (Math.PI / 2) + (stall.hue - 0.5)]);
      people.forEach(([across, along, yaw], k) => {
        const shirt = ['#c4552a', '#2f6f8f', '#e0a43b', '#7b2e5c', '#e9e2cf', '#3d8a5a'][Math.floor(stall.hue * 13 + k * 3) % 6];
        const person = createPerson(shirt, k ? '#5a3b28' : '#6d4a33', k && stall.hue > 0.9 ? 0.72 : 0.97);
        const px = stall.x + across,
          pz = stall.z + along;
        const w0 = toWorld(m, px, pz);
        person.group.position.set(w0.x, heightAt(m, px, pz), w0.z);
        person.group.rotation.y = yaw;
        person.limbs[0].rotation.x = k ? -0.25 : -0.5;
        person.limbs[1].rotation.x = k ? 0.1 : -0.35;
        // Standing figures never move: let the camera and shadow passes cull them.
        person.group.updateMatrixWorld(true);
        person.skin.computeBoundingSphere();
        person.skin.frustumCulled = true;
        crowd.add(person.group);
        this.figures.push({ group: person.group, dispose: () => person.skin.skeleton.dispose() });
      });
    }
    // A painted banner welcomes the road into the market.
    const z0 = event.z - event.length / 2 - 5;
    const span = roadWidth(m, z0) + 3.6;
    for (const side of [-1, 1]) {
      const x = roadX(m, z0) + side * span;
      cylinder(fixed, timber, x, heightAt(m, x, z0) + 2.9, z0, 0.08, 0.1, 5.8, 7);
    }
    const banner = box(fixed, label('MARCHÉ · MARKET DAY · WALKING PACE', '#f4e6c4', '#8c3a22', 1024, 120), roadX(m, z0), roadY(m, z0) + 5.2, z0, span * 2 - 0.4, 0.7, 0.05);
    banner.rotation.y = Math.PI;
    batch(fixed);
    bendStatic(fixed, m);
    this.group.add(fixed);
    const list: Walking[] = [];
    const shirts = ['#d1462f', '#2a6f86', '#e7b441', '#6f3b6e', '#3d8a5a', '#e9e2cf'];
    for (const walker of marketWalkers(event, this.low ? 3 : 6)) {
      const f = figure(shirts[walker.shirt % shirts.length], walker.shirt % 3 ? '#6d4a33' : '#5a3b28', walker.shirt === 4 ? 0.8 : 1);
      let basket: T.Object3D | undefined;
      if (walker.shirt % 2 === 0) {
        basket = new T.Group();
        cylinder(basket, basin, 0, 0, 0, 0.28, 0.2, 0.14, 12);
        for (let k = 0; k < 4; k++) sphere(basket, produce[(walker.shirt + k) % produce.length], (k % 2) * 0.12 - 0.06, 0.1, Math.floor(k / 2) * 0.12 - 0.06, 0.08);
        basket.position.y = 1.86;
        f.group.add(basket);
      }
      crowd.add(f.group);
      this.figures.push(f);
      list.push({ walker, figure: f, offset: walker.lane * (roadWidth(m, walker.z) + 1.1), basket });
    }
    this.walkers.push({ event, list });
    this.roadSign(event.z - event.length / 2 - 95, 'MARKET AHEAD · SLOW DOWN', 1);
  }
  /** A heavily loaded lorry sunk to its rear axle; its crew digs and pushes. */
  private lorry(event: Encounter) {
    const m = this.m;
    const pose = encounterPose(m, event);
    const g = new T.Group(),
      fixed = new T.Group();
    g.add(fixed);
    const cab = material('#2f5d7c', 0.55, 0.2),
      rust = material('#7c4a2e', 0.9),
      dark = material('#1f2421', 0.9),
      glass = material('#23373a', 0.15, 0.4),
      timber = material('#7a5b3a'),
      sackA = material('#d8c9a3', 0.95),
      sackB = material('#8f7b58', 0.95),
      jerry = material('#e1b12c', 0.6),
      mud = material('#4a2c1c', 0.6);
    // Chassis, cab and a timber-sided bed.
    box(fixed, dark, 0, 0.72, 0, 1.6, 0.3, 7);
    box(fixed, cab, 0, 1.75, 2.55, 2.36, 1.9, 1.9, 0.12);
    box(fixed, glass, 0, 2.15, 3.51, 2.0, 0.75, 0.04);
    box(fixed, dark, 0, 1.0, 3.55, 2.3, 0.35, 0.12);
    box(fixed, rust, 0, 1.12, -0.95, 2.44, 0.2, 4.9);
    for (const side of [-1, 1]) {
      box(fixed, timber, side * 1.2, 1.7, -0.95, 0.08, 1.0, 4.9);
      box(fixed, glass, side * 1.19, 2.2, 2.7, 0.03, 0.55, 0.9);
    }
    box(fixed, timber, 0, 1.7, -3.38, 2.44, 1.0, 0.08);
    // Overloaded: sacks of charcoal and flour piled above the cab, jerrycans lashed on.
    for (let i = 0; i < 26; i++) {
      const row = Math.floor(i / 6),
        col = i % 6;
      const s = sphere(fixed, i % 3 ? sackA : sackB, -0.9 + (col % 3) * 0.9 + (row % 2) * 0.3, 2.3 + row * 0.42, -3 + Math.floor(col / 3) * 1.1 + (i % 4) * 0.55, 0.52, 1.05, 0.6, 1.25);
      s.rotation.y = i * 0.7;
    }
    for (let i = 0; i < 4; i++) box(fixed, jerry, -1.3, 1.6, -2.8 + i * 0.5, 0.18, 0.45, 0.32, 0.03);
    const tyres: [number, number][] = [
      [2.45, 0],
      [-1.9, -0.26],
      [-3.0, -0.3],
    ];
    for (const [z, sink] of tyres)
      for (const x of [-1.1, 1.1]) {
        const wheel = cylinder(fixed, dark, x, 0.55 + sink, z, 0.55, 0.55, 0.36, 20);
        wheel.rotation.z = Math.PI / 2;
      }
    // Churned mud thrown up around the rear axle.
    for (let i = 0; i < 9; i++) sphere(fixed, mud, (i % 3 - 1) * 1.1, 0.05, -2.4 + Math.floor(i / 3) * 0.7, 0.45, 1.6, 0.25, 1.1);
    batch(fixed);
    // Sunk on the soft side: the whole lorry leans into the mud.
    const lean = new T.Group();
    lean.rotation.order = 'YXZ';
    lean.rotation.z = -event.side * 0.1;
    lean.rotation.x = -0.045;
    lean.add(g);
    lean.position.set(pose.x, pose.y - 0.1, pose.z);
    lean.rotation.y = pose.heading;
    this.group.add(lean);
    // The crew: one digs, two push from behind.
    const crew = [
      { along: -4.1, across: 0.5, face: 0, shirt: '#b8883e' },
      { along: -4.1, across: -0.6, face: 0, shirt: '#e9e2cf' },
      { along: -1.6, across: -2.0 * event.side, face: Math.PI / 2, shirt: '#3d6f8a' },
    ];
    const heading = pose.heading;
    for (const c of crew) {
      const person = createPerson(c.shirt, '#5d3e2a');
      const dx = Math.sin(heading) * c.along + Math.cos(heading) * c.across,
        dz = Math.cos(heading) * c.along - Math.sin(heading) * c.across;
      person.group.position.set(pose.x + dx, pose.y, pose.z + dz);
      person.group.rotation.y = heading + c.face;
      person.limbs[0].rotation.x = -1.3;
      person.limbs[1].rotation.x = -1.2;
      person.forearms[0].rotation.x = -0.3;
      this.group.add(person.group);
      this.figures.push({ group: person.group, dispose: () => person.skin.skeleton.dispose() });
    }
    this.roadSign(event.z - 110, 'LORRY STUCK · ONE LANE', 1);
  }
  /** Two timber runners over a creek, with the water running beneath them. */
  private planks(event: Encounter) {
    const m = this.m;
    const fixed = new T.Group();
    const wood = material('#8a6a45', 0.85),
      old = material('#6e5436', 0.9),
      stone = material('#7d766a', 0.9),
      reed = material('#8a9a4a', 0.9);
    const reflector = material('#f2ce7d');
    reflector.emissive.set('#bb954e');
    reflector.emissiveIntensity = 0.7;
    const a = event.z - event.length / 2 - 1.8,
      b = event.z + event.length / 2 + 1.8;
    for (const side of [-1, 1]) {
      const centre = side * PLANK_CENTRE;
      // Three boards per runner, laid end to end in 4 m lengths.
      for (let z = a; z < b - 0.1; z += 4) {
        const len = Math.min(4, b - z) - 0.06;
        for (const k of [-1, 0, 1]) {
          const x = roadX(m, z + len / 2) + centre + k * (PLANK_HALF_WIDTH * 0.66);
          // Each board follows the grade of the deck beneath it.
          const y0 = heightAt(m, x, z),
            y1 = heightAt(m, x, z + len);
          const board = box(fixed, (k + Math.round(z)) % 2 ? wood : old, x, (y0 + y1) / 2 + 0.005, z + len / 2, PLANK_HALF_WIDTH * 0.62, 0.1, len);
          board.rotation.x = -Math.atan2(y1 - y0, len);
        }
      }
      for (const z of [a + 0.4, event.z, b - 0.4]) {
        const x = roadX(m, z) + centre;
        box(fixed, old, x, roadY(m, z) - 0.1, z, 1.5, 0.22, 0.3);
      }
      for (const z of [a - 0.6, b + 0.6]) {
        const x = roadX(m, z) + side * (PLANK_CENTRE + PLANK_HALF_WIDTH + 0.45);
        cylinder(fixed, old, x, roadY(m, z) + 0.6, z, 0.05, 0.06, 1.2, 6);
        box(fixed, reflector, x, roadY(m, z) + 1.1, z, 0.16, 0.2, 0.07);
      }
    }
    // Stones and reeds in the creek bed.
    for (let i = 0; i < 26; i++) {
      const x = (((i * 37) % 23) - 11.5) * 1.02,
        z = event.z + (((i * 53) % 13) / 13 - 0.5) * (event.length - 2);
      if (Math.abs(Math.abs(x) - PLANK_CENTRE) < 0.9) continue;
      const bx = roadX(m, z) + x;
      const r = sphere(fixed, stone, bx, heightAt(m, bx, z) + 0.05, z, 0.18 + (i % 4) * 0.07, 1.3, 0.55, 1);
      r.rotation.y = i;
    }
    for (let i = 0; i < 40; i++) {
      const side = i % 2 ? 1 : -1;
      const x = side * (8.5 + (i % 5) * 0.6),
        z = event.z + ((i * 29) % 17) / 17 * event.length - event.length / 2;
      const bx = roadX(m, z) + x;
      const stem = cylinder(fixed, reed, bx, heightAt(m, bx, z) + 0.55, z, 0.012, 0.02, 1.1, 4);
      stem.rotation.z = (i % 3 - 1) * 0.15;
    }
    batch(fixed);
    bendStatic(fixed, m);
    this.group.add(fixed);
    // The creek surface spans the gully across the road.
    const positions: number[] = [],
      indices: number[] = [];
    const cols = 13,
      rows = Math.ceil(event.length + 2);
    for (let j = 0; j <= rows; j++) {
      const z = event.z - event.length / 2 - 1 + j;
      for (let i = 0; i < cols; i++) {
        const x = roadX(m, z) - 12 + (24 * i) / (cols - 1);
        const w = toWorld(m, x, z);
        positions.push(w.x, roadY(m, z) - CREEK_DEPTH * 0.62, w.z);
        if (i < cols - 1 && j < rows) {
          const k = j * cols + i;
          indices.push(k, k + cols, k + 1, k + 1, k + cols, k + cols + 1);
        }
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const creek = flowingWater(this.time, '#2f3322', 0.93);
    creek.roughness = 0.34;
    creek.envMapIntensity = 0.35;
    const surface = mesh(geo, creek, this.group);
    surface.castShadow = false;
  }
  /** A broken-down truck at night: bonnet up, hazards flashing, branches on the road. */
  private breakdown(event: Encounter) {
    const m = this.m;
    const pose = encounterPose(m, event);
    const g = new T.Group(),
      fixed = new T.Group();
    g.add(fixed);
    const paint = material('#b0482d', 0.6, 0.15),
      canvas = material('#4f5a44', 0.95),
      dark = material('#1f2421', 0.9),
      glass = material('#23373a', 0.15, 0.4),
      metal = material('#8c988c', 0.35, 0.6);
    box(fixed, dark, 0, 0.55, 0, 1.7, 0.28, 5.2);
    box(fixed, paint, 0, 1.35, 1.75, 2.0, 1.35, 1.6, 0.1);
    box(fixed, glass, 0, 1.7, 2.56, 1.7, 0.6, 0.04);
    box(fixed, paint, 0, 0.95, -0.9, 2.04, 0.18, 3.5);
    box(fixed, canvas, 0, 1.65, -0.9, 2.0, 1.25, 3.4, 0.2);
    // The bonnet stands open at the front.
    const bonnet = box(fixed, paint, 0, 1.55, 2.95, 1.8, 0.05, 0.9);
    bonnet.rotation.x = -1.05;
    bonnet.position.y = 2.0;
    for (const [z] of [[1.9], [-1.8]])
      for (const x of [-0.95, 0.95]) {
        const wheel = cylinder(fixed, dark, x, 0.45, z, 0.45, 0.45, 0.3, 18);
        wheel.rotation.z = Math.PI / 2;
      }
    box(fixed, metal, 0, 0.55, 2.62, 2.0, 0.15, 0.1);
    for (const [x, z] of [
      [-0.85, 2.58],
      [0.85, 2.58],
      [-0.9, -2.62],
      [0.9, -2.62],
    ]) {
      const hazard = material('#f2a23f');
      hazard.emissive.set('#ffa431');
      this.hazards.push(hazard);
      box(fixed, hazard, x, 0.95, z, 0.2, 0.14, 0.05);
    }
    batch(fixed);
    g.position.set(pose.x, pose.y, pose.z);
    g.rotation.y = pose.heading;
    this.group.add(g);
    // The driver waits by the verge with a lantern.
    const driver = createPerson('#d6c28f', '#5d3e2a');
    const heading = pose.heading;
    const off = -event.side * 1.6;
    driver.group.position.set(pose.x + Math.cos(heading) * off + Math.sin(heading) * 3.8, pose.y, pose.z - Math.sin(heading) * off + Math.cos(heading) * 3.8);
    driver.group.rotation.y = heading;
    driver.limbs[1].rotation.x = -0.9;
    this.group.add(driver.group);
    this.figures.push({ group: driver.group, dispose: () => driver.skin.skeleton.dispose() });
    const lamp = new T.Group();
    this.lantern(lamp, 0, 0, 0);
    lamp.position.copy(driver.group.position).add(new T.Vector3(Math.cos(heading) * 0.5, 1.0, -Math.sin(heading) * 0.5));
    this.group.add(lamp);
    // Branches in the closed lane, 20 m and 40 m before the truck and just after it.
    const leaf = material('#46732c', 0.8),
      deep = material('#2f5220', 0.85),
      bark = material('#5a4533');
    const branches = new T.Group();
    for (const [dz, across] of [
      [-42, 2.2],
      [-24, 2.4],
      [-23, 1.4],
      [16, 2.3],
    ] as const) {
      const z = event.z + dz,
        x = roadX(m, z) - event.side * across;
      branch(branches, leaf, deep, bark, x, heightAt(m, x, z) + 0.02, z, 1.2 + dz);
    }
    batch(branches);
    bendStatic(branches, m);
    this.group.add(branches);
    this.roadSign(event.z - 110, 'BREAKDOWN AHEAD · SLOW', 1);
  }
  /** Fresh earth, fallen rock and an uprooted tree across half the road. */
  private landslide(event: Encounter) {
    const m = this.m;
    const fixed = new T.Group();
    const stone = material('#7d6c5b', 0.88),
      stoneDark = material('#56493d', 0.9),
      earth = material('#6a3a24', 0.95),
      bark = material('#5b4431', 0.95),
      leaf = material('#3a5f28', 0.85),
      root = material('#4a2f1f', 0.95),
      orange = material('#cf8240'),
      pale = material('#e8e0c8');
    const reflector = material('#f2ce7d');
    reflector.emissive.set('#bb954e');
    reflector.emissiveIntensity = 0.7;
    slideRocks(m).forEach((r, i) => {
      const rock = mesh(new T.IcosahedronGeometry(r.radius, 1), i % 3 ? stone : stoneDark, fixed, r.x, r.y, r.z);
      rock.scale.set(1.1 + (i % 3) * 0.15, 0.75 + (i % 4) * 0.08, 1 + (i % 2) * 0.2);
      rock.rotation.set(i, i * 1.7, i * 0.3);
    });
    // Clods of wet earth and gravel spill toward the passage.
    for (let i = 0; i < 34; i++) {
      const z = event.z + ((i * 0.618) % 1 - 0.5) * (event.length + 4),
        lateral = -(0.2 + ((i * 0.377) % 1) * 5.5);
      const x = roadX(m, z) + lateral * event.side;
      const clod = sphere(fixed, i % 4 ? earth : stoneDark, x, heightAt(m, x, z) + 0.04, z, 0.12 + (i % 5) * 0.06, 1.3, 0.6, 1);
      clod.rotation.y = i;
    }
    // An uprooted tree lies across the debris on the closed side.
    const tz = event.z + 3,
      tx = roadX(m, tz) - event.side * 3.2;
    const trunk = cylinder(fixed, bark, tx, heightAt(m, tx, tz) + 0.5, tz, 0.26, 0.36, 8.5, 10);
    trunk.rotation.x = Math.PI / 2;
    trunk.rotation.z = event.side * 0.5;
    const rootPlate = cylinder(fixed, root, tx - event.side * 2.1, heightAt(m, tx, tz) + 0.9, tz - 3.6, 1.2, 1.3, 0.35, 12);
    rootPlate.rotation.x = Math.PI / 2 - 0.3;
    for (let i = 0; i < 7; i++) {
      const lz = tz + 2.5 + i * 0.6,
        lx = tx + event.side * (1.2 + (i % 3) * 0.5);
      sphere(fixed, leaf, lx, heightAt(m, lx, lz) + 0.9 + (i % 2) * 0.4, lz, 0.9 + (i % 3) * 0.2, 1.2, 0.8, 1.1);
    }
    // Marker posts trace the edge of the open passage.
    for (let z = event.z - event.length / 2 - 2; z <= event.z + event.length / 2 + 2; z += 3.5) {
      const x = roadX(m, z) + event.side * 0.35;
      const y = heightAt(m, x, z);
      cylinder(fixed, orange, x, y + 0.55, z, 0.045, 0.05, 1.1, 6);
      box(fixed, pale, x, y + 0.75, z, 0.1, 0.14, 0.1);
      box(fixed, reflector, x, y + 1.02, z, 0.13, 0.16, 0.06);
    }
    batch(fixed);
    bendStatic(fixed, m);
    this.group.add(fixed);
    this.roadSign(event.z - 115, 'LANDSLIDE · CRAWL THROUGH', event.side);
  }
  update(truck: { x: number; z: number; station: number; speed: number }, clock: number) {
    const dt = clamp(clock - this.lastClock, 0, 0.1);
    this.lastClock = clock;
    const flash = Math.sin(clock * 5.2) > 0 ? 3.2 : 0.05;
    this.hazards.forEach((h) => (h.emissiveIntensity = flash));
    this.lanterns.forEach((l, i) => (l.emissiveIntensity = 1.5 + Math.sin(clock * 7 + i) * 0.1));
    const m = this.m;
    // The market's people are only drawn while the truck is near.
    for (const crowd of this.crowds) crowd.group.visible = Math.abs(truck.station - crowd.z) < 260;
    for (const { event, list } of this.walkers) {
      const near = Math.abs(truck.station - event.z) < 260;
      for (const w of list) {
        if (!near) continue;
        const width = roadWidth(m, w.walker.z);
        const edge = width + 1.1;
        const plan = walkerOffset(w.walker, clock, width);
        // Crossing is allowed while the market is calm; nobody steps out in
        // front of a truck that is moving up to their lane or standing in it.
        const blocked =
          (event.entered && event.state !== 'crossing') ||
          Math.abs(truck.station - w.walker.z) < 4.5 ||
          (truck.station > w.walker.z - 16 &&
            truck.station < w.walker.z &&
            Math.abs(truck.speed) > 0.3);
        const onRoad = Math.abs(w.offset) < edge - 0.05;
        let target = plan.offset;
        if (blocked) target = onRoad ? Math.sign(w.offset - 0 || w.walker.lane) * edge : w.offset;
        const pace = blocked ? 2.6 : 1.25;
        const step = clamp(target - w.offset, -pace * dt, pace * dt);
        w.offset += step;
        const moving = Math.abs(step) > 0.2 * dt;
        const x = roadX(m, w.walker.z) + w.offset;
        const p = toWorld(m, x, w.walker.z);
        w.figure.group.position.set(p.x, heightAt(m, x, w.walker.z), p.z);
        const facing = moving ? Math.sign(step) : plan.facing;
        w.figure.group.rotation.y = facing > 0 ? Math.PI / 2 : -Math.PI / 2;
        w.figure.animate?.(moving ? 'walk' : 'idle', dt);
        if (w.basket) w.basket.rotation.y = Math.sin(clock * 3) * 0.05;
      }
    }
  }
  dispose() {
    this.figures.forEach((f) => f.dispose?.());
  }
}
