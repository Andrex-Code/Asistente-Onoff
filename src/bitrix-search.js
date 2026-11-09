(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const POSITION_KEY = 'onoffBitrixSearchPosition';
  let buttonObserver;
  let searchGeneration = 0;
  let dealCardSequence = 0;
  let panel, searchWindow, input, resultBox, statusBox, submitButton, mode = 'tc', dragState;

  init();
  window.addEventListener('onoff:launcher-mounted', init);

  function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) return setTimeout(init, 250);
    ensureButton();
    buttonObserver?.disconnect();
    buttonObserver = new MutationObserver(ensureButton);
    buttonObserver.observe(panel, { childList: true });
  }

  function ensureButton() {
    let button = panel.querySelector('[data-action="bitrix-search"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = 'bitrix-search';
      button.innerHTML = '<span>Buscar en Bitrix</span><span class="onoff-chevron">›</span>';
      const assistant = panel.querySelector('[data-action="assistant-chat"]');
      panel.insertBefore(button, assistant || panel.querySelector('[data-subview]') || null);
    }
    if (button.dataset.bound) return;
    button.dataset.bound = '1';
    button.addEventListener('click', toggleWindow);
  }

  async function toggleWindow(event) {
    event.preventDefault(); event.stopPropagation();
    if (!searchWindow) buildWindow();
    const open = searchWindow.hidden;
    searchWindow.hidden = !open;
    event.currentTarget.classList.toggle('is-active', open);
    if (open) { notifyMascot('notify', 1300); await applyPosition(); input.focus(); }
  }

  function buildWindow() {
    searchWindow = document.createElement('section');
    searchWindow.className = 'onoff-bitrix-search';
    searchWindow.hidden = true;
    searchWindow.innerHTML = `
      <header class="onoff-bitrix-header" title="Arrastre para mover · Doble clic para minimizar"><div><strong>Buscar en Bitrix</strong><small>Arrastre para mover</small></div><div><button data-pin title="Mantener encima de las otras herramientas" aria-label="Fijar ventana" aria-pressed="false">♧</button><button data-min title="Minimizar" aria-label="Minimizar ventana">−</button><button data-close title="Cerrar" aria-label="Cerrar Bitrix">×</button></div></header>
      <div class="onoff-bitrix-content">
        <nav class="onoff-bitrix-tabs"><button data-mode="tc" class="is-active">Por TC</button><button data-mode="identification">Por identificación</button><button data-mode="task">Por radicado</button></nav>
        <form class="onoff-bitrix-search-form"><label data-label>Número de TC</label><div><input autocomplete="off" placeholder="TC5900 o 5900"><button type="submit">Buscar</button></div></form>
        <div class="onoff-bitrix-status" aria-live="polite"></div><div class="onoff-bitrix-results"></div>
      </div>`;
    document.body.appendChild(searchWindow);
    input = searchWindow.querySelector('input'); resultBox = searchWindow.querySelector('.onoff-bitrix-results'); statusBox = searchWindow.querySelector('.onoff-bitrix-status'); submitButton = searchWindow.querySelector('button[type="submit"]');
    searchWindow.querySelector('[data-close]').onclick = closeWindow;
    searchWindow.querySelector('[data-min]').onclick = e => { searchWindow.classList.toggle('is-minimized'); e.currentTarget.textContent = searchWindow.classList.contains('is-minimized') ? '□' : '−'; };
    const pin = searchWindow.querySelector('[data-pin]');
    pin.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 3 6 0-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v6"/></svg>';
    const setPinned = value => {
      searchWindow.dataset.pinned = String(value); pin.setAttribute('aria-pressed', String(value));
      pin.title = value ? 'Dejar de mantener encima de las otras herramientas' : 'Mantener encima de las otras herramientas';
      searchWindow.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    };
    pin.onclick = () => { const value = searchWindow.dataset.pinned !== 'true'; setPinned(value); chrome.storage.local.set({ onoffBitrixSearchPinned: value }).catch(() => {}); };
    chrome.storage.local.get('onoffBitrixSearchPinned').then(saved => setPinned(saved.onoffBitrixSearchPinned === true));
    searchWindow.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
    searchWindow.querySelector('form').onsubmit = e => { e.preventDefault(); runSearch(); };
    searchWindow.querySelector('.onoff-bitrix-header').addEventListener('pointerdown', startDrag);
    searchWindow.querySelector('.onoff-bitrix-header').addEventListener('dblclick', event => { if (!event.target.closest('button')) searchWindow.querySelector('[data-min]').click(); });
    window.addEventListener('resize', keepInside);
  }

  function setMode(next) {
    searchGeneration += 1;
    mode = next; resultBox.innerHTML = ''; statusBox.textContent = '';
    searchWindow.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('is-active', b.dataset.mode === mode));
    const map = {
      tc: ['Número de TC', 'TC5900, 5900 o TC6143-C'],
      identification: ['Número de identificación', 'CC 1053790482 o 1.053.790.482'],
      task: ['Número de radicado', '505942 o RAD-505942']
    };
    searchWindow.querySelector('[data-label]').textContent = map[mode][0]; input.placeholder = map[mode][1]; input.value = ''; input.focus();
  }

  function closeWindow() { searchWindow.hidden = true; panel.querySelector('[data-action="bitrix-search"]')?.classList.remove('is-active'); }

  async function runSearch() {
    if (submitButton.disabled) return;
    const parsed = parseValue(input.value);
    if (!parsed) { setStatus('Ingrese un valor válido para la búsqueda seleccionada.', 'error'); notifyMascot('error', 1800); return; }
    const generation = ++searchGeneration;
    const searchMode = mode;
    notifyMascot('search');
    submitButton.disabled = true; input.disabled = true; resultBox.innerHTML = ''; setStatus('Consultando Bitrix…', 'loading');
    try {
      const data = await queryBitrix(searchMode, parsed);
      if (generation !== searchGeneration) return;
      if (searchMode === 'tc') {
        // Also protect clients that still point to an older backend deployment.
        const candidates = (Array.isArray(data.deals) ? data.deals : []).filter(deal => deal.tc && normalizePlatform(deal.tc).includes(normalizePlatform(parsed)))
          .sort((a,b) => Number(normalizePlatform(b.tc) === normalizePlatform(parsed)) - Number(normalizePlatform(a.tc) === normalizePlatform(parsed)));
        const deals = await enrichDealsWithLocalAfacturar(candidates);
        if (generation !== searchGeneration) return;
        renderDeals(deals, parsed);
        if (deals.some(deal => normalizePlatform(deal.tc) === normalizePlatform(parsed))) void loadClientTasks(parsed, generation);
      }
      else if (searchMode === 'identification') renderCompanies(data.companies || [], data.identificationMasked);
      else renderTask(data.task);
      notifyMascot('success', 1800);
    } catch (error) { if (generation === searchGeneration) { setStatus(error.message || 'No fue posible consultar Bitrix.', 'error'); notifyMascot('error', 2400); } }
    finally { submitButton.disabled = false; input.disabled = false; }
  }

  async function queryBitrix(action, value) {
    let data;
    try { data = await chrome.runtime.sendMessage({ type: 'ONOFF_BITRIX_REQUEST', action, value }); }
    catch { throw new Error('No fue posible comunicarse con la extensión. Recárguela y actualice esta página.'); }
    if (!data?.ok) throw new Error(data?.error || 'La extensión no respondió. Recárguela y actualice esta página.');
    return data;
  }

  async function enrichDealsWithLocalAfacturar(deals) {
    return Promise.all(deals.map(async deal => {
      if (deal.afacturar?.url) return deal;
      try {
        const response = await chrome.runtime.sendMessage({ type: 'ONOFF_LOOKUP_AFACTURAR', platform: deal.tc });
        return response?.afacturar?.url ? { ...deal, afacturar: response.afacturar } : deal;
      } catch {
        return deal;
      }
    }));
  }

  function normalizePlatform(value) {
    return String(value || '').trim().toUpperCase().replace(/^TC\s*/i, '').replace(/\s+/g, '');
  }

  function renderDeals(deals, tc) {
    if (!deals.length) return empty(`No se encontraron negociaciones para TC${tc}.`);
    setStatus(`${deals.length} negociación${deals.length === 1 ? '' : 'es'} encontrada${deals.length === 1 ? '' : 's'}.`, 'success');
    resultBox.innerHTML = ''; deals.forEach(deal => resultBox.appendChild(dealCard(deal, tc)));
  }

  function dealCard(deal, tc) {
    const article = document.createElement('article'); article.className = 'onoff-bitrix-card';
    const match = document.createElement('small'); match.className = 'onoff-bitrix-match';
    match.textContent = normalizePlatform(deal.tc) === normalizePlatform(tc) ? 'Coincidencia exacta' : 'TC similar';
    article.appendChild(match);
    const tabs = document.createElement('div'); tabs.className = 'onoff-bitrix-record-tabs';
    tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', `Información de TC${deal.tc || tc}`);
    const prefix = `onoff-bitrix-record-${++dealCardSequence}`;
    const company = deal.company;
    const companyAvailable = company?.status === 'available';
    const negotiation = card(`TC${deal.tc || tc}`, deal.title, [
      ['Cliente', deal.client], ['NIT / identificación', companyAvailable ? company.identification : 'No disponible']
    ], deal.url, 'Abrir negociación', deal.afacturar);
    const plan = document.createElement('section'); plan.className = 'onoff-bitrix-plan';
    const planTitle = document.createElement('strong'); planTitle.textContent = 'Plan contratado'; plan.appendChild(planTitle);
    if (deal.plan?.status === 'available' && Array.isArray(deal.plan.items) && deal.plan.items.length) {
      const list = document.createElement('ul');
      deal.plan.items.forEach(name => { const item = document.createElement('li'); item.textContent = name; list.appendChild(item); });
      plan.appendChild(list);
      const source = document.createElement('small'); source.textContent = 'Productos registrados en «Producto Plan» de Bitrix.'; plan.appendChild(source);
      if (deal.plan.hasMore) { const more = document.createElement('small'); more.textContent = 'Hay más productos. Abra la negociación para verlos todos.'; plan.appendChild(more); }
    } else {
      const message = document.createElement('p');
      message.textContent = deal.plan?.status === 'empty' ? 'No hay productos registrados en esta negociación.' : 'No fue posible consultar el plan contratado. Abra la negociación para verificarlo.';
      plan.appendChild(message);
    }
    negotiation.insertBefore(plan, negotiation.lastElementChild);
    const updated = document.createElement('small'); updated.className = 'onoff-bitrix-record-updated';
    updated.textContent = `Última actualización: ${formatDate(deal.updatedAt)}`;
    negotiation.insertBefore(updated, negotiation.lastElementChild);

    let companyBody;
    if (companyAvailable) {
      companyBody = card('Compañía asociada', company.name, [
        ['NIT / identificación', company.identification],
        ['Teléfono', (company.phones || []).join(' · ')], ['Correo', (company.emails || []).join(' · ')]
      ], company.url, 'Abrir compañía');
    } else {
      companyBody = document.createElement('div');
      const message = document.createElement('p'); message.className = 'onoff-bitrix-record-notice';
      message.textContent = !company ? 'El servidor todavía no incluye los datos de compañía. Actualice el backend para usar esta pestaña.'
        : company.status === 'none' ? 'Esta negociación no tiene una compañía asociada.'
        : 'No fue posible consultar la compañía asociada. Verifique el acceso en Bitrix e intente buscar nuevamente.';
      companyBody.appendChild(message);
    }
    const panels = [negotiation, companyBody].map((body, index) => {
      const panel = document.createElement('section'); panel.className = 'onoff-bitrix-record-panel';
      panel.id = `${prefix}-panel-${index}`; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `${prefix}-tab-${index}`);
      while (body.firstChild) panel.appendChild(body.firstChild);
      return panel;
    });
    const buttons = ['Negociación', 'Compañía'].map((label, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.id = `${prefix}-tab-${index}`; button.setAttribute('role', 'tab'); button.setAttribute('aria-controls', panels[index].id);
      button.onclick = () => select(index);
      button.onkeydown = event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
        select(next); buttons[next].focus();
      };
      tabs.appendChild(button); return button;
    });
    function select(index) {
      buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; panels[i].hidden = i !== index; });
    }
    select(0); article.append(tabs, ...panels); return article;
  }

  async function loadClientTasks(tc, generation) {
    const section=document.createElement('section');
    section.className='onoff-bitrix-tasks';
    section.innerHTML='<div class="onoff-bitrix-tasks-head"><div><strong>Tareas del cliente</strong><small>Consultando tareas asociadas a esta TC…</small></div><span class="onoff-bitrix-task-count">…</span></div><div class="onoff-bitrix-task-loading">Cargando tareas…</div>';
    resultBox.appendChild(section);
    try {
      const data=await queryBitrix('tasks', tc);
      if (generation !== searchGeneration) return;
      renderClientTasks(section,data);
    } catch(error) {
      section.innerHTML='<div class="onoff-bitrix-tasks-head"><div><strong>Tareas del cliente</strong><small>No fue posible cargar las tareas.</small></div></div>';
      const message=document.createElement('p');message.className='onoff-bitrix-task-error';message.textContent=error.message||'No fue posible consultar las tareas en Bitrix.';section.appendChild(message);
    }
  }

  function renderClientTasks(section,data) {
    const open=Array.isArray(data.open)?data.open:[];
    const closed=Array.isArray(data.closed)?data.closed:(Array.isArray(data.recentClosed)?data.recentClosed:[]);
    const openCount=Number(data.counts?.open||open.length);
    const closedCount=Number(data.counts?.closed||closed.length);
    section.innerHTML='';

    const head=document.createElement('div');head.className='onoff-bitrix-tasks-head';
    const titleWrap=document.createElement('div');
    const title=document.createElement('strong');title.textContent='Tareas del cliente';
    const subtitle=document.createElement('small');subtitle.textContent=`${openCount} abierta${openCount===1?'':'s'} · ${closedCount} cerrada${closedCount===1?'':'s'} en total`;
    titleWrap.append(title,subtitle);
    const count=document.createElement('span');count.className='onoff-bitrix-task-count';count.textContent=String(openCount);
    head.append(titleWrap,count);section.appendChild(head);

    section.appendChild(renderTaskGroup({
      title:'Abiertas',
      items:open,
      total:openCount,
      closed:false,
      initialLimit:3,
      emptyText:'No hay tareas abiertas asociadas a esta TC.'
    }));

    section.appendChild(renderTaskGroup({
      title:'Cerradas recientes',
      items:closed,
      total:closedCount,
      closed:true,
      initialLimit:3,
      emptyText:'No se encontraron tareas cerradas.'
    }));
  }

  function renderTaskGroup({title,items,total,closed,initialLimit,emptyText}) {
    const block=document.createElement('div');block.className='onoff-bitrix-task-group';
    const groupTitle=document.createElement('div');groupTitle.className='onoff-bitrix-task-group-title';groupTitle.textContent=`${title} (${total})`;block.appendChild(groupTitle);

    if(!items.length){
      const p=document.createElement('p');p.className='onoff-bitrix-task-empty';p.textContent=emptyText;block.appendChild(p);return block;
    }

    const list=document.createElement('div');list.className='onoff-bitrix-task-list';block.appendChild(list);
    const step=5;
    let visibleCount=Math.min(initialLimit,items.length);

    const paint=()=>{
      list.innerHTML='';
      items.slice(0,visibleCount).forEach(task=>list.appendChild(taskItem(task,closed)));
      if(!toggle)return;

      const remaining=items.length-visibleCount;
      if(remaining>0){
        toggle.textContent=`Ver ${Math.min(step,remaining)} más`;
        toggle.dataset.action='more';
      }else{
        toggle.textContent='Ver menos';
        toggle.dataset.action='less';
      }
    };

    let toggle=null;
    if(items.length>initialLimit){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='onoff-bitrix-task-toggle';
      toggle.onclick=()=>{
        if(toggle.dataset.action==='less') visibleCount=Math.min(initialLimit,items.length);
        else visibleCount=Math.min(visibleCount+step,items.length);
        paint();
      };
      block.appendChild(toggle);
    }

    paint();
    return block;
  }

  function taskItem(task,closed) {
    const article=document.createElement('article');article.className=`onoff-bitrix-task ${closed?'is-closed':'is-open'}`;
    const top=document.createElement('div');top.className='onoff-bitrix-task-top';
    const info=document.createElement('div');
    const rad=document.createElement('small');rad.textContent=`Radicado ${task.id}`;
    const title=document.createElement('strong');title.textContent=task.title||`Radicado ${task.id}`;
    info.append(rad,title);
    const badge=document.createElement('span');badge.className='onoff-bitrix-task-status';badge.textContent=task.status||'Sin estado';
    top.append(info,badge);article.appendChild(top);

    const meta=document.createElement('div');meta.className='onoff-bitrix-task-meta';
    addTaskMeta(meta,'Responsable',task.responsible||'No especificado');
    addTaskMeta(meta,closed?'Cerrada':'Fecha límite',formatDate(closed?(task.closedAt||task.updatedAt):task.deadline));
    if(task.priority==='Alta')addTaskMeta(meta,'Prioridad','Alta');
    article.appendChild(meta);

    const open=document.createElement('button');open.type='button';open.className='onoff-bitrix-task-open';open.textContent='Abrir tarea';open.onclick=()=>window.open(task.url,'_blank','noopener');article.appendChild(open);
    return article;
  }

  function addTaskMeta(container,label,value) {
    const row=document.createElement('div');const key=document.createElement('span');key.textContent=label;const val=document.createElement('strong');val.textContent=value||'No especificado';row.append(key,val);container.appendChild(row);
  }

  function renderCompanies(companies, masked) {
    if (!companies.length) return empty('No se encontró ningún cliente con esa identificación.');
    setStatus(`${companies.length} cliente${companies.length === 1 ? '' : 's'} encontrado${companies.length === 1 ? '' : 's'}.`, 'success');
    resultBox.innerHTML = '';
    companies.forEach(company => {
      const node = card('Cliente', company.name, [['Identificación',masked],['Responsable',company.responsible],['Última actualización',formatDate(company.updatedAt)],['ID',company.id]], company.url, 'Abrir cliente');
      if (company.deals?.length) {
        const section = document.createElement('div'); section.className='onoff-bitrix-related'; section.innerHTML='<strong>Negociaciones relacionadas</strong>';
        company.deals.forEach(deal => { const b=document.createElement('button'); b.textContent=`${deal.tc ? `TC${deal.tc} · ` : ''}${deal.title}`; b.onclick=()=>window.open(deal.url,'_blank','noopener'); section.appendChild(b); });
        node.appendChild(section);
      }
      resultBox.appendChild(node);
    });
  }

  function renderTask(task) {
    if (!task) return empty('No se encontró el radicado.');
    setStatus(`Radicado ${task.id} encontrado.`, 'success');
    resultBox.innerHTML=''; const details=[['Estado',task.status],['Responsable',task.responsible],['Propietario',task.creator],['Fecha límite',formatDate(task.deadline)],['Fecha de creación',formatDate(task.createdAt)],['Grupo',task.groupId || 'No especificado']]; if(task.tc) details.push(['TC relacionada',`TC${task.tc}`]);
    resultBox.appendChild(card(`Radicado ${task.id}`,task.title,details,task.url,'Abrir tarea'));
  }

  function card(kicker,title,details,url,openLabel,afacturar) {
    const article=document.createElement('article'); article.className='onoff-bitrix-card';
    const heading=document.createElement('div'); heading.className='onoff-bitrix-card-title'; heading.innerHTML=`<strong>${escapeHtml(kicker)}</strong><span>${escapeHtml(title || '')}</span>`; article.appendChild(heading);
    const dl=document.createElement('dl'); details.forEach(([l,v])=>{const dt=document.createElement('dt');dt.textContent=l;const dd=document.createElement('dd');dd.textContent=v||'No especificado';dl.append(dt,dd);}); article.appendChild(dl);
    const actions=document.createElement('div');actions.className='onoff-bitrix-actions'; const open=document.createElement('button');open.className='is-primary';open.textContent=openLabel;open.onclick=()=>window.open(url,'_blank','noopener'); actions.appendChild(open); if(afacturar?.url){const af=document.createElement('button');af.className='is-afacturar';af.textContent='Abrir en Afacturar';af.title=afacturar.status?`Estado Afacturar: ${afacturar.status}`:'Abrir perfil en Afacturar';af.onclick=()=>window.open(afacturar.url,'_blank','noopener');actions.appendChild(af);} const copy=document.createElement('button');copy.textContent='Copiar enlace';copy.onclick=async()=>{await navigator.clipboard.writeText(url);copy.textContent='Enlace copiado';setTimeout(()=>copy.textContent='Copiar enlace',1200);}; actions.appendChild(copy); article.appendChild(actions); return article;
  }
  function empty(message){setStatus(message,'empty');resultBox.innerHTML='<p class="onoff-bitrix-empty">Verifique el dato e intente nuevamente.</p>';}
  function setStatus(message,type){statusBox.textContent=message;statusBox.dataset.type=type||'';}
  function parseValue(value){const text=String(value||''); if(mode==='tc')return normalizePlatform(text.match(/^\s*(?:TC\s*[-:]?\s*)?(\d+(?:-[A-Z])?)\s*$/i)?.[1]||''); if(mode==='task')return text.match(/^\s*(?:RAD(?:ICADO)?\s*[-:#]?\s*|#\s*)?(\d+)\s*$/i)?.[1]||''; const digits=text.replace(/\D/g,''); return digits.length>=5&&digits.length<=20?digits:'';}
  function formatDate(value){if(!value)return'No especificada';const d=new Date(value);return Number.isNaN(d.getTime())?'No especificada':new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short'}).format(d);}
  function startDrag(e){if(e.button!==0||e.target.closest('button'))return;e.preventDefault();const r=searchWindow.getBoundingClientRect();dragState={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};searchWindow.classList.add('is-dragging');window.addEventListener('pointermove',moveDrag,true);window.addEventListener('pointerup',endDrag,true);window.addEventListener('pointercancel',endDrag,true);}
  function moveDrag(e){if(!dragState||e.pointerId!==dragState.id)return;searchWindow.style.left=`${clamp(e.clientX-dragState.x,8,window.innerWidth-searchWindow.offsetWidth-8)}px`;searchWindow.style.top=`${clamp(e.clientY-dragState.y,8,window.innerHeight-searchWindow.offsetHeight-8)}px`;searchWindow.style.right='auto';searchWindow.style.bottom='auto';}
  async function endDrag(e){if(!dragState||e.pointerId!==dragState.id)return;dragState=null;searchWindow.classList.remove('is-dragging');window.removeEventListener('pointermove',moveDrag,true);window.removeEventListener('pointerup',endDrag,true);window.removeEventListener('pointercancel',endDrag,true);const r=searchWindow.getBoundingClientRect();await chrome.storage.local.set({[POSITION_KEY]:{left:r.left,top:r.top},onoffBitrixSearchUserPlaced:true});}
  async function applyPosition(){const p=(await chrome.storage.local.get(POSITION_KEY))[POSITION_KEY];if(p){searchWindow.style.left=`${p.left}px`;searchWindow.style.top=`${p.top}px`;searchWindow.style.right='auto';searchWindow.style.bottom='auto';keepInside();}}
  function keepInside(){if(!searchWindow||searchWindow.hidden)return;const r=searchWindow.getBoundingClientRect();searchWindow.style.left=`${clamp(r.left,8,window.innerWidth-r.width-8)}px`;searchWindow.style.top=`${clamp(r.top,8,window.innerHeight-r.height-8)}px`;}
  function clamp(v,min,max){return Math.min(Math.max(v,min),Math.max(min,max));}
  function notifyMascot(state, duration = 0) { window.dispatchEvent(new CustomEvent('onoff:mascot-state', { detail: { state, duration } })); }
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
})();
