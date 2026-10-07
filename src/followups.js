(() => {
  'use strict';
  const PAGE_SIZE = 10;
  const POSITION_KEY = 'onoffFollowupsPosition';
  const state = { view: 'start', query: '', matches: [], sac: [], owner: null, tasks: [], page: 1, sort: 'created-desc', queryToken: 0, jobToken: 0, busy: false, updatedAt: null, clientCache: false };
  const dates = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  let panel, win, input, sacSelect, results, status, content, submit, cancel, refresh, back;
  let drag, observer, attempt = 0, sortedTasks = [], sortedFor = null, sortedMode = '';
  let sacLoading = false;
  init();

  function init() {
    panel = document.querySelector('.ikono-translator-panel');
    if (!panel) { if (++attempt < 100) setTimeout(init, 250); return; }
    bindButton();
    observer = new MutationObserver(bindButton);
    observer.observe(panel, { childList: true });
  }
  function bindButton() {
    const button = panel?.querySelector('[data-action="followups"]');
    if (!button || button.dataset.onoffFollowupsBound === 'true') return;
    button.dataset.onoffFollowupsBound = 'true';
    button.addEventListener('click', event => {
      event.preventDefault(); event.stopImmediatePropagation();
      if (!win) build();
      win.hidden = !win.hidden;
      button.classList.toggle('is-active', !win.hidden);
      if (!win.hidden) {
        win.classList.remove('is-minimized');
        setMinButton();
        applyPosition().catch(() => keepInside());
        input.focus({ preventScroll: true });
        loadSac();
      }
    }, true);
  }
  function build() {
    win = document.createElement('section');
    win.className = 'onoff-followups-window';
    win.hidden = true;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-label', 'Seguimientos');
    win.innerHTML = `
      <header class="onoff-followups-header">
        <div><strong>Seguimientos</strong><small>Tareas abiertas por propietario</small></div>
        <div class="onoff-followups-window-actions">
          <button type="button" data-min aria-label="Minimizar" title="Minimizar">\u2212</button>
          <button type="button" data-close aria-label="Cerrar" title="Cerrar">\u00d7</button>
        </div>
      </header>
      <div class="onoff-followups-content">
        <form class="onoff-followups-form">
          <div class="onoff-followups-searchgrid">
            <label>Propietario de la tarea<input data-name type="text" maxlength="80" autocomplete="off" placeholder="Escriba un nombre" /></label>
            <label>Equipo SAC<select data-sac aria-label="Seleccionar asesor de SAC"><option value="">Cargando equipo...</option></select></label>
            <button type="submit">Buscar</button>
          </div>
          <small class="onoff-followups-sac-note" data-sac-note>Seleccione un asesor o busque por nombre.</small>
        </form>
        <div class="onoff-followups-status" role="status" aria-live="polite"></div>
        <nav class="onoff-followups-toolbar" aria-label="Navegaci\u00f3n de seguimientos">
          <button type="button" data-back hidden>\u2190 Coincidencias</button>
          <button type="button" data-reset>Nueva b\u00fasqueda</button>
          <button type="button" data-refresh disabled>Actualizar</button>
          <button type="button" data-cancel hidden>Cancelar</button>
        </nav>
        <div class="onoff-followups-results"></div>
      </div>`;
    document.body.appendChild(win);
    input = win.querySelector('[data-name]'); sacSelect = win.querySelector('[data-sac]');
    results = win.querySelector('.onoff-followups-results'); status = win.querySelector('.onoff-followups-status');
    content = win.querySelector('.onoff-followups-content'); submit = win.querySelector('[type="submit"]');
    cancel = win.querySelector('[data-cancel]'); refresh = win.querySelector('[data-refresh]'); back = win.querySelector('[data-back]');
    win.querySelector('form').addEventListener('submit', event => { event.preventDefault(); search(); });
    sacSelect.addEventListener('change', () => {
      const owner = state.sac.find(o => ownerKey(o) === sacSelect.value);
      if (!owner) return;
      input.value = owner.fullName;
      state.queryToken += 1;
      state.matches = [];
      loadOwner(owner);
    });
    input.addEventListener('input', () => { sacSelect.value = ''; });
    win.querySelector('[data-reset]').addEventListener('click', reset);
    refresh.addEventListener('click', () => state.view === 'tasks' && state.owner ? loadOwner(state.owner, true) : search(true));
    cancel.addEventListener('click', () => { state.jobToken += 1; setBusy(false); setStatus('Consulta cancelada en esta ventana.', 'info'); });
    back.addEventListener('click', () => { state.jobToken += 1; setBusy(false); renderMatches(); content.scrollTop = 0; });
    win.querySelector('[data-close]').addEventListener('click', () => { win.hidden = true; panel?.querySelector('[data-action="followups"]')?.classList.remove('is-active'); });
    win.querySelector('[data-min]').addEventListener('click', () => { win.classList.toggle('is-minimized'); setMinButton(); keepInside(); });
    win.querySelector('.onoff-followups-header').addEventListener('pointerdown', startDrag);
    win.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); if (state.busy) cancel.click(); else win.querySelector('[data-close]').click(); } });
    window.addEventListener('resize', keepInside);
    chrome.storage.local.get('onoffFollowupsSort').then(saved => { if (['created-desc', 'created-asc', 'priority'].includes(saved.onoffFollowupsSort)) state.sort = saved.onoffFollowupsSort; }).catch(() => {});
    renderStart();
  }
  function setMinButton() {
    const minimized = win.classList.contains('is-minimized'), button = win.querySelector('[data-min]');
    button.textContent = minimized ? '\u25a1' : '\u2212';
    button.title = minimized ? 'Restaurar' : 'Minimizar';
    button.setAttribute('aria-label', button.title);
  }
  function rpc(payload) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: 'ONOFF_FOLLOWUPS_REQUEST', payload }, data => {
          if (chrome.runtime.lastError) return reject(new Error('Recargue Asistente ONOFF y esta p\u00e1gina para activar la conexi\u00f3n actualizada.'));
          if (!data?.ok) return reject(new Error(data?.error || 'No se pudo completar la consulta.'));
          resolve(data);
        });
      } catch { reject(new Error('La extensi\u00f3n fue actualizada. Recargue esta p\u00e1gina.')); }
    });
  }
  async function loadSac(force = false) {
    if (sacLoading) return;
    sacLoading = true;
    const note = win.querySelector('[data-sac-note]');
    try {
      const data = await rpc({ action: 'sac', force });
      state.sac = data.users || [];
      const previous = sacSelect.value;
      sacSelect.replaceChildren(option('', state.sac.length ? 'Seleccionar asesor' : 'Equipo no configurado'));
      state.sac.forEach(owner => sacSelect.append(option(ownerKey(owner), owner.fullName)));
      sacSelect.value = previous;
      note.textContent = data.warning || 'Seleccione SAC para consultar directamente, sin buscar otros nombres.';
      note.title = data.source || '';
    } catch (error) {
      if (!state.sac.length) sacSelect.replaceChildren(option('', 'Equipo no disponible'));
      note.textContent = 'No se pudo cargar SAC. La b\u00fasqueda por nombre sigue disponible.';
      note.title = error.message;
    } finally { sacLoading = false; }
  }
  async function search(force = false) {
    const name = input.value.replace(/\s+/g, ' ').trim();
    if (name.length < 2) { setStatus('Escriba al menos dos caracteres.', 'error'); input.focus(); return; }
    const token = ++state.jobToken;
    const queryToken = ++state.queryToken;
    state.query = name; state.matches = []; state.owner = null; state.tasks = [];
    state.view = 'start'; state.page = 1;
    results.replaceChildren(); setBusy(true); setStatus('Buscando propietarios...', 'loading');
    try {
      const data = await rpc({ action: 'search', name, force });
      if (token !== state.jobToken) return;
      state.matches = data.users || [];
      if (!state.matches.length) {
        state.view = 'start'; renderStart('Sin coincidencias', 'Revise el nombre e intente nuevamente.');
        setStatus('No se encontraron propietarios.', 'info');
      } else if (state.matches.length === 1) {
        setBusy(false);
        await loadOwner(state.matches[0], force);
      } else {
        renderMatches();
        if (data.moreMatches) setStatus('Se muestran las primeras coincidencias. Escriba un nombre m\u00e1s completo para reducir la lista.', 'info');
        loadCounts(queryToken, force);
      }
    } catch (error) { if (token === state.jobToken) setStatus(error.message, 'error'); }
    finally { if (token === state.jobToken) setBusy(false); }
  }
  async function loadCounts(queryToken, force) {
    // Counts do not block the list or selection. Small blocks avoid API bursts.
    const owners = state.matches.slice();
    for (let start = 0; start < owners.length; start += 4) {
      if (queryToken !== state.queryToken) return;
      const group = owners.slice(start, start + 4);
      try {
        const data = await rpc({ action: 'counts', groups: group.map(o => ({ id: o.id, ownerIds: o.ownerIds })), force });
        if (queryToken !== state.queryToken) return;
        for (const count of data.users || []) {
          const target = state.matches.find(o => ownerKey(o) === ownerKey(count));
          if (target) Object.assign(target, count);
        }
      } catch (error) {
        if (queryToken !== state.queryToken) return;
        group.forEach(o => { o.error = error.message; o.openTaskCount = null; });
      }
      if (state.view === 'matches') updateCounts();
    }
  }
  async function loadOwner(owner, force = false) {
    const token = ++state.jobToken;
    setBusy(true); setStatus(force ? 'Actualizando tareas desde Bitrix...' : 'Consultando tareas abiertas...', 'loading');
    try {
      const data = await rpc({ action: 'tasks', ownerIds: owner.ownerIds || [owner.id], force });
      if (token !== state.jobToken) return;
      state.owner = data.owner;
      state.tasks = data.tasks || [];
      state.updatedAt = data.updatedAt;
      state.clientCache = Boolean(data.clientCache);
      state.page = 1; sortedFor = null;
      const match = state.matches.find(o => ownerKey(o) === ownerKey(data.owner));
      if (match) match.openTaskCount = state.tasks.length;
      renderTasks(); content.scrollTop = 0;
    } catch (error) { if (token === state.jobToken) setStatus(error.message, 'error'); }
    finally { if (token === state.jobToken) setBusy(false); }
  }
  function renderStart(title = 'Consulte sus seguimientos', description = 'Busque un propietario o seleccione un asesor de SAC. Solo se muestran tareas principales abiertas; se omiten subtareas y tareas de proceso.') {
    results.replaceChildren(empty(title, description)); toolbar();
  }
  function renderMatches() {
    state.view = 'matches'; results.replaceChildren(); toolbar();
    setStatus('Seleccione un propietario. Los conteos se actualizan sin bloquear la b\u00fasqueda.', 'success');
    const section = node('section', 'onoff-followups-users');
    section.append(node('strong', '', `Coincidencias (${state.matches.length})`));
    for (const owner of state.matches) {
      const button = node('button', 'onoff-followups-user'); button.type = 'button'; button.dataset.ownerKey = ownerKey(owner);
      const copy = node('span', 'onoff-followups-user-copy');
      copy.append(node('strong', '', owner.fullName), node('small', 'onoff-followups-count-copy', 'Contando tareas...'));
      const badge = node('span', 'onoff-followups-user-count', '...');
      button.append(copy, badge, node('span', 'onoff-followups-user-arrow', '\u203a'));
      button.addEventListener('click', () => loadOwner(owner)); section.append(button);
    }
    results.append(section); updateCounts();
  }
  function updateCounts() {
    for (const button of results.querySelectorAll('[data-owner-key]')) {
      const owner = state.matches.find(o => ownerKey(o) === button.dataset.ownerKey);
      if (!owner) continue;
      const count = owner.openTaskCount;
      button.querySelector('.onoff-followups-user-count').textContent = Number.isFinite(count) ? String(count) : owner.error ? '\u2014' : '...';
      button.querySelector('.onoff-followups-count-copy').textContent = Number.isFinite(count) ? `${count} tarea${count === 1 ? '' : 's'} abierta${count === 1 ? '' : 's'}` : owner.error ? 'Conteo no disponible; puede abrir el propietario.' : 'Contando tareas...';
      button.title = owner.error || (owner.ownerIds?.length > 1 ? `${owner.ownerIds.length} registros de Bitrix agrupados por nombre.` : 'Ver tareas abiertas');
    }
  }
  function renderTasks() {
    state.view = 'tasks'; results.replaceChildren(); toolbar();
    const tasks = getSorted();
    const ownerName = state.owner?.fullName || 'Propietario seleccionado';
    setStatus('', 'success');
    const summary = node('section', 'onoff-followups-summary');
    const copy = node('div'); copy.append(node('small', '', 'Propietario de la tarea'), node('strong', '', ownerName));
    copy.append(node('small', '', state.updatedAt ? `Consulta: ${formatDate(state.updatedAt, '')}${state.clientCache ? ' \u00b7 Resultado reciente' : ''}` : 'Tareas abiertas'));
    if (state.owner?.ownerIds?.length > 1) copy.append(node('small', '', `${state.owner.ownerIds.length} registros de Bitrix agrupados; las tareas no se duplican.`));
    summary.append(copy, node('span', 'onoff-followups-count', String(tasks.length))); results.append(summary);
    const sortbar = node('label', 'onoff-followups-sortbar', 'Ordenar tareas');
    const sort = node('select', 'onoff-followups-sort-select');
    [['created-desc', 'Creaci\u00f3n: m\u00e1s recientes'], ['created-asc', 'Creaci\u00f3n: m\u00e1s antiguas'], ['priority', 'Prioridad: alta primero']].forEach(([value, title]) => sort.append(option(value, title)));
    sort.value = state.sort;
    sort.addEventListener('change', () => {
      state.sort = sort.value; state.page = 1; renderTasks();
      chrome.storage.local.set({ onoffFollowupsSort: state.sort }).catch(() => {});
    });
    sortbar.append(sort); results.append(sortbar);
    if (!tasks.length) { results.append(empty('Sin tareas abiertas', 'No hay tareas abiertas visibles para este propietario.')); return; }
    const pages = Math.ceil(tasks.length / PAGE_SIZE);
    state.page = Math.max(1, Math.min(state.page, pages));
    const start = (state.page - 1) * PAGE_SIZE;
    const range = node('div', 'onoff-followups-range', `Mostrando ${start + 1}\u2013${Math.min(start + PAGE_SIZE, tasks.length)} de ${tasks.length}`);
    range.append(node('strong', '', `P\u00e1gina ${state.page} de ${pages}`)); results.append(range);
    const list = node('div', 'onoff-followups-list'); tasks.slice(start, start + PAGE_SIZE).forEach(task => list.append(taskCard(task))); results.append(list);
    if (pages > 1) results.append(pagination(pages));
  }
  function taskCard(task) {
    const card = node('article', 'onoff-followups-task' + (task.priority === 'Alta' ? ' is-high-priority' : ''));
    const top = node('div', 'onoff-followups-task-top');
    const title = node('div'); title.append(node('small', '', `Tarea #${task.id}`), node('strong', '', task.title));
    top.append(title, node('span', 'onoff-followups-task-status', task.status || 'Abierta')); card.append(top);
    const meta = node('dl', 'onoff-followups-task-meta');
    [['Responsable', task.responsible || 'No especificado'], ['Fecha l\u00edmite', formatDate(task.deadline, 'Sin fecha l\u00edmite')], ['Creado', formatDate(task.createdAt, 'No disponible')], ['Prioridad', task.priority || 'Normal']].forEach(([label, value]) => {
      const row = node('div'); row.append(node('dt', '', label), node('dd', '', value)); meta.append(row);
    });
    card.append(meta);
    const actions = node('div', 'onoff-followups-task-actions');
    const link = node('a', '', 'Abrir tarea \u2197');
    try {
      const url = new URL(task.url);
      if (url.protocol !== 'https:' || !/\/tasks\/task\/view\/\d+\/?$/.test(url.pathname)) throw new Error();
      link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(link);
    } catch { actions.append(node('small', '', 'Enlace no disponible')); }
    card.append(actions); return card;
  }
  function pagination(pages) {
    const nav = node('nav', 'onoff-followups-pagination'); nav.setAttribute('aria-label', 'P\u00e1ginas de tareas');
    const previous = node('button', '', '\u2190 Anterior'); previous.type = 'button'; previous.disabled = state.page === 1;
    const next = node('button', '', 'Siguiente \u2192'); next.type = 'button'; next.disabled = state.page === pages;
    const page = node('select'); page.setAttribute('aria-label', 'Ir a la p\u00e1gina');
    for (let i = 1; i <= pages; i++) page.append(option(String(i), `${i} / ${pages}`)); page.value = String(state.page);
    const go = number => { state.page = number; renderTasks(); content.scrollTop = 0; };
    previous.addEventListener('click', () => go(state.page - 1)); next.addEventListener('click', () => go(state.page + 1)); page.addEventListener('change', () => go(Number(page.value)));
    nav.append(previous, page, next); return nav;
  }
  function getSorted() {
    if (sortedFor === state.tasks && sortedMode === state.sort) return sortedTasks;
    sortedFor = state.tasks; sortedMode = state.sort;
    sortedTasks = [...state.tasks].sort((a, b) => {
      if (state.sort === 'priority' && a.priority !== b.priority) return a.priority === 'Alta' ? -1 : 1;
      const x = Date.parse(a.createdAt), y = Date.parse(b.createdAt);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return Number.isFinite(x) ? -1 : Number.isFinite(y) ? 1 : Number(b.id) - Number(a.id);
      return (state.sort === 'created-asc' ? x - y : y - x) || Number(b.id) - Number(a.id);
    });
    return sortedTasks;
  }
  function reset() {
    state.jobToken += 1; state.queryToken += 1; state.view = 'start'; state.query = ''; state.matches = []; state.owner = null; state.tasks = []; state.page = 1;
    input.value = ''; sacSelect.value = ''; setBusy(false); setStatus('', 'info'); renderStart(); content.scrollTop = 0; input.focus();
  }
  function toolbar() { back.hidden = state.view !== 'tasks' || state.matches.length < 2; refresh.disabled = state.busy || state.view === 'start'; }
  function setBusy(busy) { state.busy = busy; submit.disabled = busy; submit.textContent = busy ? 'Buscando...' : 'Buscar'; cancel.hidden = !busy; win.setAttribute('aria-busy', String(busy)); toolbar(); }
  function setStatus(message, type) { status.textContent = message; status.dataset.type = type; }
  function formatDate(value, fallback) { const date = value ? new Date(value) : null; return date && Number.isFinite(date.getTime()) ? dates.format(date) : fallback; }
  function ownerKey(owner) { return [...(owner.ownerIds || [owner.id])].map(String).sort().join('-'); }
  function node(tag, className = '', text) { const element = document.createElement(tag); if (className) element.className = className; if (text != null) element.textContent = text; return element; }
  function option(value, text) { const result = node('option', '', text); result.value = value; return result; }
  function empty(title, description) { const box = node('div', 'onoff-followups-empty-state'); box.append(node('strong', '', title), node('span', '', description)); return box; }
  function startDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = win.getBoundingClientRect();
    drag = { pointer: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
    window.addEventListener('pointermove', moveDrag, true); window.addEventListener('pointerup', stopDrag, true); window.addEventListener('pointercancel', stopDrag, true);
  }
  function moveDrag(event) { if (drag?.pointer === event.pointerId) { setPosition(event.clientX - drag.x, event.clientY - drag.y); keepInside(); } }
  function stopDrag(event) {
    if (drag?.pointer !== event.pointerId) return; drag = null;
    window.removeEventListener('pointermove', moveDrag, true); window.removeEventListener('pointerup', stopDrag, true); window.removeEventListener('pointercancel', stopDrag, true);
    const rect = win.getBoundingClientRect();
    chrome.storage.local.set({ [POSITION_KEY]: { left: Math.round(rect.left), top: Math.round(rect.top) }, onoffFollowupsUserPlaced: true }).catch(() => {});
  }
  async function applyPosition() {
    const stored = await chrome.storage.local.get(POSITION_KEY), position = stored[POSITION_KEY];
    if (position && Number.isFinite(position.left) && Number.isFinite(position.top)) setPosition(position.left, position.top);
    else { const p = panel.getBoundingClientRect(); setPosition(p.left - (win.offsetWidth || 560) - 10, p.top); }
    keepInside();
  }
  function keepInside() { if (!win || win.hidden) return; const r = win.getBoundingClientRect(); setPosition(Math.max(8, Math.min(r.left, innerWidth - r.width - 8)), Math.max(8, Math.min(r.top, innerHeight - r.height - 8))); }
  function setPosition(left, top) { win.style.left = Math.round(left) + 'px'; win.style.top = Math.round(top) + 'px'; win.style.right = 'auto'; win.style.bottom = 'auto'; }
})();
