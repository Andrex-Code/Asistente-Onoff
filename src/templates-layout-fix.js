(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const SUBVIEW_SELECTOR = '.onoff-panel-subview';
  const LAUNCHER_SELECTOR = '.ikono-translator-launcher';
  const MOBILE_QUERY = '(max-width: 620px)';
  const DESKTOP_WIDTH = 360;
  const MIN_WIDTH = 280;
  const MARGIN = 8;
  const GAP = 10;

  let panel;
  let subview;
  let launcher;
  let observer;
  let scheduled = false;
  let resizeObserver;

  init();

  function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    subview = document.querySelector(SUBVIEW_SELECTOR);
    launcher = document.querySelector(LAUNCHER_SELECTOR);

    if (!panel || !subview) {
      window.setTimeout(init, 250);
      return;
    }

    bindTemplateButton();
    observeLayout();
    schedulePosition();
  }

  function bindTemplateButton() {
    const button = panel.querySelector('[data-action="templates"]');
    if (!button || button.dataset.onoffTemplatesLayoutBound === 'true') return;
    button.dataset.onoffTemplatesLayoutBound = 'true';
    button.addEventListener('click', () => {
      [0, 40, 120, 220].forEach((delay) => window.setTimeout(schedulePosition, delay));
    }, true);
  }

  function observeLayout() {
    observer?.disconnect();
    observer = new MutationObserver(() => {
      if (!panel?.isConnected || !subview?.isConnected) {
        window.setTimeout(init, 100);
        return;
      }
      bindTemplateButton();
      schedulePosition();
    });

    observer.observe(panel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'style', 'class']
    });

    if (launcher) {
      observer.observe(launcher, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }

    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(schedulePosition);
    resizeObserver.observe(panel);

    window.addEventListener('resize', schedulePosition);
    document.addEventListener('scroll', handleDocumentScroll, true);
  }

  function handleDocumentScroll(event) {
    if (subview?.contains(event.target)) return;
    schedulePosition();
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
    if (!isSubviewVisible()) return;

    const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    const panelRect = panel.getBoundingClientRect();
    const mobile = window.matchMedia(MOBILE_QUERY).matches;

    const availableViewportHeight = Math.max(180, viewportHeight - MARGIN * 2);
    const width = mobile
      ? Math.max(240, viewportWidth - MARGIN * 2)
      : clamp(DESKTOP_WIDTH, MIN_WIDTH, Math.max(MIN_WIDTH, viewportWidth - MARGIN * 2));

    subview.style.width = `${Math.round(width)}px`;
    subview.style.height = 'auto';
    subview.style.maxHeight = `${Math.round(availableViewportHeight)}px`;
    subview.style.right = 'auto';
    subview.style.bottom = 'auto';

    if (mobile) {
      subview.dataset.onoffPlacement = 'mobile';
      setPosition(MARGIN, MARGIN);
      return;
    }

    const measuredHeight = Math.min(
      Math.max(160, subview.scrollHeight || subview.getBoundingClientRect().height || 160),
      availableViewportHeight
    );

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

    const alignedTop = panelRect.top;
    const top = clamp(
      alignedTop,
      MARGIN,
      Math.max(MARGIN, viewportHeight - measuredHeight - MARGIN)
    );

    subview.dataset.onoffPlacement = placement;
    setPosition(left, top);
  }

  function setPosition(left, top) {
    subview.style.left = `${Math.round(left)}px`;
    subview.style.top = `${Math.round(top)}px`;
  }

  function isSubviewVisible() {
    if (!panel || !subview || panel.hidden || !subview.children.length) return false;
    const panelStyle = getComputedStyle(panel);
    const subviewStyle = getComputedStyle(subview);
    return panelStyle.display !== 'none' && subviewStyle.display !== 'none';
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
