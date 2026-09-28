import * as T from 'three';
import { batch, box, createPerson, cylinder, material } from './art';
import { createStaff, type StaffParts } from './staff';

/** Where the care room sits in clinic-local space (the centre room behind the main door). */
export const CARE_ROOM = {
  door: new T.Vector3(0, 2, 1.5),
  patient: new T.Vector3(0.8, 1.3, -3.05),
  bedside: new T.Vector3(-0.15, 1.35, -3.3),
  ceiling: new T.Vector3(0, 4.12, -2.5),
};

export type CareLight = {
  /** 0 = reserve exhausted, 1 = reserve lamp steady. */
  reserve: number;
  /** 0 = no mains power, 1 = the solar battery is carrying the room. */
  power: number;
  /** Seconds since the power arrived; drives the start-up flicker. */
  since: number;
  /** The inverter, monitor and fridge wake in order after the lights. */
  devices: number;
};

type Figure = {
  group: T.Group;
  update(dt: number, t: number): void;
  dispose(): void;
};

/**
 * One fictional care room shared by the opening and the arrival: a resting
 * patient, a clinician at the bedside, a companion, the reserve lamp, and the
 * equipment that power brings back. Built in clinic-local coordinates.
 */
export function createClinicCare(chapter: number, width = 13) {
  const root = new T.Group();
  const furniture = new T.Group();
  const half = width * 0.17 - 0.12;
  const floor = 0.445;
  const metal = material('#8b9a95', 0.45, 0.55),
    steel = material('#c5ccc6', 0.35, 0.5),
    linen = material('#e4e2d4', 0.9),
    sheet = material(chapter === 4 ? '#8ea2b6' : '#86a79d', 0.95),
    wood = material('#7a5d42', 0.8),
    enamel = material('#e8e9e1', 0.4),
    tile = material('#b7b19b', 0.85),
    dark = material('#1c2a29', 0.7),
    dado = material('#8fb0a4', 0.9);
  // The room is lit by its own lamps: sky light through the door is kept low.
  const roomMats = [metal, steel, linen, sheet, wood, enamel, tile, dado];
  // A washable tiled floor and a painted dado make the room read as a clinic.
  box(furniture, tile, 0, floor + 0.005, -1.4, half * 2, 0.02, 5.6);
  box(furniture, dado, 0, floor + 0.55, -4.1, half * 2, 1.1, 0.03);
  // Bed: frame, mattress, pillow and blanket, head to the back wall.
  const bx = 0.8, bz = -3.05;
  for (const dx of [-0.44, 0.44]) for (const dz of [-0.95, 0.95]) cylinder(furniture, metal, bx + dx, floor + 0.3, bz + dz, 0.025, 0.025, 0.6, 8);
  box(furniture, metal, bx, floor + 0.55, bz, 0.95, 0.06, 2.0);
  box(furniture, linen, bx, floor + 0.66, bz, 0.9, 0.16, 1.95, 0.05);
  // Pillows propped against the headboard.
  const pillow = box(furniture, linen, bx, floor + 0.86, bz - 0.8, 0.64, 0.14, 0.42, 0.06);
  pillow.rotation.x = -0.45;
  box(furniture, metal, bx, floor + 0.85, bz - 1.0, 0.95, 0.6, 0.04, 0.02);
  box(furniture, metal, bx, floor + 0.7, bz + 1.0, 0.95, 0.35, 0.04, 0.02);
  // Drip stand.
  cylinder(furniture, steel, bx + 0.68, floor + 0.95, bz - 0.8, 0.014, 0.014, 1.9, 6);
  cylinder(furniture, steel, bx + 0.68, floor + 0.02, bz - 0.8, 0.22, 0.22, 0.03, 10);
  box(furniture, material('#dbe7e4', 0.2), bx + 0.68, floor + 1.72, bz - 0.8, 0.13, 0.2, 0.05, 0.02);
  // Bedside cabinet with the reserve lamp.
  const lampX = CARE_ROOM.bedside.x, lampZ = CARE_ROOM.bedside.z;
  box(furniture, wood, lampX, floor + 0.35, lampZ, 0.46, 0.7, 0.42, 0.02);
  box(furniture, dark, lampX, floor + 0.73, lampZ, 0.14, 0.05, 0.14, 0.02);
  // Vaccine fridge and supply shelves on the left wall.
  const supplies = ['#d9d3bd', '#a8c3c7', '#e6dfc9', '#b9a381'].map((c) => material(c, 0.85));
  box(furniture, enamel, -half + 0.34, floor + 0.68, -3.55, 0.62, 1.36, 0.6, 0.04);
  box(furniture, steel, -half + 0.66, floor + 0.9, -3.3, 0.02, 0.4, 0.03);
  for (let i = 0; i < 3; i++) {
    const y = floor + 0.9 + i * 0.45;
    box(furniture, wood, -half + 0.14, y, -2.45, 0.26, 0.03, 1.0);
    for (let j = 0; j < 4; j++)
      box(furniture, supplies[(i + j) % 4], -half + 0.14, y + 0.08, -2.82 + j * 0.25, 0.15, 0.13 + ((i + j) % 3) * 0.03, 0.16, 0.008);
  }
  // A companion's chair at the foot of the bed, turned towards the patient.
  const chairAt = new T.Vector3(-0.18, floor, -1.55), chairYaw = Math.atan2(bx - 0.1 - chairAt.x, bz - 0.4 - chairAt.z);
  const chair = new T.Group();
  chair.position.copy(chairAt);
  chair.rotation.y = chairYaw;
  box(chair, wood, 0, 0.44, 0, 0.46, 0.05, 0.44, 0.02);
  box(chair, wood, 0, 0.72, -0.22, 0.44, 0.55, 0.04, 0.02);
  for (const dx of [-0.2, 0.2]) for (const dz of [-0.2, 0.2]) box(chair, wood, dx, 0.21, dz, 0.04, 0.44, 0.04);
  furniture.add(chair);
  // Wall monitor on an arm.
  box(furniture, dark, bx + 0.65, 2.0, -4.02, 0.56, 0.4, 0.06, 0.02);
  root.add(batch(furniture));

  // Live parts: the reserve lamp, the ceiling tube, the monitor and the fridge display.
  const shade = material('#f3dca8', 0.6);
  shade.emissive.set('#ffb865');
  const lampShade = cylinder(root, shade, lampX, floor + 0.93, lampZ, 0.07, 0.13, 0.2, 14);
  const reserveLamp = new T.PointLight('#ffb870', 0, 7, 2);
  reserveLamp.position.set(lampX + 0.1, floor + 1.05, lampZ + 0.15);
  root.add(reserveLamp);
  const tubeMat = material('#f4f5ea', 0.3);
  tubeMat.emissive.set('#f4fbe7');
  box(root, metal, CARE_ROOM.ceiling.x, CARE_ROOM.ceiling.y + 0.06, CARE_ROOM.ceiling.z, 1.38, 0.05, 0.16);
  box(root, tubeMat, CARE_ROOM.ceiling.x, CARE_ROOM.ceiling.y, CARE_ROOM.ceiling.z, 1.26, 0.06, 0.08, 0.02);
  const screenMat = material('#0d1716', 0.3);
  screenMat.emissive.set('#63e0a8');
  box(root, screenMat, bx + 0.65, 2.0, -3.985, 0.48, 0.32, 0.01);
  const trace = material('#9ff5c9', 0.3);
  trace.emissive.set('#9ff5c9');
  const pulse = box(root, trace, bx + 0.65, 2.0, -3.975, 0.4, 0.012, 0.004);
  const fridgeMat = material('#221c18', 0.3);
  fridgeMat.emissive.set('#ff5a3c');
  box(root, fridgeMat, -half + 0.4, floor + 1.22, -3.245, 0.14, 0.05, 0.01);

  // People: the rigged cast where available, simple figures otherwise.
  const figures: Figure[] = [];
  const figure = (shirt: string, skin: string, trousers?: string, indoor = true, parts: StaffParts = {}): Figure & { actor: ReturnType<typeof createStaff> } => {
    const actor = createStaff(shirt, skin, 1, { ...(trousers ? { LightBlue: trousers } : {}), ...parts });
    if (actor && !indoor) return { group: actor.group, actor, update: () => {}, dispose: () => actor.dispose() };
    if (actor) {
      // Their own material, so the room's light level reaches the people in it.
      const owned: T.Material[] = [];
      actor.model.traverse((o) => {
        const m = o as T.Mesh;
        if (!m.isMesh || Array.isArray(m.material)) return;
        const mat = (m.material as T.MeshStandardMaterial).clone();
        m.material = mat;
        owned.push(mat);
        roomMats.push(mat as T.MeshStandardMaterial);
      });
      return { group: actor.group, actor, update: () => {}, dispose: () => { actor.dispose(); owned.forEach((m) => m.dispose()); } };
    }
    const person = createPerson(shirt, skin);
    return { group: person.group, actor: null, update: () => {}, dispose: () => person.skin.skeleton.dispose() };
  };
  // Resting patient, head on the pillow, under the blanket.
  const patient = figure('#c9d3d2', '#5d3d2a', '#c9d3d2', true, { Red_Dark: '#86a79d', White: '#86a79d' });
  // Slightly raised on the pillow, as in a real ward bed.
  patient.group.rotation.x = -Math.PI / 2;
  // A slightly slimmer silhouette keeps the resting body under the blanket.
  patient.group.scale.set(1, 1, 0.8);
  patient.group.position.set(bx, floor + 0.8, bz + 0.92);
  const blanket = new T.Group();
  blanket.position.set(bx, floor + 0.76, bz + 0.26);
  root.add(blanket);
  // The blanket drapes over the knees and feet and rises with the propped-up chest.
  const chest = new T.Group();
  chest.position.set(0, 0, 0.02);
  chest.rotation.x = 0.1;
  blanket.add(chest);
  box(chest, sheet, 0, 0.11, -0.36, 0.94, 0.22, 0.76, 0.1);
  const fold = box(chest, linen, 0, 0.23, -0.68, 0.97, 0.06, 0.18, 0.03);
  box(blanket, sheet, 0, 0.19, 0.36, 0.96, 0.38, 0.8, 0.14);
  // Clinician at the bedside, facing the patient.
  const clinician = figure('#6fa29a', '#6b4531', '#6fa29a');
  clinician.group.position.set(bx + 0.95, floor, bz + 0.05);
  clinician.group.rotation.y = -Math.PI / 2;
  // Eye-clinic chapters: a dressing over one eye after the examination.
  const dressing = chapter === 1 || chapter === 2 ? box(root, material('#f1efe6', 0.9), 0, 0, 0, 0.075, 0.06, 0.025, 0.012) : null;
  const headPos = new T.Vector3(), headFwd = new T.Vector3(), headUp = new T.Vector3(), headSide = new T.Vector3();
  const chart = new T.Group();
  box(chart, material('#6d5a44', 0.8), 0, 0, 0, 0.24, 0.32, 0.015);
  box(chart, linen, 0, -0.01, 0.009, 0.2, 0.25, 0.004);
  chart.position.set(0.1, 1.12, 0.36);
  chart.rotation.x = -0.9;
  clinician.group.add(chart);
  // Companion in the chair, keeping watch.
  const companion = figure(chapter % 2 ? '#b8683a' : '#a4523a', '#7a5139', '#39322c');
  companion.group.position.set(chairAt.x, floor - 0.02, chairAt.z);
  companion.group.rotation.y = chairYaw;
  // Two people waiting on the porch bench outside, under the eave.
  const benchX = -width * 0.35;
  const waiting = [figure('#3f6f8a', '#5b3b28', '#2e2f33', false), figure('#c79a3f', '#835a3f', '#3a3027', false)];
  waiting.forEach((w, i) => {
    w.group.position.set(benchX - 0.45 + i * 0.95, 0.24, 2.62);
  });
  const cast = [patient, clinician, companion, ...waiting];
  cast.forEach((c) => root.add(c.group));
  figures.push(...cast);
  const patientHead = new T.Vector3(), lampWorld = new T.Vector3(), ceilingWorld = new T.Vector3();
  const wrist = new T.Vector3(), wrist2 = new T.Vector3(), this_ = new T.Vector3();
  const roomColors = roomMats.map((m) => m.color.clone());
  const flickerNoise = (t: number) => Math.sin(t * 13.1) * 0.5 + Math.sin(t * 31.7 + 1.3) * 0.3 + Math.sin(t * 5.3) * 0.2;
  let last = 0;
  return {
    root,
    /**
     * The reserve lamp lives with the clinic, not the (sometimes hidden) room,
     * so the scene's light count never changes and no shader recompiles mid-drive.
     */
    lights: [reserveLamp],
    /** Clinic-local camera marks for the opening and arrival shots. */
    marks: CARE_ROOM,
    /** Returns how strongly the ceiling light is on (0–1), for the room's clinic light. */
    update(time: number, still: boolean, light: CareLight) {
      const t = still ? 0 : time;
      const dt = Math.min(0.1, Math.max(0, time - last));
      last = time;
      // Reserve lamp: a warm, low, slightly unsteady light that the mains replaces.
      const unsteady = still ? 1 : 0.86 + 0.14 * flickerNoise(t) - (light.reserve < 0.5 ? Math.max(0, Math.sin(t * 2.3)) * 0.25 : 0);
      const lamp = light.reserve * unsteady * (1 - light.power * 0.75);
      reserveLamp.intensity = lamp * 9;
      shade.emissiveIntensity = 0.25 + lamp * 1.3;
      // Start-up flicker of the tube, then steady.
      const s = light.since;
      const flick = light.power <= 0 ? 0 : s < 0.1 ? 1 : s < 0.22 ? 0.15 : s < 0.34 ? 0.9 : s < 0.42 ? 0.3 : 1;
      const on = light.power * flick;
      tubeMat.emissiveIntensity = 0.05 + on * 1.1;
      screenMat.emissiveIntensity = light.devices * 0.9;
      const level = 0.34 + lamp * 0.12 + on * 0.5;
      roomMats.forEach((m, i) => {
        m.color.copy(roomColors[i]).multiplyScalar(Math.min(1, level));
        m.envMapIntensity = 0.2 + on * 0.35;
      });
      trace.emissiveIntensity = light.devices * (1.2 + (still ? 0 : Math.max(0, Math.sin(t * 7.5)) * 2));
      pulse.scale.y = 1 + (still ? 0 : Math.pow(Math.max(0, Math.sin(t * 7.5)), 12) * 5) * light.devices;
      fridgeMat.emissive.set(light.devices > 0.5 ? '#6fd3ff' : '#ff5a3c');
      fridgeMat.emissiveIntensity = light.devices > 0.5 ? 1.2 : 0.35 + 0.35 * Math.max(0, Math.sin(t * 3));
      // Quiet breathing and small, human movements.
      blanket.scale.y = 1 + Math.sin(t * 1.6) * 0.025;
      fold.position.y = 0.23 + Math.sin(t * 1.6) * 0.006;
      root.updateMatrixWorld(true);
      patientHead.copy(CARE_ROOM.patient).setY(floor + 1.0).setZ(bz - 0.72);
      root.localToWorld(patientHead);
      lampWorld.copy(CARE_ROOM.bedside).setY(floor + 0.95);
      root.localToWorld(lampWorld);
      ceilingWorld.copy(CARE_ROOM.ceiling).setY(2.9);
      root.localToWorld(ceilingWorld);
      // The first seconds of power draw every eye to the ceiling.
      const lookUp = light.power > 0 ? Math.max(0, 1 - Math.abs(light.since - 1.1) / 1.3) : 0;
      for (const f of cast) f.actor?.animate('idle', still ? 0 : dt);
      if (patient.actor) {
        // Propped up on the pillows; the head turns a little towards the clinician.
        patient.actor.lean(0.62);
        const towards = lookUp > 0.05 ? ceilingWorld : root.localToWorld(this_.set(bx + 1.2, floor + 1.4, bz - 0.2));
        patient.actor.look(towards, lookUp > 0.05 ? 0.25 : 0.35);
        if (dressing && patient.actor.headFrame(headPos, headFwd, headUp)) {
          headSide.crossVectors(headUp, headFwd).normalize();
          const at = headPos.addScaledVector(headUp, 0.085).addScaledVector(headFwd, 0.105).addScaledVector(headSide, 0.035);
          dressing.position.copy(root.worldToLocal(at.clone()));
          dressing.lookAt(at.add(headFwd));
        }
      }
      if (clinician.actor) {
        const a = clinician.actor;
        a.lean(0.22 * (1 - lookUp * 0.7));
        a.look(lookUp > 0.05 ? ceilingWorld : patientHead, lookUp > 0.05 ? 0.45 : 0.7);
        // One hand rests on the patient's arm; the other holds a small chart.
        // One hand checks the patient's wrist; the other holds the chart at the chest.
        wrist.set(bx + 0.24, floor + 1.15, bz - 0.04 + (still ? 0 : Math.sin(t * 0.7) * 0.02));
        root.localToWorld(wrist);
        clinician.group.updateMatrixWorld(true);
        clinician.group.localToWorld(wrist2.set(0.16, 1.18, 0.34));
        a.hold(wrist2, wrist);
      }
      if (companion.actor) {
        const a = companion.actor;
        a.sit(1, 0.08);
        const k0 = a.kneeWorld(0), k1 = a.kneeWorld(1);
        a.hold(k0.addScaledVector(T.Object3D.DEFAULT_UP, 0.1), k1.addScaledVector(T.Object3D.DEFAULT_UP, 0.1));
        a.look(lookUp > 0.05 ? ceilingWorld : patientHead, lookUp > 0.05 ? 0.4 : 0.55);
      }
      waiting.forEach((w, i) => {
        if (!w.actor) return;
        w.actor.sit(1, 0.1);
        const k0 = w.actor.kneeWorld(0), k1 = w.actor.kneeWorld(1);
        w.actor.hold(k0.addScaledVector(T.Object3D.DEFAULT_UP, 0.1), k1.addScaledVector(T.Object3D.DEFAULT_UP, 0.1));
        // They watch the road for the truck, now and then glancing at each other.
        const gaze = new T.Vector3(benchX + (i ? -1.2 : 1.2) + (still ? 0 : Math.sin(t * 0.3 + i) * 0.8), 1.4, 9);
        w.actor.look(root.localToWorld(gaze), 0.45);
      });
      return on;
    },
    dispose() {
      figures.forEach((f) => f.dispose());
    },
  };
}
