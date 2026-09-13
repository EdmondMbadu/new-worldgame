import * as T from 'three';
import { batch, box, geometries, material, materials, textures } from './art';
import type { GameEngine } from './engine';
import { clamp } from './missions';
import type { TrafficCar, TrafficFlow } from './traffic-flow';

function model(pickup: boolean, color: string) {
  const root = new T.Group(),
    fixed = new T.Group();
  root.add(fixed);
  const paint = material(color, 0.36, 0.42),
    dark = material('#172021', 0.9);
  const glass = material('#203641', 0.12, 0.65),
    trim = material('#93a6a5', 0.3, 0.85);
  const dirt = material('#685b46', 0.95),
    lamps = material('#e5e1b4');
  lamps.emissive.set('#fff0c5');
  lamps.emissiveIntensity = 3;
  const brakes = material('#842b22');
  brakes.emissive.set('#ef3223');
  const len = pickup ? 4.4 : 3.9;
  box(fixed, dark, 0, 0.4, 0, 1.74, 0.24, len);
  box(fixed, paint, 0, 0.73, 0, 1.8, 0.58, len, 0.13);
  box(fixed, dirt, 0, 0.48, 0, 1.82, 0.12, len - 0.2);
  const cabinZ = pickup ? 0.45 : -0.12,
    cabinLength = pickup ? 1.75 : 2.15;
  box(fixed, paint, 0, 1.17, cabinZ, 1.62, 0.66, cabinLength, 0.16);
  box(
    fixed,
    glass,
    0,
    1.29,
    cabinZ + cabinLength / 2 + 0.01,
    1.43,
    0.44,
    0.035,
    0.05,
  ).rotation.x = -0.22;
  box(
    fixed,
    glass,
    0,
    1.3,
    cabinZ - cabinLength / 2 - 0.01,
    1.4,
    0.41,
    0.03,
    0.04,
  ).rotation.x = 0.18;
  box(fixed, paint, 0, 1.54, cabinZ, 1.47, 0.08, cabinLength - 0.18, 0.05);
  box(fixed, dark, 0, 0.75, len / 2 + 0.02, 0.78, 0.18, 0.05);
  box(fixed, trim, 0, 0.44, len / 2 + 0.06, 1.82, 0.11, 0.12);
  box(fixed, trim, 0, 0.44, -len / 2 - 0.06, 1.82, 0.11, 0.12);
  for (const side of [-1, 1]) {
    box(
      fixed,
      glass,
      side * 0.813,
      1.31,
      cabinZ,
      0.025,
      0.38,
      cabinLength - 0.26,
      0.025,
    );
    box(fixed, paint, side * 0.833, 1.3, cabinZ + 0.04, 0.03, 0.44, 0.055);
    box(fixed, trim, side * 0.86, 1.02, cabinZ - 0.45, 0.04, 0.045, 0.18);
    box(fixed, dark, side * 1.005, 1.18, cabinZ + 0.7, 0.22, 0.14, 0.25, 0.03);
    box(
      fixed,
      lamps,
      side * 0.66,
      0.86,
      len / 2 + 0.04,
      0.38,
      0.17,
      0.035,
      0.025,
    );
    box(
      fixed,
      brakes,
      side * 0.76,
      0.79,
      -len / 2 - 0.04,
      0.19,
      0.22,
      0.04,
      0.02,
    );
  }
  if (pickup) {
    box(fixed, dark, 0, 1.025, -1.3, 1.38, 0.025, 1.6);
    for (const side of [-1, 1])
      box(fixed, paint, side * 0.81, 1.1, -1.32, 0.16, 0.4, 1.55);
    box(fixed, paint, 0, 1.09, -2.12, 1.8, 0.4, 0.12);
    const sack = material('#a48f63', 0.98);
    for (let i = 0; i < 3; i++)
      box(
        fixed,
        sack,
        i % 2 ? -0.34 : 0.34,
        1.22,
        -1.1 - (i > 1 ? 0.55 : 0),
        0.56,
        0.34,
        0.64,
        0.13,
      );
    box(fixed, dark, 0, 1.43, -1.4, 0.055, 0.035, 1.45);
  }
  batch(fixed);
  const wheelGeometry = new T.CylinderGeometry(0.36, 0.36, 0.24, 12);
  wheelGeometry.rotateZ(Math.PI / 2);
  const hubGeometry = new T.CylinderGeometry(0.18, 0.18, 0.25, 8);
  hubGeometry.rotateZ(Math.PI / 2);
  geometries.add(wheelGeometry);
  geometries.add(hubGeometry);
  const wheels: T.Group[] = [];
  for (const z of [-len * 0.31, len * 0.31])
    for (const x of [-0.9, 0.9]) {
      const wheel = new T.Group();
      wheel.position.set(x, 0.37, z);
      wheel.add(new T.Mesh(wheelGeometry, dark), new T.Mesh(hubGeometry, trim));
      root.add(wheel);
      wheels.push(wheel);
    }
  // Body batching and shared template geometry keep the whole roster inexpensive.
  root.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = true;
  });
  return { root, brakes, wheels };
}

