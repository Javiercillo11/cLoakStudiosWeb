// Genera los recortes de los diseños de referencia que usa la portada.
// Uso: node scripts/build-design-assets.mjs
//
//   cLoak Studios/Diseño/principal.jpeg (1170×561)  → escena del hero (portal + dispositivos)
//   cLoak Studios/Diseño/servicios.jpeg (1672×941)  → fotos de las tarjetas y franjas de universo
//
// Las zonas con texto/UI del diseño se excluyen con máscaras de alfa difuminadas;
// en la web estos recortes se mezclan en modo `screen` sobre el cielo común, así
// su negro desaparece y no se nota ninguna caja.
import sharp from 'sharp';

const DIR = 'cLoak Studios/Diseño';
const OUT = 'src/assets';
const P = 160; // margen para que el desenfoque de la máscara no recorte los bordes exteriores

/**
 * Máscara de alfa del tamaño del recorte: `shapes` (blancas, desenfocadas) y
 * `plain` (sin desenfoque, p. ej. degradados largos definidos en `defs`).
 */
async function mask(w, h, shapes, blur, plain = '', defs = '') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w + 2 * P}" height="${h + 2 * P}">
    <defs>${defs}</defs>
    <filter id="b" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse"><feGaussianBlur stdDeviation="${blur}"/></filter>
    <rect width="100%" height="100%" fill="#000"/>
    <g filter="url(#b)" fill="#fff" transform="translate(${P} ${P})">${shapes}</g>
    <g transform="translate(${P} ${P})">${plain}</g></svg>`;
  return sharp(Buffer.from(svg)).extract({ left: P, top: P, width: w, height: h }).extractChannel(0).toColourspace('b-w').png().toBuffer();
}

/**
 * Nivel de negro: el fondo «negro» de las referencias lleva un tono azulado
 * (≈ 4,1,20) que, mezclado en `screen`, aclara el cielo y deja ver la caja.
 * Se lleva a negro puro con una rodilla suave; las luces no cambian.
 */
function levels(v, bp) {
  if (!bp) return v;
  const knee = 120;
  if (v >= knee) return v;
  const t = v / knee;
  return Math.max(0, Math.round(v - bp * (1 - t) * (1 - t)));
}

async function cut(input, box, { shapes, plain = '', defs = '', blur = 14, scale = 1, out, quality = 92, black }) {
  const w = Math.round(box.width * scale);
  const h = Math.round(box.height * scale);
  let img = sharp(input).extract(box);
  if (scale !== 1) img = sharp(await img.resize(w, h, { kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }).png().toBuffer());
  let pipeline = sharp(await img.png().toBuffer());
  if (shapes || plain) {
    // RGBA explícito: color del recorte + alfa de la máscara.
    const rgb = await img.removeAlpha().raw().toBuffer();
    const alpha = await sharp(await mask(box.width, box.height, shapes, blur, plain, defs)).resize(w, h).extractChannel(0).raw().toBuffer();
    const rgba = Buffer.alloc(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = levels(rgb[i * 3], black?.[0]);
      rgba[i * 4 + 1] = levels(rgb[i * 3 + 1], black?.[1]);
      rgba[i * 4 + 2] = levels(rgb[i * 3 + 2], black?.[2]);
      rgba[i * 4 + 3] = alpha[i];
    }
    pipeline = sharp(rgba, { raw: { width: w, height: h, channels: 4 } });
  }
  await pipeline.webp({ quality, alphaQuality: 100, smartSubsample: true }).toFile(`${OUT}/${out}`);
  console.log('✓', out, `${w}×${h}`);
}

/**
 * Borra un texto rasterizado (cuadrilátero en px de la referencia) rellenándolo
 * con el color medio de su contorno, con borde suave. El texto se pinta luego en
 * HTML, nítido, encima de la escena.
 */
async function eraseText(input, quads) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const inside = (q, x, y) => {
    let c = false;
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      const [xi, yi] = q[i];
      const [xj, yj] = q[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (const q of quads) {
    const xs = q.map((p) => p[0]);
    const ys = q.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs) - 4, Math.max(...xs) + 4, Math.min(...ys) - 4, Math.max(...ys) + 4];
    // Color de fondo: media del contorno sin los píxeles claros (texto, brillos).
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        if (inside(q, x, y)) continue;
        const i = (y * W + x) * 3;
        if (Math.max(data[i], data[i + 1], data[i + 2]) > 70) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
    const fill = [r / n, g / n, b / n];
    const mw = x1 - x0 + 1;
    const mask = new Float32Array(mw * (y1 - y0 + 1));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) mask[(y - y0) * mw + (x - x0)] = inside(q, x, y) ? 1 : 0;
    // Borde suave (caja 3×3) para que el parche no se note.
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        let m = 0, k = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const yy = y + dy - y0, xx = x + dx - x0;
            if (yy < 0 || xx < 0 || yy >= y1 - y0 + 1 || xx >= mw) continue;
            m += mask[yy * mw + xx]; k++;
          }
        m /= k;
        if (!m) continue;
        const i = (y * W + x) * 3;
        for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] * (1 - m) + fill[c] * m);
      }
  }
  return sharp(data, { raw: { width: W, height: info.height, channels: 3 } }).png().toBuffer();
}

// ── Hero: escena del portal (principal.jpeg) ─────────────────────────────
// Recorte x 436–1170, y 26–478: por debajo del menú y por encima de la barra de
// servicios. Textos de las pantallas («Ideas que conectan.», «Deja tu reseña»)
// borrados: se pintan en HTML.
const principal = await eraseText(`${DIR}/principal.jpeg`, [
  [[622, 217], [690, 228], [692, 264], [624, 254]],
  [[892, 247], [939, 252], [934, 277], [888, 274]],
]);
await cut(principal, { left: 436, top: 26, width: 734, height: 452 }, {
  out: 'cosmos/hero-portal.webp',
  scale: 2,
  blur: 36,
  quality: 90,
  // Se compone en modo normal sobre el mismo violeta del fondo de la web: el
  // alfa llega a 0 antes de cada borde del recorte (sin caja ni siluetas).
  shapes: `
    <rect x="130" y="70" width="532" height="318" rx="70"/>
    <rect x="110" y="40" width="440" height="340" rx="60"/>`,
});

// ── Servicios (servicios.jpeg) ───────────────────────────────────────────
const servicios = `${DIR}/servicios.jpeg`;
// Tapa el icono de compartir (abajo a la derecha) con un parche vecino.
const p1 = await sharp(servicios).extract({ left: 1580, top: 800, width: 64, height: 40 }).toBuffer();
const p2 = await sharp(servicios).extract({ left: 1580, top: 905, width: 64, height: 36 }).toBuffer();
const clean = await sharp(servicios)
  .composite([
    { input: p1, left: 1580, top: 840 },
    { input: p2, left: 1580, top: 872 },
  ])
  .png()
  .toBuffer();

// Franjas de universo sin UI.
await cut(clean, { left: 760, top: 0, width: 912, height: 941 }, {
  out: 'cosmos/universe-right.webp',
  blur: 30,
  black: [5, 2, 22],
  // Franja lateral con degradado largo hacia dentro (x 600 → 790) y la nebulosa
  // que entra por encima de las tarjetas (y 108–312) con desenfoque amplio.
  defs: `<linearGradient id="gr" x1="600" x2="790" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>`,
  plain: `<rect x="600" y="0" width="312" height="941" fill="url(#gr)"/>`,
  shapes: `<rect x="110" y="160" width="560" height="104" rx="52"/>`,
});
await cut(clean, { left: 0, top: 0, width: 250, height: 941 }, {
  out: 'cosmos/universe-left.webp',
  blur: 14,
  black: [5, 2, 22],
  // Degradado largo hacia dentro (x 40 → 250): sin borde visible junto a las tarjetas.
  defs: `<linearGradient id="gl" x1="40" x2="250" y1="0" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
  plain: `<rect x="0" y="0" width="250" height="941" fill="url(#gl)"/>`,
  shapes: '',
});

// Fotos de las tarjetas (y 336–500). El icono de cada tarjeta, que en el diseño
// solapa la foto, se tapa con la franja de foto que tiene justo encima.
const cards = [
  { out: 'services/web.webp', left: 265, icon: { left: 277, top: 483, width: 38, height: 17 } },
  { out: 'services/app.webp', left: 642, icon: { left: 642, top: 486, width: 34, height: 14 } },
  { out: 'services/qr.webp', left: 1017, icon: { left: 1029, top: 486, width: 38, height: 14 } },
];
for (const { out, left, icon } of cards) {
  const patch = await sharp(clean).extract({ ...icon, top: icon.top - icon.height }).toBuffer();
  const photo = await sharp(clean).composite([{ input: patch, left: icon.left, top: icon.top }]).png().toBuffer();
  await cut(photo, { left, top: 336, width: 316, height: 164 }, { out, scale: 2, quality: 90 });
}

