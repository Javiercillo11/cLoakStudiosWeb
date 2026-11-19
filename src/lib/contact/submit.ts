// Capa de envío desacoplada. Cada solicitud sale por dos canales en paralelo:
//   - Web3Forms: la reenvía por email.
//   - Supabase: la guarda en la app de gestión (función submit_lead, única puerta para anon).
// Basta con que uno de los dos funcione para que el visitante vea el envío como correcto.

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export type SubmitMode = 'live' | 'test' | 'disabled';

type FailReason = 'network' | 'timeout' | 'rejected';

export type ChannelName = 'web3forms' | 'supabase';

export type ChannelResult = { ok: true } | { ok: false; reason: FailReason; detail?: string };

export type SubmitResult =
  | { ok: true; test: boolean; failed?: { channel: ChannelName; reason: FailReason; detail?: string }[] }
  | { ok: false; reason: FailReason | 'disabled'; detail?: string };

export interface SupabaseTarget {
  /** Origen del proyecto, p. ej. https://xxxx.supabase.co */
  url: string;
  /** Clave pública (anon o publishable). */
  key: string;
}

export interface Channels {
  /** Cuerpo para Web3Forms (incluye access_key). */
  web3forms?: Record<string, unknown>;
  /** Destino y argumentos de rpc/submit_lead. */
  supabase?: SupabaseTarget & { args: Record<string, unknown> };
}

interface Options {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/** Destino de Supabase a partir de las variables de entorno, o null si falta alguna o la URL no es válida. */
export function supabaseTarget(url: string | undefined, key: string | undefined): SupabaseTarget | null {
  const k = key?.trim() ?? '';
  let origin = '';
  try {
    // Tolera URLs pegadas con /rest/v1/ o barra final.
    origin = url?.trim() ? new URL(url.trim()).origin : '';
  } catch {
    origin = '';
  }
  return origin && k ? { url: origin, key: k } : null;
}

/**
 * - live: hay al menos un canal configurado → envío real.
 * - test: ninguno configurado en desarrollo → no se envía nada (modo prueba visible).
 * - disabled: ninguno configurado en producción → el envío no está disponible.
 */
export function resolveMode(configured: { web3forms: boolean; supabase: boolean }, isDev: boolean): SubmitMode {
  if (configured.web3forms || configured.supabase) return 'live';
  return isDev ? 'test' : 'disabled';
}

/** POST JSON con timeout. `accept` decide, con la respuesta ya leída, si el proveedor confirmó el envío. */
async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  accept: (res: Response, json: Record<string, unknown>) => true | string,
  { fetchImpl = fetch, timeoutMs = 15000 }: Options,
): Promise<ChannelResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let json: Record<string, unknown> = {};
    try {
      json = (await res.json()) ?? {};
    } catch {
      /* respuesta no JSON */
    }
    const verdict = accept(res, json);
    return verdict === true ? { ok: true } : { ok: false, reason: 'rejected', detail: verdict };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return { ok: false, reason: 'timeout' };
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/** Éxito solo si Web3Forms lo confirma explícitamente. */
export function sendWeb3Forms(payload: Record<string, unknown>, opts: Options = {}) {
  return postJson(
    WEB3FORMS_ENDPOINT,
    {},
    payload,
    (res, json) => (res.ok && json.success === true) || String(json.message ?? `HTTP ${res.status}`),
    opts,
  );
}

/** Guarda la solicitud en Supabase. Éxito solo si submit_lead devuelve {"ok": true}. */
export function sendLead(target: SupabaseTarget, args: Record<string, unknown>, opts: Options = {}) {
  // Las claves anon antiguas son JWT y van también en Authorization; las nuevas (sb_publishable_…) solo en apikey.
  const headers: Record<string, string> = { apikey: target.key };
  if (target.key.startsWith('eyJ')) headers.Authorization = `Bearer ${target.key}`;
  return postJson(
    `${target.url}/rest/v1/rpc/submit_lead`,
    headers,
    args,
    (res, json) => (res.ok && json.ok === true) || String(json.reason ?? json.message ?? `HTTP ${res.status}`),
    opts,
  );
}

export async function submitContact(channels: Channels, mode: SubmitMode, opts: Options = {}): Promise<SubmitResult> {
  if (mode === 'disabled') return { ok: false, reason: 'disabled' };

  if (mode === 'test') {
    // Modo prueba: NO se envía nada. Se muestra el contenido para revisarlo.
    const { access_key: _omit, ...visible } = channels.web3forms ?? {};
    console.info('[cLoak Studios · MODO PRUEBA] Email que se enviaría:', visible);
    console.info('[cLoak Studios · MODO PRUEBA] Solicitud que se guardaría:', channels.supabase?.args);
    return { ok: true, test: true };
  }

  const tasks: Promise<[ChannelName, ChannelResult]>[] = [];
  if (channels.web3forms) tasks.push(sendWeb3Forms(channels.web3forms, opts).then((r) => ['web3forms', r]));
  if (channels.supabase) {
    const { args, ...target } = channels.supabase;
    tasks.push(sendLead(target, args, opts).then((r) => ['supabase', r]));
  }
  if (!tasks.length) return { ok: false, reason: 'disabled' };

  const results = await Promise.all(tasks);
  const failed = results.flatMap(([channel, r]) => (r.ok ? [] : [{ channel, reason: r.reason, detail: r.detail }]));

  if (failed.length < results.length) return failed.length ? { ok: true, test: false, failed } : { ok: true, test: false };

  // Fallan todos: se informa del primer motivo (en orden de prioridad para el mensaje al visitante).
  const first = failed.find((f) => f.reason === 'network') ?? failed.find((f) => f.reason === 'timeout') ?? failed[0];
  const detail = failed.map((f) => `${f.channel}: ${f.detail ?? f.reason}`).join(' · ');
  return { ok: false, reason: first.reason, detail };
}
