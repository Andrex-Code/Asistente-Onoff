(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const SUBVIEW_SELECTOR = '.onoff-panel-subview';
  let observedPanel = null;

  function init() {
    const panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }
    if (observedPanel === panel) return;
    observedPanel = panel;

    const observer = new MutationObserver(() => {
      enableFollowUpFields(panel);
      positionSideWindow(panel);
    });
    observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });

    panel.addEventListener('click', () => window.setTimeout(() => positionSideWindow(panel), 0));
    window.addEventListener('resize', () => positionSideWindow(panel));
    window.addEventListener('scroll', () => positionSideWindow(panel), true);

    enableFollowUpFields(panel);
    positionSideWindow(panel);
  }

  function enableFollowUpFields(panel) {
    panel.querySelectorAll('.onoff-follow-form input').forEach((input) => {
      if (input.dataset.onoffInputReady === 'true') return;
      input.dataset.onoffInputReady = 'true';

      input.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      });
      input.addEventListener('pointerdown', (event) => {
        event.stopPropagation();
      });
      input.addEventListener('click', (event) => {
        event.stopPropagation();
        input.focus();
      });
      input.addEventListener('keydown', (event) => event.stopPropagation());
      input.addEventListener('paste', (event) => event.stopPropagation());
      input.addEventListener('contextmenu', (event) => event.stopPropagation());
    });
  }

  function positionSideWindow(panel) {
    const subview = panel.querySelector(SUBVIEW_SELECTOR);
    if (!subview || !subview.textContent.trim() || panel.hidden) {
      if (subview) {
        subview.style.left = '';
        subview.style.top = '';
        subview.style.right = '';
      }
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const gap = 10;
    const width = Math.min(340, Math.max(280, window.innerWidth - 24));
    const estimatedHeight = Math.min(subview.scrollHeight || 420, window.innerHeight - 24);

    const fitsLeft = panelRect.left >= width + gap + 8;
    const left = fitsLeft
      ? panelRect.left - width - gap
      : Math.min(panelRect.right + gap, window.innerWidth - width - 8);
    const top = Math.min(
      Math.max(panelRect.top, 8),
      Math.max(8, window.innerHeight - estimatedHeight - 8)
    );

    subview.style.width = `${width}px`;
    subview.style.left = `${Math.round(left)}px`;
    subview.style.top = `${Math.round(top)}px`;
    subview.style.right = 'auto';
  }

  init();
})();
