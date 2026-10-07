(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const ACTION = 'followups';
  const POSITION_KEY = 'onoffFollowupsPosition';

  let panel;
  let observer;
  let followWindow;
  let input;
  let statusBox;
  let resultBox;
  let submitButton;
  let dragState;

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
          <button type="button" data-min title="Minimizar">−</button>
          <button type="button" data-close title="Cerrar">×</button>
        </div>
      </header>
      <div class="onoff-followups-content">
        <form class="onoff-followups-form">
          <label for="onoff-followups-owner">Propietario de la tarea</label>
          <div>
            <input id="onoff-followups-owner" type="text" autocomplete="off" placeholder="Escriba el nombre del asesor" />
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
      runSearch({ name: input.value });
    });
    followWindow.querySelector('.onoff-followups-header').addEventListener('pointerdown', startDrag);
    window.addEventListener('resize', keepInside);
  }

  function closeWindow() {
    if (!followWindow) return;
    followWindow.hidden = true;
    panel.querySelector(`[data-action="${ACTION}"]`)?.classList.remove('is-active');
  }

  async function runSearch(payload) {
    const searchingByName = !payload.ownerId;
    const name = String(payload.name || '').replace(/\s+/g, ' ').trim();

    if (searchingByName && name.length < 2) {
      setStatus('Escriba al menos dos caracteres para buscar.', 'error');
      input?.focus();
      return;
    }

    setBusy(true);
    resultBox.innerHTML = '';
    setStatus('Consultando tareas en Bitrix…', 'loading');

    try {
      const backend = String((await chrome.storage.sync.get('backendUrl')).backendUrl || 'https://asistente-onoff.vercel.app').replace(/\/$/, '');
      const response = await fetch(`${backend}/api/bitrix/search-client-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.ownerId ? { mode: 'owner', ownerId: payload.ownerId } : { mode: 'owner', name })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || `El servidor respondió ${response.status}.`);
      }

      if (data.requiresSelection) {
        renderUserChoices(data.users || []);
        return;
      }

      renderTasks(data.owner, data.tasks || [], Boolean(data.truncated));
    } catch (error) {
      const rawMessage = String(error?.message || '');
      const friendlyMessage = /Failed to fetch|NetworkError|Load failed/i.test(rawMessage)
        ? 'No fue posible conectar con el backend de Asistente ONOFF.'
        : (/higher privileges|insufficient_scope/i.test(rawMessage)
          ? 'El webhook de Bitrix no tiene permisos suficientes para esta consulta.'
          : (rawMessage || 'No fue posible consultar las tareas.'));
      setStatus(friendlyMessage, 'error');
      resultBox.innerHTML = '<p class="onoff-followups-empty">No se pudo completar la consulta. Intente nuevamente.</p>';
    } finally {
      setBusy(false);
    }
  }

  function renderUserChoices(users) {
    setStatus('Se encontraron varios propietarios. Seleccione la persona que desea consultar.', 'success');
    resultBox.innerHTML = '';

    const section = document.createElement('section');
    section.className = 'onoff-followups-users';

    const title = document.createElement('strong');
    title.textContent = 'Coincidencias';
    section.appendChild(title);

    users.forEach((user) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'onoff-followups-user';
      button.textContent = user.fullName;
      button.addEventListener('click', () => runSearch({ ownerId: user.id }));
      section.appendChild(button);
    });

    resultBox.appendChild(section);
  }

  function renderTasks(owner, tasks, truncated) {
    const ownerName = owner?.fullName || 'Propietario seleccionado';
    setStatus(
      `${tasks.length} tarea${tasks.length === 1 ? '' : 's'} abierta${tasks.length === 1 ? '' : 's'} de ${ownerName}.`,
      'success'
    );
    resultBox.innerHTML = '';

    const summary = document.createElement('section');
    summary.className = 'onoff-followups-summary';

    const copy = document.createElement('div');
    const label = document.createElement('small');
    label.textContent = 'Propietario de la tarea';
    const name = document.createElement('strong');
    name.textContent = ownerName;
    copy.append(label, name);

    const count = document.createElement('span');
    count.className = 'onoff-followups-count';
    count.textContent = String(tasks.length);
    summary.append(copy, count);
    resultBox.appendChild(summary);

    if (truncated) {
      const warning = document.createElement('p');
      warning.className = 'onoff-followups-warning';
      warning.textContent = 'La consulta alcanzó el límite de páginas de Bitrix. Puede haber tareas adicionales.';
      resultBox.appendChild(warning);
    }

    if (!tasks.length) {
      const empty = document.createElement('p');
      empty.className = 'onoff-followups-empty';
      empty.textContent = 'No hay tareas abiertas para este propietario.';
      resultBox.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'onoff-followups-list';
    tasks.forEach((task) => list.appendChild(taskCard(task)));
    resultBox.appendChild(list);
  }

  function taskCard(task) {
    const article = document.createElement('article');
    article.className = 'onoff-followups-task';

    const top = document.createElement('div');
    top.className = 'onoff-followups-task-top';

    const heading = document.createElement('div');
    const id = document.createElement('small');
    id.textContent = `Radicado ${task.id}`;
    const title = document.createElement('strong');
    title.textContent = task.title || `Radicado ${task.id}`;
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
    if (task.priority === 'Alta') addMeta(meta, 'Prioridad', 'Alta');
    article.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'onoff-followups-task-actions';

    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = 'Abrir tarea';
    open.addEventListener('click', () => window.open(task.url, '_blank', 'noopener'));
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

  function setBusy(busy) {
    if (submitButton) submitButton.disabled = busy;
    if (input) input.disabled = busy;
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
    const left = clamp(event.clientX - dragState.offsetX, 8, window.innerWidth - followWindow.offsetWidth - 8);
    const top = clamp(event.clientY - dragState.offsetY, 8, window.innerHeight - followWindow.offsetHeight - 8);
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
      [POSITION_KEY]: { left: Math.round(rect.left), top: Math.round(rect.top) }
    });
  }

  async function applyPosition() {
    const stored = await chrome.storage.local.get(POSITION_KEY);
    const position = stored[POSITION_KEY];

    if (position && Number.isFinite(position.left) && Number.isFinite(position.top)) {
      setPosition(position.left, position.top);
      keepInside();
      return;
    }

    positionBesidePanel();
  }

  function positionBesidePanel() {
    const panelRect = panel.getBoundingClientRect();
    const width = followWindow.offsetWidth || 520;
    const height = followWindow.offsetHeight || 560;
    const gap = 10;
    const roomRight = window.innerWidth - panelRect.right - gap - 8;
    const left = roomRight >= width ? panelRect.right + gap : panelRect.left - width - gap;
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
