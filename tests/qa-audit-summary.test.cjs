const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setup}=require('./ikono-advisor-fixture.cjs');

test('a 502 HTML response is parsed as transient and retried with a bounded request',async()=>{
 const f=await setup();
 try{
  await f.page.waitForFunction(()=>document.querySelector('#onoff-ikono-auto-summary')?.shadowRoot?.querySelector('textarea')?.value.includes('Motivo:'));
  let calls=0;
  await f.page.route('**/api/assistant-chat',async route=>{
   calls++;
   if(calls===1)return route.fulfill({status:502,contentType:'text/html',body:'<h1>Bad Gateway</h1>'});
   return route.fulfill({status:200,json:{ok:true,answer:'Motivo: consulta. Gestión: revisión. Resultado: recuperado.'}});
  });
  await f.page.evaluate(()=>ONOFFAdvisorContext.retrySummary());
  await f.page.waitForFunction(()=>document.querySelector('#onoff-ikono-auto-summary')?.shadowRoot?.querySelector('textarea')?.value.includes('recuperado'),{},{timeout:7000});
  assert.equal(calls,2);
 }finally{await f.browser.close();}
});
test('repeated non-JSON 502 responses stop after three attempts, without fabricating summary',async()=>{
 const f=await setup();
 try{
  await f.page.waitForFunction(()=>document.querySelector('#onoff-ikono-auto-summary')?.shadowRoot?.querySelector('textarea')?.value.includes('Motivo:'));
  let calls=0;
  await f.page.route('**/api/assistant-chat',async route=>{calls++;return route.fulfill({status:502,contentType:'text/html',body:'<h1>Bad Gateway</h1>'});});
  await f.page.evaluate(()=>ONOFFAdvisorContext.retrySummary());
  await f.page.waitForFunction(()=>document.querySelector('#onoff-ikono-auto-summary')?.shadowRoot?.querySelector('[role=status]')?.textContent.startsWith('No se pudo generar:'),{},{timeout:7000});
  assert.equal(calls,3);
  const value=await f.page.locator('#onoff-ikono-auto-summary').locator('textarea').inputValue();
  assert.equal(value,'');
 }finally{await f.browser.close();}
});
