import * as T from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
let source: GLTF | null = null;
let pending: Promise<void> | null = null;
export const loadStaff = () =>
  (pending ??= (async () => {
    try {
      source = await new GLTFLoader().loadAsync(
        `${import.meta.env.BASE_URL}models/clinic-staff.glb`,
      );
    } catch {
      /* Existing local figures remain available if optional art fails. */
    }
  })());
export function createStaff(color: string, skin: string, scale = 1) {
  if (!source) return null;
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
  model.traverse((o) => {
    const mesh = o as T.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    const recolor = (m: T.Material) => {
      const mat = (m as T.MeshStandardMaterial).clone();
      if (/LightBrown|Red_Dark|LightBlue/.test(mat.name)) mat.color.set(color);
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
  const leftHand = model.getObjectByName('Wrist.L'),
    rightHand = model.getObjectByName('Wrist.R');
  const leftArm = model.getObjectByName('UpperArm.L'),
    rightArm = model.getObjectByName('UpperArm.R');
  const leftFore = model.getObjectByName('LowerArm.L'),
    rightFore = model.getObjectByName('LowerArm.R');
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
