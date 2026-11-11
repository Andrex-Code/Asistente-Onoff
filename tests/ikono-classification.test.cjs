const {test} = require('node:test');
const assert = require('node:assert/strict');
const {parseHTML} = require('linkedom');
const {readClassification} = require('../src/ikono-classification.cjs');
const {installProbe} = require('../src/ikono-close-probe.cjs');
function fixture() {
  const {window} = parseHTML('<html><body><div role="dialog" aria-label="Resolver conversación"><div><label>Tipificación</label><div class="mx_DropdownTypification"><div class="select__single-value">ASESORIA</div><input role="combobox" value="PRIVATE SEARCH"></div></div><label>Detalle de la tipificación</label><div class="mx_DropdownTypification"><div class="select__single-value">CONTACTO COMERCIAL</div><input role="combobox"></div><textarea>PRIVATE OBSERVATION</textarea><button>Resolver conversación</button></div></body></html>');
  window.location = {origin:'https://onoff.a.ikono.im'};
  return {window,dialog:window.document.querySelector('[role="dialog"]')};
}
test('reads selected DOM labels, ignoring search and observations', () => {
  const {dialog}=fixture();
  assert.deepEqual(readClassification(dialog),{status:'selected',category:'ASESORIA',detail:'CONTACTO COMERCIAL'});
});
test('empty dependent field never reuses previous selection', () => {
  const {dialog}=fixture(); readClassification(dialog);
  const values=dialog.querySelectorAll('.select__single-value'); values[0].textContent='CARTERA';values[1].remove();
  assert.deepEqual(readClassification(dialog),{status:'incomplete',category:'CARTERA',detail:''});
});
test('unknown structure fails closed rather than trusting order or input', () => {
  const {dialog}=fixture();dialog.querySelector('label').textContent='Changed UI';
  assert.equal(readClassification(dialog).status,'unknown');
  dialog.querySelector('label').textContent='Tipificación';
  dialog.querySelector('.mx_DropdownTypification').innerHTML+='<div class="select__single-value">Ambiguous</div>';
  assert.equal(readClassification(dialog).status,'unknown');
});
test('third classification level is rejected rather than silently discarded', () => {
  const {dialog}=fixture();
  const extra=dialog.ownerDocument.createElement('div');extra.className='mx_DropdownTypification';
  extra.innerHTML='<div class="select__single-value">TERCER NIVEL</div><input role="combobox">';dialog.append(extra);
  assert.deepEqual(readClassification(dialog),{status:'unknown',category:'',detail:''});
});
test('a partial dependent mount does not produce a falsely selected classification', () => {
  const {dialog}=fixture();
  dialog.querySelectorAll('[role="combobox"]')[1].remove();
  assert.deepEqual(readClassification(dialog),{status:'unknown',category:'',detail:''});
});
test('observes text changes and dialog removal', async () => {
  const {window,dialog}=fixture();const events=[];
  const stop=installProbe(window,{enabled:true,readClassification,onEvent:event=>events.push(event)});
  dialog.querySelector('.select__single-value').textContent='CARTERA';
  dialog.querySelectorAll('.select__single-value')[1].remove();
  await new Promise(resolve=>setImmediate(resolve));
  const button=dialog.querySelector('button');button.click();dialog.remove();
  const changes=events.filter(e=>e.type==='classification-observed');
  assert.equal(changes.at(-1).classification.category,'CARTERA');
  assert.equal(changes.at(-1).classification.detail,'');
  assert.equal(events.at(-1).type,'resolution-requested');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(events.at(-1).type,'dialog-disappeared');
  assert.ok(!JSON.stringify(events).includes('PRIVATE'));
  stop();
});
test('no selection emitted on a different origin and enabled false', () => {
  const {window}=fixture();const events=[];
  installProbe(window,{readClassification,onEvent:e=>events.push(e)});
  window.location.origin='https://example.com';
  installProbe(window,{enabled:true,readClassification,onEvent:e=>events.push(e)});
  window.document.querySelector('button').click();assert.deepEqual(events,[]);
});

