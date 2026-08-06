(() => {
  const HOST_SELECTOR = '.onoff-notebook-host';
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const SIZE_KEY = 'onoffNotebookSize';
  const POSITION_KEY = 'onoffNotebookPosition';
  const MANUAL_KEY = 'onoffNotebookUserPlaced';
  const MOBILE_QUERY = '(max-width: 620px)';
  const DEFAULT_SIZE = { width: 560, height: 520 };
  const MIN_SIZE = { width: 320, height: 260 };
  const MARGIN = 8;

  let host;
  let panel;
  let shadow;
  let savedSize = null;
  let saveTimer;
  let resizeState = null;
  let visibilityObserver;
  let wasVisible = false;

  init();

  function init() {
    host = document.querySelector(HOST_SELECTOR);
    panel = document.querySelector(PANEL_SELECTOR);
    shadow = host?.shadowRoot;
    if (!host || !panel || !shadow) {
      window.setTimeout(init, 250);
      return;
    }

    configureHost();
    installResizeHandles();
    observeVisibility();
    loadSize();
    window.addEventListener('resize', handleViewportChange);
  }

  function configureHost() {
    Object.assign(host.style, {
      minWidth: `${MIN_SIZE.width}px`,
      minHeight: `${MIN_SIZE.height}px`,
      maxWidth: 'calc(100vw - 16px)',
      maxHeight: 'calc(100vh - 16px)',
      overflow: 'visible',
      boxSizing: 'border-box',
      resize: 'none',
      background: 'transparent'
    });

    const windowEl = shadow.querySelector('.window');
    if (windowEl) {
      Object.assign(windowEl.style, {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box'
      });
    }
  }

  function installResizeHandles() {
    if (shadow.querySelector('[data-onoff-resize-root]')) return;

    const style = document.createElement('style');
    style.textContent = `
      :host { overflow: visible !important; }
      .window { position: relative; width: 100% !important; height: 100% !important; box-sizing: border-box !important; }
      .body, textarea { min-width: 0 !important; max-width: 100% !important; box-sizing: border-box !important; }
      textarea { width: 100% !important; height: 100% !important; }
      [data-onoff-resize-root] { position: absolute; inset: 0; pointer-events: none; z-index: 20; }
      [data-resize-edge] { position: absolute; pointer-events: auto; touch-action: none; }
      [data-resize-edge="n"] { top: -4px; left: 12px; right: 12px; height: 8px; cursor: ns-resize; }
      [data-resize-edge="s"] { bottom: -4px; left: 12px; right: 12px; height: 8px; cursor: ns-resize; }
      [data-resize-edge="e"] { top: 12px; right: -4px; bottom: 12px; width: 8px; cursor: ew-resize; }
      [data-resize-edge="w"] { top: 12px; left: -4px; bottom: 12px; width: 8px; cursor: ew-resize; }
      [data-resize-edge="ne"], [data-resize-edge="nw"], [data-resize-edge="se"], [data-resize-edge="sw"] { width: 16px; height: 16px; }
      [data-resize-edge="ne"] { top: -6px; right: -6px; cursor: nesw-resize; }
      [data-resize-edge="nw"] { top: -6px; left: -6px; cursor: nwse-resize; }
      [data-resize-edge="se"] { right: -6px; bottom: -6px; cursor: nwse-resize; }
      [data-resize-edge="sw"] { left: -6px; bottom: -6px; cursor: nesw-resize; }
      [data-resize-edge="se"]::after {
        content: "";
        position: absolute;
        right: 4px;
        bottom: 4px;
        width: 8px;
        height: 8px;
        border-right: 2px solid #8aa095;
        border-bottom: 2px solid #8aa095;
        border-radius: 0 0 3px 0;
        opacity: .75;
      }
      @media (max-width: 620px) { [data-onoff-resize-root] { display: none; } }
    `;
    shadow.appendChild(style);

    const root = document.createElement('div');
    root.dataset.onoffResizeRoot = 'true';
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach((edge) => {
      const handle = document.createElement('div');
      handle.dataset.resizeEdge = edge;
      handle.setAttribute('aria-hidden', 'true');
      handle.addEventListener('pointerdown', (event) => startResize(event, edge));
      root.appendChild(handle);
    });
    shadow.querySelector('.window')?.appendChild(root);
  }

  async function loadSize() {
    const stored = await chrome.storage.local.get(SIZE_KEY);
    savedSize = isValidSize(stored[SIZE_KEY]) ? stored[SIZE_KEY] : DEFAULT_SIZE;
    applyResponsiveSize();
  }

  function observeVisibility() {
    visibilityObserver?.disconnect();
    visibilityObserver = new MutationObserver(() => {
      const visible = isVisible();
      if (visible && !wasVisible) {
        applyResponsiveSize();
        window.setTimeout(keepInside, 80);
      }
      wasVisible = visible;
    });
    visibilityObserver.observe(host, { attributes: true, attributeFilter: ['hidden', 'style'] });
  }

  function startResize(event, edge) {
    if (isMobile() || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const rect = host.getBoundingClientRect();
    resizeState = {
      edge,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height
    };

    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.documentElement.style.cursor = getCursor(edge);
    document.documentElement.style.userSelect = 'none';
    window.addEventListener('pointermove', moveResize, true);
    window.addEventListener('pointerup', endResize, true);
    window.addEventListener('pointercancel', endResize, true);
  }

  function moveResize(event) {
    if (!resizeState || event.pointerId !== resizeState.pointerId) return;
    event.preventDefault();

    const dx = event.clientX - resizeState.startX;
    const dy = event.clientY - resizeState.startY;
    const edge = resizeState.edge;

    let left = resizeState.left;
    let top = resizeState.top;
    let width = resizeState.width;
    let height = resizeState.height;

    if (edge.includes('e')) width = resizeState.width + dx;
    if (edge.includes('s')) height = resizeState.height + dy;
    if (edge.includes('w')) {
      width = resizeState.width - dx;
      left = resizeState.left + dx;
    }
    if (edge.includes('n')) {
      height = resizeState.height - dy;
      top = resizeState.top + dy;
    }

    width = clamp(width, MIN_SIZE.width, window.innerWidth - MARGIN * 2);
    height = clamp(height, MIN_SIZE.height, window.innerHeight - MARGIN * 2);

    if (edge.includes('w')) left = resizeState.left + (resizeState.width - width);
    if (edge.includes('n')) top = resizeState.top + (resizeState.height - height);

    left = clamp(left, MARGIN, Math.max(MARGIN, window.innerWidth - width - MARGIN));
    top = clamp(top, MARGIN, Math.max(MARGIN, window.innerHeight - height - MARGIN));

    Object.assign(host.style, {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      right: 'auto',
      bottom: 'auto',
      width: `${Math.round(width)}px`,
      height: `${Math.round(height)}px`
    });
  }

  async function endResize(event) {
    if (!resizeState || event.pointerId !== resizeState.pointerId) return;
    resizeState = null;
    document.documentElement.style.cursor = '';
    document.documentElement.style.userSelect = '';
    window.removeEventListener('pointermove', moveResize, true);
    window.removeEventListener('pointerup', endResize, true);
    window.removeEventListener('pointercancel', endResize, true);

    const rect = host.getBoundingClientRect();
    savedSize = { width: Math.round(rect.width), height: Math.round(rect.height) };
    window.clearTimeout(saveTimer);
    await chrome.storage.local.set({
      [SIZE_KEY]: savedSize,
      [POSITION_KEY]: { left: Math.round(rect.left), top: Math.round(rect.top) },
      [MANUAL_KEY]: true
    });
  }

  function handleViewportChange() {
    applyResponsiveSize();
    if (isVisible()) keepInside();
  }

  function applyResponsiveSize() {
    if (!host) return;
    if (isMobile()) {
      Object.assign(host.style, {
        left: `${MARGIN}px`,
        top: `${MARGIN}px`,
        right: 'auto',
        bottom: 'auto',
        width: `calc(100vw - ${MARGIN * 2}px)`,
        height: `calc(100vh - ${MARGIN * 2}px)`,
        minWidth: '0',
        minHeight: '0',
        maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
        maxHeight: `calc(100vh - ${MARGIN * 2}px)`
      });
      return;
    }

    const size = savedSize || DEFAULT_SIZE;
    const width = clamp(size.width, MIN_SIZE.width, window.innerWidth - MARGIN * 2);
    const height = clamp(size.height, MIN_SIZE.height, window.innerHeight - MARGIN * 2);
    Object.assign(host.style, {
      width: `${Math.round(width)}px`,
      height: `${Math.round(height)}px`,
      minWidth: `${MIN_SIZE.width}px`,
      minHeight: `${MIN_SIZE.height}px`,
      maxWidth: `calc(100vw - ${MARGIN * 2}px)`,
      maxHeight: `calc(100vh - ${MARGIN * 2}px)`
    });
  }

  function keepInside() {
    if (!isVisible()) return;
    if (isMobile()) {
      Object.assign(host.style, { left: `${MARGIN}px`, top: `${MARGIN}px`, right: 'auto', bottom: 'auto' });
      return;
    }

    const rect = host.getBoundingClientRect();
    const left = clamp(rect.left, MARGIN, Math.max(MARGIN, window.innerWidth - rect.width - MARGIN));
    const top = clamp(rect.top, MARGIN, Math.max(MARGIN, window.innerHeight - rect.height - MARGIN));
    Object.assign(host.style, {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      right: 'auto',
      bottom: 'auto'
    });
  }

  function getCursor(edge) {
    if (edge === 'n' || edge === 's') return 'ns-resize';
    if (edge === 'e' || edge === 'w') return 'ew-resize';
    if (edge === 'ne' || edge === 'sw') return 'nesw-resize';
    return 'nwse-resize';
  }

  function isVisible() {
    return host && !host.hidden && getComputedStyle(host).display !== 'none';
  }

  function isMobile() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  function isValidSize(value) {
    return value && Number.isFinite(value.width) && Number.isFinite(value.height);
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
