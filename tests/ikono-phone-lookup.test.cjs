const test=require('node:test'),assert=require('node:assert/strict'),{setup}=require('./ikono-advisor-fixture.cjs');
test('phone suggestions require human choice, and empty search leaves contact fallback',async()=>{
 const f=await setup({name:'Cliente sin establecimiento',text:'Consulta de hoy',deal:false});
 try{
  await f.page.evaluate(()=>{const orig=chrome.runtime.sendMessage;window.phoneDeals=[];chrome.runtime.sendMessage=m=>m.action==='lookup-phone'?Promise.resolve({ok:true,data:{deals:phoneDeals}}):orig(m);});
  const search=f.card.getByRole('button',{name:'Buscar TC por teléfono'});
  await search.click();
  await f.card.getByText(/Bitrix no devolvió una TC asociada/).waitFor();
  assert.equal(await f.card.getByLabel(/Cliente sin TC/).isVisible(),true);
  await f.page.evaluate(()=>phoneDeals=[{id:'100',tc:'20107',title:'Negocio A',company:{id:'200',name:'Compañía A'}}]);
  await search.click();
  const confirm=f.card.getByRole('button',{name:'Confirmar coincidencia'});
  await confirm.waitFor();
  assert.equal(await confirm.isEnabled(),false);
  await f.card.getByLabel('Coincidencias por teléfono').selectOption('100');
  assert.equal(await f.page.evaluate(()=>requests.some(m=>m.action==='prepare')),false);
  await confirm.click();
  await f.page.waitForFunction(()=>ONOFFAdvisorValidation.isValidated()&&document.getElementById('resolve').getAttribute('aria-disabled')==='false');
  const result=await f.page.evaluate(()=>({payload:requests.find(m=>m.action==='prepare').payload,writes:requests.filter(m=>['confirm','commit','resume'].includes(m.action)).length,nativeClicks}));
  assert.equal(result.payload.tc,'20107');assert.equal(result.payload.dealId,'100');assert.equal(result.writes+result.nativeClicks,0);
 }finally{await f.browser.close();}
});
