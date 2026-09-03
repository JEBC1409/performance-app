// Generates the PWA icon set as plain PNGs, no dependencies (uses Node's built-in zlib).
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const BLACK = [0x00, 0x00, 0x00];
const RED = [0xdf, 0x25, 0x31];
const WHITE = [0xff, 0xff, 0xff];

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function setPx(buf, w, x, y, rgb, a) {
  if (x < 0 || y < 0 || x >= w || y >= w) return;
  const i = (y * w + x) * 4;
  buf[i] = rgb[0]; buf[i + 1] = rgb[1]; buf[i + 2] = rgb[2]; buf[i + 3] = a;
}
function fillRect(buf, w, x0, y0, x1, y1, rgb) {
  for (let y = Math.round(y0); y < Math.round(y1); y++) {
    for (let x = Math.round(x0); x < Math.round(x1); x++) setPx(buf, w, x, y, rgb, 255);
  }
}

// Black canvas, a red square mark (sharp corners, no rounding) with a white "P" cut from it.
function drawIcon(size, { margin }) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = BLACK[0]; buf[i * 4 + 1] = BLACK[1]; buf[i * 4 + 2] = BLACK[2]; buf[i * 4 + 3] = 255;
  }
  const m = margin;
  fillRect(buf, size, m, m, size - m, size - m, RED);

  const gw = (size - 2 * m) * 0.42;
  const gh = (size - 2 * m) * 0.56;
  const gx0 = size / 2 - gw * 0.62;
  const gy0 = size / 2 - gh * 0.5;
  const stemW = gw * 0.32;
  const bowlH = gh * 0.54;
  const bowlOuterW = gw * 0.86;
  const strokeW = gw * 0.32;

  fillRect(buf, size, gx0, gy0, gx0 + stemW, gy0 + gh, WHITE);
  fillRect(buf, size, gx0, gy0, gx0 + bowlOuterW, gy0 + strokeW, WHITE);
  fillRect(buf, size, gx0 + bowlOuterW - strokeW, gy0, gx0 + bowlOuterW, gy0 + bowlH, WHITE);
  fillRect(buf, size, gx0, gy0 + bowlH - strokeW, gx0 + bowlOuterW, gy0 + bowlH, WHITE);

  return buf;
}

const targets = [
  { name: "icon-192.png", size: 192, margin: 192 * 0.06 },
  { name: "icon-512.png", size: 512, margin: 512 * 0.06 },
  { name: "icon-192-maskable.png", size: 192, margin: 192 * 0.2 },
  { name: "icon-512-maskable.png", size: 512, margin: 512 * 0.2 },
  { name: "apple-touch-icon.png", size: 180, margin: 180 * 0.08 },
];

for (const t of targets) {
  const rgba = drawIcon(t.size, t);
  const png = encodePNG(t.size, t.size, rgba);
  writeFileSync(join(outDir, t.name), png);
  console.log("wrote", t.name, png.length, "bytes");
}
