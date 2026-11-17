// Genera los assets de marca a partir de brand/logo.jpeg (logo oficial).
// Uso: npm run brand:assets
//
// El JPEG trae el icono (cuadrado redondeado oscuro) sobre fondo claro.
// Se recorta el icono, se le aplica una máscara redondeada con transparencia
// y se exportan los tamaños necesarios para web, favicon y app icon.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE = 'brand/logo.jpeg';
// Caja del icono dentro de logo.jpeg (medida sobre el original de 1170×614).
const CROP = { left: 377, top: 95, width: 416, height: 416 };
// Radio aproximado de las esquinas del icono original (≈22 %).
const RADIUS_RATIO = 0.215;
const OBSIDIAN = '#09090B';

const roundedMask = (size, inset = 0) => {
  const r = Math.round(size * RADIUS_RATIO);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<rect x="${inset}" y="${inset}" width="${size - inset * 2}" height="${size - inset * 2}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
  );
};

// Icono recortado y enmascarado (PNG con alfa) a un tamaño dado.
async function mark(size) {
  // Se recorta 2 px hacia dentro para eliminar el halo claro del JPEG en los bordes.
  const base = await sharp(SOURCE)
    .extract({ left: CROP.left + 2, top: CROP.top + 2, width: CROP.width - 4, height: CROP.height - 4 })
    .resize(size, size, { kernel: 'lanczos3' })
    .toBuffer();
  return sharp(base)
    .ensureAlpha()
    .composite([{ input: roundedMask(size), blend: 'dest-in' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// Icono sobre fondo sólido (para app icons sin transparencia, p. ej. iOS).
async function solid(size, pad = 0) {
  const inner = size - pad * 2;
  return sharp({ create: { width: size, height: size, channels: 4, background: OBSIDIAN } })
    .composite([{ input: await mark(inner), left: pad, top: pad }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await mkdir('public', { recursive: true });
await mkdir('src/assets/brand', { recursive: true });

// Fuente de alta resolución para <Image /> de Astro (genera AVIF/WebP en build).
await sharp(await mark(512)).toFile('src/assets/brand/logo-mark.png');

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
