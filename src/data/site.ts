// Datos globales del sitio. Solo información real: lo que falta queda en null
// y la interfaz lo oculta automáticamente hasta que se rellene.

export const site = {
  name: 'Cloak Studio',
  url: 'https://cloakstudio.app',
  locale: 'es_ES',
  title: 'Cloak Studio | Páginas web, aplicaciones y soluciones digitales',
  description:
    'Creamos páginas web para negocios, aplicaciones de gestión y soluciones QR para reseñas. Cuéntanos qué necesita tu negocio.',
  tagline: 'Digital solutions for ambitious businesses.',

  /** PENDIENTE: email de contacto público real. Si es null, no se muestra. */
  email: null as string | null,

  /** PENDIENTE: perfiles sociales reales, p. ej. { label: 'LinkedIn', href: 'https://…' }. */
  social: [] as { label: string; href: string }[],

  /** Aviso legal: se enlaza cuando exista la página. */
  legalNoticeHref: null as string | null,
};

export const nav = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Servicios', href: '#servicios' },
  { label: 'Sobre nosotros', href: '#estudio' },
  { label: 'Contacto', href: '#contacto' },
];
