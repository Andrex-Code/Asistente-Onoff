/* Volatile, origin-separated hub. No CRM write methods. */
const onoffHubs=new Map();
const hubDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.type!=='ONOFF_CHAT_HUB'||sender.id!==chrome.runtime.id||!sender.tab?.id||sender.frameId!==0)return false;
 let url;try{const source=new URL(sender.url);url=new URL(m.roomURL||sender.tab.url||sender.url);if(url.origin!==source.origin)return false;}catch{return false;}
 if(url.protocol!=='https:'||!['onoff.a.ikono.im','onoff.s.ikono.im'].includes(url.hostname)||!/^#\/room\/[^?#]+$/.test(url.hash))return false;
 (async()=>{let hub=onoffHubs.get(url.origin);if(!hub||hub.day!==hubDay()){if(hub)for(const id of hub.workers.values())await chrome.tabs.remove(id).catch(()=>{});hub={day:hubDay(),rooms:new Map(),workers:new Map(),enabled:false,normal:new Map(),busy:false};onoffHubs.set(url.origin,hub);}
 const key=url.origin+'/'+url.hash,worker=url.searchParams.get('onoff_worker')==='1';
 if(!worker){const previous=hub.normal.get(sender.tab.id);if(previous!==key&&hub.priorityTab===sender.tab.id)hub.priority='';hub.normal.set(sender.tab.id,key);if(!hub.rooms.has(key))hub.rooms.set(key,{key,url:url.origin+'/'+url.hash,title:'Chat visitado'});if(m.enable===true)hub.enabled=false;if(m.enable===false){hub.enabled=false;for(const id of hub.workers.values())await chrome.tabs.remove(id).catch(()=>{});hub.workers.clear();}}
 if(hub.priority&&Date.now()-(hub.prioritySeen||0)>15000)hub.priority='';
 if(!worker&&m.snapshot){if(m.snapshot.closing===true){hub.priority=key;hub.priorityTab=sender.tab.id;hub.prioritySeen=Date.now();}else if(hub.priorityTab===sender.tab.id)hub.priority='';}
 const room=hub.rooms.get(key);if(room&&m.snapshot){const s=m.snapshot;room.title=String(s.title||room.title).slice(0,280);room.text=String(s.text||'').slice(0,16000);room.updatedAt=Number.isFinite(s.updatedAt)?Math.min(s.updatedAt,Date.now()):0;room.edited=s.edited===true;room.seenAt=Date.now();room.count=Number(s.count)||0;room.pending=s.pending===true;}
 if(hub.enabled&&!hub.busy){hub.busy=true;try{for(const [k,id] of hub.workers)if([...hub.normal.values()].includes(k)){hub.workers.delete(k);await chrome.tabs.remove(id).catch(()=>{});}for(const r of hub.rooms.values()){if(hub.workers.size>=4)break;if(hub.workers.has(r.key)||[...hub.normal.values()].includes(r.key))continue;const target=new URL(r.url);target.searchParams.set('onoff_worker','1');const tab=await chrome.tabs.create({url:target.href,active:false});if(!hub.enabled||[...hub.normal.values()].includes(r.key)){await chrome.tabs.remove(tab.id).catch(()=>{});continue;}hub.workers.set(r.key,tab.id);}}finally{hub.busy=false;}}
 return {blockedReason:'iKono admite una sola ventana de atención. Seguimiento auxiliar deshabilitado para no desconectarte.',priority:hub.priority||'',enabled:hub.enabled,rooms:[...hub.rooms.values()].map(r=>({...r,background:hub.workers.has(r.key)})),limit:4};
 })().then(reply,()=>reply({error:'Seguimiento no disponible. Reintenta desde el panel.'}));return true;
});
chrome.tabs.onRemoved.addListener(id=>{for(const hub of onoffHubs.values()){hub.normal.delete(id);if(hub.priorityTab===id)hub.priority='';for(const [k,tabId]of hub.workers)if(tabId===id)hub.workers.delete(k);}});
