importScripts('pilot-auth.js','delivery.js','preparation.js','preparation-review.js');
const delivery=self.createONOFFDelivery({chrome,fetchImpl:fetch,auth:()=>self.ONOFF_TASK_PILOT});
const requestPreparation=createONOFFPreparation();
const preparationJobs=new Map();
// A suspended MV3 worker can restart without onStartup or onInstalled.
// Finish recovery before processing alarms/messages so it cannot overwrite a new send.
const deliveryReady=delivery.restore().then(()=>null,e=>e);
chrome.alarms?.onAlarm.addListener(async alarm=>{if(!await deliveryReady)await delivery.onAlarm(alarm);});
chrome.runtime.onStartup?.addListener(()=>deliveryReady);
chrome.runtime.onInstalled?.addListener(()=>deliveryReady);
const transferJobs=new Map();
const destination='MenuColaCarteraTiendas', transferCategory='CARTERA', transferDetail='DERIVACIÓN A CARTERA';
const digest=async input=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
const recordKey=(auth,intent)=>digest(intent).then(value=>'onoff-task-pilot-'+auth.scope+'-'+value);
function intentFields(intent){
 try{return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(intent.split('.')[0].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));}
 catch{return {};}
}
function prepareOnce(key,operation){
 if(!preparationJobs.has(key))preparationJobs.set(key,operation().finally(()=>preparationJobs.delete(key)));
 return preparationJobs.get(key);
}
async function currentRoom(sender,url){
 let current=url;
 try{
  if(chrome.tabs?.get)current=new URL((await chrome.tabs.get(sender.tab.id)).url);
  else if(sender.tab.url)current=new URL(sender.tab.url);
 }catch{throw Error('No se pudo verificar el chat actual. Revalida la preparación.');}
 if(current.origin!==url.origin||!/^#\/room\/[^?#]+$/.test(current.hash))throw Error('Abre la sala original en iKono para preparar la tarea.');
 return current.hash;
}
async function prepareRecovered(auth,message,room){
 const source=message.reviewKey;
 if(auth.mode!=='multi'||typeof source!=='string'||!/^onoff-preparation-reviews-(?:[a-f0-9-]{36}|import-[a-f0-9]{64})$/.test(source))
  throw Error('Caso de recuperación inválido.');
 const sourceRecord=(await chrome.storage.local.get(source))[source];
 if(!sourceRecord||sourceRecord.room!==room)throw Error('Abre la sala original en iKono antes de recuperar el caso.');
 const jobKey=JSON.stringify(['recovery',auth.scope,room,sourceRecord.review?.attention||source]);
 return prepareOnce(jobKey,async()=>{
  const history=await chrome.storage.local.get(null);
  const saved=history[source];
  if(!saved||saved.room!==room)throw Error('El caso cambió. Actualiza la lista.');
  if(saved.state==='forwarded')return {recordKey:saved.deliveryKey};
  const item=ONOFFPreparationReview.normalize(saved);
  const {category,detail,attention}=item.review;
  if(!attention||!message.closureId||message.reviewed!==true)throw Error('Verifica el cierre de la atención y confirma la revisión.');
  const other=Object.entries(history).find(([key,entry])=>key.startsWith('onoff-task-pilot-'+auth.scope+'-')&&
   entry?.room===room&&!entry.superseded&&entry.evidence&&intentFields(entry.intent).review?.attention===attention);
  if(other)throw Error('Ya hay una tipificación registrada o pendiente para esta atención. Consulta el historial.');
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(item.at);
  const tc=typeof message.tc==='string'?message.tc:'',phone=typeof message.phone==='string'?message.phone:'';
  const dealId=typeof message.dealId==='string'?message.dealId:'';
  const verifiedTc=/^\d{1,8}$/.test(tc)&&/^\d+$/.test(dealId);
  const verifiedContact=!tc&&!dealId&&/^\d{10,15}$/.test(phone);
  if(!verifiedTc&&!verifiedContact||item.tc&&item.tc!==tc)throw Error('Confirma la TC original y su negociación, o el teléfono de esta atención.');
  if(verifiedContact&&item.review.phone&&phone!==item.review.phone)throw Error('El teléfono debe coincidir con el caso guardado.');
  const payload={tc,phone,dealId,room,day,attention,category,detail,
   description:message.description,tcConfirmed:true,reviewed:true,duplicateAcknowledged:true,
   recovery:{closureId:message.closureId,caseAt:item.at},
   ...(verifiedContact?{identityMode:'contact',contactConfirmed:true}:{})};
  payload.revision=await digest(JSON.stringify(payload));
  const prepared=await requestPreparation(auth,payload,'prepare-recovery');
  if(prepared.recovery!==true)throw Error('El servicio privado no confirmó la recuperación.');
  const key=await recordKey(auth,prepared.intent);
  const existing=(await chrome.storage.local.get(key))[key];
  const evidence={room,revision:payload.revision,clickedAt:Date.now(),after:'ADVISOR_RECOVERY'};
  await chrome.storage.local.set({
   [source]:{...saved,state:'forwarded',deliveryKey:key},
   [key]:existing||{intent:prepared.intent,prepared,room,tc,evidence,at:item.at,confirmed:false,phase:'confirmation'}
  });
  return {recordKey:key};
 });
}
async function requestJson(path,body,auth,timeout){
 const response=await fetch('https://asistente-onoff.vercel.app/api/'+path,{method:'POST',
  headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth.token}:{})},
  body:JSON.stringify(body),signal:AbortSignal.timeout(timeout)});
 const result=await response.json();
 if(!response.ok||!result.ok)throw Error(result.error||'El servicio no respondió correctamente.');
 return result;
}
async function transferToCartera(auth,t){
 if(t?.destination!==destination||!/^#\/room\/[^\s?#]{3,250}$/.test(t.room||'')||
  !/^\d{4}-\d{2}-\d{2}$/.test(t.day||'')||!Number.isFinite(t.clickedAt)||Math.abs(Date.now()-t.clickedAt)>30000)
  throw Error('Solicitud de derivación inválida.');
 const scope=await digest(JSON.stringify([auth.scope,t.room,t.day,t.attention||'',destination]));
 const reviewKey='onoff-preparation-reviews-transfer-'+scope;
 if(transferJobs.has(reviewKey))return transferJobs.get(reviewKey);
 const job=(async()=>{
  const existing=(await chrome.storage.local.get(reviewKey))[reviewKey];
  if(existing?.deliveryKey){
   const current=(await chrome.storage.local.get(existing.deliveryKey))[existing.deliveryKey];
   return current?.result||{deliveryKey:existing.deliveryKey};
  }
  if(existing)return {reviewRequired:true,error:existing.error};
  const tc=/^\d{1,8}$/.test(t.tc||'')?t.tc:'';
  const phone=/^\d{10,15}$/.test(t.phone||'')?t.phone:'';
  const entry={key:reviewKey,room:t.room,tc,at:t.clickedAt,state:'preparation-review',
   title:(tc?'TC'+tc:phone?'Contacto '+phone:'Identidad pendiente')+' · '+transferDetail,
   error:'Preparación de la derivación interrumpida o en curso.',description:String(t.summary||'').slice(0,12000),
   review:{category:transferCategory,detail:transferDetail,phone,attention:t.attention||''}};
  await chrome.storage.local.set({[reviewKey]:entry});
  let deliveryKey;
  try{
   if(auth.expires<Date.now()||auth.mode!=='multi')throw Error('Piloto no habilitado o vencido.');
   if(t.problem)throw Error(String(t.problem).slice(0,300));
   if(!tc&&!phone)throw Error('No se encontró TC ni número de contacto verificable.');
   const messages=t.conversation;
   if(!t.attention||!t.captureEvidence||!Array.isArray(messages)||!messages.length||messages.length>250||
    messages.some(m=>typeof m?.text!=='string'||!m.text.trim()||m.text.length>4000)||
    messages.reduce((total,m)=>total+m.text.length,0)>48000)throw Error('No hay textos verificables de esta atención para resumir.');
   const [dealResult,summaryResult]=await Promise.all([
    tc?requestJson('bitrix/search-deal',{tc},auth,20000):null,
    entry.description?null:requestJson('assistant-chat',{mode:'attention_summary_test',question:'Resume la atención capturada antes de derivarla a Cartera Tiendas.',conversation:messages,history:[]},null,32000)
   ]);
   const deals=(dealResult?.deals||[]).filter(deal=>String(deal.tc)===tc&&/^\d+$/.test(String(deal.id))&&deal.company?.id);
   if(tc&&deals.length!==1)throw Error('La TC de la derivación no tiene una negociación única con compañía.');
   const answer=(entry.description||summaryResult?.answer||'').trim();
   const parts=answer.replace(/\*\*/g,'').match(/(?:Motivo|Consulta)\s*:\s*([\s\S]+?)(?:Gesti[óo]n|Revisi[óo]n)\s*:\s*([\s\S]+?)(?:Resultado|Estado)\s*:/i);
   if(!parts?.[1].trim()||!parts?.[2].trim())throw Error('El resumen de la derivación no contiene Motivo y Gestión verificables.');
   entry.description='Motivo: '+parts[1].trim()+'\nGestión: '+parts[2].trim()+'\nResultado: Atención derivada a Cartera Tiendas.';
   const payload={tc,phone,room:t.room,day:t.day,attention:t.attention,captureEvidence:t.captureEvidence,
    transfer:{destination,clickedAt:t.clickedAt},category:transferCategory,detail:transferDetail,description:entry.description,
    dealId:tc?String(deals[0].id):'',tcConfirmed:true,reviewed:true,duplicateAcknowledged:true,
    ...(!tc?{identityMode:'contact',contactConfirmed:true}:{})};
   payload.revision=await digest(JSON.stringify(payload));
   const prepared=await requestPreparation(auth,payload);
   deliveryKey=await recordKey(auth,prepared.intent);
   const saved=(await chrome.storage.local.get(deliveryKey))[deliveryKey];
   const {clickedAt}=t;
   const evidence={room:t.room,revision:payload.revision,clickedAt,after:'ADVISOR_TRANSFER_CARTERA'};
   await chrome.storage.local.set({
    [reviewKey]:{state:'forwarded',deliveryKey},
    [deliveryKey]:saved||{intent:prepared.intent,prepared,room:t.room,tc,evidence,at:clickedAt,confirmed:true,phase:'queued'}
   });
  }catch(error){
   entry.error=error.message;
   await chrome.storage.local.set({[reviewKey]:entry});
   return {reviewRequired:true,error:entry.error};
  }
  try{return await delivery.deliver(deliveryKey,{manual:true});}
  catch(error){return {deliveryKey,error:error.message};}
 })().finally(()=>transferJobs.delete(reviewKey));
 transferJobs.set(reviewKey,job);
 return job;
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.type!=='ONOFF_TASK_PILOT')return false;
 let url;try{url=new URL(sender.url);}catch{return false;}
 if(sender.id!==chrome.runtime.id||!sender.tab||!['https://onoff.a.ikono.im','https://onoff.s.ikono.im'].includes(url.origin))return false;
 (async()=>{
  const recoveryError=await deliveryReady;const auth=self.ONOFF_TASK_PILOT;if(!auth)throw Error('Piloto no configurado.');
  if(m.action==='transfer-and-send')return transferToCartera(auth,m.transfer);
  // History stays readable after expiry; creation and retries remain gated below.
  if(m.action!=='list'&&auth.expires<Date.now())throw Error('Piloto no configurado o vencido.');
  if(recoveryError&&m.action!=='list')throw Error('No se pudo recuperar la cola: '+recoveryError.message);
  if(m.action==='lookup-phone'){
    const phone=typeof m.phone==='string'?m.phone:'';
    if(!/^\d{10,15}$/.test(phone))throw Error('Teléfono inválido.');
    const r=await fetch('https://asistente-onoff.vercel.app/api/bitrix/search-deal',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({action:'lookup-phone',phone}),signal:AbortSignal.timeout(28000)});
    const data=await r.json().catch(()=>null);
    if(!r.ok||!data?.ok)throw Error('No se pudo buscar por teléfono en Bitrix. Intenta nuevamente.');
    return {deals:data.deals||[],truncated:data.truncated===true};
  }
  if(m.action==='lookup'){const tc=String(m.tc||'').trim();if(!/^(?:TC\s*[-:]?\s*)?\d{1,8}(?:-1-1|-C)?$/i.test(tc))throw Error('TC inválida.');const response=await fetch('https://asistente-onoff.vercel.app/api/bitrix/search-deal',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({tc}),signal:AbortSignal.timeout(30000)});const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'No se pudo consultar la TC.');return {deals:data.deals||[]};}
  if(m.action==='info')return {tc:auth.tc,room:auth.room,expires:auth.expires,previousTaskId:auth.previousTaskId,mode:auth.mode};
  if(m.action==='recover-closures'){
   const all=await chrome.storage.local.get(null);
   return Object.entries(all).filter(([key,v])=>key.startsWith('onoff-task-pilot-'+auth.scope+'-')&&
    !v.evidence&&!v.result&&!v.superseded&&v.closeRequest?.tabId===sender.tab.id&&
    Date.now()-v.closeRequest.clickedAt<15*60000).map(([,v])=>({
     intent:v.intent,room:v.room,...v.closeRequest,preview:{title:v.prepared.title}
    }));
  }
  if(m.action==='list'){
   const all=await chrome.storage.local.get(null),items=[];
   for(const [key,v]of Object.entries(all)){if(!key.startsWith('onoff-task-pilot-'+auth.scope+'-')||v.superseded)continue;const p=intentFields(v.intent);
    const confirmationExpires=Math.min(p.expires||Infinity,!p.closureEvidence&&v.evidence?.clickedAt?v.evidence.clickedAt+15*60000:Infinity);
    items.push({key,tc:v.tc||p.tc||'Sin TC',room:v.room||p.room||'',state:v.result?'created':v.rejected===true?'rejected':v.phase==='failed'?'failed':v.evidence?(v.confirmed!==true?(confirmationExpires<Date.now()?'expired':'confirmation'):'pending'):v.closeRequest&&Date.now()-v.closeRequest.clickedAt<15*60000?'verifying':'prepared',title:p.fields?.TITLE||'',description:p.fields?.DESCRIPTION||'',review:p.review,closureCertified:!!p.closureEvidence,rejected:v.rejected===true,locked:{category:p.review?.category,detail:p.review?.detail},attempts:v.attempts||0,error:v.lastError||'',nextAt:v.nextAt,taskId:v.result?.taskId,url:v.result?.url,stage:v.result?.stage,completed:v.result?.completed===true,resultAt:v.resultAt,lastAttempt:v.lastAttempt,closedAt:v.evidence?.clickedAt,at:v.at||p.created||0});
   }return {items:items.sort((a,b)=>b.at-a.at)};
  }
  if(!['prepare','prepare-recovery','commit','resume','record-close','resolve-and-send','renew','await-confirmation','confirm','amend'].includes(m.action))throw Error('Acción inválida.');
  const keyFor=value=>recordKey(auth,value);let key;
  if(m.action==='prepare-recovery')return prepareRecovered(auth,m,await currentRoom(sender,url));
  if(m.action==='renew'){
   const previousKey=m.recordKey;
   const saved=(await chrome.storage.local.get(previousKey))[previousKey];
   if(!previousKey?.startsWith('onoff-task-pilot-'+auth.scope+'-')||!saved?.evidence||saved.confirmed||saved.result||saved.superseded)
    throw Error('La tipificación ya cambió. Actualiza la cola.');
   const response=await fetch('https://asistente-onoff.vercel.app/api/bitrix/search-task',{method:'POST',
    headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},
    body:JSON.stringify({pilotAction:'renew',intent:saved.intent,evidence:saved.evidence}),signal:AbortSignal.timeout(30000)});
   const data=await response.json();
   if(!response.ok||!data.ok)throw Error(data.error||'No se pudo revalidar la tipificación.');
   const nextKey=await keyFor(data.data.intent);
   const current=(await chrome.storage.local.get(previousKey))[previousKey];
   if(!current||current.superseded||current.confirmed||current.result)throw Error('La tipificación ya cambió. Actualiza la cola.');
   const next={...current,intent:data.data.intent,prepared:{...current.prepared,...data.data}};
   await chrome.storage.local.set(nextKey===previousKey?{[nextKey]:next}:{[nextKey]:next,[previousKey]:{...current,superseded:nextKey}});
   return {key:nextKey};
  }
  if(m.action==='amend'){
   const saved=(await chrome.storage.local.get(m.recordKey))[m.recordKey];if(!m.recordKey?.startsWith('onoff-task-pilot-'+auth.scope+'-')||!saved||saved.confirmed&&!saved.rejected||saved.superseded)throw Error('El borrador no es editable después de confirmar el envío.');
   const r=await fetch('https://asistente-onoff.vercel.app/api/bitrix/search-task',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({pilotAction:'amend',intent:saved.intent,edits:m.edits}),signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'No se guardó el borrador.');
   key=await keyFor(d.data.intent);await chrome.storage.local.set({[key]:{...saved,intent:d.data.intent,tc:m.edits.tc||saved.tc,prepared:d.data,confirmed:false,rejected:false,phase:saved.evidence?'confirmation':'prepared',attempts:0,lastError:'',nextAt:null}});if(key!==m.recordKey)await chrome.storage.local.set({[m.recordKey]:{...saved,superseded:key}});return d.data;
  }
  if(m.action==='record-close'||m.action==='resolve-and-send'){
   key=await keyFor(m.intent);
   return prepareOnce(m.action+'|'+key,async()=>{
   const saved=(await chrome.storage.local.get(key))[key], request=m.request;
   const direct=m.action==='resolve-and-send';
   if(direct&&saved?.result)return saved.result;
   if(direct&&saved?.confirmed&&saved.evidence?.after==='ADVISOR_RESOLVE')return delivery.deliver(key,{manual:true});
   if(!saved||saved.superseded||saved.evidence||saved.result||saved.room!==request?.room||
    saved.prepared.expires<Date.now()||!direct&&!['Pendiente','En seguimiento'].includes(request.before)||
    !Number.isFinite(request.clickedAt)||Math.abs(Date.now()-request.clickedAt)>30000||
    !/^[a-f0-9]{64}$/.test(request.revision)||!direct&&(typeof request.label!=='string'||request.label.length>1024))
    throw Error('No se pudo registrar la solicitud de cierre.');
   if(direct){
    const {room,revision,clickedAt}=request;
    const evidence={room,revision,clickedAt,after:'ADVISOR_RESOLVE'};
    await chrome.storage.local.set({[key]:{...saved,evidence,confirmed:true,phase:'queued'}});
    return delivery.deliver(key,{manual:true});
   }
   if(!saved.closeRequest){
    const {label,before,clickedAt,revision}=request;
    await chrome.storage.local.set({[key]:{...saved,closeRequest:{label,before,clickedAt,revision,tabId:sender.tab.id}}});
   }
   return {key};
   });
  }
  if(m.action==='await-confirmation'){key=await keyFor(m.intent);const saved=(await chrome.storage.local.get(key))[key];if(!saved||saved.intent!==m.intent)throw Error('No existe preparación guardada para este cierre.');if(saved.result)return saved.result;if(saved.confirmed===true)throw Error('Creación ya confirmada; consulta el resultado.');await chrome.storage.local.set({[key]:{...saved,evidence:m.evidence,confirmed:false,phase:'confirmation'}});return {awaitingConfirmation:true,key};}
  if(m.action==='confirm'){
   const key=m.recordKey;
   if(typeof key!=='string'||!key.startsWith('onoff-task-pilot-'+auth.scope+'-'))throw Error('Confirmación sin cierre vigente.');
   return prepareOnce('confirm|'+key,async()=>{
    const saved=(await chrome.storage.local.get(key))[key];
    if(!saved?.evidence||saved.superseded)throw Error('Confirmación sin cierre vigente.');
    if(saved.result)return saved.result;
    if(saved.confirmed)return delivery.deliver(key,{manual:true});
    if(saved.prepared?.expires<Date.now()||!saved.prepared?.closureCertified&&saved.evidence?.clickedAt&&Date.now()-saved.evidence.clickedAt>15*60000)
     throw Error('Venció la preparación. Revalida el borrador antes de confirmar.');
    await chrome.storage.local.set({[key]:{...saved,confirmed:true,dateReviewed:m.dateReviewed===true}});
    return delivery.deliver(key,{manual:true});
   });
  }
  if(m.action==='resume'){const all=await chrome.storage.local.get(null);const candidates=Object.entries(all).filter(([k,v])=>k.startsWith('onoff-task-pilot-'+auth.scope+'-')&&v.evidence&&v.confirmed===true&&!v.result&&(!m.recordKey||k===m.recordKey));if(!candidates.length)throw Error('No hay tareas confirmadas pendientes. Revisa el historial y confirma la creación si corresponde.');if(candidates.length!==1)throw Error('Hay varios pendientes. Elige uno del historial.');const saved=candidates[0][1];m={...saved,action:'commit',confirmation:saved.confirmed===true};}
  if(m.action==='prepare'){
   // MessageSender.url may retain the document's original SPA route. Read the
   // current tab URL instead, while retaining origin and capability boundaries.
   if(m.payload?.room!==await currentRoom(sender,url))throw Error('El chat cambió durante la preparación. Vuelve a abrir Resolver en el chat que vas a cerrar.');
   if(auth.mode!=='multi'&&(m.payload?.room!==auth.room||m.payload?.tc!==auth.tc))throw Error('Esta instalación conserva un piloto de una sola TC. Actualiza el paquete autorizado para varias conversaciones.');
   return prepareOnce(JSON.stringify([auth.scope,m.payload]),async()=>{
    const prepared=await requestPreparation(auth,m.payload);
    const preparedKey=await keyFor(prepared.intent);
    const previous=(await chrome.storage.local.get(preparedKey))[preparedKey];
    if(previous?.evidence||previous?.result)throw Error('Existe un cierre pendiente o una tarea registrada. Consulta el resultado antes de preparar otra.');
    // Persist the signed draft before the advisor can close the room.
    await chrome.storage.local.set({[preparedKey]:{intent:prepared.intent,prepared,room:m.payload.room,tc:m.payload.tc,phase:'prepared',at:Date.now()}});
    return {...prepared,recordKey:preparedKey};
   });
  }
  if(m.action==='commit'){key=await keyFor(m.intent);const saved=(await chrome.storage.local.get(key))[key];if(saved?.confirmed!==true&&m.confirmation!==true)throw Error('Confirma Crear tarea PRUEBA después del cierre.');}
  if(m.action==='commit')return delivery.deliver(key,{manual:true});
  throw Error('Acción inválida.');
 })().then(data=>reply({ok:true,data}),e=>reply({ok:false,error:e.message||'Sin respuesta. Consulta el resultado antes de reintentar.'}));return true;
});
