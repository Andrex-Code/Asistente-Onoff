(() => {
 window.ONOFFIkonoImages={create({root,onCandidates}){
  const panel=document.createElement('div');panel.innerHTML='<h4>Lectura de fotos · local</h4><p id="imageStatus"></p><ul id="imageEvidence"></ul><label>Complemento de fotos (OCR)<textarea id="imageSummary" aria-label="Complemento de fotos" placeholder="El resumen principal no espera a las fotos"></textarea></label><small>Máximo 2 fotos cargadas por sala. Solo texto extraído; no interpreta objetos ni prueba que el problema se resolvió. Las fotos no salen del navegador; su texto sí se envía a IA.</small>';root.querySelector('section').append(panel);
  const status=t=>panel.querySelector('#imageStatus').textContent=t,summary=panel.querySelector('textarea');
  let generation=0,room='',cache=new Map(),supplement=null,request=null;
  function stop(){generation++;if(request)supplement={text:'',status:'Complemento detenido. No se repite la solicitud al reabrir.'};request?.abort();request=null;status('Lectura de fotos detenida. El resumen principal se conserva.');}
  function clear(){stop();room='';cache.clear();supplement=null;summary.value='';panel.querySelector('ul').replaceChildren();status('');}
  function drawEvidence(rows){const list=panel.querySelector('ul');list.replaceChildren();const candidates=[];for(const [i,r] of rows.entries()){const li=document.createElement('li');li.textContent=r.ok?`Foto ${i+1}: ${r.evidence.candidates.map(c=>`${c.code} (${c.reading})`).join(', ')||'sin TC legible'}. Lectura OCR aproximada (${r.evidence.confidence.toFixed(0)}/100).`: `Foto ${i+1}: ${r.error}`;list.append(li);if(r.ok)for(const c of r.evidence.candidates)candidates.push({...c,photo:i+1});}onCandidates(candidates);}
  async function read(img){
   try{if(!img.complete||!img.naturalWidth||!img.naturalHeight)return {ok:false,error:'Foto todavía sin cargar; no se envió.'};
    const scale=Math.min(1,2000/img.naturalWidth,2000/img.naturalHeight),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.naturalWidth*scale));c.height=Math.max(1,Math.round(img.naturalHeight*scale));c.getContext('2d').drawImage(img,0,0,c.width,c.height);const image=c.toDataURL('image/png');c.width=c.height=0;if(image.length>6000000)return {ok:false,error:'Foto supera el límite local.'};
    const result=await chrome.runtime.sendMessage({type:'ONOFF_LOCAL_IMAGE_OCR',image});if(!result?.ok)return {ok:false,error:result?.error||'No se pudo leer la foto.'};return {ok:true,evidence:ONOFFIkonoImageEvidence.imageEvidence(result.text,result.confidence)};
   }catch{return {ok:false,error:'No se pudo acceder a los píxeles de esta foto. No se envió.'};}
  }
  async function start(){
   stop();const token=generation,current=location.hash+'|'+(window.ONOFFIkonoMemory?.get(location.hash)?.attention||'');if(current!==room){room=current;cache.clear();supplement=null;summary.value='';panel.querySelector('ul').replaceChildren();}
   const valid=()=>token===generation&&current===location.hash+'|'+(window.ONOFFIkonoMemory?.get(location.hash)?.attention||'');
   const all=[...document.querySelectorAll('li.mx_EventTile[data-event-id] .mx_MImageBody img')].filter(img=>(!window.ONOFFTimeline||window.ONOFFIkonoMemory?.get(location.hash)?.photoIds?.includes(img.closest('[data-event-id]').dataset.eventId))&&img.complete&&img.naturalWidth>80&&img.naturalHeight>40);
   const unique=[...new Map(all.map(img=>[img.closest('[data-event-id]').getAttribute('data-event-id')+'|'+img.currentSrc+'|'+img.naturalWidth+'x'+img.naturalHeight,img])).entries()];
   for(const [key,img] of unique.slice(-2)){if(cache.size>=2)break;if(!cache.has(key))cache.set(key,{img,promise:null});}
   if(!cache.size){status('No hay fotos cargadas accesibles. Confirma la TC o el contexto directamente con el cliente.');return;}
   status(`Leyendo hasta ${cache.size} fotos localmente; ${Math.max(0,unique.length-cache.size)} adicionales fuera del límite. El resumen de texto continúa aparte.`);
   const rows=[];for(const item of cache.values()){
    if(!valid())return;item.promise ||= read(item.img);const result=await item.promise;item.img=null;if(!valid())return;rows.push(result);drawEvidence(rows);
   }
   if(!valid())return;
   if(supplement){summary.value=supplement.text;status(supplement.status);return;}
   const texts=rows.map((r,i)=>r.ok&&r.evidence.text.trim()?{role:'customer',text:`OCR de foto ${i+1}, lectura no verificada: ${r.evidence.text}`}:null).filter(Boolean);
   if(!texts.length){status('Sin texto legible para complementar. Confirma la TC manualmente.');return;}
   // One extra bounded text request per room. No retry when reopening the form.
   supplement={text:'',status:'Complemento pendiente.'};request=new AbortController();const controller=request,timer=setTimeout(()=>controller.abort(),30000);status('TC candidatas disponibles. Preparando complemento breve con el texto OCR…');
   try{const response=await fetch('https://asistente-onoff.vercel.app/api/assistant-chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({mode:'image_ocr_test',question:'Complementa con texto OCR no verificado',conversation:texts,history:[]})});const data=await response.json();if(!valid())return;if(!response.ok||!data.ok||data.summaryMode!=='compact-v1'||typeof data.answer!=='string'||!data.answer.trim())throw Error('Sin complemento válido');supplement={text:data.answer,status:'Lectura completada. Si no aclara la TC o el caso, confirma directamente con el cliente. OCR puede equivocarse.'};summary.value=supplement.text;status(supplement.status);}
   catch{if(valid()){supplement={text:'',status:'No se pudo obtener el complemento; el resumen principal permanece disponible.'};status(supplement.status);}}
   finally{clearTimeout(timer);if(request===controller)request=null;}
  }
  summary.oninput=()=>{if(supplement)supplement.text=summary.value;};
  function skip(message){stop();summary.value='';panel.querySelector('ul').replaceChildren();onCandidates([]);status(message);}
  return {start,stop,clear,skip};
 }};
})();
