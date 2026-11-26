// Rutas conscientes del prefijo de despliegue.
// En GitHub Pages sin dominio propio la web vive en /<repo>/; con dominio propio, en la raíz.
// El prefijo (`base`) y el origen (`site`) se fijan en astro.config.mjs.

const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

/** Ruta interna con prefijo: withBase('/privacidad') → '/cLoakStudiosWeb/privacidad'. */
export function withBase(path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${p}` || '/';
}

/** URL absoluta para canonical, Open Graph y datos estructurados. */
export function absoluteUrl(path = '/'): string {
  return new URL(withBase(path), import.meta.env.SITE).href;
}

/** ¿Es una portada (española en la raíz o inglesa en /en)? Con o sin barra final. */
export function isHomePath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '');
  return p === BASE || p === `${BASE}/en`;
}
