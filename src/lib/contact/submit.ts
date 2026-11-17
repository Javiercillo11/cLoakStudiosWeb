// Capa de envío desacoplada. Hoy usa Web3Forms (compatible con hosting estático);
// para cambiar de proveedor basta con sustituir esta función.

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export type SubmitMode = 'live' | 'test' | 'disabled';

export type SubmitResult =
  | { ok: true; test: boolean }
  | { ok: false; reason: 'network' | 'timeout' | 'rejected' | 'disabled'; detail?: string };

/**
 * - live: hay access key → envío real.
 * - test: sin access key en desarrollo → no se envía nada (modo prueba visible).
 * - disabled: sin access key en producción → el envío no está disponible.
 */
export function resolveMode(accessKey: string | undefined, isDev: boolean): SubmitMode {
  if (accessKey && accessKey.trim()) return 'live';
  return isDev ? 'test' : 'disabled';
}

export async function submitContact(
  payload: Record<string, unknown>,
  mode: SubmitMode,
  { fetchImpl = fetch, timeoutMs = 15000 }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<SubmitResult> {
  if (mode === 'disabled') return { ok: false, reason: 'disabled' };

  if (mode === 'test') {
    // Modo prueba: NO se envía ningún email. Se muestra el contenido para revisarlo.
    const { access_key: _omit, ...visible } = payload;
    console.info('[cLoak Studios · MODO PRUEBA] Solicitud que se enviaría:', visible);
    return { ok: true, test: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    let body: { success?: boolean; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      /* respuesta no JSON */
    }
    // Éxito solo si el proveedor lo confirma explícitamente.
    if (res.ok && body.success === true) return { ok: true, test: false };
    return { ok: false, reason: 'rejected', detail: body.message ?? `HTTP ${res.status}` };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
