const {test}=require('node:test'),assert=require('node:assert/strict');const {colombiaDay,absoluteTime,createDayCapture}=require('../src/ikono-day-scope.cjs');
test('daily scope uses Colombia midnight and combines reopened contacts without last-40 truncation',()=>{
 const now=Date.parse('2026-11-12T18:00:00Z');assert.equal(colombiaDay('2026-11-12T04:59:59Z'),'2026-11-11');assert.equal(colombiaDay('2026-11-12T05:00:00Z'),'2026-11-12');assert.equal(absoluteTime('11:17'),null);
 const capture=createDayCapture({room:'test',now});capture.add(Array.from({length:70},(_,i)=>({id:String(i),text:'Contacto del día '+i,timestamp:`2026-11-12T${i<35?'14':'16'}:00:00Z`})),{now,startBoundaryVerified:true,liveTailVerified:true});capture.add([{id:'old',text:'Ayer',timestamp:'2026-11-12T04:59:00Z'}],{now});const result=capture.snapshot({now});assert.equal(result.messages.length,70);assert.equal(result.coverage,'complete');assert.equal(result.messages.some(m=>m.id==='old'),false);
});
test('unknown dates or missing boundary cannot certify daily coverage; limits do not silently omit messages',()=>{
 const now=Date.parse('2026-11-12T18:00:00Z'),capture=createDayCapture({room:'test',now});capture.add([{id:'unknown',text:'Sin fecha',timestamp:'11:17'}],{now});assert.equal(capture.snapshot({now}).coverage,'partial');assert.equal(capture.snapshot({now}).unknownDates,1);
 capture.add(Array.from({length:251},(_,i)=>({id:'msg'+i,text:'Texto',timestamp:now})),{now});assert.equal(capture.snapshot({now}).withinLimit,false);assert.equal(capture.snapshot({now}).messages.length,251);assert.equal(capture.snapshot({now:Date.parse('2026-11-13T05:00:00Z')}).messages.length,0);
});
