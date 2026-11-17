import type { ServiceId } from '../lib/contact/schema';

export type IconName = 'monitor' | 'dashboard' | 'qr';

export interface Service {
  id: Exclude<ServiceId, 'otro'>;
  slug: string;
  number: string;
  icon: IconName;
  title: string;
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
    icon: 'monitor',
    title: 'Páginas web para negocios',
    description:
      'Una web profesional que transmite confianza, presenta tus servicios y ayuda a convertir visitas en nuevos clientes.',
    listTitle: 'Qué incluye',
    items: [
      'Diseño adaptado a la identidad del negocio.',
      'Experiencia responsive para móvil, tablet y escritorio.',
      'Estructura preparada para SEO.',
      'Formularios y llamadas a la acción.',
      'Rendimiento y accesibilidad cuidados.',
    ],
    cta: 'Quiero una página web',
  },
  {
    id: 'app',
    slug: 'aplicaciones-de-gestion',
    number: '02',
    icon: 'dashboard',
    title: 'Aplicaciones para gestionar tu negocio',
    description:
      'Aplicaciones a medida para organizar el día a día de tu negocio, centralizar información y automatizar tareas.',
    listTitle: 'Posibles funcionalidades',
    items: [
      'Gestión de clientes.',
      'Citas y reservas.',
      'Empleados y roles.',
      'Inventario y productos.',
      'Pedidos y tareas.',
      'Informes y paneles de control.',
      'Automatización de procesos.',
    ],
    note: 'Las funcionalidades se definen tras analizar cada negocio.',
    cta: 'Quiero una aplicación',
  },
  {
    id: 'qr',
    slug: 'qr-para-resenas',
    number: '03',
    icon: 'qr',
    title: 'QR para conseguir reseñas',
    description:
      'Facilita que tus clientes lleguen a tu página de reseñas con un código QR personalizado para tu negocio.',
    listTitle: 'Qué incluye',
    items: [
      'QR personalizado con la identidad visual del negocio.',
      'Acceso directo al enlace de reseñas que nos facilites.',
      'Material preparado para imprimir o mostrar en el establecimiento.',
      'Instrucciones sencillas para colocarlo y utilizarlo.',
    ],
    note: 'El QR lleva directamente a tu página de reseñas: cada cliente opina libremente.',
    cta: 'Quiero mi QR de reseñas',
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
