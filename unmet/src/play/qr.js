// Draws a QR code as one SVG path. The encoder is Kazuhiko Arase's
// qrcode-generator (MIT), vendored unchanged in vendor/qrcode.mjs.
import qrcode from './vendor/qrcode.mjs';

/** The dark modules of a QR code for `text`, as rows of booleans. */
export function qrMatrix(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => qr.isDark(y, x)));
}

/** An inline SVG that scales to its container. Light background, dark modules, quiet zone included. */
export function qrSvg(text, { margin = 3, label = 'QR code' } = {}) {
  const rows = qrMatrix(text), size = rows.length + margin * 2;
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let run = 1;
      while (row[x + run]) run++;
      d += `M${x + margin} ${y + margin}h${run}v1h-${run}z`;
      x += run;
    }
  });
  return `<svg class="qr" viewBox="0 0 ${size} ${size}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#f4f1e8"/><path d="${d}" fill="#08090b"/></svg>`;
}
