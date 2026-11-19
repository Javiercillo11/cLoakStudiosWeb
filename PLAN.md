# Plan · cLoak Studios — Web + App

Contenido:

1. Formulario de la web → app (Supabase)
2. Botón de WhatsApp
3. "Sobre mí" enlazado al portafolio
4. Parte legal (aviso legal, privacidad, email)
5. Trabajos realizados en la web, alimentados desde la app
6. Testimonios de clientes con aprobación
7. Aviso instantáneo (push) de solicitudes nuevas

Fecha: 19/11/2026

Proyectos implicados:

- **cLoakStudiosWeb** (`~/projects/cLoakStudiosWeb`): web pública, Astro estático, GitHub Pages, dominio `cloakstudios.app`.
- **cLoakStudiosApp** (`~/projects/cLoakStudiosApp`): app privada de gestión, React + Vite + Supabase, GitHub Pages.
- **portafolio** (`~/projects/portafolio`): portafolio personal, publicado en https://javiercillo11.github.io/portafolio/

## Progreso

| Paso | Estado |
|---|---|
| 0 | ✅ Commit de recursos de marca y del plan |
| 1 | ⏳ Esperando datos legales de Javier |
| 2 | ✅ Hecho en local (commit `66c524f`), **sin desplegar** hasta tener los datos legales. Se rellenan en `legal` y `site.email` de `src/data/site.ts` |
| 3 | ⏳ Javier: ejecutar `cLoakStudiosApp/supabase/migrations/006_leads.sql` (probada en Postgres 15 local) |
| 4 | ✅ Hecho en local en la app (commit `2533e6a`), **sin desplegar** hasta ejecutar la migración |
| 5 | ⏳ Javier: variables `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` en el repo de la web |
| 6 | ✅ Hecho en local (commit `852d4b3`), **sin desplegar**. Sin las variables, la web sigue enviando solo a Web3Forms |
| 7+ | Pendiente |

Cambios respecto al plan original:

- `details` se guarda como lista `[{label, value}]`, porque jsonb no conserva el orden de las claves.
- El borrado automático es **diario** y elimina las solicitudes **no convertidas** con 12 meses sin actividad (no solo las descartadas), que es lo que dice la política de privacidad.
- Mientras falten datos legales, `/aviso-legal` y `/privacidad` se publican con `noindex` y fuera del sitemap de forma automática (`legalComplete`).

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| WhatsApp | +34 678 494 955 |
| Mensaje de WhatsApp | "Hola, quería pedir información" (el mismo para todos los servicios) |
| Email de Web3Forms | Se mantiene, además de guardar en Supabase |
| "Sobre mí" | En la web pública (no en la app) |
| URL del portafolio | https://javiercillo11.github.io/portafolio/ |

---

## 1 · Formulario de la web → app (misma base de datos Supabase)

### Situación actual

- La web envía el formulario a **Web3Forms**, que lo reenvía por email. El envío está aislado en `src/lib/contact/submit.ts`. La validación y el saneado están en `src/lib/contact/schema.ts`.
- La app usa Supabase. Todas sus tablas tienen RLS `owner_all`: solo usuarios autenticados, y cada uno solo ve sus propias filas.
- Por eso la web (visitante anónimo) no puede escribir en `projects`, y no debe poder hacerlo.

### Idea

La web guarda cada solicitud en una **tabla nueva `leads`** del mismo Supabase, a través de una función controlada. La app muestra las solicitudes en una pantalla **"Solicitudes"**, desde la que se pueden convertir en proyecto.

Va en una tabla aparte, y no directamente en `projects`, por tres motivos:

- el spam no se mezcla con los proyectos reales,
- se conservan las respuestas propias de cada servicio,
- `projects` no tiene columna de email.

### 1.A · Base de datos (cLoakStudiosApp → `supabase/migrations/006_leads.sql`)

