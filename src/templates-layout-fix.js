(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const SUBVIEW_SELECTOR = '.onoff-panel-subview';
  const MOBILE_QUERY = '(max-width: 620px)';
  const DESKTOP_WIDTH = 360;
  const DESKTOP_HEIGHT = 480;
  const MARGIN = 8;
  const GAP = 10;

  let panel;
  let observer;
  let scheduled = false;
  let listenersBound = false;

  init();

  function init() {
    const nextPanel = document.querySelector(PANEL_SELECTOR);
    if (!nextPanel) {
      window.setTimeout(init, 250);
      return;
    }

    if (panel !== nextPanel) {
      observer?.disconnect();
      panel = nextPanel;
      observer = new MutationObserver(() => {
        bindTemplateButton();
        schedulePositionSeries();
      });
      observer.observe(panel, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['hidden', 'style', 'class']
      });
    }

    bindTemplateButton();
    bindGlobalListeners();
    schedulePositionSeries();
  }

  function bindGlobalListeners() {
    if (listenersBound) return;
    listenersBound = true;
    window.addEventListener('resize', schedulePositionSeries);
    document.addEventListener('scroll', (event) => {
      const subview = getSubview();
      if (subview?.contains(event.target)) return;
      schedulePosition();
    }, true);
  }

  function bindTemplateButton() {
    const button = panel?.querySelector('[data-action="templates"]');
    if (!button || button.dataset.onoffTemplatesScrollBound === 'true') return;
    button.dataset.onoffTemplatesScrollBound = 'true';
    button.addEventListener('click', schedulePositionSeries, true);
  }

  function schedulePositionSeries() {
    [0, 40, 100, 180].forEach((delay) => window.setTimeout(schedulePosition, delay));
  }

  function schedulePosition() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      positionSubview();
    });
  }

  function positionSubview() {
    const subview = getSubview();
    if (!isVisible(subview)) return;

    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    const panelRect = panel.getBoundingClientRect();

    const width = mobile
      ? Math.max(240, viewportWidth - MARGIN * 2)
      : Math.min(DESKTOP_WIDTH, viewportWidth - MARGIN * 2);
    const height = mobile
      ? viewportHeight - MARGIN * 2
      : Math.min(DESKTOP_HEIGHT, viewportHeight - MARGIN * 2);

    setImportant(subview, 'position', 'fixed');
    setImportant(subview, 'width', `${Math.round(width)}px`);
    setImportant(subview, 'height', `${Math.round(height)}px`);
    setImportant(subview, 'max-height', `${Math.round(height)}px`);
    setImportant(subview, 'overflow', 'hidden');
    setImportant(subview, 'right', 'auto');
    setImportant(subview, 'bottom', 'auto');

    if (mobile) {
      setPosition(subview, MARGIN, MARGIN);
      return;
    }

    const roomRight = viewportWidth - panelRect.right - GAP - MARGIN;
    const roomLeft = panelRect.left - GAP - MARGIN;
    let left = roomRight >= width || roomRight >= roomLeft
      ? panelRect.right + GAP
      : panelRect.left - width - GAP;

    left = clamp(left, MARGIN, Math.max(MARGIN, viewportWidth - width - MARGIN));
    const top = clamp(
      panelRect.top,
      MARGIN,
      Math.max(MARGIN, viewportHeight - height - MARGIN)
    );

    setPosition(subview, left, top);
  }

  function getSubview() {
    if (!panel?.isConnected) panel = document.querySelector(PANEL_SELECTOR);
    return panel?.querySelector(SUBVIEW_SELECTOR) || null;
  }

  function isVisible(subview) {
    if (!panel || !subview || panel.hidden || !subview.children.length) return false;
    return getComputedStyle(panel).display !== 'none' && getComputedStyle(subview).display !== 'none';
  }

  function setPosition(element, left, top) {
    setImportant(element, 'left', `${Math.round(left)}px`);
    setImportant(element, 'top', `${Math.round(top)}px`);
    setImportant(element, 'right', 'auto');
    setImportant(element, 'bottom', 'auto');
  }

  function setImportant(element, property, value) {
    element.style.setProperty(property, value, 'important');
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
