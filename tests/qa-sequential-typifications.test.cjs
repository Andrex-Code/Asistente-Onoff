const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{setup}=require('./ikono-advisor-fixture.cjs');

async function ready(f){await f.page.waitForFunction(()=>document.getElementById('resolve')?.getAttribute('aria-disabled')==='false'&&ONOFFAdvisorValidation.isValidated(),null,{timeout:12000});}
async function mountRoom(f,{room,tc,text,noDate=false,dialog=true}={}){
 await f.page.evaluate(({room,tc,text,noDate,dialog})=>{
  for(const e of document.querySelectorAll('.mx_RoomHeader,[aria-label^="Abrir sala "],.mx_TimelineSeparator,li.mx_EventTile,[role=dialog]'))e.remove();
  location.hash='#/room/'+room;
  const surface=document.createElement('main');surface.id='qa-surface-'+room;
  const header=`<div class="mx_RoomHeader">Cliente ${room} (573007561667)</div><div aria-label="Abrir sala Cliente ${room}" aria-selected="true"><svg aria-label="En seguimiento"></svg></div>`;
  const history=noDate?`<li class="mx_EventTile" data-event-id="${room}-closed"><div class="mx_MNoticeBody"><div class="mx_EventTile_body translate">Chat resuelto</div></div></li><li class="mx_EventTile mx_EventTile_info" data-event-id="${room}-joined"><div class="mx_EventTile_avatar"><button title="@agente41:fixture">A</button></div><div class="mx_TextualEvent">Asesor se ha unido a la sala</div></li>`:'<div class="mx_TimelineSeparator" aria-label="hoy"></div>';
  const form=`<div role="dialog" aria-label="Resolver conversación"><p>Estás seguro que quieres resolver esta conversación 'Cliente ${room}'?</p><label>Tipificación</label><div class="mx_DropdownTypification"><div class="select__single-value">FALLAS EN SOFTWARE</div><input role="combobox"></div><div class="mx_DropdownTypification"><div class="select__single-value">PENDIENTES POR SINCRONIZAR</div><input role="combobox"></div><div class="mx_Dialog_content"></div><button>Cancelar</button><button id="resolve">Resolver conversación</button></div>`;
  surface.innerHTML=header+history+`<li class="mx_EventTile" data-event-id="${room}-text" data-self="false"><div class="mx_EventTile_body translate">${text||'Consulta '+room+', mi TC es '+tc}</div></li>`+(dialog?form:'');
  document.body.append(surface);if(dialog)document.getElementById('resolve').onclick=()=>nativeClicks++;
 },{room,tc,text,noDate,dialog});
}
async function complete(f,tc){
 await ready(f);await f.page.locator('#resolve').click();
 await f.page.evaluate(()=>{document.querySelector('[role=dialog]').remove();document.querySelector('[aria-selected]').remove();location.hash='#/home';});
 const button=f.page.getByRole('button',{name:'✓ Confirmar crear tarea PRUEBA · TC'+tc,exact:true});await button.waitFor();
 const check=f.page.getByLabel(/Confirmo que el resumen corresponde a esta atención de hoy/);if(await check.count())await check.check();
 await button.click();await f.page.getByText('Tipificación creada',{exact:true}).waitFor();
}
async function evidence(f){return f.page.evaluate(()=>({ctx:ONOFFAdvisorContext.read(),snapshot:ONOFFTaskReview.snapshot(),summaries:window.summaryBodies,requests:requests.map(m=>({action:m.action,tc:m.payload?.tc,room:m.payload?.room})),status:document.querySelector('#onoff-advisor-validation')?.shadowRoot.querySelector('[data-compact-status]')?.textContent}));}

test('QA: three sequential typifications in one loaded extension keep TC, room and summary isolated',async()=>{
 const f=await setup({name:'Cliente A',text:'Caso A. Mi TC es 5900',noDate:true});
 try{
  await complete(f,'5900');
  for(const [room,tc,noDate]of [['B','5046',false],['C','70821',true]]){
   await mountRoom(f,{room,tc,noDate});
   try{await ready(f);}catch(e){console.log('QA FAILURE',JSON.stringify(await evidence(f)));throw e;}
   const p=await f.page.evaluate(()=>ONOFFTaskReview.snapshot());assert.equal(p.tc,tc);assert.equal(p.room,'#/room/'+room);assert.equal(p.messages.length,1);assert.match(p.messages[0][1].text,new RegExp(room));
   await complete(f,tc);
  }
  assert.equal(await f.page.evaluate(()=>requests.filter(m=>m.action==='confirm').length),3);
 }finally{await f.browser.close();}
});

test('QA: cancelling a prepared chat and opening another chat rebuilds current summary and TC',async()=>{
 const f=await setup({name:'Cliente A',text:'Caso A. Mi TC es 5900'});
 try{await ready(f);await f.page.getByRole('button',{name:'Cancelar',exact:true}).click();await mountRoom(f,{room:'B',tc:'5046',noDate:true});await ready(f);const p=await f.page.evaluate(()=>ONOFFTaskReview.snapshot());assert.equal(p.tc,'5046');assert.equal(p.messages.length,1);assert.equal(await f.page.evaluate(()=>requests.filter(m=>m.action==='confirm').length),0);}finally{await f.browser.close();}
});

