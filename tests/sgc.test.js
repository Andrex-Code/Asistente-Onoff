'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { parseHTML } = require('linkedom');
const fixture = require('./fixtures/sgc.cjs');
const readerPromise = import('../src/sgc-reader.mjs').then(module => module.readSgcCustomer);

async function lookup(pages = {}, identification = '12345678', origin = 'https://sgc.yadinero.co') {
  const calls = [];
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  const reader = await readerPromise;
  const context = vm.createContext({ URL, URLSearchParams, AbortController, setTimeout, clearTimeout, location: { origin }, document,
    fetch: async (url, options) => {
      calls.push({ url, options });
      const pathname = new URL(url).pathname;
      const response = pages[pathname] ?? ({ '/customers': fixture.list(), '/customers/show/101': fixture.detail(), '/requests/edit/200': fixture.request() })[pathname];
      if (response instanceof Error) throw response;
      if (typeof response === 'object') return { url, ...response };
      assert.equal(typeof response, 'string', 'Unexpected route: ' + pathname);
      return { ok: true, status: 200, url, text: async () => response };
    }
  });
  const result = await vm.runInContext(`(${reader.toString()})`, context)(identification);
  return { result: JSON.parse(JSON.stringify(result)), calls };
}

test('SGC exact lookup reads only three GET views and returns selected fields', async () => {
  const { result, calls } = await lookup({ '/customers': fixture.list(fixture.listRow('123456789') + fixture.listRow()) });
  assert.equal(result.ok, true);
  assert.equal(result.customer.name, 'Cliente de prueba');
  assert.deepEqual(result.customer.blocks, ['Bloqueo Fianza']);
  assert.equal(result.customer.category, 'Turquesa');
  assert.equal(result.customer.profile, 'D');
  assert.equal(result.customer.state, 'Habilitado');
  assert.equal(result.latestRequest.status, 'RECHAZADO');
  assert.equal(result.latestRequest.totalToPay, 'COP 185,074');
  assert.equal(result.latestRequest.typification, 'Rechazo por intentos de firma Auco');
  assert.equal(result.latestRequest.history.length, 6);
  assert.equal(result.latestRequest.history[0].description, 'Auco respuesta: IDENTITY_GUARD_BLOCKED');
  assert.equal(result.latestRequest.detailsAvailable, true);
  assert.equal(result.creditsAvailable, true);
  assert.equal(result.warning, null);
  assert.equal(calls.length, 3);
  assert.deepEqual(result.timing.stages.map(step => step.stage), ['cliente', 'ficha', 'solicitud']);
  assert.equal(result.timing.stages.length, calls.length);
  assert.ok(result.timing.totalMs >= 0);
  for (const step of result.timing.stages) {
    assert.ok(step.downloadMs >= 0 && step.parseMs >= 0 && step.htmlChars > 0);
    assert.equal(Object.hasOwn(step, 'identification'), false);
    assert.equal(Object.hasOwn(step, 'url'), false);
  }
  const search = new URL(calls[0].url);
  assert.equal(search.searchParams.get('filter'), '12345678');
  for (const { url, options } of calls) {
    assert.equal(new URL(url).origin, 'https://sgc.yadinero.co');
    assert.equal(options.method, 'GET');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.redirect, 'error');
    assert.equal(options.cache, 'no-store');
  }
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_|SECRET_|Score Cifin|_token|must never execute/);
});

test('SGC does not treat partial document matches as the requested customer', async () => {
  const { result, calls } = await lookup({ '/customers': fixture.list(fixture.listRow('123456789')) });
  assert.equal(result.ok, true); assert.equal(result.customer, null); assert.equal(calls.length, 1);
});

