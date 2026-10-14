(() => {
  'use strict';
  const ROOTS='.ikono-translator-panel,.onoff-assistant-window,.onoff-bitrix-search,.onoff-followups-window,.onoff-templates-window,.onoff-scripts-window,.ikono-translator-bubble,.ikono-translator-toolbar,.ikono-translator-launcher';
  const icons={chat:'<rect x="3" y="5" width="18" height="14" rx="5"/><path d="M8 10h.1M16 10h.1M8 14h8"/>',search:'<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6"/>',tasks:'<rect x="5" y="3" width="14" height="18" rx="3"/><path d="m8 9 2 2 5-5M8 16h8"/>',templates:'<path d="M6 3h9l4 4v14H6Z M15 3v5h4M9 12h7M9 16h7"/>'};
  const media=matchMedia('(prefers-color-scheme: dark)');
  let theme='system', motion=true, menuObserver;
  const svg=paths=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+paths+'</svg>';
  function appearance(root){root.dataset.theme=theme==='system'?(media.matches?'dark':'light'):theme;root.classList.toggle('onoff-motion-reduced',!motion);}
  function decorate(root){
    root.classList.add('onoff-ui');appearance(root);
    const header=root.querySelector('header');
    if(header&&!header.classList.contains('onoff-window-header')){
      header.classList.add('onoff-window-header');
      const heading=header.querySelector(':scope>div');
      if(heading){heading.classList.add('onoff-window-heading');const mark=document.createElement('span');mark.className='onoff-tool-mark';mark.innerHTML=svg(root.matches('.onoff-assistant-window')?icons.chat:root.matches('.onoff-bitrix-search')?icons.search:root.matches('.onoff-followups-window')?icons.tasks:icons.templates);heading.prepend(mark);}
      header.querySelectorAll('button').forEach(button=>{if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label',button.title||'Cerrar');});
      root.setAttribute('role','dialog');root.setAttribute('aria-label',heading?.querySelector('strong')?.textContent||'Asistente ONOFF');
    }
    if(root.matches('.ikono-translator-panel')){
      menuObserver?.disconnect();decorateMenu(root);
      if(!root.dataset.onoffMobileNavigation){root.dataset.onoffMobileNavigation='true';root.addEventListener('click',event=>{const action=event.target.closest('button[data-action]')?.dataset.action;if(matchMedia('(max-width:620px)').matches&&['assistant-chat','bitrix-search','followups','templates','scripts'].includes(action))setTimeout(()=>{root.hidden=true;document.querySelector('.ikono-translator-launcher')?.setAttribute('aria-expanded','false');},0);},true);}
      menuObserver=new MutationObserver(()=>decorateMenu(root));menuObserver.observe(root,{childList:true,subtree:true});
    }
  }
  function decorateMenu(panel){
    if(!panel.querySelector('.onoff-menu-head')){
      const head=document.createElement('div');head.className='onoff-menu-head';
      head.innerHTML='<div><span class="onoff-brand"><span class="onoff-brand-dot"></span>ASISTENTE ONOFF</span><h2>¿Qué hacemos hoy?</h2></div><button class="onoff-icon-button" type="button" data-menu-close aria-label="Cerrar menú" title="Cerrar menú">×</button>';
      const search=document.createElement('label');search.className='onoff-menu-search';search.innerHTML=svg('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>')+'<input type="search" placeholder="Busca una herramienta…" aria-label="Buscar herramientas" autocomplete="off">';
      const quick=document.createElement('div');quick.className='onoff-menu-caption';quick.dataset.group='quick';quick.textContent='Conversación y textos';
      const workspace=document.createElement('div');workspace.className='onoff-menu-caption';workspace.dataset.group='workspace';workspace.textContent='Tu espacio de trabajo';
      const empty=document.createElement('p');empty.className='onoff-menu-empty';empty.hidden=true;empty.textContent='No hay herramientas con ese nombre.';
      panel.prepend(head,search,quick);panel.append(workspace,empty);
      head.querySelector('button').addEventListener('click',()=>closeMenu(panel));
      search.querySelector('input').addEventListener('input',event=>filterMenu(panel,event.target.value));
    }
    let footer=panel.querySelector('.onoff-menu-preferences');
    if(!footer){footer=document.createElement('details');footer.className='onoff-menu-preferences';footer.innerHTML='<summary>Personaliza tu espacio</summary><label class="onoff-theme-select">Apariencia<select class="onoff-theme-control" aria-label="Tema de la extensión"><option value="system">Automática</option><option value="light">Clara</option><option value="dark">Oscura</option></select></label>';panel.append(footer);footer.querySelector('select').value=theme;}
    panel.querySelectorAll(':scope>.ikono-translator-panel-check').forEach(label=>footer.append(label));
    const search=panel.querySelector('.onoff-menu-search input');if(search?.value)filterMenu(panel,search.value);
  }
  function filterMenu(panel,query){const q=normalize(query);let visible=0;panel.querySelectorAll(':scope>button[data-action]').forEach(button=>{button.hidden=!normalize(button.textContent).includes(q);if(!button.hidden)visible++;});panel.querySelector('.onoff-menu-empty').hidden=visible!==0;panel.querySelectorAll('.onoff-menu-caption,.onoff-menu-divider').forEach(node=>node.hidden=Boolean(q));}
  function normalize(text){return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
  function closeMenu(panel){panel.hidden=true;const launcher=document.querySelector('.ikono-translator-launcher');launcher?.setAttribute('aria-expanded','false');launcher?.focus({preventScroll:true});}
  function refresh(){document.querySelectorAll('.onoff-ui').forEach(appearance);document.querySelectorAll('.onoff-ui .onoff-theme-control').forEach(select=>select.value=theme);}
  chrome.storage.sync.get(['onoffTheme','onoffMascotMotionEnabled'],saved=>{theme=['light','dark'].includes(saved.onoffTheme)?saved.onoffTheme:'system';motion=saved.onoffMascotMotionEnabled??true;refresh();});
  chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='sync')return;if(changes.onoffTheme)theme=['light','dark'].includes(changes.onoffTheme.newValue)?changes.onoffTheme.newValue:'system';if(changes.onoffMascotMotionEnabled)motion=changes.onoffMascotMotionEnabled.newValue??true;refresh();});
  media.addEventListener('change',refresh);
  document.addEventListener('change',event=>{if(event.target.matches('.onoff-ui .onoff-theme-control'))chrome.storage.sync.set({onoffTheme:event.target.value});});
  document.addEventListener('keydown',event=>{if(event.key!=='Escape'||event.defaultPrevented)return;const root=event.target.closest?.(ROOTS);if(!root)return;if(root.matches('.ikono-translator-panel,.ikono-translator-launcher')){event.preventDefault();const panel=document.querySelector('.ikono-translator-panel');if(panel)closeMenu(panel);}else{const close=root.querySelector('[data-close],[data-window-action=close],button[aria-label=Cerrar]');if(close){event.preventDefault();close.click();document.querySelector('.ikono-translator-launcher')?.focus({preventScroll:true});}}});
  document.querySelectorAll(ROOTS).forEach(decorate);
  new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType===1&&node.matches(ROOTS))decorate(node);}}).observe(document.body,{childList:true});
})();
