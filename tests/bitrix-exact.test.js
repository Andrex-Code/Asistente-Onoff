const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { exactTcRecords, normalizeTc } = require('../lib/bitrix-tc');
const field = 'UF_CRM_1642606760058';

test('TC exacta conserva prefijos normalizados y distingue números y sufijos', () => {
  assert.equal(normalizeTc(' TC: 896-c '), '896-C');
  const rows = ['8968', '1896', '896-C', '896', 'TC896', '896-R', '', '00896'].map((tc, i) => ({ ID: String(i), [field]: tc }));
  rows.push({ ID: 'missing' }, { ID: 'title-only', TITLE: 'TC896' });
  assert.deepEqual(exactTcRecords(rows, field, '896').map(r => r.ID), ['3', '4']);
  assert.deepEqual(exactTcRecords(rows, field, '896-C').map(r => r.ID), ['2']);
  assert.deepEqual(exactTcRecords(rows, field, '89'), []);
  assert.deepEqual(exactTcRecords([{ item: { id: '1', ufCrm1642606760058: '896' } }], field, '896').map(r => r.id), ['1']);
});

function backend(file, response) {
  const calls = [], context = {
    module: { exports: {} }, URL, URLSearchParams, AbortController, setTimeout, clearTimeout,
    process: { env: { BITRIX_WEBHOOK_URL: 'https://bitrix.example/rest/test/' } },
    require: name => name.endsWith('bitrix-tc') ? require('../lib/bitrix-tc') : { lookupAfacturar: async () => null },
    fetch: async (url, options) => { calls.push({ url, body: options.body }); return { ok: true, json: async () => ({ result: response(url) }) }; }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
  return { context, calls };
}

test('deal endpoint verifies exact TC before limiting and enriching records', async () => {
  const h = backend('api/bitrix/search-deal.js', url => url.includes('crm.deal.list')
    ? [...Array.from({ length: 15 }, (_, i) => ({ ID: String(i + 1), [field]: '896' + i })), { ID: 'exact', [field]: '896' }]
    : []);
  // Exercise a single exact result after more than ten similar records.
  h.context.fetch = async (url, options) => {
    h.calls.push({ url, body: options.body });
    return { ok: true, json: async () => ({ result: url.includes('crm.deal.list')
      ? [...Array.from({ length: 15 }, (_, i) => ({ ID: String(i), [field]: '1896' + i })), { ID: '14008', [field]: '896' }]
      : [] }) };
  };
  let payload, status;
  const res = { setHeader() {}, status(value) { status = value; return this; }, json(value) { payload = value; }, end() {} };
  await h.context.module.exports({ method: 'POST', body: { tc: '896' } }, res);
  assert.equal(status, 200); assert.equal(payload.deals.length, 1); assert.equal(payload.deals[0].id, '14008');
  assert.equal(h.calls[0].body.get(`filter[=${field}]`), '896');
});

test('deal fallback and task bindings both discard similar TC records', async () => {
  for (const file of ['api/bitrix/search-deal.js', 'lib/client-tasks-legacy.js']) {
    const h = backend(file, url => url.includes('crm.deal.list') ? [{ ID: 'wrong', [field]: '8968' }]
      : { items: [{ id: 'right', ufCrm1642606760058: '896' }, { id: 'wrong2', [field]: '896-C' }] });
    const result = await vm.runInNewContext('findDeals("https://bitrix.example/", "' + field + '", "896")', h.context);
    assert.equal(result.length, 1); assert.equal(result[0].id, 'right');
    assert.equal(h.calls.length, 2);
    for (const call of h.calls) assert.equal(call.body.get(`filter[=${field}]`), '896');
  }
});
