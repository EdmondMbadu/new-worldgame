import * as T from 'three';
import { allowHeavyDownloads } from './network';

/**
 * Photographic surface detail, in two steps. A light base set (about 350 KB of
 * WebP) is all a drive waits for. Where the connection and device allow it, a
 * sharper set streams in once the drive has started and replaces the images in
 * place: the materials never change, so the view simply becomes crisper.
 */
const NAMES = ['road-color', 'road-normal', 'ground-color', 'ground-normal'] as const;
/** Maps with a sharper 1024 px version; the road colour ships at 1024 px already. */
const SHARPER = ['road-normal', 'ground-color', 'ground-normal'] as const;
const loaded = new Map<string, T.Texture>();
/** Every per-material copy, so a sharper image can reach all of them at once. */
const copies = new Map<string, Set<T.Texture>>();
let pending: Promise<void> | null = null;
let sharpening: Promise<void> | null = null;
const url = (path: string) => `${import.meta.env.BASE_URL}textures/${path}.webp`;
export function loadSurfaces() {
  return (pending ??= (async () => {
    const loader = new T.TextureLoader();
    await Promise.all(
      NAMES.map(async (name) => {
        try {
          const texture = await loader.loadAsync(url(name));
          texture.wrapS = texture.wrapT = T.RepeatWrapping;
          texture.anisotropy = 8;
          if (name.endsWith('color')) texture.colorSpace = T.SRGBColorSpace;
          loaded.set(name, texture);
        } catch {
          /* Original procedural materials are the offline fallback. */
        }
      }),
    );
  })());
}
/** Stream the sharper images after the drive has started, never before it. */
export function sharpenSurfaces() {
  if (!allowHeavyDownloads()) return Promise.resolve();
  return (sharpening ??= (async () => {
    const loader = new T.ImageLoader();
    for (const name of SHARPER) {
      try {
        const image = await loader.loadAsync(url(`hd/${name}`));
        // A new source makes the renderer allocate full-size storage for it.
        const source = new T.Source(image);
        const base = loaded.get(name);
        if (base) base.source = source;
        for (const texture of copies.get(name) ?? []) {
          texture.source = source;
          texture.needsUpdate = true;
        }
      } catch {
        /* The base image stays; nothing else depends on the sharper one. */
      }
    }
  })());
}
// Retain the source textures across chapters; clones belong to each scene.
export function surfaceTexture(name: string) {
  const source = loaded.get(name);
  if (!source) return undefined;
  const texture = source.clone();
  texture.needsUpdate = true;
  let set = copies.get(name);
  if (!set) copies.set(name, (set = new Set()));
  set.add(texture);
  texture.addEventListener('dispose', () => set!.delete(texture));
  return texture;
}