export class TrafficArt {
  group = new T.Group();
  private actors: {
    car: TrafficCar;
    root: T.Group;
    body: T.Object3D;
    wheels: T.Object3D[];
    brakes: T.MeshStandardMaterial;
    spray: T.Points;
  }[] = [];
  private lights: T.SpotLight[] = [];
  constructor(
    flow: TrafficFlow,
    low: boolean,
    private rain: number,
  ) {
    const templates = [
      model(true, '#ad8650'),
      model(false, '#728994'),
      model(false, '#9b4d40'),
    ];
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, 'rgba(246,233,170,0)');
    gradient.addColorStop(0.6, 'rgba(246,233,170,.16)');
    gradient.addColorStop(1, 'rgba(246,233,170,.5)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(64, 0);
    ctx.lineTo(39, 128);
    ctx.lineTo(25, 128);
    ctx.closePath();
    ctx.fill();
    const texture = new T.CanvasTexture(canvas);
    textures.add(texture);
    const poolMat = new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      opacity: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    materials.add(poolMat);
    const poolGeo = new T.PlaneGeometry(6, 16);
    geometries.add(poolGeo);
    const sprayMat = new T.PointsMaterial({
      color: rain > 0.2 ? '#abbcbe' : '#b5a07b',
      size: rain > 0.2 ? 0.14 : 0.22,
      transparent: true,
      opacity: rain > 0.2 ? 0.23 : 0.12,
      depthWrite: false,
    });
    materials.add(sprayMat);
    for (const car of flow.cars) {
      const template = templates[car.kind === 'pickup' ? 0 : (car.id % 2) + 1];
      const root = template.root.clone(true);
      const brakes = template.brakes.clone();
      materials.add(brakes);
      root.traverse((o) => {
        if (o instanceof T.Mesh && o.material === template.brakes)
          o.material = brakes;
      });
      const wheels = root.children.slice(1);
      const pool = new T.Mesh(poolGeo, poolMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(0, 0.07, 10);
      root.add(pool);
      const positions = new Float32Array((low ? 8 : 18) * 3);
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(positions, 3));
      geometries.add(geo);
      const spray = new T.Points(geo, sprayMat);
      spray.frustumCulled = false;
      root.add(spray);
      this.actors.push({
        car,
        root,
        body: root.children[0],
        wheels,
        brakes,
        spray,
      });
      this.group.add(root);
    }
    // Fixed light count avoids shader recompilation as different cars approach.
    for (let i = 0; i < (low ? 1 : 2); i++) {
      const light = new T.SpotLight('#ffe7ad', 0, 42, 0.4, 0.75, 1.5);
      light.castShadow = false;
      this.group.add(light, light.target);
      this.lights.push(light);
    }
  }
  update(e: GameEngine, alpha: number, reducedMotion: boolean) {
    const nearby: { car: TrafficCar; distance: number }[] = [];
    for (const actor of this.actors) {
      const { car, root } = actor,
        a = car.previous,
        b = car.pose;
      const distance = Math.hypot(b.x - e.position.x, b.z - e.position.z);
      root.visible =
        distance < 260 &&
        car.station > -45 &&
        car.station < e.mission.length + 55 &&
        (e.phase === 'ready' || e.phase === 'driving');
      if (!root.visible) continue;
      root.position.set(
        a.x + (b.x - a.x) * alpha,
        a.y + (b.y - a.y) * alpha,
        a.z + (b.z - a.z) * alpha,
      );
      let turn = b.yaw - a.yaw;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      root.rotation.set(
        a.pitch + (b.pitch - a.pitch) * alpha,
        a.yaw + turn * alpha,
        0,
        'YXZ',
      );
      actor.body.position.y =
        e.phase === 'driving' && !reducedMotion
          ? Math.sin(car.wheelSpin * 0.7 + car.id) *
            Math.min(0.024, car.speed * 0.002)
          : 0;
      actor.body.rotation.z = clamp(-turn * car.speed * 1.5, -0.025, 0.025);
      actor.brakes.emissiveIntensity = car.braking ? 3.7 : 0.6;
      actor.wheels.forEach((w) => {
        w.rotation.x = car.wheelSpin;
      });
      actor.spray.visible = car.speed > 3 && distance < 70;
      if (actor.spray.visible) {
        const data = actor.spray.geometry.attributes.position;
        for (let i = 0; i < data.count; i++) {
          const t = (e.elapsed * (this.rain > 0.2 ? 1.7 : 1.1) + i * 0.17) % 1;
          data.setXYZ(
            i,
            (i % 2 ? 1 : -1) * (0.9 + t * 0.5),
            0.15 + Math.sin(t * Math.PI) * 0.38,
            -1.4 - t * Math.min(5, car.speed * 0.5),
          );
        }
        data.needsUpdate = true;
      }
      if (distance < 85) nearby.push({ car, distance });
    }
    nearby.sort((a, b) => a.distance - b.distance);
    this.lights.forEach((light, i) => {
      const car = nearby[i]?.car;
      light.intensity = car ? 38 : 0;
      if (!car) return;
      const p = car.pose;
      light.position.set(
        p.x + Math.sin(p.yaw) * 2,
        p.y + 0.85,
        p.z + Math.cos(p.yaw) * 2,
      );
      light.target.position.set(
        p.x + Math.sin(p.yaw) * 24,
        p.y - Math.sin(p.pitch) * 24,
        p.z + Math.cos(p.yaw) * 24,
      );
    });
  }
}
