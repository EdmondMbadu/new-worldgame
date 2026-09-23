import * as T from 'three';
import { clamp, smooth } from './missions';

/** Smooth 1D value noise: organic shake instead of a metronomic sine. */
function noise1(t: number, seed: number) {
  const i = Math.floor(t),
    f = t - i;
  const h = (n: number) => {
    const s = Math.sin((n + seed * 57.13) * 127.1) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export type RigInput = {
  dt: number;
  position: T.Vector3;
  heading: number;
  speed01: number;
  lookAhead: T.Vector3;
  portrait: boolean;
  reducedMotion: boolean;
  roadPulse: number;
  impact: number;
  phase: string;
  groundAt: (x: number, z: number) => number;
};

/**
 * A chase camera operated like a person would: it trails the truck's turns,
 * leans slightly into them, absorbs the road with soft noise and jolts on
 * impacts. Before the first input it performs a slow crane-down reveal.
 */
export class CameraRig {
  private yaw = 0;
  private yawVelocity = 0;
  private bank = 0;
  private trauma = 0;
  private time = 0;
  private intro = 0;
  private started = false;
  private introWeight = 1;
  eye = new T.Vector3();
  aim = new T.Vector3();
  roll = 0;
  private ready = false;

  addTrauma(amount: number) {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  update(input: RigInput, camera: T.PerspectiveCamera) {
    const { dt, position: p } = input;
    this.time += dt;
    if (!this.ready) {
      this.yaw = input.heading;
      this.ready = true;
    }
    // Critically damped yaw follow: the camera swings wide in turns, then settles.
    const omega = input.reducedMotion ? 9 : 3.6;
    const error = wrap(input.heading - this.yaw);
    const accel = omega * omega * error - 2 * omega * this.yawVelocity;
    this.yawVelocity += accel * dt;
    this.yaw = wrap(this.yaw + this.yawVelocity * dt);
    const lag = wrap(input.heading - this.yaw);
    const targetBank = input.reducedMotion ? 0 : clamp(-lag * 0.45, -0.055, 0.055) * (0.4 + input.speed01);
    this.bank += (targetBank - this.bank) * (1 - Math.exp(-dt * 4));

    const dir = new T.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const side = new T.Vector3(dir.z, 0, -dir.x);
    const s = input.speed01;
    const dist = input.portrait ? 9.6 : 8.1 + s * 1.2;
    const height = input.portrait ? 4.3 : 2.8 + s * 0.25;
    const chaseEye = p.clone().addScaledVector(dir, -dist).add(new T.Vector3(0, height, 0));
    const chaseAim = input.lookAhead.clone();

    // Opening crane: high over the valley, looking up the road into the light.
    if (input.phase === 'ready' && !input.reducedMotion && !this.started) {
      this.intro += dt;
    } else if (input.phase !== 'ready') this.started = true;
    const introGoal = this.started || input.reducedMotion ? 0 : 1;
    this.introWeight += (introGoal - this.introWeight) * (1 - Math.exp(-dt * (introGoal ? 8 : 1.6)));
    let eye = chaseEye,
      aim = chaseAim;
    if (this.introWeight > 0.001) {
      const t = smooth(0, 9, this.intro);
      const orbit = Math.sin(this.intro * 0.12) * 0.25;
      const heroDir = dir.clone().applyAxisAngle(new T.Vector3(0, 1, 0), orbit);
      const heroSide = new T.Vector3(heroDir.z, 0, -heroDir.x);
      const high = p
        .clone()
        .addScaledVector(heroDir, -26)
        .addScaledVector(heroSide, 16)
        .add(new T.Vector3(0, 24, 0));
      // Settle into the key-art framing: low rear three-quarter, road leading into the light.
      const low = p
        .clone()
        .addScaledVector(heroDir, -7.2)
        .addScaledVector(heroSide, 4.1)
        .add(new T.Vector3(0, 1.75, 0));
      const introEye = high.lerp(low, t);
      const introAim = p
        .clone()
        .addScaledVector(dir, T.MathUtils.lerp(80, 16, t))
        .add(new T.Vector3(0, T.MathUtils.lerp(7, 1.6, t), 0));
      eye = introEye.lerp(chaseEye, 1 - this.introWeight);
      aim = introAim.lerp(chaseAim, 1 - this.introWeight);
    }
    const ground = input.groundAt(eye.x, eye.z);
    eye.y = Math.max(eye.y, ground + 1.6);

    // Road texture: low-amplitude noise; impacts: trauma² shake that decays.
    this.trauma = Math.max(0, this.trauma - dt * 1.35);
    if (!input.reducedMotion) {
      const shake = this.trauma * this.trauma;
      const road = input.roadPulse * 0.05 + s * 0.006;
      const t = this.time;
      eye.x += noise1(t * 11, 1) * road + noise1(t * 23, 4) * shake * 0.35;
      eye.y += noise1(t * 13, 2) * road * 1.2 + noise1(t * 21, 5) * shake * 0.3;
      eye.z += noise1(t * 17, 3) * shake * 0.25;
      aim.addScaledVector(side, noise1(t * 3.1, 9) * 0.08 * s);
      this.roll = this.bank + noise1(t * 19, 6) * shake * 0.035;
    } else this.roll = 0;

    const k = this.eye.lengthSq() === 0 ? 1 : 1 - Math.exp(-dt * (input.reducedMotion ? 12 : 7));
    if (this.eye.lengthSq() === 0) this.eye.copy(eye);
    else this.eye.lerp(eye, k);
    if (this.aim.lengthSq() === 0) this.aim.copy(aim);
    else this.aim.lerp(aim, 1 - Math.exp(-dt * 10));
    camera.position.copy(this.eye);
    camera.lookAt(this.aim);
    if (this.roll) camera.rotateZ(this.roll);
  }

  /** For scripted shots (the clinic restoration) that set eye/aim directly. */
  place(eye: T.Vector3, aim: T.Vector3, dt: number, camera: T.PerspectiveCamera, snappy = false) {
    const k = 1 - Math.exp(-Math.max(dt, 0.001) * (snappy ? 12 : 6));
    if (this.eye.lengthSq() === 0) this.eye.copy(eye);
    else this.eye.lerp(eye, k);
    this.aim.copy(aim);
    camera.position.copy(this.eye);
    camera.lookAt(this.aim);
    this.trauma = Math.max(0, this.trauma - dt);
  }
}
