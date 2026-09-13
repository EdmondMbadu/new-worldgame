import * as T from 'three';
import { batch, box, cylinder, sphere, material, createPerson } from './art';
import { heightAt, roadX, type Mission } from './missions';
import type { Encounter } from './encounters';
import { herdPose } from './traffic';
import { toWorld } from './routes';

export class HerdArt {
  group = new T.Group();
  private goats: { root: T.Group; legs: T.Group[]; head: T.Group }[] = [];
  private herder = createPerson('#d7ad70');
  private lantern: T.MeshStandardMaterial;
  constructor(
    private m: Mission,
    private event: Encounter,
  ) {
    const hoof = material('#302e28'),
      horn = material('#8f8570'),
      collar = material('#718885');
    this.lantern = material('#ffce77', 0.3);
    this.lantern.emissive.set('#ffc678');
    this.lantern.emissiveIntensity = 1.5;
    for (let i = 0; i < 3; i++) {
      const root = new T.Group(),
        fixed = new T.Group(),
        head = new T.Group();
      const coat = material(['#c2b59b', '#8b7561', '#ddd3b6'][i], 0.97);
      const dark = material('#503f31');
      root.add(fixed, head);
      sphere(fixed, coat, 0, 0.69, 0, 0.46, 0.54, 0.83, 1.22);
      sphere(fixed, coat, 0, 0.87, 0.39, 0.25, 0.75, 1.5, 0.8);
      head.position.set(0, 1.11, 0.49);
      sphere(head, coat, 0, 0, 0.08, 0.2, 0.65, 0.93, 1.35);
      sphere(head, dark, 0, -0.075, 0.28, 0.105, 0.95, 0.8, 1);
      for (const side of [-1, 1]) {
        sphere(head, hoof, side * 0.125, 0.035, 0.16, 0.025);
        const ear = sphere(
          head,
          coat,
          side * 0.19,
          -0.015,
          0,
          0.12,
          1.25,
          0.25,
          0.65,
        );
        ear.rotation.z = -side * 0.32;
        const spike = cylinder(
          head,
          horn,
          side * 0.075,
          0.2,
          -0.02,
          0.007,
          0.033,
          0.28,
          7,
        );
        spike.rotation.x = -0.42;
      }
      cylinder(head, dark, 0, -0.21, 0.14, 0.065, 0.006, 0.18, 7);
      cylinder(fixed, collar, 0, 0.98, 0.4, 0.19, 0.19, 0.065, 10);
      sphere(fixed, horn, 0, 0.81, 0.57, 0.055);
      const tail = cylinder(fixed, coat, 0, 0.85, -0.56, 0.06, 0.024, 0.25, 8);
      tail.rotation.x = -0.9;
      const legs: T.Group[] = [];
      for (const z of [-0.36, 0.34])
        for (const x of [-0.15, 0.15]) {
          const leg = new T.Group();
          leg.position.set(x, 0.62, z);
          cylinder(leg, coat, 0, -0.2, 0, 0.065, 0.038, 0.4, 8);
          cylinder(leg, dark, 0, -0.45, 0.025, 0.039, 0.029, 0.22, 7);
          box(leg, hoof, 0, -0.57, 0.045, 0.08, 0.09, 0.14, 0.018);
          batch(leg);
          root.add(leg);
          legs.push(leg);
        }
      batch(fixed);
      batch(head);
      root.scale.setScalar(i === 2 ? 0.76 : 1);
      this.group.add(root);
      this.goats.push({ root, legs, head });
    }
    const station = event.z - 3,
      x = roadX(m, station) - event.side * 7.5;
    const p = toWorld(m, x, station);
    this.herder.group.position.set(p.x, heightAt(m, x, station), p.z);
    this.herder.group.rotation.y = Math.PI;
    this.group.add(this.herder.group);
    const lantern = new T.Group();
    const frame = material('#514c3b');
    cylinder(lantern, frame, 0, 0, 0, 0.14, 0.14, 0.06, 10);
    cylinder(lantern, this.lantern, 0, 0.17, 0, 0.09, 0.09, 0.27, 12);
    cylinder(lantern, frame, 0, 0.34, 0, 0.12, 0.04, 0.08, 10);
    lantern.position.set(
      p.x + event.side * 0.65,
      this.herder.group.position.y + 1,
      p.z,
    );
    const glow = new T.PointLight('#ffbf68', 7, 10, 1.5);
    lantern.add(glow);
    this.group.add(lantern);
    this.update(0);
  }
  update(clock: number) {
    this.goats.forEach((goat, i) => {
      const p = herdPose(this.m, this.event, i);
      goat.root.position.set(
        p.x,
        p.y + (p.walking ? Math.abs(Math.sin(clock * 7 + i)) * 0.015 : 0),
        p.z,
      );
      goat.root.rotation.y = p.heading;
      goat.head.rotation.x = p.walking
        ? Math.sin(clock * 4 + i) * 0.07
        : Math.sin(clock * 0.7 + i) * 0.16;
      goat.legs.forEach(
        (leg, j) =>
          (leg.rotation.x = p.walking
            ? Math.sin(clock * 7 + i + (j === 0 || j === 3 ? 0 : Math.PI)) * 0.4
            : 0),
      );
    });
    this.herder.limbs[0].rotation.z =
      this.event.state === 'clear' ? 1.4 + Math.sin(clock * 4) * 0.12 : 0.6;
    this.herder.forearms[0].rotation.x = -0.4;
    this.lantern.emissiveIntensity = 1.5 + Math.sin(clock * 8) * 0.08;
  }
  dispose() {
    this.herder.skin.skeleton.dispose();
  }
}
