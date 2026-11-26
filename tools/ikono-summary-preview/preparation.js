// Preparation only reads Bitrix and returns a signed draft. Commit has a separate queue.
function createONOFFPreparation({fetchImpl=fetch, now=Date.now, pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 const active=new Map();
 const retryStatuses=new Set([408,429,500,502,503,504]);
 const retryCodes=new Set(['BITRIX_TEMPORARY','QUERY_LIMIT_EXCEEDED','OPERATION_TIME_LIMIT']);
 const retryMessage=/^(?:The operation was aborted due to timeout|fetch failed|Bitrix: (?:408|429|5\d\d|Too many requests|Operation time limit exceeded|QUERY_LIMIT_EXCEEDED|OPERATION_TIME_LIMIT))\.?$/i;
 const endpoint='https://asistente-onoff.vercel.app/api/bitrix/search-task';

 function delayFromHeader(response){
  const value=response.headers.get('Retry-After');
  if(!value)return 750;
  const delay=/^\d+$/.test(value)?Number(value)*1000:Date.parse(value)-now();
  return Number.isFinite(delay)?Math.max(750,delay):750;
 }

 async function run(auth,payload,action){
  const body=JSON.stringify({pilotAction:action,payload});
  const deadline=now()+53000;
  for(let attempt=0;attempt<2;attempt++){
   if(auth.expires<=now())throw Error('Piloto no configurado o vencido.');
   let error, retry=false, delay=750;
   try{
    const response=await fetchImpl(endpoint,{
     method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.token},
     body,signal:AbortSignal.timeout(Math.min(25000,Math.max(1,deadline-now())))
    });
    const result=await response.json().catch(()=>null);
    if(response.ok&&result?.ok&&typeof result.data?.intent==='string'&&Number.isFinite(result.data.expires))return result.data;
    retry=retryStatuses.has(response.status)||response.status===400&&(retryCodes.has(result?.code)||retryMessage.test(result?.error||''));
    delay=delayFromHeader(response);
    error=Error(result?.error||(retry?'Bitrix no respondió temporalmente.':'No se recibió una preparación válida.'));
   }catch(cause){
    retry=cause?.name==='TimeoutError'||cause?.name==='AbortError'||cause instanceof TypeError;
    error=retry?Error('La consulta de preparación a Bitrix se interrumpió o agotó el tiempo de espera.'):cause;
   }
   if(!retry||attempt===1||now()+delay+1000>=Math.min(deadline,auth.expires))throw error;
   await pause(delay);
  }
 }

 return (auth,payload,action='prepare')=>{
  if(!['prepare','prepare-recovery'].includes(action))throw Error('Acción de preparación inválida.');
  const key=JSON.stringify([auth.scope,action,payload]);
  if(!active.has(key))active.set(key,run(auth,payload,action).finally(()=>active.delete(key)));
  return active.get(key);
 };
}
if(typeof module!=='undefined')module.exports=createONOFFPreparation;
