const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('preparation is durably stored before arming and is not treated as closure evidence',async()=>{
 let listener;const stored={};const events=[];
 const chrome={runtime:{id:'fixture',onMessage:{addListener:f=>listener=f}},storage:{local:{get:async k=>k===null?stored:({[k]:stored[k]}),set:async o=>{events.push('stored');Object.assign(stored,o);}}}};
 vm.runInNewContext(fs.readFileSync('tools/ikono-summary-preview/task-background.js','utf8'),{importScripts(){},self:{ONOFF_TASK_PILOT:{token:'test-only',tc:'123',room:'#/room/test',scope:'fixture',expires:Date.now()+60000}},chrome,URL,Date,AbortSignal,crypto:require('node:crypto').webcrypto,TextEncoder,fetch:async()=>({ok:true,json:async()=>({ok:true,data:{intent:'signed-fixture'}})})});
 const r=await new Promise(resolve=>listener({type:'ONOFF_TASK_PILOT',action:'prepare',payload:{tc:'123',room:'#/room/test'}},{id:'fixture',tab:{id:1},url:'https://onoff.a.ikono.im/#/room/test'},v=>{events.push('armed');resolve(v);}));
 assert.equal(r.ok,true);assert.deepEqual(events,['stored','armed']);assert.equal(Object.values(stored)[0].intent,'signed-fixture');assert.equal(Object.values(stored)[0].evidence,undefined);
 const resume=await new Promise(resolve=>listener({type:'ONOFF_TASK_PILOT',action:'resume'},{id:'fixture',tab:{id:1},url:'https://onoff.a.ikono.im/#/home'},resolve));assert.equal(resume.ok,false);
});

