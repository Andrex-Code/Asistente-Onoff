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
      tc: ['Número de TC', 'TC5900 o 5900'],
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
      if (mode === 'tc') renderDeals(data.deals || [], parsed);
      else if (mode === 'identification') renderCompanies(data.companies || [], data.identificationMasked);
      else renderTask(data.task);
    } catch (error) { setStatus(error.message || 'No fue posible consultar Bitrix.', 'error'); }
    finally { submitButton.disabled = false; input.disabled = false; }
  }

  function renderDeals(deals, tc) {
    if (!deals.length) return empty(`No se encontró ninguna negociación asociada a TC${tc}.`);
    setStatus(`${deals.length} negociación${deals.length === 1 ? '' : 'es'} encontrada${deals.length === 1 ? '' : 's'}.`, 'success');
    resultBox.innerHTML = ''; deals.forEach(deal => resultBox.appendChild(card(`TC${deal.tc || tc}`, deal.title, [['Estado',deal.stage],['Cliente',deal.client],['Responsable',deal.responsible],['Última actualización',formatDate(deal.updatedAt)],['ID',deal.id]], deal.url, 'Abrir negociación')));
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

  function card(kicker,title,details,url,openLabel) {
    const article=document.createElement('article'); article.className='onoff-bitrix-card';
    const heading=document.createElement('div'); heading.className='onoff-bitrix-card-title'; heading.innerHTML=`<strong>${escapeHtml(kicker)}</strong><span>${escapeHtml(title || '')}</span>`; article.appendChild(heading);
    const dl=document.createElement('dl'); details.forEach(([l,v])=>{const dt=document.createElement('dt');dt.textContent=l;const dd=document.createElement('dd');dd.textContent=v||'No especificado';dl.append(dt,dd);}); article.appendChild(dl);
    const actions=document.createElement('div');actions.className='onoff-bitrix-actions'; const open=document.createElement('button');open.className='is-primary';open.textContent=openLabel;open.onclick=()=>window.open(url,'_blank','noopener'); const copy=document.createElement('button');copy.textContent='Copiar enlace';copy.onclick=async()=>{await navigator.clipboard.writeText(url);copy.textContent='Enlace copiado';setTimeout(()=>copy.textContent='Copiar enlace',1200);}; actions.append(open,copy); article.appendChild(actions); return article;
  }
  function empty(message){setStatus(message,'empty');resultBox.innerHTML='<p class="onoff-bitrix-empty">Verifique el dato e intente nuevamente.</p>';}
  function setStatus(message,type){statusBox.textContent=message;statusBox.dataset.type=type||'';}
  function parseValue(value){const text=String(value||''); if(mode==='tc')return text.match(/^\s*(?:TC\s*[-:]?\s*)?(\d+)\s*$/i)?.[1]||''; if(mode==='task')return text.match(/^\s*(?:RAD(?:ICADO)?\s*[-:#]?\s*|#\s*)?(\d+)\s*$/i)?.[1]||''; const digits=text.replace(/\D/g,''); return digits.length>=5&&digits.length<=20?digits:'';}
  function formatDate(value){if(!value)return'No especificada';const d=new Date(value);return Number.isNaN(d.getTime())?'No especificada':new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short'}).format(d);}
  function startDrag(e){if(e.button!==0||e.target.closest('button'))return;const r=searchWindow.getBoundingClientRect();dragState={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top};window.addEventListener('pointermove',moveDrag,true);window.addEventListener('pointerup',endDrag,true);}
  function moveDrag(e){if(!dragState||e.pointerId!==dragState.id)return;searchWindow.style.left=`${clamp(e.clientX-dragState.x,8,window.innerWidth-searchWindow.offsetWidth-8)}px`;searchWindow.style.top=`${clamp(e.clientY-dragState.y,8,window.innerHeight-searchWindow.offsetHeight-8)}px`;searchWindow.style.right='auto';searchWindow.style.bottom='auto';}
  async function endDrag(e){if(!dragState||e.pointerId!==dragState.id)return;dragState=null;window.removeEventListener('pointermove',moveDrag,true);window.removeEventListener('pointerup',endDrag,true);const r=searchWindow.getBoundingClientRect();await chrome.storage.local.set({[POSITION_KEY]:{left:r.left,top:r.top}});}
  async function applyPosition(){const p=(await chrome.storage.local.get(POSITION_KEY))[POSITION_KEY];if(p){searchWindow.style.left=`${p.left}px`;searchWindow.style.top=`${p.top}px`;searchWindow.style.right='auto';searchWindow.style.bottom='auto';keepInside();}}
  function keepInside(){if(!searchWindow||searchWindow.hidden)return;const r=searchWindow.getBoundingClientRect();searchWindow.style.left=`${clamp(r.left,8,window.innerWidth-r.width-8)}px`;searchWindow.style.top=`${clamp(r.top,8,window.innerHeight-r.height-8)}px`;}
  function clamp(v,min,max){return Math.min(Math.max(v,min),Math.max(min,max));}
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
})();
