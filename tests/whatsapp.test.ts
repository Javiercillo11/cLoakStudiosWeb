import { test } from 'node:test';
import assert from 'node:assert/strict';
import { whatsappNumber, whatsappUrl } from '../src/lib/whatsapp.ts';

test('el número queda solo con dígitos', () => {
  assert.equal(whatsappNumber('+34 678 49 49 55'), '34678494955');
  assert.equal(whatsappNumber('(34) 678-494-955'), '34678494955');
});

test('números vacíos o imposibles no generan enlace', () => {
  assert.equal(whatsappNumber(null), null);
  assert.equal(whatsappNumber(''), null);
  assert.equal(whatsappNumber('123'), null);
  assert.equal(whatsappUrl(null, 'Hola'), null);
});

test('el mensaje se codifica en la URL', () => {
  assert.equal(
    whatsappUrl('34678494955', 'Hola, quería pedir información'),
    'https://wa.me/34678494955?text=Hola%2C%20quer%C3%ADa%20pedir%20informaci%C3%B3n',
  );
});

test('sin mensaje no se añade ?text', () => {
  assert.equal(whatsappUrl('34678494955', '  '), 'https://wa.me/34678494955');
});
