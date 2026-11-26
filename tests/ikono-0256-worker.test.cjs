const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {webcrypto}=require('node:crypto');
const {resolve}=require('node:path');
const vm=require('node:vm');

test('recovery stages a single signed draft and does not send until a trusted confirmation',async()=>{
 const apiOrigin='https://asistente-onoff-fixture.vercel.app';
 const auth={scope:'fixture',mode:'multi',token:'fixture-only',expires:Date.now()+86400000,apiOrigin};
 const room='#/room/historical';
 const source='onoff-preparation-reviews-00000000-0000-0000-0000-000000000000';
 const store={[source]:{room,at:Date.now()-86400000,state:'preparation-review',description:'Resumen',
  review:{category:'CONTACTO',detail:'SALIENTE',attention:'attention'}}};
 const operations=[];
 const sender={id:'fixture-id',url:'https://onoff.a.ikono.im/'+room,tab:{id:1}};
 let listener;
 const load=file=>vm.runInContext(readFileSync(resolve('tools/ikono-summary-preview',file),'utf8'),context,{filename:file});
 const context=vm.createContext({
  AbortSignal,URL,TextEncoder,TextDecoder,atob,crypto:webcrypto,setTimeout,
  ONOFF_TASK_PILOT:auth,
  importScripts:(...files)=>files.filter(name=>name!=='pilot-auth.js').forEach(load),
  chrome:{
   runtime:{id:'fixture-id',getManifest:()=>({host_permissions:[apiOrigin+'/*']}),onMessage:{addListener:fn=>{listener=fn;}}},
   tabs:{get:async()=>({url:sender.url})},
   storage:{local:{get:async key=>key?{[key]:structuredClone(store[key])}:structuredClone(store),set:async values=>Object.assign(store,structuredClone(values))}}
  },
  fetch:async (url,options)=>{
   assert.equal(url,apiOrigin+'/api/bitrix/search-task');
   const body=JSON.parse(options.body);
   operations.push(body);
   assert.equal(options.headers.Authorization,'Bearer fixture-only');
   if(body.pilotAction==='prepare-recovery'){
    const signed={room,tc:'',review:{attention:'attention'},fields:{TITLE:'Contacto PRUEBA'},expires:Date.now()+60000};
    return Response.json({ok:true,data:{recovery:true,intent:Buffer.from(JSON.stringify(signed)).toString('base64url')+'.signature',expires:signed.expires}});
   }
   assert.equal(body.pilotAction,'commit');
   return Response.json({ok:true,data:{taskId:'900'}});
  }
 });
 context.self=context;
 load('task-background.js');
 const call=(message,from=sender)=>new Promise(resolve=>{
  const active=listener({type:'ONOFF_TASK_PILOT',...message},from,resolve);
  if(!active)resolve(null);
 });
 const request={action:'prepare-recovery',reviewKey:source,closureId:'original-closure',phone:'573001010101',description:'Resumen',reviewed:true};
 assert.equal(await call(request,{...sender,url:'https://example.test/'+room}),null);
 assert.equal((await call({...request,reviewed:false})).ok,false);
 assert.equal(operations.length,0);
 const first=await call(request);
 const second=await call(request);
 assert.equal(first.ok,true);
 assert.equal(first.data.recordKey,second.data.recordKey);
 assert.equal(store[source].state,'forwarded');
 assert.equal(store[first.data.recordKey].confirmed,false);
 assert.deepEqual(operations.map(op=>op.pilotAction),['prepare-recovery']);
 assert.equal((await call({action:'resume',recordKey:first.data.recordKey})).ok,false);
 const confirm={action:'confirm',recordKey:first.data.recordKey};
 const [sent,repeated]=await Promise.all([call(confirm),call(confirm)]);
 assert.equal(sent.data.taskId,'900');
 assert.equal(repeated.data.taskId,'900');
 assert.equal(operations.length,2);
 assert.equal(operations[1].intent,store[first.data.recordKey].intent);
 assert.equal(operations[1].evidence.after,'ADVISOR_RECOVERY');
});
