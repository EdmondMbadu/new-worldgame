import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
let source: GLTF | null = null;
let pending: Promise<void> | null = null;
export const loadStaff = () =>
  (pending ??= (async () => {
    try {
      // The character is meshopt-compressed: about a third of its original size.
      source = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(
        `${import.meta.env.BASE_URL}models/clinic-staff.glb`,
      );
    } catch {
      /* Existing local figures remain available if optional art fails. */
    }
  })());
/**
 * The character arrives as ten skinned parts (ten draw calls, twenty with
 * shadows). The parts share one skeleton; their skins differ only by a
 * constant offset, so they merge into one mesh with the part colours carried
 * per vertex. Every clone then shares these buffers and adds its own colours.
 */
type Merged = {
  attributes: Record<string, T.BufferAttribute>;
  index: T.BufferAttribute;
  parts: { name: string; color: T.Color }[];
  part: Uint8Array;
  sphere: T.Sphere;
};
let merged: Merged | null | undefined;
function mergeParts(scene: T.Object3D): Merged | null {
  const meshes: T.SkinnedMesh[] = [];
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    if ((o as T.SkinnedMesh).isSkinnedMesh) meshes.push(o as T.SkinnedMesh);
  });
  if (!meshes.length) return null;
  const ref = meshes[0];
  const inverses = ref.skeleton.boneInverses;
  let vertices = 0,
    indices = 0;
  const offsets: T.Matrix4[] = [];
  for (const mesh of meshes) {
    const g = mesh.geometry;
    if (!g.index || !g.attributes.skinIndex || !g.attributes.skinWeight || mesh.skeleton.bones.length !== ref.skeleton.bones.length)
      return null;
    if (mesh.skeleton.bones.some((b, i) => b !== ref.skeleton.bones[i]) || !mesh.bindMatrix.equals(ref.bindMatrix)) return null;
    const x = inverses[0].clone().invert().multiply(mesh.skeleton.boneInverses[0]);
    for (let i = 1; i < inverses.length; i++) {
      const xi = inverses[i].clone().invert().multiply(mesh.skeleton.boneInverses[i]);
      if (xi.elements.some((v, k) => Math.abs(v - x.elements[k]) > 1e-4)) return null;
    }
    offsets.push(x);
    vertices += g.attributes.position.count;
    indices += g.index.count;
  }
  const position = new Float32Array(vertices * 3),
    normal = new Float32Array(vertices * 3),
    skinIndex = new Uint16Array(vertices * 4),
    skinWeight = new Float32Array(vertices * 4),
    index = new Uint32Array(indices),
    part = new Uint8Array(vertices);
  const parts: Merged['parts'] = [];
  const v = new T.Vector3(),
    n = new T.Vector3(),
    normalMatrix = new T.Matrix3();
  let base = 0,
    at = 0;
  meshes.forEach((mesh, k) => {
    const g = mesh.geometry,
      x = offsets[k];
    normalMatrix.getNormalMatrix(x);
    const p = g.attributes.position,
      nn = g.attributes.normal,
      si = g.attributes.skinIndex,
      sw = g.attributes.skinWeight;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(x);
      position.set([v.x, v.y, v.z], (base + i) * 3);
      if (nn) {
        n.fromBufferAttribute(nn, i).applyMatrix3(normalMatrix).normalize();
        normal.set([n.x, n.y, n.z], (base + i) * 3);
      }
      for (let j = 0; j < 4; j++) {
        skinIndex[(base + i) * 4 + j] = si.getComponent(i, j);
        skinWeight[(base + i) * 4 + j] = sw.getComponent(i, j);
      }
      part[base + i] = k;
    }
    for (let i = 0; i < g.index!.count; i++) index[at++] = g.index!.getX(i) + base;
    base += p.count;
    const mat = mesh.material as T.MeshStandardMaterial;
    parts.push({ name: mat.name, color: mat.color.clone() });
  });
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(position, 3));
  geometry.computeBoundingSphere();
  return {
    attributes: {
      position: geometry.attributes.position as T.BufferAttribute,
      normal: new T.BufferAttribute(normal, 3),
      skinIndex: new T.Uint16BufferAttribute(skinIndex, 4),
      skinWeight: new T.BufferAttribute(skinWeight, 4),
    },
    index: new T.BufferAttribute(index, 1),
    parts,
    part,
    sphere: geometry.boundingSphere!.clone(),
  };
}
let staffMaterial: T.MeshStandardMaterial | null = null;
/** Optional per-part colours, keyed by the source material name (e.g. trousers, shoes, hair). */
export type StaffParts = Partial<Record<'LightBlue' | 'LightBrown' | 'Red_Dark' | 'White' | 'Hair' | 'Eyebrows', string>>;
export function createStaff(color: string, skin: string, scale = 1, parts: StaffParts = {}) {
  if (!source) return null;
  if (merged === undefined) merged = mergeParts(source.scene);
  const group = new T.Group(),
    model = clone(source.scene);
  const bounds = new T.Box3().setFromObject(model),
    size = bounds.getSize(new T.Vector3());
  const unit = 1.76 / size.y;
  model.scale.multiplyScalar(unit);
  model.position.y -= bounds.min.y * unit;
  group.scale.setScalar(scale);
  group.add(model);
  const mats: T.Material[] = [];
  // Shirt in the given colour; trousers a deep, related neutral; worn dark shoes.
  const defaults: Record<string, T.Color> = {
    LightBrown: new T.Color(color),
    LightBlue: new T.Color(color).lerp(new T.Color('#1f2a2a'), 0.72),
    Red_Dark: new T.Color('#2c2723'),
    White: new T.Color('#8d877c'),
  };
  const recolored = (name: string, original: T.Color) => {
    const c = original.clone();
    if (name in defaults) c.copy(defaults[name]);
    const own = parts[name as keyof StaffParts];
    if (own) c.set(own);
    if (/Skin/.test(name)) c.set(skin).multiplyScalar(name === 'Skin_Darker' ? 0.8 : 1);
    return c;
  };
  if (merged) {
    const parts: T.SkinnedMesh[] = [];
    model.traverse((o) => {
      if ((o as T.SkinnedMesh).isSkinnedMesh) parts.push(o as T.SkinnedMesh);
    });
    const ref = parts[0];
    const geometry = new T.BufferGeometry();
    for (const [name, attribute] of Object.entries(merged.attributes)) geometry.setAttribute(name, attribute);
    geometry.setIndex(merged.index);
    const palette = merged.parts.map((p) => recolored(p.name, p.color));
    const rgb = new Uint8Array(merged.part.length * 3);
    merged.part.forEach((k, i) => {
      const c = palette[k];
      rgb[i * 3] = Math.round(c.r * 255);
      rgb[i * 3 + 1] = Math.round(c.g * 255);
      rgb[i * 3 + 2] = Math.round(c.b * 255);
    });
    geometry.setAttribute('color', new T.Uint8BufferAttribute(rgb, 3, true));
    if (!staffMaterial || !staffMaterial.userData.alive) {
      staffMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 });
      staffMaterial.userData.alive = true;
    }
    const body = new T.SkinnedMesh(geometry, staffMaterial);
    body.name = 'StaffBody';
    body.castShadow = true;
    body.receiveShadow = true;
    // Room for every pose of the walk, wave and carry.
    body.boundingSphere = new T.Sphere(merged.sphere.center.clone(), merged.sphere.radius * 1.6);
    body.position.copy(ref.position);
    body.quaternion.copy(ref.quaternion);
    body.scale.copy(ref.scale);
    ref.parent!.add(body);
    body.bind(ref.skeleton, ref.bindMatrix);
    for (const part of parts) part.parent?.remove(part);
  }
  model.traverse((o) => {
    const mesh = o as T.Mesh;
    if (!mesh.isMesh || mesh.name === 'StaffBody') return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const recolor = (m: T.Material) => {
      const mat = (m as T.MeshStandardMaterial).clone();
      if (mat.name in defaults) mat.color.copy(defaults[mat.name]);
      const own = parts[mat.name as keyof StaffParts];
      if (own) mat.color.set(own);
      if (/Skin/.test(mat.name))
        mat.color
          .set(skin)
          .multiplyScalar(mat.name === 'Skin_Darker' ? 0.8 : 1);
      mat.roughness = 0.82;
      mat.side = T.FrontSide;
      mats.push(mat);
      return mat;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(recolor)
      : recolor(mesh.material);
  });
  const mixer = new T.AnimationMixer(model);
  const actions = new Map(
    source.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
  );
  let current = '';
  // three.js strips the dots from glTF node names (UpperArm.L → UpperArmL).
  const bone = (name: string) => model.getObjectByName(name) ?? model.getObjectByName(name.replace('.', ''));
  const leftHand = bone('Wrist.L'),
    rightHand = bone('Wrist.R');
  const leftArm = bone('UpperArm.L'),
    rightArm = bone('UpperArm.R');
  const leftFore = bone('LowerArm.L'),
    rightFore = bone('LowerArm.R');
  // The legs end in IK foot controllers, so posed legs carry their feet explicitly.
  const legs = (['L', 'R'] as const).map((side) => ({
    upper: bone(`UpperLeg.${side}`),
    lower: bone(`LowerLeg.${side}`),
    foot: bone(`Foot.${side}`),
    side: side === 'L' ? 1 : -1,
  }));
  const head = bone('Head'), torso = bone('Torso');
  model.updateMatrixWorld(true);
  const toLocal = (b: T.Object3D | undefined, world: T.Vector3) =>
    b ? b.worldToLocal(world.clone()).normalize() : new T.Vector3(0, 1, 0);
  const legRest = legs.map(({ upper, lower, foot }) => {
    if (!upper || !lower || !foot) return null;
    const knee = lower.getWorldPosition(new T.Vector3()), ankle = foot.getWorldPosition(new T.Vector3());
    return {
      thigh: toLocal(upper, knee),
      calf: toLocal(lower, ankle),
      thighLength: upper.getWorldPosition(new T.Vector3()).distanceTo(knee),
      calfLength: knee.distanceTo(ankle),
    };
  });
  // The bind pose faces +Z; remember each bone's own forward for gaze and lean.
  const forwardOf = (b: T.Object3D | undefined) =>
    b ? new T.Vector3(0, 0, 1).applyQuaternion(b.getWorldQuaternion(new T.Quaternion()).invert()) : new T.Vector3(0, 0, 1);
  const headForward = forwardOf(head), torsoForward = forwardOf(torso);
  const headUp = head ? new T.Vector3(0, 1, 0).applyQuaternion(head.getWorldQuaternion(new T.Quaternion()).invert()) : new T.Vector3(0, 1, 0);
  const baseY = model.position.y;
  const aim = (b: T.Object3D, local: T.Vector3, world: T.Vector3, weight = 1) => {
    b.updateWorldMatrix(true, false);
    const wq = b.getWorldQuaternion(new T.Quaternion());
    const now = local.clone().applyQuaternion(wq).normalize();
    const delta = new T.Quaternion().setFromUnitVectors(now, world.clone().normalize());
    if (weight < 1) delta.slerp(new T.Quaternion(), 1 - weight);
    const parent = b.parent!.getWorldQuaternion(new T.Quaternion()).invert();
    b.quaternion.copy(parent.multiply(delta.multiply(wq)));
    b.updateMatrixWorld(true);
  };
  const scratch = new T.Vector3(), scratch2 = new T.Vector3();
  return {
    group,
    model,
    leftHand,
    rightHand,
    animate(mode: 'idle' | 'walk' | 'wave' | 'connect' | 'carry', dt: number) {
      const clip =
        mode === 'walk' || mode === 'carry'
          ? 'Walk'
          : mode === 'wave'
            ? 'Wave'
            : mode === 'connect'
              ? 'Interact'
              : 'Idle_Neutral';
      if (clip !== current) {
        actions.get(current)?.fadeOut(0.18);
        actions.get(clip)?.reset().fadeIn(0.18).play();
        current = clip;
      }
      mixer.update(dt * (mode === 'carry' ? 0.6 : 1));
      if (mode === 'carry') {
        // Keep the authored walk in the legs while both arms support the kit.
        for (const [arm, fore, side] of [
          [leftArm, leftFore, 1],
          [rightArm, rightFore, -1],
        ] as const) {
          if (arm) arm.rotation.set(-0.7, 0, Number(side) * 0.12);
          if (fore) fore.rotation.set(-0.75, 0, 0);
        }
      }
    },
    hold(left: T.Vector3, right: T.Vector3) {
      for (const [upper, lower, hand, target, side] of [
        [leftArm, leftFore, leftHand, left, 1],
        [rightArm, rightFore, rightHand, right, -1],
      ] as const) {
        if (!upper || !lower || !hand) continue;
        model.updateMatrixWorld(true);
        const a = upper.getWorldPosition(new T.Vector3()),
          b = lower.getWorldPosition(new T.Vector3()),
          c = hand.getWorldPosition(new T.Vector3());
        const l1 = a.distanceTo(b),
          l2 = b.distanceTo(c),
          aim = target.clone().sub(a),
          dist = Math.min(aim.length(), (l1 + l2) * 0.985);
        aim.normalize();
        const outward = new T.Vector3(Number(side), 0, -0.4).transformDirection(
          group.matrixWorld,
        );
        outward.addScaledVector(aim, -outward.dot(aim)).normalize();
        const along =
          (l1 * l1 + dist * dist - l2 * l2) / (2 * Math.max(dist, 0.001));
        const elbow = a
          .clone()
          .addScaledVector(aim, along)
          .addScaledVector(
            outward,
            Math.sqrt(Math.max(0, l1 * l1 - along * along)),
          );
        const rotate = (bone: T.Object3D, from: T.Vector3, to: T.Vector3) => {
          const delta = new T.Quaternion().setFromUnitVectors(
            from.normalize(),
            to.normalize(),
          );
          const world = bone
            .getWorldQuaternion(new T.Quaternion())
            .premultiply(delta);
          const parent = bone
            .parent!.getWorldQuaternion(new T.Quaternion())
            .invert();
          bone.quaternion.copy(parent.multiply(world));
          model.updateMatrixWorld(true);
        };
        rotate(upper, b.clone().sub(a), elbow.clone().sub(a));
        const joint = lower.getWorldPosition(new T.Vector3()),
          wrist = hand.getWorldPosition(new T.Vector3());
        rotate(lower, wrist.sub(joint), target.clone().sub(joint));
      }
    },
    /**
     * Seated pose over the current clip: thighs forward, calves down, feet planted.
     * Call after animate(). The seat is `calf length` above the group's floor.
     */
    sit(amount = 1, spread = 0.1) {
      group.updateMatrixWorld(true);
      const forward = scratch.set(0, 0, 1).transformDirection(group.matrixWorld);
      const lateral = scratch2.set(1, 0, 0).transformDirection(group.matrixWorld);
      const down = new T.Vector3(0, -1, 0).transformDirection(group.matrixWorld);
      model.position.y = baseY;
      model.updateMatrixWorld(true);
      legs.forEach(({ upper, lower, foot, side }, i) => {
        const rest = legRest[i];
        if (!upper || !lower || !foot || !rest) return;
        // Hips drop by one thigh as the thigh swings level.
        if (i === 0) {
          model.position.y = baseY - (rest.thighLength * amount) / Math.max(0.001, group.scale.y * model.scale.y) * model.scale.y;
          model.updateMatrixWorld(true);
        }
        const thighDir = down.clone().lerp(forward.clone().addScaledVector(lateral, side * spread).addScaledVector(down, 0.08), amount);
        aim(upper, rest.thigh, thighDir);
        aim(lower, rest.calf, down.clone().addScaledVector(forward, 0.12 * amount));
        const knee = lower.getWorldPosition(new T.Vector3());
        const ankle = knee.addScaledVector(rest.calf.clone().applyQuaternion(lower.getWorldQuaternion(new T.Quaternion())).normalize(), rest.calfLength);
        foot.position.copy(foot.parent!.worldToLocal(ankle));
        foot.updateMatrixWorld(true);
      });
    },
    /** Knee height of the seated pose, in world units, for placing hands and props. */
    kneeWorld(side: 0 | 1) {
      return legs[side].lower?.getWorldPosition(new T.Vector3()) ?? group.getWorldPosition(new T.Vector3());
    },
    /** Turn the head (and a little of the torso) towards a world point. */
    look(target: T.Vector3, weight = 0.7) {
      if (!head) return;
      const from = head.getWorldPosition(new T.Vector3());
      const dir = target.clone().sub(from).normalize();
      if (torso) aim(torso, torsoForward, dir.clone().setY(0), weight * 0.25);
      aim(head, headForward, dir, weight);
    },
    /** World position, facing and up of the head, for props such as an eye dressing. */
    headFrame(position: T.Vector3, forward: T.Vector3, up: T.Vector3) {
      if (!head) return false;
      head.updateWorldMatrix(true, false);
      const q = head.getWorldQuaternion(new T.Quaternion());
      head.getWorldPosition(position);
      forward.copy(headForward).applyQuaternion(q).normalize();
      up.copy(headUp).applyQuaternion(q).normalize();
      return true;
    },
    /** Lean the upper body forward (radians), e.g. over a bed. */
    lean(angle: number) {
      if (!torso) return;
      group.updateMatrixWorld(true);
      const forward = new T.Vector3(0, 0, 1).transformDirection(group.matrixWorld);
      const up = new T.Vector3(0, 1, 0).transformDirection(group.matrixWorld);
      const tilted = forward.clone().multiplyScalar(Math.cos(angle)).addScaledVector(up, -Math.sin(angle));
      aim(torso, torsoForward, tilted, 1);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      mats.forEach((m) => m.dispose());
      model.traverse((o) => {
        if ((o as T.SkinnedMesh).isSkinnedMesh)
          (o as T.SkinnedMesh).skeleton.dispose();
      });
    },
  };
}
