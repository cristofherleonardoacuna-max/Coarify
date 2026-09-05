/**
 * Genera los iconos PNG de COARIFY (favicon + PWA) sin dependencias externas.
 * Dibuja la misma marca del logo.svg con un rasterizador propio y codifica
 * el PNG con el zlib que trae Node.
 *
 *   node scripts/make-icons.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'frontend', 'public', 'icons');
const SIZES = [32, 180, 192, 512];
const SS = 4; // supersampling para bordes suaves

/* ---------------------------- utilidades color ---------------------------- */

const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

const NAVY_TOP = hex('#25406F');
const NAVY_BOT = hex('#12203A');
const GOLD_A = hex('#E9C863');
const GOLD_B = hex('#B8912A');

const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/* ------------------------------ geometria --------------------------------- */

function roundedRect(x, y, w, h, r) {
  return (px, py) => {
    if (px < x || py < y || px > x + w || py > y + h) return false;
    const cx = Math.min(Math.max(px, x + r), x + w - r);
    const cy = Math.min(Math.max(py, y + r), y + h - r);
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  };
}

/** Anillo con hueco angular (la "C"). Angulos en grados, 0 = derecha, sentido horario. */
function arcRing(cx, cy, radius, thickness, gapStart, gapEnd) {
  const inner = radius - thickness / 2;
  const outer = radius + thickness / 2;
  return (px, py) => {
    const dx = px - cx;
    const dy = py - cy;
    const d = Math.hypot(dx, dy);
    if (d < inner || d > outer) return false;
    let ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    if (ang < 0) ang += 360;
    const inGap = gapStart < gapEnd ? ang > gapStart && ang < gapEnd : ang > gapStart || ang < gapEnd;
    return !inGap;
  };
}

function ellipse(cx, cy, rx, ry, rotDeg) {
  const a = (-rotDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return (px, py) => {
    const dx = px - cx;
    const dy = py - cy;
    const x = dx * cos - dy * sin;
    const y = dx * sin + dy * cos;
    return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;
  };
}

function rect(x, y, w, h) {
  return (px, py) => px >= x && px <= x + w && py >= y && py <= y + h;
}

/** Bandera de la corchea: region entre dos curvas que nacen en el mastil. */
function flag(x0, y0, u = 1) {
  const h = 26 * u;
  return (px, py) => {
    const t = (py - y0) / h;
    if (t < 0 || t > 1) return false;
    const outer = x0 + 24 * u * Math.sin(t * 1.45);
    const inner = x0 + 9 * u * Math.sin(t * 1.05);
    return px >= inner && px <= outer;
  };
}

/* ------------------------------ rasterizado -------------------------------- */

function render(size) {
  const S = size * SS;
  const u = S / 128; // el diseno esta pensado en un lienzo de 128
  const px = (v) => v * u;

  const plate = roundedRect(px(2), px(2), px(124), px(124), px(30));
  const ring = arcRing(px(64), px(62), px(44), px(9), 318, 42);
  const head = ellipse(px(57), px(83), px(12), px(9), -20);
  const stem = rect(px(65), px(36), px(5.5), px(47));
  const flg = flag(px(70.5), px(36), px(1));

  const buf = Buffer.alloc(S * S * 4);

  for (let y = 0; y < S; y += 1) {
    for (let x = 0; x < S; x += 1) {
      const i = (y * S + x) * 4;
      const cx = x + 0.5;
      const cy = y + 0.5;

      if (!plate(cx, cy)) continue; // fuera de la placa: transparente

      const isGold = ring(cx, cy) || head(cx, cy) || stem(cx, cy) || flg(cx, cy);
      const t = y / S;
      const color = isGold ? lerp(GOLD_A, GOLD_B, t) : lerp(NAVY_TOP, NAVY_BOT, t);

      buf[i] = color[0];
      buf[i + 1] = color[1];
      buf[i + 2] = color[2];
      buf[i + 3] = 255;
    }
  }

  return downsample(buf, S, size);
}

function downsample(src, srcSize, dstSize) {
  const f = srcSize / dstSize;
  const out = Buffer.alloc(dstSize * dstSize * 4);

  for (let y = 0; y < dstSize; y += 1) {
    for (let x = 0; x < dstSize; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < f; sy += 1) {
        for (let sx = 0; sx < f; sx += 1) {
          const si = ((y * f + sy) * srcSize + (x * f + sx)) * 4;
          const alpha = src[si + 3] / 255;
          r += src[si] * alpha;
          g += src[si + 1] * alpha;
          b += src[si + 2] * alpha;
          a += alpha;
        }
      }
      const n = f * f;
      const di = (y * dstSize + x) * 4;
      out[di] = a > 0 ? Math.round(r / a) : 0;
      out[di + 1] = a > 0 ? Math.round(g / a) : 0;
      out[di + 2] = a > 0 ? Math.round(b / a) : 0;
      out[di + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

/* ------------------------------ encoder PNG -------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0; // filtro "None"
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* --------------------------------- main ------------------------------------ */

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const file = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, encodePng(render(size), size));
  console.log(`  icon-${size}.png`);
}

// favicon.ico simple (un solo PNG de 32x32 embebido, formato soportado por navegadores modernos)
const png32 = encodePng(render(32), 32);
const ico = Buffer.alloc(22);
ico.writeUInt16LE(0, 0);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico[6] = 32;
ico[7] = 32;
ico[8] = 0;
ico[9] = 0;
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png32.length, 14);
ico.writeUInt32LE(22, 18);
fs.writeFileSync(path.join(__dirname, '..', 'frontend', 'public', 'favicon.ico'), Buffer.concat([ico, png32]));
console.log('  favicon.ico');
console.log('\nIconos de COARIFY generados en frontend/public/icons\n');
