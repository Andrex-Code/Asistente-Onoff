(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const STATE_KEY = 'onoffAssistantHistory';
  let observedPanel = null;
  let panelObserver = null;
  let assistantWindow = null;
  let messagesBox = null;
  let input = null;
  let status = null;
  let conversation = [];
  let history = [];

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
    button.addEventListener('click', openAssistant);
  }

  async function openAssistant() {
    if (!assistantWindow) buildWindow();
    assistantWindow.hidden = false;
    conversation = readConversation();
    status.textContent = `${conversation.length} mensajes visibles detectados`;
    const stored = await chrome.storage.local.get(STATE_KEY);
    history = Array.isArray(stored[STATE_KEY]) ? stored[STATE_KEY].slice(-12) : [];
    renderHistory();
    input.focus();
  }

  function buildWindow() {
    assistantWindow = document.createElement('section');
    assistantWindow.className = 'onoff-assistant-window';
    assistantWindow.hidden = true;
    assistantWindow.innerHTML = `
      <header><div><strong>Asistente ONOFF</strong><small id="onoffAssistantStatus"></small></div><button type="button" aria-label="Cerrar">×</button></header>
      <div class="onoff-assistant-actions">
        <button type="button" data-mode="interpret">¿Qué quiso decir?</button>
        <button type="button" data-mode="reply">Sugerir respuesta</button>
        <button type="button" data-mode="summary">Resumir caso</button>
        <button type="button" data-mode="next">Siguiente paso</button>
        <button type="button" data-mode="refresh">Actualizar chat</button>
      </div>
      <div class="onoff-assistant-messages"></div>
      <form class="onoff-assistant-form"><textarea rows="2" placeholder="Pregunte sobre la conversación actual..." required></textarea><button type="submit">Enviar</button></form>
    `;
    document.body.appendChild(assistantWindow);
    status = assistantWindow.querySelector('#onoffAssistantStatus');
    messagesBox = assistantWindow.querySelector('.onoff-assistant-messages');
    input = assistantWindow.querySelector('textarea');
    assistantWindow.querySelector('header button').addEventListener('click', () => { assistantWindow.hidden = true; });
    assistantWindow.querySelector('.onoff-assistant-form').addEventListener('submit', (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) return;
      input.value = '';
      askAssistant(question, 'free');
    });
    assistantWindow.querySelector('.onoff-assistant-actions').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-mode]');
      if (!button) return;
      const mode = button.dataset.mode;
      if (mode === 'refresh') {
        conversation = readConversation();
        status.textContent = `${conversation.length} mensajes visibles detectados`;
        return;
      }
      const prompts = {
        interpret: 'Explique de forma clara qué quiso decir el cliente en sus mensajes más recientes.',
        reply: 'Redacte una respuesta profesional y lista para copiar al cliente, basada en la conversación y la base de conocimiento.',
        summary: 'Resuma el caso actual, indicando problema, datos relevantes y acciones realizadas.',
        next: 'Indique cuál debería ser el siguiente paso del asesor y qué información falta, si aplica.'
      };
      askAssistant(prompts[mode], mode);
    });
  }

  function readConversation() {
    const seen = new Set();
    return [...document.querySelectorAll('li.mx_EventTile[data-event-id]')]
      .map((element) => {
        const id = element.dataset.eventId;
        if (!id || seen.has(id)) return null;
        seen.add(id);
        const text = element.querySelector('.mx_EventTile_body.translate')?.textContent?.trim();
        const hasImage = Boolean(element.querySelector('.mx_MImageBody'));
        const hasAudio = Boolean(element.querySelector('audio, .mx_MAudioBody'));
        if (!text && !hasImage && !hasAudio) return null;
        return {
          id,
          role: element.dataset.self === 'true' ? 'advisor' : 'customer',
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
      const entry = { role: 'assistant', content: data.answer };
      history.push(entry);
      appendMessage(entry);
      history = history.slice(-12);
      await chrome.storage.local.set({ [STATE_KEY]: history });
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
})();
