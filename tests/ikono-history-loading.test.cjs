const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
test('loads missing date marker automatically and restores the message scroll',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.setContent('<div id="viewport" style="height:120px;overflow:auto"><ul style="height:500px"><li class="mx_EventTile" data-event-id="a"><span class="mx_EventTile_body translate">Atención de prueba</span></li></ul></div>');
  await page.addScriptTag({path:path.resolve('tools/ikono-summary-preview/timeline.js')});
  const observed=await page.evaluate(async()=>{
   const viewport=document.querySelector('#viewport'),ul=viewport.querySelector('ul');
   viewport.scrollTop=viewport.scrollHeight;
   const initial=viewport.scrollTop;
   viewport.addEventListener('scroll',()=>{if(viewport.scrollTop===0&&!ul.querySelector('.mx_DateSeparator')){setTimeout(()=>ul.insertAdjacentHTML('afterbegin','<li class="mx_DateSeparator">Hoy</li>'),100);}});
   const read=()=>ONOFFTimeline.sessions(ONOFFTimeline.read()).some(s=>s.messages.has('a'));
   const before=read();
   const found=await ONOFFTimeline.loadVisibleHistory({isCurrent:()=>true,capture:read});
   return {before,found,restored:viewport.scrollTop===initial};
  });
  assert.deepEqual(observed,{before:false,found:true,restored:true});
 }finally{await browser.close();}
});
