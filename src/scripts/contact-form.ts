import {
  businessRequired,
  buildLeadPayload,
  buildPayload,
  readValues,
  SERVICE_IDS,
  validate,
  type ContactErrors,
  type FieldName,
  type ServiceId,
} from '../lib/contact/schema';
import { resolveMode, submitContact, supabaseTarget, type SubmitMode } from '../lib/contact/submit';

/** Campo lógico → id del control en el DOM. */
const FIELD_IDS: Record<FieldName, string> = {
  service: 'cf-service',
  name: 'cf-name',
  business: 'cf-business',
  email: 'cf-email',
  phone: 'cf-phone',
  message: 'cf-message',
  privacy: 'cf-privacy',
  'web.currentUrl': 'cf-web-url',
  'qr.reviewUrl': 'cf-qr-url',
};
const ID_TO_FIELD = Object.fromEntries(Object.entries(FIELD_IDS).map(([k, v]) => [v, k])) as Record<string, FieldName>;

// Límite local de envíos (el proveedor aplica además su propio rate limit y filtro anti-spam).
const RATE_KEY = 'cloak:contact-submissions';
const RATE_MAX = 3;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const isService = (v: string | null): v is ServiceId => !!v && (SERVICE_IDS as readonly string[]).includes(v);

function recentSubmissions(): number[] {
  try {
    const list = JSON.parse(localStorage.getItem(RATE_KEY) ?? '[]') as number[];
    return list.filter((t) => Date.now() - t < RATE_WINDOW_MS);
  } catch {
    return [];
  }
}

function recordSubmission() {
  try {
    localStorage.setItem(RATE_KEY, JSON.stringify([...recentSubmissions(), Date.now()]));
  } catch {
    /* almacenamiento no disponible: no es crítico */
  }
}

