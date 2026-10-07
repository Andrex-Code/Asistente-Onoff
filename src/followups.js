(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const ACTION = 'followups';
  const POSITION_KEY = 'onoffFollowupsPosition';
  const PAGE_SIZE = 10;

  let panel;
  let observer;
  let followWindow;
  let input;
  let statusBox;
  let resultBox;
  let submitButton;
  let dragState;

  let lastMatches = [];
  let lastQuery = '';
  let lastTasks = [];
  let lastOwner = null;
  let currentPage = 1;

  init();

  function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 250);
      return;
    }

    bindButton();
    observer?.disconnect();
    observer = new MutationObserver(bindButton);
    observer.observe(panel, { childList: true, subtree: true });
  }

  function bindButton() {
    if (!panel?.isConnected) {
      window.setTimeout(init, 250);
      return;
    }

    const button = panel.querySelector(`[data-action="${ACTION}"]`);
    if (!button || button.dataset.onoffFollowupsBound === 'true') return;

    button.dataset.onoffFollowupsBound = 'true';
    button.addEventListener('click', handleButtonClick, true);
  }

  async function handleButtonClick(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const subview = panel.querySelector('[data-subview]');
    if (subview) subview.innerHTML = '';

    if (!followWindow) buildWindow();

    const opening = followWindow.hidden;
    followWindow.hidden = !opening;
    panel.querySelector(`[data-action="${ACTION}"]`)?.classList.toggle('is-active', opening);

    if (opening) {
      await applyPosition();
      window.setTimeout(() => input?.focus({ preventScroll: true }), 0);
    }
  }

  function buildWindow() {
    followWindow = document.createElement('section');
    followWindow.className = 'onoff-followups-window';
    followWindow.hidden = true;
    followWindow.innerHTML = `
      <header class="onoff-followups-header">
        <div>
          <strong>Seguimientos</strong>
          <small>Tareas abiertas por propietario</small>
        </div>
        <div class="onoff-followups-window-actions">
          <button type="button" data-min title="Minimizar" aria-label="Minimizar">−</button>
          <button type="button" data-close title="Cerrar" aria-label="Cerrar">×</button>
        </div>
      </header>

      <div class="onoff-followups-content">
        <form class="onoff-followups-form">
          <label for="onoff-followups-owner">Propietario de la tarea</label>
          <div>
            <input
              id="onoff-followups-owner"
              type="text"
              autocomplete="off"
              placeholder="Escriba el nombre del asesor"
            />
            <button type="submit">Buscar</button>
          </div>
        </form>

        <div class="onoff-followups-status" aria-live="polite"></div>
        <div class="onoff-followups-results"></div>
      </div>
    `;

    document.body.appendChild(followWindow);

    input = followWindow.querySelector('#onoff-followups-owner');
    statusBox = followWindow.querySelector('.onoff-followups-status');
    resultBox = followWindow.querySelector('.onoff-followups-results');
    submitButton = followWindow.querySelector('button[type="submit"]');

    followWindow.querySelector('[data-close]').addEventListener('click', closeWindow);

    followWindow.querySelector('[data-min]').addEventListener('click', (event) => {
      followWindow.classList.toggle('is-minimized');
      event.currentTarget.textContent = followWindow.classList.contains('is-minimized') ? '□' : '−';
      keepInside();
    });

    followWindow.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      runSearch({ name: input.value, source: 'name' });
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') resetSearch(true);
    });

    followWindow.querySelector('.onoff-followups-header').addEventListener('pointerdown', startDrag);
    window.addEventListener('resize', keepInside);
  }

  function closeWindow() {
    if (!followWindow) return;
    followWindow.hidden = true;
    panel.querySelector(`[data-action="${ACTION}"]`)?.classList.remove('is-active');
  }

  async function runSearch(payload = {}) {
    const hasOwnerIds = Array.isArray(payload.ownerIds) && payload.ownerIds.length > 0;
    const hasOwnerId = Boolean(payload.ownerId);
    const searchingByName = !hasOwnerIds && !hasOwnerId;
    const name = String(payload.name || '').replace(/\s+/g, ' ').trim();

    if (searchingByName && name.length < 2) {
      setStatus('Escriba al menos dos caracteres para buscar.', 'error');
      input?.focus();
      return;
    }

    if (searchingByName) {
      lastQuery = name;
      lastMatches = [];
      lastTasks = [];
      lastOwner = null;
      currentPage = 1;
    }

    setBusy(true);
    resultBox.innerHTML = '';
    setStatus(
      searchingByName
        ? 'Buscando propietarios y tareas abiertas…'
        : 'Consultando tareas abiertas…',
      'loading'
    );

    try {
      const backend = String(
        (await chrome.storage.sync.get('backendUrl')).backendUrl ||
        'https://asistente-onoff.vercel.app'
      ).replace(/\/$/, '');

      const body = searchingByName
        ? { mode: 'owner', name }
        : hasOwnerIds
          ? {
              mode: 'owner',
              ownerIds: payload.ownerIds,
              ownerLabel: payload.ownerLabel || ''
            }
          : {
              mode: 'owner',
              ownerId: payload.ownerId,
              ownerLabel: payload.ownerLabel || ''
            };

      const response = await fetch(`${backend}/api/bitrix/search-client-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `El servidor respondió ${response.status}.`);
      }

      if (data.requiresSelection) {
        lastMatches = Array.isArray(data.users) ? data.users : [];
        renderUserChoices(lastMatches);
        return;
      }

      lastOwner = data.owner || null;
      lastTasks = Array.isArray(data.tasks) ? data.tasks : [];
      currentPage = 1;
      renderTasks();
    } catch (error) {
      const rawMessage = String(error?.message || '');
      const friendlyMessage = /Failed to fetch|NetworkError|Load failed/i.test(rawMessage)
        ? 'No fue posible conectar con el backend de Asistente ONOFF.'
        : (/higher privileges|insufficient_scope/i.test(rawMessage)
          ? 'El webhook de Bitrix no tiene permisos suficientes para esta consulta.'
          : (rawMessage || 'No fue posible consultar las tareas.'));

      setStatus(friendlyMessage, 'error');
      resultBox.innerHTML = '';

      const empty = document.createElement('div');
      empty.className = 'onoff-followups-empty-state';
      empty.innerHTML = `
        <strong>No se pudo completar la consulta</strong>
        <span>Puede intentar nuevamente o iniciar una búsqueda diferente.</span>
      `;

      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'onoff-followups-secondary-button';
      retry.textContent = 'Nueva búsqueda';
      retry.addEventListener('click', () => resetSearch(true));

      empty.appendChild(retry);
      resultBox.appendChild(empty);
    } finally {
      setBusy(false);
    }
  }

  function renderUserChoices(users) {
    const visibleUsers = dedupeChoiceUsers(users);

    setStatus(
      visibleUsers.length === 1
        ? 'Se encontró un propietario.'
        : `Se encontraron ${visibleUsers.length} propietarios. Seleccione la persona que desea consultar.`,
      'success'
    );

    resultBox.innerHTML = '';

    const toolbar = createToolbar({
      primaryLabel: 'Nueva búsqueda',
      primaryAction: () => resetSearch(true)
    });
    resultBox.appendChild(toolbar);

    const section = document.createElement('section');
    section.className = 'onoff-followups-users';

    const header = document.createElement('div');
    header.className = 'onoff-followups-section-header';

    const heading = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'Coincidencias';

    const subtitle = document.createElement('small');
    subtitle.textContent = lastQuery ? `Resultados para “${lastQuery}”` : 'Propietarios encontrados';

    heading.append(title, subtitle);

    const total = document.createElement('span');
    total.className = 'onoff-followups-section-count';
    total.textContent = String(visibleUsers.length);

    header.append(heading, total);
    section.appendChild(header);

    if (!visibleUsers.length) {
      const empty = document.createElement('p');
      empty.className = 'onoff-followups-empty';
      empty.textContent = 'No hay coincidencias disponibles.';
      section.appendChild(empty);
      resultBox.appendChild(section);
      return;
    }

    const list = document.createElement('div');
    list.className = 'onoff-followups-user-list';

    visibleUsers.forEach((user) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'onoff-followups-user';

      const copy = document.createElement('span');
      copy.className = 'onoff-followups-user-copy';

      const name = document.createElement('strong');
      name.textContent = user.fullName;

      const meta = document.createElement('small');
      const count = Number(user.openTaskCount || 0);
      meta.textContent = `${count} tarea${count === 1 ? '' : 's'} abierta${count === 1 ? '' : 's'}`;

      copy.append(name, meta);

      const badge = document.createElement('span');
      badge.className = 'onoff-followups-user-count';
      badge.textContent = String(count);
      badge.title = 'Tareas abiertas';

      const arrow = document.createElement('span');
      arrow.className = 'onoff-followups-user-arrow';
      arrow.textContent = '›';
      arrow.setAttribute('aria-hidden', 'true');

      button.append(copy, badge, arrow);

      button.addEventListener('click', () => {
        runSearch({
          ownerIds: Array.isArray(user.ownerIds) && user.ownerIds.length
            ? user.ownerIds
            : [user.id],
          ownerLabel: user.fullName,
          source: 'choice'
        });
      });

      list.appendChild(button);
    });

    section.appendChild(list);
    resultBox.appendChild(section);
  }

  function renderTasks() {
    const tasks = lastTasks;
    const ownerName = lastOwner?.fullName || 'Propietario seleccionado';

    setStatus(
      `${tasks.length} tarea${tasks.length === 1 ? '' : 's'} abierta${tasks.length === 1 ? '' : 's'} de ${ownerName}.`,
      'success'
    );

    resultBox.innerHTML = '';

    const toolbar = createToolbar({
      backLabel: lastMatches.length > 1 ? 'Volver a coincidencias' : '',
      backAction: lastMatches.length > 1 ? () => renderUserChoices(lastMatches) : null,
      primaryLabel: 'Nueva búsqueda',
      primaryAction: () => resetSearch(true)
    });
    resultBox.appendChild(toolbar);

    const summary = document.createElement('section');
    summary.className = 'onoff-followups-summary';

    const copy = document.createElement('div');

    const label = document.createElement('small');
    label.textContent = 'Propietario de la tarea';

    const name = document.createElement('strong');
    name.textContent = ownerName;

    const description = document.createElement('span');
    description.textContent = 'Tareas actualmente abiertas';

    copy.append(label, name, description);

    const count = document.createElement('span');
    count.className = 'onoff-followups-count';
    count.textContent = String(tasks.length);
    count.title = 'Total de tareas abiertas';

    summary.append(copy, count);
    resultBox.appendChild(summary);

    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.className = 'onoff-followups-empty-state';

      const title = document.createElement('strong');
      title.textContent = 'Sin tareas abiertas';

      const text = document.createElement('span');
      text.textContent = 'No se encontraron tareas abiertas para este propietario.';

      empty.append(title, text);
      resultBox.appendChild(empty);
      return;
    }

    const totalPages = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, tasks.length);
    const visibleTasks = tasks.slice(startIndex, endIndex);

    const range = document.createElement('div');
    range.className = 'onoff-followups-range';

    const rangeText = document.createElement('span');
    rangeText.textContent = `Mostrando ${startIndex + 1}–${endIndex} de ${tasks.length}`;

    const pageText = document.createElement('strong');
    pageText.textContent = `Página ${currentPage} de ${totalPages}`;

    range.append(rangeText, pageText);
    resultBox.appendChild(range);

    const list = document.createElement('div');
    list.className = 'onoff-followups-list';
    visibleTasks.forEach((task) => list.appendChild(taskCard(task)));
    resultBox.appendChild(list);

    if (totalPages > 1) {
      resultBox.appendChild(createPagination(totalPages));
    }
  }

  function createPagination(totalPages) {
    const nav = document.createElement('nav');
    nav.className = 'onoff-followups-pagination';
    nav.setAttribute('aria-label', 'Paginación de tareas');

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'onoff-followups-page-button';
    previous.textContent = '← Anterior';
    previous.disabled = currentPage <= 1;
    previous.addEventListener('click', () => {
      if (currentPage <= 1) return;
      currentPage -= 1;
      renderTasks();
      scrollResultsTop();
    });

    const current = document.createElement('span');
    current.className = 'onoff-followups-page-current';
    current.textContent = `${currentPage} / ${totalPages}`;

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'onoff-followups-page-button';
    next.textContent = 'Siguiente →';
    next.disabled = currentPage >= totalPages;
    next.addEventListener('click', () => {
      if (currentPage >= totalPages) return;
      currentPage += 1;
      renderTasks();
      scrollResultsTop();
    });

    nav.append(previous, current, next);
    return nav;
  }

  function createToolbar({
    backLabel = '',
    backAction = null,
    primaryLabel = '',
    primaryAction = null
  } = {}) {
    const toolbar = document.createElement('div');
    toolbar.className = 'onoff-followups-toolbar';

    const left = document.createElement('div');
    const right = document.createElement('div');

    if (backLabel && backAction) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'onoff-followups-secondary-button';
      back.textContent = `← ${backLabel}`;
      back.addEventListener('click', backAction);
      left.appendChild(back);
    }

    if (primaryLabel && primaryAction) {
      const primary = document.createElement('button');
      primary.type = 'button';
      primary.className = 'onoff-followups-secondary-button';
      primary.textContent = primaryLabel;
      primary.addEventListener('click', primaryAction);
      right.appendChild(primary);
    }

    toolbar.append(left, right);
    return toolbar;
  }

  function taskCard(task) {
    const article = document.createElement('article');
    article.className = 'onoff-followups-task';

    const top = document.createElement('div');
    top.className = 'onoff-followups-task-top';

    const heading = document.createElement('div');

    const id = document.createElement('small');
    id.textContent = `Tarea #${task.id}`;

    const title = document.createElement('strong');
    title.textContent = task.title || `Tarea #${task.id}`;

    heading.append(id, title);

    const badge = document.createElement('span');
    badge.className = 'onoff-followups-task-status';
    badge.textContent = task.status || 'Sin estado';

    top.append(heading, badge);
    article.appendChild(top);

    const meta = document.createElement('dl');
    meta.className = 'onoff-followups-task-meta';

    addMeta(meta, 'Responsable', task.responsible || 'No especificado');
    addMeta(meta, 'Fecha límite', formatDate(task.deadline));
    addMeta(meta, 'Creado', formatDate(task.createdAt));

    if (task.priority === 'Alta') {
      addMeta(meta, 'Prioridad', 'Alta');
      article.classList.add('is-high-priority');
    }

    article.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'onoff-followups-task-actions';

    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Abrir tarea ↗';
    open.addEventListener('click', () => {
      window.open(task.url, '_blank', 'noopener');
    });

    actions.appendChild(open);
    article.appendChild(actions);

    return article;
  }

  function addMeta(container, label, value) {
    const wrapper = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');

    dt.textContent = label;
    dd.textContent = value;

    wrapper.append(dt, dd);
    container.appendChild(wrapper);
  }

  function dedupeChoiceUsers(users) {
    const grouped = new Map();

    for (const user of users || []) {
      const key = normalizeName(user?.fullName);
      if (!key) continue;

      const ids = Array.isArray(user.ownerIds) && user.ownerIds.length
        ? user.ownerIds.map(String)
        : user?.id
          ? [String(user.id)]
          : [];

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: user?.id || ids[0] || '',
          ownerIds: [...new Set(ids)],
          fullName: String(user?.fullName || '').trim(),
          openTaskCount: Number(user?.openTaskCount || 0)
        });
        continue;
      }

      const current = grouped.get(key);
      current.ownerIds = [...new Set([...current.ownerIds, ...ids])];
      current.openTaskCount = Math.max(
        Number(current.openTaskCount || 0),
        Number(user?.openTaskCount || 0)
      );
    }

    return [...grouped.values()].sort(
      (a, b) =>
        Number(b.openTaskCount || 0) - Number(a.openTaskCount || 0) ||
        a.fullName.localeCompare(b.fullName, 'es')
    );
  }

  function normalizeName(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function resetSearch(clearInput = false) {
    lastMatches = [];
    lastQuery = '';
    lastTasks = [];
    lastOwner = null;
    currentPage = 1;

    resultBox.innerHTML = '';
    setStatus('', '');

    if (clearInput && input) input.value = '';
    input?.focus({ preventScroll: true });
  }

  function scrollResultsTop() {
    const content = followWindow?.querySelector('.onoff-followups-content');
    if (!content) return;

    const resultsTop = resultBox?.offsetTop || 0;
    content.scrollTo({
      top: Math.max(0, resultsTop - 12),
      behavior: 'smooth'
    });
  }

  function setBusy(busy) {
    if (submitButton) submitButton.disabled = busy;
    if (input) input.disabled = busy;
    followWindow?.classList.toggle('is-busy', busy);
  }

  function setStatus(message, type) {
    if (!statusBox) return;
    statusBox.textContent = message || '';
    statusBox.dataset.type = type || '';
  }

  function formatDate(value) {
    if (!value) return 'Sin fecha límite';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Sin fecha límite';

    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;

    const rect = followWindow.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };

    window.addEventListener('pointermove', moveDrag, true);
    window.addEventListener('pointerup', endDrag, true);
    window.addEventListener('pointercancel', endDrag, true);
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const left = clamp(
      event.clientX - dragState.offsetX,
      8,
      window.innerWidth - followWindow.offsetWidth - 8
    );

    const top = clamp(
      event.clientY - dragState.offsetY,
      8,
      window.innerHeight - followWindow.offsetHeight - 8
    );

    setPosition(left, top);
  }

  async function endDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    dragState = null;

    window.removeEventListener('pointermove', moveDrag, true);
    window.removeEventListener('pointerup', endDrag, true);
    window.removeEventListener('pointercancel', endDrag, true);

    const rect = followWindow.getBoundingClientRect();

    await chrome.storage.local.set({
      [POSITION_KEY]: {
        left: Math.round(rect.left),
        top: Math.round(rect.top)
      }
    });
  }

  async function applyPosition() {
    const stored = await chrome.storage.local.get(POSITION_KEY);
    const position = stored[POSITION_KEY];

    if (
      position &&
      Number.isFinite(position.left) &&
      Number.isFinite(position.top)
    ) {
      setPosition(position.left, position.top);
      keepInside();
      return;
    }

    positionBesidePanel();
  }

  function positionBesidePanel() {
    const panelRect = panel.getBoundingClientRect();
    const width = followWindow.offsetWidth || 550;
    const height = followWindow.offsetHeight || 660;
    const gap = 10;
    const roomRight = window.innerWidth - panelRect.right - gap - 8;

    const left = roomRight >= width
      ? panelRect.right + gap
      : panelRect.left - width - gap;

    const top = panelRect.top;

    setPosition(
      clamp(left, 8, window.innerWidth - width - 8),
      clamp(top, 8, window.innerHeight - height - 8)
    );
  }

  function keepInside() {
    if (!followWindow || followWindow.hidden) return;

    const rect = followWindow.getBoundingClientRect();

    setPosition(
      clamp(rect.left, 8, window.innerWidth - rect.width - 8),
      clamp(rect.top, 8, window.innerHeight - rect.height - 8)
    );
  }

  function setPosition(left, top) {
    followWindow.style.left = `${Math.round(left)}px`;
    followWindow.style.top = `${Math.round(top)}px`;
    followWindow.style.right = 'auto';
    followWindow.style.bottom = 'auto';
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), Math.max(min, max));
  }
})();
