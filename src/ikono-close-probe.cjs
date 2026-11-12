/* Test-only passive DOM probe. No network, chat text, room IDs or storage. */
function installProbe(win, { enabled = false, onEvent = () => {}, readClassification } = {}) {
  if (!enabled || !['https://onoff.a.ikono.im','https://onoff.s.ikono.im'].includes(win.location.origin)) return () => {};
  const doc = win.document;
  let stopped = false;
  let previous = null;
  let dialog = null;
  let serial = 0;
  let classification = '';
  let readyDialog = null;
  let stableRect = '';
  let frame = null;
  const schedule = win.requestAnimationFrame?.bind(win);
  function checkReady() {
    frame = null;
    if (stopped || !dialog || !schedule || readyDialog === dialog) return;
    const cancel = [...dialog.querySelectorAll('button')].find(el => el.textContent.trim() === 'Cancelar');
    const field = dialog.querySelector('[role="combobox"]');
    const rect = cancel?.getBoundingClientRect();
    const visible = rect && rect.width > 0 && rect.height > 0 && !cancel.disabled && field;
    const signature = visible ? [rect.x, rect.y, rect.width, rect.height].join(',') : '';
    if (signature && signature === stableRect) { readyDialog = dialog; emit('dialog-ready'); return; }
    stableRect = signature;
    frame = schedule(checkReady);
  }
  const emit = (type, extra = {}) => {
    if (!stopped) { try { onEvent({ type, session: serial, ...extra }); } catch {} }
  };
  function inspect() {
    if (stopped) return;
    const matches = [...doc.querySelectorAll('[role="dialog"]')].filter(el => {
      const title = doc.getElementById(el.getAttribute('aria-labelledby'));
      return (el.getAttribute('aria-label') || title?.textContent || '').trim() === 'Resolver conversación';
    });
    const next = matches.length === 1 ? matches[0] : null;
    if (next !== dialog) {
      if (dialog) emit('dialog-disappeared'); // Never infer successful resolution.
      dialog = next;
      previous = null;
      classification = '';
      readyDialog = null;
      stableRect = '';
      if (dialog) { serial++; emit('dialog-opened'); }
    }
    if (!dialog) return;
    if (schedule && frame === null && readyDialog !== dialog) frame = schedule(checkReady);
    if (readClassification) {
      const value = readClassification(dialog);
      const signature = JSON.stringify(value);
      // React mounts the shell before the fields. Do not publish that as a selector failure.
      if (dialog.querySelector('[role="combobox"]') && signature !== classification) { classification = signature; emit('classification-observed', { classification: value }); }
    }
    const fields = [...dialog.querySelectorAll('[role="combobox"]')];
    // Diagnostic counts only: do not mistake React Select search value for selection.
    const state = JSON.stringify(fields.map(el => ({
      expanded: el.getAttribute('aria-expanded') === 'true',
      labelled: !!(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') ||
        [...dialog.querySelectorAll('label[for]')].some(label => label.htmlFor === el.id))
    })));
    if (state !== previous) { previous = state; emit('fields-observed', { fields: JSON.parse(state) }); }
  }
  function click(event) {
    const button = event.target.closest?.('button');
    if (!button) return;
    inspect(); // Fresh DOM before native click handlers can remove the dialog.
    const name = (button.getAttribute('aria-label') || button.textContent || '').trim();
    if (name === 'Resolver chat') emit('open-requested');
    if (dialog?.contains(button)) {
      if (name === 'Cancelar' || name === 'Cerrar diálogo') emit('cancel-requested');
      if (name === 'Resolver conversación' || name === 'Resolver conversación sin mensaje') {
        emit('resolution-requested', { withoutMessage: name.endsWith('sin mensaje') });
      }
    }
  }
  const observer = new win.MutationObserver(inspect);
  observer.observe(doc.body, { subtree: true, childList: true, attributes: true,
    characterData: true, attributeFilter: ['aria-expanded', 'aria-labelledby', 'aria-label'] });
  doc.addEventListener('click', click, { capture: true, passive: true });
  inspect();
  return () => { stopped = true; observer.disconnect(); if (frame !== null) win.cancelAnimationFrame?.(frame); doc.removeEventListener('click', click, true); dialog = null; previous = null; };
}
if (typeof module === 'object' && module.exports) module.exports = { installProbe };
else globalThis.ONOFFIkonoCloseProbe = { installProbe };
