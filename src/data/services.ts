import type { ServiceId } from '../lib/contact/schema';
import type { Lang } from '../i18n/ui';

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

const servicesEs: Service[] = [
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

const processEs = [
  { title: 'Nos cuentas tu idea', text: 'Entendemos el negocio, los objetivos y el problema.' },
  { title: 'Definimos la solución', text: 'Concretamos alcance, funcionalidades y propuesta.' },
  { title: 'Diseñamos y desarrollamos', text: 'Construimos y revisamos la solución.' },
  { title: 'Lanzamos y mejoramos', text: 'Publicamos, entregamos y acordamos el soporte necesario.' },
];

const pillarsEs = [
  { title: 'Soluciones adaptadas a cada negocio', text: 'Partimos de cómo trabajas, no de una plantilla.' },
  { title: 'Diseño claro y fácil de utilizar', text: 'Interfaces que se entienden a la primera.' },
  { title: 'Desarrollo cuidado y escalable', text: 'Código mantenible, preparado para crecer contigo.' },
  { title: 'Comunicación directa', text: 'Hablas con quien diseña y construye tu proyecto.' },
];

const servicesEn: Service[] = [
  {
    id: 'web',
    slug: 'web-para-negocios',
    number: '01',
    icon: 'code',
    title: 'Websites for businesses',
    titleLines: ['Websites', 'for businesses'],
    description:
      'A professional website that builds trust, showcases your brand and helps turn visitors into new customers.',
    listTitle: "What's included:",
    items: [
      'Design tailored to your business identity',
      'Responsive build (mobile, tablet, desktop)',
      'Search engine optimisation (SEO)',
      'Social media and form integration',
      'Support and updates',
    ],
    cta: 'I want a website',
  },
  {
    id: 'app',
    slug: 'aplicaciones-de-gestion',
    number: '02',
    icon: 'gear',
    title: 'Apps to manage your business',
    titleLines: ['Apps to manage', 'your business'],
    description:
      'Custom web apps to organise and keep track of your business, with the information and automation you need.',
    listTitle: "What's included:",
    items: ['Customer management', 'Inventory control', 'Reports and analytics', 'Custom modules', 'Secure and scalable access'],
    cta: 'I want an app',
  },
  {
    id: 'qr',
    slug: 'qr-para-resenas',
    number: '03',
    icon: 'scan',
    title: 'QR codes to get reviews',
    titleLines: ['QR codes', 'to get reviews'],
    description: 'Make it easy for your customers to leave a review in minutes with a QR code customised for your business.',
    listTitle: "What's included:",
    items: [
      'QR customised with your visual identity',
      'Direct access to Google Maps reviews',
      'Easy to share',
      'Scan statistics',
      'Support and setup',
    ],
    cta: 'I want a review QR',
  },
];

const processEn = [
  { title: 'You tell us your idea', text: 'We understand the business, the goals and the problem.' },
  { title: 'We define the solution', text: 'We agree on scope, features and proposal.' },
  { title: 'We design and build', text: 'We build and review the solution.' },
  { title: 'We launch and improve', text: 'We publish, hand over and agree on the support needed.' },
];

const pillarsEn = [
  { title: 'Solutions tailored to each business', text: 'We start from how you work, not from a template.' },
  { title: 'Clear, easy-to-use design', text: 'Interfaces that make sense at first glance.' },
  { title: 'Careful, scalable development', text: 'Maintainable code, ready to grow with you.' },
  { title: 'Direct communication', text: 'You talk to the person who designs and builds your project.' },
];

export const getServices = (lang: Lang): Service[] => (lang === 'en' ? servicesEn : servicesEs);
export const getProcess = (lang: Lang) => (lang === 'en' ? processEn : processEs);
export const getPillars = (lang: Lang) => (lang === 'en' ? pillarsEn : pillarsEs);
