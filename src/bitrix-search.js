(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const POSITION_KEY = 'onoffBitrixSearchPosition';
  let panel, searchWindow, input, resultBox, statusBox, submitButton, mode = 'tc', dragState;

  init();

  function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) return setTimeout(init, 250);
    ensureButton();
    new MutationObserver(ensureButton).observe(panel, { childList: true });
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
    if (open) { await applyPosition(); input.focus(); }
  }

  function buildWindow() {
    searchWindow = document.createElement('section');
    searchWindow.className = 'onoff-bitrix-search';
    searchWindow.hidden = true;
    searchWindow.innerHTML = `
      <header class="onoff-bitrix-header"><div><strong>Buscar en Bitrix</strong><small>Negociaciones, clientes y radicados</small></div><div><button data-min title="Minimizar">−</button><button data-close title="Cerrar">×</button></div></header>
      <div class="onoff-bitrix-content">
        <nav class="onoff-bitrix-tabs"><button data-mode="tc" class="is-active">Por TC</button><button data-mode="identification">Por identificación</button><button data-mode="task">Por radicado</button></nav>
        <form class="onoff-bitrix-search-form"><label data-label>Número de TC</label><div><input autocomplete="off" placeholder="TC5900 o 5900"><button type="submit">Buscar</button></div></form>
        <div class="onoff-bitrix-status" aria-live="polite"></div><div class="onoff-bitrix-results"></div>
      </div>`;
    document.body.appendChild(searchWindow);
    input = searchWindow.querySelector('input'); resultBox = searchWindow.querySelector('.onoff-bitrix-results'); statusBox = searchWindow.querySelector('.onoff-bitrix-status'); submitButton = searchWindow.querySelector('button[type="submit"]');
    searchWindow.querySelector('[data-close]').onclick = closeWindow;
    searchWindow.querySelector('[data-min]').onclick = e => { searchWindow.classList.toggle('is-minimized'); e.currentTarget.textContent = searchWindow.classList.contains('is-minimized') ? '□' : '−'; };
    searchWindow.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode));
    searchWindow.querySelector('form').onsubmit = e => { e.preventDefault(); runSearch(); };
    searchWindow.querySelector('.onoff-bitrix-header').addEventListener('pointerdown', startDrag);
    window.addEventListener('resize', keepInside);
  }

  function setMode(next) {
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
    const parsed = parseValue(input.value);
    if (!parsed) return setStatus('Ingrese un valor válido para la búsqueda seleccionada.', 'error');
    submitButton.disabled = true; input.disabled = true; resultBox.innerHTML = ''; setStatus('Consultando Bitrix…', 'loading');
    try {
      const backend = String((await chrome.storage.sync.get('backendUrl')).backendUrl || 'https://asistente-onoff.vercel.app').replace(/\/$/, '');
      const endpoint = mode === 'tc' ? 'search-deal' : mode === 'identification' ? 'search-company' : 'search-task';
      const payload = mode === 'tc' ? { tc: parsed } : mode === 'identification' ? { identification: parsed } : { taskId: parsed };
      const response = await fetch(`${backend}/api/bitrix/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(data?.error || `El servidor respondió ${response.status}.`);
      if (mode === 'tc') {
        renderDeals(await enrichDealsWithLocalAfacturar(data.deals || []), parsed);
        void loadClientTasks(backend, parsed);
      }
      else if (mode === 'identification') renderCompanies(data.companies || [], data.identificationMasked);
      else renderTask(data.task);
    } catch (error) { setStatus(error.message || 'No fue posible consultar Bitrix.', 'error'); }
    finally { submitButton.disabled = false; input.disabled = false; }
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
    if (!deals.length) return empty(`No se encontró ninguna negociación asociada a TC${tc}.`);
    setStatus(`${deals.length} negociación${deals.length === 1 ? '' : 'es'} encontrada${deals.length === 1 ? '' : 's'}.`, 'success');
    resultBox.innerHTML = ''; deals.forEach(deal => resultBox.appendChild(card(`TC${deal.tc || tc}`, deal.title, [['Estado',deal.stage],['Cliente',deal.client],['Responsable',deal.responsible],['Última actualización',formatDate(deal.updatedAt)],['ID',deal.id]], deal.url, 'Abrir negociación', deal.afacturar)));
  }

  async function loadClientTasks(backend, tc) {
    const section=document.createElement('section');
    section.className='onoff-bitrix-tasks';
    section.innerHTML='<div class="onoff-bitrix-tasks-head"><div><strong>Tareas del cliente</strong><small>Consultando tareas asociadas a esta TC…</small></div><span class="onoff-bitrix-task-count">…</span></div><div class="onoff-bitrix-task-loading">Cargando tareas…</div>';
    resultBox.appendChild(section);
    try {
      const response=await fetch(`${backend}/api/bitrix/search-client-tasks`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tc})});
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.ok)throw new Error(data?.error||`El servidor respondió ${response.status}.`);
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
  function startDrag(e){if(e.button!==0||e.target.closest('button'))return;const r=searchWindow.getBoundingClientRect();dragState={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};window.addEventListener('pointermove',moveDrag,true);window.addEventListener('pointerup',endDrag,true);}
  function moveDrag(e){if(!dragState||e.pointerId!==dragState.id)return;searchWindow.style.left=`${clamp(e.clientX-dragState.x,8,window.innerWidth-searchWindow.offsetWidth-8)}px`;searchWindow.style.top=`${clamp(e.clientY-dragState.y,8,window.innerHeight-searchWindow.offsetHeight-8)}px`;searchWindow.style.right='auto';searchWindow.style.bottom='auto';}
  async function endDrag(e){if(!dragState||e.pointerId!==dragState.id)return;dragState=null;window.removeEventListener('pointermove',moveDrag,true);window.removeEventListener('pointerup',endDrag,true);const r=searchWindow.getBoundingClientRect();await chrome.storage.local.set({[POSITION_KEY]:{left:r.left,top:r.top}});}
  async function applyPosition(){const p=(await chrome.storage.local.get(POSITION_KEY))[POSITION_KEY];if(p){searchWindow.style.left=`${p.left}px`;searchWindow.style.top=`${p.top}px`;searchWindow.style.right='auto';searchWindow.style.bottom='auto';keepInside();}}
  function keepInside(){if(!searchWindow||searchWindow.hidden)return;const r=searchWindow.getBoundingClientRect();searchWindow.style.left=`${clamp(r.left,8,window.innerWidth-r.width-8)}px`;searchWindow.style.top=`${clamp(r.top,8,window.innerHeight-r.height-8)}px`;}
  function clamp(v,min,max){return Math.min(Math.max(v,min),Math.max(min,max));}
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
})();
