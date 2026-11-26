// Renderiza el planeta de llegada del footer: el horizonte de una esfera vista
// desde la órbita, con relieve (terreno fractal + cráteres), luz rasante desde
// detrás (amanecer orbital: solo se ilumina el filo) y atmósfera violeta.
// Uso: node scripts/build-planet.mjs  → src/assets/cosmos/planet-horizon.webp
import sharp from 'sharp';

const W = 2400; // ancho del render
const H = 1000; // alto del render (cubre el footer entero)
const R = 2900; // radio de la esfera (px)
const TOP = 120; // y del limbo (deja sitio al halo de la atmósfera)
const CX = W / 2;
const CY = TOP + R;

// ── Ruido 3D (value noise con interpolación suave) ─────────────────────────
const P = new Uint8Array(512);
{
  let seed = 20261126;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
}
const hash = (x, y, z) => P[(P[(P[x & 255] + y) & 255] + z) & 255] / 255;
const fade = (t) => t * t * (3 - 2 * t);
function noise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), xf), l(c(0, 1, 0), c(1, 1, 0), xf), yf),
    l(l(c(0, 0, 1), c(1, 0, 1), xf), l(c(0, 1, 1), c(1, 1, 1), xf), yf),
    zf,
  );
}
function fbm(x, y, z, oct = 6) {
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++) {
    v += a * noise(x * f, y * f, z * f);
    f *= 2.03;
    a *= 0.5;
  }
  return v;
}

// ── Cráteres: puntos de la esfera con radio angular ───────────────────────
const craters = [];
{
  let seed = 77;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 2200; i++) {
    // Concentrados en la franja visible (cerca del limbo superior tras el giro).
    const u = rnd() * 2 - 1;
    const th = rnd() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 0.0015 + Math.pow(rnd(), 5) * 0.03;
    craters.push({ x: s * Math.cos(th), y: u, z: s * Math.sin(th), r, cos: Math.cos(r * 1.9) });
  }
}

// Altura del terreno en un punto de la esfera (unitario).
function height(x, y, z) {
  // Altura en radianes de esfera (escala física): llanuras onduladas + rugosidad.
  let h = (fbm(x * 7, y * 7, z * 7) - 0.5) * 0.012 + (fbm(x * 60, y * 60, z * 60, 4) - 0.5) * 0.0025;
  for (const c of craters) {
    const d = x * c.x + y * c.y + z * c.z;
    if (d < c.cos) continue;
    const t = Math.acos(Math.min(1, d)) / c.r; // 0 centro … 1.9 fuera
    const depth = c.r * 0.2;
    // Perfil continuo: cuenco suave + cresta gaussiana en el borde.
    if (t < 1) h -= depth * (1 - t * t) * (1 - t * t * 0.25);
    h += depth * 0.32 * Math.exp(-(((t - 1) / 0.28) ** 2));
  }
  return h;
}

// Giro de la esfera: el limbo visible es una franja templada, no el polo.
const TILT = (62 * Math.PI) / 180;
const ct = Math.cos(TILT), st = Math.sin(TILT);
const rotate = (nx, ny, nz) => [nx, ny * ct - nz * st, ny * st + nz * ct];

// Luz: desde detrás y arriba (contraluz) + relleno violeta muy suave.
const norm = (v) => {
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
};
const L = norm([0.12, -0.62, -0.78]);
const FILL = norm([-0.3, -0.25, 0.92]);

const out = Buffer.alloc(W * H * 4);

// Pasada 1: altura del terreno en cada píxel de la esfera (en px de pantalla).
const hmap = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x + 0.5 - CX;
    const dy = y + 0.5 - CY;
    if (dx * dx + dy * dy >= R * R) continue;
    const nx = dx / R, ny = dy / R;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const [px, py, pz] = rotate(nx, ny, nz);
    hmap[y * W + x] = height(px, py, pz) * R;
  }
}

// Pasada 2: sombreado con la normal perturbada por el gradiente de altura.
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const dx = x + 0.5 - CX;
    const dy = y + 0.5 - CY;
    const d = Math.hypot(dx, dy);
    let r = 0, g = 0, b = 0, a = 0;

    if (d < R) {
      const nx = dx / R, ny = dy / R;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const k = y * W + x;
      const gx = x + 1 < W ? hmap[k + 1] - hmap[k] : 0;
      const gy = y + 1 < H ? hmap[k + W] - hmap[k] : 0;
      // Pendiente en pantalla → normal local (el escorzo cerca del filo sale solo).
      const N = norm([nx - gx * 0.9, ny - gy * 0.9, nz]);
      const diff = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]);
      const fill = Math.max(0, N[0] * FILL[0] + N[1] * FILL[1] + N[2] * FILL[2]);
      const [px, py, pz] = rotate(nx, ny, nz);
      // Albedo: «mares» oscuros de baja frecuencia + variación fina.
      const m = fbm(px * 2.2 + 3, py * 2.2, pz * 2.2, 4);
      const mare = Math.min(1, Math.max(0, (m - 0.42) / 0.16));
      const alb = (0.48 + 0.42 * mare) * (0.82 + 0.18 * fbm(px * 14, py * 14, pz * 14, 3));
      // Luz rasante: intensa en la franja junto al filo, se apaga hacia la cara nocturna.
      r = alb * (175 * diff + 7 * fill) + 6;
      g = alb * (150 * diff + 5 * fill) + 4;
      b = alb * (255 * diff + 16 * fill) + 16;
      // Dispersión atmosférica en el filo.
      const atm = Math.pow(1 - nz, 9) * 1.6;
      r += 110 * atm; g += 70 * atm; b += 240 * atm;
      // Línea de amanecer.
      const edge = Math.exp(-(R - d) / 1.8);
      r += 230 * edge; g += 215 * edge; b += 255 * edge;
      a = 255;
    } else {
      // Halo exterior de la atmósfera.
      const o = d - R;
      const halo = Math.exp(-o / 40) * 0.75 + Math.exp(-o / 7) * 0.7;
      r = 150 * halo; g = 100 * halo; b = 255 * halo;
      a = Math.min(255, 255 * Math.min(1, halo * 1.1));
      if (a > 0) {
        r = (r * 255) / a; g = (g * 255) / a; b = (b * 255) / a;
      }
    }
    out[i] = Math.min(255, r);
    out[i + 1] = Math.min(255, g);
    out[i + 2] = Math.min(255, b);
    out[i + 3] = a;
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .webp({ quality: 88, alphaQuality: 100, smartSubsample: true })
  .toFile('src/assets/cosmos/planet-horizon.webp');
console.log('✓ cosmos/planet-horizon.webp', `${W}×${H}`);
