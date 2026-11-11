const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const { installProbe } = require('../src/ikono-close-probe.cjs');
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(origin = 'https://onoff.a.ikono.im') {
  const { window } = parseHTML('<html><body><button aria-label="Resolver chat"></button></body></html>');
  window.location = { origin };
  const events = [];
  return { window, events, start: () => installProbe(window, { enabled: true, onEvent: e => events.push(e) }) };
}
test('disabled by default and outside authorized origin', () => {
  const { window, events } = setup('https://example.org');
  installProbe(window, { onEvent: e => events.push(e) });
  installProbe(window, { enabled: true, onEvent: e => events.push(e) });
  window.document.querySelector('button').click();
  assert.deepEqual(events, []);
});
test('observes opening, dependent field and cancellation without preventing clicks or leaking content', async () => {
  const { window, events, start } = setup();
  const stop = start();
  const doc = window.document;
  const click = new window.Event('click', { bubbles: true, cancelable: true });
  doc.querySelector('button').dispatchEvent(click);
  assert.equal(click.defaultPrevented, false);
  const modal = doc.createElement('div');
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-label', 'Resolver conversación');
  modal.innerHTML = '<p>PRIVATE PHONE CHAT</p><input role="combobox" value="PRIVATE SEARCH"><button>Cancelar</button><button>Resolver conversación</button>';
  doc.body.append(modal); await tick();
  const field = doc.createElement('input'); field.setAttribute('role', 'combobox'); modal.append(field); await tick();
  modal.querySelector('button').click(); modal.remove(); await tick();
  assert.ok(events.some(e => e.type === 'open-requested'));
  assert.ok(events.some(e => e.type === 'dialog-opened'));
  assert.ok(events.some(e => e.fields?.length === 2));
  assert.ok(events.some(e => e.type === 'cancel-requested'));
  assert.ok(events.some(e => e.type === 'dialog-disappeared'));
  assert.ok(!events.some(e => e.type === 'resolution-requested'));
  assert.ok(!JSON.stringify(events).includes('PRIVATE'));
  stop(); const count = events.length; doc.querySelector('button').click(); await tick();
  assert.equal(events.length, count);
});
test('resolution click is intent only, and cleanup is idempotent', async () => {
  const { window, events, start } = setup(); const stop = start();
  const modal = window.document.createElement('div'); modal.setAttribute('role','dialog'); modal.setAttribute('aria-label','Resolver conversación');
  modal.innerHTML = '<button>Resolver conversación sin mensaje</button>';
  window.document.body.append(modal); await tick(); modal.querySelector('button').click();
  assert.deepEqual(events.at(-1), {type:'resolution-requested',session:1,withoutMessage:true});
  stop(); stop();
});
