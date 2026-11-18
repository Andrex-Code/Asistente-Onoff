const test=require('node:test'),assert=require('node:assert/strict'),{setup}=require('./ikono-advisor-fixture.cjs');
test('phone lookup panel follows the iKono dialog theme and preserves light mode',async()=>{
 const f=await setup({name:'Cliente sin TC',text:'Consulta de hoy',deal:false});
 try{
  const colors=()=>f.page.evaluate(()=>{
   const host=document.querySelector('#onoff-advisor-validation');
   const css=s=>getComputedStyle(host.shadowRoot.querySelector(s));
   return {panel:getComputedStyle(host).backgroundColor,scheme:getComputedStyle(host).colorScheme,input:css('[data-manual]').backgroundColor,button:css('[data-phone-search]').backgroundColor,text:css('[data-phone-deals]').color};
  });
  assert.equal((await colors()).panel,'rgb(255, 255, 255)');
  await f.page.evaluate(()=>document.querySelector('[role=dialog]').style.backgroundColor='#111518');
  await f.page.waitForFunction(()=>getComputedStyle(document.querySelector('#onoff-advisor-validation').shadowRoot.querySelector('[data-phone-search]')).backgroundColor==='rgb(42, 62, 80)');
  assert.deepEqual(await colors(),{panel:'rgb(27, 36, 45)',scheme:'dark',input:'rgb(17, 24, 32)',button:'rgb(42, 62, 80)',text:'rgb(237, 243, 247)'});
  await f.page.evaluate(()=>document.querySelector('[role=dialog]').style.backgroundColor='white');
  await f.page.waitForFunction(()=>!document.querySelector('#onoff-advisor-validation')?.hasAttribute('data-dark'));
  assert.equal((await colors()).panel,'rgb(255, 255, 255)');
  assert.equal(await f.page.evaluate(()=>nativeClicks+requests.filter(m=>m.action==='confirm').length),0);
 }finally{await f.browser.close();}
});
