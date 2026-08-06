(() => {
  const HOST_SELECTOR = '.onoff-notebook-host';
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const SIZE_KEY = 'onoffNotebookSize';
  const POSITION_KEY = 'onoffNotebookPosition';
  const MOBILE_QUERY = '(max-width: 620px)';
  const DEFAULT_SIZE = { width: 560, height: 520 };
  const MIN_SIZE = { width: 320, height: 260 };

  let host;
  let panel;
  let resizeObserver;
  let mutationObserver;
  let saveTimer;
  let savedSize = null;
  let wasVisible = false;

  init();

  function init() {
    host = document.querySelector(HOST_SELECTOR);
    panel = document.querySelector(PANEL_SELECTOR);
    if (!host || !panel) {
      window.setTimeout(init, 250);
      return;
    }

    configureHost();
    observeHost();
    loadSize();
    window.addEventListener('resize', handleViewportChange);
    document.addEventListener('scroll', positionWhenFirstOpened, true);
  }

  function configureHost() {
    host.style.minWidth = `${MIN_SIZE.width}px`;
    host.style.minHeight = `${MIN_SIZE.height}px`;
    host.style.maxWidth = 'calc(100vw - 16px)';
    host.style.maxHeight = 'calc(100vh - 16px)';
    host.style.overflow = 'hidden';
    host.style.boxSizing = 'border-box';
    host.style.resize = isMobile() ? 'none' : 'both';
  }

  async function loadSize() {
    const stored = await chrome.storage.local.get(SIZE_KEY);
    const size = stored[SIZE_KEY];
    savedSize = isValidSize(size) ? size : DEFAULT_SIZE;
    applyResponsiveSize();
  }

  function observeHost() {
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => {
      if (!isVisible() || isMobile()) return;
      const rect = host.getBoundingClientRect();
      if (rect.width < MIN_SIZE.width || rect.height < MIN_SIZE.height) return;
      savedSize = {
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(() => chrome.storage.local.set({ [SIZE_KEY]: savedSize }), 250);
      keepInside();
    });
    resizeObserver.observe(host);

    mutationObserver?.disconnect();
    mutationObserver = new MutationObserver(() => {
      const visible = isVisible();
      if (visible && !wasVisible) {
        applyResponsiveSize();
        window.setTimeout(positionNextToPanel, 50);
        window.setTimeout(positionNextToPanel, 160);
      }
      wasVisible = visible;
    });
    mutationObserver.observe(host, { attributes: true, attributeFilter: ['hidden', 'style'] });
  }

  function handleViewportChange() {
    applyResponsiveSize();
    if (isVisible()) keepInside();
  }

  function applyResponsiveSize() {
    if (!host) return;
    if (isMobile()) {
      Object.assign(host.style, {
        left: '8px',
        top: '8px',
        right: 'auto',
        bottom: 'auto',
        width: 'calc(100vw - 16px)',
        height: 'calc(100vh - 16px)',
        minWidth: '0',
        minHeight: '0',
        maxWidth: 'calc(100vw - 16px)',
        maxHeight: 'calc(100vh - 16px)',
        resize: 'none'
      });
      return;
    }

    const size = savedSize || DEFAULT_SIZE;
    const width = clamp(size.width, MIN_SIZE.width, Math.max(MIN_SIZE.width, window.innerWidth - 16));
    const height = clamp(size.height, MIN_SIZE.height, Math.max(MIN_SIZE.height, window.innerHeight - 16));
    Object.assign(host.style, {
      width: `${width}px`,
      height: `${height}px`,
      minWidth: `${MIN_SIZE.width}px`,
      minHeight: `${MIN_SIZE.height}px`,
      maxWidth: 'calc(100vw - 16px)',
      maxHeight: 'calc(100vh - 16px)',
      resize: 'both'
    });
  }

  function positionWhenFirstOpened() {
    if (isVisible() && !wasVisible) positionNextToPanel();
  }

  async function positionNextToPanel() {
    if (!isVisible() || isMobile() || !panel?.isConnected) return;
    const panelRect = panel.getBoundingClientRect();
    const rect = host.getBoundingClientRect();
    const gap = 10;
    const margin = 8;
    const roomRight = window.innerWidth - panelRect.right - gap - margin;
    const roomLeft = panelRect.left - gap - margin;
    let left = roomRight >= rect.width || roomRight >= roomLeft
      ? panelRect.right + gap
      : panelRect.left - rect.width - gap;
    let top = panelRect.top;
    left = clamp(left, margin, Math.max(margin, window.innerWidth - rect.width - margin));
    top = clamp(top, margin, Math.max(margin, window.innerHeight - rect.height - margin));
    Object.assign(host.style, {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      right: 'auto',
      bottom: 'auto'
    });
    await chrome.storage.local.set({ [POSITION_KEY]: { left: Math.round(left), top: Math.round(top) } });
  }

  function keepInside() {
    if (!isVisible() || isMobile()) return;
    const rect = host.getBoundingClientRect();
    const left = clamp(rect.left, 8, Math.max(8, window.innerWidth - rect.width - 8));
    const top = clamp(rect.top, 8, Math.max(8, window.innerHeight - rect.height - 8));
    Object.assign(host.style, {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      right: 'auto',
      bottom: 'auto'
    });
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
