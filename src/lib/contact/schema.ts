// Modelo, saneado y validación del formulario de contacto.
// Código puro (sin DOM): lo usa el script del navegador y los tests.

export const SERVICE_IDS = ['web', 'app', 'qr', 'otro'] as const;
export type ServiceId = (typeof SERVICE_IDS)[number];

export const SERVICE_LABELS: Record<ServiceId, string> = {
  web: 'Página web para negocio',
  app: 'Aplicación de gestión',
  qr: 'QR para reseñas',
  otro: 'Otro / No estoy seguro',
};

/** Opciones de los campos cerrados. La clave es el valor enviado; el texto, la etiqueta. */
export const OPTIONS = {
  webHasSite: { si: 'Sí', no: 'No', renovar: 'Necesita renovación' },
  webNeeds: {
    informativa: 'Web informativa',
    reservas: 'Web con reservas',
    catalogo: 'Catálogo',
    tienda: 'Tienda online',
    otro: 'Otro',
  },
  appManage: {
    clientes: 'Clientes',
    citas: 'Citas y reservas',
    empleados: 'Empleados',
    inventario: 'Inventario',
    pedidos: 'Pedidos',
    otro: 'Otro',
  },
  appUsers: { solo: 'Solo yo', '2-5': '2–5', '6-20': '6–20', '20+': 'Más de 20', nose: 'No lo sé' },
  qrPlatform: { google: 'Google', tripadvisor: 'Tripadvisor', facebook: 'Facebook', otra: 'Otra', nose: 'No lo sé' },
  qrPlacement: { mesa: 'Mesa', mostrador: 'Mostrador', cartel: 'Cartel', tarjeta: 'Tarjeta', otro: 'Otro' },
} as const;

type Opt<K extends keyof typeof OPTIONS> = keyof (typeof OPTIONS)[K];

/** Longitudes máximas (también se aplican como maxlength en el HTML). */
export const LIMITS = {
  name: 100,
  business: 120,
  email: 254,
  phone: 25,
  message: 3000,
  webBusinessType: 120,
  url: 500,
  appCurrentTool: 200,
  appSimplify: 1500,
} as const;

export const MESSAGE_MIN = 10;

export interface ContactValues {
  service: ServiceId | '';
  name: string;
  business: string;
  email: string;
  phone: string;
  message: string;
  privacy: boolean;
  /** Honeypot: los humanos no lo ven ni lo rellenan. */
  botcheck: string;
  web: { hasSite: Opt<'webHasSite'> | ''; businessType: string; needs: Opt<'webNeeds'>[]; currentUrl: string };
  app: { manage: Opt<'appManage'>[]; users: Opt<'appUsers'> | ''; currentTool: string; simplify: string };
  qr: { reviewUrl: string; platform: Opt<'qrPlatform'> | ''; placement: Opt<'qrPlacement'>[] };
}

export type FieldName =
  | 'service'
  | 'name'
  | 'business'
  | 'email'
  | 'phone'
  | 'message'
  | 'privacy'
  | 'web.currentUrl'
  | 'qr.reviewUrl';

export type ContactErrors = Partial<Record<FieldName, string>>;

/** Lectura mínima común a FormData y a objetos de test. */
export interface FieldSource {
  get(name: string): unknown;
  getAll(name: string): unknown[];
}

// ── Saneado ────────────────────────────────────────────────────────────────

// Caracteres de control salvo salto de línea y tabulador.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Recorta, elimina caracteres de control y limita la longitud. */
export function clean(value: unknown, max: number, multiline = false): string {
  if (typeof value !== 'string') return '';
  let v = value.replace(CONTROL_CHARS, '').replace(/\r\n?/g, '\n');
  if (!multiline) v = v.replace(/\s+/g, ' ');
  else v = v.replace(/\n{3,}/g, '\n\n');
  return v.trim().slice(0, max);
}

function pick<K extends keyof typeof OPTIONS>(key: K, value: unknown): Opt<K> | '' {
  return typeof value === 'string' && Object.hasOwn(OPTIONS[key], value) ? (value as Opt<K>) : '';
}

function pickMany<K extends keyof typeof OPTIONS>(key: K, values: unknown[]): Opt<K>[] {
  const out = new Set<Opt<K>>();
  for (const v of values) {
    const p = pick(key, v);
    if (p) out.add(p);
  }
  return [...out];
}

/** Convierte los campos crudos del formulario en valores saneados y tipados. */
export function readValues(src: FieldSource): ContactValues {
  const service = src.get('service');
  return {
    service: typeof service === 'string' && (SERVICE_IDS as readonly string[]).includes(service) ? (service as ServiceId) : '',
    name: clean(src.get('name'), LIMITS.name),
    business: clean(src.get('business'), LIMITS.business),
    email: clean(src.get('email'), LIMITS.email).toLowerCase(),
    phone: clean(src.get('phone'), LIMITS.phone),
    message: clean(src.get('message'), LIMITS.message, true),
    privacy: src.get('privacy') === 'on' || src.get('privacy') === 'true',
    botcheck: typeof src.get('botcheck') === 'string' ? String(src.get('botcheck')) : '',
    web: {
      hasSite: pick('webHasSite', src.get('web_has_site')),
      businessType: clean(src.get('web_business_type'), LIMITS.webBusinessType),
      needs: pickMany('webNeeds', src.getAll('web_needs')),
      currentUrl: clean(src.get('web_current_url'), LIMITS.url),
    },
    app: {
      manage: pickMany('appManage', src.getAll('app_manage')),
      users: pick('appUsers', src.get('app_users')),
      currentTool: clean(src.get('app_current_tool'), LIMITS.appCurrentTool),
      simplify: clean(src.get('app_simplify'), LIMITS.appSimplify, true),
    },
    qr: {
      reviewUrl: clean(src.get('qr_review_url'), LIMITS.url),
      platform: pick('qrPlatform', src.get('qr_platform')),
      placement: pickMany('qrPlacement', src.getAll('qr_placement')),
    },
  };
}

