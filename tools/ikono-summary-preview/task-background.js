importScripts('pilot-auth.js','delivery.js');
const delivery=self.createONOFFDelivery({chrome,fetchImpl:fetch,auth:()=>self.ONOFF_TASK_PILOT});
chrome.alarms?.onAlarm.addListener(delivery.onAlarm);
chrome.runtime.onStartup?.addListener(()=>delivery.restore().catch(()=>{}));
chrome.runtime.onInstalled?.addListener(()=>delivery.restore().catch(()=>{}));
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.type!=='ONOFF_TASK_PILOT')return false;
 let url;try{url=new URL(sender.url);}catch{return false;}
 if(sender.id!==chrome.runtime.id||!sender.tab||!['https://onoff.a.ikono.im','https://onoff.s.ikono.im'].includes(url.origin))return false;
 (async()=>{
  const auth=self.ONOFF_TASK_PILOT;if(!auth||auth.expires<Date.now())throw Error('Piloto no configurado o vencido.');
  if(m.action==='info')return {tc:auth.tc,room:auth.room,expires:auth.expires,previousTaskId:auth.previousTaskId,mode:auth.mode};
  if(m.action==='list'){
   const all=await chrome.storage.local.get(null),items=[];
   for(const [key,v]of Object.entries(all)){if(!key.startsWith('onoff-task-pilot-'+auth.scope+'-')||v.superseded)continue;let p;try{p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(v.intent.split('.')[0].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));}catch{p={};}
    const confirmationExpires=Math.min(p.expires||Infinity,v.evidence?.clickedAt?v.evidence.clickedAt+15*60000:Infinity);
    items.push({key,tc:v.tc||p.tc||'Sin TC',room:v.room||p.room||'',state:v.result?'created':v.phase==='failed'?'failed':v.evidence?(v.confirmed!==true?(confirmationExpires<Date.now()?'expired':'confirmation'):'pending'):'prepared',title:p.fields?.TITLE||'',description:p.fields?.DESCRIPTION||'',review:p.review,locked:{category:p.review?.category,detail:p.review?.detail},attempts:v.attempts||0,error:v.lastError||'',nextAt:v.nextAt,taskId:v.result?.taskId,url:v.result?.url,stage:v.result?.stage,completed:v.result?.completed===true,at:v.at||p.created||0});
   }return {items:items.sort((a,b)=>b.at-a.at)};
  }
  if(!['prepare','commit','resume','await-confirmation','confirm','amend'].includes(m.action))throw Error('Acción inválida.');
  const keyFor=async value=>'onoff-task-pilot-'+auth.scope+'-'+[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');let key;
  if(m.action==='amend'){
   const saved=(await chrome.storage.local.get(m.recordKey))[m.recordKey];if(!m.recordKey?.startsWith('onoff-task-pilot-'+auth.scope+'-')||!saved||saved.confirmed||saved.superseded)throw Error('El borrador no es editable después de confirmar el envío.');
   const r=await fetch('https://asistente-onoff.vercel.app/api/bitrix/search-task',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({pilotAction:'amend',intent:saved.intent,edits:m.edits}),signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'No se guardó el borrador.');
   key=await keyFor(d.data.intent);await chrome.storage.local.set({[key]:{...saved,intent:d.data.intent,tc:m.edits.tc||saved.tc,prepared:d.data}});if(key!==m.recordKey)await chrome.storage.local.set({[m.recordKey]:{...saved,superseded:key}});return d.data;
  }
  if(m.action==='await-confirmation'){key=await keyFor(m.intent);const saved=(await chrome.storage.local.get(key))[key];if(!saved||saved.intent!==m.intent)throw Error('No existe preparación guardada para este cierre.');if(saved.result)return saved.result;if(saved.confirmed===true)throw Error('Creación ya confirmada; consulta el resultado.');await chrome.storage.local.set({[key]:{...saved,evidence:m.evidence,confirmed:false,phase:'confirmation'}});return {awaitingConfirmation:true,key};}
  if(m.action==='confirm'){const saved=(await chrome.storage.local.get(m.recordKey))[m.recordKey];if(!m.recordKey?.startsWith('onoff-task-pilot-'+auth.scope+'-')||!saved?.evidence||saved.superseded)throw Error('Confirmación sin cierre vigente.');if(saved.result)return saved.result;if(saved.prepared?.dateReviewRequired&&m.dateReviewed!==true)throw Error('Confirma la fecha y atención del resumen.');if(saved.prepared?.expires&&saved.prepared.expires<Date.now()||saved.evidence?.clickedAt&&Date.now()-saved.evidence.clickedAt>15*60000)throw Error('Venció la preparación. Se conserva el borrador; requiere revisión, no se crea tarea.');await chrome.storage.local.set({[m.recordKey]:{...saved,confirmed:true,dateReviewed:m.dateReviewed===true}});m={...saved,action:'commit',confirmation:true};}
  if(m.action==='resume'){const all=await chrome.storage.local.get(null);const candidates=Object.entries(all).filter(([k,v])=>k.startsWith('onoff-task-pilot-'+auth.scope+'-')&&v.evidence&&v.confirmed===true&&!v.result&&(!m.recordKey||k===m.recordKey));if(!candidates.length)throw Error('No hay tareas confirmadas pendientes. Revisa el historial y confirma la creación si corresponde.');if(candidates.length!==1)throw Error('Hay varios pendientes. Elige uno del historial.');const saved=candidates[0][1];m={...saved,action:'commit',confirmation:saved.confirmed===true};}
  if(m.action==='prepare'&&(m.payload?.room!==url.hash||auth.mode!=='multi'&&(m.payload?.room!==auth.room||m.payload?.tc!==auth.tc)))throw Error('Este piloto solo permite la TC y sala autorizadas.');
  if(m.action==='commit'){key=await keyFor(m.intent);const saved=(await chrome.storage.local.get(key))[key];if(saved?.confirmed!==true&&m.confirmation!==true)throw Error('Confirma Crear tarea PRUEBA después del cierre.');}
  if(m.action==='commit')return delivery.deliver(key,{manual:true});
  const r=await fetch('https://asistente-onoff.vercel.app/api/bitrix/search-task',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({pilotAction:m.action,payload:m.payload,intent:m.intent,evidence:m.evidence,confirmation:m.confirmation===true}),signal:AbortSignal.timeout(55000)});
  const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Servicio no disponible.');
  // Persist before telling the content script it is armed: iKono can unload the
  // entire room immediately after the human resolves it. No closure is inferred.
  if(m.action==='prepare'){
   key=await keyFor(data.data.intent);const previous=(await chrome.storage.local.get(key))[key];
   if(previous?.evidence||previous?.result)throw Error('Existe un cierre pendiente o una tarea registrada. Consulta el resultado antes de preparar otra.');
   await chrome.storage.local.set({[key]:{intent:data.data.intent,prepared:data.data,room:m.payload.room,tc:m.payload.tc,phase:'prepared',at:Date.now()}});
  }
  return data.data;
 })().then(data=>reply({ok:true,data}),e=>reply({ok:false,error:e.message||'Sin respuesta. Consulta el resultado antes de reintentar.'}));return true;
});
