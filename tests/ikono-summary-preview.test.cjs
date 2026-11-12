const {test}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');const path=require('node:path');
test('standalone preview requires consent, debounces changes, leaves native closure alone and clears on navigation',async()=>{
 const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1700,height:1100}});let calls=0;
 await page.route('**/*',r=>{if(r.request().url().endsWith('/api/assistant-chat')){calls++;return r.fulfill({json:{ok:true,answer:'Respuesta ficticia para revisar.'}});}return r.fulfill({contentType:'text/html',body:'<html><body><button id="native">Resolver chat</button><ul><li class="mx_EventTile" data-event-id="test1" data-self="false"><div class="mx_EventTile_body translate">Consulta de prueba</div></li></ul></body></html>'});});
 await page.goto('https://onoff.a.ikono.im/#/room/test');
 for(const file of ['src/ikono-classification.cjs','src/ikono-close-probe.cjs','tools/ikono-summary-preview/review.js'])await page.addScriptTag({path:path.resolve(__dirname,'..',file)});
 const ui=page.locator('#onoff-ikono-summary-preview');
 await ui.locator('#test').check();await ui.getByRole('button',{name:'Leer mensajes disponibles',exact:true}).click();assert.match(await ui.locator('#transcript').inputValue(),/Consulta de prueba/);
 await ui.locator('#auto').check();
 await page.evaluate(()=>{window.closes=0;document.querySelector('#native').onclick=()=>{const d=document.createElement('div');d.setAttribute('role','dialog');d.setAttribute('aria-label','Resolver conversación');d.style='position:fixed;left:650px;top:150px;width:400px;background:#eee;padding:20px';d.innerHTML='<div><label>Tipificación</label><div class="mx_DropdownTypification"><div class="select__single-value">ASESORIA</div><input role="combobox"></div></div><div class="mx_DropdownTypification"><div class="select__single-value" id="detail">DETALLE A</div><input role="combobox"></div><button id="cancel">Cancelar</button><button id="resolve">Resolver conversación</button>';d.querySelector('#cancel').onclick=()=>d.remove();d.querySelector('#resolve').onclick=()=>window.closes++;document.body.append(d);};});
 await page.locator('#native').click();await page.waitForTimeout(2200);assert.equal(calls,0);
 await ui.locator('#approve').check();await page.evaluate(()=>document.querySelector('#detail').textContent='DETALLE B');await page.waitForTimeout(900);
 await page.evaluate(()=>document.querySelector('#detail').textContent='DETALLE C');await page.waitForTimeout(1300);assert.equal(calls,0);
 await page.waitForFunction(()=>document.querySelector('#onoff-ikono-summary-preview').shadowRoot.querySelector('#draft').value.includes('Respuesta ficticia'));
 assert.equal(calls,1);assert.equal(await page.evaluate(()=>window.closes),0);
 await page.screenshot({path:path.resolve(__dirname,'../dist/ikono-summary-preview.png'),fullPage:true});
 await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);
 await page.evaluate(()=>location.hash='#/room/other');await page.waitForFunction(()=>document.querySelector('#onoff-ikono-summary-preview').shadowRoot.querySelector('#draft').value==='');
 assert.equal(await ui.locator('#approve').isChecked(),false);assert.equal(await ui.locator('#auto').isChecked(),false);
 await ui.getByRole('button',{name:'Cerrar vista previa',exact:true}).click();assert.equal(await ui.count(),0);
 }finally{await browser.close();}
});
