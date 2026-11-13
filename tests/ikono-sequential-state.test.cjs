const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');

function hubFixture(){let listener,removed,now=100000;class Clock extends Date {static now(){return now;}}
 vm.runInNewContext(fs.readFileSync('tools/ikono-summary-preview/hub.js','utf8'),{URL,Intl,Date:Clock,Map,chrome:{runtime:{id:'fixture',onMessage:{addListener:f=>listener=f}},tabs:{onRemoved:{addListener:f=>removed=f},remove:async()=>{},create:async()=>{throw Error('Must not open tabs');}}}});
 return {advance:n=>now+=n,remove:id=>removed(id),send:(room,closing=false,tab=1)=>new Promise(resolve=>listener({type:'ONOFF_CHAT_HUB',roomURL:'https://onoff.a.ikono.im/#/room/'+room,snapshot:{closing,title:room,text:room}},{id:'fixture',frameId:0,tab:{id:tab},url:'https://onoff.a.ikono.im/'},resolve))};
}
test('closing priority follows its owner across room changes, without requiring a return to the old chat',async()=>{
 const h=hubFixture();assert.match((await h.send('a',true)).priority,/room\/a$/);
 assert.equal((await h.send('b')).priority,'');
 assert.match((await h.send('b',true)).priority,/room\/b$/);
 assert.match((await h.send('c',false,2)).priority,/room\/b$/);
 assert.match((await h.send('b',false,2)).priority,/room\/b$/);h.remove(2);assert.match((await h.send('c',false,3)).priority,/room\/b$/);
 h.remove(1);assert.equal((await h.send('c',false,2)).priority,'');
});
test('priority expires when an old resolver has stopped reporting, and the hub retains more than twelve visited rooms',async()=>{
 const h=hubFixture();await h.send('a',true);h.advance(16000);assert.equal((await h.send('b',false,2)).priority,'');
 for(let i=0;i<15;i++)await h.send('room'+i);
 const r=await h.send('last');assert.equal(r.rooms.length,18);assert(r.rooms.some(x=>x.title==='room0'));assert(r.rooms.some(x=>x.title==='last'));
});
test('thirteenth and later rooms capture their own messages and preserve previous human corrections; next day clears all maps',async()=>{
 const browser=await chromium.launch();try{const page=await browser.newPage();await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));await page.goto('https://onoff.a.ikono.im/#/room/start');await page.clock.install({time:new Date('2026-11-13T17:00:00Z')});
 for(const f of ['timeline.js','memory.js'])await page.addScriptTag({path:path.resolve('tools/ikono-summary-preview',f)});
 const result=await page.evaluate(()=>{const all=[];for(let i=0;i<16;i++){location.hash='#/room/'+i;document.body.innerHTML=`<div class="mx_TimelineSeparator" aria-label="Hoy"></div><li class="mx_EventTile" data-event-id="message-${i}" data-self="false"><div class="mx_EventTile_body translate">Consulta exclusiva ${i}</div></li>`;const s=ONOFFIkonoMemory.capture(location.hash);s.cache={key:'key'+i,text:'Corrección '+i};s.edited=true;all.push([...s.messages.values()].map(x=>x.text));}return {all,first:ONOFFIkonoMemory.get('#/room/0').cache.text};});
 assert.deepEqual(result.all,Array.from({length:16},(_,i)=>['Consulta exclusiva '+i]));assert.equal(result.first,'Corrección 0');
 await page.clock.setSystemTime(new Date('2026-11-14T17:00:00Z'));assert.equal(await page.evaluate(()=>ONOFFIkonoMemory.get('#/room/0').cache),null);
 }finally{await browser.close();}
});
