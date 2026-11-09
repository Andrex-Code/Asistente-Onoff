const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeCompany, loadPlans } = require('../lib/bitrix-deal-details');

test('company details preserve identification, phone/email arrays and the verified company link', () => {
  const company = normalizeCompany({ ID: '42', TITLE: 'Compañía de prueba', UF_CRM_1599251398: '001234567-8',
    PHONE: [{ VALUE: '+57 300 000 0000' }, { VALUE: '+57 300 000 0000' }, { VALUE: '+57 601 0000000' }],
    EMAIL: [{ VALUE: 'contacto@example.com' }, { VALUE: '' }] }, '42', 'https://bitrix.example', 'UF_CRM_1599251398');
  assert.equal(company.identification, '001234567-8');
  assert.deepEqual(company.phones, ['+57 300 000 0000', '+57 601 0000000']);
  assert.deepEqual(company.emails, ['contacto@example.com']);
  assert.equal(company.url, 'https://bitrix.example/crm/company/details/42/');
  assert.throws(() => normalizeCompany({ ID: '43' }, '42', 'https://bitrix.example', 'UF_CRM_1599251398'));
});

test('company camelCase fields work without manufacturing missing contact details', () => {
  const company = normalizeCompany({ id: 42, title: 'Persona natural', ufCrm1599251398: '00012345' }, '42', 'https://bitrix.example', 'UF_CRM_1599251398');
  assert.equal(company.identification, '00012345');
  assert.deepEqual(company.phones, []); assert.deepEqual(company.emails, []);
});

test('plan comes from the exact deal product rows, never from a product catalog guess', async () => {
  const calls = [];
  const plans = await loadPlans(async (url, method, params) => {
    calls.push({ method, id: params.id });
    return [{ OWNER_ID: '12', OWNER_TYPE: 'D', PRODUCT_NAME: 'Servicio anual contratado' }, { OWNER_ID: '12', PRODUCT_NAME: 'Equipo POS' }];
  }, 'https://bitrix.example/', [{ ID: '12' }, { ID: '12' }]);
  assert.deepEqual(calls, [{ method: 'crm.deal.productrows.get', id: '12' }]);
  assert.deepEqual(plans.get('12').items, ['Servicio anual contratado', 'Equipo POS']);
});

test('empty products, permissions errors, malformed rows and another deal have distinct safe states', async () => {
  for (const [result, status] of [[[], 'empty'], [null, 'unavailable'], [[{ PRODUCT_NAME: 'Wrong', OWNER_ID: '99' }], 'unavailable'], [[{ PRODUCT_NAME: '' }], 'unavailable']]) {
    const plans = await loadPlans(async () => result, 'https://bitrix.example/', [{ ID: '12' }]);
    assert.equal(plans.get('12').status, status);
  }
  const plans = await loadPlans(async () => { throw Error('Access denied'); }, 'https://bitrix.example/', [{ ID: '12' }]);
  assert.equal(plans.get('12').status, 'unavailable');
});

test('product requests are deduplicated, bounded and do not hide truncation', async () => {
  let active = 0, max = 0;
  const plans = await loadPlans(async () => {
    active++; max = Math.max(max, active); await new Promise(resolve => setTimeout(resolve, 3)); active--;
    return Array.from({ length: 51 }, (_, i) => ({ PRODUCT_NAME: 'Producto ' + i }));
  }, 'https://bitrix.example/', Array.from({ length: 7 }, (_, i) => ({ ID: String(i + 1) })));
  assert.equal(max, 3); assert.equal(plans.get('1').items.length, 50); assert.equal(plans.get('1').hasMore, true);
});
