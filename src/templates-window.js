(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const POSITION_KEY = 'onoffTemplatesPosition';
  const MANUAL_KEY = 'onoffTemplatesUserPlaced';
  const MARGIN = 8;
  const GAP = 10;

  const TEMPLATES = [
    ['TCXXXX - ESCALAMIENTO OPERACIONES', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/383/'],
    ['TCXXXX- PRIMER CONTACTO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/477/'],
    ['TCXXXX - S SOLICITUD DE RECAPACITACIÓN (CIUDAD OBLIGATORIA)', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/513/'],
    ['TCXXXX - ACTUALIZAR INFORMACION DE PRODUCTO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/606/'],
    ['TCXXXX - CESION DE CONTRATO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/648/'],
    ['TCXXXX - SOLICITUD DE RETIRO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/650/'],
    ['TCXXXX - S SOLICITUD BOLSAS ADICIONALES F.E', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/654/'],
    ['TCXXXX - S SOLICITUD CAMBIO DE PLAN F.E', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/656/'],
    ['TCXXXX - S IMPLEMENTACION F.E (CIUDAD)', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/658/'],
    ['TCXXXX - S ACTUALIZAR RESOLUCION POS', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/684/'],
    ['TCXXXX- I FALLAS EN SINCRONIZACIÓN', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/710/'],
    ['TCXXXX - S AJUSTE DE INVENTARIO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/732/'],
    ['TCXXXX - S CAMBIO DE PLAN', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/764/'],
    ['TCXXXX- S ACTUALIZAR RESOLUCION DIAN', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/766/'],
    ['TCXXXX - S MARCACION DE IMPUESTOS', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/768/'],
    ['TCXXXX - S INHABILITAR RESOLUCION', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/770/'],
    ['TCXXXX - C FACTURACION', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/798/']
  ];

  let panel;
  let panelObserver;
  let templatesWindow;
  let list;
  let dragState;
  let isOpen = false;
  let userPlaced = false;

  init();

  async function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }

    userPlaced = Boolean((await chrome.storage.local.get(MANUAL_KEY))[MANUAL_KEY]);
    bindButton();

    panelObserver?.disconnect();
    panelObserver = new MutationObserver(bindButton);
    panelObserver.observe(panel, { childList: true, subtree: true });

    window.addEventListener('resize', keepInside);
  }

  function bindButton() {
    if (!panel?.isConnected) {
      window.setTimeout(init, 250);
      return;
    }

    const button = panel.querySelector('[data-action="templates"]');
    if (!button || button.dataset.onoffTemplatesWindowBound === 'true') return;

    button.dataset.onoffTemplatesWindowBound = 'true';
    button.addEventListener('click', interceptTemplateClick, true);
  }

  function interceptTemplateClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    toggleWindow();
  }

  async function toggleWindow() {
    if (!templatesWindow) buildWindow();
    if (isOpen) closeWindow();
    else await openWindow();
  }

  async function openWindow() {
    isOpen = true;
    templatesWindow.hidden = false;
    templatesWindow.classList.remove('is-minimized');
    templatesWindow.querySelector('[data-min]').textContent = '−';
    panel.querySelector('[data-action="templates"]')?.classList.add('is-active');

    if (userPlaced) await applyStoredPosition();
    else positionBesideMenu();

    window.requestAnimationFrame(() => {
      keepInside();
      list?.focus({ preventScroll: true });
    });
  }

  function closeWindow() {
    isOpen = false;
    templatesWindow.hidden = true;
    panel.querySelector('[data-action="templates"]')?.classList.remove('is-active');
  }

  function buildWindow() {
    templatesWindow = document.createElement('section');
    templatesWindow.className = 'onoff-templates-window';
    templatesWindow.hidden = true;
    templatesWindow.innerHTML = `
      <header class="onoff-templates-header" title="Arrastre para mover">
        <div class="onoff-templates-heading">
          <strong>Plantillas Bitrix</strong>
          <small>${TEMPLATES.length} plantillas disponibles</small>
        </div>
        <div class="onoff-templates-window-actions">
          <button type="button" data-min aria-label="Minimizar" title="Minimizar">−</button>
          <button type="button" data-close aria-label="Cerrar" title="Cerrar">×</button>
        </div>
      </header>
      <div class="onoff-templates-content">
        <div class="onoff-templates-hint">Use la rueda del mouse para recorrer la lista.</div>
        <div class="onoff-templates-list" tabindex="0" aria-label="Lista de plantillas"></div>
      </div>
    `;

    document.body.appendChild(templatesWindow);
    list = templatesWindow.querySelector('.onoff-templates-list');

    TEMPLATES.forEach(([name, url]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'onoff-template-item';
      button.textContent = name;
      button.addEventListener('click', () => window.open(url, '_blank', 'noopener'));
      list.appendChild(button);
    });

    templatesWindow.querySelector('[data-close]').addEventListener('click', closeWindow);
    templatesWindow.querySelector('[data-min]').addEventListener('click', toggleMinimized);
    templatesWindow.querySelector('.onoff-templates-header').addEventListener('pointerdown', startDrag);
  }

  function toggleMinimized(event) {
    templatesWindow.classList.toggle('is-minimized');
    const minimized = templatesWindow.classList.contains('is-minimized');
    event.currentTarget.textContent = minimized ? '□' : '−';
    event.currentTarget.title = minimized ? 'Restaurar' : 'Minimizar';
    window.requestAnimationFrame(keepInside);
  }

  function positionBesideMenu() {
    const panelRect = panel.getBoundingClientRect();
    const rect = templatesWindow.getBoundingClientRect();
    const width = rect.width || 390;
    const height = rect.height || 500;

    if (window.matchMedia('(max-width: 620px)').matches) {
      setPosition(MARGIN, MARGIN);
      return;
    }

    const roomRight = window.innerWidth - panelRect.right - GAP - MARGIN;
    const roomLeft = panelRect.left - GAP - MARGIN;
    let left = roomRight >= width || roomRight >= roomLeft
      ? panelRect.right + GAP
      : panelRect.left - width - GAP;

    left = clamp(left, MARGIN, Math.max(MARGIN, window.innerWidth - width - MARGIN));
    const top = clamp(panelRect.top, MARGIN, Math.max(MARGIN, window.innerHeight - height - MARGIN));
    setPosition(left, top);
  }

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = templatesWindow.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    templatesWindow.classList.add('is-dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveDrag, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const maxLeft = Math.max(MARGIN, window.innerWidth - templatesWindow.offsetWidth - MARGIN);
    const maxTop = Math.max(MARGIN, window.innerHeight - templatesWindow.offsetHeight - MARGIN);
    setPosition(
      clamp(event.clientX - dragState.offsetX, MARGIN, maxLeft),
      clamp(event.clientY - dragState.offsetY, MARGIN, maxTop)
    );
  }

  async function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState = null;
    templatesWindow.classList.remove('is-dragging');
    window.removeEventListener('pointermove', moveDrag, true);
    window.removeEventListener('pointerup', endDrag, true);
    window.removeEventListener('pointercancel', endDrag, true);

    const rect = templatesWindow.getBoundingClientRect();
    userPlaced = true;
    await chrome.storage.local.set({
      [MANUAL_KEY]: true,
      [POSITION_KEY]: {
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      }
    });
  }

  async function applyStoredPosition() {
    const position = (await chrome.storage.local.get(POSITION_KEY))[POSITION_KEY];
    if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) {
      userPlaced = false;
      await chrome.storage.local.remove(MANUAL_KEY);
      positionBesideMenu();
      return;
    }
    setPosition(position.left, position.top);
    keepInside();
  }

  function keepInside() {
    if (!templatesWindow || !isOpen) return;

    if (window.matchMedia('(max-width: 620px)').matches) {
      setPosition(MARGIN, MARGIN);
      return;
    }

    const rect = templatesWindow.getBoundingClientRect();
    setPosition(
      clamp(rect.left, MARGIN, Math.max(MARGIN, window.innerWidth - rect.width - MARGIN)),
      clamp(rect.top, MARGIN, Math.max(MARGIN, window.innerHeight - rect.height - MARGIN))
    );
  }

  function setPosition(left, top) {
    templatesWindow.style.left = `${Math.round(left)}px`;
    templatesWindow.style.top = `${Math.round(top)}px`;
    templatesWindow.style.right = 'auto';
    templatesWindow.style.bottom = 'auto';
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
