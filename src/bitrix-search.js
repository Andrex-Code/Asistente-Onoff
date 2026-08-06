(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const BUTTON_ACTION = 'bitrix-search';
  let observedPanel = null;
  let panelObserver = null;
  let searchWindow = null;
  let searchInput = null;
  let resultBox = null;
  let statusBox = null;
  let searchButton = null;
  let requestController = null;

  init();

  function init() {
    const panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }
    observePanel(panel);
    ensureMenuButton(panel);
  }

  function observePanel(panel) {
    if (observedPanel === panel) return;
    observedPanel = panel;
    panelObserver?.disconnect();
    panelObserver = new MutationObserver(() => ensureMenuButton(panel));
    panelObserver.observe(panel, { childList: true });
    window.addEventListener('resize', positionWindow);
    window.addEventListener('scroll', positionWindow, true);
  }

  function ensureMenuButton(panel) {
    if (!panel?.isConnected) return window.setTimeout(init, 250);
    let button = panel.querySelector(`[data-action="${BUTTON_ACTION}"]`);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = BUTTON_ACTION;
      button.innerHTML = '<span>Buscar cliente / TC</span><span class="onoff-chevron">›</span>';
      const assistantButton = panel.querySelector('[data-action="assistant-chat"]');
      const subview = panel.querySelector('[data-subview]');
      panel.insertBefore(button, assistantButton || subview || null);
    }
    if (button.dataset.onoffBitrixBound === 'true') return;
    button.dataset.onoffBitrixBound = 'true';
    button.addEventListener('click', toggleSearchWindow);
  }

  function toggleSearchWindow(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!searchWindow) buildWindow();
    const willOpen = searchWindow.hidden;
    searchWindow.hidden = !willOpen;
    event.currentTarget.classList.toggle('is-active', willOpen);
    if (willOpen) {
      positionWindow();
      searchInput.focus();
      searchInput.select();
    }
  }

  function buildWindow() {
    searchWindow = document.createElement('section');
    searchWindow.className = 'onoff-bitrix-search';
    searchWindow.hidden = true;
    searchWindow.innerHTML = `
      <header>
        <div>
          <strong>Buscar negociación</strong>
          <small>Ingrese TC5900 o solo 5900</small>
        </div>
        <button type="button" data-close aria-label="Cerrar">×</button>
      </header>
      <form class="onoff-bitrix-search-form">
        <label for="onoffBitrixTc">Número de TC</label>
        <div>
          <input id="onoffBitrixTc" type="text" inputmode="numeric" autocomplete="off" placeholder="TC5900 o 5900" maxlength="32" />
          <button type="submit">Buscar</button>
        </div>
      </form>
      <div class="onoff-bitrix-status" aria-live="polite"></div>
      <div class="onoff-bitrix-results"></div>
    `;
    document.body.appendChild(searchWindow);
    searchInput = searchWindow.querySelector('input');
    resultBox = searchWindow.querySelector('.onoff-bitrix-results');
    statusBox = searchWindow.querySelector('.onoff-bitrix-status');
    searchButton = searchWindow.querySelector('button[type="submit"]');

    searchWindow.querySelector('[data-close]').addEventListener('click', closeWindow);
    searchWindow.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      runSearch();
    });

    ['mousedown', 'pointerdown', 'click', 'keydown', 'keyup', 'paste'].forEach((type) => {
      searchInput.addEventListener(type, (event) => event.stopPropagation());
    });
  }

  function closeWindow() {
    if (!searchWindow) return;
    searchWindow.hidden = true;
    observedPanel?.querySelector(`[data-action="${BUTTON_ACTION}"]`)?.classList.remove('is-active');
  }

  async function runSearch() {
    const parsed = parseTc(searchInput.value);
    if (!parsed) {
      setStatus('Ingrese una TC válida, por ejemplo TC5900 o 5900.', 'error');
      resultBox.innerHTML = '';
      searchInput.focus();
      return;
    }

    requestController?.abort();
    requestController = new AbortController();
    searchButton.disabled = true;
    searchInput.disabled = true;
    resultBox.innerHTML = '';
    setStatus(`Buscando TC${parsed} en Bitrix…`, 'loading');

    try {
      const settings = await chrome.storage.sync.get(['backendUrl']);
      const backendUrl = String(settings.backendUrl || 'https://asistente-onoff.vercel.app').replace(/\/$/, '');
      const response = await fetch(`${backendUrl}/api/bitrix/search-deal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tc: parsed }),
        signal: requestController.signal
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `El servidor respondió ${response.status}.`);

      if (!Array.isArray(data.deals) || data.deals.length === 0) {
        setStatus(`No se encontró ninguna negociación asociada a TC${parsed}.`, 'empty');
        resultBox.innerHTML = '<p class="onoff-bitrix-empty">Verifique el número e intente nuevamente.</p>';
        return;
      }

      setStatus(data.deals.length === 1
        ? `Se encontró 1 negociación para TC${parsed}.`
        : `Se encontraron ${data.deals.length} negociaciones para TC${parsed}.`, 'success');
      renderDeals(data.deals);
    } catch (error) {
      if (error?.name === 'AbortError') return;
      setStatus(error.message || 'No fue posible consultar Bitrix.', 'error');
    } finally {
      searchButton.disabled = false;
      searchInput.disabled = false;
      requestController = null;
    }
  }

  function renderDeals(deals) {
    resultBox.innerHTML = '';
    deals.forEach((deal) => {
      const card = document.createElement('article');
      card.className = 'onoff-bitrix-card';
      const title = document.createElement('div');
      title.className = 'onoff-bitrix-card-title';
      title.innerHTML = `<strong>${escapeHtml(`TC${deal.tc || ''}`)}</strong><span>${escapeHtml(deal.title || 'Negociación')}</span>`;
      card.appendChild(title);

      const details = document.createElement('dl');
      appendDetail(details, 'Estado', deal.stage || deal.stageId || 'No especificado');
      appendDetail(details, 'Cliente', deal.client || 'No especificado');
      appendDetail(details, 'Responsable', deal.responsible || 'No especificado');
      appendDetail(details, 'Última actualización', formatDate(deal.updatedAt));
      appendDetail(details, 'ID de negociación', deal.id || 'No especificado');
      card.appendChild(details);

      const actions = document.createElement('div');
      actions.className = 'onoff-bitrix-actions';
      const validUrl = isValidDealUrl(deal.url, deal.id);

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'is-primary';
      open.textContent = 'Abrir negociación';
      open.disabled = !validUrl;
      open.title = validUrl ? '' : 'Bitrix no devolvió un identificador válido.';
      open.addEventListener('click', () => {
        if (validUrl) window.open(deal.url, '_blank', 'noopener');
      });

      const copy = document.createElement('button');
      copy.type = 'button';
      copy.textContent = 'Copiar enlace';
      copy.disabled = !validUrl;
      copy.addEventListener('click', async () => {
        if (!validUrl) return;
        try {
          await navigator.clipboard.writeText(deal.url);
          const original = copy.textContent;
          copy.textContent = 'Enlace copiado';
          window.setTimeout(() => { copy.textContent = original; }, 1400);
        } catch {
          setStatus('No fue posible copiar el enlace.', 'error');
        }
      });
      actions.append(open, copy);
      card.appendChild(actions);
      resultBox.appendChild(card);
    });
  }

  function appendDetail(list, label, value) {
    const term = document.createElement('dt');
    term.textContent = label;
    const detail = document.createElement('dd');
    detail.textContent = value || 'No especificado';
    list.append(term, detail);
  }

  function setStatus(message, type) {
    statusBox.textContent = message;
    statusBox.dataset.type = type || '';
  }

  function positionWindow() {
    if (!searchWindow || searchWindow.hidden || !observedPanel || observedPanel.hidden) return;
    const panelRect = observedPanel.getBoundingClientRect();
    const gap = 10;
    const width = Math.min(420, window.innerWidth - 24);
    const height = Math.min(searchWindow.offsetHeight || 520, window.innerHeight - 16);
    const fitsLeft = panelRect.left >= width + gap + 8;
    const fitsRight = window.innerWidth - panelRect.right >= width + gap + 8;
    let left;
    if (fitsLeft) left = panelRect.left - width - gap;
    else if (fitsRight) left = panelRect.right + gap;
    else left = clamp(panelRect.left, 8, window.innerWidth - width - 8);
    const trigger = observedPanel.querySelector(`[data-action="${BUTTON_ACTION}"]`);
    const triggerTop = trigger?.getBoundingClientRect().top || panelRect.top;
    const top = clamp(triggerTop - 12, 8, window.innerHeight - height - 8);
    searchWindow.style.width = `${width}px`;
    searchWindow.style.left = `${Math.round(left)}px`;
    searchWindow.style.top = `${Math.round(top)}px`;
  }

  function parseTc(value) {
    const match = String(value || '').match(/^\s*(?:TC\s*[-:]?\s*)?(\d+)\s*$/i);
    return match ? match[1] : '';
  }

  function isValidDealUrl(value, id) {
    if (!String(id || '').trim()) return false;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && /\/crm\/deal\/details\/\d+\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  }

  function formatDate(value) {
    if (!value) return 'No especificada';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'No especificada';
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
