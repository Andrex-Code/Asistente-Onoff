const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync('tools/ikono-summary-preview/delivery.js','utf8');
function setup(fetchImpl){
 const self={};vm.runInNewContext(code,{self,fetch,AbortSignal,Date,Map,Error});
 const key='onoff-task-pilot-audit-1',stored={
  [key]:{intent:'signed-fixture',confirmed:true,evidence:{room:'#/room/fixture'},attempts:0}
 };
 const alarms=[];
 const chrome={storage:{local:{get:async k=>k===null?stored:{[k]:stored[k]},set:async obj=>Object.assign(stored,obj)}},alarms:{create:async(name,p)=>alarms.push(name),clear:async()=>{}}};
 const auth={scope:'audit',expires:Date.now()+60000,token:'fixture-pilot-token'};
 const delivery=self.createONOFFDelivery({chrome,fetchImpl,auth:()=>auth});
 return {key,stored,alarms,delivery};
}
test('definitive validation rejection stops all automatic retries and exposes correction',async()=>{
 const f=setup(async()=>({ok:false,status:409,json:async()=>({ok:false,code:'BITRIX_REJECTED',error:'Bitrix rechazó creación'})}));
 await assert.rejects(f.delivery.deliver(f.key,{manual:true}),/Bitrix rechazó/);
 assert.equal(f.stored[f.key].definitiveReject,true);
 assert.equal(f.stored[f.key].phase,'failed');
 assert.deepEqual(f.alarms,[]);
});
test('uncertain network failure retains the same signed attempt for reconciliation',async()=>{
 const f=setup(async()=>{throw Error('Network timeout');});
 await assert.rejects(f.delivery.deliver(f.key,{manual:true}),/Reintento automático/);
 assert.equal(f.stored[f.key].definitiveReject,false);
 assert.equal(f.stored[f.key].intent,'signed-fixture');
 assert.equal(f.stored[f.key].phase,'retry');
 assert.equal(f.alarms.length,1);
});
