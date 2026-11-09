const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/bitrix-transport.js'), 'utf8');

function harness() {
  let listener;
  const calls = [], settings = { backendUrl: 'https://backend.example.com/' };
  const state = { permission: true, status: 200, data: { ok: true, deals: [{ id: '14008', tc: '8968' }] } };
  vm.runInNewContext(source, { URL, AbortSignal, chrome: {
    runtime: { id: 'extension', onMessage: { addListener: fn => { listener = fn; } } },
    storage: { sync: { get: async () => settings } },
    permissions: { contains: async () => state.permission }
  }, fetch: async (url, options) => {
    calls.push({ url, ...options, body: JSON.parse(options.body) });
    if (state.failure) throw state.failure;
    return { ok: state.status < 400, status: state.status, json: async () => {
      if (state.html) throw new SyntaxError();
      return state.data;
    } };
  } });
  const send = (action = 'tc', value = '8968', id = 'extension') => new Promise(resolve => {
    listener({ type: 'ONOFF_BITRIX_REQUEST', action, value }, { id }, resolve);
  });
  return { calls, state, settings, send };
}

test('TC 8968 and all read-only searches use fixed routes and minimal payloads', async () => {
  const h = harness();
  assert.equal((await h.send()).deals[0].id, '14008');
  for (const [action, value, endpoint, field] of [
    ['tc', '8968', 'search-deal', 'tc'], ['tc', '6143-C', 'search-deal', 'tc'],
    ['identification', '123456', 'search-company', 'identification'],
    ['task', '505942', 'search-task', 'taskId'], ['tasks', '8968', 'search-client-tasks', 'tc']
  ]) {
    assert.equal((await h.send(action, value)).ok, true);
    const call = h.calls.at(-1);
    assert.equal(call.url, 'https://backend.example.com/api/bitrix/' + endpoint);
    assert.equal(JSON.stringify(call.body), JSON.stringify({ [field]: value }));
    assert.equal(call.method, 'POST');
    assert.ok(call.signal);
    assert.equal(call.redirect, 'error');
  }
});

test('rejects external senders, unsafe actions, invalid input, and unsafe backend URLs before fetch', async () => {
  const h = harness();
  assert.equal((await h.send('tc', '8968', 'other')).code, 'UNAUTHORIZED');
  for (const [action, value] of [['delete', '8968'], ['__proto__', '8968'], ['tc', '../8968'], ['identification', 'abc'], ['task', '12?x']]) {
    assert.equal((await h.send(action, value)).code, 'INVALID_INPUT');
  }
  for (const url of ['bad', 'http://remote.example.com', 'https://x.test/api', 'https://x.test/?key=secret', 'https://user:secret@x.test', 'https://x.test/#x']) {
    h.settings.backendUrl = url;
    assert.equal((await h.send()).code, 'BACKEND_URL');
  }
  assert.equal(h.calls.length, 0);
});

test('uses configured backend or default, and checks host permission', async () => {
  const h = harness();
  h.settings.backendUrl = '';
  await h.send();
  assert.equal(h.calls[0].url, 'https://asistente-onoff.vercel.app/api/bitrix/search-deal');
  h.settings.backendUrl = 'http://localhost:3000';
  await h.send();
  assert.match(h.calls[1].url, /^http:\/\/localhost:3000\//);
  h.state.permission = false;
  assert.equal((await h.send()).code, 'HOST_PERMISSION');
  assert.equal(h.calls.length, 2);
});

test('distinguishes network, timeout, access, endpoint, non-JSON, and Bitrix failures', async () => {
  for (const [state, code] of [
    [{ failure: new TypeError('Failed to fetch') }, 'BACKEND_NETWORK'],
    [{ failure: Object.assign(new Error(), { name: 'TimeoutError' }) }, 'TIMEOUT'],
    [{ status: 401, html: true }, 'BACKEND_ACCESS'], [{ status: 403 }, 'BACKEND_ACCESS'],
    [{ status: 404, html: true }, 'BACKEND_HTTP'],
    [{ status: 503, data: { ok: false, error: 'Bitrix sin configurar.' } }, 'BACKEND_HTTP'],
    [{ html: true }, 'BACKEND_RESPONSE'], [{ data: {} }, 'BACKEND_RESPONSE'],
    [{ data: { ok: false, error: 'Sin permisos CRM.' } }, 'BITRIX_ERROR']
  ]) {
    const h = harness(); Object.assign(h.state, state);
    const result = await h.send();
    assert.equal(result.ok, false); assert.equal(result.code, code); assert.ok(result.error);
    assert.doesNotMatch(result.error, /Failed to fetch/);
  }
});
