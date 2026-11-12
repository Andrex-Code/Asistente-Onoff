const test=require('node:test'),assert=require('node:assert/strict'),closure=require('../tools/ikono-summary-preview/closure');
const good={clicked:true,hash:'#/home',matches:0,elapsed:2200};
test('correlates human close with stable Home handoff and removed room',()=>assert.equal(closure(good),'ON_RATING_HANDOFF'));
test('navigation, click, disappearing dialog or missing room alone are insufficient',()=>{for(const change of [{clicked:false},{hash:'#/room/other'},{matches:1},{elapsed:500},{elapsed:31000},{error:true},{dialog:true},{interrupted:true},{cancelled:true}])assert.equal(closure({...good,...change}),'');});
test('still supports explicit Resuelto in the original room',()=>assert.equal(closure({clicked:true,sameRoom:true,matches:1,status:'Resuelto'}),'Resuelto'));

