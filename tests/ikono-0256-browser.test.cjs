const {test}=require('node:test');
const assert=require('node:assert/strict');
const {resolve}=require('node:path');
const {chromium}=require('playwright');

async function setup(t,body){
 const browser=await chromium.launch();
 t.after(()=>browser.close());
 const page=await browser.newPage();
 page.setDefaultTimeout(6000);
 await page.route('**/*',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:'<body>'+body+'</body>'}));
 await page.clock.install({time:new Date('2026-11-25T15:00:00Z')});
 await page.goto('https://onoff.a.ikono.im/#/room/outgoing');
 await page.evaluate(()=>{
  window.requests=[];window.saved={};window.historyItems=[];window.prepareResolvers=[];
  window.chrome={
   storage:{local:{get:async()=>structuredClone(saved),set:async items=>Object.assign(saved,structuredClone(items))}},
   runtime:{sendMessage:async message=>{
    requests.push(message);
    if(message.action==='info')return {ok:true,data:{mode:'multi'}};
    if(message.action==='list')return {ok:true,data:{items:historyItems}};
    if(message.action==='prepare')return new Promise(resolve=>{prepareResolvers.push(resolve);});
    if(message.action==='resolve-and-send')return {ok:true,data:{taskId:'900',stage:'Finalizadas Solicitud',url:'https://example.test/task/900'}};
    if(message.action==='prepare-recovery'){
     const item=saved[message.reviewKey];item.state='forwarded';
     historyItems.push({key:'recovered',state:'confirmation',title:'Contacto PRUEBA',review:{identityMode:'contact',phone:message.phone,description:message.description},at:item.at});
     return {ok:true,data:{recordKey:'recovered'}};
    }
    return {ok:true,data:[]};
   }}
  };
 });
 for(const file of ['timeline.js','preparation-review.js','task-create.js']){
  await page.addScriptTag({path:resolve('tools/ikono-summary-preview',file)});
 }
 return page;
}

async function outgoing(t){
 const page=await setup(t,`<div id="onoff-ikono-auto-summary"></div>
  <div role="dialog" aria-label="Resolver conversación"><button>Resolver conversación</button></div>`);
 await page.evaluate(()=>{
  const root=document.querySelector('#onoff-ikono-auto-summary').attachShadow({mode:'open'});
  root.innerHTML='<details open><textarea data-description></textarea></details>';
  window.ONOFFIkonoClassification={readClassification:()=>({category:'CONTACTO',detail:'SALIENTE'})};
  window.ONOFFTaskReview={snapshot:()=>({tc:'',phone:'573001010101',room:location.hash,day:'2026-11-25',
   category:'CONTACTO',detail:'SALIENTE',description:'Motivo: contacto saliente',
   identityMode:'contact',contactConfirmed:true,tcConfirmed:true,reviewed:true,messages:[]})};
  window.ONOFFAdvisorValidation={isValidated:()=>true,tick(){},preparation(){}};
 });
 const root=page.locator('#onoff-ikono-auto-summary');
 await root.locator('[data-finalreview]').check();
 await root.locator('[data-duplicate]').check();
 return {page,root,prepare:root.getByRole('button',{name:'Preparar vista previa'})};
}

test('outgoing draft can take over 15 seconds without offering fallback or sending to Bitrix',async t=>{
 const {page,root,prepare}=await outgoing(t);
 await prepare.click();
 await page.waitForFunction(()=>prepareResolvers.length===1);
 await page.clock.fastForward(16000);
 assert.equal(await page.locator('[data-onoff-preparation-review]').count(),0);
 assert.equal(await page.getByRole('button',{name:'Resolver conversación'}).getAttribute('aria-disabled'),'true');
 await page.evaluate(()=>prepareResolvers[0]({ok:true,data:{intent:'signed',title:'Contacto PRUEBA',expires:Date.now()+60000}}));
 await root.locator('[data-create-status]').filter({hasText:'Lista:'}).waitFor();
 assert.deepEqual(await page.evaluate(()=>requests.filter(x=>['prepare','resolve-and-send','commit'].includes(x.action)).map(x=>x.action)),['prepare']);
 await page.getByRole('button',{name:'Resolver conversación'}).click();
 await page.waitForFunction(()=>requests.some(x=>x.action==='resolve-and-send'));
 const sends=await page.evaluate(()=>requests.filter(x=>x.action==='resolve-and-send'));
 assert.equal(sends.length,1);
 assert.equal(sends[0].intent,'signed');
 assert.equal(sends[0].request.room,'#/room/outgoing');
});

