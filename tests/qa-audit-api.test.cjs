const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const {requireReadAccess}=require('../lib/read-access');

function response(){
 const headers={};return {headers,code:0,body:null,setHeader(k,v){headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;},end(){return this;}};
}
function request(token,method='POST',origin='https://other.example'){
 return {method,headers:{origin,...(token?{authorization:'Bearer '+token}:{})},body:{taskId:'505942'}};
}
test('missing/invalid bearer and hostile CORS never authorize read API',()=>{
 process.env.ONOFF_READ_TOKEN_HASH=sha('valid_test_access_token_123456789');
 delete process.env.IKONO_TASK_PILOT;
 for(const token of ['', 'wrong_access_token_123456789']){
  const res=response();
  assert.equal(requireReadAccess(request(token),res),false);
  assert.equal(res.code,401);
  assert.notEqual(res.headers['Access-Control-Allow-Origin'],'*');
 }
});
test('valid read token is accepted and bounded by per-instance rate limit',()=>{
 const token='bounded_test_access_token_123456789';
 process.env.ONOFF_READ_TOKEN_HASH=sha(token);
 for(let n=0;n<60;n++)assert.equal(requireReadAccess(request(token),response()),true);
 const res=response();assert.equal(requireReadAccess(request(token),res),false);
 assert.equal(res.code,429);assert.equal(res.headers['Retry-After'],'60');
});
test('pilot capability authorizes read only before expiration',()=>{
 const token='pilot_test_access_token_123456789';
 delete process.env.ONOFF_READ_TOKEN_HASH;
 process.env.IKONO_TASK_PILOT=JSON.stringify({tokenHash:sha(token),expires:Date.now()+120000});
 assert.equal(requireReadAccess(request(token),response()),true);
 process.env.IKONO_TASK_PILOT=JSON.stringify({tokenHash:sha(token),expires:Date.now()-1000});
 const res=response();assert.equal(requireReadAccess(request(token),res),false);assert.equal(res.code,401);
});
test('all CRM and AI endpoints deny unauthenticated access before upstream calls',async()=>{
 delete process.env.ONOFF_READ_TOKEN_HASH;delete process.env.IKONO_TASK_PILOT;
 const paths=['../api/bitrix/search-task','../api/bitrix/search-deal','../api/bitrix/search-company','../api/bitrix/search-client-tasks','../api/assistant-chat'];
 const previous=global.fetch;let count=0;global.fetch=async()=>{count++;throw Error('Unexpected upstream request')};
 try{
  for(const path of paths){
   const handler=require(path),res=response();
   await handler(request(),res);
   assert.equal(res.code,401,path);
  }
  assert.equal(count,0);
 }finally{global.fetch=previous;}
});
test('task lookup accepts a valid token and does not need a pilot write capability',async()=>{
 const token='task_read_token_123456789123456789';
 process.env.ONOFF_READ_TOKEN_HASH=sha(token);
 process.env.BITRIX_WEBHOOK_URL='https://bitrix.example/rest/user/secret/';
 const previous=global.fetch;let count=0;
 global.fetch=async()=>{count++;return {ok:true,status:200,json:async()=>({result:{task:{id:'505942',title:'TC5900 - prueba',status:'2'}}})}};
 try{
  const res=response();
  await require('../api/bitrix/search-task')(request(token),res);
  assert.equal(res.code,200);assert.equal(res.body.task.id,'505942');assert.equal(count,1);
 }finally{global.fetch=previous;}
});
