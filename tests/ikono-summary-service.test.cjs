const {test}=require('node:test'),assert=require('node:assert/strict');const {summarize}=require('../lib/ikono-summary');
test('summary uses compact bounded request without knowledge store, no verified participant roles',async()=>{
 let sent;const data=await summarize([{role:'advisor',text:'Consulta ficticia'}],'test-placeholder',{model:'gpt-4o-mini',fetchImpl:async(url,options)=>{sent=JSON.parse(options.body);return {ok:true,json:async()=>({model:'gpt-4o-mini',output_text:'Consulta: prueba.',usage:{input_tokens:100,output_tokens:8}})};}});
 assert.equal(sent.max_output_tokens,450);assert.equal(sent.store,false);assert.equal(sent.input.length,2);assert.match(sent.input[0].content,/100 palabras/);assert.doesNotMatch(sent.input[1].content,/advisor/);assert.equal(data.usage.output_tokens,8);assert.equal(data.summaryMode,'compact-v1');
});
test('incomplete or failed responses are not accepted as summaries',async()=>{
 for(const data of [{status:'incomplete',output_text:'Respuesta cortada'},{output:[]}])await assert.rejects(()=>summarize([{text:'prueba'}],'test-placeholder',{fetchImpl:async()=>({ok:true,json:async()=>data})}));
});
test('API summary mode bypasses knowledge loading and uses the compact service',async()=>{
 const config=require('../lib/config-store');const previousRead=config.readConfig,previousFetch=global.fetch,previousKey=process.env.OPENAI_API_KEY;
 config.readConfig=async()=>{throw Error('Knowledge store must not load for a summary');};process.env.OPENAI_API_KEY='test-placeholder';
 const modulePath=require.resolve('../api/assistant-chat');delete require.cache[modulePath];
 try{let payload;global.fetch=async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({output_text:'Resumen ficticio',status:'completed'})};};const handler=require('../api/assistant-chat');let code,body;const res={setHeader(){},status(c){code=c;return this;},json(value){body=value;return this;}};
 await handler({method:'POST',body:{mode:'summary_test',question:'Resume',conversation:[{role:'customer',text:'Consulta ficticia'}]}},res);assert.equal(code,200);assert.equal(body.summaryMode,'compact-v1');assert.equal(payload.max_output_tokens,450);
 await handler({method:'POST',body:{mode:'image_ocr_test',question:'OCR',conversation:[{role:'customer',text:'tc70999@ad'}]}},res);assert.equal(code,200);assert.equal(payload.max_output_tokens,250);assert.match(payload.input[0].content,/OCR no verificado/);assert(!payload.input.some(x=>x.content.includes('data:image')));
 await handler({method:'POST',body:{mode:'image_ocr_test',question:'OCR',conversation:Array.from({length:3},()=>({text:'Foto'}))}},res);assert.equal(code,400);
 await handler({method:'POST',body:{mode:'image_ocr_test',question:'OCR',conversation:[{text:'a'.repeat(1201)}]}},res);assert.equal(code,400);
 }finally{config.readConfig=previousRead;global.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;delete require.cache[modulePath];}
});
