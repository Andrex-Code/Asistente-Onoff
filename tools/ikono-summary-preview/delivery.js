// Durable retries always reuse the same signed intent. The server reserves task.add once.
self.createONOFFDelivery=function({chrome,fetchImpl=fetch,auth,now=()=>Date.now()}){
 const active=new Map(),delays=[60000,180000,600000],prefix='onoff-delivery|';
 const get=async key=>(await chrome.storage.local.get(key))[key];
 async function run(key,{manual=false}={}){
  const token=auth();if(!key.startsWith('onoff-task-pilot-'+token.scope+'-'))throw Error('Registro de otra sesión.');
  let v=await get(key);if(v?.result)return v.result;if(!v?.confirmed||!v.evidence||v.superseded)throw Error('Creación no confirmada.');
  if(!manual&&(v.attempts||0)>=4)throw Error('Reintentos agotados. Revisa la bandeja de fallos.');
  v={...v,attempts:(v.attempts||0)+1,phase:'sending',lastAttempt:now(),nextAt:null};await chrome.storage.local.set({[key]:v});
  try{
   if(token.expires<now())throw Error('Piloto vencido.');
   const r=await fetchImpl('https://asistente-onoff.vercel.app/api/bitrix/search-task',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token.token},body:JSON.stringify({pilotAction:'commit',intent:v.intent,evidence:v.evidence,confirmation:true}),signal:AbortSignal.timeout(55000)});
   const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'No se recibió confirmación del servidor.');
   await chrome.storage.local.set({[key]:{...v,result:d.data,phase:'created',lastError:'',nextAt:null}});try{await chrome.alarms?.clear(prefix+key);}catch{/* A stale alarm will see the saved result and never resend. */}return d.data;
  }catch(e){
   const fatal=/vencid|no autorizado|otra sesión|fuera del piloto|no se verificó|campo bloqueado|no coincide con el piloto/i.test(e.message);
   const retry=!fatal&&v.attempts<=delays.length;
   const saved={...v,phase:retry?'retry':'failed',lastError:String(e.message).slice(0,500),nextAt:retry?now()+delays[v.attempts-1]:null};await chrome.storage.local.set({[key]:saved});
   if(retry)await chrome.alarms?.create(prefix+key,{when:saved.nextAt});
   throw Error(saved.lastError+(retry?' Reintento automático programado.':' Envío conservado en la bandeja de fallos.'));
  }
 }
 const deliver=(key,options)=>{if(active.has(key))return active.get(key);const p=run(key,options).finally(()=>active.delete(key));active.set(key,p);return p;};
 async function restore(){const a=auth();for(const [key,v]of Object.entries(await chrome.storage.local.get(null)))if(key.startsWith('onoff-task-pilot-'+a.scope+'-')&&v.confirmed&&!v.result&&!v.superseded&&v.phase!=='failed'&&(v.attempts||0)<4)await chrome.alarms?.create(prefix+key,{when:Math.max(now()+1000,v.nextAt||now()+1000)});}
 return {deliver,restore,onAlarm:async alarm=>{if(alarm.name.startsWith(prefix))try{await deliver(alarm.name.slice(prefix.length));}catch{/* Failure and retry state already persisted. */}}};
};