// ── Validación ─────────────────────────────────────────────────────────────

// Suficiente para detectar errores de escritura; la verificación real es la respuesta.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE_RE = /^\+?[\d\s().-]{6,25}$/;

/** Acepta URLs con o sin protocolo («minegocio.es»). Devuelve la URL normalizada o null. */
export function normalizeUrl(value: string): string | null {
  if (!value) return null;
  const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProto);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** ¿El nombre del negocio es obligatorio para este servicio? */
export const businessRequired = (service: ContactValues['service']) => service === 'qr';

export function validate(v: ContactValues): ContactErrors {
  const e: ContactErrors = {};

  if (!v.service) e.service = 'Elige el servicio que te interesa.';

  if (!v.name) e.name = 'Escribe tu nombre.';
  else if (v.name.length < 2) e.name = 'El nombre es demasiado corto.';

  if (businessRequired(v.service) && !v.business) {
    e.business = 'Para preparar el QR necesitamos el nombre del negocio.';
  }

  if (!v.email) e.email = 'Escribe tu email para poder responderte.';
  else if (!EMAIL_RE.test(v.email)) e.email = 'Revisa el email: debe tener el formato nombre@dominio.com.';

  if (v.phone && !PHONE_RE.test(v.phone)) e.phone = 'Revisa el teléfono: usa solo números, espacios y el prefijo +.';

  if (!v.message) e.message = 'Cuéntanos brevemente qué necesitas.';
  else if (v.message.length < MESSAGE_MIN) e.message = `Añade un poco más de detalle (mínimo ${MESSAGE_MIN} caracteres).`;

  if (!v.privacy) e.privacy = 'Debes aceptar la política de privacidad para enviar la solicitud.';

  if (v.service === 'web' && v.web.currentUrl && !normalizeUrl(v.web.currentUrl)) {
    e['web.currentUrl'] = 'Revisa la dirección de la web (por ejemplo, minegocio.es).';
  }
  if (v.service === 'qr' && v.qr.reviewUrl && !normalizeUrl(v.qr.reviewUrl)) {
    e['qr.reviewUrl'] = 'Revisa el enlace de reseñas: debe ser una dirección web válida.';
  }

  return e;
}

// ── Payload de envío ───────────────────────────────────────────────────────

const label = <K extends keyof typeof OPTIONS>(key: K, v: Opt<K> | '') =>
  v ? (OPTIONS[key] as Record<string, string>)[v as string] : '';
const labels = <K extends keyof typeof OPTIONS>(key: K, vs: Opt<K>[]) => vs.map((v) => label(key, v)).join(', ');

/**
 * Pares «etiqueta → valor» con las respuestas del servicio elegido.
 * Solo se incluyen los campos del servicio seleccionado y los que tienen valor.
 */
export function serviceDetails(v: ContactValues): [string, string][] {
  const rows: [string, string][] = [];
  if (v.service === 'web') {
    rows.push(
      ['¿Tiene web actualmente?', label('webHasSite', v.web.hasSite)],
      ['Tipo de negocio', v.web.businessType],
      ['¿Qué necesita?', labels('webNeeds', v.web.needs)],
      ['URL actual', v.web.currentUrl ? (normalizeUrl(v.web.currentUrl) ?? '') : ''],
    );
  } else if (v.service === 'app') {
    rows.push(
      ['¿Qué necesita gestionar?', labels('appManage', v.app.manage)],
      ['Personas que la usarían', label('appUsers', v.app.users)],
      ['Herramienta actual', v.app.currentTool],
      ['Tarea a simplificar', v.app.simplify],
    );
  } else if (v.service === 'qr') {
    rows.push(
      ['Enlace a la página de reseñas', v.qr.reviewUrl ? (normalizeUrl(v.qr.reviewUrl) ?? '') : 'Aún no lo tiene'],
      ['Plataforma', label('qrPlatform', v.qr.platform)],
      ['¿Dónde usará el QR?', labels('qrPlacement', v.qr.placement)],
    );
  }
  return rows.filter(([, value]) => value !== '');
}

/**
 * Cuerpo JSON para la API de Web3Forms. Las claves con texto legible se muestran
 * tal cual en el email de notificación. `email` y `name` los usa Web3Forms como reply-to.
 */
export function buildPayload(v: ContactValues, accessKey: string, receivedAt: Date = new Date()) {
  const service = v.service ? SERVICE_LABELS[v.service] : '';
  const payload: Record<string, string | boolean> = {
    access_key: accessKey,
    subject: `Nueva solicitud desde Cloak Studio — ${service}`,
    from_name: 'Web Cloak Studio',
    botcheck: v.botcheck,
    Servicio: service,
    name: v.name,
    email: v.email,
  };
  if (v.business) payload['Negocio'] = v.business;
  if (v.phone) payload['Teléfono'] = v.phone;
  payload['Descripción del proyecto'] = v.message;
  for (const [k, value] of serviceDetails(v)) payload[k] = value;
  payload['Privacidad aceptada'] = 'Sí';
  payload['Fecha de recepción'] = receivedAt.toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    dateStyle: 'long',
    timeStyle: 'short',
  });
  return payload;
}
