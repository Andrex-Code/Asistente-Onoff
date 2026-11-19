const conversationLabel=phone=>phone?'iKono ('+phone+')':'iKono (sin teléfono visible)';
function formatDescription(summary,phone){
 const clean=String(summary||'').replace(/\r\n/g,'\n').replace(/\*\*/g,'').replace(/\[\/?b\]/gi,'').replace(/^\s*TIPIFICACI[ÓO]N DEL CHAT\s*[:;]?\s*/i,'').trim();
 const organized=clean.replace(/(?:^|\s+)(Motivo|Gesti[óo]n|Resultado)\s*:/gi,(_,label)=>'\n\n'+label+':').trim();
 const escaped=organized.replace(/\[/g,'［').replace(/\]/g,'］').replace(/^(Motivo|Gesti[óo]n|Resultado):/gim,(_,label)=>'[b]'+(label.toLowerCase().startsWith('gest')?'Gestión':label[0].toUpperCase()+label.slice(1).toLowerCase())+':[/b]');
 return 'PRUEBA — TIPIFICACIÓN DESDE EXTENSIÓN ONOFF\n\n[b]TIPIFICACIÓN DEL CHAT[/b]\n\n'+escaped+'\n\n[b]Conversación: '+conversationLabel(phone)+'[/b]';
}
const crypto = require('node:crypto');
const {exactTcRecords,normalizeTc}=require('./bitrix-tc');
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
 const data=await response.json();if(!response.ok||data.error){const error=Error('Bitrix: '+(data.error_description||data.error||response.status));if(data.error&&response.status<500){error.code='BITRIX_REJECTED';error.bitrixCode=data.error;}throw error;}return data.result;
}
async function inspect(c,taskId) {
 if(taskId&&!/^\d+$/.test(String(taskId)))throw Error('Radicado inválido.');
 const [template,fields,stages,example,deal,tasks]=await Promise.all([
 call('tasks.template.get',{templateId:477,select:['*','UF_*']}),call('tasks.task.getFields'),call('task.stages.get',{entityId:53}),
 call('tasks.task.get',{taskId:taskId||c.exampleTaskId,select:['*','UF_*','XML_ID','GROUP_ID']}),call('crm.deal.get',{id:c.dealId}),
 call('tasks.task.list',{filter:{GROUP_ID:53,'%TITLE':'TC'+c.tc},select:['ID','TITLE','STATUS','XML_ID'],order:{ID:'DESC'}})
 ]);
 return {template,fields,stages,example,deal,tasks};
}
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
// This portal truncates task XML_ID to 50 characters. Normalize legacy pilot
// IDs as well, so a created task can be recovered without a second task.add.
const xmlId=x=>String(x||'').slice(0,50);
function seal(value){const body=Buffer.from(JSON.stringify(value)).toString('base64url');return body+'.'+crypto.createHmac('sha256',process.env.AUTH_SECRET||process.env.BITRIX_WEBHOOK_URL).update(body).digest('base64url');}
function unseal(token){const [body,mac]=String(token||'').split('.');const valid=seal(JSON.parse(Buffer.from(body||'','base64url').toString())).split('.')[1];if(!mac||valid.length!==mac.length||!crypto.timingSafeEqual(Buffer.from(valid),Buffer.from(mac)))throw Error('Preparación inválida.');return JSON.parse(Buffer.from(body,'base64url').toString());}
function ids(value){if(Array.isArray(value)&&value.every(x=>/^\d+$/.test(String(x))))return value.map(String);if(typeof value==='string'&&/^a:\d+:\{/.test(value)){const found=[...value.matchAll(/(?:s:\d+:"(\d+)"|i:(\d+));(?=i:\d+;|\})/g)].map(m=>m[1]||m[2]);if(found.length===Number(value.match(/^a:(\d+):/)[1]))return found;}throw Error('Equipo de plantilla no interpretable.');}
function unwrap(value,key){return value?.[key]||value;}
function get(obj,key){return Object.entries(obj||{}).find(([k])=>k.replace(/_/g,'').toLowerCase()===key.replace(/_/g,'').toLowerCase())?.[1];}
function createService({bitrix=call,storage=require('@vercel/blob'),now=()=>Date.now()}={}){
 async function read(path){const r=await storage.get(path,{access:'private',useCache:false});if(!r||r.statusCode===404)return null;if(r.statusCode!==200||!r.stream)throw Error('No se pudo verificar el registro de creación.');const value=JSON.parse(await new Response(r.stream).text());Object.defineProperty(value,'_etag',{value:r.etag,enumerable:false});return value;}
 async function save(path,value,first=false,ifMatch){return storage.put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:!first,...(ifMatch?{ifMatch}:{}),contentType:'application/json'});}
 const transferDestination='MenuColaCarteraTiendas';
 const transferScope=p=>p.transfer?[transferDestination]:[];
 const colombiaDay=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));
 async function prepare(c,p){
  p={...p,tc:normalizeTc(p.tc)};const contact=p.identityMode==='contact';if(contact&&(c.mode!=='multi'||p.contactConfirmed!==true||p.tc||p.dealId||!/^\d{10,15}$/.test(p.phone||'')))throw Error('Confirma explícitamente la atención sin TC y su teléfono.');const parentScope=c.scope;let verifiedDeal;
  if(p.transfer!==undefined){
   if(c.mode!=='multi'||p.transfer?.destination!==transferDestination||p.category!=='CARTERA'||p.detail!=='DERIVACIÓN A CARTERA'||
    !Number.isFinite(p.transfer.clickedAt)||p.transfer.clickedAt>now()+60000||now()-p.transfer.clickedAt>5*60000||
    colombiaDay(p.transfer.clickedAt)!==p.day||!p.attention||!p.captureEvidence)
    throw Error('Derivación a Cartera inválida.');
  }
  const dateReviewRequired=p.captureEvidence?.mode==='active-contact-boundary';if(p.captureEvidence&&(!['verified-day','active-contact-boundary'].includes(p.captureEvidence.mode)||dateReviewRequired&&p.captureEvidence.boundary!==p.attention))throw Error('Alcance de captura inválido.');
  if(p.attention!==undefined&&(typeof p.attention!=='string'||!/^[-$A-Za-z0-9_:]{1,200}$/.test(p.attention)))throw Error('Atención no identificada.');
  if(c.mode==='multi'&&contact){if(!/^#\/room\/[^\s]{3,250}$/.test(p.room||''))throw Error('Sala inválida.');c={...c,tc:'',room:p.room,dealId:'',companyId:'',previousTaskId:'',identityMode:'contact',phone:p.phone,scope:hash([parentScope,p.room,p.day,'contact',p.phone,...(p.attention?[p.attention]:[]),...transferScope(p)])};}
  if(c.mode==='multi'&&!contact){
   if(!/^\d{1,8}$/.test(String(p.tc))||!/^\d+$/.test(String(p.dealId))||!/^#\/room\/[^\s]{3,250}$/.test(p.room||''))throw Error('TC, sala o negociación inválidas.');
   const deal=await bitrix('crm.deal.get',{id:p.dealId});verifiedDeal=deal;
   if(!/^\d+$/.test(String(deal.COMPANY_ID)))throw Error('Compañía pendiente.');
   c={...c,tc:String(p.tc),room:p.room,dealId:String(p.dealId),companyId:String(deal.COMPANY_ID),previousTaskId:'',scope:hash([parentScope,p.room,p.day,String(p.tc),...(p.attention?[p.attention]:[]),...transferScope(p)])};
  }
  if(String(p.tc)!==c.tc||p.room!==c.room||String(p.dealId)!==c.dealId||p.tcConfirmed!==true||p.reviewed!==true||p.duplicateAcknowledged!==true)throw Error('Confirma TC, negociación, resumen, cobertura y tarea PRUEBA separada.');
  if(!/^\d{4}-\d\d-\d\d$/.test(p.day)||p.day!==new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now())))throw Error('Revisa el día de atención.');
  for(const k of ['category','detail','description','revision'])if(typeof p[k]!=='string'||!p[k].trim()||p[k].length>(k==='description'?12000:500))throw Error('Campo pendiente: '+k);
  if((p.phone!=null&&p.phone!==''&&(typeof p.phone!=='string'||!/^\d{10,15}$/.test(p.phone)))||!/^\w{10,100}$/.test(p.revision))throw Error('Teléfono o revisión inválidos.');
  const [tr,fr,sr,deal]=await Promise.all([bitrix('tasks.template.get',{templateId:477,select:['*','UF_*']}),bitrix('tasks.task.getFields'),bitrix('task.stages.get',{entityId:53}),contact?null:verifiedDeal||bitrix('crm.deal.get',{id:c.dealId})]);
  const t=unwrap(tr,'template'),fields=unwrap(fr,'fields'),stages=unwrap(sr,'stages');
  if(String(get(t,'GROUP_ID'))!=='53'||String(get(t,'RESPONSIBLE_ID'))!=='931952')throw Error('La plantilla PRIMER CONTACTO cambió de proyecto o responsable; revisar.');
  if(!contact&&String(deal.COMPANY_ID).trim()!==c.companyId)throw Error('La compañía de la negociación cambió; revisa la TC.');
  if(!contact&&!exactTcRecords([deal],String(process.env.BITRIX_TC_FIELD||'UF_CRM_1642606760058').trim(),c.tc).length)throw Error('La TC de la negociación no coincide exactamente; revisa la asociación.');
  const stage=Object.values(stages).filter(x=>String(x.TITLE||x.title).trim().toLowerCase()==='finalizadas solicitud');if(stage.length!==1)throw Error('Etapa destino no identificada de forma única.');
  const mapping=c.fields;if(!mapping)throw Error('Campos personalizados pendientes de verificar.');
  for(const key of Object.values(mapping))if(!get(fields,key))throw Error('Campo personalizado no disponible: '+key);
  const f={TITLE:`${contact?'CONTACTO '+p.phone:'TC'+c.tc} - TIPIFICACIÓN - ${p.detail.toUpperCase()}`,DESCRIPTION:formatDescription(p.description,p.phone),CREATED_BY:c.actor,RESPONSIBLE_ID:get(t,'RESPONSIBLE_ID'),GROUP_ID:53,ACCOMPLICES:ids(get(t,'ACCOMPLICES')),AUDITORS:ids(get(t,'AUDITORS')),UF_CRM_TASK:['D_'+c.dealId,'CO_'+c.companyId],XML_ID:'ONOFF_PRUEBA_'+c.scope,REPLICATE:'N'};
  // Preserve template custom values (priority/product), then apply the verified iKono mapping.
  for(const [k,v] of Object.entries(t))if(/^UF_/.test(k)&&get(fields,k)&&!['UF_CRM_TASK','UF_TASK_WEBDAV_FILES'].includes(k)&&v!==undefined&&v!==null)f[k]=v;
  for(const k of ['PRIORITY','ALLOW_CHANGE_DEADLINE','ALLOW_TIME_TRACKING','TASK_CONTROL','ADD_IN_REPORT','MATCH_WORK_TIME'])if(t[k]!=null)f[k]=t[k];
  f[mapping.category]=p.category.toUpperCase();f[mapping.detail]=p.detail.toUpperCase();f[mapping.phone]=conversationLabel(p.phone);f[mapping.tc]=c.tc;if(contact){delete f[mapping.tc];delete f.UF_CRM_TASK;}
  f.XML_ID=xmlId(f.XML_ID);
  const prepared={completeRequired:true,...(p.transfer?{transfer:{destination:transferDestination,clickedAt:p.transfer.clickedAt}}:{}),parentScope,pilot:{scope:c.scope,tc:c.tc,room:c.room,...(contact?{identityMode:'contact',phone:p.phone}:{})},scope:c.scope,tc:c.tc,room:c.room,revision:p.revision,review:{identityMode:contact?'contact':'tc',dateReviewRequired,attention:p.attention||'',description:p.description,category:p.category,detail:p.detail,phone:p.phone,day:p.day,dealId:c.dealId,companyId:c.companyId,product:f.UF_AUTO_318886244876||'',priority:f.UF_AUTO_733814752720||''},fields:f,stageId:String(stage[0].ID||stage[0].id),created:now(),expires:Math.min(c.expires,now()+30*60000)};
  return {dateReviewRequired,intent:seal(prepared),title:f.TITLE,responsibleId:String(f.RESPONSIBLE_ID),participants:f.ACCOMPLICES,stage:'Finalizadas Solicitud',expires:prepared.expires};
 }
 function validateClosure(c,p,e){
  const direct=e?.after==='ADVISOR_RESOLVE';
  const transferred=!!p.transfer;
  const accepted=transferred?e?.after==='ADVISOR_TRANSFER_CARTERA'&&e.clickedAt===p.transfer.clickedAt:
   direct||e?.after==='Resuelto'||c.allowUiHandoff===true&&e?.after==='ON_RATING_HANDOFF'&&e.handoff===true;
  const certified=p.closureEvidence&&p.closureEvidence===hash(e);
  const clockTolerance=direct||transferred?60_000:0;
  if(!e||!accepted||e.room!==p.room||e.revision!==p.revision||!direct&&!transferred&&!['Pendiente','En seguimiento'].includes(e.before)||
   !Number.isFinite(e.clickedAt)||!transferred&&e.clickedAt<p.created-clockTolerance||
   !certified&&(p.expires<now()||now()-e.clickedAt>15*60000))throw Error('No se verificó el cierre de esta atención.');
  if(e.clickedAt>now()+clockTolerance){
   const error=Error('No se verificó el cierre de esta atención: la hora del clic está adelantada.');
   if(e.after==='ADVISOR_RESOLVE'&&e.clickedAt<=now()+120_000)error.code='RESOLVE_CLOCK_AHEAD';
   throw error;
  }
 }
 async function renew(c,body){
  const p=unseal(body.intent);
  if(p.parentScope!==c.scope||p.fields.CREATED_BY!==c.actor)throw Error('Borrador de otra sesión.');
  validateClosure(c,p,body.evidence);
  if(await read('onoff/task-pilot/'+p.scope+'.json'))throw Error('Ya se intentó enviar esta tipificación. Consulta su resultado.');
  p.closureEvidence=hash(body.evidence);
  p.expires=Math.min(c.expires,now()+30*60000);
  return {intent:seal(p),title:p.fields.TITLE,expires:p.expires,closureCertified:true};
 }
 async function commit(c,body){
  const p=unseal(body.intent);if(c.mode==='multi'){if(p.parentScope!==c.scope||p.fields.CREATED_BY!==c.actor)throw Error('Sesión diferente.');c={...c,...p.pilot};}if(p.scope!==c.scope||p.tc!==c.tc||p.room!==c.room)throw Error('Preparación fuera del piloto.');
  const path='onoff/task-pilot/'+c.scope+'.json';let journal=await read(path);
  let repairTag;const repairing=journal?.phase==='rejected';if(repairing){if(p.repairOf&&p.repairOf!==journal.fingerprint)throw Error('La revisión rechazada cambió.');if(!p.repairOf&&journal.fingerprint!==hash(p))throw Error('Revisión distinta de la rechazada.');const result=unwrap(await bitrix('tasks.task.list',{filter:{XML_ID:xmlId(p.fields.XML_ID)},select:['ID','XML_ID','GROUP_ID']}),'tasks');if(!Array.isArray(result)||result.some(x=>String(get(x,'xmlId'))===xmlId(p.fields.XML_ID)))throw Error('Existe un resultado para este envío; requiere verificación antes de corregir.');if(!journal._etag)throw Error('No se pudo reservar una corrección segura; requiere revisión.');repairTag=journal._etag;}
  if(!journal||repairing){
   if(c.requireConfirmation===true&&body.confirmation!==true)throw Error('El asesor debe confirmar Crear tarea PRUEBA después de resolver.');
   const e=body.evidence;
   if(p.expires<now())throw Error('La preparación venció.');
   validateClosure(c,p,e);
   if(p.review?.dateReviewRequired){const dayOf=t=>Number.isFinite(t)?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t)):'';if(!p.review.attention||dayOf(p.created)!==p.review.day||dayOf(e.clickedAt)!==p.review.day)throw Error('No se pudo validar internamente el día y alcance de la atención. Requiere revisión.');}
   journal={phase:'reserved',fingerprint:hash(p),xmlId:p.fields.XML_ID,at:now()};
   try{await save(path,journal,!repairing,repairTag);}catch{journal=await read(path);if(!journal)throw Error('No se pudo reservar la creación. No se envió a Bitrix.');return recover(c,p,path,journal);}
   // No automatic retry of task.add: a network timeout may already have created the task.
   let result;try{result=await bitrix('tasks.task.add',{fields:p.fields});}catch(error){if(error.code==='BITRIX_REJECTED'){await save(path,{...journal,phase:'rejected',rejection:String(error.message).slice(0,500)});const rejected=Error('Bitrix rechazó la creación sin generar tarea. Corrige el borrador o revisa permisos: '+error.message);rejected.code='BITRIX_REJECTED';throw rejected;}throw Error('Creación sin respuesta confirmada. Usa Consultar resultado; no vuelvas a crear manualmente.');}
   const id=String(get(unwrap(result,'task'),'id')||'');if(!/^\d+$/.test(id))throw Error('Bitrix no confirmó el número de tarea. Consulta el resultado antes de reintentar.');
   journal={...journal,phase:'created',taskId:id};await save(path,journal);
  }
  return recover(c,p,path,journal);
 }
 async function recover(c,p,path,journal){
  if(journal.fingerprint!==hash(p))throw Error('Este piloto ya fue reservado para otra revisión.');
  if(!journal.taskId){const r=await bitrix('tasks.task.list',{filter:{XML_ID:xmlId(p.fields.XML_ID)},select:['ID','XML_ID','GROUP_ID']});const list=unwrap(r,'tasks');const exact=(Array.isArray(list)?list:[]).filter(x=>String(get(x,'xmlId'))===xmlId(p.fields.XML_ID));if(exact.length!==1)throw Error('Resultado incierto: no se repetirá la creación. Requiere verificación del radicado.');journal={...journal,taskId:String(get(exact[0],'id')),phase:'created'};await save(path,journal);}
  let task=unwrap(await bitrix('tasks.task.get',{taskId:journal.taskId,select:['*','UF_*','XML_ID','GROUP_ID']}),'task');if(String(get(task,'xmlId'))!==xmlId(p.fields.XML_ID)||String(get(task,'groupId'))!=='53')throw Error('Tarea recuperada no coincide con el piloto.');
  if(String(get(task,'stageId'))!==p.stageId){await bitrix('task.stages.movetask',{id:journal.taskId,stageId:p.stageId});const verify=unwrap(await bitrix('tasks.task.get',{taskId:journal.taskId,select:['ID','STATUS','STAGE_ID','XML_ID','GROUP_ID']}),'task');task=verify;if(String(get(verify,'stageId'))!==p.stageId)throw Error('Tarea '+journal.taskId+' creada; etapa aún pendiente. Consultar resultado no crea otra.');}
  journal={...journal,phase:'staged'};await save(path,journal);
  if(p.completeRequired===true){
   if(String(get(task,'status'))==='4')throw Error('Tarea '+journal.taskId+' pendiente de aprobación; estado Completada aún sin verificar. No se aprueba automáticamente.');
   if(String(get(task,'status'))!=='5'){try{await bitrix('tasks.task.complete',{taskId:journal.taskId});}catch{throw Error('Tarea '+journal.taskId+' en Finalizadas Solicitud; completar aún sin confirmar. Se recuperará el mismo radicado.');}}
   const final=unwrap(await bitrix('tasks.task.get',{taskId:journal.taskId,select:['ID','STATUS','STAGE_ID','XML_ID','GROUP_ID']}),'task');
   if(String(get(final,'xmlId'))!==xmlId(p.fields.XML_ID)||String(get(final,'groupId'))!=='53'||String(get(final,'stageId'))!==p.stageId||String(get(final,'status'))!=='5')throw Error('Tarea '+journal.taskId+' creada; falta verificar etapa Finalizadas Solicitud y estado Completada. No se crea otra tarea.');
   journal={...journal,phase:'completed'};await save(path,journal);
  }
  return {taskId:journal.taskId,stage:'Finalizadas Solicitud',...(p.completeRequired?{completed:true,status:'Completada'}:{}),url:'https://onoff.bitrix24.es/workgroups/group/53/tasks/task/view/'+journal.taskId+'/'};
 }
 async function amend(c,body){
  const p=unseal(body.intent);if(p.expires<now()||p.parentScope!==c.scope||p.fields.CREATED_BY!==c.actor)throw Error('Borrador vencido o de otra sesión.');
  const prior=await read('onoff/task-pilot/'+p.scope+'.json');if(prior&&prior.phase!=='rejected')throw Error('Ya se intentó enviar este borrador. Recupera el resultado antes de editar.');
  const edits=body.edits||{},allowed=['description','title','product','priority','tc','dealId','phone','scopeReviewed'];
  if(Object.keys(edits).some(k=>!allowed.includes(k)))throw Error('Campo bloqueado: tipificación, detalle, responsable y equipo no son editables.');
  if(!p.review)throw Error('Borrador antiguo: requiere nueva preparación para editar.');
  const next=structuredClone(p),review=next.review;if(prior?.phase==='rejected')next.repairOf=prior.fingerprint;
  for(const key of ['description','title','product','priority','phone'])if(edits[key]!==undefined){if(typeof edits[key]!=='string'||!edits[key].trim()||edits[key].length>(key==='description'?12000:250))throw Error('Valor inválido: '+key);}
  if(edits.phone!==undefined&&!/^\d{10,15}$/.test(edits.phone))throw Error('Teléfono inválido.');
  const contact=p.review.identityMode==='contact';if(contact&&['tc','dealId','phone'].some(k=>edits[k]!==undefined))throw Error('La identidad de contacto sin TC no es editable; prepara otra atención para cambiarla.');
  const tc=normalizeTc(edits.tc??p.tc),dealId=String(edits.dealId??review.dealId);
  if(c.mode!=='multi'&&(tc!==c.tc||dealId!==c.dealId))throw Error('El piloto no permite cambiar de TC.');
  if(!contact&&(!/^\d{1,8}$/.test(tc)||!/^\d+$/.test(dealId)))throw Error('TC o negociación inválidas.');
  if(tc!==p.tc||dealId!==review.dealId){
   if(edits.scopeReviewed!==true)throw Error('Reconfirma el alcance del resumen para la TC y negociación elegidas.');
   const d=await bitrix('crm.deal.get',{id:dealId});if(!exactTcRecords([d],String(process.env.BITRIX_TC_FIELD||'UF_CRM_1642606760058').trim(),tc).length||!/^\d+$/.test(String(d.COMPANY_ID)))throw Error('La negociación no corresponde a la TC.');
   next.tc=tc;next.scope=hash([p.parentScope,p.room,review.day,tc,...(review.attention?[review.attention]:[]),...transferScope(p)]);next.pilot={...p.pilot,tc,scope:next.scope};review.dealId=dealId;review.companyId=String(d.COMPANY_ID);next.fields.UF_CRM_TASK=['D_'+dealId,'CO_'+d.COMPANY_ID];next.fields[c.fields.tc]=tc;next.fields.XML_ID=xmlId('ONOFF_PRUEBA_'+next.scope);
   if(await read('onoff/task-pilot/'+next.scope+'.json'))throw Error('Ya existe un envío para esa sala/día/TC.');
  }
  if(edits.description!==undefined)review.description=edits.description;
  if(edits.phone!==undefined){review.phone=edits.phone;next.fields[c.fields.phone]='iKono ('+review.phone+')';}
  if(edits.product!==undefined){review.product=edits.product;next.fields.UF_AUTO_318886244876=edits.product;}
  if(edits.priority!==undefined){review.priority=edits.priority;next.fields.UF_AUTO_733814752720=edits.priority;}
  next.fields.TITLE=edits.title||(tc===p.tc?p.fields.TITLE:`TC${tc} - TIPIFICACIÓN - ${review.detail.toUpperCase()}`);
  if(!next.fields.TITLE.toUpperCase().startsWith((contact?'CONTACTO '+review.phone:'TC'+tc)+' - TIPIFICACIÓN - '))throw Error('El título debe conservar TC'+tc+' - TIPIFICACIÓN - .');
  next.fields.DESCRIPTION=formatDescription(review.description,review.phone);
  // Closure identity remains the immutable pre-click snapshot, even if the draft is edited.
  return {dateReviewRequired:next.review?.dateReviewRequired===true,intent:seal(next),title:next.fields.TITLE,expires:next.expires,closureCertified:!!next.closureEvidence};
 }
 return {prepare,commit,amend,renew};
}
module.exports={formatDescription,config,call,inspect,createService,ids,seal,unseal};
