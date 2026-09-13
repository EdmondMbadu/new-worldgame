import * as T from 'three';
import { random } from './missions';
import { textures } from './art';
// Original leaf clusters: alpha-tested branches retain a natural silhouette in 3D.
export function canopyTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!,
    rng = random(97531);
  ctx.clearRect(0, 0, 512, 512);
  for (let branch = 0; branch < 10; branch++) {
    const angle = (branch / 10) * Math.PI * 2;
    const bx = 256 + Math.cos(angle) * (100 + rng() * 70),
      by = 270 + Math.sin(angle) * (90 + rng() * 65);
    ctx.strokeStyle = '#66563b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(256, 355);
    ctx.quadraticCurveTo(256, 260, bx, by);
    ctx.stroke();
  }
  for (let i = 0; i < 1100; i++) {
    const a = rng() * Math.PI * 2,
      r = Math.sqrt(rng());
    const x = 256 + Math.cos(a) * 210 * r,
      y = 252 + Math.sin(a) * 195 * r;
    const edge = 0.85 + 0.15 * Math.sin(a * 7);
    if (r > edge) continue;
    const tone = 45 + Math.floor(rng() * 54);
    ctx.fillStyle = `rgb(${tone * 0.82},${tone + 28},${tone * 0.46})`;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      3 + rng() * 9,
      2 + rng() * 4,
      rng() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  textures.add(t);
  return t;
}
export function grassGeometry() {
  const g = new T.BufferGeometry(),
    p: number[] = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4,
      x = Math.sin(a) * 0.15,
      z = Math.cos(a) * 0.15,
      h = 0.3 + i * 0.045,
      w = 0.025;
    const sx = Math.cos(a) * w,
      sz = Math.sin(a) * w;
    p.push(x - sx, 0, z - sz, x + sx, 0, z + sz, x + 0.055, h, z + 0.035);
  }
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.computeVertexNormals();
  return g;
}