export function initContactForm() {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  const successPanel = document.querySelector<HTMLElement>('[data-form-success]')!;
  const alertBox = form.querySelector<HTMLElement>('[data-form-alert]')!;
  const submitBtn = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]')!;
  const blocks = form.querySelectorAll<HTMLFieldSetElement>('[data-service-block]');
  const messageField = form.querySelector<HTMLTextAreaElement>('#cf-message')!;
  const messageLabel = form.querySelector<HTMLElement>('[data-field="cf-message"] [data-label-text]')!;
  const businessInput = form.querySelector<HTMLInputElement>('#cf-business')!;

  // Las claves y el modo se fijan en build. El modo prueba solo existe en desarrollo.
  const accessKey = (import.meta.env.PUBLIC_WEB3FORMS_ACCESS_KEY ?? '').trim();
  const supabase = supabaseTarget(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
  const mode: SubmitMode = resolveMode({ web3forms: !!accessKey, supabase: !!supabase }, import.meta.env.DEV);

  // Con JS activo, la validación y el envío los gestiona este script.
  form.noValidate = true;

  /** Campos que el usuario ya ha visitado: solo ahí se valida en vivo. */
  const touched = new Set<FieldName>();
  let submitting = false;
  let submittedOnce = false;

  // ── Servicio y bloques dinámicos ────────────────────────────────────────
  const currentService = () => (new FormData(form).get('service') as string | null) ?? '';

  function applyService() {
    const service = currentService();
    blocks.forEach((block) => {
      const active = block.dataset.serviceBlock === service;
      block.classList.toggle('is-active', active);
      // Los bloques inactivos se desactivan (no se envían) pero conservan lo escrito.
      block.disabled = !active;
    });

    const needsBusiness = businessRequired(service as ServiceId);
    businessInput.setAttribute('aria-required', String(needsBusiness));
    const field = businessInput.closest('.field')!;
    field.querySelector<HTMLElement>('[data-conditional-req]')!.hidden = !needsBusiness;
    field.querySelector<HTMLElement>('[data-optional-tag]')?.toggleAttribute('hidden', needsBusiness);
    if (!needsBusiness) touched.delete('business');

    messageLabel.textContent = service === 'otro' ? 'Explícanos qué necesitas' : 'Cuéntanos sobre tu proyecto';
    refreshErrors();
  }

  function selectService(id: ServiceId, { focus = false } = {}) {
    const radio = form!.querySelector<HTMLInputElement>(`input[name="service"][value="${id}"]`);
    if (!radio) return;
    radio.checked = true;
    touched.add('service');
    applyService();
    if (focus) radio.focus({ preventScroll: true });
  }

  form.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.name === 'service') {
      touched.add('service');
      applyService();
    }
    if (t.name === 'privacy') {
      touched.add('privacy');
      refreshErrors();
    }
  });

  // CTA de las tarjetas: preselecciona el servicio y lleva al formulario sin recargar.
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest<HTMLAnchorElement>('[data-service-link]');
    if (!link) return;
    const id = link.dataset.serviceLink ?? null;
    if (!isService(id)) return;
    e.preventDefault();
    selectService(id);
    const url = new URL(window.location.href);
    url.searchParams.set('servicio', id);
    url.hash = 'contacto';
    history.replaceState(null, '', url);
    document.getElementById('contacto')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    // Foco en el siguiente paso útil: el nombre.
    window.setTimeout(() => form!.querySelector<HTMLInputElement>('#cf-name')?.focus({ preventScroll: true }), 450);
  });

  // Enlaces compartibles: /?servicio=qr#contacto
  const fromUrl = new URLSearchParams(window.location.search).get('servicio');
  if (isService(fromUrl)) selectService(fromUrl);
  else applyService();

  // ── Validación inline ──────────────────────────────────────────────────
  function setError(field: FieldName, message: string | undefined) {
    const id = FIELD_IDS[field];
    const errorEl = form!.querySelector<HTMLElement>(`[data-error-for="${id}"]`);
    const control = document.getElementById(id);
    if (!errorEl || !control) return;
    errorEl.textContent = message ?? '';
    errorEl.hidden = !message;
    if (message) control.setAttribute('aria-invalid', 'true');
    else control.removeAttribute('aria-invalid');
    control.closest('[data-field]')?.classList.toggle('has-error', !!message);
  }

  function currentErrors(): ContactErrors {
    return validate(readValues(new FormData(form!)));
  }

  /** Muestra los errores de los campos visitados (o de todos tras un intento de envío). */
  function refreshErrors(errors: ContactErrors = currentErrors()) {
    for (const field of Object.keys(FIELD_IDS) as FieldName[]) {
      const show = submittedOnce || touched.has(field);
      setError(field, show ? errors[field] : undefined);
    }
    return errors;
  }

  form.addEventListener('focusout', (e) => {
    const t = e.target as HTMLElement;
    const field = ID_TO_FIELD[t.id];
    // No marcar como visitado un campo vacío al tabular por él (evita errores prematuros).
    if (field && (t as HTMLInputElement).value) {
      touched.add(field);
      refreshErrors();
    }
  });

  form.addEventListener('input', (e) => {
    const t = e.target as HTMLElement;
    if (t === messageField) updateCounter();
    // Corrige en vivo solo si el campo ya muestra un error.
    const field = ID_TO_FIELD[t.id];
    if (field && (touched.has(field) || submittedOnce)) refreshErrors();
  });

  const counter = form.querySelector<HTMLElement>('[data-counter-for="cf-message"]');
  function updateCounter() {
    if (counter) counter.textContent = String(messageField.value.length);
  }
  updateCounter();

  // ── Envío ──────────────────────────────────────────────────────────────
  function showAlert(html: string) {
    alertBox.innerHTML = html;
    alertBox.hidden = false;
  }

  function setSubmitting(on: boolean) {
    submitting = on;
    submitBtn.disabled = on;
    submitBtn.setAttribute('aria-busy', String(on));
    form!.classList.toggle('is-submitting', on);
    submitLabel.textContent = on ? 'Enviando…' : 'Enviar solicitud';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitting) return; // protección contra doble envío

    alertBox.hidden = true;
    submittedOnce = true;
    const values = readValues(new FormData(form));
    const errors = refreshErrors(validate(values));
    const invalid = Object.keys(errors) as FieldName[];

    if (invalid.length) {
      const n = invalid.length;
      showAlert(`Revisa ${n === 1 ? 'el campo marcado' : `los ${n} campos marcados`} para poder enviar la solicitud.`);
      // Foco al primer campo con error, en orden visual.
      const order: FieldName[] = ['service', 'name', 'business', 'email', 'phone', 'web.currentUrl', 'qr.reviewUrl', 'message', 'privacy'];
      const first = order.find((f) => errors[f])!;
      const target =
        first === 'service'
          ? form.querySelector<HTMLInputElement>('input[name="service"]')
          : document.getElementById(FIELD_IDS[first]);
      target?.focus();
      return;
    }

    if (mode !== 'test' && recentSubmissions().length >= RATE_MAX) {
      showAlert(
        'Has enviado varias solicitudes en poco tiempo. Espera un rato antes de volver a intentarlo; ya hemos recibido las anteriores.',
      );
      return;
    }

    setSubmitting(true);
    const result = await submitContact(
      {
        web3forms: accessKey ? buildPayload(values, accessKey) : undefined,
        supabase: supabase ? { ...supabase, args: buildLeadPayload(values) } : undefined,
      },
      mode,
    );
    setSubmitting(false);

    if (result.ok) {
      if (!result.test) recordSubmission();
      // Uno de los dos canales falló, pero la solicitud llegó por el otro.
      if (result.failed) console.warn('[contacto] Canal de envío con error:', result.failed);
      form.reset();
      touched.clear();
      submittedOnce = false;
      applyService();
      updateCounter();
      form.hidden = true;
      successPanel.querySelector<HTMLElement>('[data-success-test]')!.hidden = !result.test;
      successPanel.hidden = false;
      successPanel.focus({ preventScroll: true });
      successPanel.scrollIntoView({ block: 'center' });
      return;
    }

    // Error recuperable: los datos escritos se conservan.
    const messages: Record<typeof result.reason, string> = {
      network: 'No hemos podido conectar con el servidor. Comprueba tu conexión y vuelve a intentarlo.',
      timeout: 'El envío está tardando demasiado. Vuelve a intentarlo en unos segundos.',
      rejected: 'No hemos podido enviar tu solicitud en este momento. Vuelve a intentarlo en unos minutos.',
      disabled: 'El envío online todavía no está activo. Inténtalo de nuevo más adelante.',
    };
    showAlert(`<strong>No se ha enviado la solicitud.</strong> ${messages[result.reason]} Tus datos siguen en el formulario.`);
    if (result.detail) console.warn('[contacto] Respuesta del servicio de envío:', result.detail);
  });

  successPanel.querySelector('[data-form-reset]')?.addEventListener('click', () => {
    successPanel.hidden = true;
    form.hidden = false;
    form.querySelector<HTMLInputElement>('input[name="service"]')?.focus();
  });
}
