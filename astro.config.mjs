// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { legalComplete } from './src/data/site.ts';

// En CI, actions/configure-pages proporciona el origen y el prefijo reales:
//   - github.io sin dominio:  SITE_URL=https://<usuario>.github.io  BASE_PATH=/<repo>
//   - con dominio propio:     SITE_URL=https://cloakstudios.app      BASE_PATH=(vacío)
const site = process.env.SITE_URL || 'https://cloakstudios.app';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  // GitHub Pages sirve archivos estáticos: todo se genera en build.
  output: 'static',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  // Español en la raíz y la versión en inglés en /en/.
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'es', locales: { es: 'es-ES', en: 'en' } },
      // Las páginas legales son un borrador (noindex) hasta que estén todos los datos del titular.
      filter: (page) => legalComplete || !/\/(privacidad|aviso-legal)\/?$/.test(page),
    }),
  ],
});
