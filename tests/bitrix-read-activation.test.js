const test=require('node:test');
const assert=require('node:assert/strict');
const {createActivationService}=require('../lib/bitrix-read-activation');
function fixture(){
  const values=new Map();let clock=0,version=0;
  const service=createActivationService({now:()=>clock,storage:{
    async get(path){const v=values.get(path);return v?{statusCode:200,blob:{etag:v.etag},stream:new Blob([v.data]).stream()}:null;},
    async put(path,data,options){const previous=values.get(path);if(previous&&(!options.allowOverwrite||options.ifMatch!==previous.etag))throw Error('Conflict');values.set(path,{data,etag:String(++version)});}
  }});
  return {service,advance(ms){clock+=ms;}};
}
test('code activates one installation once under concurrency and revocation blocks its token',async()=>{
  const {service}=fixture();const {code,reference}=await service.issue();
  const secrets=['A'.repeat(43),'B'.repeat(43)];
  const result=await Promise.allSettled(secrets.map(secret=>service.activate(code,secret)));
  const winner=result.findIndex(r=>r.status==='fulfilled');
  assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(result[1-winner].reason.status,409);
  const {token}=result[winner].value;
  assert.equal(await service.authorized(token),true);
  assert.equal(await service.authorized('onoff1.'+reference+'.'+secrets[1-winner]),false);
  assert.deepEqual(await service.activate(code,secrets[winner]),{token});
  await service.revoke(reference);
  assert.equal(await service.authorized(token),false);
  await assert.rejects(service.activate(code,secrets[winner]),{status:400});
});
test('unused codes expire at 24 hours while activated access persists until revoked',async()=>{
  const {service,advance}=fixture();const active=await service.issue();const unused=await service.issue();
  const {token}=await service.activate(active.code,'A'.repeat(43));
  advance(24*60*60*1000);
  assert.equal(await service.authorized(token),true);
  await assert.rejects(service.activate(unused.code,'B'.repeat(43)),{status:410});
  await assert.rejects(service.activate('invalid','B'.repeat(43)),{status:400});
});