1. **Tabla `leads`**:
   - `id uuid`, `user_id uuid` (propietario), `created_at timestamptz`, `updated_at timestamptz`
   - `status`: enum `lead_status` → `nuevo` / `contactado` / `convertido` / `descartado`
   - `service text`: `web` / `app` / `qr` / `otro`
   - `name`, `business`, `email`, `phone`, `message`
   - `details jsonb`: respuestas propias del servicio, guardadas como pares "etiqueta → valor" para que la app las muestre tal cual
   - `project_id uuid null` → `projects` (`on delete set null`)
   - Restricciones de longitud iguales a los límites `LIMITS` de la web.
2. **RLS**: la política `owner_all` para `authenticated`, como el resto de tablas. **Sin acceso directo para `anon`.**
3. **Función `submit_lead(...)`** (`security definer`, `set search_path = public`):
   - Es la única puerta de entrada desde la web. `revoke execute ... from public` y `grant execute ... to anon`.
   - Vuelve a validar en el servidor: obligatorios, formato del email y longitudes.
   - Si el honeypot `botcheck` viene relleno, devuelve "ok" y no guarda nada.
   - Límite global de envíos: unas 20 solicitudes por hora.
   - Asigna `user_id` al único usuario existente (el registro está desactivado). Alternativa: una tabla de configuración con el id del propietario.
4. Añadir `leads` a la publicación `supabase_realtime` para que la app reciba las solicitudes nuevas al momento.
5. Reflejar todo en `supabase/schema.sql` para instalaciones desde cero.

### 1.B · Web (cLoakStudiosWeb)

