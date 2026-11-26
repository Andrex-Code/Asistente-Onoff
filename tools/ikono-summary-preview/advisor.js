(() => {
 if(window.ONOFFAdvisorValidation)return;
 const diagnostics=document.createElement('style');diagnostics.id='onoff-advisor-mode';diagnostics.textContent='#onoff-ikono-auto-summary,#onoff-chat-dashboard{display:none!important}';document.head.append(diagnostics);
 let dialogGeneration=0;let manualOpen=false,manualSaved=null,manualEvidence='',manualRequired=false,manualUserOpened=false,manualDirty=false;const corrections=new Map();let saving=false,scopeKey='',preparationMessage='',manualMode=false,autoLookup='',autoPrepared='',manualSelected=false,inputDue=0;
 function dialogIsDark(dialog){
  for(let element=dialog;element;element=element.parentElement){
   const components=getComputedStyle(element).backgroundColor.match(/[\d.]+/g)?.map(Number);
   if(!components||components.length<3||(components[3]??1)<0.8)continue;
   return 0.2126*components[0]+0.7152*components[1]+0.0722*components[2]<120;
  }
  return getComputedStyle(dialog).colorScheme.split(' ').includes('dark');
 }
 const darkCSS = `
  :host([data-dark]){color-scheme:dark;color:#edf3f7!important;}
  :host([data-dark]:not([data-compact-view])){background:#1b242d!important;border-color:#526475!important;}
  :host([data-dark]) label,:host([data-dark]) input,:host([data-dark]) select,:host([data-dark]) textarea{color:#edf3f7;}
  :host([data-dark]) select,:host([data-dark]) input[type=text],:host([data-dark]) textarea{
   background:#111820!important;color:#edf3f7!important;-webkit-text-fill-color:#edf3f7;border-color:#687d90;
  }
  :host([data-dark]) input::placeholder,:host([data-dark]) textarea::placeholder{color:#bac8d5;-webkit-text-fill-color:#bac8d5;}
  :host([data-dark]) button{background:#2a3e50;color:#edf3f7;border-color:#7391a9;}
  :host([data-dark]) button:hover:enabled{background:#38546a;}
  :host([data-dark]) button[data-ready]{background:#087a48;color:#fff;}
  :host([data-dark]) summary{color:#a5d5fe;}
  :host([data-dark]) [data-status],:host([data-dark]) [data-generation]{background:#263747;color:#e4eff9;}
  :host([data-dark]) :focus-visible{outline-color:#a5d5fe;}
 `;
 const controlCSS=':host{color-scheme:light;color:#172b3a;background:#fff}*{box-sizing:border-box}h3{font-size:17px;margin:0 0 8px}label{display:block;margin:8px 0;color:#172b3a}input,select,textarea,button{font:inherit;color:#172b3a}select,input[type=text],textarea{width:100%;padding:9px;border:1px solid #899aa8;border-radius:7px;background:#fff!important;color:#172b3a!important;-webkit-text-fill-color:#172b3a}textarea{height:100px;line-height:1.5;resize:vertical}input[type=checkbox]{accent-color:#087a48}button{padding:9px 12px;margin:5px 5px 5px 0;border:1px solid #50708b;border-radius:7px;background:#edf4f8;color:#173b55;cursor:pointer;transition:background .15s,box-shadow .15s}button:hover:enabled{background:#d7eaf5;box-shadow:0 2px 5px #2343}button:active:enabled{transform:translateY(1px)}button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,summary:focus-visible{outline:3px solid #1378be;outline-offset:2px}button:disabled{opacity:.65;cursor:not-allowed}button[data-ready]{background:#087a48;color:#fff}button[data-ready]:hover:enabled{background:#065e37}summary{cursor:pointer;padding:6px;color:#17537d}[data-texts]{max-height:150px;overflow:auto;font-size:12px}[data-status],[data-generation]{padding:9px;border-radius:7px;background:#edf4f8;color:#18394e;line-height:1.5}[aria-busy=true]{cursor:progress}[hidden]{display:none!important}';
 let lookupController;let host,ui,room='',selectedDeal=null,lookupTC='',lookupSerial=0,sourceSignature='',summaryEdited=false,recordsSignature='',validated='';
 new MutationObserver(changes=>{if(host&&changes.some(r=>[...r.removedNodes].some(n=>n!==host&&n.contains?.(host)))){dialogGeneration++;validated='';host.remove();host=null;lookupSerial++;}}).observe(document.body,{childList:true,subtree:true});
 const normalize=value=>window.ONOFFIkonoTC?.normalizeTaskTC?.(value)||String(value||'').trim().replace(/^TC\s*[-:]?\s*/i,'').replace(/\s/g,'');
 const code=()=>normalize(ui?.querySelector('[data-tc]').value==='manual'?ui.querySelector('[data-manual]').value:ui?.querySelector('[data-tc]').value);
 function revoke(message){validated='';autoLookup='';autoPrepared='';preparationMessage='';selectedDeal=null;lookupTC='';if(ui){ui.querySelector('[data-verified]').checked=false;ui.querySelector('[data-scope]').checked=false;ui.querySelector('[data-status]').textContent=message;ui.querySelector('[data-ready]').disabled=true;}}
 function renderMessages(p){const list=ui.querySelector('[data-texts]');list.replaceChildren();const checked=new Set(p.selectedMessageIds||[]);for(const [id,m]of p.messages||[]){const label=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.dataset.id=id;c.checked=checked.size?checked.has(id):true;label.append(c,document.createTextNode(m.text));list.append(label);c.onchange=()=>{validated='';ui.querySelector('[data-scope]').checked=false;};}}
 function mountManual(){
  const section=document.createElement('section');section.dataset.manualReview='';section.innerHTML='<button type="button" data-manual-open>Escribir consulta manual</button><fieldset data-manual-form hidden><legend>Resumen manual de la atención</legend><p data-manual-hint></p><label>¿Qué consultó el cliente?<textarea data-manual-reason maxlength="320" required></textarea></label><details><summary>Gestión y resultado (opcionales)</summary><label>Gestión<textarea data-manual-management maxlength="320"></textarea></label><label>Resultado<textarea data-manual-result maxlength="320"></textarea></label></details><button type="button" data-manual-save>Guardar consulta</button><button type="button" data-manual-auto>Volver al resumen automático</button><p data-manual-status role="status"></p></fieldset>';ui.append(section);
  const form=section.querySelector('[data-manual-form]'),open=section.querySelector('[data-manual-open]'),status=section.querySelector('[data-manual-status]');
  const invalidate=()=>{manualSaved=null;validated='';autoPrepared='';preparationMessage='';};
  open.onclick=()=>{manualUserOpened=true;manualOpen=true;invalidate();form.hidden=false;open.hidden=true;section.querySelector('[data-manual-reason]').focus();};
  form.oninput=()=>{manualDirty=true;invalidate();status.textContent='Guarda de nuevo la consulta para continuar.';};
  section.querySelector('[data-manual-auto]').onclick=()=>{if(manualRequired)return;manualOpen=false;manualUserOpened=false;manualDirty=false;invalidate();};
  section.querySelector('[data-manual-save]').onclick=()=>{
   let p,ctx;try{p=window.ONOFFTaskReview.snapshot();ctx=window.ONOFFAdvisorContext.read();}catch{return;}
   if(!host?.isConnected||p.room!==room||(ctx.scopeKey||location.hash)!==scopeKey||window.ONOFFManualReview.signature(p,ctx)!==manualEvidence){invalidate();status.textContent='La atención cambió. Revisa y guarda nuevamente.';return;}
   if(!p.category||!p.detail){status.textContent='Selecciona tipificación y detalle en iKono.';return;}
   const description=window.ONOFFManualReview.summary(['reason','management','result'].map(k=>section.querySelector('[data-manual-'+k+']').value));
   if(!description){invalidate();status.textContent='Escribe qué consultó el cliente, con información concreta (máximo 320 caracteres por campo).';return;}
   invalidate();manualSaved={description,evidence:manualEvidence};status.textContent='Consulta guardada. Validando identidad y preparando tarea.';
  };
 }
 function manualState(p,ctx){
  manualRequired=window.ONOFFManualReview.needsManual(p,ctx);
  if(manualRequired&&!manualOpen){manualOpen=true;validated='';autoPrepared='';preparationMessage='';}
  if(!manualRequired&&ctx.summaryReady&&manualOpen&&!manualUserOpened&&!manualDirty&&!manualSaved){manualOpen=false;validated='';autoPrepared='';}
  const signature=window.ONOFFManualReview.signature(p,ctx);
  if(manualSaved&&manualSaved.evidence!==signature){manualSaved=null;validated='';autoPrepared='';preparationMessage='';ui.querySelector('[data-manual-status]').textContent='Cambió la atención, mensajes o tipificación. Revisa y guarda nuevamente.';}
  manualEvidence=signature;
  ui.querySelector('[data-manual-form]').hidden=!manualOpen;ui.querySelector('[data-manual-open]').hidden=manualOpen;ui.querySelector('[data-manual-auto]').hidden=manualRequired||!ctx.summaryReady;
  const hint=ui.querySelector('[data-manual-hint]'),text=ctx.customerAudioIds?.length?'Escucha la nota en iKono y escribe la consulta. No se descarga ni transcribe audio.':'Describe la consulta; no inventes gestión ni resultado.';if(hint.textContent!==text)hint.textContent=text;
  return manualOpen?{summary:manualSaved?.description||'',ready:!!manualSaved,manual:true}:{summary:ctx.summary,ready:ctx.summaryReady,manual:false};
 }
 function mount(dialog){
  host=document.createElement('section');host.id='onoff-advisor-validation';host.setAttribute('aria-label','Validación de tarea del asesor');
  host.style='display:block;background:#fff;color:#172b3a;border:1px solid #9bb4c5;border-radius:10px;margin:12px 0;padding:14px;font:14px system-ui;max-height:42vh;overflow:auto';
  ui=host.attachShadow({mode:'open'});ui.innerHTML='<style>'+controlCSS+darkCSS+'</style><div data-compact hidden><strong data-found></strong><button type="button" data-change>Cambiar TC</button><button type="button" data-retry hidden>Revalidar preparación</button><p data-compact-status role="status"></p></div><div data-full><div data-phone-area hidden><button type="button" data-phone-search>Buscar TC por teléfono</button><p data-phone-status role="status"></p><label data-phone-results hidden>Coincidencias en Bitrix<select data-phone-deals aria-label="Coincidencias por teléfono"></select></label><button type="button" data-phone-use hidden disabled>Confirmar coincidencia</button></div><label data-contact-label><input type="checkbox" data-contact>Cliente sin TC: tipificar con número de contacto</label><h3>Revisa esta atención</h3><p data-generation role="status"></p><label data-sessions-label hidden>Atención de hoy<select data-sessions aria-label="Atención de hoy"></select></label><p data-classification></p><p data-source></p><details data-tc-details open><summary data-tc-heading>Identificar TC</summary><label>TC de esta atención<select data-tc aria-label="TC del asesor"></select></label><label data-manual-label>TC no encontrada<input type="text" data-manual aria-label="Escribir TC" placeholder="Ej. TC1234"></label></details><label><input type="checkbox" data-verified>Confirmo qué TC recibió esta gestión.</label><button type="button" data-search>Validar TC en Bitrix</button><label>Negociación para esta TC<select data-deals aria-label="Negociación del asesor"><option value="">Pendiente de validar TC</option></select></label><small data-company></small><label>TIPIFICACIÓN DEL CHAT<textarea data-summary aria-label="Resumen del asesor"></textarea></label><details><summary>Revisar textos de hoy y de esta TC</summary><div data-texts></div></details><label><input type="checkbox" data-scope>Revisé el resumen y los textos elegidos: corresponden solo a esta atención de hoy y a la TC seleccionada.</label><button type="button" data-ready disabled>Guardar revisión para Resolver</button><p data-status role="status">Sin TC confirmada y validada no se puede preparar ni crear una tarea.</p></div>';
  mountManual();const footer=dialog.querySelector('.mx_Dialog_buttons')||[...dialog.querySelectorAll('button')].find(b=>b.textContent.trim()==='Resolver conversación')?.parentElement;if(footer&&footer!==dialog)footer.before(host);else dialog.append(host);
  const phoneSearch=ui.querySelector('[data-phone-search]');
  const phoneStatus=ui.querySelector('[data-phone-status]');
  const phoneResults=ui.querySelector('[data-phone-results]');
  const phoneDeals=ui.querySelector('[data-phone-deals]');
  const phoneUse=ui.querySelector('[data-phone-use]');
  let matches=[],searchedPhone='';
  phoneDeals.onchange=()=>{phoneUse.disabled=!phoneDeals.value;};
  phoneSearch.onclick=async()=>{
   const generation=dialogGeneration,phone=window.ONOFFTaskReview.snapshot().phone;
   if(!/^\d{10,15}$/.test(phone||''))return;
   phoneSearch.disabled=true;
   phoneResults.hidden=phoneUse.hidden=true;phoneUse.disabled=true;
   matches=[];searchedPhone='';
   phoneStatus.textContent='Buscando coincidencias en Bitrix…';
   try{
    const result=await chrome.runtime.sendMessage({type:'ONOFF_TASK_PILOT',action:'lookup-phone',phone});
    if(generation!==dialogGeneration||phone!==window.ONOFFTaskReview.snapshot().phone||window.ONOFFAdvisorContext.read().candidates.length)return;
    if(!result?.ok)throw Error(result?.error||'No se pudo buscar por teléfono.');
    searchedPhone=phone;
    matches=(result.data?.deals||[]).filter(d=>/^\d{1,8}$/.test(d.tc)&&d.id&&d.company?.id);
    phoneDeals.replaceChildren(new Option('Elige el negocio atendido',''),...matches.map(d=>new Option('TC'+d.tc+' · '+d.title,d.id)));
    phoneResults.hidden=phoneUse.hidden=!matches.length;
    phoneStatus.textContent=matches.length?'Elige una coincidencia y confírmala si corresponde a esta atención.':result.data?.truncated?'La búsqueda fue parcial. Puedes verificar la TC manualmente o tipificar por contacto.':'Bitrix no devolvió una TC asociada. Puedes tipificar con el número de contacto.';
    if(matches.length&&result.data?.truncated) phoneStatus.textContent+=' Bitrix devolvió una lista parcial.';
   }catch(error){if(generation===dialogGeneration)phoneStatus.textContent=error.message+' Puedes reintentar o tipificar por contacto.';}
   finally{phoneSearch.disabled=false;}
  };
  phoneUse.onclick=()=>{
   const deal=matches.find(d=>String(d.id)===phoneDeals.value);
   if(!deal||searchedPhone!==window.ONOFFTaskReview.snapshot().phone||window.ONOFFAdvisorContext.read().candidates.length)return;
   invalidate();
   ui.querySelector('[data-contact]').checked=false;
   ui.querySelector('[data-tc]').value='manual';
   ui.querySelector('[data-manual]').value=deal.tc;
   ui.querySelector('[data-verified]').checked=true;
   selectedDeal=deal;lookupTC=autoLookup=deal.tc;manualMode=manualSelected=true;inputDue=0;
   phoneStatus.textContent='Confirmaste TC'+deal.tc+' · '+deal.title;
  };
  ui.querySelector('[data-contact]').onchange=()=>{validated='';autoPrepared='';preparationMessage='';lookupController?.abort();lookupSerial++;selectedDeal=null;lookupTC='';};
  ui.querySelector('[data-retry]').onclick=()=>{window.dispatchEvent(new Event('onoff-retry-preparation'));validated='';autoPrepared='';if(!selectedDeal)autoLookup='';if(!window.ONOFFAdvisorContext.read().summaryReady)window.ONOFFAdvisorContext.retrySummary?.();preparationMessage='Revalidando preparación…';};
  ui.querySelector('[data-change]').onclick=()=>{manualMode=true;revoke('Revisa o cambia la TC y confirma nuevamente.');};
  const invalidate=()=>{lookupController?.abort();lookupSerial++;revoke('La TC cambió: confirma y valida nuevamente en Bitrix.');ui.querySelector('[data-manual-label]').hidden=ui.querySelector('[data-tc]').value!=='manual';ui.querySelector('[data-company]').textContent='';ui.querySelector('[data-deals]').replaceChildren(new Option('Pendiente de validar TC',''));};
  if(corrections.has(scopeKey)){manualMode=true;ui.querySelector('[data-summary]').value=corrections.get(scopeKey);summaryEdited=true;}
  ui.querySelector('[data-tc]').onchange=()=>{invalidate();manualMode=true;manualSelected=true;inputDue=0;};ui.querySelector('[data-manual]').oninput=()=>{invalidate();manualMode=true;manualSelected=true;inputDue=Date.now()+500;};
  ui.querySelector('[data-summary]').oninput=()=>{summaryEdited=true;corrections.set(scopeKey,ui.querySelector('[data-summary]').value);validated='';ui.querySelector('[data-scope]').checked=false;};
  ui.querySelector('[data-verified]').onchange=()=>{validated='';ui.querySelector('[data-scope]').checked=false;if(ui.querySelector('[data-verified]').checked&&/^\d{1,8}$/.test(code()))ui.querySelector('[data-search]').click();};
  ui.querySelector('[data-scope]').onchange=()=>{validated='';};
  ui.querySelector('[data-search]').onclick=async()=>{
   const tc=code(),serial=++lookupSerial,sourceRoom=location.hash,button=ui.querySelector('[data-search]');
   if(!/^\d{1,8}$/.test(tc)||!ui.querySelector('[data-verified]').checked){ui.querySelector('[data-status]').textContent='Escribe o elige una TC válida y confirma qué TC recibió atención.';return;}
   lookupController?.abort();const controller=new AbortController();lookupController=controller;button.disabled=true;button.textContent='Consultando TC…';host.setAttribute('aria-busy','true');ui.querySelector('[data-status]').textContent='Validando asociación en Bitrix…';selectedDeal=null;
   try{const response=await Promise.race([chrome.runtime.sendMessage({type:'ONOFF_TASK_PILOT',action:'lookup',tc}),new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(Error('Consulta interrumpida o agotada.')),{once:true}))]);const d=response.data||{};if(serial!==lookupSerial||sourceRoom!==location.hash||tc!==code()||!host?.isConnected)return;if(!response.ok||d.ok===false)throw Error(response.error||'No se pudo validar la TC en Bitrix.');const deals=(d.deals||[]).filter(x=>(window.ONOFFIkonoTC?.normalizeTaskTC?.(x.tc)||String(x.tc))===tc&&x.company?.id);const select=ui.querySelector('[data-deals]');select.replaceChildren(new Option('Seleccionar negociación exacta',''));for(const deal of deals)select.add(new Option(deal.title,deal.id));select.onchange=()=>{if(deals.length>1)manualSelected=true;selectedDeal=deals.find(x=>String(x.id)===select.value)||null;validated='';ui.querySelector('[data-scope]').checked=false;ui.querySelector('[data-company]').textContent=selectedDeal?'Negociación: '+selectedDeal.title+' · '+selectedDeal.company.name:'';};lookupTC=tc;if(deals.length>1)manualMode=true;if(deals.length===1){select.value=String(deals[0].id);select.onchange();}ui.querySelector('[data-status]').textContent=deals.length?'TC validada. Preparando la atención para Resolver…':'No hay negociación con compañía para esa TC. No se puede crear tarea.';
   }catch(e){if(serial===lookupSerial){preparationMessage='No se pudo validar la TC. Puedes reintentar.';ui.querySelector('[data-status]').textContent=preparationMessage;}}finally{button.disabled=false;button.textContent='Validar TC en Bitrix';if(serial===lookupSerial)host?.setAttribute('aria-busy','false');}
  };
 }
 window.ONOFFAdvisorValidation={tick(dialog,onReady){
  if(!window.ONOFFAdvisorContext||!window.ONOFFTaskReview)return;
  if(!dialog){if(host)dialogGeneration++;host?.remove();host=null;return;}
  let p,ctx;try{ctx=window.ONOFFAdvisorContext.read();p=window.ONOFFTaskReview.snapshot();}catch{return;}
  if(!host?.isConnected||room!==location.hash||scopeKey!==(ctx.scopeKey||location.hash)){room=location.hash;scopeKey=ctx.scopeKey||location.hash;manualOpen=false;manualSaved=null;manualEvidence='';manualRequired=false;manualUserOpened=false;manualDirty=false;lookupController?.abort();lookupSerial++;dialogGeneration++;saving=false;manualMode=false;manualSelected=false;inputDue=0;autoLookup='';autoPrepared='';preparationMessage='';host?.remove();selectedDeal=null;lookupTC='';sourceSignature='';recordsSignature='';summaryEdited=false;validated='';mount(dialog);}
  const draft=manualState(p,ctx);const sessions=ui.querySelector('[data-sessions]');const sessionKey=JSON.stringify(ctx.sessions||[]);if(sessions.dataset.key!==sessionKey){sessions.dataset.key=sessionKey;sessions.replaceChildren(...(ctx.sessions||[]).map((a,i)=>new Option('Atención '+(i+1)+' · '+a.count+' textos · '+a.reason,a.id)));}sessions.value=ctx.attention||'';ui.querySelector('[data-sessions-label]').hidden=(ctx.sessions||[]).length<2;sessions.onchange=()=>window.ONOFFIkonoMemory?.select(room,sessions.value);
  ui.querySelector('[data-generation]').textContent=ctx.generationStatus||'Leyendo los mensajes de esta atención…';
  const next=JSON.stringify(ctx.candidates);if(next!==sourceSignature){sourceSignature=next;const select=ui.querySelector('[data-tc]'),prior=select.value;select.replaceChildren(new Option('Seleccionar TC',''));for(const c of ctx.candidates)select.add(new Option(c.code+' · '+c.sources.join(', '),c.code));select.add(new Option('Escribir otra TC','manual'));select.value=[...select.options].some(o=>o.value===prior)&&prior?prior:ctx.clearTC?ctx.clearTC:ctx.candidates.length?'':'manual';revoke('Elige o escribe la TC: la negociación se consultará automáticamente.');}
  ui.querySelector('[data-retry]').hidden=saving||!/(?:no se pudo|venci|sin confirmar|no se confirmó|agotó|no hay textos)/i.test(preparationMessage+' '+ctx.generationStatus);
  const compact=!!ctx.clearTC&&!manualMode;host.toggleAttribute('data-dark',dialogIsDark(dialog));host.toggleAttribute('data-compact-view',compact);ui.querySelector('[data-compact]').hidden=!compact;ui.querySelector('[data-full]').hidden=compact;host.style.background=compact?'transparent':'#fff';host.style.color=compact?'inherit':'#172b3a';host.style.border=compact?'0':'1px solid #9bb4c5';host.style.padding=compact?'4px 0':'14px';ui.querySelector('[data-found]').textContent=(ctx.clearTC||'')+' detectada';
  ui.querySelector('[data-manual-label]').hidden=ui.querySelector('[data-tc]').value!=='manual';ui.querySelector('[data-tc-heading]').textContent=ctx.candidates.length===1?ctx.candidates[0].code+' detectada · Cambiar TC':ctx.candidates.length?'Elegir TC atendida':'Escribir TC atendida';if(ui.querySelector('[data-tc-details]').dataset.candidates!==next){ui.querySelector('[data-tc-details]').dataset.candidates=next;ui.querySelector('[data-tc-details]').open=ctx.candidates.length!==1;}
  ui.querySelector('[data-classification]').textContent=(p.category||'Tipificación pendiente')+' → '+(p.detail||'Detalle pendiente')+' · No editable aquí';
  ui.querySelector('[data-source]').textContent=ctx.candidates.length?'Candidatas del nombre, chat o fotos. Ninguna se confirma automáticamente.':'No se encontró TC: intentando fotos cargadas cuando corresponda. Si no se identifica, escribe la TC verificada con el cliente.';
  const messages=JSON.stringify(p.messages);if(messages!==recordsSignature){recordsSignature=messages;renderMessages(p);if(validated)preparationMessage='Llegaron mensajes nuevos. Revisa el resumen y guarda nuevamente.';validated='';ui.querySelector('[data-scope]').checked=false;}
  if(!summaryEdited&&ui.querySelector('[data-summary]')!==ui.activeElement)ui.querySelector('[data-summary]').value=p.description||ctx.summary||'';
  if(validated&&!this.isValidated()){validated='';autoPrepared='';preparationMessage='Cambió la atención o la tipificación. Revisa y guarda nuevamente.';}
  ui.querySelector('h3').textContent=ctx.candidates.length?'Selecciona la TC atendida':'Escribe la TC atendida';ui.querySelector('[data-tc]').closest('label').hidden=ctx.candidates.length===0;ui.querySelector('[data-tc-heading]').hidden=true;
  for(const selector of ['[data-generation]','[data-sessions-label]','[data-classification]','[data-source]'])ui.querySelector(selector).hidden=true;
  for(const selector of ['[data-verified]','[data-summary]','[data-scope]'])ui.querySelector(selector).closest('label').hidden=true;
  ui.querySelector('[data-texts]').closest('details').hidden=true;ui.querySelector('[data-tc-details]').open=true;host.style.maxHeight='none';ui.querySelector('[data-search]').hidden=true;ui.querySelector('[data-ready]').hidden=true;const dealsField=ui.querySelector('[data-deals]');dealsField.closest('label').hidden=dealsField.options.length<=2;if(ui.querySelector('[data-retry]').parentNode!==ui)ui.append(ui.querySelector('[data-retry]'));
  ui.querySelector('[data-search]').textContent='Buscar TC';ui.querySelector('[data-search]').onpointerdown=()=>ui.querySelector('[data-verified]').checked=true;ui.querySelector('[data-search]').onkeydown=e=>{if(e.key==='Enter'||e.key===' ')ui.querySelector('[data-verified]').checked=true;};
  ui.querySelector('[data-scope]').checked=!!selectedDeal;
  if(selectedDeal&&!ctx.summaryReady&&!saving)ui.querySelector('[data-status]').textContent='Establecimiento válido. Preparando resumen de esta atención…';
  const ready=!!window.__onoffPreparationReady&&ctx.summaryReady&&/^\d{1,8}$/.test(code())&&ui.querySelector('[data-verified]').checked&&selectedDeal&&lookupTC===code()&&ui.querySelector('[data-scope]').checked&&ui.querySelector('[data-summary]').value.trim();
  ui.querySelector('[data-ready]').disabled=!ready||saving||this.isValidated();ui.querySelector('[data-ready]').textContent=saving?'Preparando vista previa…':this.isValidated()?'✓ Revisión guardada':'Confirmar establecimiento';if(preparationMessage)ui.querySelector('[data-status]').textContent=preparationMessage;
  ui.querySelector('[data-ready]').onclick=async()=>{if(saving||this.isValidated()||!ready||!ui.querySelector('[data-scope]').checked||!ui.querySelector('[data-verified]').checked||lookupTC!==code()||!selectedDeal)return;const messageIds=[...ui.querySelectorAll('[data-texts] input:checked')].map(x=>x.dataset.id);try{window.ONOFFTaskReview.advisorApply({tc:'TC'+code(),deal:selectedDeal,description:ui.querySelector('[data-summary]').value,messageIds});validated=JSON.stringify(window.ONOFFTaskReview.snapshot());saving=true;host.setAttribute('aria-busy','true');ui.querySelector('[data-ready]').disabled=true;ui.querySelector('[data-status]').textContent='Preparando vista previa… No necesitas volver a pulsar.';const savingScope=scopeKey,savingGeneration=dialogGeneration;const ok=await onReady();if(scopeKey!==savingScope||savingGeneration!==dialogGeneration)return;preparationMessage=ok===false?(preparationMessage||'No se pudo preparar. Revisa el aviso y vuelve a guardar.'):'✓ Lista. Pulsa Resolver conversación una sola vez; la tarea se enviará a Bitrix.';if(ok===false)validated='';ui.querySelector('[data-status]').textContent=preparationMessage;}catch(e){validated='';preparationMessage=e.message;ui.querySelector('[data-status]').textContent=e.message;}finally{saving=false;host.setAttribute('aria-busy','false');}};
  if(window.__onoffPreparationError){preparationMessage=window.__onoffPreparationError;ui.querySelector('[data-status]').textContent=preparationMessage;ui.querySelector('[data-compact-status]').textContent=preparationMessage;ui.querySelector('[data-retry]').hidden=false;return;}
  const contactCheckbox=ui.querySelector('[data-contact]');ui.querySelector('[data-phone-area]').hidden=ctx.candidates.length>0||!/^\d{10,15}$/.test(p.phone||'')||contactCheckbox.checked;ui.querySelector('[data-contact-label]').hidden=ctx.candidates.length>0;if(ctx.candidates.length)contactCheckbox.checked=false;
  if(contactCheckbox.checked){
   ui.querySelector('[data-tc-details]').hidden=true;ui.querySelector('[data-manual-label]').hidden=true;ui.querySelector('[data-deals]').closest('label').hidden=true;
   if(!/^\d{10,15}$/.test(p.phone||'')){preparationMessage='No se encontró un número de contacto válido. No se puede tipificar sin TC.';ui.querySelector('[data-status]').textContent=preparationMessage;return;}
   if(!draft.ready){ui.querySelector('[data-status]').textContent=ctx.generationStatus||'Preparando resumen de esta atención…';return;}
   if(!p.category||!p.detail||(!draft.manual&&!p.messages.length)){ui.querySelector('[data-status]').textContent='Completa tipificación y detalle para registrar este contacto sin TC.';return;}
   const signature=JSON.stringify([scopeKey,'contact',p.phone,p.category,p.detail,draft.summary,p.messages]);
   if(!saving&&autoPrepared!==signature){autoPrepared=signature;saving=true;const capturedScope=scopeKey,capturedGeneration=dialogGeneration;try{window.ONOFFTaskReview.advisorApplyContact({description:draft.summary,manualSummary:draft.manual,messageIds:p.messages.map(([id])=>id)});validated=JSON.stringify(window.ONOFFTaskReview.snapshot());Promise.resolve(onReady()).then(ok=>{if(scopeKey!==capturedScope||capturedGeneration!==dialogGeneration)return;if(ok===false){validated='';preparationMessage='No se pudo preparar. Pulsa Revalidar preparación.';}else preparationMessage='✓ Lista para resolver sin TC. Se enviará la tarea del contacto '+p.phone+' al pulsar Resolver.';}).catch(e=>{if(scopeKey===capturedScope&&capturedGeneration===dialogGeneration){validated='';preparationMessage=e.message;}}).finally(()=>{if(scopeKey===capturedScope&&capturedGeneration===dialogGeneration)saving=false;});}catch(e){saving=false;validated='';preparationMessage=e.message;}}
   return;
  }ui.querySelector('[data-tc-details]').hidden=false;
  const automaticTC=manualSelected&&/^\d{1,8}$/.test(code())?'TC'+code():!manualMode?ctx.clearTC:'';
  if(automaticTC&&Date.now()>=inputDue){
   const tc=automaticTC.replace(/^TC/,'');
   ui.querySelector('[data-compact-status]').textContent=preparationMessage||ui.querySelector('[data-status]').textContent;
   if(autoLookup!==tc){autoLookup=tc;ui.querySelector('[data-tc]').value=[...ui.querySelector('[data-tc]').options].some(o=>o.value===automaticTC)?automaticTC:'manual';ui.querySelector('[data-verified]').checked=true;ui.querySelector('[data-search]').onclick();}
   if(!draft.ready){ui.querySelector('[data-compact-status]').textContent=ctx.generationStatus||'Preparando resumen de esta atención…';return;}
   if(!selectedDeal||lookupTC!==tc||!window.__onoffPreparationReady)return;
   const signature=JSON.stringify([scopeKey,automaticTC,p.category,p.detail,draft.summary,p.messages,selectedDeal.id]);
   if(!p.category||!p.detail||(!draft.manual&&!p.messages.length)){ui.querySelector('[data-compact-status]').textContent='Completa la tipificación y el detalle en iKono. La TC se confirmará junto al resumen después de Resolver.';return;}
   if(!saving&&autoPrepared!==signature){
    autoPrepared=signature;saving=true;const capturedScope=scopeKey,capturedGeneration=dialogGeneration;
    try{window.ONOFFTaskReview.advisorApply({tc:automaticTC,deal:selectedDeal,description:draft.summary,manualSummary:draft.manual,messageIds:p.messages.map(([id])=>id)});validated=JSON.stringify(window.ONOFFTaskReview.snapshot());
     // This is a draft only. Human authorization remains the mandatory final
     // Confirmar crear tarea button displaying TC and summary after native close.
     Promise.resolve(onReady()).then(ok=>{if(scopeKey!==capturedScope||capturedGeneration!==dialogGeneration)return;if(ok===false){validated='';preparationMessage='No se pudo preparar. Pulsa Revalidar preparación.';}else preparationMessage='✓ Lista para resolver. Se enviará la tipificación de '+automaticTC+' a Bitrix.';}).catch(e=>{if(scopeKey===capturedScope&&capturedGeneration===dialogGeneration){validated='';preparationMessage=e.message;}}).finally(()=>{if(scopeKey===capturedScope&&capturedGeneration===dialogGeneration)saving=false;});
    }catch(e){saving=false;validated='';preparationMessage=e.message;}
   }
  }
 },manualDraft(){return manualOpen?{required:manualRequired,description:manualSaved?.description||'',saved:!!manualSaved}:null;},invalidate(message){validated='';autoPrepared='';preparationMessage=message;},preparation(message){preparationMessage=message;if(ui){ui.querySelector('[data-status]').textContent=message;ui.querySelector('[data-compact-status]').textContent=message;}},isValidated(){if(!validated||manualOpen&&!manualSaved)return false;try{return validated===JSON.stringify(window.ONOFFTaskReview.snapshot());}catch{return false;}}};
})();
