const {test}=require('node:test');const assert=require('node:assert/strict');const {chromium}=require('playwright');const path=require('node:path');
test('automatic content script waits for classification, debounces, sends once, cancels and clears on navigation',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage();let calls=0;
 await page.route('**/*',r=>r.request().url().endsWith('/api/assistant-chat')?(calls++,r.fulfill({json:{ok:true,answer:'Resumen simulado'}})):r.fulfill({contentType:'text/html',body:'<body><li class="mx_EventTile" data-event-id="1" data-self="false"><div class="mx_EventTile_body translate">Consulta ficticia</div></li></body>'}));await page.goto('https://onoff.s.ikono.im/#/room/test');
 for(const f of ['src/ikono-classification.cjs','src/ikono-close-probe.cjs','tools/ikono-summary-preview/auto.js'])await page.addScriptTag({path:path.resolve(__dirname,'..',f)});
 assert.equal(calls,0);assert.equal(await page.locator('#onoff-ikono-auto-summary').isVisible(),false);
 await page.evaluate(()=>{const d=document.createElement('div');d.setAttribute('role','dialog');d.setAttribute('aria-label','Resolver conversación');d.innerHTML='<div><label>Tipificación</label><div class="mx_DropdownTypification"><div class="select__single-value">ASESORIA</div><input role="combobox"></div></div><div class="mx_DropdownTypification"><div class="select__single-value" id="detail"></div><input role="combobox"></div><button id="cancel">Cancelar</button><button id="resolve">Resolver conversación</button>';window.closes=0;d.querySelector('#resolve').onclick=()=>window.closes++;d.querySelector('#cancel').onclick=()=>d.remove();document.body.append(d);});
 const ui=page.locator('#onoff-ikono-auto-summary');await page.waitForTimeout(2100);assert.equal(calls,0);
 await page.evaluate(()=>document.querySelector('#detail').textContent='A');await page.waitForTimeout(1000);await page.evaluate(()=>document.querySelector('#detail').textContent='B');await page.waitForTimeout(1200);assert.equal(calls,0);
 await page.waitForFunction(()=>document.querySelector('#onoff-ikono-auto-summary').shadowRoot.querySelector('textarea').value==='Resumen simulado');assert.equal(calls,1);assert.equal(await page.evaluate(()=>window.closes),0);
 await page.evaluate(()=>document.querySelector('#detail').textContent='C');await page.locator('#cancel').click();await page.waitForTimeout(2200);assert.equal(calls,1);
 await page.evaluate(()=>location.hash='#/room/other');await page.waitForTimeout(100);assert.equal(await ui.isVisible(),false);assert.equal(await ui.locator('textarea').inputValue(),'');
 }finally{await browser.close();}
});
