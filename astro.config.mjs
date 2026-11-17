// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// En CI, actions/configure-pages proporciona el origen y el prefijo reales:
//   - github.io sin dominio:  SITE_URL=https://<usuario>.github.io  BASE_PATH=/<repo>
//   - con dominio propio:     SITE_URL=https://cloakstudio.app      BASE_PATH=(vacío)
const site = process.env.SITE_URL || 'https://cloakstudio.app';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  // GitHub Pages sirve archivos estáticos: todo se genera en build.
  output: 'static',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'auto' },
  integrations: [
    sitemap({
      // La política de privacidad es un borrador (noindex) hasta que se complete.
      filter: (page) => !page.includes('/privacidad'),
    }),
  ],
});
