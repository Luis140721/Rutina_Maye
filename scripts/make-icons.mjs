// Genera los íconos PNG de la PWA (sin dependencias): fondo redondeado + mancuerna.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
fs.mkdirSync(OUT, { recursive: true });

const BG = [194, 37, 92], FG = [255, 255, 255];

function draw(size, maskable) {
  const px = new Uint8Array(size * size * 4);
  const r = maskable ? 0 : size * 0.22;
  const pad = maskable ? size * 0.1 : 0;
  const inside = (x, y) => {
    if (maskable) return true;
    const cx = Math.min(Math.max(x, r), size - r), cy = Math.min(Math.max(y, r), size - r);
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
  };
  // mancuerna: barra + 2 discos por lado, centrada, inclinada 0°
  const c = size / 2, s = size - pad * 2;
  const barH = s * 0.09, barW = s * 0.56;
  const plate = [[s * 0.10, s * 0.42], [s * 0.07, s * 0.30]]; // [ancho, alto]
  const inBar = (x, y) => Math.abs(x - c) <= barW / 2 && Math.abs(y - c) <= barH / 2;
  const inPlate = (x, y) => {
    let off = barW / 2 - s * 0.02;
    for (const [w, h] of plate) {
      for (const sgn of [-1, 1]) {
        const px0 = c + sgn * (off + w / 2);
        if (Math.abs(x - px0) <= w / 2 && Math.abs(y - c) <= h / 2) return true;
      }
      off += w + s * 0.015;
    }
    return false;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    // supersampling 2x2 para bordes suaves
    let cov = 0, fg = 0;
    for (const [dx, dy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
      const sx = x + dx, sy = y + dy;
      if (inside(sx, sy)) { cov++; if (inBar(sx, sy) || inPlate(sx, sy)) fg++; }
    }
    const a = cov / 4, f = fg / 4;
    for (let k = 0; k < 3; k++) px[i + k] = Math.round(BG[k] * (1 - f) + FG[k] * f);
    px[i + 3] = Math.round(255 * a);
  }
  return px;
}

function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1); }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
let T;
function crc32(buf) {
  if (!T) { T = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c; } }
  let c = -1; for (const b of buf) c = T[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-maskable-512.png', 512, true], ['apple-touch-icon.png', 180, true]]) {
  fs.writeFileSync(path.join(OUT, name), png(size, draw(size, maskable)));
  console.log('ok', name);
}
