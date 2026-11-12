/* No image is sent to a remote service. One local worker at a time. */
let queue=Promise.resolve();
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.type!=='ONOFF_LOCAL_OCR_INTERNAL'||sender.id!==chrome.runtime.id||sender.tab)return false;
 const task=queue.then(()=>read(m.image));queue=task.catch(()=>{});task.then(reply,()=>reply({ok:false,error:'No se pudo leer la foto localmente.'}));return true;
});
async function read(image){
 if(typeof image!=='string'||image.length>6000000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image))throw Error('Imagen inválida');
 const bytes=Uint8Array.from(atob(image.split(',')[1]),c=>c.charCodeAt(0));
 if(bytes.length<24||bytes[0]!==137||bytes[1]!==80||bytes[2]!==78||bytes[3]!==71)throw Error('PNG inválido');
 const header=new DataView(bytes.buffer);if(header.getUint32(16)*header.getUint32(20)>4000000)throw Error('Foto demasiado grande');
 let worker;let timer;let expired=false;
 try{const base=chrome.runtime.getURL('vendor/');
  const job=(async()=>{worker=await Tesseract.createWorker('spa',1,{workerPath:base+'worker.min.js',corePath:base+'core',langPath:base,workerBlobURL:false,cacheMethod:'none'});if(expired){await worker.terminate();throw Error('Lectura cancelada');}await worker.setParameters({tessedit_pageseg_mode:'11'});const {data}=await worker.recognize(image);return {ok:true,text:String(data.text||'').slice(0,12000),confidence:Number(data.confidence)||0};})();
  return await Promise.race([job,new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;reject(Error('Tiempo agotado'));},45000);})]);
 }finally{clearTimeout(timer);await worker?.terminate();}
}
