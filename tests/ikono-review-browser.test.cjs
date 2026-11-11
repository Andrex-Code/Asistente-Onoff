const {test}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');const path=require('node:path');
test('connected test flow: explicit consent, snapshot, classification, cancel, IA and local review',async()=>{
 const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1400,height:1100}});let api=0;let payload;
 await page.route('**/*',r=>{if(r.request().url().endsWith('/api/assistant-chat')){api++;payload=r.request().postDataJSON();return r.fulfill({json:{ok:true,answer:'Consulta ficticia. Resultado pendiente.'}});}return r.fulfill({contentType:'text/html',body:'<html><body><button aria-label="Resolver chat">Resolver chat</button><ul><li class="mx_EventTile" data-event-id="fake1" data-self="false"><div class="mx_EventTile_body translate">Consulta ficticia</div></li></ul></body></html>'});});
 await page.goto('https://onoff.a.ikono.im/#/room/fake');
 for(const file of ['src/ikono-classification.cjs','src/ikono-close-probe.cjs','tools/ikono-probe/review.js'])await page.addScriptTag({path:path.resolve(__dirname,'..',file)});
 const ui=page.locator('#onoff-ikono-review-test');const status=ui.getByRole('status');
 await ui.getByRole('button',{name:'Preparar captura',exact:true}).click();assert.match(await status.innerText(),/Confirma primero/);
 await ui.locator('#test').check();await ui.getByRole('button',{name:'Preparar captura',exact:true}).click();
 await page.evaluate(()=>document.querySelector('button').onclick=()=>{const d=document.createElement('div');d.setAttribute('role','dialog');d.setAttribute('aria-label','Resolver conversación');d.innerHTML='<div><label>Tipificación</label><div class="mx_DropdownTypification"><div class="select__single-value">ASESORIA</div><input role="combobox"></div></div><div class="mx_DropdownTypification"><div class="select__single-value">DETALLE FICTICIO</div><input role="combobox"></div><button>Cancelar</button>';d.querySelector('button').onclick=()=>d.remove();document.body.append(d);});
 await page.getByRole('button',{name:'Resolver chat',exact:true}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();
 assert.match(await ui.locator('#classification').innerText(),/DETALLE FICTICIO/);assert.equal(api,0);
 await ui.getByRole('button',{name:'Generar borrador IA',exact:true}).click();assert.equal(api,0);
 await ui.locator('#approve').check();await ui.getByRole('button',{name:'Generar borrador IA',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#onoff-ikono-review-test').shadowRoot.querySelector('#draft').value.includes('Consulta ficticia. Resultado pendiente.'));
 assert.equal(api,1);assert.equal(payload.conversation.length,1);assert.ok(!('id' in payload.conversation[0]));
 await ui.getByRole('button',{name:'Revisar borrador local',exact:true}).click();assert.match(await status.innerText(),/Bitrix sin envío/);
 await page.screenshot({path:path.resolve(__dirname,'../dist/ikono-connected-review.png'),fullPage:true});
 await page.evaluate(()=>location.hash='#/room/other');await page.waitForFunction(()=>document.querySelector('#onoff-ikono-review-test').shadowRoot.querySelector('#status').textContent.includes('borrados'));
 assert.equal(await ui.locator('#draft').inputValue(),'');
 await page.evaluate(()=>{for(let i=2;i<=41;i++){const li=document.createElement('li');li.className='mx_EventTile';li.setAttribute('data-event-id','fake'+i);li.setAttribute('data-self','false');li.innerHTML='<div class="mx_EventTile_body translate">Mensaje ficticio adicional</div>';document.querySelector('ul').append(li);}});
 await ui.locator('#test').check();await ui.getByRole('button',{name:'Preparar captura',exact:true}).click();
 await page.getByRole('button',{name:'Resolver chat',exact:true}).click();await page.getByRole('button',{name:'Cancelar',exact:true}).click();
 await ui.locator('#approve').check();await ui.getByRole('button',{name:'Generar borrador IA',exact:true}).click();
 assert.match(await status.innerText(),/hasta 40 mensajes/);assert.equal(api,1);
 await ui.getByRole('button',{name:'Detener y borrar',exact:true}).click();assert.equal(await ui.locator('#transcript').inputValue(),'');
 await ui.getByRole('button',{name:'Cerrar recorrido',exact:true}).click();assert.equal(await ui.count(),0);
 }finally{await browser.close();}
});
