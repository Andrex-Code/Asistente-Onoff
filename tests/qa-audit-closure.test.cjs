const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./ikono-advisor-fixture.cjs');

test('resolved tile belonging to homonymous B never confirms original A',async()=>{
 const f=await setup();
 try{
  await f.page.waitForFunction(()=>ONOFFAdvisorValidation.isValidated()&&document.querySelector('#resolve')?.getAttribute('aria-disabled')==='false');
  await f.page.locator('#resolve').click();
  await f.page.evaluate(()=>{
   const original=document.querySelector('[aria-label^="Abrir sala "][aria-selected="true"]');
   const unrelated=original.cloneNode(true);
   unrelated.querySelector('[aria-label="En seguimiento"]').setAttribute('aria-label','Resuelto');
   original.remove();
   document.querySelector('[role="dialog"]').remove();
   document.body.append(unrelated);
  });
  await f.page.waitForTimeout(2600);
  assert.equal(await f.page.evaluate(()=>requests.filter(x=>x.action==='await-confirmation').length),0);
  assert.equal(await f.page.evaluate(()=>records.some(x=>x.state==='confirmation')),false);
 }finally{await f.browser.close();}
});
test('temporary closure error can recover after native same-room resolved evidence',async()=>{
 const f=await setup();
 try{
  await f.page.waitForFunction(()=>ONOFFAdvisorValidation.isValidated()&&document.querySelector('#resolve')?.getAttribute('aria-disabled')==='false');
  await f.page.locator('#resolve').click();
  await f.page.evaluate(()=>{
   const alert=document.createElement('p');alert.setAttribute('role','alert');alert.textContent='Error temporal';document.querySelector('[role="dialog"]').append(alert);
  });
  await f.page.waitForTimeout(100);
  await f.page.evaluate(()=>{
   document.querySelector('[role="alert"]').remove();
   document.querySelector('[role="dialog"]').remove();
   const tile=document.querySelector('[aria-label^="Abrir sala "][aria-selected="true"]');
   tile.querySelector('[aria-label="En seguimiento"]').setAttribute('aria-label','Resuelto');
  });
  await f.page.waitForFunction(()=>records.some(x=>x.state==='confirmation'),{},{timeout:6000});
  assert.equal(await f.page.evaluate(()=>requests.filter(x=>x.action==='confirm').length),0);
 }finally{await f.browser.close();}
});
test('30-second observation timeout does not make later verified closure permanently unconfirmable',async()=>{
 const f=await setup();
 try{
  await f.page.waitForFunction(()=>ONOFFAdvisorValidation.isValidated()&&document.querySelector('#resolve')?.getAttribute('aria-disabled')==='false');
  await f.page.locator('#resolve').click();
  await f.page.evaluate(()=>{window.realNow=Date.now;Date.now=()=>realNow()+31000;});
  await f.page.waitForTimeout(300);
  assert.equal(await f.page.evaluate(()=>requests.filter(x=>x.action==='await-confirmation').length),0);
  await f.page.evaluate(()=>{
   document.querySelector('[role="dialog"]').remove();
   document.querySelector('[aria-label^="Abrir sala "][aria-selected="true"]')
    .querySelector('[aria-label="En seguimiento"]').setAttribute('aria-label','Resuelto');
  });
  await f.page.waitForFunction(()=>records.some(x=>x.state==='confirmation'),{},{timeout:6000});
 }finally{await f.browser.close();}
});