test('SGC rejects ambiguous customers and untrusted customer links', async () => {
  const duplicate = await lookup({ '/customers': fixture.list(fixture.listRow() + fixture.listRow('12345678', 'Otro registro', '102')) });
  assert.equal(duplicate.result.code, 'SGC_AMBIGUOUS'); assert.equal(duplicate.calls.length, 1);
  const unsafe = await lookup({ '/customers': fixture.list().replace('href="/customers/show/101"', 'href="https://evil.example/customers/show/101"') });
  assert.equal(unsafe.result.code, 'SGC_FORBIDDEN'); assert.equal(unsafe.calls.length, 1);
});

test('SGC rejects invalid inputs, wrong origin, login pages and permission errors', async () => {
  for (const value of ['1234', 'abc12345', '12345&export=1', '1234567890123456']) {
    const { result, calls } = await lookup({}, value);
    assert.equal(result.code, 'SGC_INVALID_REQUEST'); assert.equal(calls.length, 0);
  }
  assert.equal((await lookup({}, '12345678', 'https://evil.example')).calls.length, 0);
  const session = await lookup({ '/customers': '<html><body><form><input type="password"></form></body></html>' });
  assert.equal(session.result.code, 'SGC_SESSION_REQUIRED');
  const forbidden = await lookup({ '/customers': { ok: false, status: 403 } });
  assert.equal(forbidden.result.code, 'SGC_FORBIDDEN'); assert.equal(forbidden.calls.length, 1);
  const redirect = await lookup({ '/customers': new TypeError('Failed to fetch') });
  assert.equal(redirect.result.code, 'SGC_CONNECTION');
});

test('SGC selects the latest request by date and ID and bounds returned rows', async () => {
  const rows = fixture.requestRow('300', 'Oct 10, 2026') + fixture.requestRow('199', 'Oct 14, 2026') + fixture.requestRow('200', 'Oct 14, 2026') + Array.from({ length: 5 }, (_, i) => fixture.requestRow(String(100 + i), 'Oct 01, 2026')).join('');
  const { result, calls } = await lookup({ '/customers/show/101': fixture.detail(rows, '<tr><td>900</td><td>185,074</td><td>80,000</td><td>Oct 14, 2026</td><td></td></tr>') });
  assert.equal(result.latestRequest.id, '200');
  assert.equal(result.requests.length, 5); assert.equal(result.moreRequests, true);
  assert.equal(result.credits[0].balance, '80,000');
  assert.equal(new URL(calls[2].url).pathname, '/requests/edit/200');
});

test('SGC distinguishes incomplete detail from an empty credit or request list', async () => {
  const incomplete = await lookup({ '/customers/show/101': { ok: false, status: 403 } });
  assert.equal(incomplete.result.ok, true); assert.equal(incomplete.result.customer.id, '101');
  assert.equal(incomplete.result.warningCode, 'SGC_FORBIDDEN'); assert.notEqual(incomplete.result.creditsAvailable, true);
  const empty = await lookup({ '/customers/show/101': fixture.detail('') });
  assert.equal(empty.result.latestRequest, null); assert.equal(empty.result.warning, null); assert.equal(empty.calls.length, 2);
  const detailMissing = await lookup({ '/requests/edit/200': { ok: false, status: 403 } });
  assert.equal(detailMissing.result.latestRequest.detailsAvailable, false); assert.equal(detailMissing.result.warningCode, 'SGC_FORBIDDEN');
});

test('SGC suppresses requests whose customer ownership cannot be confirmed', async () => {
  for (const html of [fixture.request('102'), fixture.request('101', '87654321')]) {
    const { result } = await lookup({ '/requests/edit/200': html });
    assert.equal(result.warningCode, 'SGC_CUSTOMER_MISMATCH');
    assert.equal(result.latestRequest, null); assert.deepEqual(result.requests, []);
  }
  const wrongCustomer = await lookup({ '/customers/show/101': fixture.detail().replace('CC-12345678', 'CC-87654321') });
  assert.equal(wrongCustomer.result.warningCode, 'SGC_CUSTOMER_MISMATCH');
  assert.equal(wrongCustomer.result.creditsAvailable, undefined); assert.equal(wrongCustomer.calls.length, 2);
});

