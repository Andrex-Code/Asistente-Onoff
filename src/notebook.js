(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const NOTES_KEY = 'onoffNotebookNotes';
  const TRASH_KEY = 'onoffNotebookTrash';
  const POSITION_KEY = 'onoffNotebookPosition';
  let panel;
  let windowEl;
  let notes = [];
  let trash = [];
  let activeId = null;
  let saveTimer;
  let dragState;

  init();

  function init() {
    panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) return setTimeout(init, 250);
    ensureButton();
    new MutationObserver(ensureButton).observe(panel, { childList: true });
  }

  function ensureButton() {
    const old = panel.querySelector('[data-action="followups"]');
    if (!old) return;
    old.textContent = 'Bloc de notas';
    old.dataset.action = 'notebook';
    const replacement = old.cloneNode(true);
    old.replaceWith(replacement);
    replacement.addEventListener('click', toggleWindow);
  }

  async function toggleWindow(event) {
    event?.preventDefault();
    event?.stopPropagation();
    if (!windowEl) buildWindow();
    const open = windowEl.hidden;
    windowEl.hidden = !open;
    panel.querySelector('[data-action="notebook"]')?.classList.toggle('is-active', open);
    if (open) {
      await loadData();
      await applyPosition();
      render();
    }
  }

  function buildWindow() {
    windowEl = document.createElement('section');
    windowEl.className = 'onoff-notebook';
    windowEl.hidden = true;
    windowEl.innerHTML = `
      <header class="onoff-notebook-header"><div><strong>Bloc de notas ONOFF</strong><small>Guardado automático local</small></div><div><button data-min title="Minimizar">−</button><button data-close title="Cerrar">×</button></div></header>
      <div class="onoff-notebook-body">
        <aside>
          <div class="onoff-notebook-tools"><input data-search placeholder="Buscar notas..."><button data-new title="Nueva nota">＋</button></div>
          <div class="onoff-notebook-filters"><button data-filter="all" class="is-active">Todas</button><button data-filter="pinned">Fijadas</button><button data-filter="tasks">Pendientes</button></div>
          <div class="onoff-notebook-list"></div>
          <div class="onoff-notebook-import"><button data-export>Exportar</button><button data-import>Importar</button><input data-file type="file" accept="application/json" hidden></div>
        </aside>
        <main>
          <div class="onoff-note-empty">Seleccione o cree una nota.</div>
          <div class="onoff-note-editor" hidden>
            <input data-title class="onoff-note-title" placeholder="Título de la nota">
            <div class="onoff-note-meta">
              <select data-priority><option value="normal">Normal</option><option value="important">Importante</option><option value="urgent">Urgente</option></select>
              <input data-tags placeholder="Etiquetas separadas por coma">
              <button data-pin title="Fijar">☆</button>
            </div>
            <textarea data-content placeholder="Escriba aquí... Use - [ ] para pendientes y - [x] para completados."></textarea>
            <div class="onoff-note-refs"><input data-tc placeholder="TC"><input data-id placeholder="Identificación"><input data-task placeholder="Radicado"><input data-url placeholder="Enlace Bitrix"></div>
            <small data-saved></small>
            <div class="onoff-note-actions"><button data-copy>Copiar</button><button data-open>Abrir enlace</button><button data-duplicate>Duplicar</button><button data-delete>Eliminar</button></div>
          </div>
        </main>
      </div>`;
    document.body.appendChild(windowEl);
    bindEvents();
  }

  function bindEvents() {
    windowEl.querySelector('[data-close]').onclick = () => { windowEl.hidden = true; panel.querySelector('[data-action="notebook"]')?.classList.remove('is-active'); };
    windowEl.querySelector('[data-min]').onclick = (e) => { windowEl.classList.toggle('is-minimized'); e.currentTarget.textContent = windowEl.classList.contains('is-minimized') ? '□' : '−'; };
    windowEl.querySelector('[data-new]').onclick = createNote;
    windowEl.querySelector('[data-search]').oninput = renderList;
    windowEl.querySelectorAll('[data-filter]').forEach((button) => button.onclick = () => { windowEl.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('is-active')); button.classList.add('is-active'); renderList(); });
    windowEl.querySelector('[data-export]').onclick = exportNotes;
    windowEl.querySelector('[data-import]').onclick = () => windowEl.querySelector('[data-file]').click();
    windowEl.querySelector('[data-file]').onchange = importNotes;
    ['title','priority','tags','content','tc','id','task','url'].forEach((name) => windowEl.querySelector(`[data-${name}]`).addEventListener('input', scheduleSave));
    windowEl.querySelector('[data-pin]').onclick = togglePin;
    windowEl.querySelector('[data-copy]').onclick = copyNote;
    windowEl.querySelector('[data-open]').onclick = openReference;
    windowEl.querySelector('[data-duplicate]').onclick = duplicateNote;
    windowEl.querySelector('[data-delete]').onclick = deleteNote;
    windowEl.querySelector('.onoff-notebook-header').addEventListener('pointerdown', startDrag);
    window.addEventListener('resize', keepInside);
  }

  async function loadData() {
    const data = await chrome.storage.local.get([NOTES_KEY, TRASH_KEY, 'followUps']);
    notes = Array.isArray(data[NOTES_KEY]) ? data[NOTES_KEY] : [];
    trash = Array.isArray(data[TRASH_KEY]) ? data[TRASH_KEY] : [];
    if (!notes.length && Array.isArray(data.followUps) && data.followUps.length) {
      notes = data.followUps.map(item => ({ id: item.id || crypto.randomUUID(), title: item.name || 'Seguimiento migrado', content: '', tags: ['Seguimiento migrado'], priority: 'normal', pinned: false, refs: { url: item.url || '' }, createdAt: item.createdAt || Date.now(), updatedAt: Date.now() }));
      await persist();
    }
    activeId = notes[0]?.id || null;
  }

  function createNote() {
    const note = { id: crypto.randomUUID(), title: 'Nueva nota', content: '', tags: [], priority: 'normal', pinned: false, refs: {}, createdAt: Date.now(), updatedAt: Date.now() };
    notes.unshift(note); activeId = note.id; persist(); render();
  }
  function activeNote() { return notes.find(n => n.id === activeId); }
  function render() { renderList(); renderEditor(); }
  function renderList() {
    const list = windowEl.querySelector('.onoff-notebook-list');
    const query = windowEl.querySelector('[data-search]').value.toLowerCase().trim();
    const filter = windowEl.querySelector('[data-filter].is-active')?.dataset.filter || 'all';
    const filtered = notes.filter(n => {
      const matches = !query || `${n.title} ${n.content} ${(n.tags || []).join(' ')}`.toLowerCase().includes(query);
      const filterOk = filter === 'all' || (filter === 'pinned' && n.pinned) || (filter === 'tasks' && /- \[ \]/.test(n.content || ''));
      return matches && filterOk;
    }).sort((a,b) => Number(b.pinned)-Number(a.pinned) || b.updatedAt-a.updatedAt);
    list.innerHTML = '';
    filtered.forEach(n => { const b = document.createElement('button'); b.className = `onoff-note-list-item${n.id===activeId?' is-active':''}`; b.innerHTML = `<strong>${n.pinned?'★ ':''}${escapeHtml(n.title || 'Sin título')}</strong><span>${escapeHtml((n.content || '').slice(0,70) || 'Nota vacía')}</span><small>${new Date(n.updatedAt).toLocaleString('es-CO')}</small>`; b.onclick = () => { activeId=n.id; render(); }; list.appendChild(b); });
    if (!filtered.length) list.innerHTML = '<small class="onoff-note-none">No hay notas para mostrar.</small>';
  }
  function renderEditor() {
    const note = activeNote();
    windowEl.querySelector('.onoff-note-empty').hidden = Boolean(note);
    const editor = windowEl.querySelector('.onoff-note-editor'); editor.hidden = !note; if (!note) return;
    windowEl.querySelector('[data-title]').value = note.title || '';
    windowEl.querySelector('[data-priority]').value = note.priority || 'normal';
    windowEl.querySelector('[data-tags]').value = (note.tags || []).join(', ');
    windowEl.querySelector('[data-content]').value = note.content || '';
    windowEl.querySelector('[data-tc]').value = note.refs?.tc || '';
    windowEl.querySelector('[data-id]').value = note.refs?.identification || '';
    windowEl.querySelector('[data-task]').value = note.refs?.task || '';
    windowEl.querySelector('[data-url]').value = note.refs?.url || '';
    windowEl.querySelector('[data-pin]').textContent = note.pinned ? '★' : '☆';
    windowEl.querySelector('[data-saved]').textContent = `Actualizada ${new Date(note.updatedAt).toLocaleString('es-CO')}`;
  }
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveEditor, 350); }
  async function saveEditor() { const n=activeNote(); if(!n)return; n.title=windowEl.querySelector('[data-title]').value.trim()||'Sin título'; n.priority=windowEl.querySelector('[data-priority]').value; n.tags=windowEl.querySelector('[data-tags]').value.split(',').map(x=>x.trim()).filter(Boolean); n.content=windowEl.querySelector('[data-content]').value; n.refs={tc:windowEl.querySelector('[data-tc]').value.trim(),identification:windowEl.querySelector('[data-id]').value.trim(),task:windowEl.querySelector('[data-task]').value.trim(),url:windowEl.querySelector('[data-url]').value.trim()}; n.updatedAt=Date.now(); await persist(); renderList(); windowEl.querySelector('[data-saved]').textContent='Guardado automáticamente'; }
  function togglePin(){ const n=activeNote(); if(!n)return; n.pinned=!n.pinned; n.updatedAt=Date.now(); persist(); render(); }
  async function copyNote(){ const n=activeNote(); if(n) await navigator.clipboard.writeText(`${n.title}\n\n${n.content}`.trim()); }
  function openReference(){ const url=activeNote()?.refs?.url; if(/^https:\/\//i.test(url)) window.open(url,'_blank','noopener'); }
  function duplicateNote(){ const n=activeNote(); if(!n)return; const c=structuredClone(n); c.id=crypto.randomUUID(); c.title=`${n.title} (copia)`; c.createdAt=c.updatedAt=Date.now(); notes.unshift(c); activeId=c.id; persist(); render(); }
  async function deleteNote(){ const n=activeNote(); if(!n||!confirm('¿Eliminar esta nota?'))return; trash.unshift({...n,deletedAt:Date.now()}); trash=trash.slice(0,30); notes=notes.filter(x=>x.id!==n.id); activeId=notes[0]?.id||null; await persist(); render(); }
  async function persist(){ await chrome.storage.local.set({[NOTES_KEY]:notes,[TRASH_KEY]:trash}); }
  function exportNotes(){ const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),notes},null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`onoff-notas-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href); }
  async function importNotes(e){ const file=e.target.files?.[0]; if(!file)return; try{const data=JSON.parse(await file.text()); if(!Array.isArray(data.notes))throw new Error(); const map=new Map(notes.map(n=>[n.id,n])); data.notes.forEach(n=>map.set(n.id||crypto.randomUUID(),n)); notes=[...map.values()]; await persist(); render();}catch{alert('El archivo no contiene un respaldo válido.');} e.target.value=''; }
  function startDrag(e){ if(e.button!==0||e.target.closest('button'))return; const r=windowEl.getBoundingClientRect(); dragState={id:e.pointerId,x:e.clientX-r.left,y:e.clientY-r.top}; window.addEventListener('pointermove',moveDrag,true); window.addEventListener('pointerup',endDrag,true); }
  function moveDrag(e){ if(!dragState||e.pointerId!==dragState.id)return; windowEl.style.left=`${clamp(e.clientX-dragState.x,8,window.innerWidth-windowEl.offsetWidth-8)}px`; windowEl.style.top=`${clamp(e.clientY-dragState.y,8,window.innerHeight-windowEl.offsetHeight-8)}px`; windowEl.style.right='auto'; windowEl.style.bottom='auto'; }
  async function endDrag(e){ if(!dragState||e.pointerId!==dragState.id)return; dragState=null; window.removeEventListener('pointermove',moveDrag,true); window.removeEventListener('pointerup',endDrag,true); const r=windowEl.getBoundingClientRect(); await chrome.storage.local.set({[POSITION_KEY]:{left:r.left,top:r.top}}); }
  async function applyPosition(){ const p=(await chrome.storage.local.get(POSITION_KEY))[POSITION_KEY]; if(p){windowEl.style.left=`${p.left}px`;windowEl.style.top=`${p.top}px`;windowEl.style.right='auto';windowEl.style.bottom='auto';keepInside();} }
  function keepInside(){ if(!windowEl||windowEl.hidden)return; const r=windowEl.getBoundingClientRect(); windowEl.style.left=`${clamp(r.left,8,window.innerWidth-r.width-8)}px`; windowEl.style.top=`${clamp(r.top,8,window.innerHeight-r.height-8)}px`; }
  function clamp(v,min,max){return Math.min(Math.max(v,min),Math.max(min,max));}
  function escapeHtml(v){return String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
})();
