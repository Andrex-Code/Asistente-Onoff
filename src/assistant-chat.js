(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const HISTORY_KEY = 'onoffAssistantHistory';
  const POSITION_KEY = 'onoffAssistantPosition';
  let observedPanel = null;
  let panelObserver = null;
  let assistantWindow = null;
  let messagesBox = null;
  let input = null;
  let status = null;
  let conversation = [];
  let history = [];
  let dragState = null;

  init();

  function init() {
    const panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }
    observePanel(panel);
    ensureAssistantButton(panel);
  }

  function observePanel(panel) {
    if (observedPanel === panel) return;
    observedPanel = panel;
    panelObserver?.disconnect();
    panelObserver = new MutationObserver(() => ensureAssistantButton(panel));
    panelObserver.observe(panel, { childList: true });
  }

  function ensureAssistantButton(panel) {
    if (!panel?.isConnected) {
      window.setTimeout(init, 250);
      return;
    }
    let button = panel.querySelector('[data-action="assistant-chat"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'assistant-chat';
      button.innerHTML = '<span>Asistente de conversación</span><span class="onoff-chevron">›</span>';
      const subview = panel.querySelector('[data-subview]');
      if (subview) panel.insertBefore(button, subview);
      else panel.appendChild(button);
    }
    if (button.dataset.onoffAssistantBound === 'true') return;
    button.dataset.onoffAssistantBound = 'true';
    button.addEventListener('click', toggleAssistant);
  }

  async function toggleAssistant() {
    if (!assistantWindow) buildWindow();
    if (!assistantWindow.hidden) {
      assistantWindow.hidden = true;
      return;
    }
    assistantWindow.hidden = false;
    assistantWindow.classList.remove('is-minimized');
    await applySavedPosition();
    refreshConversation();
    const stored = await chrome.storage.local.get(HISTORY_KEY);
    history = Array.isArray(stored[HISTORY_KEY]) ? stored[HISTORY_KEY].slice(-12) : [];
    renderHistory();
    input.focus();
  }

  function buildWindow() {
    assistantWindow = document.createElement('section');
    assistantWindow.className = 'onoff-assistant-window';
    assistantWindow.hidden = true;
    assistantWindow.innerHTML = `
      <header class="onoff-assistant-header" title="Arrastre para mover">
        <div><strong>Asistente ONOFF</strong><small id="onoffAssistantStatus"></small></div>
        <div class="onoff-assistant-window-actions">
          <button type="button" data-window-action="minimize" aria-label="Minimizar" title="Minimizar">−</button>
          <button type="button" data-window-action="close" aria-label="Cerrar" title="Cerrar">×</button>
        </div>
      </header>
      <div class="onoff-assistant-content">
        <div class="onoff-assistant-actions">
          <button type="button" data-mode="interpret">¿Qué quiso decir?</button>
          <button type="button" data-mode="reply">Sugerir respuesta</button>
          <button type="button" data-mode="summary">Resumir caso</button>
          <button type="button" data-mode="next">Siguiente paso</button>
        </div>
        <div class="onoff-assistant-messages"></div>
        <form class="onoff-assistant-form">
          <textarea rows="2" placeholder="Pregunte sobre la conversación actual..." required></textarea>
          <button type="submit">Enviar</button>
        </form>
        <button type="button" class="onoff-assistant-refresh" title="Volver a leer los mensajes visibles">
          <span aria-hidden="true">↻</span><span>Actualizar chat</span>
        </button>
      </div>
    `;
    document.body.appendChild(assistantWindow);
    status = assistantWindow.querySelector('#onoffAssistantStatus');
    messagesBox = assistantWindow.querySelector('.onoff-assistant-messages');
    input = assistantWindow.querySelector('textarea');

    assistantWindow.querySelector('[data-window-action="close"]').addEventListener('click', () => {
      assistantWindow.hidden = true;
    });
    assistantWindow.querySelector('[data-window-action="minimize"]').addEventListener('click', () => {
      assistantWindow.classList.toggle('is-minimized');
      const minimized = assistantWindow.classList.contains('is-minimized');
      assistantWindow.querySelector('[data-window-action="minimize"]').textContent = minimized ? '□' : '−';
      assistantWindow.querySelector('[data-window-action="minimize"]').title = minimized ? 'Restaurar' : 'Minimizar';
    });
    assistantWindow.querySelector('.onoff-assistant-refresh').addEventListener('click', refreshConversation);
    assistantWindow.querySelector('.onoff-assistant-form').addEventListener('submit', submitQuestion);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        assistantWindow.querySelector('.onoff-assistant-form').requestSubmit();
      }
    });
    assistantWindow.querySelector('.onoff-assistant-actions').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;
      const prompts = {
        interpret: 'Explique de forma clara qué quiso decir el cliente en sus mensajes más recientes.',
        reply: 'Redacte una respuesta profesional y lista para copiar al cliente, basada en la conversación y la base de conocimiento.',
        summary: 'Resuma el caso actual, indicando problema, datos relevantes y acciones realizadas.',
        next: 'Indique cuál debería ser el siguiente paso del asesor y qué información falta, si aplica.'
      };
      askAssistant(prompts[button.dataset.mode], button.dataset.mode);
    });
    assistantWindow.querySelector('.onoff-assistant-header').addEventListener('pointerdown', startDrag);
    window.addEventListener('resize', keepWindowInsideViewport);
  }

  function submitQuestion(event) {
    event.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    input.value = '';
    askAssistant(question, 'free');
  }

  function refreshConversation() {
    conversation = readConversation();
    status.textContent = `${conversation.length} mensajes visibles · actualizado ahora`;
    const button = assistantWindow?.querySelector('.onoff-assistant-refresh');
    if (button) {
      button.classList.add('is-updated');
      window.setTimeout(() => button.classList.remove('is-updated'), 900);
    }
  }

  function readConversation() {
    const seen = new Set();
    return [...document.querySelectorAll('li.mx_EventTile[data-event-id]')]
      .map((element) => {
        const id = element.dataset.eventId;
        const self = element.getAttribute('data-self');
        if (!id || seen.has(id) || (self !== 'true' && self !== 'false')) return null;
        if (element.matches('.mx_EventTile_info') || element.querySelector('.mx_MNoticeBody, .mx_EventTile_info, [data-event-type*="notice"]')) return null;
        seen.add(id);
        const text = element.querySelector('.mx_EventTile_body.translate')?.textContent?.trim();
        const hasImage = Boolean(element.querySelector('.mx_MImageBody'));
        const hasAudio = Boolean(element.querySelector('audio, .mx_MAudioBody'));
        if (!text && !hasImage && !hasAudio) return null;
        return {
          id,
          role: self === 'true' ? 'advisor' : 'customer',
          text: text || (hasAudio ? '[Se envió un audio]' : '[Se envió una imagen]')
        };
      })
      .filter(Boolean)
      .slice(-40);
  }

  async function askAssistant(question, mode) {
    const userEntry = { role: 'user', content: question };
    history.push(userEntry);
    appendMessage(userEntry);
    const loading = appendMessage({ role: 'assistant', content: 'Analizando la conversación…', loading: true });
    try {
      const settings = await chrome.storage.sync.get(['backendUrl']);
      const backendUrl = String(settings.backendUrl || 'https://asistente-onoff.vercel.app').replace(/\/$/, '');
      const response = await fetch(`${backendUrl}/api/assistant-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, mode, conversation, history: history.slice(-8) })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `Backend respondió ${response.status}.`);
      loading.remove();
      const entry = {
        role: 'assistant',
        content: data.answer,
        knowledgeUsed: Boolean(data.knowledgeUsed),
        knowledgeSources: Array.isArray(data.knowledgeSources) ? data.knowledgeSources : [],
        configVersion: data.configVersion || null
      };
      history.push(entry);
      appendMessage(entry);
      history = history.slice(-12);
      await chrome.storage.local.set({ [HISTORY_KEY]: history });
    } catch (error) {
      loading.remove();
      appendMessage({ role: 'assistant', content: `No fue posible consultar el asistente: ${error.message}`, error: true });
    }
  }

  function renderHistory() {
    messagesBox.innerHTML = '';
    if (!history.length) {
      const empty = document.createElement('div');
      empty.className = 'onoff-assistant-empty';
      empty.textContent = 'La conversación actual está lista para analizarse.';
      messagesBox.appendChild(empty);
      return;
    }
    history.forEach(appendMessage);
  }

  function appendMessage(entry) {
    const article = document.createElement('article');
    article.className = `onoff-assistant-message ${entry.role === 'assistant' ? 'is-assistant' : 'is-user'}${entry.error ? ' is-error' : ''}`;
    const text = document.createElement('div');
    text.textContent = entry.content;
    article.appendChild(text);
    if (entry.role === 'assistant' && !entry.loading && !entry.error) {
      const meta = document.createElement('small');
      meta.className = `onoff-assistant-source ${entry.knowledgeUsed ? 'has-source' : 'no-source'}`;
      meta.textContent = entry.knowledgeUsed
        ? `Base consultada${entry.knowledgeSources?.length ? `: ${entry.knowledgeSources.join(', ')}` : ''}`
        : 'Sin coincidencia directa en la base de conocimiento';
      article.appendChild(meta);

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copiar respuesta';
      copy.addEventListener('click', async () => {
        await navigator.clipboard.writeText(entry.content);
        copy.textContent = 'Copiada';
        setTimeout(() => { copy.textContent = 'Copiar respuesta'; }, 1400);
      });
      article.appendChild(copy);
    }
    messagesBox.appendChild(article);
    messagesBox.scrollTop = messagesBox.scrollHeight;
    return article;
  }

  async function applySavedPosition() {
    const stored = await chrome.storage.local.get(POSITION_KEY);
    const position = stored[POSITION_KEY];
    if (!position || !Number.isFinite(position.left) || !Number.isFinite(position.top)) return;
    assistantWindow.style.left = `${position.left}px`;
    assistantWindow.style.top = `${position.top}px`;
    assistantWindow.style.right = 'auto';
    assistantWindow.style.bottom = 'auto';
    keepWindowInsideViewport();
  }

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = assistantWindow.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    assistantWindow.classList.add('is-dragging');
    event.currentTarget.setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', moveDrag, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    const rect = assistantWindow.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
    const left = clamp(event.clientX - dragState.offsetX, 8, maxLeft);
    const top = clamp(event.clientY - dragState.offsetY, 8, maxTop);
    assistantWindow.style.left = `${left}px`;
    assistantWindow.style.top = `${top}px`;
    assistantWindow.style.right = 'auto';
    assistantWindow.style.bottom = 'auto';
  }

  async function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;
    dragState = null;
    assistantWindow.classList.remove('is-dragging');
    window.removeEventListener('pointermove', moveDrag, true);
    window.removeEventListener('pointerup', endDrag, true);
    window.removeEventListener('pointercancel', endDrag, true);
    const rect = assistantWindow.getBoundingClientRect();
    await chrome.storage.local.set({ [POSITION_KEY]: { left: Math.round(rect.left), top: Math.round(rect.top) } });
  }

  function keepWindowInsideViewport() {
    if (!assistantWindow || assistantWindow.hidden) return;
    const rect = assistantWindow.getBoundingClientRect();
    const left = clamp(rect.left, 8, Math.max(8, window.innerWidth - rect.width - 8));
    const top = clamp(rect.top, 8, Math.max(8, window.innerHeight - rect.height - 8));
    assistantWindow.style.left = `${left}px`;
    assistantWindow.style.top = `${top}px`;
    assistantWindow.style.right = 'auto';
    assistantWindow.style.bottom = 'auto';
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
