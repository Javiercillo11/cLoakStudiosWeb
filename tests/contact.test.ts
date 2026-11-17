import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload, clean, normalizeUrl, readValues, validate, type FieldSource } from '../src/lib/contact/schema.ts';
import { resolveMode, submitContact } from '../src/lib/contact/submit.ts';

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

test('resolveMode: nunca modo prueba en producción', () => {
  assert.equal(resolveMode('abc', false), 'live');
  assert.equal(resolveMode('', true), 'test');
  assert.equal(resolveMode(undefined, false), 'disabled');
  assert.equal(resolveMode('   ', false), 'disabled');
});

const fakeFetch = (status: number, body: unknown): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

test('submit: éxito solo con confirmación explícita del proveedor', async () => {
  assert.deepEqual(await submitContact({}, 'live', { fetchImpl: fakeFetch(200, { success: true }) }), { ok: true, test: false });
  const r = await submitContact({}, 'live', { fetchImpl: fakeFetch(200, { success: false, message: 'Invalid key' }) });
  assert.equal(r.ok, false);
  const r2 = await submitContact({}, 'live', { fetchImpl: fakeFetch(500, {}) });
  assert.equal(r2.ok, false);
});

test('submit: error de red, timeout y modo desactivado', async () => {
  const failing = (async () => {
    throw new TypeError('Failed to fetch');
  }) as typeof fetch;
  assert.deepEqual(await submitContact({}, 'live', { fetchImpl: failing }), { ok: false, reason: 'network' });

  const hanging = ((_u: unknown, init?: RequestInit) =>
    new Promise((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })) as typeof fetch;
  assert.deepEqual(await submitContact({}, 'live', { fetchImpl: hanging, timeoutMs: 10 }), { ok: false, reason: 'timeout' });

  assert.deepEqual(await submitContact({}, 'disabled'), { ok: false, reason: 'disabled' });
});
