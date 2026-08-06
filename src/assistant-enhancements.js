(() => {
  const HISTORY_KEY = 'onoffAssistantHistory';
  let observed;

  init();

  function init() {
    const assistant = document.querySelector('.onoff-assistant-window');
    if (!assistant) return setTimeout(init, 300);
    if (observed === assistant) return;
    observed = assistant;
    enhance(assistant);
    new MutationObserver(() => enhance(assistant)).observe(assistant, { childList: true, subtree: true });
  }

  function enhance(assistant) {
    const actions = assistant.querySelector('.onoff-assistant-window-actions');
    if (actions && !actions.querySelector('[data-clear-chat]')) {
      const clear = document.createElement('button');
      clear.type = 'button';
      clear.dataset.clearChat = 'true';
      clear.title = 'Nueva conversación';
      clear.setAttribute('aria-label', 'Nueva conversación');
      clear.textContent = '↺';
      actions.prepend(clear);
      clear.addEventListener('click', async () => {
        if (!confirm('¿Limpiar el historial del asistente?')) return;
        await chrome.storage.local.remove(HISTORY_KEY);
        const box = assistant.querySelector('.onoff-assistant-messages');
        if (box) box.innerHTML = '<div class="onoff-assistant-empty">Historial limpio. La conversación visible está lista para analizarse.</div>';
      });
    }

    const textarea = assistant.querySelector('.onoff-assistant-form textarea');
    if (textarea && !textarea.dataset.autoGrow) {
      textarea.dataset.autoGrow = 'true';
      const resize = () => {
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(120, Math.max(44, textarea.scrollHeight))}px`;
      };
      textarea.addEventListener('input', resize);
      resize();
    }

    assistant.querySelectorAll('.onoff-assistant-message').forEach((message) => {
      if (message.dataset.enhanced) return;
      message.dataset.enhanced = 'true';
      const badge = document.createElement('span');
      badge.className = 'onoff-assistant-role-badge';
      badge.textContent = message.classList.contains('is-user') ? 'Usted' : 'Asistente';
      message.prepend(badge);
    });
  }
})();