function transportHarness(tabs = [{ id: 2, url: 'https://sgc.yadinero.co/dashboard', windowId: 1, incognito: false }]) {
  let listener, account = 'asesor@onoff.com.co', readResult = {
    ok: true, customer: { id: '101', identification: '12345678', name: 'Cliente de prueba' },
    latestRequest: { id: '200' }, warning: null, checkedAt: new Date().toISOString()
  };
  const calls = [], events = {}, saved = {};
  const readerStub = async () => {};
  const chrome = {
    runtime: { id: 'extension-id', onMessage: { addListener: fn => { listener = fn; } } },
    tabs: {
      query: async query => { calls.push({ query }); return tabs; },
      onUpdated: { addListener: fn => { events.updated = fn; } },
      onRemoved: { addListener: fn => { events.removed = fn; } }
    },
    storage: { session: {
      get: async key => ({ [key]: saved[key] }),
      set: async obj => { Object.assign(saved, obj); },
      remove: async key => { delete saved[key]; }
    } },
    scripting: { executeScript: async options => {
      calls.push({ options });
      return [{ frameId: 0, result: options.args ? readResult : account }];
    } }
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/sgc-transport.js'), 'utf8').replace(/^import .*;\r?\n/, '');
  vm.runInNewContext(source, { chrome, URL, readSgcCustomer: readerStub });
  const defaultSender = { id: 'extension-id', url: 'https://onoff.a.ikono.im/#/room/qa', frameId: 0, tab: { id: 1, windowId: 1, incognito: false } };
  const send = (identification = 'CC 12.345.678', sender = defaultSender, options = {}) =>
    new Promise(resolve => listener({ type: options.type || 'ONOFF_SEARCH_SGC', identification, force: options.force === true, url: 'https://evil.example' }, sender, resolve));
  return { send, calls, chrome, events, saved, setAccount: value => { account = value; }, setReadResult: value => { readResult = value; } };
}

test('SGC transport validates session identity and reads SGC in isolated world', async () => {
  const h = transportHarness();
  assert.equal((await h.send()).ok, true);
  assert.equal(h.calls[0].query.url, 'https://sgc.yadinero.co/*');
  const probe = h.calls[1].options;
  const lookup = h.calls[2].options;
  assert.equal(probe.target.tabId, 2); assert.equal(probe.world, 'ISOLATED');
  assert.equal(lookup.target.tabId, 2); assert.equal(lookup.world, 'ISOLATED');
  assert.deepEqual(Array.from(lookup.args), ['12345678']);
  assert.deepEqual(Array.from(lookup.target.frameIds), [0]);
  assert.equal(h.calls.length, 3);
});

test('SGC transport rejects other senders, frames, invalid IDs and missing sessions', async () => {
  const h = transportHarness();
  assert.equal((await h.send('12345678', { id: 'other', frameId: 0, tab: { id: 1 } })).code, 'SGC_UNAUTHORIZED');
  assert.equal((await h.send('12345678', { id: 'extension-id', frameId: 1, tab: { id: 1 } })).code, 'SGC_UNAUTHORIZED');
  for (const url of ['https://evil.example', 'https://onoff.a.ikono.im.evil.example', 'https://sgc.yadinero.co.evil.example', 'not-a-url'])
    assert.equal((await h.send('12345678', { id: 'extension-id', url, frameId: 0, tab: { id: 1 } })).code, 'SGC_UNTRUSTED_PAGE');
  for (const id of ['1234', 'hello12345678', '<script>12345</script>', '12345678?x=1', '1'.repeat(41), {}])
    assert.equal((await h.send(id)).code, 'SGC_INVALID_IDENTIFICATION');
  assert.equal(h.calls.length, 0);
  for (const tabs of [[], [{ id: 2, url: 'https://sgc.yadinero.co/login' }], [{ id: 2, url: 'https://evil.example/' }], [{ id: 2, url: 'https://sgc.yadinero.co/dashboard', incognito: true }]]) {
    const missing = transportHarness(tabs);
    assert.equal((await missing.send()).code, 'SGC_SESSION_REQUIRED');
    assert.equal(missing.calls.length, 1);
  }
});

test('SGC cache reuses complete results, supports force refresh and explicit forgetting', async () => {
  const h = transportHarness();
  const first = await h.send();
  assert.equal(first.clientCache, false);
  assert.equal(h.calls.length, 3);
  const cached = await h.send();
  assert.equal(cached.clientCache, true);
  assert.equal(cached.checkedAt, first.checkedAt);
  assert.equal(h.calls.length, 5, 'The cached hit checks the tab and account but skips the reader.');
  const fresh = await h.send(undefined, undefined, { force: true });
  assert.equal(fresh.clientCache, false);
  assert.equal(h.calls.length, 8);
  assert.equal((await h.send(undefined, undefined, { type: 'ONOFF_SGC_FORGET' })).ok, true);
  const afterForget = await h.send();
  assert.equal(afterForget.clientCache, false);
  assert.equal(h.calls.length, 11);
  assert.equal(Object.keys(h.saved).every(k => /onoffSgcCustomerCache/.test(k)), true);
});

test('SGC cache is scoped to account and invalidated on SGC navigation', async () => {
  const h = transportHarness();
  await h.send();
  h.setAccount('otra-cuenta@onoff.com.co');
  assert.equal((await h.send()).clientCache, false);
  assert.equal((await h.send()).clientCache, true);
  h.events.updated(2, { status: 'loading', url: 'https://sgc.yadinero.co/customers' }, { url: 'https://sgc.yadinero.co/customers' });
  // Event cleanup uses asynchronous storage operations.
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await h.send()).clientCache, false);
  h.events.updated(2, { status: 'loading', url: 'https://sgc.yadinero.co/logout' }, { url: 'https://sgc.yadinero.co/logout' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await h.send()).clientCache, false);
});

