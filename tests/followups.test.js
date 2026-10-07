'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createService, groupUsers, parseIds, excluded } = require('../lib/followups-service');
const record = (id, owner='10', status='2', title='Solicitud') => ({ id: String(id), createdBy: owner, status, title, responsibleId: '20', responsible: { name: 'Cliente Responsable' }, createdDate: '2026-10-01T09:00:00-05:00' });
const user = (id, name='Cliente') => ({ ID: id, NAME: name, LAST_NAME: 'Prueba', ACTIVE: true });
const webhookUrl = 'https://example.bitrix24.es/rest/1/test/';
function harness(fn, env = {}) {
 const calls = []; let clock=1800000000000;
 const service = createService({ webhookUrl, env, now: () => clock, request: async (method, params) => { calls.push({method,params}); return fn(method,params); } });
 return {service,calls,advance: ms => clock+=ms};
}
test('normalization groups identical names, not similar spellings or repeated IDs',()=>{
 const groups=groupUsers([{id:'1',fullName:'Cliente Prueba'},{id:'1',fullName:'Cliente Prueba'},{id:'2',fullName:'CLIENTE  PRUEBA'},{id:'3',fullName:'Cliente Pruebas'}]);
 assert.equal(groups.length,2); assert.deepEqual(groups[0].ownerIds,['1','2']);
});
test('owner IDs are validated rather than silently accepting malformed values',()=>{
 assert.deepEqual(parseIds(['2','1','2']),['1','2']);
 for(const ids of [[],['1','bad'],Array(31).fill('1'),['-1']]) assert.throws(()=>parseIds(ids));
});
test('process task exclusion retains normal support tasks',()=>{
 assert.equal(excluded({title:'  Tareas de proceso Trycontroller Tiendas'}),true);
 assert.equal(excluded({title:'TAREAS DE PROCESO'}),true);
 assert.equal(excluded({title:'Revisar tareas de proceso'}),false);
});
test('search returns grouped names before making ANY task call',async()=>{
 const h=harness(m=>{assert.equal(m,'user.get');return {result:[user('10'),user('11')]};});
 const data=await h.service.execute({action:'search',name:'Cliente'});
 assert.equal(data.users.length,1);assert.equal(data.users[0].ownerIds.length,2);assert.equal(data.users[0].openTaskCount,null);assert.equal(h.calls.length,1);
});
test('task filter uses CREATED_BY and REAL_STATUS and follows all pages',async()=>{
 const h=harness((m,p)=> m==='user.get'?{result:[user('10')]} : p.start===0?{result:{tasks:[record(1),record(2,'10','5')]},next:50}:{result:{tasks:[record(3,'10','2','Tareas de proceso Trycontroller Tiendas'),record(4)]}});
 const data=await h.service.execute({action:'tasks',ownerIds:['10']});
 assert.deepEqual(data.tasks.map(t=>t.id),['1','4']); assert.equal(data.count,2); assert.equal(data.complete,true);
 const calls=h.calls.filter(c=>c.method==='tasks.task.list');assert.equal(calls.length,2);
 assert.equal(calls[0].params['filter[CREATED_BY]'],'10');assert.deepEqual(calls[0].params['filter[!REAL_STATUS]'],[5,7]);
 assert.equal(data.tasks[0].responsible,'Cliente Responsable');
});
test('counts and selection reuse snapshots; repeated concurrent calls coalesce',async()=>{
 const h=harness(async m=>{await new Promise(r=>setTimeout(r,5));return m==='user.get'?{result:[user('10')]}:{result:{tasks:[record(1)]}};});
 const [a,b]=await Promise.all([h.service.execute({action:'counts',groups:[{id:'10',ownerIds:['10']}]}),h.service.execute({action:'tasks',ownerIds:['10']})]);
 assert.equal(a.users[0].openTaskCount,1);assert.equal(b.count,1);
 await h.service.execute({action:'tasks',ownerIds:['10']});assert.equal(h.calls.filter(c=>c.method==='tasks.task.list').length,1);
 h.advance(46000);await h.service.execute({action:'tasks',ownerIds:['10']});assert.equal(h.calls.filter(c=>c.method==='tasks.task.list').length,2);
 await h.service.execute({action:'tasks',ownerIds:['10'],force:true});assert.equal(h.calls.filter(c=>c.method==='tasks.task.list').length,3);
});
test('count failure stays null, does not become a misleading zero',async()=>{
 const h=harness((m,p)=>{if(p['filter[CREATED_BY]']==='11') throw new Error('Bitrix error');return {result:{tasks:[record(1)]}};});
 const data=await h.service.execute({action:'counts',groups:[{id:'10'},{id:'11'}]});
 assert.equal(data.users[0].openTaskCount,1);assert.equal(data.users[1].openTaskCount,null);assert.ok(data.users[1].error);
});
test('rejects wrong-owner data and broken pagination',async()=>{
 let h=harness(()=>({result:{tasks:[record(1,'99')]}})); await assert.rejects(()=>h.service.execute({action:'tasks',ownerIds:['10']}),{code:'BITRIX_FILTER'});
 h=harness(()=>({result:{tasks:[record(1)]},next:0})); await assert.rejects(()=>h.service.execute({action:'tasks',ownerIds:['10']}),{code:'BITRIX_PAGING'});
});
test('SAC automatic list filters by department, never by example names',async()=>{
 const h=harness((m,p)=>{assert.equal(m,'user.search');assert.ok(p['FILTER[UF_DEPARTMENT_NAME]']);return {result:[user('10')]};});
 const data=await h.service.execute({action:'sac'});assert.equal(data.users.length,1);assert.ok(data.source.includes('Departamentos'));
 await h.service.execute({action:'sac'});assert.equal(h.calls.length,2);
});
test('empty SAC roster is explicit and does not fall back to all employees',async()=>{
 const h=harness(()=>({result:[]}));const data=await h.service.execute({action:'sac'});assert.equal(data.users.length,0);assert.ok(data.warning);assert.equal(h.calls.length,2);
});
test('configured SAC department and user IDs use restricted user.get filters',async()=>{
 const a=harness((m,p)=>{assert.deepEqual(p['FILTER[UF_DEPARTMENT]'],['9']);return {result:[user('10')]};},{BITRIX_SAC_DEPARTMENT_IDS:'9'});
 await a.service.execute({action:'sac'});
 const b=harness((m,p)=>{assert.deepEqual(p['FILTER[ID]'],['10']);return {result:[user('10')]};},{BITRIX_SAC_OWNER_IDS:'10'});
 await b.service.execute({action:'sac'});
});
test('task concurrency is bounded at three during multi-owner counts',async()=>{
 let active=0,peak=0;
 const h=harness(async(m,p)=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,4));active--;return {result:{tasks:[record(1,String(p['filter[CREATED_BY]']))]}};});
 await h.service.execute({action:'counts',groups:['10','11','12','13','14','15'].map(id=>({id}))});assert.ok(peak<=3);assert.ok(peak>=2);
});
test('malformed actions are rejected and older clients remain compatible',async()=>{
 const h=harness(m=>m==='user.get'?{result:[user('10')]}:{result:{tasks:[record(1)]}});
 await assert.rejects(()=>h.service.execute({action:'write'}),{code:'INVALID_ACTION'});
 const data=await h.service.execute({name:'Cliente'});assert.equal(data.requiresSelection,false);assert.equal(data.count,1);
});
