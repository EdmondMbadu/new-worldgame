import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createClinicArchitecture } from './clinic-architecture';
import { materials, geometries } from './art';
const loaded = new Map<number, T.Group>();
const pending = new Map<number, Promise<void>>();
export function loadClinic(id: number) {
  if (!pending.has(id))
    pending.set(
      id,
      (async () => {
        try {
          const gltf = await new GLTFLoader().loadAsync(
            `${import.meta.env.BASE_URL}models/clinic-${id}.glb`,
          );
          loaded.set(id, gltf.scene);
        } catch {
          /* Authored geometry is also available locally as the asset fallback. */
        }
      })(),
    );
  return pending.get(id)!;
}
export function clinicArchitecture(id: number) {
  const source = loaded.get(id);
  const root = source ? source.clone(true) : createClinicArchitecture(id);
  const glow: T.MeshStandardMaterial[] = [];
  const shared = new Map<T.Material, T.MeshStandardMaterial>();
  root.traverse((o) => {
    const mesh = o as T.Mesh;
    if (!mesh.isMesh) return;
    const own = (old: T.Material) => {
      if (!shared.has(old)) {
        const mat = (old as T.MeshStandardMaterial).clone();
        shared.set(old, mat);
        materials.add(mat);
        if (mat.name === 'WindowGlow') glow.push(mat);
      }
      return shared.get(old)!;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(own)
      : own(mesh.material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (!source) geometries.add(mesh.geometry);
  });
  return { root, glow };
}