1. Variables nuevas en `.env`, `.env.example`, `src/env.d.ts` y en las variables del repo de GitHub:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY` (la misma anon key de la app, pública por diseño)
2. `schema.ts` → `buildLeadPayload(values)`: prepara los argumentos de `submit_lead` reutilizando `serviceDetails()`.
3. `submit.ts`:
   - Envío **en paralelo** a Supabase (`fetch` a `/rest/v1/rpc/submit_lead`, sin añadir librerías) y a Web3Forms.
   - Al visitante se le muestra éxito si **al menos uno** de los dos envíos funciona.
   - Se ajustan los modos `live` / `test` / `disabled` para que tengan en cuenta las dos claves.
4. `src/pages/privacidad.astro`: indicar que los datos también se guardan en Supabase.
5. Tests: `buildLeadPayload` y los casos de envío (los dos bien, falla uno, fallan los dos).

### 1.C · App (cLoakStudiosApp)

1. Tipo `Lead` en `src/lib/types.ts`, reutilizando el hook `useTable`.
2. **Pantalla "Solicitudes"** (`src/pages/Leads.tsx`, ruta `/solicitudes`):
   - Entrada en el menú lateral y en el menú móvil (`Layout.tsx`), con un contador de solicitudes nuevas.
   - Lista filtrable por estado.
   - Detalle con todos los datos y botones de email (`mailto:`), llamada (`tel:`) y WhatsApp al cliente.
   - Cambio de estado.
   - **"Convertir en proyecto"**: abre `ProjectForm` ya rellenado (`client_name`, `business_name`, `phone`, y `description` con el mensaje y los detalles). Al guardar, la solicitud pasa a `convertido` y se guarda su `project_id`. Los servicios se eligen a mano.
3. **Dashboard**: indicador de "Solicitudes nuevas".
4. **Realtime**: las solicitudes nuevas aparecen sin recargar.
5. Tests de la conversión de solicitud a proyecto.

### Si llega spam más adelante

Poner una **Supabase Edge Function** con **Cloudflare Turnstile** (un captcha invisible y gratuito) delante de la inserción. No haría falta tocar la tabla ni la app.

---

## 2 · Botón de WhatsApp (web)

1. **Datos** en `src/data/site.ts`:
   ```ts
   whatsapp: { phone: '34678494955', message: 'Hola, quería pedir información' }
   ```
   Siguiendo lo que ya hace el proyecto, si `phone` es `null`, el botón no se muestra.
2. **Enlace** en `src/lib/whatsapp.ts`: una función que deja solo los dígitos del número y codifica el texto. Con su test.
   ```
   https://wa.me/34678494955?text=Hola%2C%20quer%C3%ADa%20pedir%20informaci%C3%B3n
   ```
3. **Botón flotante** (`src/components/WhatsAppButton.astro`, incluido en `BaseLayout.astro` para que salga en todas las páginas):
   - Abajo a la derecha, respetando el área segura del móvil (`env(safe-area-inset-*)`). En capas queda por debajo de la cabecera (`z-index` 50) y del skip-link (100).
   - Estilo de la marca: círculo oscuro con brillo violeta (`--glow-neon`) y el logo de WhatsApp en verde.
   - Accesible: `aria-label="Escríbenos por WhatsApp"`, `target="_blank" rel="noopener"` y foco visible.
   - Sin animaciones con `prefers-reduced-motion`.
   - En móvil se oculta mientras se ve el formulario de contacto (con `IntersectionObserver`), para no tapar el botón de enviar.
4. **Enlace secundario** en `Contact.astro`: "¿Prefieres WhatsApp? Escríbenos", junto al email.
5. **Privacidad**: una línea que diga que al pulsarlo se abre WhatsApp y que la conversación se rige por sus condiciones.

---

## 3 · "Sobre mí" en la web, enlazado al portafolio

1. **Datos** en `src/data/site.ts`:
   ```ts
   founder: {
     name: 'Javier Sánchez',
     role: 'Full Stack Developer',
     portfolioUrl: 'https://javiercillo11.github.io/portafolio/',
   },
   social: [
     { label: 'GitHub', href: 'https://github.com/Javiercillo11' },
     { label: 'LinkedIn', href: 'https://www.linkedin.com/in/francisco-javier-sanchez-vargas-12507a22b' },
   ],
   ```
   El footer ya pinta la lista `social`, así que GitHub y LinkedIn aparecen solos.
2. **Bloque "Quién hay detrás"** en `src/components/About.astro`, debajo de la cita "Build beyond the visible.":
   - nombre, rol y una línea de presentación,
   - botón **"Ver portafolio"** (se abre en otra pestaña),
   - mismo estilo de tarjeta neón que el resto de la sección.
3. **Footer**: enlace "Portafolio".
4. **Tono**: la web habla en plural ("Somos un estudio…"), así que el bloque presenta al fundador en tercera persona ("Detrás de cLoak Studios está Javier…"). Si se prefiere primera persona, se cambia.

---

## 4 · Parte legal (obligatoria, antes de guardar datos en Supabase)

### Situación actual

- No hay **aviso legal** (`site.legalNoticeHref: null`). La LSSI lo exige en una web comercial en España.
- La **política de privacidad** (`src/pages/privacidad.astro`) es un borrador con `noindex` y está excluida del sitemap.
- El **email público** (`site.email`) está vacío, así que no se muestra en ningún sitio.

### Cambios (cLoakStudiosWeb)

1. **Página `/aviso-legal`** (`src/pages/aviso-legal.astro`), con:
   - titular (nombre o razón social), NIF/CIF, domicilio, email y teléfono de contacto,
   - objeto de la web, condiciones de uso, propiedad intelectual, responsabilidad y legislación aplicable.

   Después se enlaza desde el footer rellenando `site.legalNoticeHref`.
2. **Completar la política de privacidad**:
   - responsable del tratamiento (los mismos datos del aviso legal),
   - finalidades: atender solicitudes de contacto, gestionar la relación comercial y recoger testimonios,
   - base legal: consentimiento (casilla del formulario) y medidas precontractuales,
   - encargados del tratamiento: **Supabase** (base de datos), **Web3Forms** (email) y **GitHub Pages** (alojamiento); WhatsApp (Meta) solo si el usuario pulsa el botón,
   - conservación: solicitudes descartadas o sin respuesta durante X meses (por ejemplo 12) y después se borran; clientes, mientras dure la relación y los plazos legales,
   - derechos (acceso, rectificación, supresión, oposición, limitación y portabilidad), cómo ejercerlos y posibilidad de reclamar ante la AEPD,
   - cookies: la web no usa cookies; solo `localStorage` técnico para el límite de envíos, que está exento.
3. Quitar `noindex` de `/privacidad` y el filtro del sitemap en `astro.config.mjs`.
4. Rellenar `site.email` con el email público. Aparece solo en contacto y footer.
5. **Borrado automático** en la app (migración): un trabajo `pg_cron` mensual que elimina las solicitudes `descartado` con más de 12 meses. Así se cumple lo que dice la política.

### Datos que necesito

- Titular: nombre completo o razón social, y si eres autónomo o sociedad
- NIF/CIF
- Domicilio a efectos legales
- Email público de contacto
- Plazo de conservación de las solicitudes (propuesta: 12 meses)

> Recomendación: que un asesor revise el texto final. El plan cubre la estructura y el contenido habitual, no sustituye una revisión legal.

---

## 5 · Trabajos realizados en la web, alimentados desde la app

**Objetivo:** marcar un proyecto en la app como "Publicar en la web" y que aparezca solo en una sección "Trabajos" de la web, sin tocar el código de la web.

### 5.A · Base de datos (cLoakStudiosApp → `007_portfolio.sql`)

1. Columnas nuevas en `projects`:
   - `published boolean not null default false`
   - `public_title text`, `public_summary text` (máximo unos 200 caracteres), `public_url text`
   - `cover_path text` (imagen de portada)
   - `public_order int` (orden en la web) y `published_at timestamptz`
   - Restricción: solo se puede publicar si `status = 'desplegado'` y si título, resumen y portada están rellenos.
2. **Bucket público `portfolio`** en Storage: lectura pública y escritura solo tuya. Va separado del bucket privado `attachments`, que no se toca.
3. **Función `get_public_projects()`** (`security definer`, ejecutable por `anon`): devuelve **solo** los campos públicos (título, resumen, URL, URL de la portada y orden) de los proyectos publicados. Nunca devuelve el cliente, el precio, el teléfono ni los pagos.

### 5.B · App

1. En el detalle del proyecto, una sección **"Publicar en la web"**, visible solo si el proyecto está `desplegado`:
   - interruptor para publicar,
   - campos de título, resumen y URL,
   - subida de la portada (validación de tipo y tamaño, reutilizando la lógica de `attachments.ts`),
   - vista previa de cómo quedará la tarjeta en la web.
2. En la lista de proyectos, un indicador de "Publicado en la web".
3. Botón **"Actualizar web ahora"**, por si hace falta forzar un redeploy a mano.

### 5.C · Web

1. Al compilar, `index.astro` llama a `rpc/get_public_projects` con la anon key.
   - Las portadas se optimizan en el build con `astro:assets` (añadiendo el dominio de Supabase en `image.remotePatterns`).
   - Si la llamada falla, **el build no se rompe**: la sección se oculta y queda un aviso en el log.
2. Componente **`Work.astro`** (sección "Trabajos", entre Servicios y Proceso):
   - tarjetas neón con portada, título, resumen y enlace "Ver proyecto",
   - la sección y su entrada en el menú solo aparecen si hay al menos un proyecto publicado.
3. Tests de la transformación de datos y del caso vacío o con error.

### 5.D · Redeploy automático

1. `deploy.yml` de la web acepta también el disparador `repository_dispatch` (tipo `content-updated`), con `concurrency` y `cancel-in-progress` para que varios cambios seguidos solo provoquen un despliegue.
2. **Edge Function `trigger-web-deploy`**: llama a la API de GitHub (`POST /repos/Javiercillo11/cLoakStudiosWeb/dispatches`) con un token de GitHub de permisos mínimos, guardado como secreto de Supabase.
3. **Database Webhook** de Supabase en `projects` (update) que llama a esa función. La función filtra y solo dispara si cambian campos públicos. También la usa el botón "Actualizar web ahora" de la app.

### Lo que te tocará hacer a ti

- Crear el token de GitHub (fine-grained, solo el repo de la web, permiso *Contents: read & write*) y guardarlo en Supabase → Edge Functions → Secrets.
- Ejecutar la migración `007_portfolio.sql`.

---

## 6 · Testimonios de clientes con aprobación

**Objetivo:** al terminar un proyecto, el cliente deja su opinión desde un enlace único. Tú la apruebas en la app y aparece en la web.

### 6.A · Base de datos (cLoakStudiosApp → `008_testimonials.sql`)

1. **Tabla `testimonials`**:
   - `id`, `user_id`, `project_id`
   - `token_hash` (solo se guarda el hash del enlace, nunca el token en claro), `expires_at` (por ejemplo, 30 días)
   - `status`: `pendiente` / `recibido` / `aprobado` / `rechazado`
   - `author_name`, `author_business`, `rating` (1–5), `text`
   - `consent_publish boolean` (consentimiento explícito para publicar su nombre y opinión)
   - `submitted_at`, `approved_at`
   - RLS `owner_all`.
2. Funciones:
   - `create_testimonial_invite(project_id)`: solo para ti; genera un token aleatorio, guarda su hash y devuelve el enlace.
   - `get_testimonial_invite(token)` (`anon`): devuelve solo el nombre del negocio, y solo si el enlace está pendiente y no ha caducado.
   - `submit_testimonial(token, ...)` (`anon`): valida, guarda y deja el enlace como ya usado. **Solo se puede usar una vez.**
   - `get_public_testimonials()` (`anon`): solo los `aprobado` con consentimiento, y solo los campos públicos.

### 6.B · App

1. En el proyecto `desplegado`, botón **"Pedir opinión"**: genera el enlace (`https://cloakstudios.app/opinion/?t=…`) y ofrece copiarlo o enviarlo por WhatsApp o email al cliente.
2. **Pantalla "Opiniones"**: lista por estado con botones de aprobar o rechazar. El texto del cliente no se edita, solo se aprueba o se rechaza.
3. Al aprobar, se lanza el redeploy de la web (la misma Edge Function del punto 5.D).