test('a slow reply from the prior conversation cannot block or arm the current room',async t=>{
 const {page,root,prepare}=await outgoing(t);
 await prepare.click();
 await page.waitForFunction(()=>prepareResolvers.length===1);
 await page.evaluate(()=>{
  location.hash='#/room/another-contact';
  const old=document.querySelector('[role=dialog]');
  old.replaceWith(old.cloneNode(true));
 });
 await page.clock.fastForward(750);
 await prepare.click();
 await page.waitForFunction(()=>prepareResolvers.length===2);
 await page.evaluate(()=>{
  const expires=Date.now()+60000;
  prepareResolvers[1]({ok:true,data:{intent:'current',title:'Sala actual',expires}});
  prepareResolvers[0]({ok:true,data:{intent:'stale',title:'Sala anterior',expires}});
 });
 await root.locator('[data-create-status]').filter({hasText:'Lista: Sala actual'}).waitFor();
 await page.getByRole('button',{name:'Resolver conversación'}).click();
 const sends=await page.evaluate(()=>requests.filter(x=>x.action==='resolve-and-send'));
 assert.equal(sends.length,1);
 assert.equal(sends[0].intent,'current');
 assert.equal(sends[0].request.room,'#/room/another-contact');
});

test('imports an older reviewed case once and requires a verified closure, identity and confirmation',async t=>{
 const page=await setup(t,`<div class="mx_RoomHeader">Contacto (573001010101)</div>
  <div class="mx_TimelineSeparator" aria-label="21/11/2026"></div>
  <li class="mx_EventTile" data-event-id="old-attention"><div class="mx_EventTile_body translate">Consulta</div></li>
  <li id="closure" class="mx_EventTile mx_EventTile_info" data-event-id="closure"><div class="mx_TextualEvent">Sin cierre</div></li>`);
 const record={room:'#/room/outgoing',at:Date.parse('2026-11-21T18:13:00Z'),state:'preparation-review',
  description:'Motivo: consulta. Gestión: revisión. Resultado: pendiente.',review:{category:'CONTACTO',detail:'SALIENTE',attention:'old-attention'}};
 await page.getByRole('button',{name:'Tipificaciones de hoy'}).click();
 const input=page.locator('input[type=file]');
 for(let attempt=0;attempt<2;attempt++){
  await input.setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(record))});
  await page.getByText('Caso disponible en Por revisar.').waitFor();
 }
 await page.getByRole('heading',{name:'Por revisar (1)'}).waitFor();
 assert.equal(await page.evaluate(()=>Object.keys(saved).length),1);
 await page.getByText('Ver datos conservados').click();
 await page.getByRole('button',{name:'Recuperar caso'}).click();
 await page.getByText(/Carga el historial hasta ver/).waitFor();
 assert.equal(await page.getByRole('button',{name:'Preparar borrador recuperado'}).count(),0);
 await page.getByRole('button',{name:'Cerrar recuperación'}).click();
 await page.evaluate(()=>document.querySelector('#closure .mx_TextualEvent').textContent='Chat resuelto');
 await page.getByRole('button',{name:'Recuperar caso'}).click();
 assert.equal(await page.getByLabel('Resumen de la atención').inputValue(),record.description);
 await page.getByRole('button',{name:'Preparar borrador recuperado'}).click();
 assert.equal(await page.evaluate(()=>requests.some(m=>m.action==='prepare-recovery')),false);
 await page.getByLabel(/Confirmo atención sin TC/).check();
 await page.getByLabel(/Verifiqué la identidad/).check();
 await page.getByRole('button',{name:'Preparar borrador recuperado'}).click();
 await page.getByRole('button',{name:/Confirmar crear tarea PRUEBA/}).waitFor();
 assert.deepEqual(await page.evaluate(()=>requests.filter(m=>['prepare-recovery','confirm','commit'].includes(m.action)).map(m=>[m.action,m.closureId,m.phone])),
  [['prepare-recovery','closure','573001010101']]);
});
