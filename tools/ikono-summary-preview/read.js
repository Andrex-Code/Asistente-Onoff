(() => {
 if(window.ONOFFIkonoRead)return;
 const routes=new Map([
  ['/api/bitrix/search-deal','crm'],
  ['/api/assistant-chat','summary']
 ]);
 async function guardedFetch(url,options={}){
  const route=routes.get(new URL(url).pathname);
  if(!route)throw Error('Consulta no autorizada.');
  // Browsers used in isolated fixtures may not expose a real extension ID.
  // In production never bypass the service worker even if it is unavailable.
  if(!window.chrome?.runtime?.id)return fetch(url,options);
  if(options.signal?.aborted)throw Object.assign(Error('Cancelado'),{name:'AbortError'});
  let body;try{body=JSON.parse(String(options.body||'{}'));}catch{throw Error('Solicitud inválida.');}
  const answer=await Promise.race([
   chrome.runtime.sendMessage({type:'ONOFF_IKONO_READ',route,payload:body}),
   new Promise((_,reject)=>{
    if(!options.signal)return;
    options.signal.addEventListener('abort',()=>reject(Object.assign(Error('Cancelado'),{name:'AbortError'})),{once:true});
   })
  ]);
  if(!answer||typeof answer.status!=='number')throw Error('Servicio de consulta no disponible.');
  return {ok:answer.status>=200&&answer.status<300,status:answer.status,json:async()=>answer.data||{ok:false,error:'Respuesta inválida.'}};
 }
 window.ONOFFIkonoRead={fetch:guardedFetch};
})();
