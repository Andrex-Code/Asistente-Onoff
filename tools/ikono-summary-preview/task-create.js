(() => {
 if(window.__onoffTaskCreator)return;window.__onoffTaskCreator=true;
 let panel,root,armed=null,pending=null,busy=false,pilot=null,interrupted=false,homeSince=0,recoveredConfirmations=false,lastAutoPreparation='',autoCandidate='',autoDue=0;
 const look=document.createElement('style');look.textContent='#onoff-task-history{left:50%!important;top:50%!important;right:auto!important;transform:translate(-50%,-50%);width:min(620px,calc(100vw - 32px))!important;max-height:82vh!important;box-shadow:0 12px 50px #0006}#onoff-task-history,#onoff-task-result,#onoff-task-recovery{color-scheme:light;background:#fff!important;color:#172b3a!important;font:14px system-ui}#onoff-task-history textarea,#onoff-task-history input,#onoff-task-history select{color:#172b3a!important;-webkit-text-fill-color:#172b3a!important;background:#fff!important;border:1px solid #8094a5;border-radius:7px;padding:10px;font:14px/1.5 system-ui;opacity:1!important}#onoff-task-history button,#onoff-task-recovery button{cursor:pointer;padding:10px 14px;border:1px solid #617b8e;border-radius:7px;background:#edf4f8;color:#173b55;font:14px system-ui}#onoff-task-history button:hover:enabled,#onoff-task-recovery button:hover:enabled{filter:brightness(.92);box-shadow:0 2px 5px #2344}#onoff-task-history button:disabled{cursor:progress;opacity:.6}#onoff-task-history button:focus-visible,#onoff-task-history textarea:focus-visible{outline:3px solid #1378be;outline-offset:2px}#onoff-task-history a,#onoff-task-result a{color:#075fa3!important;text-decoration:underline}#onoff-task-history details>summary{cursor:pointer;padding:8px}';document.head.append(look);
 const closureJobs=new Map();
 let preparationEpoch=0,lastDialog=null;
 function resetPreparation(){busy=false;if(!closureJobs.size)clearClosurePreview();preparationEpoch++;armed=null;lastAutoPreparation='';autoCandidate='';autoDue=0;}
 new MutationObserver(changes=>{if(lastDialog&&!pending&&changes.some(r=>[...r.removedNodes].some(n=>n===lastDialog||n.contains?.(lastDialog))))resetPreparation();}).observe(document.body,{childList:true,subtree:true});
 let toastTimer,lastPendingScan=0,lastDeliveryScan=0,deliveryScanBusy=false;const deliveryJobs=new Map(),deliveryRows=new Map();
 function successToast(){clearTimeout(toastTimer);document.getElementById('onoff-task-result')?.remove();const toast=document.createElement('aside');toast.id='onoff-task-result';toast.setAttribute('role','status');toast.textContent='Tipificación creada';toast.style='position:fixed;left:50%;top:30px;transform:translateX(-50%);z-index:2147483647;background:#087a48;color:white;padding:14px 22px;border-radius:10px;font:16px system-ui';document.body.append(toast);toastTimer=setTimeout(()=>toast.remove(),1000);}
 const send=m=>chrome.runtime.sendMessage({type:'ONOFF_TASK_PILOT',...m});

 function historyView(){let v=document.getElementById('onoff-task-history');if(!v){v=document.createElement('section');v.id='onoff-task-history';v.setAttribute('aria-label','Tipificaciones pendientes');v.style='position:fixed;right:18px;top:60px;z-index:2147483647;background:white;color:#123;padding:20px;width:min(480px,calc(100vw - 70px));max-height:75vh;overflow:auto;border:1px solid #16834a;border-radius:12px;font:14px system-ui';document.body.append(v);}v.style.display='block';return v;}
 function clearClosurePreview(){const v=document.getElementById('onoff-task-history');if(v?.dataset.provisional==='true')v.remove();}
 function closurePreview(p){if(p.previewShown||!p.preview)return;p.previewShown=true;const v=historyView();v.dataset.provisional='true';v.replaceChildren();const h=document.createElement('h3');h.textContent=p.preview.title;const summary=document.createElement('textarea');summary.readOnly=true;summary.value=p.preview.description;summary.setAttribute('aria-label','Vista previa mientras se verifica cierre');summary.style='width:100%;height:180px;box-sizing:border-box';const state=document.createElement('p');state.setAttribute('role','status');state.textContent='Verificando cierre en iKono… La creación aún no está habilitada.';v.append(h,summary,state);}
 async function editDraft(item){
  const v=historyView();v.replaceChildren();const title=document.createElement('h3');title.textContent='Editar borrador · TC'+item.tc;v.append(title);
  const field=document.createElement('select');field.setAttribute('aria-label','Campo a editar');for(const [value,label]of [['description','Resumen'],['title','Título'],['crm','TC y negociación'],['custom','Campos personalizados']]){if(value==='crm'&&item.review?.identityMode==='contact')continue;const o=document.createElement('option');o.value=value;o.textContent=label;field.append(o);}v.append(field);
  const form=document.createElement('div'),status=document.createElement('p');status.setAttribute('role','status');v.append(form,status);const input=(label,key,value,area=false)=>{const l=document.createElement('label');l.textContent=label;l.style='display:block;margin:10px 0';const e=document.createElement(area?'textarea':'input');e.setAttribute('aria-label',label);e.dataset.key=key;e.value=value||'';e.style='display:block;width:100%;box-sizing:border-box;padding:8px';if(area)e.style.height='220px';l.append(e);form.append(l);return e;};
  function render(){form.replaceChildren();status.textContent='Tipificación, detalle, responsable y equipo: bloqueados.';const r=item.review||{};
   if(field.value==='description')input('Resumen','description',r.description||item.description,true);
   if(field.value==='title')input('Título de tarea','title',item.title);
   if(field.value==='custom'){input('Producto','product',r.product);input('Prioridad','priority',r.priority);input('Gestión SAC · teléfono','phone',r.phone);}
   if(field.value==='crm'){const tc=input('TC atendida','tc',item.tc);const lookup=document.createElement('button');lookup.textContent='Consultar negociaciones de esta TC';const select=document.createElement('select');select.setAttribute('aria-label','Negociación exacta');select.dataset.key='dealId';const o=document.createElement('option');o.value=r.dealId||'';o.textContent='Negociación actual #'+(r.dealId||'?');select.append(o);form.append(lookup,select);const l=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.key='scopeReviewed';l.append(check,document.createTextNode('Confirmo que el resumen corresponde a esta TC y negociación.'));form.append(l);
    lookup.onclick=async()=>{const captured=tc.value;lookup.disabled=true;status.textContent='Consultando Bitrix, solo lectura…';try{const response=await send({action:'lookup',tc:captured});const d=response.data||response;if(tc.value!==captured)return;if(!response.ok||!d.ok)throw Error('No se encontró la asociación');select.replaceChildren(new Option('Seleccionar negociación',''));for(const deal of d.deals||[])if(String(deal.tc)===(window.ONOFFIkonoTC?.normalizeTaskTC(captured)||captured))select.add(new Option(deal.title+' · '+(deal.company?.name||'Compañía pendiente'),deal.id));check.checked=false;status.textContent='Selecciona negociación y reconfirma el alcance del resumen.';}catch(e){status.textContent=e.message;}finally{lookup.disabled=false;}};tc.oninput=()=>{select.value='';check.checked=false;};
   }
  }
  field.onchange=render;render();const save=document.createElement('button');save.textContent='Guardar borrador';save.onclick=async e=>{if(!e.isTrusted)return;const edits={};for(const el of form.querySelectorAll('[data-key]'))edits[el.dataset.key]=el.type==='checkbox'?el.checked:el.value;save.disabled=true;try{const r=await send({action:'amend',recordKey:item.key,edits});if(!r.ok)throw Error(r.error);await journal();}catch(e){status.textContent=e.message;save.disabled=false;}};v.append(save);
 }
 async function journal({afterSuccess=false}={}){const r=await send({action:'list'});if(!r.ok)return tell(r.error);window.__onoffHasPending=r.data.items.some(i=>['confirmation','pending','failed','rejected'].includes(i.state));if(!window.__onoffHasPending)document.getElementById('onoff-closure-pending')?.remove();if(afterSuccess&&!r.data.items.some(i=>i.state==='confirmation')){document.getElementById('onoff-task-history')?.remove();document.getElementById('onoff-task-recovery')?.remove();return;}const view=historyView();delete view.dataset.provisional;view.replaceChildren();const heading=document.createElement('h2');heading.textContent='Confirmar tipificación';heading.style='font-size:20px;margin:0 0 14px;color:#172b3a';view.append(heading);if(!r.data.items.some(i=>i.state==='confirmation')){const close=document.createElement('button');close.textContent='Cerrar historial';close.onclick=()=>view.remove();view.append(close);}if(!r.data.items.length){const p=document.createElement('p');p.textContent='No hay tipificaciones registradas en este piloto.';view.append(p);return;}
 const archive=document.createElement('details');const archiveTitle=document.createElement('summary');archiveTitle.textContent='Historial y borradores anteriores';archive.append(archiveTitle);
 for(const item of r.data.items){const row=document.createElement('section');row.style='margin:0 0 20px;padding:0 0 14px;border-bottom:1px solid #ddd';const title=document.createElement('h3');title.textContent=item.title||'TC'+item.tc;row.append(title);const state=document.createElement('p');state.textContent=({created:'Creada #'+item.taskId+' · '+item.stage+(item.completed?' · Completada':''),failed:'Envío sin resultado confirmado · revisar fallo',rejected:'Bitrix rechazó la tarea. Corrige el borrador y confirma de nuevo.',expired:'Preparación vencida · requiere revisión',confirmation:'Revisa y confirma la creación',pending:'Envío en proceso / reintento pendiente',prepared:'Borrador sin cierre registrado'}[item.state]);row.append(state);if(item.error){const p=document.createElement('p');p.textContent=item.error+' · Intentos: '+item.attempts+(item.nextAt?' · Próximo: '+new Date(item.nextAt).toLocaleTimeString():'');row.append(p);}
 if(item.url){const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener';a.textContent='Abrir tarea #'+item.taskId;row.append(a);}
 if(item.state==='confirmation'||item.state==='rejected'){const preview=document.createElement('textarea');preview.readOnly=true;preview.setAttribute('aria-label','Vista previa final TC'+item.tc);preview.style='width:100%;height:200px;box-sizing:border-box';preview.value=item.review?.description||item.description;row.append(preview);
 const edit=document.createElement('button');edit.textContent='✎ Editar borrador';edit.onclick=()=>editDraft(item);row.append(edit);const button=document.createElement('button');button.textContent='✓ Confirmar crear tarea PRUEBA · '+(item.review?.identityMode==='contact'?'Contacto '+item.review.phone:'TC'+item.tc);button.style='background:#087a48;color:white;padding:10px;margin:8px;border:0;border-radius:6px';button.onclick=async e=>{if(!e.isTrusted||deliveryJobs.has(item.key))return;button.disabled=true;button.textContent='Creando tarea… Espera sin volver a pulsar';row.setAttribute('aria-busy','true');await commit({action:'confirm',recordKey:item.key},item);};row.append(button);}
 if(item.state==='pending'||item.state==='failed'){const button=document.createElement('button');button.textContent='Revisar / reintentar este envío';button.onclick=()=>commit({action:'resume',recordKey:item.key},item);row.append(button);}if(item.state==='created'||item.state==='prepared')archive.append(row);else view.append(row);
 }if(archive.children.length>1)view.append(archive);}
 const tell=t=>{if(panel)panel.querySelector('[data-create-status]').textContent=t;};

 async function loadPilot(){if(!panel)return;window.__onoffPreparationReady=false;window.__onoffPreparationError='';try{const r=await send({action:'info'});if(r.ok){pilot=r.data;window.__onoffPreparationReady=true;if(pilot.mode==='multi'){const enable=panel.querySelector('[data-create-enable]');enable.checked=true;enable.disabled=true;}panel.querySelector('[data-pilot-context]').textContent=pilot.mode==='multi'?'Piloto PRUEBA: una tipificación por atención de hoy y TC confirmada. Responsable y equipo de PRIMER CONTACTO.':'Piloto de una tarea para TC'+pilot.tc+'. Radicado anterior: '+pilot.previousTaskId+'. Se conserva intacto.';}else throw Error(r.error);}catch(e){pilot=null;window.__onoffPreparationError='No se pudo iniciar el piloto: '+e.message;tell(e.message);window.ONOFFAdvisorValidation?.preparation('No se pudo iniciar el piloto: '+e.message);}}
 window.addEventListener('onoff-retry-preparation',()=>{if(!pilot)loadPilot();});
 function snapshot(){const p=window.ONOFFTaskReview?.snapshot();if(!p)throw Error('Abre la vista previa y confirma la TC.');return p;}
 const canonical=p=>JSON.stringify(p);
 const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 function reviewed(){return panel.querySelector('[data-finalreview]').checked&&panel.querySelector('[data-duplicate]').checked;}
 async function prepare(){
  const requestedRoom=location.hash,requestEpoch=preparationEpoch,requestDialog=closeDialog(),waitStarted=Date.now();while(busy&&requestEpoch===preparationEpoch&&Date.now()-waitStarted<58000)await new Promise(resolve=>setTimeout(resolve,100));if(requestEpoch!==preparationEpoch||!requestDialog?.isConnected||requestDialog!==closeDialog()||location.hash!==requestedRoom||pending)return false;if(busy)throw Error('No se pudo preparar a tiempo. Pulsa Revalidar preparación.');try{if(armed?.expires>Date.now()&&armed.signature===canonical(snapshot())&&reviewed())return true;}catch{}
  let timeout;armed=null;busy=true;window.ONOFFAdvisorValidation?.preparation('Preparando vista previa… Espera, no necesitas volver a pulsar.');
  try{if(!reviewed())throw Error('Revisa el resumen y confirma la tarea PRUEBA separada.');const payload=snapshot();if(!payload.category||!payload.detail)throw Error('Selecciona tipificación y detalle en iKono.');if(!payload.tcConfirmed||!payload.reviewed)throw Error('Confirma la TC y revisa todos los textos de hoy para esa TC.');const signature=canonical(payload);payload.revision=await digest(signature);delete payload.messages;delete payload.selectedMessageIds;payload.duplicateAcknowledged=true;const r=await Promise.race([send({action:'prepare',payload}),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('La preparación agotó el tiempo de espera. Pulsa Revalidar preparación.')),57000);})]);if(!r.ok)throw Error(r.error);if(requestEpoch!==preparationEpoch||!requestDialog?.isConnected||requestDialog!==closeDialog())return false;if(canonical(snapshot())!==signature||!reviewed())throw Error('El chat o tu revisión cambió. Prepara nuevamente.');armed={...r.data,signature,revision:payload.revision,room:payload.room,preview:{tc:payload.tc,title:r.data.title,description:payload.description}};window.ONOFFAdvisorValidation?.preparation('✓ Lista para resolver. La creación requerirá tu confirmación final.');tell('Lista: '+r.data.title+'. Al pulsar Resolver se comprobará la salida a encuesta o el estado Resuelto. Después del cierre aparecerá Confirmar crear tarea PRUEBA; no se crea sin ese clic.');}
  catch(e){if(requestEpoch===preparationEpoch){tell(e.message);window.ONOFFAdvisorValidation?.preparation('No se pudo preparar: '+e.message);}}finally{clearTimeout(timeout);if(requestEpoch===preparationEpoch){busy=false;syncButton();}}
  return !!armed;
 }
 function tileName(e){return (e.getAttribute('aria-label')||'').replace(/ con \d+ mensajes? sin leer\.?$/,'');}
 function status(e){return ['Resuelto','En seguimiento','Pendiente'].find(x=>e.querySelector('[aria-label="'+x+'"]'))||'';}
 function tiles(name){return [...document.querySelectorAll('[aria-label^="Abrir sala "]')].filter(e=>tileName(e)===name);}
 function closeDialog(){return [...document.querySelectorAll('[role="dialog"]')].find(d=>(d.getAttribute('aria-label')||document.getElementById(d.getAttribute('aria-labelledby'))?.textContent||'').trim()==='Resolver conversación');}
 function stop(event,message){event.preventDefault();event.stopImmediatePropagation();if(!busy)armed=null;tell(message);window.ONOFFAdvisorValidation?.preparation(message);}
 // Window capture runs before iKono's native click handler and the passive close probe.
 window.addEventListener('click',event=>{
  const b=event.target.closest?.('button'),dialog=closeDialog();if(!b||!dialog?.contains(b))return;
  const name=b.textContent.trim();if(name==='Cancelar'||name==='Cerrar diálogo'){resetPreparation();pending=null;return;}
  if(name!=='Resolver conversación')return;
  if(window.ONOFFAdvisorValidation&&(!panel||!pilot))return stop(event,'Cargando la preparación de tarea… Espera un momento.');
  if(!panel?.querySelector('[data-create-enable]').checked)return;
  if(window.ONOFFAdvisorValidation&&!window.ONOFFAdvisorValidation.isValidated())return stop(event,'Valida la TC, negociación y resumen en la interfaz del asesor antes de Resolver.');
  if(!event.isTrusted)return stop(event,'El cierre debe pulsarlo el asesor.');
  if(pending)return stop(event,'Cierre ya solicitado. Se está comprobando su resultado.');
  let p;try{p=snapshot();}catch(e){return stop(event,e.message);}
  if(!armed||armed.expires<Date.now()||armed.signature!==canonical(p)||!reviewed())return stop(event,'La revisión cambió o falta preparar. Confirma TC, negociación y revisión del resumen antes de resolver. La vista previa se prepara automáticamente.');
  const tile=document.querySelector('[aria-label^="Abrir sala "][aria-selected="true"]'),label=tile&&tileName(tile),before=tile&&status(tile);
  if(!tile||tiles(label).length!==1||!['En seguimiento','Pendiente'].includes(before))return stop(event,'No se puede identificar de forma única el estado de esta sala. No se solicitó el cierre.');
  const job={...armed,label,before,clickedAt:Date.now(),dialog,interrupted:false};closureJobs.set(job.intent,job);armed=null;tell('Cierre solicitado por el asesor. Verificando salida a encuesta o estado Resuelto…');
 },true);
 // Observe native acknowledgement before the next navigation can remove its DOM.
 function observeClosures(){for(const job of closureJobs.values()){
  if(job.submitted)continue;
  if(job.ack&&job.dialog.isConnected){job.ack='';job.ackAt=0;}
  if(job.ack)continue;
  const matches=tiles(job.label),error=job.dialog.isConnected&&[...job.dialog.querySelectorAll('[role="alert"]')].some(e=>e.textContent.trim());
  job.error=!!error;
  if(error)continue;
  if(job.dialog.isConnected)continue;
  if(location.hash===job.room&&matches.length===1&&status(matches[0])==='Resuelto'){job.ack='Resuelto';job.ackAt=Date.now();}
  else if(!job.interrupted&&location.hash==='#/home'&&!matches.length){job.ack='ON_RATING_HANDOFF';job.ackAt=Date.now();}
 }}
 new MutationObserver(observeClosures).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});
 window.addEventListener('hashchange',observeClosures);
 const noteInteraction=()=>{observeClosures();for(const job of closureJobs.values())if(!job.ack)job.interrupted=true;};
 window.addEventListener('pointerdown',noteInteraction,true);window.addEventListener('keydown',noteInteraction,true);
 function processClosures(){observeClosures();for(const job of closureJobs.values()){
  if(job.submitted)continue;
  if(Date.now()-job.clickedAt>=15*60000){closureJobs.delete(job.intent);closureNotice('Venció la comprobación del cierre. Revisa el historial.');continue;}
  if(!job.ack){if(Date.now()-job.clickedAt>30000&&!job.waitNotice){job.waitNotice=true;closureNotice('Cierre pendiente de verificar · '+job.preview.title);}continue;}
  if(!closeDialog()&&location.hash==='#/home')closurePreview(job);
  if(job.error||Date.now()-job.ackAt<300||Date.now()<(job.retryAt||0))continue;
  job.submitted=true;
  const evidence={room:job.room,revision:job.revision,before:job.before,after:job.ack,handoff:job.ack==='ON_RATING_HANDOFF',clickedAt:job.clickedAt};
  send({action:'await-confirmation',intent:job.intent,evidence}).then(async r=>{if(!r.ok)throw Error(r.error);closureJobs.delete(job.intent);window.__onoffHasPending=true;await journal();}).catch(()=>{job.submitted=false;job.retryAt=Date.now()+3000;closureNotice('Confirmación conservada · reintentando guardar');});
 }}
 function closureNotice(text){let box=document.getElementById('onoff-closure-pending');if(!box){box=document.createElement('aside');box.id='onoff-closure-pending';box.style='position:fixed;right:14px;bottom:65px;z-index:2147483647;background:white;color:#172b3a;padding:12px;border:1px solid #087a48;border-radius:8px';const label=document.createElement('span'),button=document.createElement('button');button.textContent='Revisar confirmaciones';button.onclick=()=>journal();box.append(label,button);document.body.append(box);}box.querySelector('span').textContent=text+' ';}
 function deliveryBar(key,item){let box=document.getElementById('onoff-task-sending');if(!box){box=document.createElement('aside');box.id='onoff-task-sending';box.setAttribute('aria-label','Tipificaciones en envío');box.style='position:fixed;right:14px;bottom:14px;z-index:2147483647;width:min(450px,calc(100vw - 28px));max-height:35vh;overflow:auto;background:#fff;color:#172b3a;border:1px solid #087a48;border-radius:10px;padding:10px;font:14px system-ui;box-shadow:0 3px 12px #0003';document.body.append(box);}let row=deliveryRows.get(key);if(!row?.isConnected){row=document.createElement('section');row.style='display:flex;align-items:center;gap:8px;padding:5px 0';const title=document.createElement('strong');title.style='flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';title.textContent=item?.title||'Tipificación pendiente';title.title=title.textContent;const state=document.createElement('span');state.setAttribute('role','status');row.append(title,state);const detail=document.createElement('button');detail.textContent='Ver detalle';detail.onclick=()=>journal();row.append(detail);box.append(row);deliveryRows.set(key,row);}row.removeAttribute('data-failed');row.style.borderLeft='';row.querySelector('[role=status]').textContent='Creando…';return row;}
 async function commit(m,item){const key=m.recordKey||m.intent||'resume';if(deliveryJobs.has(key))return deliveryJobs.get(key);const row=deliveryBar(key,item);const view=document.getElementById('onoff-task-history');if(view)view.style.display='none';window.__onoffHasPending=true;
  const job=(async()=>{try{const r=await send(m);if(!r.ok)throw Error(r.error);if(!closeDialog()){tell('Tarea PRUEBA #'+r.data.taskId+' · '+r.data.stage+(r.data.completed?' · Completada':''));const a=document.createElement('a');a.href=r.data.url;a.textContent='Abrir tarea #'+r.data.taskId;a.target='_blank';a.rel='noopener';panel?.querySelector('[data-create-status]')?.append(' ',a);}row.remove();deliveryRows.delete(key);if(!deliveryRows.size)document.getElementById('onoff-task-sending')?.remove();if(!pending)await journal({afterSuccess:true});successToast();}catch(e){if(!closeDialog())tell(e.message);row.style.borderLeft='4px solid #b33';row.querySelector('[role=status]').textContent='Envío sin confirmar: '+e.message+' · Conservado para reintentar.';row.setAttribute('data-failed','true');window.__onoffHasPending=true;}finally{deliveryJobs.delete(key);}})();deliveryJobs.set(key,job);return job;
 }

 function syncButton(){
  const dialog=closeDialog(),native=dialog&&[...dialog.querySelectorAll('button')].find(b=>b.textContent.trim()==='Resolver conversación');if(!native||!window.ONOFFAdvisorValidation)return;
  let current=false;try{const p=snapshot();current=!!p.category&&!!p.detail&&!!armed&&armed.expires>Date.now()&&armed.signature===canonical(p)&&reviewed()&&window.ONOFFAdvisorValidation.isValidated();}catch{}
  const blocked=busy||!!pending||!current;native.toggleAttribute('data-onoff-blocked',blocked);native.setAttribute('aria-disabled',String(blocked||native.disabled));native.setAttribute('aria-busy',String(busy));native.title=busy?'Preparando la tarea…':blocked?'Completa tipificación y detalle y espera el aviso Lista.':'Lista para resolver. Pulsa una sola vez.';
 }
 function refreshDeliveryBars(){if(!deliveryRows.size||deliveryScanBusy||Date.now()-lastDeliveryScan<3000)return;lastDeliveryScan=Date.now();deliveryScanBusy=true;send({action:'list'}).then(r=>{if(!r.ok)return;for(const [key,row]of deliveryRows){if(deliveryJobs.has(key))continue;const item=r.data.items.find(i=>i.key===key);if(item?.state==='created'){row.remove();deliveryRows.delete(key);successToast();}else if(item?.state==='pending')row.querySelector('[role=status]').textContent='Reintentando…';}if(!deliveryRows.size)document.getElementById('onoff-task-sending')?.remove();}).catch(()=>{}).finally(()=>deliveryScanBusy=false);}
 const dailyDate = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', dateStyle: 'medium'
 });
 const dailyTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', timeStyle: 'short'
 });
 const dailyGroups = [
  {title:'Creadas', states:['created']},
  {title:'Pendientes', states:['confirmation','pending']},
  {title:'Por revisar', states:['failed','rejected','expired']}
 ];
 const dailyStatus = {
  created:'Tarea confirmada en Bitrix', confirmation:'Pendiente de confirmación',
  pending:'En envío o esperando reintento', failed:'Envío sin resultado confirmado',
  rejected:'Rechazada por Bitrix', expired:'Confirmación vencida'
 };
 let dailyPanel, dailyReadInFlight=false, nextDailyRead=0;
 async function refreshDailyTasks() {
  if(!dailyPanel?.isConnected || dailyReadInFlight) return;
  const panelAtRequest=dailyPanel;
  dailyReadInFlight=true;
  nextDailyRead=Date.now()+5000;
  const status=panelAtRequest.querySelector('[role=status]');
  try {
   const response=await send({action:'list'});
   if(!response.ok) throw Error(response.error||'No se pudo leer el historial.');
   if(!panelAtRequest.isConnected) return;
   const today=dailyDate.format(new Date());
   const items=response.data.items.map(item=>({...item, displayedAt:item.resultAt||item.lastAttempt||item.closedAt||item.at}))
    .filter(item=>Number.isFinite(item.displayedAt) && item.displayedAt>0 && dailyDate.format(item.displayedAt)===today)
    .sort((a,b)=>b.displayedAt-a.displayedAt);
   const sections=dailyGroups.map(group=>{
    const section=document.createElement('section');
    const list=items.filter(item=>group.states.includes(item.state));
    const heading=document.createElement('h3');
    heading.textContent=group.title+' ('+list.length+')';
    section.append(heading);
    for(const item of list){
     const article=document.createElement('article');
     article.style='border-top:1px solid #d5e0e5;padding:9px 0';
     const title=document.createElement('strong');
     title.textContent=item.title||(item.tc==='Sin TC'?'Cliente sin TC':'TC'+item.tc);
     const detail=document.createElement('div');
     detail.textContent=dailyTime.format(item.displayedAt)+' · '+dailyStatus[item.state]+(item.stage?' · '+item.stage:'')+(item.completed?' · Completada':'');
     article.append(title,detail);
     if(item.taskId){
      const label='Radicado #'+item.taskId;
      let url;
      try{url=new URL(item.url);}catch{}
      if(url?.protocol==='https:'){
       const link=document.createElement('a');
       link.href=url.href;link.rel='noopener noreferrer';link.target='_blank';link.textContent=label;article.append(link);
      }else article.append(document.createTextNode(label));
     }
     if(item.error){
      const error=document.createElement('p');
      error.textContent=item.error;article.append(error);
     }
     section.append(article);
    }
    return section;
   });
   panelAtRequest.querySelector('[data-daily-rows]').replaceChildren(...sections);
   status.textContent='Registros de esta instalación · '+today+' · hora de Colombia';
  }catch(error){
   status.textContent='No se pudo actualizar. '+error.message;
  }finally{dailyReadInFlight=false;}
 }
 function mountDailyTasks() {
  if(document.getElementById('onoff-task-daily-button')) return;
  const open=document.createElement('button');
  open.id='onoff-task-daily-button';
  open.textContent='Tipificaciones de hoy';
  open.style='position:fixed;left:65px;bottom:16px;z-index:2147483630;background:#fff;color:#173b55;border:1px solid #617b8e;border-radius:7px;padding:8px 12px;font:14px system-ui;cursor:pointer';
  open.onclick=()=>{
   if(dailyPanel?.isConnected){dailyPanel.querySelector('button').focus();return;}
   dailyPanel=document.createElement('section');
   dailyPanel.setAttribute('aria-label','Tipificaciones de hoy');
   dailyPanel.style='position:fixed;left:65px;bottom:57px;z-index:2147483630;width:min(460px,calc(100vw - 90px));max-height:65vh;overflow:auto;background:#fff;color:#172b3a;padding:16px;border:1px solid #16834a;border-radius:10px;font:14px system-ui';
   const title=document.createElement('h2');title.textContent='Tipificaciones de hoy';
   const close=document.createElement('button');close.textContent='Cerrar lista';close.onclick=()=>{dailyPanel.remove();open.focus();};
   const refresh=document.createElement('button');refresh.textContent='Actualizar lista';refresh.onclick=()=>refreshDailyTasks();
   const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Cargando registros…';
   const rows=document.createElement('div');rows.setAttribute('data-daily-rows','');
   dailyPanel.append(title,close,refresh,status,rows);document.body.append(dailyPanel);
   close.focus();refreshDailyTasks();
  };
  document.body.append(open);
 }
 function tick(){refreshDeliveryBars();processClosures();
  mountDailyTasks();
  if(dailyPanel?.isConnected&&Date.now()>=nextDailyRead)refreshDailyTasks();
  const currentDialog=closeDialog();if(currentDialog!==lastDialog){if(!pending)resetPreparation();lastDialog=currentDialog;}


  window.ONOFFAdvisorValidation?.tick(closeDialog(),()=>{if(!panel)return false;panel.querySelector('[data-finalreview]').checked=true;panel.querySelector('[data-duplicate]').checked=true;lastAutoPreparation='';return prepare();});
  if(location.hash==='#/home'&&!recoveredConfirmations){recoveredConfirmations=true;send({action:'list'}).then(r=>{if(r.ok&&r.data.items.some(i=>i.state==='confirmation'))journal();}).catch(()=>{});}
  if(closeDialog()&&panel&&!armed&&!busy&&!pending&&pilot?.mode==='multi'&&panel.querySelector('[data-create-enable]').checked&&reviewed()){try{const p=snapshot();const signature=canonical(p);if(p.tcConfirmed&&p.reviewed&&(p.dealId||p.identityMode==='contact'&&p.contactConfirmed)&&lastAutoPreparation!==signature){if(autoCandidate!==signature){autoCandidate=signature;autoDue=Date.now()+1200;}else if(Date.now()>=autoDue){lastAutoPreparation=signature;prepare();}} }catch{}}

  if(location.hash==='#/home'&&Date.now()-lastPendingScan>5000){lastPendingScan=Date.now();send({action:'list'}).then(r=>{if(r.ok)window.__onoffHasPending=r.data.items.some(i=>['confirmation','pending','failed'].includes(i.state));}).catch(()=>{});}
  if(location.hash==='#/home'&&window.__onoffHasPending&&!document.getElementById('onoff-task-recovery')){const box=document.createElement('aside');box.id='onoff-task-recovery';box.style='position:fixed;right:18px;bottom:170px;z-index:2147483647;background:white;color:#123;padding:12px;border:1px solid #16834a;border-radius:8px';const button=document.createElement('button');button.textContent='Consultar tareas PRUEBA pendientes';button.onclick=journal;box.append(button);document.body.append(box);}else if(location.hash!=='#/home'||!window.__onoffHasPending)document.getElementById('onoff-task-recovery')?.remove();
  if(!panel){root=document.getElementById('onoff-ikono-auto-summary')?.shadowRoot;const box=root?.querySelector('[data-description]')?.closest('details');if(!box)return;
   panel=document.createElement('section');panel.innerHTML='<h4>Tarea PRUEBA desde extensión · 0.24.4</h4><p data-pilot-context>Piloto de una tarea. El radicado anterior se conserva intacto.</p><label><input type="checkbox" data-create-enable>Pedir confirmación para crear tarea PRUEBA después de Resolver</label><label style="display:block"><input type="checkbox" data-finalreview>Revisé y corregí el resumen final de hoy para la TC seleccionada.</label><label style="display:block"><input type="checkbox" data-duplicate>La vista previa corresponde a esta atención; los radicados técnicos son referencias.</label><button data-prepare>Preparar vista previa</button><button data-resume>Consultar resultado pendiente</button><p data-create-status>Confirma TC, negociación y revisión: la vista previa se preparará sola. Tras Resolver aparecerá la confirmación final para crear. La confirmación de tipificación es obligatoria en este piloto.</p>';box.append(panel);panel.querySelector('[data-prepare]').onclick=prepare;panel.querySelector('[data-resume]').onclick=()=>commit({action:'resume'});loadPilot();
  }
  if(armed&&armed.expires<=Date.now()){armed=null;lastAutoPreparation='';autoCandidate='';window.ONOFFAdvisorValidation?.preparation('La preparación venció. Revalidando…');}
  if(armed){try{if(armed.signature!==canonical(snapshot())||!reviewed()){armed=null;tell('Cambio detectado. Se conserva tu borrador; revisa y prepara nuevamente.');}}catch{armed=null;}}
 }
 const gateStyle=document.createElement('style');gateStyle.textContent='button[data-onoff-blocked]{opacity:.55!important;cursor:wait!important;pointer-events:none!important}';document.head.append(gateStyle);
 setInterval(()=>{try{tick();}catch(e){window.ONOFFAdvisorValidation?.preparation('No se pudo actualizar la revisión: '+e.message);}finally{syncButton();}},500);
})();