### 6.C · Web

1. **Página `/opinion`** (con `noindex`, fuera del sitemap y del menú):
   - lee el token, comprueba que es válido y muestra "Tu opinión sobre el trabajo para *Negocio*",
   - formulario con nombre, negocio, valoración de 1 a 5 estrellas, opinión y casilla de consentimiento para publicar,
   - estados claros: enlace caducado, enlace ya usado y "gracias".
2. **Sección "Lo que dicen nuestros clientes"** en la portada, alimentada en el build desde `get_public_testimonials()`. Solo aparece si hay opiniones aprobadas.
3. Política de privacidad: añadir la finalidad "testimonios" y que se basan en el consentimiento.
4. Tests del formulario y de la transformación de datos.

---

## 7 · Aviso instantáneo (push) de solicitudes nuevas

**Objetivo:** que te llegue una notificación al móvil en cuanto alguien envía el formulario, sin depender del email.

### 7.A · Base de datos (cLoakStudiosApp → incluido en `006_leads.sql` o en una `009_push.sql` aparte)

1. **Tabla `push_subscriptions`**: `id`, `user_id`, `endpoint` (único), `p256dh`, `auth`, `device_label`, `created_at`, `last_used_at`. RLS `owner_all`.

### 7.B · App

1. Claves VAPID: la pública en `VITE_VAPID_PUBLIC_KEY` (va en el JavaScript); la privada solo como secreto de Supabase.
2. Botón **"Activar avisos en este dispositivo"** (en Solicitudes o en un pequeño apartado de ajustes): pide permiso, suscribe el dispositivo con `pushManager.subscribe` y guarda la suscripción. También permite desactivarlos.
3. `public/sw.js`: manejadores `push` (muestra la notificación con el icono de la app) y `notificationclick` (abre la app en la solicitud correspondiente, `/#/solicitudes/<id>`).

