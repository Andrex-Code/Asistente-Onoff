const test=require('node:test'),assert=require('node:assert/strict');
const {findPhoneDeals}=require('../lib/bitrix-phone-deals');
test('phone lookup returns only linked deals with a valid TC and company',async()=>{
 const field='UF_CRM_TC', calls=[];
 const found=await findPhoneDeals('573000000000',field,async (method,params)=>{
  calls.push(method);
  if(method==='crm.duplicate.findbycomm'){
   assert.deepEqual(params['values[]'],['573000000000','+573000000000','3000000000']);
   return params.entity_type==='CONTACT'?{CONTACT:[11]}:{COMPANY:[22]};
  }
  assert.equal(method,'crm.deal.list');
  return [{ID:100,TITLE:'Negocio',CONTACT_ID:11,COMPANY_ID:22,[field]:'20107-C'},{ID:999,CONTACT_ID:99,COMPANY_ID:99,[field]:'7777'}];
 });
 assert.deepEqual(found.deals.map(d=>[d.id,d.tc]),[['100','20107']]);
 assert.equal(calls.length,4);
 const none=await findPhoneDeals('573000000000',field,async m=>{assert.equal(m,'crm.duplicate.findbycomm');return {};});
 assert.deepEqual(none,{deals:[],truncated:false});
});
