import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadPayload, buildPayload, clean, normalizeUrl, readValues, validate, type FieldSource } from '../src/lib/contact/schema.ts';
import { resolveMode, submitContact, supabaseTarget, type Channels } from '../src/lib/contact/submit.ts';

/** Simula FormData a partir de un objeto (los arrays son campos múltiples). */
function fields(obj: Record<string, string | string[]>): FieldSource {
  return {
    get: (k) => (Array.isArray(obj[k]) ? obj[k][0] : (obj[k] ?? null)),
    getAll: (k) => (Array.isArray(obj[k]) ? obj[k] : obj[k] !== undefined ? [obj[k]] : []),
  };
}

const base = {
  service: 'web',
  name: 'Ana',
  email: 'ana@example.com',
  message: 'Necesito una web para mi tienda.',
  privacy: 'on',
};

test('formulario válido no produce errores', () => {
  assert.deepEqual(validate(readValues(fields(base))), {});
});

test('campos obligatorios vacíos producen mensajes concretos', () => {
  const e = validate(readValues(fields({})));
  assert.ok(e.service && e.name && e.email && e.message && e.privacy);
  assert.equal(e.phone, undefined);
});

test('rechaza servicio desconocido y email mal formado', () => {
  const e = validate(readValues(fields({ ...base, service: 'hack', email: 'ana@' })));
  assert.ok(e.service);
  assert.ok(e.email);
});

test('el negocio solo es obligatorio para el QR', () => {
  assert.equal(validate(readValues(fields(base))).business, undefined);
  assert.ok(validate(readValues(fields({ ...base, service: 'qr' }))).business);
  assert.equal(validate(readValues(fields({ ...base, service: 'qr', business: 'Bar Pepe' }))).business, undefined);
});

test('el enlace de reseñas es opcional pero, si existe, debe ser válido', () => {
  const qr = { ...base, service: 'qr', business: 'Bar Pepe' };
  assert.deepEqual(validate(readValues(fields(qr))), {});
  assert.ok(validate(readValues(fields({ ...qr, qr_review_url: 'no es url' })))['qr.reviewUrl']);
  assert.deepEqual(validate(readValues(fields({ ...qr, qr_review_url: 'g.page/r/abc' }))), {});
});

test('sanea caracteres de control, espacios y longitudes', () => {
  assert.equal(clean('  Hola\u0000   mundo \n', 100), 'Hola mundo');
  assert.equal(clean('a'.repeat(500), 100).length, 100);
  assert.equal(clean('l1\r\n\n\n\nl2', 100, true), 'l1\n\nl2');
  assert.equal(clean(42, 10), '');
});

test('ignora opciones que no existen en los campos cerrados', () => {
  const v = readValues(fields({ ...base, web_needs: ['tienda', '<script>', 'tienda'], web_has_site: 'quizá' }));
  assert.deepEqual(v.web.needs, ['tienda']);
  assert.equal(v.web.hasSite, '');
});

test('normalizeUrl', () => {
  assert.equal(normalizeUrl('minegocio.es'), 'https://minegocio.es/');
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl('localhost'), null);
});

test('el payload solo incluye los campos del servicio elegido', () => {
  const v = readValues(
    fields({
      ...base,
      web_needs: ['reservas'],
      app_manage: ['clientes'], // pertenece a otro servicio: no debe enviarse
      qr_platform: 'google',
    }),
  );
  const p = buildPayload(v, 'KEY', new Date('2026-11-17T10:00:00Z'));
  assert.equal(p.subject, 'Nueva solicitud desde cLoak Studios — Página web para negocio');
  assert.equal(p['¿Qué necesita?'], 'Web con reservas');
  assert.equal(p['¿Qué necesita gestionar?'], undefined);
  assert.equal(p['Plataforma'], undefined);
  assert.equal(p.access_key, 'KEY');
  assert.match(String(p['Fecha de recepción']), /2026/);
});

test('buildLeadPayload: argumentos de submit_lead con los detalles en orden', () => {
  const v = readValues(
    fields({ ...base, service: 'qr', business: ' Bar Pepe ', qr_platform: 'google', qr_placement: ['mesa', 'cartel'], botcheck: '' }),
  );
  const p = buildLeadPayload(v);
  assert.equal(p.p_service, 'qr');
  assert.equal(p.p_name, 'Ana');
  assert.equal(p.p_email, 'ana@example.com');
  assert.equal(p.p_business, 'Bar Pepe');
  assert.equal(p.p_phone, '');
  assert.equal(p.p_botcheck, '');
  assert.deepEqual(p.p_details, [
    { label: 'Enlace a la página de reseñas', value: 'Aún no lo tiene' },
    { label: 'Plataforma', value: 'Google' },
    { label: '¿Dónde usará el QR?', value: 'Mesa, Cartel' },
  ]);
});

test('buildLeadPayload: el honeypot se envía para que el servidor lo descarte', () => {
  assert.equal(buildLeadPayload(readValues(fields({ ...base, botcheck: 'http://spam' }))).p_botcheck, 'http://spam');
});

test('supabaseTarget: solo el origen y nada si falta algún dato', () => {
  assert.deepEqual(supabaseTarget('https://abc.supabase.co/rest/v1/', ' key '), { url: 'https://abc.supabase.co', key: 'key' });
  assert.equal(supabaseTarget('', 'key'), null);
  assert.equal(supabaseTarget('https://abc.supabase.co', ''), null);
  assert.equal(supabaseTarget('no es url', 'key'), null);
  assert.equal(supabaseTarget(undefined, undefined), null);
});

