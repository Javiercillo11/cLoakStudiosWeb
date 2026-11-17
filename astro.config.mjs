// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://cloakstudio.app',
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
