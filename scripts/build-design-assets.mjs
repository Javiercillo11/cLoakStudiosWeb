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
import { writeFileSync } from 'node:fs';

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
async function eraseText(input, quads, pad = 4) {
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
    const [x0, x1, y0, y1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
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
//
// Fuente: principal-x4.webp, la referencia ampliada ×4 con superresolución
// (EDSR; ver scripts/upscale-reference.py), mucho más nítida que un reescalado.
// Se trabaja a ×3 sobre las coordenadas de la referencia de 1170×561.
const HI = 3;
const principalHi = await sharp(`${DIR}/principal-x4.webp`)
  .resize(1170 * HI, 561 * HI, { kernel: 'lanczos3' })
  .png()
  .toBuffer();
const principal = await eraseText(
  principalHi,
  [
    [[622, 217], [690, 228], [692, 264], [624, 254]],
    [[892, 247], [939, 252], [934, 277], [888, 274]],
    // Tarjeta de métricas: «12.5k» y el porcentaje.
    [[828, 160], [858, 160], [858, 172.5], [828, 172.5]],
    [[828, 175.5], [854, 175.5], [854, 181.5], [828, 181.5]],
  ].map((q) => q.map(([x, y]) => [x * HI, y * HI])),
  4 * HI,
);
// La escena se separa en capas para animarla sin redibujarla:
//  - plate: el fondo (portal, roca, nebulosa, paneles) con lo que hay detrás de
//    cada pieza móvil reconstruido rellenando desde fuera hacia dentro;
//  - una imagen recortada por pieza móvil (portátil, móvil, tarjeta, planeta,
//    asteroides), con el mismo fundido de bordes que la escena.
// Las posiciones (px del recorte de 734×452) se guardan en hero/layers.json.
{
  const CW = 734, CH = 452, SC = HI, W2 = CW * SC, H2 = CH * SC;
  // Fundido general de la escena: el alfa llega a 0 antes de cada borde del
  // recorte (se compone en modo normal sobre el violeta del fondo de la web).
  const sceneShapes = `
    <rect x="130" y="70" width="532" height="318" rx="70"/>
    <rect x="110" y="40" width="440" height="340" rx="60"/>`;
  const rgb = await sharp(principal).extract({ left: 436 * SC, top: 26 * SC, width: W2, height: H2 })
    .sharpen({ sigma: 0.5 }).removeAlpha().raw().toBuffer();
  const sceneA = await sharp(await mask(CW, CH, sceneShapes, 36)).resize(W2, H2).extractChannel(0).raw().toBuffer();
  const shapeMask = async (svg) =>
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="0 0 ${CW} ${CH}"><rect width="100%" height="100%" fill="#000"/><g fill="#fff">${svg}</g></svg>`))
      .extractChannel(0).raw().toBuffer();

  const laptop = '<polygon points="159,157 162,153 167,152 327,188 333,191 336,197 366,309 455,338 463,344 463,351 137,304 134,299 140,295 192,298"/>';
  const sprites = [
    { name: 'laptop', svg: laptop },
    { name: 'phone', svg: '<polygon points="478,137 483,131 490,129 558,132 564,134 567,141 512,298 507,302 500,302 433,288 428,284 427,277"/>' },
    { name: 'card', svg: '<rect x="380.5" y="101" width="62" height="70" rx="4"/>' },
    { name: 'planet', svg: '<circle cx="685" cy="128" r="85"/>' },
    { name: 'asteroid1', svg: '<ellipse cx="122" cy="286" rx="17" ry="14"/>', minus: laptop },
    { name: 'asteroid2', svg: '<ellipse cx="649" cy="328" rx="19" ry="16"/>' },
  ];

  // Máscara suave de una pieza: la silueta ensanchada `grow` px (del recorte)
  // con borde difuminado `soft` px. La pieza se lleva así su halo y sus reflejos,
  // y al flotar no deja un corte nítido sobre el fondo.
  const softMask = async (svg, grow, soft) =>
    sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="0 0 ${CW} ${CH}">
      <filter id="f" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${soft}"/></filter>
      <rect width="100%" height="100%" fill="#000"/>
      <g fill="#fff" stroke="#fff" stroke-width="${grow * 2}" stroke-linejoin="round" filter="url(#f)">${svg}</g></svg>`))
      .extractChannel(0).raw().toBuffer();

  // Zona a reconstruir: unión de las piezas ensanchada 7 px (cubre su halo).
  const unknown = new Uint8Array(W2 * H2);
  for (const sp of sprites) {
    sp.m = await softMask(sp.svg, 2, 1.6);
    const hole = await softMask(sp.svg, 7, 0.01);
    if (sp.minus) {
      const cutM = await shapeMask(sp.minus);
      for (let i = 0; i < sp.m.length; i++) sp.m[i] = Math.max(0, sp.m[i] - cutM[i]);
    }
    for (let i = 0; i < hole.length; i++) if (hole[i] > 6) unknown[i] = 1;
  }

  // Relleno multiescala («push-pull»): se construye una pirámide promediando solo
  // los píxeles conocidos y se baja rellenando los huecos con el nivel superior.
  // El resultado es un degradado limpio de los colores de alrededor, sin vetas.
  const plate = Buffer.from(rgb);
  {
    const levels = [];
    let w = W2, h = H2;
    let col = new Float32Array(w * h * 3);
    let wt = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (unknown[i]) continue;
      wt[i] = 1;
      col[i * 3] = rgb[i * 3]; col[i * 3 + 1] = rgb[i * 3 + 1]; col[i * 3 + 2] = rgb[i * 3 + 2];
    }
    levels.push({ w, h, col, wt });
    while (w > 2 && h > 2) {
      const nw = Math.ceil(w / 2), nh = Math.ceil(h / 2);
      const ncol = new Float32Array(nw * nh * 3), nwt = new Float32Array(nw * nh);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const i = y * w + x, k = (y >> 1) * nw + (x >> 1);
          const a = wt[i];
          if (!a) continue;
          nwt[k] += a;
          ncol[k * 3] += col[i * 3] * a; ncol[k * 3 + 1] += col[i * 3 + 1] * a; ncol[k * 3 + 2] += col[i * 3 + 2] * a;
        }
      for (let k = 0; k < nw * nh; k++)
        if (nwt[k]) {
          ncol[k * 3] /= nwt[k]; ncol[k * 3 + 1] /= nwt[k]; ncol[k * 3 + 2] /= nwt[k];
          nwt[k] = Math.min(1, nwt[k]);
        }
      w = nw; h = nh; col = ncol; wt = nwt;
      levels.push({ w, h, col, wt });
    }
    // Bajada: cada nivel completa sus huecos con el superior (interpolación bilineal).
    for (let l = levels.length - 2; l >= 0; l--) {
      const L = levels[l], U = levels[l + 1];
      for (let y = 0; y < L.h; y++)
        for (let x = 0; x < L.w; x++) {
          const i = y * L.w + x;
          if (L.wt[i] >= 1) continue;
          const fx = Math.min(U.w - 1, Math.max(0, (x - 0.5) / 2)), fy = Math.min(U.h - 1, Math.max(0, (y - 0.5) / 2));
          const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(U.w - 1, x0 + 1), y1 = Math.min(U.h - 1, y0 + 1);
          const tx = fx - x0, ty = fy - y0;
          const a = L.wt[i];
          for (let c = 0; c < 3; c++) {
            const v =
              (U.col[(y0 * U.w + x0) * 3 + c] * (1 - tx) + U.col[(y0 * U.w + x1) * 3 + c] * tx) * (1 - ty) +
              (U.col[(y1 * U.w + x0) * 3 + c] * (1 - tx) + U.col[(y1 * U.w + x1) * 3 + c] * tx) * ty;
            L.col[i * 3 + c] = L.col[i * 3 + c] * a + v * (1 - a);
          }
          L.wt[i] = 1;
        }
    }
    const F = levels[0];
    for (let i = 0; i < W2 * H2; i++) {
      if (!unknown[i]) continue;
      plate[i * 3] = F.col[i * 3]; plate[i * 3 + 1] = F.col[i * 3 + 1]; plate[i * 3 + 2] = F.col[i * 3 + 2];
    }
  }

  const rgba = (src, alphaAt, x0, y0, w, h) => {
    const out = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y0 + y) * W2 + (x0 + x);
        const o = (y * w + x) * 4;
        out[o] = src[i * 3]; out[o + 1] = src[i * 3 + 1]; out[o + 2] = src[i * 3 + 2];
        out[o + 3] = alphaAt(i);
      }
    return sharp(out, { raw: { width: w, height: h, channels: 4 } });
  };

  await rgba(plate, (i) => sceneA[i], 0, 0, W2, H2)
    .webp({ quality: 90, alphaQuality: 100, smartSubsample: true }).toFile(`${OUT}/hero/plate.webp`);
  console.log('✓ hero/plate.webp');

  const layers = {};
  for (const sp of sprites) {
    let x0 = W2, y0 = H2, x1 = 0, y1 = 0;
    for (let y = 0; y < H2; y++)
      for (let x = 0; x < W2; x++)
        if (sp.m[y * W2 + x] > 0) {
          x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
        }
    x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2);
    x1 = Math.min(W2 - 1, x1 + 2); y1 = Math.min(H2 - 1, y1 + 2);
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    await rgba(rgb, (i) => Math.round((sp.m[i] * sceneA[i]) / 255), x0, y0, w, h)
      .webp({ quality: 90, alphaQuality: 100, smartSubsample: true }).toFile(`${OUT}/hero/${sp.name}.webp`);
    layers[sp.name] = { x: x0 / SC, y: y0 / SC, w: w / SC, h: h / SC };
    console.log(`✓ hero/${sp.name}.webp`, w, h);
  }
  writeFileSync(`${OUT}/hero/layers.json`, JSON.stringify({ width: CW, height: CH, layers }, null, 2) + '\n');
}

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


