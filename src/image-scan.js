(() => {
  'use strict';
  let busy = false;
  const scanIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3H4a1 1 0 0 0-1 1v4m13-5h4a1 1 0 0 1 1 1v4M3 16v4a1 1 0 0 0 1 1h4m8 0h4a1 1 0 0 0 1-1v-4M7 9h10M7 13h10M7 17h6"/></svg>';
  function mount() {
    const head = document.querySelector('.onoff-menu-head');
    if (!head || head.querySelector('[data-image-scan]')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'onoff-icon-button'; button.dataset.imageScan = '';
    button.title = 'Capturar texto o código de barras'; button.setAttribute('aria-label', button.title);
    button.innerHTML = scanIcon;
    button.style.cssText = 'margin-left:auto;flex:0 0 auto;display:grid;place-items:center';
    head.insertBefore(button, head.querySelector('[data-menu-close]'));
    button.addEventListener('click', start);
  }
  mount();
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true });

  async function start(event) {
    event.preventDefault(); event.stopPropagation();
    if (busy) return;
    busy = true;
    const panel = document.querySelector('.ikono-translator-panel');
    if (panel) panel.hidden = true;
    const launcher = document.querySelector('.ikono-translator-launcher');
    const launcherVisibility = launcher?.style.visibility;
    if (launcher) launcher.style.visibility = 'hidden';
    try {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const captured = await chrome.runtime.sendMessage({ type: 'ONOFF_SCAN_CAPTURE' });
      if (!captured?.ok) throw new Error(captured?.error || 'No fue posible capturar esta página.');
      await selectArea(captured.image);
    } catch (error) { showResult(null, error.message); }
    finally { if (launcher) launcher.style.visibility = launcherVisibility || ''; busy = false; }
  }

  function surface(title) {
    const host = document.createElement('div'); host.className = 'onoff-image-scan';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>
      :host{all:initial;color-scheme:light dark;font:13px/1.5 'Segoe UI',sans-serif}
      *{box-sizing:border-box}dialog{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;border:0;padding:0;background:transparent;color:#243e36;font:13px/1.5 'Segoe UI',sans-serif;overflow:hidden}
      dialog::backdrop{background:#0005}button{font:600 13px 'Segoe UI',sans-serif;padding:9px 12px;border:1px solid #cbdad2;border-radius:8px;background:#f5faf7;color:#155d3e;cursor:pointer}button:disabled{opacity:.5;cursor:default}button:focus-visible,textarea:focus-visible{outline:3px solid #35a479;outline-offset:2px}
      .primary{background:#147e56;border-color:#147e56;color:white}.bar{position:absolute;z-index:3;top:16px;left:50%;transform:translateX(-50%);max-width:calc(100% - 24px);width:max-content;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;border-radius:12px;background:#fff;color:#243e36;box-shadow:0 4px 20px #0003}
      .screen{position:absolute;inset:0;width:100%;height:100%;user-select:none;pointer-events:none}.selection{position:absolute;pointer-events:none;border:2px solid #32d49a;box-shadow:0 0 0 100vmax #0005;display:none}.capture{cursor:crosshair;touch-action:none}.result{margin:24px auto;padding:18px;max-width:440px;width:calc(100% - 24px);max-height:calc(100% - 48px);overflow:auto;background:light-dark(#fff,#202c25);color:light-dark(#243e36,#eff8f2);border:1px solid light-dark(#dce8e2,#496052);border-radius:15px;display:grid;gap:12px}
      h2{font-size:16px;margin:0}.heading{display:flex;justify-content:space-between;align-items:center;gap:12px}p{margin:0}small{font-size:12px}label{display:grid;gap:5px}textarea{width:100%;min-height:100px;resize:vertical;padding:10px;border:1px solid #b0c2b7;border-radius:8px;font:14px/1.5 'Segoe UI',sans-serif;color:inherit;background:transparent}code{font:15px/1.5 monospace;overflow-wrap:anywhere}.code{display:grid;gap:5px;padding:10px;background:light-dark(#eff7f2,#2b4032);border-radius:8px}.actions{display:flex;flex-wrap:wrap;gap:8px}.error{color:light-dark(#a52f24,#ffb5aa)}[hidden]{display:none!important}
    </style><dialog aria-label="${title}"></dialog>`;
    document.body.appendChild(host);
    const dialog = root.querySelector('dialog');
    const close = () => { dialog.close(); host.remove(); chrome.runtime.sendMessage({ type: 'ONOFF_SCAN_CANCEL' }).catch(() => {}); document.querySelector('[data-image-scan]')?.focus(); };
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.showModal();
    return { root, dialog, host, close };
  }

  async function selectArea(imageData) {
    const screen = new Image(); screen.src = imageData; await screen.decode();
    const viewport = { width: innerWidth, height: innerHeight };
    const ui = surface('Seleccionar área para extraer texto');
    ui.dialog.className = 'capture';
    const image = document.createElement('img'); image.className = 'screen'; image.src = imageData; image.alt = '';
    const rect = document.createElement('div'); rect.className = 'selection';
    const bar = document.createElement('div'); bar.className = 'bar';
    bar.innerHTML = '<span role="status">Arrastre sobre el texto o código · Esc cancela</span><button type="button" class="primary" disabled>Leer selección</button><button type="button" data-cancel>Cancelar</button>';
    ui.dialog.append(image, rect, bar);
    const read = bar.querySelector('.primary');
    let start, area;
    const stop = () => { screen.src = ''; image.src = ''; window.removeEventListener('resize', resized); };
    const close = () => { stop(); ui.close(); };
    const resized = () => { close(); };
    window.addEventListener('resize', resized, { once: true });
    ui.dialog.addEventListener('close', stop, { once: true });
    ui.dialog.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('.bar')) return;
      event.preventDefault(); ui.dialog.setPointerCapture(event.pointerId);
      start = { x: event.clientX, y: event.clientY }; area = null; read.disabled = true;
    });
    ui.dialog.addEventListener('pointermove', event => {
      if (!start) return;
      const x = Math.max(0, Math.min(innerWidth, event.clientX)), y = Math.max(0, Math.min(innerHeight, event.clientY));
      area = { x: Math.min(start.x, x), y: Math.min(start.y, y), width: Math.abs(x - start.x), height: Math.abs(y - start.y) };
      rect.style.cssText = `display:block;left:${area.x}px;top:${area.y}px;width:${area.width}px;height:${area.height}px`;
    });
    ui.dialog.addEventListener('pointerup', () => { start = null; read.disabled = !area || area.width < 12 || area.height < 12; });
    ui.dialog.addEventListener('pointercancel', () => { start = null; area = null; read.disabled = true; });
    bar.querySelector('[data-cancel]').onclick = close;
    read.onclick = async () => {
      if (!area || read.disabled) return;
      read.disabled = true;
      const canvas = document.createElement('canvas');
      const sx = screen.naturalWidth / viewport.width, sy = screen.naturalHeight / viewport.height;
      canvas.width = Math.round(area.width * sx); canvas.height = Math.round(area.height * sy);
      if (canvas.width * canvas.height > 8000000) { read.disabled = false; bar.querySelector('span').textContent = 'Seleccione un área más pequeña.'; return; }
      canvas.getContext('2d').drawImage(screen, area.x * sx, area.y * sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      const crop = canvas.toDataURL('image/png'); canvas.width = canvas.height = 0;
      // Closing a selection must not cancel its newly issued read ticket.
      stop(); ui.dialog.close(); ui.host.remove();
      const resultUI = showResult();
      try {
        const result = await chrome.runtime.sendMessage({ type: 'ONOFF_SCAN_READ', image: crop });
        if (resultUI.host.isConnected) resultUI.render(result);
      } catch { if (resultUI.host.isConnected) resultUI.render({ ok: false, error: 'La extensión no respondió. Recárguela e intente de nuevo.' }); }
    };
  }

  function showResult(initial, error) {
    const ui = surface('Texto y códigos de la imagen');
    ui.dialog.innerHTML = '<section class="result"><div class="heading"><h2>Texto y códigos de la imagen</h2><button type="button" aria-label="Cerrar">×</button></div><p role="status">Leyendo la selección en este equipo…</p><div data-codes></div><label hidden>Texto extraído<textarea aria-label="Texto extraído" spellcheck="false"></textarea></label><small>Revise los números antes de usarlos. No se envía ningún mensaje al cliente.</small><div class="actions"><button type="button" data-copy hidden>Copiar texto</button><button type="button" data-retry>Nueva captura</button></div></section>';
    const status = ui.dialog.querySelector('[role=status]'), codes = ui.dialog.querySelector('[data-codes]');
    const text = ui.dialog.querySelector('textarea'), copy = ui.dialog.querySelector('[data-copy]');
    ui.dialog.querySelector('[aria-label=Cerrar]').onclick = ui.close;
    const retry = ui.dialog.querySelector('[data-retry]'); retry.disabled = true;
    retry.onclick = event => { ui.close(); start(event); };
    async function copyText(value) {
      try { await navigator.clipboard.writeText(value); status.textContent = 'Copiado al portapapeles.'; }
      catch { status.textContent = 'No se pudo copiar. Seleccione el texto y cópielo manualmente.'; }
    }
    copy.onclick = () => copyText(text.value);
    ui.render = result => {
      retry.disabled = false;
      status.className = result?.ok ? '' : 'error';
      if (!result?.ok) { status.textContent = result?.error || 'No fue posible leer la selección.'; return; }
      const found = Array.isArray(result.codes) ? result.codes : [];
      status.textContent = result.warning || (found.length || result.text ? 'Lectura terminada. Revise el resultado.' : 'No se detectó texto ni un código legible. Amplíe la imagen y vuelva a seleccionar.');
      for (const item of found) {
        const block = document.createElement('div'); block.className = 'code';
        const label = document.createElement('small'); label.textContent = `Código detectado · ${item.format}`;
        const value = document.createElement('code'); value.textContent = item.value;
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Copiar código'; button.onclick = () => copyText(item.value);
        block.append(label, value, button); codes.appendChild(block);
      }
      text.value = result.text || ''; text.parentElement.hidden = !text.value; copy.hidden = !text.value;
    };
    if (initial) ui.render(initial);
    if (error) ui.render({ ok: false, error });
    return ui;
  }
})();