test('QA: delayed hub response from previous room cannot replace current Resolver priority',async()=>{
 const f=await setup({name:'Cliente A',text:'Caso A. Mi TC es 5900'});
 try{
  await ready(f);await f.page.evaluate(()=>{const original=chrome.runtime.sendMessage;window.firstHub=true;chrome.runtime.sendMessage=async m=>{if(m.type==='ONOFF_CHAT_HUB'){if(firstHub){firstHub=false;return new Promise(r=>window.releaseHubA=()=>r({priority:location.origin+'/#/room/fixture',rooms:[]}));}return {priority:location.origin+'/'+location.hash,rooms:[]};}return original(m);};});
  await f.page.addScriptTag({path:path.resolve('tools/ikono-summary-preview/dashboard.js')});await f.page.waitForFunction(()=>!!window.releaseHubA);
  await mountRoom(f,{room:'B',tc:'5046'});
  // Isolate this contract from the distinct hashchange/dialog mounting race.
  await f.page.waitForTimeout(100);await f.page.evaluate(()=>{const d=document.querySelector('[role=dialog]');d.remove();setTimeout(()=>document.body.append(d),20);});
  await ready(f);await f.page.evaluate(()=>releaseHubA());await f.page.waitForTimeout(100);
  assert.equal(await f.page.evaluate(()=>window.__onoffPriorityKey),await f.page.evaluate(()=>location.origin+'/'+location.hash));
  const p=await f.page.evaluate(()=>ONOFFTaskReview.snapshot());assert.equal(p.tc,'5046');assert.equal(p.messages.length,1);
 }finally{await f.browser.close();}
});

test('QA: a new chat with the same TC still uses only its own messages after previous success',async()=>{
 const f=await setup({name:'Cliente A',text:'Exclusivo A. Mi TC es 5900'});
 try{await complete(f,'5900');await mountRoom(f,{room:'B',tc:'5900',text:'Exclusivo B. mi establecimiento TC5900'});await ready(f);const p=await f.page.evaluate(()=>ONOFFTaskReview.snapshot());assert.equal(p.tc,'5900');assert.equal(p.messages.length,1);assert.match(p.messages[0][1].text,/Exclusivo B/);assert.doesNotMatch(JSON.stringify(p.messages),/Exclusivo A/);}finally{await f.browser.close();}
});

test('QA: CRM failure in the second chat recovers without losing its current TC or messages',async()=>{
 const f=await setup({name:'Cliente A',text:'Caso A. Mi TC es 5900'});
 try{await complete(f,'5900');await f.page.evaluate(()=>failure='crm');await mountRoom(f,{room:'B',tc:'5046'});const card=f.page.locator('#onoff-advisor-validation');await card.getByRole('button',{name:'Revalidar preparación'}).waitFor();await f.page.evaluate(()=>failure='');await card.getByRole('button',{name:'Revalidar preparación'}).click();await ready(f);const p=await f.page.evaluate(()=>ONOFFTaskReview.snapshot());assert.equal(p.tc,'5046');assert.equal(p.messages.length,1);assert.equal(await f.page.evaluate(()=>requests.filter(m=>m.action==='confirm').length),1);}finally{await f.browser.close();}
});

test('QA: response still in flight for A cannot overwrite B or block the next summary',async()=>{
 const f=await setup({name:'Cliente A',text:'Caso A. Mi TC es 5900'});let releaseA;
 try{
  await ready(f);await f.page.route('**/api/assistant-chat',async route=>{const body=route.request().postDataJSON();if(body.conversation.some(m=>m.text.includes('ACTUALIZACIÓN A'))){await f.page.evaluate(()=>window.qaHeldA=true);await new Promise(r=>releaseA=r);try{await route.fulfill({json:{ok:true,answer:'RESUMEN A TARDÍO'}});}catch{}return;}await route.fulfill({json:{ok:true,answer:'Motivo: Exclusivo B. Gestión: revisión B. Resultado: pendiente B.'}});});
  await f.page.evaluate(()=>{const li=document.createElement('li');li.className='mx_EventTile';li.dataset.eventId='lateA';li.innerHTML='<div class="mx_EventTile_body translate">ACTUALIZACIÓN A</div>';document.querySelector('[role=dialog]').before(li);ONOFFAdvisorContext.retrySummary();});
  await f.page.waitForFunction(()=>window.qaHeldA);await mountRoom(f,{room:'B',tc:'5046'});await ready(f);releaseA();await f.page.waitForTimeout(300);const state=await f.page.evaluate(()=>({ctx:ONOFFAdvisorContext.read(),snapshot:ONOFFTaskReview.snapshot()}));assert.match(state.ctx.summary,/Exclusivo B/);assert.doesNotMatch(state.ctx.summary,/TARDÍO/);assert.equal(state.ctx.summaryReady,true);assert.equal(state.snapshot.tc,'5046');
 }finally{releaseA?.();await f.browser.close();}
});

