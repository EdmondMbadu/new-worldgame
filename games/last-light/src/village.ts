import * as T from 'three';
import { batch, box, cylinder, sphere, label, material } from './art';
import { createStaff } from './staff';
import { heightAt, roadX, type Mission } from './missions';
import { toWorld } from './routes';
import { bendStatic } from './route-art';
import { sceneryLayout, VILLAGE_SIGNS, villageSites } from './scenery-layout';

export class VillageLife {
  group = new T.Group();
  private workers: {
    actor: NonNullable<ReturnType<typeof createStaff>>;
    x: number;
    z: number;
    phase: number;
  }[] = [];
  private lamps: T.MeshStandardMaterial[] = [];
  constructor(
    private m: Mission,
    low: boolean,
  ) {
    const fixed = new T.Group();
    const plaster = ['#c98a5e', '#a8603c', '#ddd2bc'].map((c) => material(c, 0.92));
    const roof = material('#8a6a52', 0.62, 0.4),
      timber = material('#61503c'),
      stone = material('#827c65');
    const trim = material('#2f6f8f'),
      iron = material('#667573', 0.4, 0.55),
      soil = material('#8c8066');
    const warm = material('#dbaa68');
    warm.emissive.set('#e6a756');
    warm.emissiveIntensity = 0.35;
    this.lamps.push(warm);
    const sites = villageSites(m);
    const layout = sceneryLayout(m);
    sites.forEach((z, site) => {
      for (const h of layout.homes.filter((h) => h.site === site)) {
        const house = h.index,
          side = h.side,
          hz = h.z,
          hx = h.x;
        const y = heightAt(m, hx, hz);
        const home = new T.Group();
        home.position.set(hx, y, hz);
        home.rotation.y = h.yaw;
        const width = h.width,
          depth = h.depth,
          wall = plaster[house % 3];
        box(home, stone, 0, -0.3, 0, width + 0.6, 1.2, depth + 0.6);
        box(home, wall, 0, 1.4, 0, width, 2.8, depth, 0.05);
        for (const s of [-1, 1]) {
          const panel = box(
            home,
            roof,
            0,
            3.1,
            s * depth * 0.26,
            width + 0.8,
            0.1,
            depth * 0.58,
          );
          panel.rotation.x = s * 0.27;
          for (let rib = -width / 2; rib < width / 2; rib += 0.42) {
            const line = box(
              home,
              iron,
              rib,
              3.14,
              s * depth * 0.26,
              0.026,
              0.022,
              depth * 0.58,
            );
            line.rotation.x = s * 0.27;
          }
        }
        box(home, trim, 0, 1, -depth / 2 - 0.02, 1, 2, 0.1);
        for (const xx of [-width * 0.3, width * 0.3]) {
          box(home, timber, xx, 1.7, -depth / 2 - 0.04, 1.1, 1.05, 0.08);
          box(home, warm, xx, 1.7, -depth / 2 - 0.09, 0.89, 0.8, 0.025);
          box(home, timber, xx, 1.7, -depth / 2 - 0.115, 0.035, 0.81, 0.02);
          box(home, timber, xx, 1.7, -depth / 2 - 0.115, 0.9, 0.035, 0.02);
        }
        const awning = box(
          home,
          roof,
          0,
          2.65,
          -depth / 2 - 1,
          width + 0.2,
          0.08,
          2.1,
        );
        awning.rotation.x = -0.12;
        for (const xx of [-width / 2 + 0.2, width / 2 - 0.2])
          cylinder(
            home,
            timber,
            xx,
            1.25,
            -depth / 2 - 1.8,
            0.055,
            0.07,
            2.5,
            7,
          );
        for (let step = 0; step < 3; step++)
          box(
            home,
            stone,
            0,
            0.05 + step * 0.12,
            -depth / 2 - 0.6 + step * 0.2,
            1.5,
            0.12,
            0.65,
          );
        cylinder(home, iron, width / 2 + 0.5, 0.6, -1, 0.39, 0.39, 1.2, 14);
        box(home, timber, -width / 2 - 0.7, 0.6, -2.5, 1.5, 0.15, 0.55);
        for (let i = 0; i < 3; i++)
          box(
            home,
            timber,
            -width / 2 - 0.7 + i * 0.5,
            0.3,
            -2.5,
            0.08,
            0.6,
            0.08,
          );
        fixed.add(home);
        // A dirt footpath, gate and drainage gutter connect the home to the road.
        for (let step = 0; step < 10; step++) {
          const px = roadX(m, hz - 5) + side * (6.4 + step * 1.15),
            pz = hz - 5;
          box(
            fixed,
            soil,
            px,
            heightAt(m, px, pz) + 0.035,
            pz,
            1.3,
            0.04,
            1.25,
          );
        }
        for (let i = 0; i < 6; i++) {
          const pz = hz - 6 + i * 2,
            px = roadX(m, pz) + side * 8.7;
          cylinder(
            fixed,
            timber,
            px,
            heightAt(m, px, pz) + 0.5,
            pz,
            0.04,
            0.06,
            1,
            6,
          );
        }
      }
      const side = site % 2 ? 1 : -1,
        x = roadX(m, z) + side * 10.5,
        y = heightAt(m, x, z);
      const well = new T.Group();
      well.position.set(x, y, z);
      cylinder(well, stone, 0, 0.16, 0, 1.2, 1.3, 0.32, 20);
      cylinder(well, trim, 0, 0.9, 0, 0.14, 0.2, 1.5, 10);
      const handle = box(well, iron, 0.4, 1.6, 0, 0.9, 0.06, 0.07);
      handle.rotation.z = -0.25;
      box(well, iron, -0.24, 1.3, 0, 0.45, 0.1, 0.11);
      cylinder(well, iron, -0.55, 0.42, 0, 0.18, 0.14, 0.4, 12);
      for (let j = 0; j < 4; j++)
        sphere(
          well,
          material(j % 2 ? '#aba26a' : '#777743'),
          1.8,
          0.3 + j * 0.15,
          (j % 2) * 0.4,
          0.27,
          1,
          0.8,
          1,
        );
      const sign = box(
        well,
        label(
          VILLAGE_SIGNS[m.id]?.[site] ?? 'WATER POINT',
          '#e5d5af',
          '#46574a',
          512,
          96,
        ),
        0,
        2.7,
        0.3,
        3.2,
        0.6,
        0.07,
      );
      sign.rotation.y = Math.PI;
      for (const dx of [-1.3, 1.3])
        cylinder(well, timber, dx, 1.4, 0.3, 0.045, 0.065, 2.8, 6);
      fixed.add(well);
      for (let i = 0; i < (low ? 1 : 2); i++) {
        const actor = createStaff(i ? '#b8885c' : '#73958d', '#79553d');
        if (!actor) continue;
        const px = x + side * (2 + i * 2),
          pz = z - 4;
        this.group.add(actor.group);
        this.workers.push({ actor, x: px, z: pz, phase: site * 1.5 + i * 3.2 });
      }
      // Far courtyards and warm windows establish depth beyond the immediate verge.
      layout.farHomes
        .filter((f) => f.site === site)
        .forEach((f, i) => {
          const py = heightAt(m, f.x, f.z);
          box(fixed, plaster[i % 3], f.x, py + 1.7, f.z, 5, 3.4, 4);
          box(fixed, roof, f.x, py + 3.5, f.z, 5.5, 0.25, 4.5);
          box(fixed, warm, f.x, py + 2, f.z - 2.05, 0.7, 0.7, 0.06);
        });
    });
    batch(fixed);
    bendStatic(fixed, m);
    this.group.add(fixed);
  }
  private lastClock = 0;
  update(clock: number, player: { x: number; z: number }) {
    for (const w of this.workers) {
      const t = (clock + w.phase) % 18;
      const walk = t < 6 || (t > 9 && t < 15);
      const z = w.z + (t < 6 ? t : t < 9 ? 6 : t < 15 ? 15 - t : 0) * 0.55;
      const p = toWorld(this.m, w.x, z);
      w.actor.group.position.set(p.x, heightAt(this.m, w.x, z), p.z);
      w.actor.group.rotation.y = t > 9 && t < 15 ? Math.PI : 0;
      w.actor.group.visible = Math.hypot(player.x - p.x, player.z - p.z) < 170;
      if (w.actor.group.visible)
        w.actor.animate(
          walk ? 'walk' : 'idle',
          Math.min(0.1, clock - this.lastClock),
        );
    }
    this.lastClock = clock;
  }
  dispose() {
    this.workers.forEach((w) => w.actor.dispose());
  }
}
