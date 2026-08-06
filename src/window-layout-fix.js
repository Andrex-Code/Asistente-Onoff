(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const WINDOW_CONFIG = [
    {
      action: 'bitrix-search',
      selector: '.onoff-bitrix-search',
      positionKey: 'onoffBitrixSearchPosition'
    },
    {
      action: 'assistant-chat',
      selector: '.onoff-assistant-window',
      positionKey: 'onoffAssistantPosition'
    }
  ];

  let panel;
  let observer;
  let resizeTimer;

  init();

  function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }

    bindButtons();
    observer?.disconnect();
    observer = new MutationObserver(() => {
      bindButtons();
      positionVisibleWindows();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'class']
    });

    window.addEventListener('resize', schedulePosition);
    document.addEventListener('scroll', schedulePosition, true);
  }

  function bindButtons() {
    WINDOW_CONFIG.forEach((config) => {
      const button = panel.querySelector(`[data-action="${config.action}"]`);
      if (!button || button.dataset.onoffLayoutBound === 'true') return;
      button.dataset.onoffLayoutBound = 'true';
      button.addEventListener('click', () => {
        chrome.storage.local.remove(config.positionKey).catch(() => {});
        window.setTimeout(() => positionWindow(config), 40);
        window.setTimeout(() => positionWindow(config), 180);
      }, true);
    });
  }

  function schedulePosition() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(positionVisibleWindows, 60);
  }

  function positionVisibleWindows() {
    WINDOW_CONFIG.forEach(positionWindow);
  }

  function positionWindow(config) {
    if (!panel?.isConnected) return;
    const windowEl = document.querySelector(config.selector);
    if (!windowEl || windowEl.hidden || getComputedStyle(windowEl).display === 'none') return;

    const panelRect = panel.getBoundingClientRect();
    const windowRect = windowEl.getBoundingClientRect();
    const gap = 10;
    const margin = 8;
    const width = windowRect.width || windowEl.offsetWidth || 430;
    const height = windowRect.height || windowEl.offsetHeight || 500;

    const roomRight = window.innerWidth - panelRect.right - gap - margin;
    const roomLeft = panelRect.left - gap - margin;
    let left;

    if (roomRight >= width || roomRight >= roomLeft) {
      left = panelRect.right + gap;
    } else {
      left = panelRect.left - width - gap;
    }

    left = clamp(left, margin, Math.max(margin, window.innerWidth - width - margin));
    const top = clamp(
      panelRect.top + Math.min(34, Math.max(0, panelRect.height * 0.08)),
      margin,
      Math.max(margin, window.innerHeight - height - margin)
    );

    windowEl.style.left = `${Math.round(left)}px`;
    windowEl.style.top = `${Math.round(top)}px`;
    windowEl.style.right = 'auto';
    windowEl.style.bottom = 'auto';
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