test('SGC never caches partial, missing or unauthorized data', async () => {
  const h = transportHarness();
  h.setReadResult({ ok: true, customer: null });
  await h.send(); await h.send();
  assert.equal(h.calls.filter(x => x.options?.args).length, 2);
  h.setReadResult({ ok: true, customer: { id: '101' }, warning: 'Incomplete' });
  await h.send(); await h.send();
  assert.equal(h.calls.filter(x => x.options?.args).length, 4);
  h.setReadResult({ ok: false, code: 'SGC_FORBIDDEN' });
  await h.send(); await h.send();
  assert.equal(h.calls.filter(x => x.options?.args).length, 6);
  h.setAccount(null);
  h.setReadResult({ ok: true, customer: { id: '101' } });
  await h.send(); await h.send();
  assert.equal(h.calls.filter(x => x.options?.args).length, 8);
});

test('SGC bounds concurrent lookups and releases lock after failure', async () => {
  const h = transportHarness();
  let release;
  const underlying = h.chrome.scripting.executeScript;
  h.chrome.scripting.executeScript = options => {
    if (!options.args) return underlying(options);
    h.calls.push({ options });
    return new Promise(resolve => { release = resolve; });
  };
  const pending = h.send();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await h.send('87654321')).code, 'SGC_BUSY');
  release([{ frameId: 0, result: { ok: true, customer: null } }]);
  await pending;
  h.chrome.scripting.executeScript = async options => {
    if (!options.args) return underlying(options);
    throw new Error('Tab closed');
  };
  assert.equal((await h.send()).code, 'SGC_CONNECTION');
  h.chrome.scripting.executeScript = async options => {
    if (!options.args) return underlying(options);
    return [];
  };
  assert.equal((await h.send()).code, 'SGC_TAB_CLOSED');
});
