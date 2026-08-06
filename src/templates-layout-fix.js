(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const SUBVIEW_SELECTOR = '.onoff-panel-subview';
  const MOBILE_QUERY = '(max-width: 620px)';
  const DESKTOP_WIDTH = 360;
  const MIN_WIDTH = 280;
  const MIN_HEIGHT = 180;
  const MARGIN = 8;
  const GAP = 10;

  let panel;
  let panelObserver;
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
      panelObserver?.disconnect();
      panel = nextPanel;
      panelObserver = new MutationObserver(handlePanelMutation);
      panelObserver.observe(panel, {
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
    document.addEventListener('scroll', handleDocumentScroll, true);
  }

  function handlePanelMutation() {
    bindTemplateButton();
    schedulePositionSeries();
  }

  function bindTemplateButton() {
    const button = panel?.querySelector('[data-action="templates"]');
    if (!button || button.dataset.onoffTemplatesViewportBound === 'true') return;
    button.dataset.onoffTemplatesViewportBound = 'true';
    button.addEventListener('click', schedulePositionSeries, true);
  }

  function handleDocumentScroll(event) {
    const subview = getSubview();
    if (subview?.contains(event.target)) return;
    schedulePosition();
  }

  function schedulePositionSeries() {
    [0, 35, 90, 180, 320].forEach((delay) => {
      window.setTimeout(schedulePosition, delay);
    });
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
    if (!isSubviewVisible(subview)) return;

    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const panelRect = panel.getBoundingClientRect();
    const mobile = window.matchMedia(MOBILE_QUERY).matches;
    const maximumHeight = Math.max(MIN_HEIGHT, viewportHeight - MARGIN * 2);
    const width = mobile
      ? Math.max(240, viewportWidth - MARGIN * 2)
      : clamp(DESKTOP_WIDTH, MIN_WIDTH, Math.max(MIN_WIDTH, viewportWidth - MARGIN * 2));

    setImportant(subview, 'position', 'fixed');
    setImportant(subview, 'box-sizing', 'border-box');
    setImportant(subview, 'width', `${Math.round(width)}px`);
    setImportant(subview, 'height', 'auto');
    setImportant(subview, 'overflow-x', 'hidden');
    setImportant(subview, 'overflow-y', 'auto');
    setImportant(subview, 'right', 'auto');
    setImportant(subview, 'bottom', 'auto');

    const naturalHeight = measureNaturalHeight(subview);
    const desiredHeight = clamp(naturalHeight, MIN_HEIGHT, maximumHeight);
    setImportant(subview, 'max-height', `${Math.round(desiredHeight)}px`);

    if (mobile) {
      subview.dataset.onoffPlacement = 'mobile';
      setPosition(subview, MARGIN, MARGIN);
      verifyViewportFit(subview, viewportWidth, viewportHeight);
      return;
    }

    const roomRight = viewportWidth - panelRect.right - GAP - MARGIN;
    const roomLeft = panelRect.left - GAP - MARGIN;
    let left;
    let placement;

    if (roomRight >= width) {
      left = panelRect.right + GAP;
      placement = 'right';
    } else if (roomLeft >= width) {
      left = panelRect.left - width - GAP;
      placement = 'left';
    } else if (roomRight >= roomLeft) {
      left = panelRect.right + GAP;
      placement = 'right-clamped';
    } else {
      left = panelRect.left - width - GAP;
      placement = 'left-clamped';
    }

    left = clamp(left, MARGIN, Math.max(MARGIN, viewportWidth - width - MARGIN));
    const top = clamp(
      panelRect.top,
      MARGIN,
      Math.max(MARGIN, viewportHeight - desiredHeight - MARGIN)
    );

    subview.dataset.onoffPlacement = placement;
    setPosition(subview, left, top);
    verifyViewportFit(subview, viewportWidth, viewportHeight);
  }

  function measureNaturalHeight(subview) {
    const style = getComputedStyle(subview);
    const paddingTop = parsePixels(style.paddingTop);
    const paddingBottom = parsePixels(style.paddingBottom);
    const borderTop = parsePixels(style.borderTopWidth);
    const borderBottom = parsePixels(style.borderBottomWidth);
    const rowGap = parsePixels(style.rowGap || style.gap);
    const children = [...subview.children].filter((child) => getComputedStyle(child).display !== 'none');

    const childrenHeight = children.reduce((sum, child) => {
      const rectHeight = child.getBoundingClientRect().height;
      const offsetHeight = child.offsetHeight;
      return sum + Math.max(rectHeight, offsetHeight, child.tagName === 'BUTTON' ? 42 : 0);
    }, 0);

    const measured = paddingTop + paddingBottom + borderTop + borderBottom
      + childrenHeight
      + Math.max(0, children.length - 1) * rowGap;

    const fallback = 72 + Math.max(0, children.length - 1) * 54;
    return Math.max(MIN_HEIGHT, measured, fallback);
  }

  function verifyViewportFit(subview, viewportWidth, viewportHeight) {
    window.requestAnimationFrame(() => {
      if (!isSubviewVisible(subview)) return;
      const rect = subview.getBoundingClientRect();
      let left = rect.left;
      let top = rect.top;

      if (rect.right > viewportWidth - MARGIN) left -= rect.right - (viewportWidth - MARGIN);
      if (left < MARGIN) left = MARGIN;
      if (rect.bottom > viewportHeight - MARGIN) top -= rect.bottom - (viewportHeight - MARGIN);
      if (top < MARGIN) top = MARGIN;

      setPosition(subview, left, top);

      const finalAvailableHeight = Math.max(
        MIN_HEIGHT,
        viewportHeight - Math.round(top) - MARGIN
      );
      setImportant(subview, 'max-height', `${finalAvailableHeight}px`);
    });
  }

  function getSubview() {
    if (!panel?.isConnected) panel = document.querySelector(PANEL_SELECTOR);
    return panel?.querySelector(SUBVIEW_SELECTOR) || null;
  }

  function isSubviewVisible(subview) {
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

  function parsePixels(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
