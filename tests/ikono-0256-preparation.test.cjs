const test=require('node:test');
const assert=require('node:assert/strict');
const createPreparation=require('../tools/ikono-summary-preview/preparation.js');
const reviews=require('../tools/ikono-summary-preview/preparation-review.js');
const auth={scope:'test',token:'fixture',expires:100000};
const payload={room:'#/room/outgoing',identityMode:'contact',phone:'573001010101',revision:'f'.repeat(64)};
const draft={intent:'signed',expires:60000};
const response=(status,data,headers)=>new Response(JSON.stringify(data),{status,headers});

test('shares a slow outgoing preparation, including a transient retry, and never calls commit',async()=>{
 let clock=0, finish;
 const calls=[];
 const prepare=createPreparation({now:()=>clock,pause:async ms=>{clock+=ms;},fetchImpl:async (_,options)=>{
  calls.push({body:options.body,header:options.headers.Authorization});
  if(calls.length===1)return new Promise(resolve=>{finish=resolve;});
  return response(200,{ok:true,data:draft});
 }});
 const first=prepare(auth,payload),second=prepare(auth,{...payload});
 assert.equal(first,second);
 clock=19000;
 finish(response(503,{ok:false},{'Retry-After':'2'}));
 assert.deepEqual(await second,draft);
 assert.equal(clock,21000);
 assert.equal(calls.length,2);
 assert.equal(calls[0].body,calls[1].body);
 assert.equal(JSON.parse(calls[0].body).pilotAction,'prepare');
 assert.equal(calls[1].header,'Bearer fixture');
});

test('does not retry validation, private authorization or a Retry-After past the deadline',async()=>{
 for(const [status,code,headers] of [[400,'BITRIX_REJECTED'],[401],[403],[429,null,{'Retry-After':'60'}]]){
  let calls=0;
  const prepare=createPreparation({now:()=>0,pause:async()=>assert.fail('Unexpected retry'),fetchImpl:async()=>{
   calls++;
   return response(status,{ok:false,error:'Rejected',code},headers);
  }});
  await assert.rejects(prepare(auth,payload),/Rejected/);
  assert.equal(calls,1);
 }
});

test('bounds repeated timeouts and checks expiry again before retry',async()=>{
 let clock=0,calls=0;
 const prepare=createPreparation({now:()=>clock,pause:async ms=>{clock+=ms;},fetchImpl:async()=>{
  calls++;clock+=25000;throw new DOMException('test','TimeoutError');
 }});
 await assert.rejects(prepare(auth,payload),/agotó/);
 assert.equal(calls,2);
 clock=0;calls=0;
 await assert.rejects(prepare({...auth,expires:26000},payload),/agotó/);
 assert.equal(calls,1);
});

test('preserves legacy drafts and requires the dated closure of the original attention',()=>{
 const at=Date.parse('2026-11-21T18:13:00Z');
 const original={at,state:'preparation-review',room:payload.room,key:'onoff-preparation-reviews-fixture',
  description:'Motivo: llamada\nGestión: revisión\nResultado: pendiente',
  review:{category:'SOPORTE',detail:'OUTBOUND',attention:'$joined',observations:'Registro legado'}};
 const item=reviews.normalize(original);
 assert.equal(item.description,original.description);
 assert.equal(item.review.observations,original.review.observations);
 assert.equal(item.tc,'');
 assert.equal(item.review.phone,'');
 const event={id:'$joined',joined:true},greeting={id:'$greeting',greeting:true};
 const closure={id:'$closed',closed:true,day:'2026-11-21'};
 assert.deepEqual(reviews.closure([event,greeting,closure],item),{closureId:'$closed',day:'2026-11-21'});
 for(const events of [[closure],[event,{...closure,day:null}],[event,{...closure,day:'2026-11-22'}],
  [event,{id:'$other',joined:true},closure],[event,greeting,{id:'$greeting2',greeting:true},closure]]){
  assert.equal(reviews.closure(events,item),null);
 }
 assert.throws(()=>reviews.normalize({...original,key:'onoff-preparation-reviews-transfer-fixture'}),/archivo/);
});
