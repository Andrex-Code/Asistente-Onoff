'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStore } = require('../src/ikono-close-session.js');

const start = (store, id = 'room-test-1') => store.start({ conversationId: id, messageCount: 3 });

test('inicia sin revelar mensajes ni datos personales', () => {
  const store = createStore();
  const state = start(store);
  assert.equal(state.status, 'capturing');
  assert.equal(state.messageCount, 3);
  assert.equal(state.coverage, 'unknown');
  assert.equal(state.summary, '');
});

test('el orden resumen -> tipificación -> confirmación deja la sesión lista', () => {
  const store = createStore();
  start(store);
  store.setSummary({ conversationId: 'room-test-1', summary: 'Se brindó orientación.' });
  store.classify({ conversationId: 'room-test-1', category: 'ACTUALIZACIÓN DE DATOS', detail: 'FECHA DE EXPEDICIÓN' });
  assert.equal(store.confirm({ conversationId: 'room-test-1' }).status, 'ready');
});

test('el orden confirmación -> resumen espera sin enviar información incompleta', () => {
  const store = createStore();
  start(store);
  store.classify({ conversationId: 'room-test-1', category: 'ACTUALIZACIÓN DE DATOS', detail: 'CÉDULA' });
  assert.equal(store.confirm({ conversationId: 'room-test-1' }).status, 'waiting_summary');
  assert.equal(store.beginSubmit({ conversationId: 'room-test-1' }), false);
  assert.equal(store.setSummary({ conversationId: 'room-test-1', summary: 'Cliente orientado.' }).status, 'ready');
});

test('impide confirmar sin tipificación y detalle', () => {
  const store = createStore();
  start(store);
  assert.throws(() => store.confirm({ conversationId: 'room-test-1' }), /tipificación/i);
  assert.throws(() => store.classify({ conversationId: 'room-test-1', category: 'BLOQUEO', detail: '' }), /Detalle/);
});

test('no permite dos envíos simultáneos ni reenvío después de éxito', () => {
  const store = createStore();
  start(store);
  store.classify({ conversationId: 'room-test-1', category: 'CARTERA', detail: 'PAGOS' });
  store.setSummary({ conversationId: 'room-test-1', summary: 'Caso resuelto.' });
  store.confirm({ conversationId: 'room-test-1' });
  assert.equal(store.beginSubmit({ conversationId: 'room-test-1' }), true);
  assert.equal(store.beginSubmit({ conversationId: 'room-test-1' }), false);
  assert.equal(store.succeed({ conversationId: 'room-test-1', taskId: '1001' }).status, 'submitted');
  assert.equal(store.beginSubmit({ conversationId: 'room-test-1' }), false);
});

test('permite reintento controlado luego de fallar una solicitud', () => {
  const store = createStore();
  start(store);
  store.classify({ conversationId: 'room-test-1', category: 'ESTADO DE SOLICITUD', detail: 'CONSULTA' });
  store.setSummary({ conversationId: 'room-test-1', summary: 'Se informó estado.' });
  store.confirm({ conversationId: 'room-test-1' });
  store.beginSubmit({ conversationId: 'room-test-1' });
  assert.equal(store.fail({ conversationId: 'room-test-1', message: 'Error de red.' }).status, 'error');
  assert.equal(store.beginSubmit({ conversationId: 'room-test-1' }), true);
});

test('aisla categorías y resúmenes por identificador de conversación', () => {
  const store = createStore();
  start(store, 'room-A');
  start(store, 'room-B');
  store.classify({ conversationId: 'room-A', category: 'BLOQUEO', detail: 'CUPO' });
  store.setSummary({ conversationId: 'room-A', summary: 'Caso A.' });
  assert.equal(store.get('room-B').classification.category, '');
  assert.equal(store.get('room-B').summary, '');
  assert.throws(() => store.confirm({ conversationId: 'room-B' }), /tipificación/);
});

test('no reinicia una sesión ante un doble clic en Resolver chat', () => {
  const store = createStore();
  start(store);
  store.setSummary({ conversationId: 'room-test-1', summary: 'Resumen original.' });
  const state = store.start({ conversationId: 'room-test-1', messageCount: 0 });
  assert.equal(state.summary, 'Resumen original.');
});

test('bloquea cambios de tipificación posteriores a la confirmación', () => {
  const store = createStore();
  start(store);
  store.classify({ conversationId: 'room-test-1', category: 'BLOQUEO', detail: 'CLIENTE' });
  store.confirm({ conversationId: 'room-test-1' });
  assert.throws(() => store.classify({ conversationId: 'room-test-1', category: 'OTRO', detail: 'CAMBIO' }), /bloqueada/);
});

test('limita sesiones en memoria para reducir persistencia de datos', () => {
  const store = createStore({ maxSessions: 1 });
  start(store, 'room-A');
  assert.throws(() => start(store, 'room-B'), /máximo/);
  store.clear('room-A');
  assert.equal(start(store, 'room-B').conversationId, 'room-B');
});

test('la copia expuesta al UI no permite cambiar el estado interno', () => {
  const store = createStore();
  const view = start(store);
  view.classification.category = 'ALTERADO';
  assert.equal(store.get('room-test-1').classification.category, '');
});
