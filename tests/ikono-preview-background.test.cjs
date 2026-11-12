const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
test('preview activates only on the two exact HTTPS iKono hosts',async()=>{
 let click;const calls=[];
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../tools/ikono-summary-preview/background.js'),'utf8'),{URL,chrome:{runtime:{onMessage:{addListener(){}}},action:{onClicked:{addListener(fn){click=fn;}}},scripting:{async executeScript(args){calls.push(args);}}}});
 for(const url of ['https://onoff.a.ikono.im/#/room/test','https://onoff.s.ikono.im/#/room/test'])await click({id:1,url});
 assert.equal(calls.length,2);
 for(const url of ['http://onoff.s.ikono.im/','https://onoff.s.ikono.im.evil.example/','https://other.ikono.im/','invalid'])await click({id:1,url});
 assert.equal(calls.length,2);
});
