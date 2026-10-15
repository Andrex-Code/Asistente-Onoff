(() => {
  const POSITION_KEY = 'onoffSgcSearchPosition';
  let buttonObserver;
  let displayedIdentification = '';
  let panel, searchWindow, input, results, status, submit, refreshButton, drag;
  let generation = 0;
  let busy = false;

  init();
  window.addEventListener('onoff:launcher-mounted', init);
  window.addEventListener('hashchange', clearSearch);
  window.addEventListener('popstate', clearSearch);
  window.addEventListener('pagehide', clearSearch);

  function init() {
    panel = document.querySelector('.ikono-translator-panel');
    if (!panel) return setTimeout(init, 250);
    ensureButton();
    buttonObserver?.disconnect();
    buttonObserver = new MutationObserver(ensureButton);
    buttonObserver.observe(panel, { childList: true });
  }

  function ensureButton() {
    if (!panel?.isConnected) return;
    let button = panel.querySelector(':scope > button[data-action="sgc-search"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'sgc-search';
      button.innerHTML = '<span>Buscar en SGC</span><span class="onoff-chevron">›</span>';
      const bitrix = panel.querySelector(':scope > button[data-action="bitrix-search"]');
      if (bitrix) bitrix.after(button);
      else panel.insertBefore(button, panel.querySelector('[data-subview]') || null);
    }
    if (button.dataset.onoffSgcBound === 'true') return;
    button.dataset.onoffSgcBound = 'true';
    button.addEventListener('click', toggleWindow);
  }

  async function toggleWindow(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!searchWindow) buildWindow();
    if (!searchWindow.hidden) return closeWindow();
    searchWindow.hidden = false;
    event.currentTarget.classList.add('is-active');
    const saved = (await chrome.storage.local.get(POSITION_KEY))[POSITION_KEY];
    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      searchWindow.style.left = `${saved.left}px`;
      searchWindow.style.top = `${saved.top}px`;
      searchWindow.style.right = 'auto';
      searchWindow.style.bottom = 'auto';
    }
    keepInside();
    if (!searchWindow.hidden) input.focus();
  }

  function buildWindow() {
    searchWindow = document.createElement('section');
    searchWindow.className = 'onoff-sgc-search';
    searchWindow.hidden = true;
    searchWindow.innerHTML = `
      <header class="onoff-bitrix-header onoff-sgc-header"><div><strong>Buscar en SGC</strong><small>YaDinero · Cliente y créditos por cédula</small></div><div><button type="button" data-min title="Minimizar" aria-label="Minimizar">−</button><button type="button" data-close title="Cerrar" aria-label="Cerrar">×</button></div></header>
      <div class="onoff-bitrix-content onoff-sgc-content">
        <form class="onoff-bitrix-search-form"><label for="onoff-sgc-document">Cédula del cliente</label><div><input id="onoff-sgc-document" inputmode="numeric" autocomplete="off" maxlength="40" placeholder="Número de cédula"><button type="submit">Buscar</button></div></form>
        <div class="onoff-sgc-toolbar"><span>Usa tu sesión abierta de SGC</span><div class="onoff-sgc-controls"><button type="button" data-refresh disabled>Actualizar</button><button type="button" data-clear>Limpiar</button></div></div>
        <div class="onoff-bitrix-status" role="status" aria-live="polite"></div>
        <div class="onoff-bitrix-results"></div>
        <div class="onoff-sgc-footer"><a href="https://sgc.yadinero.co/dashboard" target="_blank" rel="noopener noreferrer">Abrir SGC</a><span>Consulta de solo lectura</span></div>
      </div>`;
    document.body.appendChild(searchWindow);
    input = searchWindow.querySelector('input');
    results = searchWindow.querySelector('.onoff-bitrix-results');
    status = searchWindow.querySelector('[role="status"]');
    submit = searchWindow.querySelector('[type="submit"]');
    refreshButton = searchWindow.querySelector('[data-refresh]');
    searchWindow.querySelector('form').addEventListener('submit', event => { event.preventDefault(); void runSearch(); });
    searchWindow.querySelector('[data-close]').addEventListener('click', closeWindow);
    searchWindow.querySelector('[data-clear]').addEventListener('click', () => {
      const previous = displayedIdentification || input.value.trim();
      clearSearch();
      if (previous) void chrome.runtime.sendMessage({ type: 'ONOFF_SGC_FORGET', identification: previous }).catch(() => {});
      input.focus();
    });
    refreshButton.addEventListener('click', () => { void runSearch(true); });
    searchWindow.querySelector('[data-min]').addEventListener('click', event => {
      const minimized = searchWindow.classList.toggle('is-minimized');
      event.currentTarget.textContent = minimized ? '□' : '−';
      event.currentTarget.title = minimized ? 'Restaurar' : 'Minimizar';
      event.currentTarget.setAttribute('aria-label', event.currentTarget.title);
    });
    searchWindow.querySelector('header').addEventListener('pointerdown', startDrag);
    window.addEventListener('resize', keepInside);
    new ResizeObserver(keepInside).observe(searchWindow);
  }

  function clearSearch() {
    generation += 1;
    displayedIdentification = '';
    if (!searchWindow) return;
    results.replaceChildren(); status.textContent = ''; status.dataset.type = '';
    input.value = ''; input.disabled = false; submit.disabled = false; refreshButton.disabled = true;
    searchWindow.removeAttribute('aria-busy'); busy = false;
  }

  function closeWindow() {
    clearSearch(); searchWindow.hidden = true;
    panel?.querySelector('[data-action="sgc-search"]')?.classList.remove('is-active');
  }

  async function runSearch(force = false) {
    if (busy) return;
    const identification = input.value.trim();
    if (!identification) return setStatus('Ingresa la cédula del cliente.', 'error');
    const current = ++generation;
    displayedIdentification = '';
    busy = true; input.disabled = true; submit.disabled = true; refreshButton.disabled = true;
    results.replaceChildren(); searchWindow.setAttribute('aria-busy', 'true');
    setStatus('Consultando ficha y créditos en SGC…', 'loading');
    mascot('search');
    try {
      const data = await chrome.runtime.sendMessage({ type: 'ONOFF_SEARCH_SGC', identification, force });
      if (current !== generation) return;
      if (!data?.ok) throw new Error(data?.error || 'No fue posible consultar SGC. Verifica que la extensión esté actualizada.');
      if (!data.customer) {
        setStatus('No se encontró un cliente con esa cédula exacta.', 'info');
        renderTimings(data);
        mascot('notify', 1600);
        return;
      }
      displayedIdentification = identification;
      renderResult(data);
      renderTimings(data);
      const checkedTime = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.checkedAt));
      setStatus(data.clientCache ? `Resultado guardado temporalmente · consultado a las ${checkedTime}. Use Actualizar para obtener datos nuevos.` : data.fastPath ? `Consulta rápida verificada ${checkedTime} · Actualizar comprueba los datos generales.` : `Ficha consultada ${checkedTime} · puede ampliar el detalle de la solicitud.`, data.clientCache || data.fastPath ? 'info' : 'success');
      mascot('success', 1600);
    } catch (error) {
      if (current === generation) { setStatus(error.message || 'No fue posible consultar SGC.', 'error'); mascot('error', 2000); }
    } finally {
      if (current === generation) {
        busy = false; input.disabled = false; submit.disabled = false; refreshButton.disabled = false; searchWindow.removeAttribute('aria-busy');
        keepInside();
      }
    }
  }

  function renderResult(data) {
    const c = data.customer;
    const customer = card('Cliente', c.name, [
      ['Cédula', c.identification], ['Estado del cliente', c.state], ['Última solicitud', c.latestStatus], ['Categoría', c.category], ['Perfil', c.profile]
    ]);
    if (c.blocks?.length) {
      const blocks = node('div', null, 'onoff-sgc-blocks');
      c.blocks.forEach(block => blocks.appendChild(node('span', block)));
      customer.prepend(blocks);
    }
    const actions = node('div', null, 'onoff-bitrix-actions');
    addLink(actions, c.url, 'Abrir cliente en SGC');
    const copy = node('button', 'Copiar resumen'); copy.type = 'button';
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(summary(data)); copy.textContent = 'Copiado'; }
      catch { setStatus('El navegador no permitió copiar el resumen.', 'error'); }
    });
    actions.appendChild(copy); customer.appendChild(actions); results.appendChild(customer);
    if (data.notice) results.appendChild(node('p', data.notice, 'onoff-sgc-notice'));
    if (data.warning) results.appendChild(node('p', data.warning, 'onoff-sgc-warning'));
    const r = data.latestRequest;
    if (r) {
      const request = card(`Última solicitud · ${r.id}`, r.status, [
        ['Tipificación', r.typification], ['Valor del crédito', r.amount], ['Valor a pagar de la solicitud', r.detailsAvailable ? r.totalToPay : 'Ampliar detalle'],
        ['Creación', r.createdAt], ['Fecha límite', r.detailsAvailable ? r.deadline : 'Ampliar detalle'], ['Plazo en días', r.days]
      ]);
      const open = node('div', null, 'onoff-bitrix-actions'); addLink(open, r.url, 'Abrir solicitud en SGC'); request.appendChild(open);
      if (r.history?.length) {
        const history = node('details', null, 'onoff-sgc-history');
        history.appendChild(node('summary', 'Historial reciente de la solicitud'));
        const list = node('ol');
        r.history.forEach(event => {
          const item = node('li'); item.append(node('small', [event.type, event.date].filter(Boolean).join(' · ')), node('p', event.description)); list.appendChild(item);
        });
        history.appendChild(list); request.appendChild(history);
      } else if (r.detailsAvailable) request.appendChild(node('small', 'El historial no está disponible en esta consulta. Revíselo en SGC.'));
      else {
        const detailActions = node('div', null, 'onoff-bitrix-actions');
        const detailsButton = node('button', 'Ampliar detalle e historial');
        detailsButton.type = 'button';
        detailsButton.addEventListener('click', () => { void loadDetails(); });
        detailActions.appendChild(detailsButton);
        request.appendChild(detailActions);
      }
      results.appendChild(request);
    } else if (!data.warning) results.appendChild(node('p', 'SGC no muestra solicitudes para este cliente.', 'onoff-bitrix-empty'));
    if (data.creditsAvailable) {
      const creditSection = node('section', null, 'onoff-sgc-credits');
      creditSection.appendChild(node('h3', 'Créditos del cliente'));
      if (!data.credits.length) creditSection.appendChild(node('p', 'SGC no muestra créditos en esta ficha.', 'onoff-bitrix-empty'));
      data.credits.forEach(credit => creditSection.appendChild(card(`Crédito ${credit.id}`, '', [['Valor facturado', credit.amount], ['Saldo informado por SGC', credit.balance], ['Creación', credit.createdAt]])));
      if (data.moreCredits) creditSection.appendChild(node('small', 'Se muestran hasta 5 créditos. Consulta la ficha de SGC para ver todos.'));
      results.appendChild(creditSection);
    }
    if (data.requests?.length > 1) {
      const recent = node('details', null, 'onoff-sgc-history'); recent.appendChild(node('summary', 'Otras solicitudes recientes'));
      data.requests.slice(1).forEach(item => {
        const entry = node('div', null, 'onoff-sgc-recent');
        entry.append(node('strong', `${item.id} · ${item.status}`), node('small', [item.createdAt, item.typification].filter(Boolean).join(' · ')));
        addLink(entry, item.url, 'Abrir solicitud'); recent.appendChild(entry);
      });
      if (data.moreRequests) recent.appendChild(node('small', 'Se muestran las 5 solicitudes más recientes de la ficha.'));
      results.appendChild(recent);
    }
  }

  async function loadDetails() {
    if (busy) return;
    const identification = displayedIdentification;
    if (!identification) return;
    const current = ++generation;
    busy = true;
    input.disabled = true;
    submit.disabled = true;
    refreshButton.disabled = true;
    searchWindow.setAttribute('aria-busy', 'true');
    setStatus('Cargando detalle e historial de la última solicitud…', 'loading');
    try {
      const data = await chrome.runtime.sendMessage({ type: 'ONOFF_SGC_DETAILS', identification });
      if (current !== generation) return;
      if (!data?.ok) throw new Error(data?.error || 'No se pudo ampliar la solicitud.');
      results.replaceChildren();
      renderResult(data);
      renderTimings(data);
      const when = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(new Date(data.detailCheckedAt || data.checkedAt));
      setStatus(`Detalle consultado en SGC a las ${when}.`, 'success');
      mascot('success', 1300);
    } catch (error) {
      if (current === generation) {
        setStatus(error.message || 'No se pudo cargar el historial. El resumen anterior continúa disponible.', 'error');
        mascot('error', 1500);
      }
    } finally {
      if (current === generation) {
        busy = false;
        input.disabled = false;
        submit.disabled = false;
        refreshButton.disabled = false;
        searchWindow.removeAttribute('aria-busy');
        keepInside();
      }
    }
  }

  function renderTimings(data) {
    const timing = data.timing;
    if (data.clientCache || !timing || !Array.isArray(timing.stages) || !timing.stages.length) return;
    const summary = node('details', null, 'onoff-sgc-performance');
    const elapsed = ms => `${(ms / 1000).toFixed(2)} s`;
    const labels = { cliente: 'Buscar cliente', ficha: 'Abrir ficha', solicitud: 'Última solicitud' };
    const stageText = stage => {
      const parts = Number.isFinite(stage.responseMs) && Number.isFinite(stage.transferMs)
        ? [`Espera de respuesta: ${elapsed(stage.responseMs)}`, `Transferencia: ${elapsed(stage.transferMs)}`]
        : [`Descarga total: ${elapsed(stage.downloadMs)}`];
      return [...parts, `Análisis: ${elapsed(stage.parseMs)}`, `HTML: ${Math.round(stage.htmlChars / 1024)} KB aprox.`].join(' · ');
    };
    summary.appendChild(node('summary', `Diagnóstico de velocidad · ${elapsed(timing.totalMs)}`));
    const list = node('ul');
    timing.stages.forEach(stage => {
      if (!Object.hasOwn(labels, stage.stage)) return;
      const row = node('li');
      row.append(
        node('strong', labels[stage.stage]),
        node('span', stageText(stage))
      );
      list.appendChild(row);
    });
    summary.appendChild(list);
    const copy = node('button', 'Copiar diagnóstico');
    copy.type = 'button';
    copy.addEventListener('click', async () => {
      const lines = [
        'Rendimiento SGC (sin datos del cliente)',
        `Tiempo total: ${elapsed(timing.totalMs)}`,
        ...timing.stages.map(stage => `${labels[stage.stage] || 'Etapa'}: ${stageText(stage)}`)
      ];
      try { await navigator.clipboard.writeText(lines.join('\n')); copy.textContent = 'Diagnóstico copiado'; }
      catch { setStatus('No fue posible copiar el diagnóstico.', 'error'); }
    });
    summary.appendChild(copy);
    results.prepend(summary);
  }

  function node(tag, value, className) {
    const element = document.createElement(tag);
    if (value != null) element.textContent = value;
    if (className) element.className = className;
    return element;
  }
  function card(kicker, title, fields) {
    const article = node('article', null, 'onoff-bitrix-card');
    const head = node('div', null, 'onoff-bitrix-card-title'); head.append(node('strong', kicker), node('span', title || ''));
    const dl = node('dl'); fields.forEach(([label, value]) => dl.append(node('dt', label), node('dd', value || 'No informado')));
    article.append(head, dl); return article;
  }
  function addLink(parent, value, label) {
    try {
      const url = new URL(value);
      if (url.origin !== 'https://sgc.yadinero.co' || !/^\/(?:customers\/show|requests\/(?:edit|show))\/\d+$/.test(url.pathname) || url.search || url.hash) return;
      const link = node('a', label); link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; parent.appendChild(link);
    } catch { /* Invalid source links never become clickable. */ }
  }
  function summary(data) {
    const c = data.customer, r = data.latestRequest;
    return [
      `Cliente: ${c.name}`, `Cédula: ${c.identification}`, `Estado del cliente: ${c.state}`,
      `Categoría: ${c.category || 'No informada'} · Perfil: ${c.profile || 'No informado'}`,
      c.blocks?.length ? `Alertas: ${c.blocks.join(', ')}` : '',
      `Estado última solicitud: ${r?.status || c.latestStatus || 'No informado'}`,
      r ? `Solicitud: ${r.id} · Tipificación: ${r.typification || 'No informada'}` : '',
      r ? `Valor del crédito: ${r.amount || 'No informado'} · Valor a pagar de la solicitud: ${r.detailsAvailable ? (r.totalToPay || 'No informado') : 'Detalle no consultado'}` : '',
      r?.deadline ? `Fecha límite: ${r.deadline}` : '', data.notice || '', data.warning || '', `Fuente: ${c.url}`, `Consultado: ${data.checkedAt}`
    ].filter(Boolean).join('\n');
  }
  function setStatus(message, type) { status.textContent = message; status.dataset.type = type; }
  function mascot(state, duration = 0) { window.dispatchEvent(new CustomEvent('onoff:mascot-state', { detail: { state, duration } })); }
  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    const bounds = searchWindow.getBoundingClientRect(); drag = { id: event.pointerId, x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    window.addEventListener('pointermove', moveDrag, true); window.addEventListener('pointerup', endDrag, true); window.addEventListener('pointercancel', endDrag, true);
  }
  function moveDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    searchWindow.style.left = `${event.clientX - drag.x}px`; searchWindow.style.top = `${event.clientY - drag.y}px`;
    searchWindow.style.right = 'auto'; searchWindow.style.bottom = 'auto'; keepInside();
  }
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null; window.removeEventListener('pointermove', moveDrag, true); window.removeEventListener('pointerup', endDrag, true); window.removeEventListener('pointercancel', endDrag, true);
    const bounds = searchWindow.getBoundingClientRect(); void chrome.storage.local.set({ [POSITION_KEY]: { left: bounds.left, top: bounds.top } });
  }
  function keepInside() {
    if (!searchWindow || searchWindow.hidden) return;
    const r = searchWindow.getBoundingClientRect();
    searchWindow.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8))}px`;
    searchWindow.style.top = `${Math.max(8, Math.min(r.top, window.innerHeight - r.height - 8))}px`;
    searchWindow.style.right = 'auto'; searchWindow.style.bottom = 'auto';
  }
})();
