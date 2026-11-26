// Textos de la interfaz en español (raíz) e inglés (/en/).
// Cada componente toma el idioma de la página con getLang(Astro) y lee de aquí.
import { withBase } from '../lib/paths';

export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];

/** Idioma de la página actual (Astro.currentLocale lo fija la ruta: /en/ → inglés). */
export const getLang = (astro: { currentLocale?: string | undefined }): Lang =>
  astro.currentLocale === 'en' ? 'en' : 'es';

/** Portada de cada idioma, con el prefijo de despliegue. */
export const homePath = (lang: Lang) => withBase(lang === 'en' ? '/en/' : '/');

const es = {
  htmlLang: 'es',
  ogLocale: 'es_ES',
  title: 'cLoak Studios',
  description:
    'Creamos páginas web para negocios, aplicaciones de gestión y soluciones QR para reseñas. Cuéntanos qué necesita tu negocio.',
  ogImageAlt: 'cLoak Studios — Páginas web, aplicaciones y soluciones digitales',
  tagline: 'Soluciones digitales para negocios que quieren crecer.',
  skipLink: 'Saltar al contenido',
  logoLabel: 'cLoak Studios — inicio',

  nav: [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Sobre nosotros', href: '#estudio' },
    { label: 'Contacto', href: '#contacto' },
  ],
  navLabel: 'Principal',
  mobileNavLabel: 'Menú móvil',
  headerCta: 'Hablemos',
  menuOpen: 'Abrir menú',
  menuClose: 'Cerrar menú',
  langSwitchLabel: 'Idioma',
  langSwitchTo: 'Ver la web en inglés',

  hero: {
    eyebrow: 'Estudio independiente de desarrollo digital',
    line1: 'Digitalizamos',
    line2: 'tu negocio',
    accent1: 'Construimos',
    accent2: 'lo que viene',
    lead: 'Creamos páginas web, aplicaciones de gestión y soluciones digitales para ayudar a los negocios a trabajar mejor y crecer.',
    explore: 'Explorar servicios',
    tellUs: 'Cuéntanos tu proyecto',
    laptop: ['Ideas que', 'conec', 'tan.'],
    phone: ['Deja tu', 'reseña'],
  },

  services: {
    title: ['Soluciones digitales para', 'hacer crecer tu negocio.'],
    lead: ['Diseñamos y desarrollamos herramientas digitales que', 'impulsan necesidades reales de tu negocio.'],
  },

  process: {
    eyebrow: 'Cómo trabajamos',
    title: ['De la idea a una solución', 'que funciona.'],
    lead: 'Los plazos y el alcance se concretan en cada propuesta.',
  },

  about: {
    eyebrow: 'Por qué cLoak Studios',
    title: 'Tecnología con propósito.',
    lead: 'Somos un estudio independiente centrado en crear soluciones digitales útiles, claras y bien construidas. Combinamos diseño y desarrollo para que la tecnología trabaje a favor de tu negocio.',
    quote: 'Construimos más allá de lo visible.',
    founderEyebrow: 'Quién hay detrás',
    founderText: (name: string) =>
      `Detrás de cLoak Studios está ${name}, desarrollador full stack. Se encarga de cada proyecto de principio a fin: desde la primera conversación hasta el diseño, el desarrollo y la puesta en marcha.`,
    portfolio: 'Ver portafolio',
    newTab: '(se abre en una pestaña nueva)',
  },

  contact: {
    eyebrow: 'Contacto',
    title: 'Hablemos de tu proyecto.',
    lead: 'Cuéntanos qué necesitas. Revisaremos tu solicitud y nos pondremos en contacto contigo para hablar de los siguientes pasos.',
    nextTitle: 'Qué pasa después',
    next: [
      'Revisamos tu solicitud y el servicio que has elegido.',
      'Te escribimos al email que nos indiques para concretar detalles.',
      'Si encaja, preparamos una propuesta con alcance y plazos.',
    ],
    whatsappPrompt: '¿Prefieres WhatsApp?',
    whatsappLink: 'Escríbenos',
  },

  footer: {
    navLabel: 'Pie de página',
    links: { home: 'Inicio', services: 'Servicios', contact: 'Contacto', portfolio: 'Portafolio' },
    privacy: 'Política de privacidad',
    legal: 'Aviso legal',
  },

  whatsapp: {
    message: 'Hola, quería pedir información',
    label: 'Escríbenos por WhatsApp (se abre en una pestaña nueva)',
    bubble: '¡Cuéntanos tu proyecto, te ayudamos!',
    status: 'en línea',
    close: 'Cerrar mensaje',
  },

  form: {
    required: 'obligatorio',
    optional: 'opcional',
    optionalMany: 'opcional · varias opciones',
    testTag: 'Modo prueba',
    testNotice:
      'Faltan <code>PUBLIC_WEB3FORMS_ACCESS_KEY</code> y las variables de Supabase. El formulario valida los datos y muestra la solicitud en la consola del navegador, pero <strong>no envía nada</strong>.',
    disabledNotice:
      'El envío online de solicitudes todavía no está activo. Estamos terminando de configurarlo; vuelve a intentarlo en unos días.',
    serviceLegend: '¿Qué servicio te interesa?',
    serviceLabels: {
      web: 'Página web para negocio',
      app: 'Aplicación de gestión',
      qr: 'QR para reseñas',
      otro: 'Otro / No estoy seguro',
    },
    serviceHints: {
      web: 'Nueva web o renovación',
      app: 'Software a medida para tu día a día',
      qr: 'Acceso directo a tus reseñas',
      otro: 'Te ayudamos a definirlo',
    },
    name: 'Nombre',
    business: 'Nombre del negocio',
    email: 'Email',
    emailPlaceholder: 'nombre@negocio.com',
    phone: 'Teléfono',
    webLegend: 'Sobre tu página web',
    webHasSite: '¿Tienes una web actualmente?',
    webNeeds: '¿Qué necesitas?',
    webType: 'Tipo de negocio',
    webTypePlaceholder: 'Restaurante, clínica, tienda…',
    webUrl: 'URL actual',
    webUrlPlaceholder: 'minegocio.es',
    appLegend: 'Sobre tu aplicación',
    appManage: '¿Qué necesitas gestionar?',
    appUsers: '¿Cuántas personas la utilizarían?',
    appTool: '¿Utilizas actualmente alguna herramienta?',
    appToolPlaceholder: 'Excel, papel, otra aplicación…',
    appSimplify: '¿Qué tarea te gustaría simplificar?',
    qrLegend: 'Sobre tu QR de reseñas',
    qrUrl: 'Enlace a tu página de reseñas',
    qrUrlHint: 'Si aún no lo tienes, puedes dejarlo vacío: lo necesitaremos antes de generar el QR final.',
    qrPlatform: 'Plataforma',
    qrPlacement: '¿Dónde utilizarás el QR?',
    message: 'Cuéntanos sobre tu proyecto',
    messageOther: 'Explícanos qué necesitas',
    messagePlaceholder: '¿Qué necesitas? ¿Qué te gustaría conseguir?',
    honeypot: 'No rellenes este campo',
    privacyPre: 'He leído y acepto la',
    privacyLink: 'política de privacidad',
    submit: 'Enviar solicitud',
    submitting: 'Enviando…',
    microcopy: 'Tus datos se utilizarán únicamente para gestionar tu consulta, de acuerdo con la',
    successTest: 'Modo prueba · no se ha enviado ningún email',
    successTitle: '¡Gracias por contactar con cLoak Studios!',
    successText: 'Hemos recibido tu solicitud. Revisaremos la información y nos pondremos en contacto contigo.',
    successAgain: 'Enviar otra solicitud',
    options: {
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
    },
  },
};

