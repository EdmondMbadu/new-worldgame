import * as T from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
const loaded = new Map<string, T.Texture>();
let environment: T.DataTexture | null = null;
let pending: Promise<void> | null = null;
export function loadSurfaces() {
  return (pending ??= (async () => {
    const loader = new T.TextureLoader();
    await Promise.all(
      [
        'road-color',
        'road-normal',
        'road-arm',
        'ground-color',
        'ground-normal',
      ].map(async (name) => {
        try {
          const texture = await loader.loadAsync(
            `${import.meta.env.BASE_URL}textures/${name}.jpg`,
          );
          texture.wrapS = texture.wrapT = T.RepeatWrapping;
          texture.anisotropy = 8;
          if (name.endsWith('color')) texture.colorSpace = T.SRGBColorSpace;
          loaded.set(name, texture);
        } catch {
          /* Original procedural materials are the offline fallback. */
        }
      }),
    );
    try {
      environment = await new HDRLoader().loadAsync(
        `${import.meta.env.BASE_URL}textures/sky.hdr`,
      );
      environment.mapping = T.EquirectangularReflectionMapping;
    } catch {
      /* The procedural sky and hemisphere lighting remain available. */
    }
  })());
}
export const environmentTexture = () => environment;
// Retain the five source textures across chapters; clones belong to each scene.
export function surfaceTexture(name: string) {
  const source = loaded.get(name);
  if (!source) return undefined;
  const texture = source.clone();
  texture.needsUpdate = true;
  return texture;
}
