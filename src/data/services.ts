import type { ServiceId } from '../lib/contact/schema';

export type IconName = 'monitor' | 'dashboard' | 'qr' | 'code' | 'gear' | 'scan' | 'window';

export interface Service {
  id: Exclude<ServiceId, 'otro'>;
  slug: string;
  number: string;
  icon: IconName;
  title: string;
  /** Título partido en dos líneas para la tarjeta. */
  titleLines: [string, string];
  description: string;
  listTitle: string;
  items: string[];
  cta: string;
  note?: string;
}

export const services: Service[] = [
  {
    id: 'web',
    slug: 'web-para-negocios',
    number: '01',
    icon: 'code',
    title: 'Páginas web para negocios',
    titleLines: ['Páginas web', 'para negocios'],
    description:
      'Un sitio web profesional que transmita confianza, proyecte tu marca y ayude a convertir visitas en nuevos clientes.',
    listTitle: 'Qué incluye:',
    items: [
      'Diseño adaptado a tu identidad del negocio',
      'Desarrollo responsive (móvil, tablet, PC)',
      'Optimización para buscadores (SEO)',
      'Integración con redes y formularios',
      'Soporte y actualizaciones',
    ],
    cta: 'Quiero una página web',
  },
  {
    id: 'app',
    slug: 'aplicaciones-de-gestion',
    number: '02',
    icon: 'gear',
    title: 'Aplicaciones para gestionar tu negocio',
    titleLines: ['Aplicaciones para', 'gestionar tu negocio'],
    description:
      'Aplicaciones web a medida para organizar y dar seguimiento a tu negocio, con la información y automatización que necesitas.',
    listTitle: 'Qué incluye:',
    items: [
      'Gestión de clientes',
      'Control de inventario',
      'Reportes y análisis',
      'Módulos personalizados',
      'Acceso seguro y escalable',
    ],
    cta: 'Quiero una aplicación',
  },
  {
    id: 'qr',
    slug: 'qr-para-resenas',
    number: '03',
    icon: 'scan',
    title: 'QR para conseguir reseñas',
    titleLines: ['QR para', 'conseguir reseñas'],
    description:
      'Facilita que tus clientes dejen una opinión en minutos con un código QR personalizado para tu negocio.',
    listTitle: 'Qué incluye:',
    items: [
      'QR personalizado con tu identidad visual del negocio',
      'Acceso directo a reseñas en Google Maps',
      'Fácil de compartir',
      'Estadísticas de escaneo',
      'Soporte y configuración',
    ],
    cta: 'Quiero un QR de reseñas',
  },
];

export const process = [
  { title: 'Nos cuentas tu idea', text: 'Entendemos el negocio, los objetivos y el problema.' },
  { title: 'Definimos la solución', text: 'Concretamos alcance, funcionalidades y propuesta.' },
  { title: 'Diseñamos y desarrollamos', text: 'Construimos y revisamos la solución.' },
  { title: 'Lanzamos y mejoramos', text: 'Publicamos, entregamos y acordamos el soporte necesario.' },
];

export const pillars = [
  { title: 'Soluciones adaptadas a cada negocio', text: 'Partimos de cómo trabajas, no de una plantilla.' },
  { title: 'Diseño claro y fácil de utilizar', text: 'Interfaces que se entienden a la primera.' },
  { title: 'Desarrollo cuidado y escalable', text: 'Código mantenible, preparado para crecer contigo.' },
  { title: 'Comunicación directa', text: 'Hablas con quien diseña y construye tu proyecto.' },
];
