(() => {
  const LAUNCHER_SELECTOR = '.ikono-translator-launcher';
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const GAP = 10;
  let observer;
  let scheduled = false;

  init();

  function init() {
    const launcher = document.querySelector(LAUNCHER_SELECTOR);
    const panel = document.querySelector(PANEL_SELECTOR);
    if (!launcher || !panel) {
      window.setTimeout(init, 250);
      return;
    }

    observer?.disconnect();
    observer = new MutationObserver(schedulePosition);
    observer.observe(panel, { attributes: true, attributeFilter: ['hidden', 'style'], childList: true, subtree: true });
    observer.observe(launcher, { attributes: true, attributeFilter: ['style', 'class'] });

    window.addEventListener('resize', schedulePosition);
    window.addEventListener('scroll', schedulePosition, true);
    launcher.addEventListener('click', () => {
      window.requestAnimationFrame(schedulePosition);
      window.setTimeout(schedulePosition, 30);
    });

    schedulePosition();
  }

  function schedulePosition() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      positionPanel();
    });
  }

  function positionPanel() {
    const launcher = document.querySelector(LAUNCHER_SELECTOR);
    const panel = document.querySelector(PANEL_SELECTOR);
    if (!launcher || !panel || panel.hidden) return;

    const launcherRect = launcher.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 286;
    const panelHeight = Math.min(panel.offsetHeight || 420, window.innerHeight - 16);
    const spaceRight = window.innerWidth - launcherRect.right;
    const spaceLeft = launcherRect.left;

    let left;
    if (spaceRight >= panelWidth + GAP + 8) {
      left = launcherRect.right + GAP;
    } else if (spaceLeft >= panelWidth + GAP + 8) {
      left = launcherRect.left - panelWidth - GAP;
    } else {
      left = clamp(launcherRect.right + GAP, 8, window.innerWidth - panelWidth - 8);
    }

    const idealTop = launcherRect.top + (launcherRect.height - panelHeight) / 2;
    const top = clamp(idealTop, 8, window.innerHeight - panelHeight - 8);

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
