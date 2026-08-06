(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const LAUNCHER_SELECTOR = '.ikono-translator-launcher';
  const VERSION = '1';

  const BUTTONS = {
    translate: {
      label: 'Traducir selección',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3C9.6 5.5 8.4 8.5 8.4 12S9.6 18.5 12 21"/><path d="m16.5 7.5 2-2 2 2M7.5 16.5l-2 2-2-2"/></svg>'
    },
    falar: {
      label: 'Falar selección',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8l-5 4v-4H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><path d="M8 9h8M8 12.5h5"/></svg>'
    },
    improve: {
      label: 'Mejorar texto seleccionado',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.25 3.75L17 8l-3.75 1.25L12 13l-1.25-3.75L7 8l3.75-1.25L12 3Z"/><path d="m18.5 13 .75 2.25L21.5 16l-2.25.75L18.5 19l-.75-2.25L15.5 16l2.25-.75.75-2.25ZM5.5 13l.75 2.25L8.5 16l-2.25.75L5.5 19l-.75-2.25L2.5 16l2.25-.75L5.5 13Z"/></svg>'
    },
    audio: {
      label: 'Cargar audio',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13v-2a8 8 0 0 1 16 0v2"/><path d="M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2ZM20 13h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Z"/><path d="M17 19c0 1.1-.9 2-2 2h-2"/></svg>'
    },
    'bitrix-search': {
      label: 'Buscar en Bitrix',
      chevron: true,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/><path d="M8 8h5M8 11h3"/></svg>'
    },
    templates: {
      label: 'Plantillas',
      chevron: true,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M4 7v14h11M10 12h6M10 16h6"/></svg>'
    },
    'assistant-chat': {
      label: 'Asistente de conversación',
      chevron: true,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="7" width="16" height="12" rx="4"/><path d="M9 11h.01M15 11h.01M9 15h6M12 7V4M9.5 4h5"/></svg>'
    },
    notebook: {
      label: 'Bloc de notas',
      chevron: true,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l3 3v15H5z"/><path d="M16 3v4h4M8 11h8M8 15h8M8 19h5"/></svg>'
    }
  };

  const TOOL_WINDOWS = {
    'bitrix-search': '.onoff-bitrix-search',
    templates: '.onoff-templates-window',
    'assistant-chat': '.onoff-assistant-window',
    notebook: '.onoff-notebook-host'
  };

  let panel;
  let panelObserver;
  let decorateFrame;
  let stateTimer;
  let launcherBound = false;

  init();

  function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }

    scheduleDecorate();
    panelObserver?.disconnect();
    panelObserver = new MutationObserver(scheduleDecorate);
    panelObserver.observe(panel, { childList: true, subtree: true });

    stateTimer = window.setInterval(syncState, 500);
    window.addEventListener('resize', syncState);
    document.addEventListener('visibilitychange', syncState);
  }

  function scheduleDecorate() {
    window.cancelAnimationFrame(decorateFrame);
    decorateFrame = window.requestAnimationFrame(() => {
      decoratePanel();
      window.setTimeout(decoratePanel, 50);
    });
  }

  function decoratePanel() {
    if (!panel?.isConnected) return;
    decorateToggle();
    Object.entries(BUTTONS).forEach(([action, config]) => decorateButton(action, config));
    ensureOrder();
    bindLauncher();
    syncState();
  }

  function decorateToggle() {
    const label = panel.querySelector('.ikono-translator-panel-check');
    const input = label?.querySelector('input');
    if (!label || !input) return;
    let copy = label.querySelector('.onoff-toggle-copy');
    if (!copy) {
      copy = [...label.children].find((child) => child.tagName === 'SPAN') || document.createElement('span');
      copy.className = 'onoff-toggle-copy';
      if (!copy.isConnected) label.appendChild(copy);
    }
    if (!copy.querySelector('.onoff-menu-icon')) {
      copy.innerHTML = `<span class="onoff-menu-icon">${toggleIcon()}</span><span>Botones flotantes</span>`;
    }
    label.dataset.onoffPolishVersion = VERSION;
  }

  function decorateButton(action, config) {
    const button = panel.querySelector(`:scope > button[data-action="${action}"]`);
    if (!button) return;
    const hasIcon = Boolean(button.querySelector('.onoff-menu-icon'));
    const label = button.querySelector('.onoff-menu-label')?.textContent;
    if (hasIcon && label === config.label) return;
    button.classList.add('onoff-menu-button');
    button.innerHTML = `
      <span class="onoff-menu-leading">
        <span class="onoff-menu-icon">${config.icon}</span>
        <span class="onoff-menu-label">${config.label}</span>
      </span>
      ${config.chevron ? '<span class="onoff-chevron" aria-hidden="true">›</span>' : ''}
    `;
  }

  function ensureOrder() {
    let divider = panel.querySelector(':scope > .onoff-menu-divider');
    if (!divider) {
      divider = document.createElement('div');
      divider.className = 'onoff-menu-divider';
      divider.setAttribute('aria-hidden', 'true');
    }

    const find = (selector) => panel.querySelector(`:scope > ${selector}`);
    const desired = [
      find('.ikono-translator-panel-check'),
      find('button[data-action="translate"]'),
      find('button[data-action="falar"]'),
      find('button[data-action="improve"]'),
      find('button[data-action="audio"]'),
      divider,
      find('button[data-action="bitrix-search"]'),
      find('button[data-action="templates"]'),
      find('button[data-action="assistant-chat"]'),
      find('button[data-action="notebook"]'),
      find('.ikono-translator-audio-input'),
      find('[data-subview]')
    ].filter(Boolean);

    const remaining = [...panel.children].filter((node) => !desired.includes(node));
    const finalOrder = [...desired, ...remaining];
    const current = [...panel.children];
    const alreadyOrdered = finalOrder.length === current.length && finalOrder.every((node, index) => current[index] === node);
    if (alreadyOrdered) return;
    finalOrder.forEach((node) => panel.appendChild(node));
  }

  function bindLauncher() {
    const launcher = document.querySelector(LAUNCHER_SELECTOR);
    if (!launcher || launcherBound) return;
    launcherBound = true;
    launcher.dataset.onoffTooltip = 'Asistente ONOFF';
    launcher.addEventListener('pointerup', () => {
      launcher.classList.remove('is-clicked');
      void launcher.offsetWidth;
      launcher.classList.add('is-clicked');
      window.setTimeout(() => launcher.classList.remove('is-clicked'), 450);
    });
  }

  function syncState() {
    if (!panel?.isConnected) return;
    const launcher = document.querySelector(LAUNCHER_SELECTOR);
    launcher?.classList.toggle('is-panel-open', !panel.hidden && getComputedStyle(panel).display !== 'none');

    Object.entries(TOOL_WINDOWS).forEach(([action, selector]) => {
      const windowEl = document.querySelector(selector);
      const visible = windowEl && !windowEl.hidden && getComputedStyle(windowEl).display !== 'none';
      panel.querySelector(`button[data-action="${action}"]`)?.classList.toggle('is-active', Boolean(visible));
    });
  }

  function toggleIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="3"/><path d="M8 9h8M8 13h5"/><circle cx="16" cy="15" r="1.5"/></svg>';
  }
})();
