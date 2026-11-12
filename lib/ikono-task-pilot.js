const crypto = require('node:crypto');
function config(req) {
 const c=JSON.parse(process.env.IKONO_TASK_PILOT||'{}');
 const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
 const actual=crypto.createHash('sha256').update(token).digest('hex');
 if(!c.tokenHash||actual.length!==c.tokenHash.length||!crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(c.tokenHash))||Date.now()>c.expires)throw Error('Piloto no autorizado o vencido.');
 return c;
}
async function call(method,params={}) {
 const base=String(process.env.BITRIX_WEBHOOK_URL||'').replace(/\/+$/,'')+'/';
 if(!base.startsWith('https://'))throw Error('Bitrix no configurado.');
 const response=await fetch(base+method+'.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(18000)});
 const data=await response.json();if(!response.ok||data.error)throw Error('Bitrix: '+(data.error_description||data.error||response.status));return data.result;
}
async function inspect(c) {
 const [template,fields,stages,example,deal,tasks]=await Promise.all([
 call('tasks.template.get',{templateId:477,select:['*','UF_*']}),call('tasks.task.getFields'),call('task.stages.get',{entityId:53}),
 call('tasks.task.get',{taskId:c.exampleTaskId,select:['*','UF_*']}),call('crm.deal.get',{id:c.dealId}),
 call('tasks.task.list',{filter:{GROUP_ID:53,'%TITLE':'TC'+c.tc},select:['ID','TITLE','STATUS','XML_ID'],order:{ID:'DESC'}})
 ]);
 return {template,fields,stages,example,deal,tasks};
}
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function seal(value){const body=Buffer.from(JSON.stringify(value)).toString('base64url');return body+'.'+crypto.createHmac('sha256',process.env.AUTH_SECRET||process.env.BITRIX_WEBHOOK_URL).update(body).digest('base64url');}
function unseal(token){const [body,mac]=String(token||'').split('.');const valid=seal(JSON.parse(Buffer.from(body||'','base64url').toString())).split('.')[1];if(!mac||valid.length!==mac.length||!crypto.timingSafeEqual(Buffer.from(valid),Buffer.from(mac)))throw Error('Preparación inválida.');return JSON.parse(Buffer.from(body,'base64url').toString());}
function ids(value){if(Array.isArray(value)&&value.every(x=>/^\d+$/.test(String(x))))return value.map(String);if(typeof value==='string'&&/^a:\d+:\{/.test(value)){const found=[...value.matchAll(/(?:s:\d+:"(\d+)"|i:(\d+));(?=i:\d+;|\})/g)].map(m=>m[1]||m[2]);if(found.length===Number(value.match(/^a:(\d+):/)[1]))return found;}throw Error('Equipo de plantilla no interpretable.');}
function unwrap(value,key){return value?.[key]||value;}
function get(obj,key){return Object.entries(obj||{}).find(([k])=>k.replace(/_/g,'').toLowerCase()===key.replace(/_/g,'').toLowerCase())?.[1];}
function createService({bitrix=call,storage=require('@vercel/blob'),now=()=>Date.now()}={}){
 async function read(path){const r=await storage.get(path,{access:'private',useCache:false});if(!r||r.statusCode===404)return null;if(r.statusCode!==200||!r.stream)throw Error('No se pudo verificar el registro de creación.');return JSON.parse(await new Response(r.stream).text());}
 async function save(path,value,first=false){return storage.put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:!first,contentType:'application/json'});}
 async function prepare(c,p){
  const parentScope=c.scope;
  if(c.mode==='multi'){
   if(!/^\d{1,8}$/.test(String(p.tc))||!/^\d+$/.test(String(p.dealId))||!/^#\/room\/[^\s]{3,250}$/.test(p.room||''))throw Error('TC, sala o negociación inválidas.');
   const deal=await bitrix('crm.deal.get',{id:p.dealId});
   if(!/^\d+$/.test(String(deal.COMPANY_ID)))throw Error('Compañía pendiente.');
   c={...c,tc:String(p.tc),room:p.room,dealId:String(p.dealId),companyId:String(deal.COMPANY_ID),previousTaskId:'',scope:hash([parentScope,p.room,p.day,String(p.tc)])};
  }
  if(String(p.tc)!==c.tc||p.room!==c.room||String(p.dealId)!==c.dealId||p.tcConfirmed!==true||p.reviewed!==true||p.duplicateAcknowledged!==true)throw Error('Confirma TC, negociación, resumen, cobertura y tarea PRUEBA separada.');
  if(!/^\d{4}-\d\d-\d\d$/.test(p.day)||p.day!==new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now())))throw Error('Revisa el día de atención.');
  for(const k of ['category','detail','description','phone','revision'])if(typeof p[k]!=='string'||!p[k].trim()||p[k].length>(k==='description'?12000:500))throw Error('Campo pendiente: '+k);
  if(!/^\d{10,15}$/.test(p.phone)||!/^\w{10,100}$/.test(p.revision))throw Error('Teléfono o revisión inválidos.');
  const [tr,fr,sr,deal]=await Promise.all([bitrix('tasks.template.get',{templateId:477,select:['*','UF_*']}),bitrix('tasks.task.getFields'),bitrix('task.stages.get',{entityId:53}),bitrix('crm.deal.get',{id:c.dealId})]);
  const t=unwrap(tr,'template'),fields=unwrap(fr,'fields'),stages=unwrap(sr,'stages');
  if(String(get(t,'GROUP_ID'))!=='53'||String(get(t,'RESPONSIBLE_ID'))!=='931952'||String(deal.COMPANY_ID)!==c.companyId||String(deal[process.env.BITRIX_TC_FIELD||'UF_CRM_1642606760058'])!==c.tc)throw Error('La plantilla o asociación de TC cambió; revisar.');
  const stage=Object.values(stages).filter(x=>String(x.TITLE||x.title).trim().toLowerCase()==='finalizadas solicitud');if(stage.length!==1)throw Error('Etapa destino no identificada de forma única.');
  const mapping=c.fields;if(!mapping)throw Error('Campos personalizados pendientes de verificar.');
  for(const key of Object.values(mapping))if(!get(fields,key))throw Error('Campo personalizado no disponible: '+key);
  const f={TITLE:`TC${c.tc} - TIPIFICACIÓN - ${p.detail.toUpperCase()}`,DESCRIPTION:`PRUEBA — TIPIFICACIÓN DESDE EXTENSIÓN ONOFF\n\n${p.description.trim()}\n\nTC${c.tc} · Día Colombia: ${p.day}\nTipificación: ${p.category.toUpperCase()}\nDetalle: ${p.detail.toUpperCase()}\niKono: https://onoff.a.ikono.im/${c.room}\nRadicado previo relacionado: ${c.previousTaskId}. Esta tarea registra la atención; no reemplaza el escalamiento.`,CREATED_BY:c.actor,RESPONSIBLE_ID:get(t,'RESPONSIBLE_ID'),GROUP_ID:53,ACCOMPLICES:ids(get(t,'ACCOMPLICES')),AUDITORS:ids(get(t,'AUDITORS')),UF_CRM_TASK:['D_'+c.dealId,'CO_'+c.companyId],XML_ID:'ONOFF_PRUEBA_'+c.scope,REPLICATE:'N'};
  // Preserve template custom values (priority/product), then apply the verified iKono mapping.
  for(const [k,v] of Object.entries(t))if(/^UF_/.test(k)&&get(fields,k)&&!['UF_CRM_TASK','UF_TASK_WEBDAV_FILES'].includes(k)&&v!==undefined&&v!==null)f[k]=v;
  for(const k of ['PRIORITY','ALLOW_CHANGE_DEADLINE','ALLOW_TIME_TRACKING','TASK_CONTROL','ADD_IN_REPORT','MATCH_WORK_TIME'])if(t[k]!=null)f[k]=t[k];
  f[mapping.category]=p.category.toUpperCase();f[mapping.detail]=p.detail.toUpperCase();f[mapping.phone]='iKono ('+p.phone+')';f[mapping.tc]=c.tc;
  if(!c.previousTaskId)f.DESCRIPTION=f.DESCRIPTION.replace(/\nRadicado previo relacionado:[\s\S]*$/,'\nEsta tarea registra la tipificación; los radicados técnicos mencionados en el resumen se conservan como referencias.');
  const prepared={parentScope,pilot:{scope:c.scope,tc:c.tc,room:c.room},scope:c.scope,tc:c.tc,room:c.room,revision:p.revision,fields:f,stageId:String(stage[0].ID||stage[0].id),created:now(),expires:Math.min(c.expires,now()+30*60000)};
  return {intent:seal(prepared),title:f.TITLE,responsibleId:String(f.RESPONSIBLE_ID),participants:f.ACCOMPLICES,stage:'Finalizadas Solicitud',expires:prepared.expires};
 }
 async function commit(c,body){
  const p=unseal(body.intent);if(c.mode==='multi'){if(p.parentScope!==c.scope||p.fields.CREATED_BY!==c.actor)throw Error('Sesión diferente.');c={...c,...p.pilot};}if(p.scope!==c.scope||p.tc!==c.tc||p.room!==c.room)throw Error('Preparación fuera del piloto.');
  const path='onoff/task-pilot/'+c.scope+'.json';let journal=await read(path);
  if(!journal){
   const e=body.evidence;const accepted=e?.after==='Resuelto'||c.allowUiHandoff===true&&e?.after==='ON_RATING_HANDOFF'&&e.handoff===true;if(p.expires<now()||!e||e.room!==p.room||e.revision!==p.revision||e.before!=='En seguimiento'&&e.before!=='Pendiente'||!accepted||!Number.isFinite(e.clickedAt)||e.clickedAt<p.created||e.clickedAt>now()||now()-e.clickedAt>15*60000)throw Error('No se verificó un cierre reciente de esta atención. No se crea tarea.');
   journal={phase:'reserved',fingerprint:hash(p),xmlId:p.fields.XML_ID,at:now()};
   try{await save(path,journal,true);}catch{journal=await read(path);if(!journal)throw Error('No se pudo reservar la creación. No se envió a Bitrix.');return recover(c,p,path,journal);}
   // No automatic retry of task.add: a network timeout may already have created the task.
   let result;try{result=await bitrix('tasks.task.add',{fields:p.fields});}catch{throw Error('Creación sin respuesta confirmada. Usa Consultar resultado; no vuelvas a crear manualmente.');}
   const id=String(get(unwrap(result,'task'),'id')||'');if(!/^\d+$/.test(id))throw Error('Bitrix no confirmó el número de tarea. Consulta el resultado antes de reintentar.');
   journal={...journal,phase:'created',taskId:id};await save(path,journal);
  }
  return recover(c,p,path,journal);
 }
 async function recover(c,p,path,journal){
  if(journal.fingerprint!==hash(p))throw Error('Este piloto ya fue reservado para otra revisión.');
  if(!journal.taskId){const r=await bitrix('tasks.task.list',{filter:{XML_ID:p.fields.XML_ID},select:['ID','XML_ID','GROUP_ID']});const list=unwrap(r,'tasks');const exact=(Array.isArray(list)?list:[]).filter(x=>get(x,'xmlId')===p.fields.XML_ID);if(exact.length!==1)throw Error('Resultado incierto: no se repetirá la creación. Requiere verificación del radicado.');journal={...journal,taskId:String(get(exact[0],'id')),phase:'created'};await save(path,journal);}
  const task=unwrap(await bitrix('tasks.task.get',{taskId:journal.taskId,select:['*','UF_*']}),'task');if(String(get(task,'xmlId'))!==p.fields.XML_ID||String(get(task,'groupId'))!=='53')throw Error('Tarea recuperada no coincide con el piloto.');
  if(String(get(task,'stageId'))!==p.stageId){await bitrix('task.stages.movetask',{id:journal.taskId,stageId:p.stageId});const verify=unwrap(await bitrix('tasks.task.get',{taskId:journal.taskId,select:['ID','STAGE_ID','XML_ID','GROUP_ID']}),'task');if(String(get(verify,'stageId'))!==p.stageId)throw Error('Tarea '+journal.taskId+' creada; etapa aún pendiente. Consultar resultado no crea otra.');}
  journal={...journal,phase:'staged'};await save(path,journal);return {taskId:journal.taskId,stage:'Finalizadas Solicitud',url:'https://onoff.bitrix24.es/workgroups/group/53/tasks/task/view/'+journal.taskId+'/'};
 }
 return {prepare,commit};
}
module.exports={config,call,inspect,createService,ids,seal,unseal};

