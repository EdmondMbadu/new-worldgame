import * as T from 'three';
import { createClinicArchitecture } from './clinic-architecture';
import { materials, geometries } from './art';
/**
 * Each compound is authored geometry: building it here takes a few tens of
 * milliseconds and nothing to download, so the drive never waits on a model.
 */
export function loadClinic(_id: number) {
  return Promise.resolve();
}
export function clinicArchitecture(id: number) {
  const root = createClinicArchitecture(id);
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
    geometries.add(mesh.geometry);
  });
  return { root, glow };
}
