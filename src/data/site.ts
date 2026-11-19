// Datos globales del sitio. Solo información real: lo que falta queda en null
// y la interfaz lo oculta (o lo marca como pendiente en las páginas legales).

export const site = {
  name: 'cLoak Studios',
  locale: 'es_ES',
  title: 'cLoak Studios',
  description:
    'Creamos páginas web para negocios, aplicaciones de gestión y soluciones QR para reseñas. Cuéntanos qué necesita tu negocio.',
  tagline: 'Digital solutions for ambitious businesses.',

  /** PENDIENTE: email de contacto público real. Si es null, no se muestra. */
  email: null as string | null,

  /** WhatsApp. Si `phone` es null, el botón y los enlaces no se muestran. */
  whatsapp: {
    phone: '34678494955' as string | null,
    message: 'Hola, quería pedir información',
  },

  /** Quién hay detrás del estudio (bloque «Sobre mí» y enlace del footer). */
  founder: {
    name: 'Javier Sánchez',
    role: 'Full Stack Developer',
    portfolioUrl: 'https://javiercillo11.github.io/portafolio/',
  },

  social: [
    { label: 'GitHub', href: 'https://github.com/Javiercillo11' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/francisco-javier-sanchez-vargas-12507a22b' },
  ] as { label: string; href: string }[],

  /** Aviso legal: se enlaza desde el footer. */
  legalNoticeHref: '/aviso-legal' as string | null,
};

/**
 * Datos del titular para el aviso legal y la política de privacidad (LSSI y RGPD).
 * PENDIENTE: mientras falte alguno, las páginas legales lo marcan como pendiente,
 * se publican con noindex y quedan fuera del sitemap.
 */
export const legal = {
  /** Nombre completo (autónomo) o razón social (sociedad). */
  holder: null as string | null,
  holderType: null as 'autonomo' | 'sociedad' | null,
  taxId: null as string | null,
  address: null as string | null,
  /** Solo sociedades: datos de inscripción en el Registro Mercantil. */
  registry: null as string | null,
  /** Teléfono de contacto del aviso legal. */
  phone: '+34 678 494 955' as string | null,
  /** Región del proyecto de Supabase, p. ej. «Unión Europea (Fráncfort)». */
  supabaseRegion: null as string | null,
  /** Meses que se conservan las solicitudes que no acaban en proyecto. */
  leadRetentionMonths: 12,
  /** Fecha de la última revisión de los textos legales, p. ej. «19 de noviembre de 2026». */
  updatedAt: null as string | null,
};

/** ¿Están todos los datos legales? Hasta entonces, las páginas legales son un borrador. */
export const legalComplete = Boolean(
  legal.holder &&
    legal.holderType &&
    legal.taxId &&
    legal.address &&
    (legal.holderType !== 'sociedad' || legal.registry) &&
    legal.supabaseRegion &&
    legal.updatedAt &&
    site.email,
);

export const nav = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Sobre nosotros', href: '#estudio' },
  { label: 'Contacto', href: '#contacto' },
];
