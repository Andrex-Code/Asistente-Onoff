(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const TEXT_KEY = 'onoffSimpleNotebookText';
  const MIGRATION_KEY = 'onoffSimpleNotebookMigrated';
  const POSITION_KEY = 'onoffNotebookPosition';

  let panel;
  let panelObserver;
  let windowEl;
  let editor;
  let saveStatus;
  let characterCount;
  let saveTimer;
  let dragState;

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

    if (!windowEl) buildWindow();
    const willOpen = windowEl.hidden;
    windowEl.hidden = !willOpen;
    panel.querySelector('[data-action="notebook"]')?.classList.toggle('is-active', willOpen);

    if (willOpen) {
      windowEl.classList.remove('is-minimized');
      windowEl.querySelector('[data-min]').textContent = '−';
      await loadText();
      await applyPosition();
      editor.focus();
    } else {
      await saveNow();
    }
  }

  function buildWindow() {
    windowEl = document.createElement('section');
    windowEl.className = 'onoff-notebook';
    windowEl.hidden = true;
    windowEl.innerHTML = `
      <header class="onoff-notebook-header" title="Arrastre para mover">
        <div>
          <strong>Bloc de notas</strong>
          <small>Texto guardado automáticamente en este navegador</small>
        </div>
        <div class="onoff-notebook-window-actions">
          <button type="button" data-min aria-label="Minimizar" title="Minimizar">−</button>
          <button type="button" data-close aria-label="Cerrar" title="Cerrar">×</button>
        </div>
      </header>
      <div class="onoff-notebook-body">
        <textarea data-editor spellcheck="true" placeholder="Escriba aquí sus notas..."></textarea>
        <footer>
          <small data-status>Listo</small>
          <small data-count>0 caracteres</small>
        </footer>
      </div>
    `;

    document.body.appendChild(windowEl);
    editor = windowEl.querySelector('[data-editor]');
    saveStatus = windowEl.querySelector('[data-status]');
    characterCount = windowEl.querySelector('[data-count]');

    windowEl.querySelector('[data-close]').addEventListener('click', async () => {
      await saveNow();
      windowEl.hidden = true;
      panel.querySelector('[data-action="notebook"]')?.classList.remove('is-active');
    });

    windowEl.querySelector('[data-min]').addEventListener('click', (event) => {
      windowEl.classList.toggle('is-minimized');
      const minimized = windowEl.classList.contains('is-minimized');
      event.currentTarget.textContent = minimized ? '□' : '−';
      event.currentTarget.title = minimized ? 'Restaurar' : 'Minimizar';
    });

    editor.addEventListener('input', scheduleSave);
    editor.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveNow();
      }
    });

    ['mousedown', 'pointerdown', 'click', 'keyup', 'paste'].forEach((type) => {
      editor.addEventListener(type, (event) => event.stopPropagation());
    });

    windowEl.querySelector('.onoff-notebook-header').addEventListener('pointerdown', startDrag);
    window.addEventListener('resize', keepInside);
  }

  async function loadText() {
    const stored = await chrome.storage.local.get([
      TEXT_KEY,
      MIGRATION_KEY,
      'onoffNotebookNotes',
      'followUps'
    ]);

    let text = typeof stored[TEXT_KEY] === 'string' ? stored[TEXT_KEY] : '';

    if (!stored[MIGRATION_KEY] && !text) {
      const sections = [];
      const oldNotes = Array.isArray(stored.onoffNotebookNotes) ? stored.onoffNotebookNotes : [];
      const followUps = Array.isArray(stored.followUps) ? stored.followUps : [];

      oldNotes.forEach((note) => {
        const title = String(note?.title || '').trim();
        const content = String(note?.content || '').trim();
        const combined = [title, content].filter(Boolean).join('\n');
        if (combined) sections.push(combined);
      });

      followUps.forEach((item) => {
        const combined = [item?.name, item?.url].filter(Boolean).join('\n');
        if (combined) sections.push(combined);
      });

      text = sections.join('\n\n──────────\n\n');
      await chrome.storage.local.set({
        [TEXT_KEY]: text,
        [MIGRATION_KEY]: true
      });
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
    const rect = windowEl.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    windowEl.classList.add('is-dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveDrag, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const maxLeft = Math.max(8, window.innerWidth - windowEl.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - windowEl.offsetHeight - 8);
    windowEl.style.left = `${clamp(event.clientX - dragState.offsetX, 8, maxLeft)}px`;
    windowEl.style.top = `${clamp(event.clientY - dragState.offsetY, 8, maxTop)}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
  }

  async function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState = null;
    windowEl.classList.remove('is-dragging');
    window.removeEventListener('pointermove', moveDrag, true);
    window.removeEventListener('pointerup', endDrag, true);
    window.removeEventListener('pointercancel', endDrag, true);
    const rect = windowEl.getBoundingClientRect();
    await chrome.storage.local.set({
      [POSITION_KEY]: {
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      }
    });
  }

  async function applyPosition() {
    const stored = await chrome.storage.local.get(POSITION_KEY);
    const position = stored[POSITION_KEY];
    if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) return;
    windowEl.style.left = `${position.left}px`;
    windowEl.style.top = `${position.top}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
    keepInside();
  }

  function keepInside() {
    if (!windowEl || windowEl.hidden) return;
    const rect = windowEl.getBoundingClientRect();
    windowEl.style.left = `${clamp(rect.left, 8, Math.max(8, window.innerWidth - rect.width - 8))}px`;
    windowEl.style.top = `${clamp(rect.top, 8, Math.max(8, window.innerHeight - rect.height - 8))}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
