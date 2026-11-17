// Genera los assets de marca a partir de brand/logo.jpeg (logo oficial).
// Uso: npm run brand:assets
//
// El JPEG trae el símbolo (la «C») sobre un cuadrado redondeado oscuro.
// Se separa la «C» del fondo oscuro por luminosidad, se le da transparencia
// y se exportan los tamaños necesarios para web, favicon y app icons.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'brand/logo.jpeg';
// Caja del icono dentro de logo.jpeg (medida sobre el original de 1170×614).
const CROP = { left: 377, top: 95, width: 416, height: 416 };
const OBSIDIAN = '#09090B';
// Umbrales de brillo (canal máximo): el fondo no supera ~50; la «C» está por encima de ~90.
const ALPHA_LOW = 58;
const ALPHA_HIGH = 105;
// Color medio del fondo, usado para «des-mezclar» los bordes semitransparentes.
const BG = [16, 6, 30];

const smooth = (x) => {
  const t = Math.min(1, Math.max(0, (x - ALPHA_LOW) / (ALPHA_HIGH - ALPHA_LOW)));
  return t * t * (3 - 2 * t);
};

/** ¿Está el píxel dentro del cuadrado redondeado del icono (con un pequeño margen)? */
function insideRoundedSquare(x, y, size, inset = 6, radiusRatio = 0.22) {
  const r = size * radiusRatio;
  const lo = inset + r;
  const hi = size - inset - r;
  const cx = Math.min(Math.max(x, lo), hi);
  const cy = Math.min(Math.max(y, lo), hi);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r && x >= inset && y >= inset && x < size - inset && y < size - inset;
}

/** «C» sin fondo, recortada a su contenido y centrada en un lienzo cuadrado (RGBA). */
async function cutout() {
  const { data, info } = await sharp(SOURCE).extract(CROP).raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const out = Buffer.alloc(w * h * 4);
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const o = (y * w + x) * 4;
      const c = [data[i], data[i + 1], data[i + 2]];
      // Fuera del cuadrado redondeado original (esquinas claras del JPEG) todo es transparente.
      const a = insideRoundedSquare(x, y, w) ? smooth(Math.max(...c)) : 0;
      for (let k = 0; k < 3; k++) {
        // Quita la contribución del fondo oscuro en píxeles semitransparentes.
        out[o + k] = a > 0 ? Math.min(255, Math.max(0, Math.round((c[k] - BG[k] * (1 - a)) / a))) : 0;
      }
      out[o + 3] = Math.round(a * 255);
      if (a > 0.04) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  const side = Math.max(bw, bh);
  const trimmed = await sharp(out, { raw: { width: w, height: h, channels: 4 } })
    .extract({ left: minX, top: minY, width: bw, height: bh })
    .png()
    .toBuffer();
  return sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left: Math.floor((side - bw) / 2), top: Math.floor((side - bh) / 2) }])
    .png()
    .toBuffer();
}

const C = await cutout();

/** Símbolo transparente a un tamaño dado, con un pequeño margen interior. */
async function mark(size, padRatio = 0.04) {
  const pad = Math.round(size * padRatio);
  const inner = await sharp(C).resize(size - pad * 2, size - pad * 2, { kernel: 'lanczos3' }).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: inner, left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Símbolo sobre fondo sólido: solo para app icons que exigen opacidad (iOS, maskable).
async function solid(size, pad = 0) {
  const inner = size - pad * 2;
  return sharp({ create: { width: size, height: size, channels: 4, background: OBSIDIAN } })
    .composite([{ input: await mark(inner, 0.12), left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await mkdir('public', { recursive: true });
await mkdir('src/assets/brand', { recursive: true });

// Fuente de alta resolución para <Image /> de Astro (genera AVIF/WebP en build).
await sharp(await mark(512)).toFile('src/assets/brand/logo-symbol.png');

// PNG con paleta: mucho más ligeros y visualmente idénticos a estos tamaños.
const small = (buf) => sharp(buf).png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 });
await small(await mark(32)).toFile('public/favicon-32.png');
await small(await mark(192)).toFile('public/icon-192.png');
await small(await mark(512)).toFile('public/icon-512.png');
await small(await solid(180)).toFile('public/apple-touch-icon.png');
// Maskable: el icono ocupa la zona segura (80 %) sobre Obsidian.
await small(await solid(512, 52)).toFile('public/icon-maskable-512.png');
// favicon.ico (contenedor ICO con un PNG de 32 px; soportado por todos los navegadores actuales).
const png32 = await mark(32);
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png32.length, 14);
header.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([header, png32]));

console.log('Brand assets generados en public/ y src/assets/brand/.');
