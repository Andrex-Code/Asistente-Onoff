/* Test-only passive DOM probe. No network, chat text, room IDs or storage. */
function installProbe(win, { enabled = false, onEvent = () => {} } = {}) {
  if (!enabled || win.location.origin !== 'https://onoff.a.ikono.im') return () => {};
  const doc = win.document;
  let stopped = false;
  let previous = null;
  let dialog = null;
  let serial = 0;
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
      if (dialog) { serial++; emit('dialog-opened'); }
    }
    if (!dialog) return;
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
    attributeFilter: ['aria-expanded', 'aria-labelledby', 'aria-label'] });
  doc.addEventListener('click', click, { capture: true, passive: true });
  inspect();
  return () => { stopped = true; observer.disconnect(); doc.removeEventListener('click', click, true); dialog = null; previous = null; };
}
if (typeof module === 'object' && module.exports) module.exports = { installProbe };
else globalThis.ONOFFIkonoCloseProbe = { installProbe };
