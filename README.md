# cLoak Studios — web comercial

Web de [cloakstudios.app](https://cloakstudios.app): presentación de los tres servicios (páginas web, aplicaciones de gestión y QR para reseñas) y formulario inteligente de solicitud de presupuesto.

- **Stack:** [Astro 7](https://astro.build) + TypeScript, salida 100 % estática (GitHub Pages).
- **Estilos:** CSS propio con design tokens (`src/styles/tokens.css`). Sin frameworks CSS.
- **Fuentes:** autoalojadas con Fontsource (Space Grotesk, Inter, Plus Jakarta Sans, JetBrains Mono), `font-display: swap`.
- **Formulario:** validación en cliente + envío a [Web3Forms](https://web3forms.com) (gratis, sin backend propio).

## Desarrollo

Requiere Node ≥ 22.23.

```bash
npm install
npm run dev        # http://localhost:4321
npm test           # tests de validación y envío (node:test)
npm run build      # astro check + build estático en dist/
npm run preview    # sirve dist/ en local
```

Sin `PUBLIC_WEB3FORMS_ACCESS_KEY`, `npm run dev` arranca el formulario en **modo prueba**: se ve un aviso amarillo, se valida todo y la solicitud se imprime en la consola del navegador, **sin enviar ningún email**. El panel de éxito lleva la etiqueta «Modo prueba».

## Formulario de contacto

```
src/lib/contact/schema.ts   modelo, saneado, validación y payload (código puro, testeado)
src/lib/contact/submit.ts   capa de envío desacoplada (Web3Forms) + modos live/test/disabled
src/scripts/contact-form.ts comportamiento en el navegador
src/components/ContactForm.astro, form/Field.astro, form/ChoiceGroup.astro
```

Cómo funciona:

1. El visitante elige servicio (o llega con él preseleccionado desde una tarjeta o con un enlace `/?servicio=web|app|qr|otro#contacto`).
2. Aparece el bloque de preguntas de ese servicio. Al cambiar de servicio los bloques ocultos se desactivan (no se envían) pero **conservan lo escrito**.
3. Validación inline accesible (`aria-invalid`, mensajes asociados con `aria-describedby`, resumen en `role="alert"`, foco al primer error). En QR, el nombre del negocio pasa a ser obligatorio.
4. Al enviar: botón desactivado + «Enviando…» (sin doble envío), timeout de 15 s.
5. **El mensaje de éxito solo aparece si Web3Forms responde `success: true`.** Cualquier otro caso muestra un error recuperable y los datos se mantienen.

Modos (se fijan en build):

| Situación | Modo | Comportamiento |
| --- | --- | --- |
| Hay access key | `live` | Envío real |
| Sin key, `npm run dev` | `test` | Nada se envía; aviso visible |
| Sin key, build de producción | `disabled` | Aviso al visitante y botón desactivado; el build muestra un warning |

Anti-spam: honeypot `botcheck` (filtrado por Web3Forms), límite local de 3 envíos/hora por navegador y el rate limit y filtro de spam propios de Web3Forms. Todos los campos se sanean (caracteres de control, espacios y longitudes máximas) y los campos cerrados solo aceptan valores de una lista blanca.

> **Limitación conocida:** al ser un sitio estático no hay servidor propio. La validación «de servidor» se limita a la que hace Web3Forms (access key, email, spam). Si en el futuro se necesita validación o almacenamiento propios, basta con sustituir `submitContact()` por una llamada a un endpoint (p. ej. una función serverless).

### Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `PUBLIC_WEB3FORMS_ACCESS_KEY` | En producción | Access key de Web3Forms. Es **pública por diseño** (solo identifica el buzón de destino), por eso va con prefijo `PUBLIC_` y acaba en el HTML. |

Ver `.env.example`.

## Despliegue en GitHub Pages

El workflow `.github/workflows/deploy.yml` ejecuta tests, `astro check`, build y publica en cada push a `main`.

El workflow pregunta a GitHub (`actions/configure-pages`) dónde se publica la web y construye con ese origen y prefijo (`SITE_URL` / `BASE_PATH`, ver `astro.config.mjs`). Así funciona igual en `https://<usuario>.github.io/<repo>/` que en el dominio propio, sin tocar código. Las rutas internas usan `withBase()` / `absoluteUrl()` de `src/lib/paths.ts`.

1. **Settings → Pages → Source:** «GitHub Actions».
2. **Settings → Secrets and variables → Actions → Variables:** crear `PUBLIC_WEB3FORMS_ACCESS_KEY`.
3. **Dominio:** `public/CNAME` ya contiene `cloakstudios.app`. En el DNS del dominio, apuntar los registros `A`/`AAAA` del apex a las IP de GitHub Pages (o un `ALIAS`/`ANAME`) y activar «Enforce HTTPS».
4. En el panel de Web3Forms, restringir los envíos al dominio `cloakstudios.app`.

> En el plan gratuito de GitHub, Pages requiere que el repositorio sea público.

## Marca

- Logo oficial: `brand/logo.jpeg`. `npm run brand:assets` separa la «C» del fondo oscuro (transparencia real) y genera `src/assets/brand/logo-symbol.png` (optimizado a WebP por Astro), favicon (`.ico` y PNG), `apple-touch-icon` e iconos del manifest (incluido uno *maskable*).
- Imagen Open Graph: `public/og-image.png`, renderizada desde `scripts/og-image.html` con las fuentes de la marca (navegador headless, 1200×630).
- Tokens: paleta del brand guide + derivados para cumplir WCAG AA:
  - Botones con relleno `#7C3AED` (blanco 5,7:1). El `#8B5CF6` de la guía con texto blanco da 4,23:1 y no pasa AA, así que se reserva para bordes, iconos y detalles.
  - Texto violeta pequeño en `#A78BFA` / `#C4B5FD` (7,3:1 y 10,8:1 sobre Obsidian).
  - Bordes de controles `#71717A` (3,67:1 sobre Carbon).
- `brand/fondo.jpeg` y la otra imagen de `brand/` son referencias de inspiración de terceros: no se usan en la web.

## Pendiente (requiere datos del propietario)

- [ ] Access key de Web3Forms (variable de repositorio) y restricción de dominio en su panel.
- [ ] Completar la **política de privacidad** (`src/pages/privacidad.astro`): titular, NIF, domicilio, email de privacidad, plazo de conservación y garantías de Web3Forms. Hoy se publica como borrador marcado y con `noindex`.
- [ ] Email de contacto público y redes sociales reales → `src/data/site.ts` (se muestran automáticamente cuando dejan de ser `null`/vacíos).
- [ ] Aviso legal (`site.legalNoticeHref`).
- [ ] Proyectos reales: no hay sección de portfolio hasta que existan casos publicables.
