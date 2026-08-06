(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const MOBILE_QUERY = '(max-width: 620px)';
  const MARGIN = 8;
  const GAP = 10;

  const WINDOW_CONFIG = [
    {
      action: 'bitrix-search',
      selector: '.onoff-bitrix-search',
      headerSelector: '.onoff-bitrix-header',
      positionKey: 'onoffBitrixSearchPosition',
      manualKey: 'onoffBitrixSearchUserPlaced',
      fallbackWidth: 460,
      fallbackHeight: 360
    },
    {
      action: 'assistant-chat',
      selector: '.onoff-assistant-window',
      headerSelector: '.onoff-assistant-header',
      positionKey: 'onoffAssistantPosition',
      manualKey: 'onoffAssistantUserPlaced',
      fallbackWidth: 430,
      fallbackHeight: 620
    },
    {
      action: 'notebook',
      selector: '.onoff-notebook-host',
      shadowHeaderSelector: 'header',
      positionKey: 'onoffNotebookPosition',
      manualKey: 'onoffNotebookUserPlaced',
      fallbackWidth: 560,
      fallbackHeight: 520
    }
  ];

  let panel;
  let observer;
  let resizeTimer;
  let dragCandidate = null;
  const manualState = new Map();
  const pendingAnchors = new Map();

  init();

  async function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }

    await loadManualState();
    bindAll();

    observer?.disconnect();
    observer = new MutationObserver(bindAll);
    observer.observe(document.body, { childList: true, subtree: true });

    chrome.storage.onChanged.addListener(handleStorageChange);
    window.addEventListener('resize', scheduleKeepInside);
  }

  async function loadManualState() {
    const keys = WINDOW_CONFIG.map((config) => config.manualKey);
    const stored = await chrome.storage.local.get(keys);
    WINDOW_CONFIG.forEach((config) => manualState.set(config.action, Boolean(stored[config.manualKey])));
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== 'local') return;
    WINDOW_CONFIG.forEach((config) => {
      if (changes[config.manualKey]) {
        manualState.set(config.action, Boolean(changes[config.manualKey].newValue));
      }
    });
  }

  function bindAll() {
    if (!panel?.isConnected) {
      panel = document.querySelector(PANEL_SELECTOR);
      if (!panel) return;
    }

    WINDOW_CONFIG.forEach((config) => {
      bindMenuButton(config);
      bindDragHeader(config);
    });
  }

  function bindMenuButton(config) {
    const button = panel.querySelector(`[data-action="${config.action}"]`);
    if (!button || button.dataset.onoffStableLayoutBound === 'true') return;
    button.dataset.onoffStableLayoutBound = 'true';
    button.addEventListener('click', () => handleToolButtonClick(config), true);
  }

  function handleToolButtonClick(config) {
    const currentWindow = document.querySelector(config.selector);
    if (isVisible(currentWindow)) {
      pendingAnchors.delete(config.action);
      return;
    }

    if (manualState.get(config.action)) {
      pendingAnchors.delete(config.action);
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    if (!isUsableAnchor(panelRect)) return;

    const snapshot = {
      left: panelRect.left,
      top: panelRect.top,
      right: panelRect.right,
      bottom: panelRect.bottom,
      width: panelRect.width,
      height: panelRect.height
    };
    pendingAnchors.set(config.action, snapshot);

    chrome.storage.local.remove(config.positionKey).catch(() => {});
    [20, 70, 160].forEach((delay) => {
      window.setTimeout(() => anchorPendingWindow(config), delay);
    });
  }

  function anchorPendingWindow(config) {
    const anchorRect = pendingAnchors.get(config.action);
    if (!anchorRect || manualState.get(config.action)) return;

    const windowEl = document.querySelector(config.selector);
    if (!isVisible(windowEl)) return;

    positionBesideAnchor(windowEl, anchorRect, config);
    pendingAnchors.delete(config.action);
  }

  function bindDragHeader(config) {
    const windowEl = document.querySelector(config.selector);
    if (!windowEl) return;

    let header;
    if (config.shadowHeaderSelector) {
      header = windowEl.shadowRoot?.querySelector(config.shadowHeaderSelector);
    } else {
      header = windowEl.querySelector(config.headerSelector);
    }

    if (!header || header.dataset.onoffManualPlacementBound === 'true') return;
    header.dataset.onoffManualPlacementBound = 'true';
    header.addEventListener('pointerdown', (event) => beginManualPlacement(event, config), true);
  }

  function beginManualPlacement(event, config) {
    if (event.button !== 0 || event.target.closest?.('button')) return;
    dragCandidate = {
      config,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      marked: false
    };
    window.addEventListener('pointermove', detectManualMovement, true);
    window.addEventListener('pointerup', finishManualMovement, true);
    window.addEventListener('pointercancel', finishManualMovement, true);
  }

  function detectManualMovement(event) {
    if (!dragCandidate || event.pointerId !== dragCandidate.pointerId) return;
    const distance = Math.hypot(event.clientX - dragCandidate.startX, event.clientY - dragCandidate.startY);
    if (distance < 4 || dragCandidate.marked) return;
    dragCandidate.marked = true;
    markManualPlacement(dragCandidate.config);
  }

  function finishManualMovement(event) {
    if (!dragCandidate || event.pointerId !== dragCandidate.pointerId) return;
    dragCandidate = null;
    window.removeEventListener('pointermove', detectManualMovement, true);
    window.removeEventListener('pointerup', finishManualMovement, true);
    window.removeEventListener('pointercancel', finishManualMovement, true);
  }

  function markManualPlacement(config) {
    manualState.set(config.action, true);
    pendingAnchors.delete(config.action);
    chrome.storage.local.set({ [config.manualKey]: true }).catch(() => {});
  }

  function positionBesideAnchor(windowEl, anchorRect, config) {
    const rect = windowEl.getBoundingClientRect();
    const width = rect.width || windowEl.offsetWidth || config.fallbackWidth;
    const height = rect.height || windowEl.offsetHeight || config.fallbackHeight;

    if (window.matchMedia(MOBILE_QUERY).matches) {
      setPosition(windowEl, MARGIN, MARGIN);
      return;
    }

    const roomRight = window.innerWidth - anchorRect.right - GAP - MARGIN;
    const roomLeft = anchorRect.left - GAP - MARGIN;
    let left = roomRight >= width || roomRight >= roomLeft
      ? anchorRect.right + GAP
      : anchorRect.left - width - GAP;

    const preferredTop = anchorRect.top + Math.min(34, Math.max(0, anchorRect.height * 0.08));
    left = clamp(left, MARGIN, Math.max(MARGIN, window.innerWidth - width - MARGIN));
    const top = clamp(preferredTop, MARGIN, Math.max(MARGIN, window.innerHeight - height - MARGIN));
    setPosition(windowEl, left, top);
  }

  function scheduleKeepInside() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(keepVisibleWindowsInside, 80);
  }

  function keepVisibleWindowsInside() {
    WINDOW_CONFIG.forEach((config) => {
      const windowEl = document.querySelector(config.selector);
      if (!isVisible(windowEl)) return;

      if (window.matchMedia(MOBILE_QUERY).matches) {
        setPosition(windowEl, MARGIN, MARGIN);
        return;
      }

      const rect = windowEl.getBoundingClientRect();
      const left = clamp(rect.left, MARGIN, Math.max(MARGIN, window.innerWidth - rect.width - MARGIN));
      const top = clamp(rect.top, MARGIN, Math.max(MARGIN, window.innerHeight - rect.height - MARGIN));
      setPosition(windowEl, left, top);
    });
  }

  function setPosition(windowEl, left, top) {
    windowEl.style.left = `${Math.round(left)}px`;
    windowEl.style.top = `${Math.round(top)}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
  }

  function isVisible(element) {
    return Boolean(element && !element.hidden && getComputedStyle(element).display !== 'none');
  }

  function isUsableAnchor(rect) {
    return rect && rect.width > 20 && rect.height > 20 && Number.isFinite(rect.left) && Number.isFinite(rect.top);
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
