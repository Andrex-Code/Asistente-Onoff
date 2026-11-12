importScripts('hub.js','task-background.js');
chrome.action.onClicked.addListener(async tab => {
  let url;
  try { url = new URL(tab.url); } catch { return; }
  if (!tab.id || url.protocol !== 'https:' || !['onoff.a.ikono.im','onoff.s.ikono.im'].includes(url.hostname)) return;
  try { await chrome.scripting.executeScript({target:{tabId:tab.id},files:['guard.js','move.js','memory.js','classification.js','probe.js','tc.js','image-evidence.js','images.js','auto.js','task.js','closure.js','task-create.js','dashboard.js']}); }
  catch { /* No alternate access or silent retry. */ }
});
let creating;
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m?.type!=='ONOFF_LOCAL_IMAGE_OCR')return false;
 let origin;try{origin=new URL(sender.url).origin;}catch{return false;}
 if(sender.id!==chrome.runtime.id||!sender.tab||!['https://onoff.a.ikono.im','https://onoff.s.ikono.im'].includes(origin))return false;
 if(typeof m.image!=='string'||m.image.length>6000000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(m.image)){reply({ok:false,error:'Foto inválida'});return false;}
 (async()=>{
  if(!await chrome.offscreen.hasDocument()){
   creating ||= chrome.offscreen.createDocument({url:'ocr.html',reasons:['WORKERS'],justification:'Extraer texto de fotos localmente para identificar la TC sin enviar imágenes a IA.'}).finally(()=>{creating=null;});await creating;
  }
  return chrome.runtime.sendMessage({type:'ONOFF_LOCAL_OCR_INTERNAL',image:m.image});
 })().then(reply,()=>reply({ok:false,error:'El lector local no está disponible.'}));return true;
});

