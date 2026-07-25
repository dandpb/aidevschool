// Gera os ícones do PWA por código (sem dependências: node:zlib + PNG cru).
// Arte: os mesmos cubos "voxel" da UI, para o ícone falar a mesma língua visual.
// Os PNGs são arte estática versionada em public/; rode `npm run gen:icons`
// só quando a arte mudar (a saída é determinística).
// Uso: node tools/gen-icons.mjs  → public/icon-192.png, public/icon-512.png
import { crc32, deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BG = [29, 78, 216]; // --primary
const CUBES = [
  // x, y, lado, cor da face (unidades de 0..1 sobre o lado do ícone)
  { x: 0.2, y: 0.44, size: 0.2, face: [255, 255, 255] },
  { x: 0.4, y: 0.26, size: 0.2, face: [199, 210, 254] },
  { x: 0.52, y: 0.52, size: 0.2, face: [245, 158, 11] },
];
const SHADOW = [49, 46, 129];

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  const rows = [];
  for (let y = 0; y < size; y += 1) {
    rows.push(Buffer.from([0]), pixels.subarray(y * size * 3, (y + 1) * size * 3));
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 3).fill(Buffer.from(BG));
  const fill = (left, top, side, color) => {
    const from = Math.max(0, left);
    const to = Math.min(size, left + side);
    for (let y = Math.max(0, top); y < Math.min(size, top + side); y += 1) {
      pixels.fill(Buffer.from(color), (y * size + from) * 3, (y * size + to) * 3);
    }
  };
  const offset = Math.round(size * 0.045);
  for (const cube of CUBES) {
    const side = Math.round(cube.size * size);
    const left = Math.round(cube.x * size);
    const top = Math.round(cube.y * size);
    fill(left + offset, top + offset, side, SHADOW);
    fill(left, top, side, cube.face);
  }
  return encodePng(size, pixels);
}

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "public");
mkdirSync(publicDir, { recursive: true });
for (const size of [192, 512]) {
  const file = resolve(publicDir, `icon-${size}.png`);
  writeFileSync(file, drawIcon(size));
  console.log(`ícone gerado: ${file}`);
}