// ── Hero: corteza rocosa a todo el ancho (principal.jpeg, y 392–561) ───────
// En el diseño la roca recorre todo el hero, también bajo el titular. Se recorta
// por su silueta (el cielo queda transparente) y se reconstruye la franja que
// tapaba la barra de servicios del diseño (x 133–977, y 480–521) prolongando la
// roca de encima en espejo y oscureciéndola hacia abajo, como en los laterales.
{
  const TOP = 392;
  const H = 561 - TOP;
  const W = 1170;
  const contour = [
    [0, 480], [50, 477], [150, 474], [300, 472], [400, 466], [440, 456], [470, 446], [500, 431],
    [530, 422], [560, 417], [590, 416], [620, 419], [660, 423], [700, 424], [760, 424], [820, 423],
    [880, 421], [930, 410], [960, 398], [990, 388], [1025, 382], [1060, 382], [1090, 388], [1120, 396],
    [1150, 410], [1170, 425],
  ];
  const { data } = await sharp(`${DIR}/principal.jpeg`).extract({ left: 0, top: TOP, width: W, height: H })
    .raw().toBuffer({ resolveWithObject: true });
  // La franja empieza en y 477 (incluye el borde de la barra). Relleno:
  //  - base: color medio de cada columna en la roca de encima (y 458–476),
  //    suavizado en horizontal y oscurecido hacia abajo;
  //  - textura: roca real a la misma altura del lateral derecho (x 980–1165).
  const STRIP = { x0: 133, x1: 977, y0: 477 };
  const px = (x, y, c) => data[((y - TOP) * W + x) * 3 + c];
  const col = [];
  for (let x = 0; x < W; x++) {
    const acc = [0, 0, 0];
    for (let y = 458; y <= 476; y++) for (let c = 0; c < 3; c++) acc[c] += px(x, y, c);
    col.push(acc.map((v) => v / 19));
  }
  const smooth = col.map((_, x) => {
    const acc = [0, 0, 0];
    let n = 0;
    for (let d = -14; d <= 14; d++) {
      const xx = Math.min(W - 1, Math.max(0, x + d));
      for (let c = 0; c < 3; c++) acc[c] += col[xx][c];
      n++;
    }
    return acc.map((v) => v / n);
  });
  const TX0 = 980;
  const TW = 185;
  const out = Buffer.from(data);
  for (let y = STRIP.y0; y < 561; y++) {
    const k = y - STRIP.y0;
    const dark = Math.max(0.3, 1 - k / 80);
    for (let x = STRIP.x0 - 24; x < STRIP.x1 + 24; x++) {
      const edge = Math.min(1, Math.max(0, Math.min(x - (STRIP.x0 - 24), STRIP.x1 + 24 - x) / 24));
      // Dos teselas en vaivén con periodos distintos (derecha 185 px, izquierda
      // 118 px): sus ejes de simetría no coinciden y no se aprecia repetición.
      const t = (x - STRIP.x0) % (2 * TW);
      const tx = TX0 + (t < TW ? t : 2 * TW - 1 - t);
      const u = (x - STRIP.x0 + 57) % (2 * 118);
      const ux = 8 + (u < 118 ? u : 2 * 118 - 1 - u);
      // Fundido vertical con la última fila de roca original (sin costura).
      const v = Math.min(1, k / 10);
      const i = ((y - TOP) * W + x) * 3;
      for (let c = 0; c < 3; c++) {
        const tex = (px(tx, y, c) + px(ux, y, c)) / 2;
        const fill = Math.min(255, smooth[x][c] * dark * 0.55 + tex * 0.85);
        const value = px(x, 476, c) * (1 - v) + fill * v;
        out[i + c] = Math.round(data[i + c] * (1 - edge) + value * edge);
      }
    }
  }
  const pts = [...contour.map(([x, y]) => `${x},${y - TOP}`), `${W + 50},${H + 50}`, `-50,${H + 50}`].join(' ');
  const ground = await sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
  await cut(ground, { left: 0, top: 0, width: W, height: H }, {
    out: 'cosmos/hero-ground.webp',
    scale: 2,
    blur: 1.5,
    quality: 88,
    shapes: `<polygon points="${pts}"/>`,
  });
}

// ── Asteroides sueltos para el resto de la página (principal.jpeg) ────────
const asteroids = [
  { out: 'cosmos/asteroid-1.webp', x: 534, y: 290, w: 50, h: 44 },
  { out: 'cosmos/asteroid-2.webp', x: 1058, y: 330, w: 54, h: 48 },
  { out: 'cosmos/asteroid-3.webp', x: 458, y: 370, w: 46, h: 44 },
];
for (const r of asteroids) {
  await cut(`${DIR}/principal.jpeg`, { left: r.x, top: r.y, width: r.w, height: r.h }, {
    out: r.out,
    scale: 3,
    blur: 3,
    quality: 88,
    shapes: `<ellipse cx="${r.w / 2}" cy="${r.h / 2}" rx="${r.w / 2 - 7}" ry="${r.h / 2 - 7}"/>`,
  });
}