export type UI = typeof es;

const en: UI = {
  htmlLang: 'en',
  ogLocale: 'en_GB',
  title: 'cLoak Studios',
  description:
    'We build websites for businesses, management apps and QR solutions for reviews. Tell us what your business needs.',
  ogImageAlt: 'cLoak Studios — Websites, apps and digital solutions',
  tagline: 'Digital solutions for businesses that want to grow.',
  skipLink: 'Skip to content',
  logoLabel: 'cLoak Studios — home',

  nav: [
    { label: 'Home', href: '#inicio' },
    { label: 'Services', href: '#servicios' },
    { label: 'About us', href: '#estudio' },
    { label: 'Contact', href: '#contacto' },
  ],
  navLabel: 'Main',
  mobileNavLabel: 'Mobile menu',
  headerCta: "Let's talk",
  menuOpen: 'Open menu',
  menuClose: 'Close menu',
  langSwitchLabel: 'Language',
  langSwitchTo: 'Ver la web en español',

  hero: {
    eyebrow: 'Independent digital development studio',
    line1: 'We digitalise',
    line2: 'your business',
    accent1: 'We build',
    accent2: "what's next",
    lead: 'We create websites, management apps and digital solutions that help businesses work better and grow.',
    explore: 'Explore services',
    tellUs: 'Tell us about your project',
    laptop: ['Ideas that', 'con', 'nect.'],
    phone: ['Leave a', 'review'],
  },

  services: {
    title: ['Digital solutions to', 'help your business grow.'],
    lead: ['We design and build digital tools that', 'meet the real needs of your business.'],
  },

  process: {
    eyebrow: 'How we work',
    title: ['From idea to a solution', 'that works.'],
    lead: 'Timelines and scope are defined in each proposal.',
  },

  about: {
    eyebrow: 'Why cLoak Studios',
    title: 'Technology with purpose.',
    lead: 'We are an independent studio focused on building useful, clear and well-crafted digital solutions. We combine design and development so technology works in your favour.',
    quote: 'We build beyond the visible.',
    founderEyebrow: "Who's behind it",
    founderText: (name: string) =>
      `Behind cLoak Studios is ${name}, a full stack developer. He handles every project from start to finish: from the first conversation through design, development and launch.`,
    portfolio: 'View portfolio',
    newTab: '(opens in a new tab)',
  },

  contact: {
    eyebrow: 'Contact',
    title: "Let's talk about your project.",
    lead: "Tell us what you need. We'll review your request and get in touch to discuss the next steps.",
    nextTitle: 'What happens next',
    next: [
      'We review your request and the service you chose.',
      'We email you to go over the details.',
      "If it's a good fit, we prepare a proposal with scope and timeline.",
    ],
    whatsappPrompt: 'Prefer WhatsApp?',
    whatsappLink: 'Message us',
  },

  footer: {
    navLabel: 'Footer',
    links: { home: 'Home', services: 'Services', contact: 'Contact', portfolio: 'Portfolio' },
    privacy: 'Privacy policy (Spanish)',
    legal: 'Legal notice (Spanish)',
  },

  whatsapp: {
    message: "Hi, I'd like some information",
    label: 'Message us on WhatsApp (opens in a new tab)',
    bubble: "Tell us about your project, we're here to help!",
    status: 'online',
    close: 'Close message',
  },

  form: {
    required: 'required',
    optional: 'optional',
    optionalMany: 'optional · choose any',
    testTag: 'Test mode',
    testNotice:
      '<code>PUBLIC_WEB3FORMS_ACCESS_KEY</code> and the Supabase variables are missing. The form validates the data and logs the request in the browser console, but <strong>nothing is sent</strong>.',
    disabledNotice:
      "Online requests aren't active yet. We're finishing the setup; please try again in a few days.",
    serviceLegend: 'Which service are you interested in?',
    serviceLabels: {
      web: 'Business website',
      app: 'Management app',
      qr: 'QR for reviews',
      otro: "Other / Not sure",
    },
    serviceHints: {
      web: 'New website or redesign',
      app: 'Custom software for your day-to-day',
      qr: 'Direct access to your reviews',
      otro: "We'll help you define it",
    },
    name: 'Name',
    business: 'Business name',
    email: 'Email',
    emailPlaceholder: 'name@business.com',
    phone: 'Phone',
    webLegend: 'About your website',
    webHasSite: 'Do you currently have a website?',
    webNeeds: 'What do you need?',
    webType: 'Type of business',
    webTypePlaceholder: 'Restaurant, clinic, shop…',
    webUrl: 'Current URL',
    webUrlPlaceholder: 'mybusiness.com',
    appLegend: 'About your app',
    appManage: 'What do you need to manage?',
    appUsers: 'How many people would use it?',
    appTool: 'Do you currently use any tool?',
    appToolPlaceholder: 'Excel, paper, another app…',
    appSimplify: 'Which task would you like to simplify?',
    qrLegend: 'About your review QR',
    qrUrl: 'Link to your reviews page',
    qrUrlHint: "If you don't have it yet, leave it empty: we'll need it before generating the final QR.",
    qrPlatform: 'Platform',
    qrPlacement: 'Where will you use the QR?',
    message: 'Tell us about your project',
    messageOther: 'Tell us what you need',
    messagePlaceholder: 'What do you need? What would you like to achieve?',
    honeypot: "Don't fill in this field",
    privacyPre: 'I have read and accept the',
    privacyLink: 'privacy policy',
    submit: 'Send request',
    submitting: 'Sending…',
    microcopy: 'Your data will only be used to handle your enquiry, in accordance with the',
    successTest: 'Test mode · no email has been sent',
    successTitle: 'Thanks for contacting cLoak Studios!',
    successText: "We've received your request. We'll review the details and get in touch with you.",
    successAgain: 'Send another request',
    options: {
      webHasSite: { si: 'Yes', no: 'No', renovar: 'Needs a redesign' },
      webNeeds: {
        informativa: 'Informational site',
        reservas: 'Site with bookings',
        catalogo: 'Catalogue',
        tienda: 'Online shop',
        otro: 'Other',
      },
      appManage: {
        clientes: 'Customers',
        citas: 'Appointments & bookings',
        empleados: 'Staff',
        inventario: 'Inventory',
        pedidos: 'Orders',
        otro: 'Other',
      },
      appUsers: { solo: 'Just me', '2-5': '2–5', '6-20': '6–20', '20+': 'More than 20', nose: "I don't know" },
      qrPlatform: { google: 'Google', tripadvisor: 'Tripadvisor', facebook: 'Facebook', otra: 'Other', nose: "I don't know" },
      qrPlacement: { mesa: 'Table', mostrador: 'Counter', cartel: 'Poster', tarjeta: 'Card', otro: 'Other' },
    },
  },
};

export const ui: Record<Lang, UI> = { es, en };
