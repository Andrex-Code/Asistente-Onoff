(() => {
 if(window.__onoffTaskCreator)return;window.__onoffTaskCreator=true;
 let panel,root,armed=null,pending=null,busy=false,pilot=null,interrupted=false,homeSince=0,recoveredConfirmations=false,lastAutoPreparation='',autoCandidate='',autoDue=0;
 const look=document.createElement('style');look.textContent='#onoff-task-history{left:50%!important;top:50%!important;right:auto!important;transform:translate(-50%,-50%);width:min(620px,calc(100vw - 32px))!important;max-height:82vh!important;box-shadow:0 12px 50px #0006}#onoff-task-history,#onoff-task-result,#onoff-task-recovery{color-scheme:light;background:#fff!important;color:#172b3a!important;font:14px system-ui}#onoff-task-history textarea,#onoff-task-history input,#onoff-task-history select{color:#172b3a!important;-webkit-text-fill-color:#172b3a!important;background:#fff!important;border:1px solid #8094a5;border-radius:7px;padding:10px;font:14px/1.5 system-ui;opacity:1!important}#onoff-task-history button,#onoff-task-recovery button{cursor:pointer;padding:10px 14px;border:1px solid #617b8e;border-radius:7px;background:#edf4f8;color:#173b55;font:14px system-ui}#onoff-task-history button:hover:enabled,#onoff-task-recovery button:hover:enabled{filter:brightness(.92);box-shadow:0 2px 5px #2344}#onoff-task-history button:disabled{cursor:progress;opacity:.6}#onoff-task-history button:focus-visible,#onoff-task-history textarea:focus-visible{outline:3px solid #1378be;outline-offset:2px}#onoff-task-history a,#onoff-task-result a{color:#075fa3!important;text-decoration:underline}#onoff-task-history details>summary{cursor:pointer;padding:8px}';document.head.append(look);
 const closureJobs=new Map();
 let deferredConfirmation=null;
 const fallbackKey='onoff-preparation-reviews';
 let fallback=null, preparationFailure=null, lastDialogRoom=null;
 const dialogRooms=new WeakMap();
 const temporaryReviews=new Map();
 const recordedDialogs=new WeakMap();const pendingReviewSaves=new WeakSet();const reviewSaveErrors=new WeakMap();
 const confirmationStates=['confirmation','expired','rejected'];
 let queueChecking=false,lastQueueCheck=0;
 const automaticRenewals=new Set();
 async function recoverClosures(){
  const response=await send({action:'recover-closures'});
  if(!response.ok)return;
  for(const job of response.data){
   if(!closureJobs.has(job.intent))closureJobs.set(job.intent,{...job,interrupted:true});
  }
 }
 let preparationEpoch=0,lastDialog=null;
 function resetPreparation(){fallback=null;preparationFailure=null;busy=false;if(!closureJobs.size)clearClosurePreview();preparationEpoch++;armed=null;lastAutoPreparation='';autoCandidate='';autoDue=0;}
 new MutationObserver(changes=>{if(lastDialog&&!pending&&changes.some(r=>[...r.removedNodes].some(n=>n===lastDialog||n.contains?.(lastDialog))))resetPreparation();}).observe(document.body,{childList:true,subtree:true});
 let toastTimer,lastPendingScan=0,lastDeliveryScan=0,deliveryScanBusy=false;const deliveryJobs=new Map(),deliveryRows=new Map();
 function successToast(){clearTimeout(toastTimer);document.getElementById('onoff-task-result')?.remove();const toast=document.createElement('aside');toast.id='onoff-task-result';toast.setAttribute('role','status');toast.textContent='Tipificación creada';toast.style='position:fixed;left:50%;top:30px;transform:translateX(-50%);z-index:2147483647;background:#087a48;color:white;padding:14px 22px;border-radius:10px;font:16px system-ui';document.body.append(toast);toastTimer=setTimeout(()=>toast.remove(),1000);}
 async function send(m){
  if(m.action!=='list')return chrome.runtime.sendMessage({type:'ONOFF_TASK_PILOT',...m});
  const [remote,local]=await Promise.allSettled([
   chrome.runtime.sendMessage({type:'ONOFF_TASK_PILOT',...m}),
   chrome.storage?.local.get(null)
  ]);
  const items=remote.value?.data?.items||[];
  const reviews=Object.entries(local.value||{}).filter(([key,value])=>key.startsWith(fallbackKey+'-')&&value?.state==='preparation-review').map(([,value])=>value);
  for(const [key,review] of temporaryReviews){
   if(!reviews.some(saved=>saved.key===key))reviews.push(review);
  }
  if(!remote.value?.ok&&local.status!=='fulfilled')return {ok:false,error:'No se pudo leer el historial.'};
  return {ok:true,data:{items:[...items,...reviews]}};
 }
 function fallbackFor(dialog){
  const {category,detail}=window.ONOFFIkonoClassification?.readClassification(dialog)||{};
  if(!category||!detail||!/^#\/room\/[^\s?#]+$/.test(location.hash)){fallback=null;return null;}
  const room=location.hash;
  if(fallback?.dialog!==dialog||fallback.room!==room||fallback.category!==category||fallback.detail!==detail){
   fallback={dialog,room,category,detail,startedAt:Date.now()};
  }
  let snapshot,context;
  try{snapshot=window.ONOFFTaskReview?.snapshot();context=window.ONOFFAdvisorContext?.read();}catch{}
  const generation=context?.generationStatus||'';const manual=window.ONOFFAdvisorValidation?.manualDraft?.();const missingReason=manual?.required&&!manual.saved;
  if(busy||dialog.querySelector('[aria-busy="true"]:not([data-onoff-blocked])'))return null;
  const reason=missingReason?'Motivo de contacto pendiente de completar por el asesor.':recordedDialogs.get(dialog)?.reason||window.__onoffPreparationError||
   (preparationFailure?.dialog===dialog&&preparationFailure.room===room&&preparationFailure.category===category&&preparationFailure.detail===detail?preparationFailure.reason:'')||
   (/(?:No hay textos verificables|No se pudo generar|agotó el tiempo)/i.test(generation)?generation:'')||
   (Date.now()-fallback.startedAt>=65000?'La revisión de la atención sigue pendiente. Verifica la identidad y el resumen antes de reintentar.':'');
  return reason?{...fallback,reason,snapshot,context,manual}:null;
 }
 function reviewSignature(review){return JSON.stringify([review.room,review.category,review.detail,review.snapshot?.attention,review.snapshot?.tc,review.snapshot?.phone,review.manual?.required&&!review.manual.saved?'':review.manual?.description||review.snapshot?.description||review.context?.summary||'',review.snapshot?.messages]);}
 async function recordPreparationReview(review){
  const {dialog,room,category,detail,snapshot,context,reason,manual}=review;
  const signature=reviewSignature(review),previous=recordedDialogs.get(dialog);
  if(previous?.signature===signature)return previous.key;
  if(pendingReviewSaves.has(dialog))throw Error('Ya se está guardando el registro.');
  pendingReviewSaves.add(dialog);
  const key=previous?.key||fallbackKey+'-'+crypto.randomUUID(),at=Date.now();
  const tc=snapshot?.tc||'';const phone=snapshot?.phone||'';
  const identity=tc?'TC'+tc:phone?'Contacto '+phone:'Identidad pendiente';
  const description=manual?.required&&!manual.saved?'':manual?.description||snapshot?.description?.trim()||context?.summary?.trim()||'';
  const entry={key,room,tc,at,state:'preparation-review',title:identity+' · '+detail,error:reason.slice(0,1000),description,review:{category,detail,phone,dealId:snapshot?.dealId||'',attention:snapshot?.attention||'',observations:dialog.querySelector('textarea')?.value?.slice(0,3000)||''}};
  try{await chrome.storage.local.set({[key]:entry});recordedDialogs.set(dialog,{key,signature,reason});reviewSaveErrors.delete(dialog);preparationEpoch++;armed=null;busy=false;return key;}
  finally{pendingReviewSaves.delete(dialog);}
 }
 recoverClosures().catch(()=>{});

 function historyView(){let v=document.getElementById('onoff-task-history');if(!v){v=document.createElement('section');v.id='onoff-task-history';v.setAttribute('aria-label','Tipificaciones pendientes');v.style='position:fixed;right:18px;top:60px;z-index:2147483647;background:white;color:#123;padding:20px;width:min(480px,calc(100vw - 70px));max-height:75vh;overflow:auto;border:1px solid #16834a;border-radius:12px;font:14px system-ui';document.body.append(v);}v.style.display='block';return v;}
 function clearClosurePreview(){const v=document.getElementById('onoff-task-history');if(v?.dataset.provisional==='true')v.remove();}
 function closurePreview(p){if(p.previewShown||!p.preview||document.getElementById('onoff-task-history'))return;p.previewShown=true;const v=historyView();v.dataset.provisional='true';v.replaceChildren();const h=document.createElement('h3');h.textContent=p.preview.title;const summary=document.createElement('textarea');summary.readOnly=true;summary.value=p.preview.description;summary.setAttribute('aria-label','Vista previa mientras se verifica cierre');summary.style='width:100%;height:180px;box-sizing:border-box';const state=document.createElement('p');state.setAttribute('role','status');state.textContent='Verificando cierre en iKono… La creación aún no está habilitada.';v.append(h,summary,state);}
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
 async function journal({afterSuccess=false,focusKey}={}){const r=await send({action:'list'});if(!r.ok)return tell(r.error);window.__onoffHasPending=r.data.items.some(i=>['confirmation','pending','failed','rejected'].includes(i.state));if(!window.__onoffHasPending)document.getElementById('onoff-closure-pending')?.remove();if(afterSuccess&&!r.data.items.some(i=>confirmationStates.includes(i.state)&&!deliveryJobs.has(i.key))){document.getElementById('onoff-task-history')?.remove();document.getElementById('onoff-task-recovery')?.remove();return;}const view=historyView();delete view.dataset.provisional;view.replaceChildren();const heading=document.createElement('h2');heading.textContent='Confirmar tipificación';heading.style='font-size:20px;margin:0 0 14px;color:#172b3a';view.append(heading);if(!r.data.items.some(i=>i.state==='confirmation')){const close=document.createElement('button');close.textContent='Cerrar historial';close.onclick=()=>view.remove();view.append(close);}if(!r.data.items.length){const p=document.createElement('p');p.textContent='No hay tipificaciones registradas en este piloto.';view.append(p);return;}
 const archive=document.createElement('details');const archiveTitle=document.createElement('summary');archiveTitle.textContent='Historial y borradores anteriores';archive.append(archiveTitle);
 const queue=r.data.items.filter(i=>confirmationStates.includes(i.state)&&!deliveryJobs.has(i.key))
  .sort((a,b)=>(a.closedAt||a.at)-(b.closedAt||b.at));
 const active=queue.find(item=>item.key===focusKey)||queue[0];
 const items=focusKey?[...r.data.items].sort((a,b)=>Number(b.key===focusKey)-Number(a.key===focusKey)):r.data.items;
 for(const item of items){if(item.state==='preparation-review')continue;if(queue.includes(item)&&item!==active)continue;const row=document.createElement('section');row.style='margin:0 0 20px;padding:0 0 14px;border-bottom:1px solid #ddd';const title=document.createElement('h3');title.textContent=item.title||'TC'+item.tc;row.append(title);const state=document.createElement('p');state.textContent=({created:'Creada #'+item.taskId+' · '+item.stage+(item.completed?' · Completada':''),failed:'Envío sin resultado confirmado · revisar fallo',rejected:'Bitrix rechazó la tarea. Corrige el borrador y confirma de nuevo.',expired:'Preparación vencida · requiere revisión',confirmation:'Revisa y confirma la creación',pending:'Envío en proceso / reintento pendiente',verifying:'Verificando cierre en iKono',prepared:'Borrador sin cierre registrado'}[item.state]);row.append(state);if(item.error){const p=document.createElement('p');p.textContent=item.error+' · Intentos: '+item.attempts+(item.nextAt?' · Próximo: '+new Date(item.nextAt).toLocaleTimeString():'');row.append(p);}
 if(item.url){const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener';a.textContent='Abrir tarea #'+item.taskId;row.append(a);}
 if(item.state==='expired'){
  const summary=document.createElement('p');summary.style.whiteSpace='pre-wrap';summary.textContent=item.review?.description||item.description;row.append(summary);
  const retry=document.createElement('button');retry.textContent='Revalidar tipificación';row.append(retry);
  retry.onclick=async()=>{retry.disabled=true;state.textContent='Revalidando…';try{
   const response=await send({action:'renew',recordKey:item.key});if(!response.ok)throw Error(response.error);
   await journal({focusKey:response.data.key});
  }catch(error){state.textContent=error.message;retry.disabled=false;}};
  if(item.closureCertified&&!automaticRenewals.has(item.key)){
   automaticRenewals.add(item.key);
   void retry.onclick();
  }
 }
 if(item.state==='confirmation'||item.state==='rejected'){const preview=document.createElement('textarea');preview.readOnly=true;preview.setAttribute('aria-label','Vista previa final TC'+item.tc);preview.style='width:100%;height:200px;box-sizing:border-box';preview.value=item.review?.description||item.description;row.append(preview);
 const edit=document.createElement('button');edit.textContent='✎ Editar borrador';edit.onclick=()=>editDraft(item);row.append(edit);const button=document.createElement('button');button.textContent='✓ Confirmar crear tarea PRUEBA · '+(item.review?.identityMode==='contact'?'Contacto '+item.review.phone:'TC'+item.tc);button.style='background:#087a48;color:white;padding:10px;margin:8px;border:0;border-radius:6px';button.onclick=async e=>{if(!e.isTrusted||deliveryJobs.has(item.key))return;button.disabled=true;button.textContent='Creando tarea… Espera sin volver a pulsar';row.setAttribute('aria-busy','true');await commit({action:'confirm',recordKey:item.key},item);};row.append(button);}
 if(item.state==='pending'||item.state==='failed'){const button=document.createElement('button');button.textContent='Revisar / reintentar este envío';button.onclick=()=>commit({action:'resume',recordKey:item.key},item);row.append(button);}if(['prepared','verifying'].includes(item.state)){const link=openDraftRoom(item);if(link)row.append(link);}if(item.state==='created'||item.state==='prepared')archive.append(row);else view.append(row);
 }if(archive.children.length>1)view.append(archive);}
 const tell=t=>{if(panel)panel.querySelector('[data-create-status]').textContent=t;};

 async function loadPilot(){if(!panel)return;window.__onoffPreparationReady=false;window.__onoffPreparationError='';try{const r=await send({action:'info'});if(r.ok){pilot=r.data;window.__onoffPreparationReady=true;if(pilot.mode==='multi'){const enable=panel.querySelector('[data-create-enable]');enable.checked=true;enable.disabled=true;}panel.querySelector('[data-pilot-context]').textContent=pilot.mode==='multi'?'Piloto PRUEBA: una tipificación por atención de hoy y TC confirmada. Responsable y equipo de PRIMER CONTACTO.':'Piloto de una tarea para TC'+pilot.tc+'. Radicado anterior: '+pilot.previousTaskId+'. Se conserva intacto.';}else throw Error(r.error);}catch(e){pilot=null;window.__onoffPreparationError='No se pudo iniciar el piloto: '+e.message;tell(e.message);window.ONOFFAdvisorValidation?.preparation('No se pudo iniciar el piloto: '+e.message);}}
 window.addEventListener('onoff-retry-preparation',()=>{
  if(!pilot)loadPilot();
  if(!busy){preparationFailure=null;fallback=null;lastAutoPreparation='';}
 });
 function snapshot(){const p=window.ONOFFTaskReview?.snapshot();if(!p)throw Error('Abre la vista previa y confirma la TC.');return p;}
 const canonical=p=>JSON.stringify(p);
 const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 function reviewed(){return panel.querySelector('[data-finalreview]').checked&&panel.querySelector('[data-duplicate]').checked;}
 async function prepare(){
  const requestedRoom=location.hash,requestEpoch=preparationEpoch,requestDialog=closeDialog(),waitStarted=Date.now();if(requestDialog&&recordedDialogs.has(requestDialog))return false;while(busy&&requestEpoch===preparationEpoch&&Date.now()-waitStarted<58000)await new Promise(resolve=>setTimeout(resolve,100));if(requestEpoch!==preparationEpoch||!requestDialog?.isConnected||requestDialog!==closeDialog()||location.hash!==requestedRoom||pending)return false;if(busy)throw Error('No se pudo preparar a tiempo. Pulsa Revalidar preparación.');try{if(armed?.expires>Date.now()&&armed.signature===canonical(snapshot())&&reviewed())return true;}catch{}
  armed=null;busy=true;preparationFailure=null;
  window.ONOFFAdvisorValidation?.preparation('Preparando vista previa en Bitrix…');
  try{
   if(!reviewed())throw Error('Revisa el resumen y confirma la tarea PRUEBA separada.');
   const payload=snapshot();
   if(!payload.category||!payload.detail)throw Error('Selecciona tipificación y detalle en iKono.');
   if(!payload.tcConfirmed||!payload.reviewed)throw Error('Confirma la TC o el contacto y revisa los textos de esta atención.');
   const signature=canonical(payload);
   lastAutoPreparation=signature;
   payload.revision=await digest(signature);
   if(requestEpoch!==preparationEpoch||location.hash!==requestedRoom||requestDialog!==closeDialog())return false;
   delete payload.messages;delete payload.selectedMessageIds;payload.duplicateAcknowledged=true;
   const r=await send({action:'prepare',payload});
   if(requestEpoch!==preparationEpoch||location.hash!==requestedRoom||!requestDialog.isConnected||requestDialog!==closeDialog())return false;
   if(!r.ok)throw Error(r.error);
   if(canonical(snapshot())!==signature||!reviewed())throw Error('El chat o tu revisión cambió. Prepara nuevamente.');
   armed={...r.data,signature,revision:payload.revision,room:payload.room,preview:{tc:payload.tc,title:r.data.title,description:payload.description}};
   window.ONOFFAdvisorValidation?.preparation('✓ Lista para resolver. Se creará la tipificación en segundo plano.');
   tell('Lista: '+r.data.title+'. Al pulsar Resolver se enviará la tipificación a Bitrix.');
  }catch(e){
   if(requestEpoch===preparationEpoch&&location.hash===requestedRoom&&requestDialog===closeDialog()){
    const classification=window.ONOFFIkonoClassification?.readClassification(requestDialog)||{};
    preparationFailure={dialog:requestDialog,room:requestedRoom,category:classification.category,detail:classification.detail,reason:e.message};
    tell(e.message);window.ONOFFAdvisorValidation?.preparation('No se pudo preparar: '+e.message);
   }
  }finally{if(requestEpoch===preparationEpoch){busy=false;syncButton();}}
  return !!armed;
 }
 function tileName(e){return (e.getAttribute('aria-label')||'').replace(/ con \d+ mensajes? sin leer\.?$/,'');}
 function status(e){return ['Resuelto','En seguimiento','Pendiente'].find(x=>e.querySelector('[aria-label="'+x+'"]'))||'';}
 function tiles(name){return [...document.querySelectorAll('[aria-label^="Abrir sala "]')].filter(e=>tileName(e)===name);}
 function roomTile(room){
  const matches=[...document.querySelectorAll('[aria-label^="Abrir sala "]')].filter(tile=>{
   const link=tile.closest('a[href]')||tile.querySelector('a[href]');
   return link?.origin===location.origin&&link.hash===room;
  });
  return matches.length===1?matches[0]:null;
 }
 function openDraftRoom(item){
  if(!/^#\/room\/[^\s?#]+$/.test(item.room))return null;
  const link=document.createElement('a');
  link.href=item.room;link.textContent='Abrir sala en iKono';
  link.onclick=()=>{dailyPanel?.remove();document.getElementById('onoff-task-history')?.remove();};
  return link;
 }
 async function importReview(file){
  if(!file||file.size>100000)throw Error('Selecciona un archivo JSON de un caso Por revisar.');
  const data=ONOFFPreparationReview.normalize(JSON.parse(await file.text()));
  const keys=await chrome.storage.local.get(null);
  const found=Object.entries(keys).find(([key,item])=>key.startsWith(fallbackKey+'-')&&item?.room===data.room&&
   item.at===data.at&&item.review?.attention===data.review.attention);
  if(found)return;
  const key=fallbackKey+'-import-'+await digest(JSON.stringify([data.room,data.at,data.review.attention]));
  await chrome.storage.local.set({[key]:{...data,key}});
 }
 function recoverReview(item){
  const view=historyView();view.replaceChildren();
  const title=document.createElement('h2');title.textContent='Recuperar caso Por revisar';
  const status=document.createElement('p');status.setAttribute('role','status');
  const close=document.createElement('button');close.textContent='Cerrar recuperación';close.onclick=()=>view.remove();
  view.append(title,close,status);
  const proof=()=>location.hash===item.room&&window.ONOFFPreparationReview?.closure(window.ONOFFTimeline?.read()||[],item);
  if(!proof()){
   status.textContent=location.hash===item.room?'Carga el historial hasta ver la atención original y su aviso Chat resuelto con fecha. Vuelve a abrir la recuperación.':'Abre la sala original y vuelve a seleccionar Recuperar caso.';
   const link=openDraftRoom(item);if(link&&location.hash!==item.room)view.append(link);
   return;
  }
  const label=(text,input)=>{
   const wrapper=document.createElement('label');wrapper.style='display:block;margin:10px 0';
   wrapper.append(text+' ',input);view.append(wrapper);
  };
  const note=document.createElement('p');note.textContent=dailyDate.format(item.at)+' · '+item.review.category+' · '+item.review.detail;view.append(note);
  if(item.review.observations){const observations=document.createElement('p');observations.textContent=item.review.observations;view.append(observations);}
  const description=document.createElement('textarea');description.value=item.description;description.maxLength=12000;
  description.style='display:block;width:100%;min-height:155px;box-sizing:border-box';label('Resumen de la atención',description);
  const tc=document.createElement('input');tc.value=item.tc||'';tc.readOnly=!!item.tc;tc.inputMode='numeric';tc.maxLength=11;label('TC de la atención',tc);
  const lookup=document.createElement('button');lookup.textContent='Consultar negociación en Bitrix';view.append(lookup);
  const deals=document.createElement('select');deals.add(new Option('Seleccionar negociación',''));label('Negociación exacta',deals);
  const roomPhone=()=> (document.querySelector('.mx_RoomHeader')?.textContent||'').match(/\((\d{10,15})\)/)?.[1]||'';
  const phone=roomPhone()||item.review.phone||'';
  const contact=document.createElement('input');contact.type='checkbox';
  if(!item.tc&&phone&&(!item.review.phone||item.review.phone===phone))label('Confirmo atención sin TC del contacto '+phone,contact);
  const reviewed=document.createElement('input');reviewed.type='checkbox';
  label('Verifiqué la identidad, el resumen y el cierre de esta atención en iKono.',reviewed);
  const save=document.createElement('button');save.textContent='Preparar borrador recuperado';view.append(save);
  let lookedUpTC='';
  lookup.onclick=async event=>{
   if(!event.isTrusted||!proof())return;
   const code=window.ONOFFIkonoTC?.normalizeTaskTC(tc.value)||tc.value.trim();
   if(!/^\d{1,8}$/.test(code)){status.textContent='Escribe una TC válida.';return;}
   lookup.disabled=true;status.textContent='Consultando negociaciones en Bitrix…';
   try{
    const response=await send({action:'lookup',tc:code});
    if(!view.isConnected||!proof()||(window.ONOFFIkonoTC?.normalizeTaskTC(tc.value)||tc.value.trim())!==code)return;
    if(!response.ok)throw Error(response.error);
    const exact=response.data.deals.filter(deal=>String(deal.tc)===code&&deal.company?.id&&/^\d+$/.test(String(deal.id)));
    deals.replaceChildren(new Option('Seleccionar negociación',''),...exact.map(deal=>new Option(deal.title+' · '+deal.company.name,deal.id)));
    lookedUpTC=code;reviewed.checked=false;status.textContent=exact.length?'Selecciona la negociación de esta atención.':'La TC no tiene una negociación con compañía.';
   }catch(error){status.textContent=error.message;}
   finally{lookup.disabled=false;}
  };
  tc.oninput=()=>{lookedUpTC='';deals.replaceChildren(new Option('Seleccionar negociación',''));contact.checked=false;reviewed.checked=false;};
  deals.onchange=()=>{contact.checked=false;reviewed.checked=false;};
  contact.onchange=()=>{if(contact.checked){tc.value='';tc.oninput();contact.checked=true;}reviewed.checked=false;};
  description.oninput=()=>{reviewed.checked=false;};
  save.onclick=async event=>{
   if(!event.isTrusted)return;
   const closure=proof();
   if(!closure){status.textContent='La sala o el cierre visible cambió. Revisa la atención nuevamente.';return;}
   const code=window.ONOFFIkonoTC?.normalizeTaskTC(tc.value)||tc.value.trim();
   const contactConfirmed=contact.isConnected&&contact.checked&&(!roomPhone()||roomPhone()===phone);
   if(!reviewed.checked||!description.value.trim()||!contactConfirmed&&(!code||lookedUpTC!==code||!deals.value)){
    status.textContent='Completa el resumen, verifica la identidad y confirma la revisión.';return;
   }
   save.disabled=true;status.textContent='Preparando borrador recuperado…';
   try{
    const response=await send({action:'prepare-recovery',reviewKey:item.key,closureId:closure.closureId,
     tc:contactConfirmed?'':code,dealId:contactConfirmed?'':deals.value,phone,description:description.value.trim(),reviewed:true});
    if(!response.ok)throw Error(response.error==='Acción no habilitada.'?'El servicio privado todavía no admite la recuperación histórica. El caso sigue guardado.':response.error);
    if(view.isConnected&&proof())await journal({focusKey:response.data.recordKey});
    refreshDailyTasks();
   }catch(error){status.textContent=error.message;}
   finally{save.disabled=false;}
  };
 }
 function isResolveDialog(dialog){
  return dialog&&(dialog.getAttribute('aria-label')||
   document.getElementById(dialog.getAttribute('aria-labelledby'))?.textContent||'').trim()==='Resolver conversación';
 }
 function closeDialog(){
  const dialogs=[...document.querySelectorAll('[role="dialog"]')].filter(dialog=>dialog.getClientRects().length&&isResolveDialog(dialog));
  return dialogs.length===1?dialogs[0]:null;
 }
 function belongsToCurrentRoom(dialog){
  if(!dialogRooms.has(dialog))dialogRooms.set(dialog,location.hash);
  return dialogRooms.get(dialog)===location.hash;
 }
 function stop(event,message){event.preventDefault();event.stopImmediatePropagation();if(!busy)armed=null;tell(message);window.ONOFFAdvisorValidation?.preparation(message);}
 // Window capture runs before iKono's native click handler and the passive close probe.
 window.addEventListener('click',event=>{
  const b=event.target.closest?.('button'),dialog=b?.closest('[role=dialog]');if(!isResolveDialog(dialog))return;
  const name=b.textContent.trim();if(name==='Cancelar'||name==='Cerrar diálogo'){resetPreparation();pending=null;return;}
  if(name!=='Resolver conversación')return;
  if(dialog!==closeDialog())return stop(event,'Hay más de un diálogo de cierre visible. Deja abierto solo el de esta atención.');
  if(!event.isTrusted)return stop(event,'El cierre debe pulsarlo el asesor.');
  if(b.disabled)return;
  if(!belongsToCurrentRoom(dialog))return stop(event,'La sala cambió. Cierra el diálogo y vuelve a abrir Resolver en la sala actual.');
  const fallbackReview=fallbackFor(dialog);
  if(fallbackReview&&!canSendPrepared()){
   if(recordedDialogs.get(dialog)?.signature!==reviewSignature(fallbackReview))return stop(event,'Guarda primero el caso Por revisar y luego pulsa Resolver.');
   return;
  }
  if(window.ONOFFAdvisorValidation&&(!panel||!pilot))return stop(event,'Cargando la preparación de tarea… Espera un momento.');
  if(!panel?.querySelector('[data-create-enable]').checked)return;
  if(window.ONOFFAdvisorValidation&&!window.ONOFFAdvisorValidation.isValidated())return stop(event,'Valida la TC, negociación y resumen en la interfaz del asesor antes de Resolver.');
  if(pending)return stop(event,'Cierre ya solicitado. Se está comprobando su resultado.');
  let p;try{p=snapshot();}catch(e){return stop(event,e.message);}
  if(!armed||armed.expires<Date.now()||armed.signature!==canonical(p)||!reviewed())return stop(event,'La revisión cambió o falta preparar. Confirma TC, negociación y revisión del resumen antes de resolver. La vista previa se prepara automáticamente.');
  const {intent,room,revision,preview,recordKey}=armed;
  if(location.hash!==room)return stop(event,'La sala cambió. Revisa la tipificación de este chat.');
  armed=null;
  void commit({action:'resolve-and-send',intent,recordKey,request:{room,revision,clickedAt:Date.now()}},preview);
 },true);
 const carteraDestination='MenuColaCarteraTiendas';
 function clickedCarteraOption(target){
  if(target.closest('.mx_EventTile,[contenteditable]'))return false;
  for(let option=target;option&&option!==document.body;option=option.parentElement){
   if(![option.textContent.trim(),option.getAttribute('aria-label'),option.getAttribute('title')].includes(carteraDestination))continue;
   if(option.closest('[disabled],[aria-disabled="true"]'))return false;
   for(let panel=option.parentElement;panel&&panel!==document.body;panel=panel.parentElement){
    if(panel.querySelector('.mx_RoomHeader,.mx_EventTile'))break;
    if(panel.getAttribute('aria-label')==='Transferencias'||
     [...panel.querySelectorAll('h1,h2,h3,h4,[role="heading"],span,div')].some(node=>!node.children.length&&node.textContent.trim()==='Transferencias'))return true;
   }
   return false;
  }
  return false;
 }
 window.addEventListener('click',event=>{
  const target=event.target;
  if(!event.isTrusted||!(target instanceof Element)||!/^#\/room\/[^\s?#]+$/.test(location.hash))return;
  const header=target.closest('.mx_RoomHeader');
  if(header){
   for(let control=target;control&&control!==header;control=control.parentElement){
    if([control.getAttribute('aria-label'),control.getAttribute('title'),control.getAttribute('data-tooltip')].includes('Transferencias')){
     window.ONOFFAdvisorContext?.warmTransfer();
     return;
    }
   }
  }
  if(!clickedCarteraOption(target))return;
  const room=location.hash,clickedAt=Date.now();
  let context,p;
  try{context=window.ONOFFAdvisorContext?.read();p=window.ONOFFTaskReview?.snapshot();}catch{}
  const observed=window.ONOFFIkonoMemory?.get(room);
  const attention=observed?.attention||'';
  const selectedHistorical=context?.sessions?.at(-1)?.id!==attention;
  const captureEvidence=observed?.captureEvidence;
  const messages=[...observed?.messages?.values()||[]];
  const oversized=messages.length>250||messages.some(message=>message.text.length>4000)||
   messages.reduce((total,message)=>total+message.text.length,0)>48000;
  const conversation=oversized?[]:messages.map(({text})=>({text}));
  const phone=p?.phone||(document.querySelector('.mx_RoomHeader')?.textContent||'').match(/\((\d{10,15})\)/)?.[1]||'';
  const tc=(context?.confirmed||context?.clearTC||'').replace(/^TC/i,'');
  const summary=context?.summaryReady&&!selectedHistorical?context.summary:'';
  const problem=oversized?'La atención supera el límite del resumen automático.':selectedHistorical?'La atención actual no se pudo distinguir del historial.':
   !tc&&context?.candidates?.length?'Hay TC candidatas sin confirmar para la derivación.':'';
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(clickedAt));
  const transfer={room,clickedAt,day,attention,captureEvidence,tc,phone,summary,conversation,problem,destination:carteraDestination};
  const title=(tc?'TC'+tc:phone?'Contacto '+phone:'Derivación')+' · DERIVACIÓN A CARTERA';
  const key=JSON.stringify([room,day,attention,carteraDestination]);
  if(deliveryJobs.has(key))return;
  const row=deliveryBar(key,{title});
  const job=(async()=>{
   try{
    const response=await send({action:'transfer-and-send',transfer});
    if(!response.ok)throw Error(response.error);
    const result=response.data;
    if(result?.reviewRequired)throw Error(result.error+' · Consulta Por revisar.');
    if(result?.deliveryKey){
     deliveryRows.delete(key);deliveryRows.set(result.deliveryKey,row);
     row.querySelector('[role=status]').textContent=result.error||'En cola…';
     return;
    }
    if(result?.taskId)successToast();
    row.remove();deliveryRows.delete(key);
    if(!deliveryRows.size)document.getElementById('onoff-task-sending')?.remove();
   }catch(error){
    row.querySelector('[role=status]').textContent='Derivación · '+error.message;
    row.setAttribute('data-failed','true');
    row.querySelector('button').onclick=()=>document.getElementById('onoff-task-daily-button')?.click();
   }
  })().finally(()=>deliveryJobs.delete(key));
  deliveryJobs.set(key,job);
 },true);
 function statusOfResolvedRoom(job,matches,originalStillVisible){
  const identified=roomTile(job.room);
  if(identified)return status(identified)==='Resuelto';
  return matches.length===1&&status(matches[0])==='Resuelto'&&
   (originalStillVisible||location.hash===job.room&&matches[0].getAttribute('aria-selected')==='true');
 }
 // Observe native acknowledgement before the next navigation can remove its DOM.
 function observeClosures(){for(const job of closureJobs.values()){
  if(job.submitted)continue;
  if(job.ack&&job.dialog?.isConnected){job.ack='';job.ackAt=0;}
  if(job.ack)continue;
  const matches=tiles(job.label),error=job.dialog?.isConnected&&[...job.dialog.querySelectorAll('[role="alert"]')].some(e=>e.textContent.trim());
  job.error=!!error;
  if(error)continue;
  if(job.dialog?.isConnected)continue;
  const originalStillVisible=job.originalTile?.isConnected&&matches[0]===job.originalTile;
  if(statusOfResolvedRoom(job,matches,originalStillVisible)){job.ack='Resuelto';job.ackAt=Date.now();}
  else if(!job.interrupted&&location.hash==='#/home'&&!matches.length){job.ack='ON_RATING_HANDOFF';job.ackAt=Date.now();}
 }}
 new MutationObserver(observeClosures).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label','aria-selected','href']});
 window.addEventListener('hashchange',()=>{
  observeClosures();
  for(const job of closureJobs.values()){
   if(location.hash!==job.room&&location.hash!=='#/home'&&!job.ack&&!job.waitNotice){
    job.waitNotice=true;closureNotice('Verificando cierre · '+job.preview.title);
   }
  }
 });
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
  Promise.resolve(job.recorded).then(()=>send({action:'await-confirmation',intent:job.intent,evidence})).then(async r=>{if(!r.ok)throw Error(r.error);closureJobs.delete(job.intent);window.__onoffHasPending=true;
   // Keep the verified result locally even if the server cannot certify it yet.
   if(r.data.key){
    const renewed=await send({action:'renew',recordKey:r.data.key}).catch(()=>null);
    if(renewed?.ok)r.data.key=renewed.data.key;
   }
   refreshConfirmationQueue(true);
   if(closeDialog()){
    deferredConfirmation={key:r.data.key};
    closureNotice('Tipificación lista para confirmar · '+job.preview.title);
   }
   else if(!document.getElementById('onoff-task-history')||document.getElementById('onoff-task-history')?.dataset.provisional==='true')await journal();}).catch(()=>{job.submitted=false;job.retryAt=Date.now()+3000;closureNotice('Confirmación conservada · reintentando guardar');});
 }}
 function closureNotice(text){let box=document.getElementById('onoff-closure-pending');if(!box){box=document.createElement('aside');box.id='onoff-closure-pending';box.style='position:fixed;right:14px;bottom:65px;z-index:2147483647;background:white;color:#172b3a;padding:12px;border:1px solid #087a48;border-radius:8px';const label=document.createElement('span'),button=document.createElement('button');button.textContent='Revisar confirmaciones';button.onclick=()=>journal();box.append(label,button);document.body.append(box);}box.querySelector('span').textContent=text+' ';}
 function deliveryBar(key,item){let box=document.getElementById('onoff-task-sending');if(!box){box=document.createElement('aside');box.id='onoff-task-sending';box.setAttribute('aria-label','Tipificaciones en envío');box.style='position:fixed;right:14px;bottom:14px;z-index:2147483647;width:min(450px,calc(100vw - 28px));max-height:35vh;overflow:auto;background:#fff;color:#172b3a;border:1px solid #087a48;border-radius:10px;padding:10px;font:14px system-ui;box-shadow:0 3px 12px #0003';document.body.append(box);}let row=deliveryRows.get(key);if(!row?.isConnected){row=document.createElement('section');row.style='display:flex;align-items:center;gap:8px;padding:5px 0';const title=document.createElement('strong');title.style='flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';title.textContent=item?.title||'Tipificación pendiente';title.title=title.textContent;const state=document.createElement('span');state.setAttribute('role','status');row.append(title,state);const detail=document.createElement('button');detail.textContent='Ver detalle';detail.onclick=()=>journal();row.append(detail);box.append(row);deliveryRows.set(key,row);}row.removeAttribute('data-failed');row.style.borderLeft='';row.querySelector('[role=status]').textContent='Creando…';return row;}
 async function commit(m,item){const key=m.recordKey||m.intent||'resume';if(deliveryJobs.has(key))return deliveryJobs.get(key);const row=deliveryBar(key,item);const view=document.getElementById('onoff-task-history');if(view)view.remove();window.__onoffHasPending=true;
  const job=(async()=>{try{const r=await send(m);if(!r.ok){
   if(m.action==='confirm'&&/Venció la preparación/.test(r.error)){
    row.remove();deliveryRows.delete(key);if(!deliveryRows.size)document.getElementById('onoff-task-sending')?.remove();
    deliveryJobs.delete(key);await journal();return;
   }
   throw Error(r.error);
  }if(!closeDialog()){tell('Tarea PRUEBA #'+r.data.taskId+' · '+r.data.stage+(r.data.completed?' · Completada':''));const a=document.createElement('a');a.href=r.data.url;a.textContent='Abrir tarea #'+r.data.taskId;a.target='_blank';a.rel='noopener';panel?.querySelector('[data-create-status]')?.append(' ',a);}row.remove();deliveryRows.delete(key);if(!deliveryRows.size)document.getElementById('onoff-task-sending')?.remove();refreshConfirmationQueue(true);if(!closeDialog()&&!document.getElementById('onoff-task-history'))await journal({afterSuccess:true});successToast();}catch(e){if(!closeDialog())tell(e.message);row.style.borderLeft='4px solid #b33';row.querySelector('[role=status]').textContent='Envío sin confirmar: '+e.message+' · Conservado para reintentar.';row.setAttribute('data-failed','true');window.__onoffHasPending=true;}finally{deliveryJobs.delete(key);}})();deliveryJobs.set(key,job);if(!closeDialog())journal({afterSuccess:true}).catch(()=>{});return job;
 }

 function canSendPrepared(){
  try{
   const p=snapshot();
   return !!p.category&&!!p.detail&&!!armed&&armed.expires>Date.now()&&armed.signature===canonical(p)&&reviewed()&&window.ONOFFAdvisorValidation?.isValidated();
  }catch{return false;}
 }
 function syncButton(){
  const dialog=closeDialog(),native=dialog&&[...dialog.querySelectorAll('button')].find(b=>b.textContent.trim()==='Resolver conversación');if(!native||!window.ONOFFAdvisorValidation)return;
  const sameRoom=belongsToCurrentRoom(dialog);
  const ready=sameRoom&&canSendPrepared(),review=ready||!sameRoom?null:fallbackFor(dialog);
  const reviewSaved=!!review&&recordedDialogs.get(dialog)?.signature===reviewSignature(review);
  const blocked=!ready&&!reviewSaved;
  native.toggleAttribute('data-onoff-blocked',blocked);
  if(blocked){if(!native.hasAttribute('data-onoff-aria-owned')&&native.getAttribute('aria-disabled')!=='true'){native.setAttribute('data-onoff-aria-owned','');native.setAttribute('aria-disabled','true');}}else if(native.hasAttribute('data-onoff-aria-owned')){native.removeAttribute('data-onoff-aria-owned');if(!native.disabled)native.removeAttribute('aria-disabled');}
  native.setAttribute('aria-busy',String(busy&&!review));
  native.title=!sameRoom?'La sala cambió. Vuelve a abrir Resolver.':review?'Resolver en iKono y dejar el caso en Por revisar.':ready?'Lista para resolver. Pulsa una sola vez.':'Preparando la tipificación…';
  let note=dialog.querySelector('[data-onoff-preparation-review]');
  if(!review){note?.remove();return;}
  if(!note){
   note=document.createElement('div');note.dataset.onoffPreparationReview='';
   note.style='background:#811d2b;color:#fff;border-radius:6px;padding:10px 14px;white-space:normal;overflow-wrap:anywhere;text-align:start';
   if(native.parentElement===dialog)native.before(note);
   else native.parentElement.before(note);
  }
  let messageNode=note.querySelector('[data-onoff-review-message]'),save=note.querySelector('button');
  if(!messageNode){messageNode=document.createElement('p');messageNode.dataset.onoffReviewMessage='';messageNode.setAttribute('role','status');save=document.createElement('button');save.type='button';save.textContent='Guardar caso Por revisar';note.append(messageNode,save);}
  const message=reviewSaved?'Caso guardado localmente. Ahora puedes pulsar Resolver. No se ha creado una tarea en Bitrix.':'No fue posible preparar la tarea. Guarda el caso antes de resolver. '+review.reason;
  if(messageNode.textContent!==message)messageNode.textContent=message;
  save.hidden=reviewSaved;save.disabled=pendingReviewSaves.has(dialog);const saveError=reviewSaveErrors.get(dialog);if(saveError&&!reviewSaved)messageNode.textContent=message+' No se pudo guardar: '+saveError;
  save.onclick=async e=>{if(!e.isTrusted||!belongsToCurrentRoom(dialog)||dialog!==closeDialog())return;const current=fallbackFor(dialog);if(!current)return;save.disabled=true;try{await recordPreparationReview(current);syncButton();}catch(err){reviewSaveErrors.set(dialog,err.message);messageNode.textContent='No se pudo guardar el caso: '+err.message;save.disabled=false;}};
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
  {title:'Pendientes', states:['verifying','confirmation','pending']},
  {title:'Por revisar', states:['failed','rejected','expired','preparation-review']},
  {title:'Borradores', states:['prepared']}
 ];
 const dailyStatus = {
  created:'Tarea confirmada en Bitrix', verifying:'Verificando cierre en iKono', confirmation:'Pendiente de confirmación',
  pending:'En envío o esperando reintento', failed:'Envío sin resultado confirmado',
  'preparation-review':'Preparación fallida · sin envío a Bitrix', rejected:'Rechazada por Bitrix', expired:'Confirmación vencida', prepared:'Sin cierre registrado. No se habilitó el envío.'
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
    .filter(item=>Number.isFinite(item.displayedAt)&&item.displayedAt>0&&(
     dailyDate.format(item.displayedAt)===today||['preparation-review','failed','rejected','expired'].includes(item.state)))
    .sort((a,b)=>b.displayedAt-a.displayedAt);
   const openReviews=new Set([...panelAtRequest.querySelectorAll('details[data-review-key][open]')].map(detail=>detail.dataset.reviewKey));
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
     const date=dailyDate.format(item.displayedAt);
     detail.textContent=(date===today?'':date+' · ')+dailyTime.format(item.displayedAt)+' · '+dailyStatus[item.state]+(item.stage?' · '+item.stage:'')+(item.completed?' · Completada':'');
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
     if(item.state==='preparation-review'){
      const disclosure=document.createElement('details'),label=document.createElement('summary');
      disclosure.dataset.reviewKey=item.key;disclosure.open=openReviews.has(item.key);
      label.textContent='Ver datos conservados';disclosure.append(label);
      for(const [name,value] of Object.entries({'Tipificación':item.review.category,'Detalle':item.review.detail,
       'Contacto':item.review.phone,'Negociación':item.review.dealId,'Observaciones':item.review.observations,'Resumen':item.description})){
       if(!value)continue;
       const line=document.createElement('p');line.style.whiteSpace='pre-wrap';line.textContent=name+': '+value;disclosure.append(line);
      }
      const link=openDraftRoom(item);if(link)disclosure.append(link);
      if(!item.key.startsWith(fallbackKey+'-transfer-')){
       const recover=document.createElement('button');recover.type='button';recover.textContent='Recuperar caso';
       recover.onclick=event=>{if(event.isTrusted)recoverReview(item);};disclosure.append(recover);
      }
      const download=document.createElement('button');download.type='button';download.textContent='Descargar datos del caso';
      download.onclick=()=>{
       const url=URL.createObjectURL(new Blob([JSON.stringify(item,null,2)],{type:'application/json'}));
       const file=document.createElement('a');file.href=url;file.download='tipificacion-por-revisar-'+item.at+'.json';
       file.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      };
      disclosure.append(download);
      article.append(disclosure);
     }
     if(['prepared','verifying'].includes(item.state)){
      const link=openDraftRoom(item);
      if(link)article.append(link);
     }
     if(['confirmation','pending','failed','rejected','expired'].includes(item.state)){
      const action=document.createElement('button');
      action.type='button';
      action.textContent=item.state==='expired'?'Revalidar':item.state==='confirmation'?'Revisar y confirmar':item.state==='rejected'?'Revisar borrador':'Ver envío y reintento';
      action.onclick=()=>journal({focusKey:item.key});
      article.append(action);
     }
     section.append(article);
    }
    return section;
   });
   panelAtRequest.querySelector('[data-daily-rows]').replaceChildren(...sections);
   status.textContent='Registros de hoy y casos pendientes de revisión · hora de Colombia';
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
   const file=document.createElement('input');file.type='file';file.accept='.json,application/json';file.hidden=true;
   const importButton=document.createElement('button');importButton.textContent='Importar caso Por revisar';importButton.onclick=()=>file.click();
   const importStatus=document.createElement('p');importStatus.setAttribute('aria-live','polite');
   file.onchange=async()=>{
    if(!file.files.length)return;
    try{await importReview(file.files[0]);importStatus.textContent='Caso disponible en Por revisar.';await refreshDailyTasks();}
    catch(error){importStatus.textContent=error instanceof SyntaxError?'El archivo JSON es inválido.':error.message;}
    finally{file.value='';}
   };
   const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Cargando registros…';
   const rows=document.createElement('div');rows.setAttribute('data-daily-rows','');
   dailyPanel.append(title,close,refresh,importButton,file,importStatus,status,rows);document.body.append(dailyPanel);
   close.focus();refreshDailyTasks();
  };
  document.body.append(open);
 }
 async function refreshConfirmationQueue(force=false){
  if(queueChecking||!force&&Date.now()-lastQueueCheck<2000)return;
  queueChecking=true;lastQueueCheck=Date.now();
  try{
   const response=await send({action:'list'});
   if(!response.ok)return;
   const queue=response.data.items.filter(item=>confirmationStates.includes(item.state)&&!deliveryJobs.has(item.key));
   let button=document.getElementById('onoff-confirmation-count');
   if(!queue.length){button?.remove();return;}
   if(!button){
    button=document.createElement('button');button.id='onoff-confirmation-count';button.type='button';
    button.style='position:fixed;right:14px;top:14px;z-index:2147483647;max-width:calc(100vw - 28px);white-space:normal;overflow-wrap:anywhere;background:#811d2b;color:#fff;border:1px solid #ff8791;border-radius:8px;padding:10px 14px;cursor:pointer;font:600 14px system-ui';
    button.onclick=()=>journal();document.body.append(button);
   }
   button.textContent='Tipificaciones por confirmar ('+queue.length+')';
  }catch{}finally{queueChecking=false;}
 }
 function tick(){refreshConfirmationQueue();refreshDeliveryBars();processClosures();
  if(deferredConfirmation&&!closeDialog()){
   const {key}=deferredConfirmation;deferredConfirmation=null;
   if(!document.getElementById('onoff-task-history'))journal().catch(()=>{});
  }
  mountDailyTasks();
  if(dailyPanel?.isConnected&&Date.now()>=nextDailyRead)refreshDailyTasks();
  const currentDialog=closeDialog();if(currentDialog!==lastDialog||location.hash!==lastDialogRoom){if(!pending)resetPreparation();lastDialog=currentDialog;lastDialogRoom=location.hash;}


  window.ONOFFAdvisorValidation?.tick(currentDialog&&belongsToCurrentRoom(currentDialog)?currentDialog:null,()=>{if(!panel)return false;panel.querySelector('[data-finalreview]').checked=true;panel.querySelector('[data-duplicate]').checked=true;lastAutoPreparation='';return prepare();});
  if(!closeDialog()&&!recoveredConfirmations){recoveredConfirmations=true;send({action:'list'}).then(r=>{if(r.ok&&r.data.items.some(i=>confirmationStates.includes(i.state)))journal();}).catch(()=>{});}
  if(closeDialog()&&panel&&!armed&&!busy&&!pending&&pilot?.mode==='multi'&&panel.querySelector('[data-create-enable]').checked&&reviewed()){try{const p=snapshot();const signature=canonical(p);if(p.tcConfirmed&&p.reviewed&&(p.dealId||p.identityMode==='contact'&&p.contactConfirmed)&&lastAutoPreparation!==signature){if(autoCandidate!==signature){autoCandidate=signature;autoDue=Date.now()+1200;}else if(Date.now()>=autoDue){lastAutoPreparation=signature;prepare();}} }catch{}}

  if(location.hash==='#/home'&&Date.now()-lastPendingScan>5000){lastPendingScan=Date.now();send({action:'list'}).then(r=>{if(r.ok)window.__onoffHasPending=r.data.items.some(i=>['confirmation','pending','failed'].includes(i.state));}).catch(()=>{});}
  if(location.hash==='#/home'&&window.__onoffHasPending&&!document.getElementById('onoff-task-recovery')){const box=document.createElement('aside');box.id='onoff-task-recovery';box.style='position:fixed;right:18px;bottom:170px;z-index:2147483647;background:white;color:#123;padding:12px;border:1px solid #16834a;border-radius:8px';const button=document.createElement('button');button.textContent='Consultar tareas PRUEBA pendientes';button.onclick=journal;box.append(button);document.body.append(box);}else if(location.hash!=='#/home'||!window.__onoffHasPending)document.getElementById('onoff-task-recovery')?.remove();
  if(!panel){root=document.getElementById('onoff-ikono-auto-summary')?.shadowRoot;const box=root?.querySelector('[data-description]')?.closest('details');if(!box)return;
   panel=document.createElement('section');panel.innerHTML='<h4>Tarea PRUEBA desde extensión · 0.25.6</h4><p data-pilot-context>Piloto de una tarea. El radicado anterior se conserva intacto.</p><label><input type="checkbox" data-create-enable>Crear tarea PRUEBA al pulsar Resolver</label><label style="display:block"><input type="checkbox" data-finalreview>Revisé y corregí el resumen final de hoy para la TC seleccionada.</label><label style="display:block"><input type="checkbox" data-duplicate>La vista previa corresponde a esta atención; los radicados técnicos son referencias.</label><button data-prepare>Preparar vista previa</button><button data-resume>Consultar resultado pendiente</button><p data-create-status>Confirma TC, negociación y revisión: la vista previa se preparará sola. Al pulsar Resolver se crea la tarea PRUEBA.</p>';box.append(panel);panel.querySelector('[data-prepare]').onclick=prepare;panel.querySelector('[data-resume]').onclick=()=>commit({action:'resume'});loadPilot();
  }
  if(armed&&armed.expires<=Date.now()){armed=null;lastAutoPreparation='';autoCandidate='';window.ONOFFAdvisorValidation?.preparation('La preparación venció. Revalidando…');}
  if(armed){try{if(armed.signature!==canonical(snapshot())||!reviewed()){armed=null;tell('Cambio detectado. Se conserva tu borrador; revisa y prepara nuevamente.');}}catch{armed=null;}}
 }
 const gateStyle=document.createElement('style');gateStyle.textContent='button[data-onoff-blocked]{opacity:.55!important;cursor:wait!important;pointer-events:none!important}';document.head.append(gateStyle);
 setInterval(()=>{try{tick();}catch(e){window.ONOFFAdvisorValidation?.preparation('No se pudo actualizar la revisión: '+e.message);}finally{syncButton();}},500);
})();
