(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const TEXT_KEY = 'onoffSimpleNotebookText';
  const MIGRATION_KEY = 'onoffSimpleNotebookMigrated';
  const POSITION_KEY = 'onoffNotebookPosition';

  let panel;
  let panelObserver;
  let host;
  let shadow;
  let windowEl;
  let editor;
  let saveStatus;
  let characterCount;
  let saveTimer;
  let dragState;
  let isOpen = false;

  init();

  function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }

    ensureButton();
    panelObserver?.disconnect();
    panelObserver = new MutationObserver(ensureButton);
    panelObserver.observe(panel, { childList: true });
  }

  function ensureButton() {
    if (!panel?.isConnected) {
      window.setTimeout(init, 250);
      return;
    }

    let button = panel.querySelector('[data-action="notebook"]');
    if (!button) {
      const previousButton = panel.querySelector('[data-action="followups"]');
      if (!previousButton) return;
      button = previousButton.cloneNode(true);
      button.dataset.action = 'notebook';
      previousButton.replaceWith(button);
    }

    button.innerHTML = '<span>Bloc de notas</span><span class="onoff-chevron">›</span>';
    if (button.dataset.onoffNotebookBound === 'true') return;
    button.dataset.onoffNotebookBound = 'true';
    button.addEventListener('click', toggleWindow);
  }

  async function toggleWindow(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!host) buildWindow();
    if (isOpen) await closeWindow();
    else await openWindow();
  }

  async function openWindow() {
    isOpen = true;
    host.style.display = 'block';
    host.removeAttribute('hidden');
    windowEl.classList.remove('is-minimized');
    host.style.height = 'min(520px, calc(100vh - 24px))';
    shadow.querySelector('[data-min]').textContent = '−';
    panel.querySelector('[data-action="notebook"]')?.classList.add('is-active');
    await loadText();
    await applyPosition();
    window.setTimeout(() => {
      editor.focus({ preventScroll: true });
      const end = editor.value.length;
      editor.setSelectionRange(end, end);
    }, 0);
  }

  async function closeWindow() {
    await saveNow();
    isOpen = false;
    host.style.display = 'none';
    host.setAttribute('hidden', '');
    panel.querySelector('[data-action="notebook"]')?.classList.remove('is-active');
  }

  function buildWindow() {
    host = document.createElement('div');
    host.className = 'onoff-notebook-host';
    host.setAttribute('hidden', '');
    Object.assign(host.style, {
      position: 'fixed',
      right: '22px',
      bottom: '22px',
      zIndex: '2147483647',
      width: 'min(560px, calc(100vw - 24px))',
      height: 'min(520px, calc(100vh - 24px))',
      display: 'none',
      pointerEvents: 'auto',
      isolation: 'isolate'
    });

    shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .window {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-rows: auto 1fr;
          overflow: hidden;
          background: #ffffff;
          color: #17201b;
          border: 1px solid #dce5df;
          border-radius: 18px;
          box-shadow: 0 24px 70px rgba(23, 32, 27, 0.26);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          pointer-events: auto;
        }
        .window.is-minimized { height: auto; }
        .window.is-minimized .body { display: none; }
        .window.is-dragging { cursor: grabbing; box-shadow: 0 30px 90px rgba(23, 32, 27, 0.32); }
        header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid #dce5df;
          background: linear-gradient(135deg, #f4faf6, #ffffff);
          cursor: grab;
          user-select: none;
          touch-action: none;
        }
        header > div:first-child { min-width: 0; display: grid; gap: 3px; }
        header strong { font-size: 15px; }
        header small { overflow: hidden; color: #66736b; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
        .actions { display: flex; flex: 0 0 auto; gap: 6px; }
        button {
          width: 34px;
          height: 34px;
          border: 1px solid #dce5df;
          border-radius: 9px;
          background: #ffffff;
          color: #17201b;
          font: 20px/1 Inter, ui-sans-serif, system-ui, sans-serif;
          cursor: pointer;
        }
        button:hover { border-color: #168447; background: #eaf7ef; }
        .body {
          min-height: 0;
          display: grid;
          grid-template-rows: 1fr auto;
          padding: 14px;
          background: #fbfcfb;
          pointer-events: auto;
        }
        textarea {
          all: initial;
          display: block;
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: 14px;
          overflow: auto;
          resize: none;
          border: 1px solid #dce5df;
          border-radius: 13px;
          background: #ffffff;
          color: #17201b;
          caret-color: #168447;
          outline: none;
          font: 14px/1.55 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          white-space: pre-wrap;
          word-break: break-word;
          user-select: text;
          pointer-events: auto;
          cursor: text;
          -webkit-user-select: text;
        }
        textarea:focus { border-color: #168447; box-shadow: 0 0 0 3px rgba(22, 132, 71, 0.13); }
        footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 9px 2px 0;
          color: #66736b;
          font-size: 11px;
        }
      </style>
      <section class="window">
        <header title="Arrastre para mover">
          <div>
            <strong>Bloc de notas</strong>
            <small>Texto guardado automáticamente en este navegador</small>
          </div>
          <div class="actions">
            <button type="button" data-min aria-label="Minimizar" title="Minimizar">−</button>
            <button type="button" data-close aria-label="Cerrar" title="Cerrar">×</button>
          </div>
        </header>
        <div class="body">
          <textarea data-editor spellcheck="true" tabindex="0" aria-label="Contenido del bloc de notas" placeholder="Escriba aquí sus notas..."></textarea>
          <footer>
            <small data-status>Listo</small>
            <small data-count>0 caracteres</small>
          </footer>
        </div>
      </section>
    `;

    document.body.appendChild(host);
    windowEl = shadow.querySelector('.window');
    editor = shadow.querySelector('[data-editor]');
    saveStatus = shadow.querySelector('[data-status]');
    characterCount = shadow.querySelector('[data-count]');

    shadow.querySelector('[data-close]').addEventListener('click', closeWindow);
    shadow.querySelector('[data-min]').addEventListener('click', (event) => {
      windowEl.classList.toggle('is-minimized');
      const minimized = windowEl.classList.contains('is-minimized');
      host.style.height = minimized ? 'auto' : 'min(520px, calc(100vh - 24px))';
      event.currentTarget.textContent = minimized ? '□' : '−';
      event.currentTarget.title = minimized ? 'Restaurar' : 'Minimizar';
      if (!minimized) window.setTimeout(() => editor.focus({ preventScroll: true }), 0);
    });

    editor.readOnly = false;
    editor.disabled = false;
    editor.addEventListener('input', scheduleSave);
    editor.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveNow();
      }
    });

    [
      'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'click',
      'keypress', 'keyup', 'beforeinput', 'input', 'paste', 'copy', 'cut',
      'compositionstart', 'compositionupdate', 'compositionend', 'focusin', 'focusout'
    ].forEach((type) => editor.addEventListener(type, (event) => event.stopPropagation()));

    shadow.querySelector('header').addEventListener('pointerdown', startDrag);
    window.addEventListener('resize', keepInside);
  }

  async function loadText() {
    const stored = await chrome.storage.local.get([TEXT_KEY, MIGRATION_KEY, 'onoffNotebookNotes', 'followUps']);
    let text = typeof stored[TEXT_KEY] === 'string' ? stored[TEXT_KEY] : '';

    if (!stored[MIGRATION_KEY] && !text) {
      const sections = [];
      const oldNotes = Array.isArray(stored.onoffNotebookNotes) ? stored.onoffNotebookNotes : [];
      const followUps = Array.isArray(stored.followUps) ? stored.followUps : [];

      oldNotes.forEach((note) => {
        const combined = [note?.title, note?.content].map((value) => String(value || '').trim()).filter(Boolean).join('\n');
        if (combined) sections.push(combined);
      });
      followUps.forEach((item) => {
        const combined = [item?.name, item?.url].map((value) => String(value || '').trim()).filter(Boolean).join('\n');
        if (combined) sections.push(combined);
      });

      text = sections.join('\n\n──────────\n\n');
      await chrome.storage.local.set({ [TEXT_KEY]: text, [MIGRATION_KEY]: true });
    } else if (!stored[MIGRATION_KEY]) {
      await chrome.storage.local.set({ [MIGRATION_KEY]: true });
    }

    editor.value = text;
    updateCount();
    saveStatus.textContent = text ? 'Guardado' : 'Listo para escribir';
  }

  function scheduleSave() {
    updateCount();
    saveStatus.textContent = 'Guardando…';
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 400);
  }

  async function saveNow() {
    if (!editor) return;
    window.clearTimeout(saveTimer);
    await chrome.storage.local.set({ [TEXT_KEY]: editor.value });
    saveStatus.textContent = `Guardado a las ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
  }

  function updateCount() {
    const count = editor?.value.length || 0;
    characterCount.textContent = `${count} ${count === 1 ? 'carácter' : 'caracteres'}`;
  }

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = host.getBoundingClientRect();
    dragState = { pointerId: event.pointerId, offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top };
    windowEl.classList.add('is-dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveDrag, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const maxLeft = Math.max(8, window.innerWidth - host.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - host.offsetHeight - 8);
    host.style.left = `${clamp(event.clientX - dragState.offsetX, 8, maxLeft)}px`;
    host.style.top = `${clamp(event.clientY - dragState.offsetY, 8, maxTop)}px`;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
  }

  async function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState = null;
    windowEl.classList.remove('is-dragging');
    window.removeEventListener('pointermove', moveDrag, true);
    window.removeEventListener('pointerup', endDrag, true);
    window.removeEventListener('pointercancel', endDrag, true);
    const rect = host.getBoundingClientRect();
    await chrome.storage.local.set({ [POSITION_KEY]: { left: Math.round(rect.left), top: Math.round(rect.top) } });
  }

  async function applyPosition() {
    const stored = await chrome.storage.local.get(POSITION_KEY);
    const position = stored[POSITION_KEY];
    if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) return;
    host.style.left = `${position.left}px`;
    host.style.top = `${position.top}px`;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    keepInside();
  }

  function keepInside() {
    if (!host || !isOpen) return;
    const rect = host.getBoundingClientRect();
    host.style.left = `${clamp(rect.left, 8, Math.max(8, window.innerWidth - rect.width - 8))}px`;
    host.style.top = `${clamp(rect.top, 8, Math.max(8, window.innerHeight - rect.height - 8))}px`;
    host.style.right = 'auto';
    host.style.bottom = 'auto';
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