test('QA: returning to A preserves its human correction and does not copy it into B',async()=>{
 const f=await setup({name:'Cliente A',text:'Exclusivo A. Mi TC es 5900'});
 try{
  await ready(f);await f.page.evaluate(()=>{window.qaOriginal=[...document.querySelectorAll('.mx_RoomHeader,[aria-label^="Abrir sala "],.mx_TimelineSeparator,li.mx_EventTile,[role=dialog]')].map(e=>{const clone=e.cloneNode(true);clone.querySelector('#onoff-advisor-validation')?.remove();return clone.outerHTML;}).join('');const draft=document.getElementById('onoff-ikono-auto-summary').shadowRoot.querySelector('textarea');draft.value='CORRECCIÓN HUMANA A';draft.dispatchEvent(new Event('input'));});
  await f.page.getByRole('button',{name:'Cancelar',exact:true}).click();await mountRoom(f,{room:'B',tc:'5046'});await ready(f);assert.doesNotMatch((await f.page.evaluate(()=>ONOFFAdvisorContext.read())).summary,/CORRECCIÓN HUMANA A/);
  await f.page.getByRole('button',{name:'Cancelar',exact:true}).click();await f.page.evaluate(()=>{for(const e of document.querySelectorAll('.mx_RoomHeader,[aria-label^="Abrir sala "],.mx_TimelineSeparator,li.mx_EventTile,[role=dialog]'))e.remove();location.hash='#/room/fixture';document.body.insertAdjacentHTML('beforeend',qaOriginal);document.getElementById('resolve').onclick=()=>nativeClicks++;});await ready(f);assert.equal((await f.page.evaluate(()=>ONOFFAdvisorContext.read())).summary,'CORRECCIÓN HUMANA A');assert.equal((await f.page.evaluate(()=>ONOFFTaskReview.snapshot())).description,'CORRECCIÓN HUMANA A');assert.equal(await f.page.evaluate(()=>requests.filter(m=>m.action==='confirm').length),0);
 }finally{await f.browser.close();}
});

test('QA: AI failure in the second chat can be retried without inheriting the first summary',async()=>{
 const f=await setup({name:'Cliente A',text:'Caso A. Mi TC es 5900'});
 try{await complete(f,'5900');await f.page.evaluate(()=>failure='summary');await mountRoom(f,{room:'B',tc:'5046'});const card=f.page.locator('#onoff-advisor-validation');await card.getByRole('button',{name:'Revalidar preparación'}).waitFor();assert.equal((await f.page.evaluate(()=>ONOFFAdvisorContext.read())).summaryReady,false);await f.page.evaluate(()=>failure='');await card.getByRole('button',{name:'Revalidar preparación'}).click();await ready(f);const p=await f.page.evaluate(()=>ONOFFTaskReview.snapshot());assert.equal(p.tc,'5046');assert.equal(p.messages.length,1);assert.match(p.messages[0][1].text,/Consulta B/);assert.equal(await f.page.evaluate(()=>requests.filter(m=>m.action==='confirm').length),1);}finally{await f.browser.close();}
});

test('QA: second contact of the same room and same TC excludes the previous closed contact',async()=>{
 const f=await setup({name:'Cliente A',text:'PRIMER CONTACTO. Mi TC es 5900'});
 try{
  await ready(f);await f.page.evaluate(()=>{const clone=document.querySelector('[role=dialog]').cloneNode(true);clone.querySelector('#onoff-advisor-validation')?.remove();window.qaDialog=clone.outerHTML;});await complete(f,'5900');
  await f.page.evaluate(()=>{location.hash='#/room/fixture';document.body.insertAdjacentHTML('beforeend','<div aria-label="Abrir sala Cliente A" aria-selected="true"><svg aria-label="En seguimiento"></svg></div><li class="mx_EventTile" data-event-id="second-closed"><div class="mx_MNoticeBody"><div class="mx_EventTile_body translate">Chat resuelto</div></div></li><li class="mx_EventTile mx_EventTile_info" data-event-id="second-joined"><div class="mx_EventTile_avatar"><button title="@agente41:fixture">A</button></div><div class="mx_TextualEvent">Asesor se ha unido a la sala</div></li><li class="mx_EventTile" data-event-id="second-text" data-self="false"><div class="mx_EventTile_body translate">SEGUNDO CONTACTO, mi TC es 5900</div></li>'+qaDialog);document.getElementById('resolve').onclick=()=>nativeClicks++;});
  await ready(f);const p=await f.page.evaluate(()=>ONOFFTaskReview.snapshot());assert.equal(p.tc,'5900');assert.equal(p.messages.length,1);assert.match(p.messages[0][1].text,/SEGUNDO CONTACTO/);assert.doesNotMatch(JSON.stringify(p.messages),/PRIMER CONTACTO/);await complete(f,'5900');assert.equal(await f.page.evaluate(()=>requests.filter(m=>m.action==='confirm').length),2);
 }finally{await f.browser.close();}
});
