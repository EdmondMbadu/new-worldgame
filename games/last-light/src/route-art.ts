import * as T from 'three';
import type { Mission } from './missions';
import { toWorld } from './routes';

/** Deform only owned, static geometry. Instanced trees keep their original shape. */
export function bendGeometry(geometry: T.BufferGeometry, m: Mission) {
  const p = geometry.attributes.position as T.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const w = toWorld(m, p.getX(i), p.getZ(i));
    p.setXYZ(i, w.x, p.getY(i), w.z);
  }
  p.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}
export function bendStatic(root: T.Object3D, m: Mission) {
  const matrix = new T.Matrix4(),
    p = new T.Vector3(),
    q = new T.Quaternion(),
    scale = new T.Vector3();
  root.updateMatrixWorld(true);
  root.traverse((object) => {
    if (object.userData.routeWorld) return;
    if (object instanceof T.InstancedMesh) {
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, matrix);
        matrix.decompose(p, q, scale);
        const w = toWorld(m, p.x, p.z);
        p.set(w.x, p.y, w.z);
        matrix.compose(p, q, scale);
        object.setMatrixAt(i, matrix);
      }
      object.instanceMatrix.needsUpdate = true;
      object.computeBoundingSphere();
    } else if (object instanceof T.Mesh) {
      // These are the world's batched fixtures, not shared GLB or skinned assets.
      object.geometry.applyMatrix4(object.matrixWorld);
      bendGeometry(object.geometry, m);
      object.geometry.applyMatrix4(object.matrixWorld.clone().invert());
      object.geometry.computeBoundingSphere();
    }
  });
}