### 7.C · Envío

1. **Edge Function `notify-new-lead`**, llamada por un **Database Webhook** en `leads` (insert):
   - lee tus suscripciones,
   - envía la notificación con la librería `web-push` usando la clave VAPID privada. Ejemplo: **"Nueva solicitud · QR para reseñas"** / "Ana García — Bar La Plaza",
   - borra las suscripciones caducadas (respuestas 404/410).
2. Los envíos que el honeypot descarta no llegan a insertarse, así que no generan notificación.

### A tener en cuenta

- **iPhone**: solo funciona si la app está **instalada en la pantalla de inicio** (iOS 16.4 o superior). En Android y en el ordenador funciona desde el navegador.
- El email de Web3Forms se mantiene como respaldo.

---

## Orden de ejecución

| Fase | Paso | Qué | Quién |
|---|---|---|---|
| 0 | 0 | Commitear los cambios pendientes de cLoakStudiosWeb (Cosmos/Nebula y componentes) | Javier / Claude |
| 1 · Web base | 1 | Pasarme los datos legales (titular, NIF, domicilio, email) | **Javier** |
| | 2 | Aviso legal + privacidad completa + email + WhatsApp + "Sobre mí" → desplegar | Claude |
| 2 · Solicitudes | 3 | Ejecutar `006_leads.sql` (incluye el borrado automático) | **Javier** |
| | 4 | Pantalla "Solicitudes" en la app → desplegar | Claude |
| | 5 | Añadir `PUBLIC_SUPABASE_URL` y `PUBLIC_SUPABASE_ANON_KEY` en el repo de la web | **Javier** |
| | 6 | Envío a Supabase en la web → desplegar | Claude |
| | 7 | Prueba: formulario → aparece en la app + llega el email; honeypot; WhatsApp en el móvil | **Javier** |
| 3 · Push | 8 | Generar claves VAPID; guardar la privada en Supabase y la pública en el repo de la app | Claude / **Javier** |
| | 9 | Tabla de suscripciones + botón de avisos + `sw.js` + Edge Function `notify-new-lead` + webhook | Claude / **Javier** (webhook) |
| | 10 | Prueba: instalar la PWA, activar avisos, enviar el formulario y comprobar que llega la notificación | **Javier** |
| 4 · Trabajos | 11 | Ejecutar `007_portfolio.sql`; crear el token de GitHub y guardarlo en Supabase | **Javier** |
| | 12 | Sección "Publicar en la web" en la app + `Work.astro` en la web + Edge Function `trigger-web-deploy` + webhook | Claude / **Javier** (webhook) |
| | 13 | Prueba: publicar un proyecto y comprobar que la web se redespliega y lo muestra | **Javier** |
| 5 · Testimonios | 14 | Ejecutar `008_testimonials.sql` | **Javier** |
| | 15 | "Pedir opinión" + pantalla "Opiniones" en la app; página `/opinion` + sección de testimonios en la web | Claude |
| | 16 | Prueba: generar un enlace, dejar una opinión, aprobarla y comprobar que aparece en la web | **Javier** |

## Datos pendientes

- Datos legales: titular, NIF/CIF, domicilio y email público
- Plazo de conservación de las solicitudes (propuesta: 12 meses)
- Más adelante: token de GitHub (fase 4) y confirmar la caducidad de los enlaces de opinión (propuesta: 30 días)
