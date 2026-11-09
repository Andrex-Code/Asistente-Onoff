const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function harness() {
  let listener;
  const calls = [], state = { active: 7, closes: 0 };
  const chrome = {
    runtime: { id: 'extension', onMessage: { addListener: fn => { listener = fn; } }, getURL: value => 'chrome-extension://extension/' + value,
      getContexts: async () => [], sendMessage: async message => {
        calls.push(message.type);
        if (state.pending) await state.pending;
        return { ok: true, text: 'TC 8968', codes: [{ value: '896812345678' }] };
      } },
    tabs: { query: async () => [{ id: state.active }], captureVisibleTab: async () => { calls.push('capture'); if (state.changed) state.active = 9; return 'data:image/png;base64,AAAA'; } },
    offscreen: { createDocument: async () => calls.push('create'), closeDocument: async () => { state.closes++; } }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/scan-transport.js'), 'utf8'), { chrome, Date, setTimeout, clearTimeout });
  const sender = { id: 'extension', tab: { id: 7, windowId: 1 }, frameId: 0, url: 'https://example.com' };
  const send = (type, extra = {}, caller = sender) => new Promise(resolve => listener({ type, ...extra }, caller, resolve));
  return { send, state, calls, sender };
}

test('capture rejects external senders, child frames, browser pages and inactive tabs', async () => {
  const h = harness();
  for (const change of [{ id: 'other' }, { frameId: 1 }, { tab: undefined }, { url: 'chrome://settings' }]) {
    assert.equal((await h.send('ONOFF_SCAN_CAPTURE', {}, { ...h.sender, ...change })).ok, false);
  }
  h.state.active = 8;
  assert.equal((await h.send('ONOFF_SCAN_CAPTURE')).ok, false);
  assert.deepEqual(h.calls, []);
  h.state.active = 7; h.state.changed = true;
  assert.equal((await h.send('ONOFF_SCAN_CAPTURE')).ok, false);
});

test('only a fresh capture permits one bounded local read, which closes the offscreen document', async () => {
  const h = harness(), image = 'data:image/png;base64,AAAA';
  assert.equal((await h.send('ONOFF_SCAN_READ', { image })).ok, false);
  await h.send('ONOFF_SCAN_CAPTURE');
  for (const input of ['https://remote.example/image.png', 'data:text/html;base64,AAAA', 'data:image/png;base64,' + 'A'.repeat(12000001)]) {
    assert.equal((await h.send('ONOFF_SCAN_READ', { image: input })).ok, false);
  }
  const result = await h.send('ONOFF_SCAN_READ', { image });
  assert.equal(result.text, 'TC 8968');
  assert.equal(h.state.closes, 1);
  assert.equal((await h.send('ONOFF_SCAN_READ', { image })).ok, false);
  assert.deepEqual(h.calls, ['capture', 'create', 'ONOFF_SCAN_PROCESS']);
});

test('cancel invalidates capture and concurrent reads do not start a second engine', async () => {
  const h = harness(), image = 'data:image/png;base64,AAAA';
  await h.send('ONOFF_SCAN_CAPTURE'); await h.send('ONOFF_SCAN_CANCEL');
  assert.equal((await h.send('ONOFF_SCAN_READ', { image })).ok, false);
  await h.send('ONOFF_SCAN_CAPTURE');
  let release; h.state.pending = new Promise(resolve => { release = resolve; });
  const running = h.send('ONOFF_SCAN_READ', { image });
  await h.send('ONOFF_SCAN_CAPTURE');
  assert.equal((await h.send('ONOFF_SCAN_READ', { image })).ok, false);
  release(); assert.equal((await running).ok, true);
  assert.equal(h.calls.filter(call => call === 'create').length, 1);
});
