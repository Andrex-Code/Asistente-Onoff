importScripts('pilot-auth.js');
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.type!=='ONOFF_TASK_PILOT')return false;
 let url;try{url=new URL(sender.url);}catch{return false;}
 if(sender.id!==chrome.runtime.id||!sender.tab||!['https://onoff.a.ikono.im','https://onoff.s.ikono.im'].includes(url.origin))return false;
 (async()=>{
  const auth=self.ONOFF_TASK_PILOT;if(!auth||auth.expires<Date.now())throw Error('Piloto no configurado o vencido.');
  if(m.action==='info')return {tc:auth.tc,room:auth.room,expires:auth.expires,previousTaskId:auth.previousTaskId,mode:auth.mode};
  if(m.action==='list'){
   const all=await chrome.storage.local.get(null),items=[];
   for(const [key,v]of Object.entries(all)){if(!key.startsWith('onoff-task-pilot-'+auth.scope+'-'))continue;let p;try{p=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(v.intent.split('.')[0].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));}catch{p={};}
    items.push({key,tc:v.tc||p.tc||'Sin TC',room:v.room||p.room||'',state:v.result?'created':v.evidence?'pending':'prepared',taskId:v.result?.taskId,url:v.result?.url,stage:v.result?.stage,at:v.at||p.created||0});
   }return {items:items.sort((a,b)=>b.at-a.at)};
  }
  if(!['prepare','commit','resume'].includes(m.action))throw Error('Acción inválida.');
  const keyFor=async value=>'onoff-task-pilot-'+auth.scope+'-'+[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join('');let key;
  if(m.action==='resume'){const all=await chrome.storage.local.get(null);const candidates=Object.entries(all).filter(([k,v])=>k.startsWith('onoff-task-pilot-'+auth.scope+'-')&&v.evidence&&!v.result&&(!m.recordKey||k===m.recordKey));if(!candidates.length)throw Error('No hay tareas con cierre registrado pendientes. Consulta el historial de tareas PRUEBA.');if(candidates.length!==1)throw Error('Hay varios pendientes. Elige uno del historial.');const saved=candidates[0][1];m={...saved,action:'commit'};}
  if(m.action==='prepare'&&(m.payload?.room!==url.hash||auth.mode!=='multi'&&(m.payload?.room!==auth.room||m.payload?.tc!==auth.tc)))throw Error('Este piloto solo permite la TC y sala autorizadas.');
  if(m.action==='commit')key=await keyFor(m.intent);
  if(m.action==='commit')await chrome.storage.local.set({[key]:{...((await chrome.storage.local.get(key))[key]),intent:m.intent,evidence:m.evidence}});
  const r=await fetch('https://asistente-onoff.vercel.app/api/bitrix/search-task',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},body:JSON.stringify({pilotAction:m.action,payload:m.payload,intent:m.intent,evidence:m.evidence}),signal:AbortSignal.timeout(55000)});
  const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Servicio no disponible.');
  // Persist before telling the content script it is armed: iKono can unload the
  // entire room immediately after the human resolves it. No closure is inferred.
  if(m.action==='prepare'){
   key=await keyFor(data.data.intent);const previous=(await chrome.storage.local.get(key))[key];
   if(previous?.evidence||previous?.result)throw Error('Existe un cierre pendiente o una tarea registrada. Consulta el resultado antes de preparar otra.');
   await chrome.storage.local.set({[key]:{intent:data.data.intent,prepared:data.data,room:m.payload.room,tc:m.payload.tc,phase:'prepared',at:Date.now()}});
  }
  if(m.action==='commit')await chrome.storage.local.set({[key]:{...((await chrome.storage.local.get(key))[key]),result:data.data}});
  return data.data;
 })().then(data=>reply({ok:true,data}),e=>reply({ok:false,error:e.message||'Sin respuesta. Consulta el resultado antes de reintentar.'}));return true;
});