test('resolveMode: basta un canal y nunca modo prueba en producción', () => {
  assert.equal(resolveMode({ web3forms: true, supabase: false }, false), 'live');
  assert.equal(resolveMode({ web3forms: false, supabase: true }, false), 'live');
  assert.equal(resolveMode({ web3forms: false, supabase: false }, true), 'test');
  assert.equal(resolveMode({ web3forms: false, supabase: false }, false), 'disabled');
});

// ── Envío por los dos canales ──────────────────────────────────────────────

type Reply = { status: number; body: unknown } | 'network';

/** fetch falso que responde distinto según el destino y guarda las peticiones. */
function router(web3: Reply, supa: Reply) {
  const calls: { url: string; headers: Record<string, string>; body: unknown }[] = [];
  const impl = (async (url: string, init?: RequestInit) => {
    calls.push({ url, headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) });
    const reply = url.includes('web3forms') ? web3 : supa;
    if (reply === 'network') throw new TypeError('Failed to fetch');
    return new Response(JSON.stringify(reply.body), { status: reply.status });
  }) as typeof fetch;
  return { impl, calls };
}

const W3_OK: Reply = { status: 200, body: { success: true } };
const W3_KO: Reply = { status: 200, body: { success: false, message: 'Invalid key' } };
const SB_OK: Reply = { status: 200, body: { ok: true } };
const SB_KO: Reply = { status: 200, body: { ok: false, reason: 'rate_limited' } };

const both: Channels = {
  web3forms: { access_key: 'KEY', name: 'Ana' },
  supabase: { url: 'https://abc.supabase.co', key: 'eyJanon', args: { p_name: 'Ana' } },
};

test('submit: los dos canales en paralelo, con las cabeceras de Supabase', async () => {
  const { impl, calls } = router(W3_OK, SB_OK);
  assert.deepEqual(await submitContact(both, 'live', { fetchImpl: impl }), { ok: true, test: false });
  assert.equal(calls.length, 2);
  const sb = calls.find((c) => c.url === 'https://abc.supabase.co/rest/v1/rpc/submit_lead')!;
  assert.equal(sb.headers.apikey, 'eyJanon');
  assert.equal(sb.headers.Authorization, 'Bearer eyJanon');
  assert.deepEqual(sb.body, { p_name: 'Ana' });
});

test('submit: las claves publishable no van en Authorization', async () => {
  const { impl, calls } = router(W3_OK, SB_OK);
  await submitContact({ supabase: { ...both.supabase!, key: 'sb_publishable_x' } }, 'live', { fetchImpl: impl });
  assert.equal(calls[0].headers.apikey, 'sb_publishable_x');
  assert.equal(calls[0].headers.Authorization, undefined);
});

test('submit: si falla un canal, éxito para el visitante e informe del fallo', async () => {
  const a = await submitContact(both, 'live', { fetchImpl: router(W3_OK, SB_KO).impl });
  assert.deepEqual(a, { ok: true, test: false, failed: [{ channel: 'supabase', reason: 'rejected', detail: 'rate_limited' }] });

  const b = await submitContact(both, 'live', { fetchImpl: router('network', SB_OK).impl });
  assert.equal(b.ok, true);
  assert.deepEqual(b.ok && b.failed?.map((f) => f.channel), ['web3forms']);
});

test('submit: si fallan los dos, error con el motivo más útil', async () => {
  const r = await submitContact(both, 'live', { fetchImpl: router(W3_KO, 'network').impl });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.reason, 'network');
  assert.match(!r.ok ? String(r.detail) : '', /web3forms: Invalid key/);

  const r2 = await submitContact(both, 'live', { fetchImpl: router({ status: 500, body: {} }, { status: 404, body: {} }).impl });
  assert.equal(!r2.ok && r2.reason, 'rejected');
});

test('submit: éxito solo con confirmación explícita del proveedor', async () => {
  const only = { web3forms: both.web3forms };
  assert.equal((await submitContact(only, 'live', { fetchImpl: router({ status: 200, body: {} }, SB_OK).impl })).ok, false);
  const onlySb = { supabase: both.supabase };
  assert.equal((await submitContact(onlySb, 'live', { fetchImpl: router(W3_OK, { status: 200, body: {} }).impl })).ok, false);
});

test('submit: timeout, modo desactivado, sin canales y modo prueba', async () => {
  const hanging = ((_u: unknown, init?: RequestInit) =>
    new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })) as typeof fetch;
  const t = await submitContact({ web3forms: both.web3forms }, 'live', { fetchImpl: hanging, timeoutMs: 10 });
  assert.equal(!t.ok && t.reason, 'timeout');

  assert.deepEqual(await submitContact(both, 'disabled'), { ok: false, reason: 'disabled' });
  assert.deepEqual(await submitContact({}, 'live'), { ok: false, reason: 'disabled' });

  const { impl, calls } = router(W3_OK, SB_OK);
  const info = console.info;
  console.info = () => {};
  try {
    assert.deepEqual(await submitContact(both, 'test', { fetchImpl: impl }), { ok: true, test: true });
  } finally {
    console.info = info;
  }
  assert.equal(calls.length, 0);
});
