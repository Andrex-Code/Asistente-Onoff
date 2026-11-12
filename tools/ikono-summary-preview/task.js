(() => {
 const team=['211','490253','601125','672371','1460672','1470334','1523392','1585264','2006588','2188252','2315788','2316058'];
 const template={id:'477',name:'PRIMER CONTACTO',responsible:'Guadalupe Ríos Pelaez',project:'SAC TiendasOn',participants:team,observer:'1870252'};
 let previousTc='',descriptionEdited=false,host,root,box,room=location.hash,records=new Map(),lookup=null,epoch=0,classification={},last='';
 const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());let today=day();
 function collect(){
  if(room!==location.hash||today!==day()){room=location.hash;today=day();records.clear();lookup=null;epoch++;classification={};descriptionEdited=false;}
  for(const e of document.querySelectorAll('li.mx_EventTile[data-event-id]')){
   if(e.matches('.mx_EventTile_info')||e.querySelector('.mx_MNoticeBody'))continue;
   const text=e.querySelector('.mx_EventTile_body.translate')?.textContent.trim();if(!text)continue;
   const raw=e.querySelector('time[datetime]')?.getAttribute('datetime')||e.getAttribute('data-timestamp');
   const timestamp=/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d\d:\d\d)$/.test(raw||'')?Date.parse(raw):NaN;
   records.set(e.getAttribute('data-event-id'),{text,timestamp});
  }
  for(const d of document.querySelectorAll('[role=dialog]')){const c=ONOFFIkonoClassification.readClassification(d);if(c.category)classification=c;}
 }
 function selected(){return root?.getElementById('tc')?.value==='manual'?root.getElementById('manual').value:root?.getElementById('tc')?.value||'';}
 function render(){
  collect();const tc=selected().replace(/^TC\s*/i,'');if(previousTc!==tc){previousTc=tc;lookup=null;descriptionEdited=false;}
  const values={Plantilla:template.name+' · #477 · valores verificados el 12/11/2026',Responsable:template.responsible,Proyecto:template.project,Participantes:'12 heredados de plantilla',Observador:'Luis Eduardo Jiménez Ortiz', 'Fecha límite':'Sin fecha límite',Asunto:`TC${tc||'?'} - TIPIFICACIÓN - ${(classification.detail||'DETALLE PENDIENTE').toUpperCase()}`,'Tipo de Incidencia':(classification.category||'PENDIENTE').toUpperCase(),'Tipificación TI':(classification.detail||'PENDIENTE').toUpperCase(),'Gestión SAC':(()=>{const heading=document.querySelector('.mx_RoomHeader')?.textContent||document.title;const phone=heading.match(/\((\d{10,15})\)/)?.[1];return phone?'iKono ('+phone+')':'Teléfono pendiente de verificar';})(),Plataforma:tc||'Pendiente',Producto:'TRYTIENDAS',Prioridad:'Baja','Tipificación 2':'Sin asignar',Negociación:lookup?.selected?.title||'Consulta y selección pendientes',Compañía:lookup?.selected?.company?.name||'Pendiente'};
  box.querySelector('[data-fields]').replaceChildren(...Object.entries(values).map(([k,v])=>{const p=document.createElement('p');p.textContent=k+': '+v;return p;}));
  const unknown=[...records.values()].filter(m=>!Number.isFinite(m.timestamp)).length;
  box.querySelector('[data-coverage]').textContent=`Día Colombia: ${today}. ${records.size} textos acumulados en esta sala; ${unknown} sin fecha verificable. Cobertura diaria pendiente; cargar historial no demuestra por sí solo que esté completo. Resumen actual provisional: todavía usa hasta 40 mensajes y puede contener otras TC. Acumular textos no amplía todavía la entrada de IA. Revise y separe lo correspondiente a la TC elegida antes de usarlo.`;
  const description=box.querySelector('[data-description]');if(!descriptionEdited&&!description.matches(':focus'))description.value=root.querySelector('textarea[aria-label="Resumen editable"]')?.value||'';
 }
 async function search(){const tc=selected().replace(/^TC\s*/i,'');if(!/^\d+$/.test(tc)||!root.getElementById('verified').checked||!root.getElementById('tcStatus').textContent.includes('confirmada')){box.querySelector('[data-result]').textContent='Confirma primero la TC con el asesor.';return;}
  const token=++epoch,requestRoom=location.hash;box.querySelector('[data-result]').textContent='Consultando TC en Bitrix, solo lectura…';
  try{const r=await fetch('https://asistente-onoff.vercel.app/api/bitrix/search-deal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tc})}),data=await r.json();if(token!==epoch||requestRoom!==location.hash||tc!==selected().replace(/^TC\s*/i,'')||!root.getElementById('verified').checked)return;if(!r.ok||!data.ok)throw Error('Consulta no disponible');
   lookup={tc,deals:(data.deals||[]).filter(d=>String(d.tc)===tc),selected:null};const select=box.querySelector('[data-deals]');select.replaceChildren(new Option('Seleccionar negociación exacta',''));for(const d of lookup.deals)select.add(new Option(d.title+' · #'+d.id,d.id));box.querySelector('[data-result]').textContent=lookup.deals.length+' coincidencias. Selecciona la negociación; no se elige automáticamente.';render();
  }catch(e){if(token===epoch)box.querySelector('[data-result]').textContent='No se pudo consultar la TC. Sin cambios en Bitrix.';}}
 function mount(){host=document.getElementById('onoff-ikono-auto-summary');root=host?.shadowRoot;if(!root||box)return;box=document.createElement('details');const label=document.createElement('summary');label.textContent='Vista previa de tarea · PRIMER CONTACTO';box.append(label);const body=document.createElement('div');body.innerHTML='<p data-coverage></p><button data-search>Consultar TC en Bitrix · solo lectura</button><p data-result></p><select data-deals aria-label="Negociación para la TC"></select><div data-fields></div><label>Descripción provisional para revisar<textarea data-description aria-label="Descripción provisional de tarea"></textarea></label><p>Incidente · Revisión y análisis · Solución: revisar el borrador antes de usarlo. ID de atención y cobertura diaria pendientes. Etapa prevista: Finalizadas Solicitud, solo después de una futura creación autorizada.</p><button disabled>Crear tarea · desactivado</button>';box.append(body);root.querySelector('section').append(box);box.querySelector('[data-search]').onclick=search;box.querySelector('[data-description]').oninput=()=>{descriptionEdited=true;};box.querySelector('[data-deals]').onchange=e=>{if(lookup)lookup.selected=lookup.deals.find(d=>String(d.id)===e.target.value)||null;render();};render();}
 setInterval(()=>{mount();if(box&&host.style.display!=='none'){const signature=location.hash+selected()+root.querySelector('textarea')?.value+document.querySelectorAll('li.mx_EventTile').length;collect();last=signature;render();}},1000);
})();
