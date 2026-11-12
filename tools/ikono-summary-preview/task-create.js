(() => {
 if(window.__onoffTaskCreator)return;window.__onoffTaskCreator=true;
 let panel,root,armed=null,pending=null,busy=false,pilot=null;
 const send=m=>chrome.runtime.sendMessage({type:'ONOFF_TASK_PILOT',...m});
 const tell=t=>{if(panel)panel.querySelector('[data-create-status]').textContent=t;};
 function snapshot(){const p=window.ONOFFTaskReview?.snapshot();if(!p)throw Error('Abre la vista previa y confirma la TC.');return p;}
 const canonical=p=>JSON.stringify(p);
 const digest=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(b=>b.toString(16).padStart(2,'0')).join('');
 function reviewed(){return panel.querySelector('[data-finalreview]').checked&&panel.querySelector('[data-duplicate]').checked;}
 async function prepare(){
  if(busy||pending)return;armed=null;busy=true;
  try{if(!reviewed())throw Error('Revisa el resumen y confirma la tarea PRUEBA separada.');const payload=snapshot();if(!payload.tcConfirmed||!payload.reviewed)throw Error('Confirma la TC y revisa todos los textos de hoy para esa TC.');const signature=canonical(payload);payload.revision=await digest(signature);delete payload.messages;delete payload.selectedMessageIds;payload.duplicateAcknowledged=true;const r=await send({action:'prepare',payload});if(!r.ok)throw Error(r.error);if(canonical(snapshot())!==signature||!reviewed())throw Error('El chat o tu revisión cambió. Prepara nuevamente.');armed={...r.data,signature,revision:payload.revision,room:payload.room};tell('Lista: '+r.data.title+'. Al pulsar Resolver se esperará el estado Resuelto. Aún no hay tarea en Bitrix.');}
  catch(e){tell(e.message);}finally{busy=false;}
 }
 function tileName(e){return (e.getAttribute('aria-label')||'').replace(/ con \d+ mensajes? sin leer\.?$/,'');}
 function status(e){return ['Resuelto','En seguimiento','Pendiente'].find(x=>e.querySelector('[aria-label="'+x+'"]'))||'';}
 function tiles(name){return [...document.querySelectorAll('[aria-label^="Abrir sala "]')].filter(e=>tileName(e)===name);}
 function closeDialog(){return [...document.querySelectorAll('[role="dialog"]')].find(d=>(d.getAttribute('aria-label')||document.getElementById(d.getAttribute('aria-labelledby'))?.textContent||'').trim()==='Resolver conversación');}
 function stop(event,message){event.preventDefault();event.stopImmediatePropagation();armed=null;tell(message);}
 // Window capture runs before iKono's native click handler and the passive close probe.
 window.addEventListener('click',event=>{
  const b=event.target.closest?.('button'),dialog=closeDialog();if(!b||!dialog?.contains(b))return;
  const name=b.textContent.trim();if(name==='Cancelar'||name==='Cerrar diálogo'){armed=null;pending=null;return;}
  if(name!=='Resolver conversación'||!panel?.querySelector('[data-create-enable]').checked)return;
  if(!event.isTrusted)return stop(event,'El cierre debe pulsarlo el asesor.');
  if(pending)return stop(event,'Cierre ya solicitado. Se está comprobando su resultado.');
  let p;try{p=snapshot();}catch(e){return stop(event,e.message);}
  if(!armed||armed.expires<Date.now()||armed.signature!==canonical(p)||!reviewed())return stop(event,'La revisión cambió o falta preparar. Revisa y pulsa Preparar tarea PRUEBA antes de resolver.');
  const tile=document.querySelector('[aria-label^="Abrir sala "][aria-selected="true"]'),label=tile&&tileName(tile),before=tile&&status(tile);
  if(!tile||tiles(label).length!==1||!['En seguimiento','Pendiente'].includes(before))return stop(event,'No se puede identificar de forma única el estado de esta sala. No se solicitó el cierre.');
  pending={...armed,label,before,clickedAt:Date.now()};armed=null;tell('Cierre solicitado por el asesor. Esperando que esta sala pase a Resuelto; aún no se envió a Bitrix.');
 },true);
 async function commit(m){if(busy)return;busy=true;try{const r=await send(m);if(!r.ok)throw Error(r.error);tell('Tarea PRUEBA #'+r.data.taskId+' · '+r.data.stage);const a=document.createElement('a');a.href=r.data.url;a.target='_blank';a.rel='noopener';a.textContent='Abrir tarea #'+r.data.taskId;panel.querySelector('[data-create-status]').append(' ',a);pending=null;panel.querySelector('[data-create-enable]').checked=false;}catch(e){tell(e.message+' Usa Consultar resultado; no crees otra tarea manualmente.');}finally{busy=false;}}
 function tick(){
  if(!panel){root=document.getElementById('onoff-ikono-auto-summary')?.shadowRoot;const box=root?.querySelector('[data-description]')?.closest('details');if(!box)return;
   panel=document.createElement('section');panel.innerHTML='<h4>Tarea PRUEBA desde extensión · 0.15.0</h4><p data-pilot-context>Piloto de una tarea. El radicado anterior se conserva intacto.</p><label><input type="checkbox" data-create-enable>Crear tarea PRUEBA al verificar el cierre de esta sala</label><label style="display:block"><input type="checkbox" data-finalreview>Revisé y corregí el resumen final de hoy para la TC seleccionada.</label><label style="display:block"><input type="checkbox" data-duplicate>Confirmo una tarea PRUEBA separada para esta atención, relacionada con el radicado anterior.</label><button data-prepare>Preparar tarea PRUEBA</button><button data-resume>Consultar resultado pendiente</button><p data-create-status>Creación sin preparar. Abrir o cancelar no crea tareas.</p>';box.append(panel);panel.querySelector('[data-prepare]').onclick=prepare;panel.querySelector('[data-resume]').onclick=()=>commit({action:'resume'});send({action:'info'}).then(r=>{if(r.ok){pilot=r.data;panel.querySelector('[data-pilot-context]').textContent='Piloto de una tarea para TC'+pilot.tc+'. Radicado anterior: '+pilot.previousTaskId+'. Se conserva intacto.';}else tell(r.error);});
  }
  if(armed){try{if(armed.signature!==canonical(snapshot())||!reviewed()){armed=null;tell('Cambio detectado. Se conserva tu borrador; revisa y prepara nuevamente.');}}catch{armed=null;}}
  if(!pending||busy||pending.submitted)return;
  if(location.hash!==pending.room){tell('Cambiaste de sala antes de verificar el cierre. Regresa a la sala original para continuar; no se creó tarea.');return;}
  if(Date.now()-pending.clickedAt>15*60000){tell('No se confirmó el cierre a tiempo. No se envió a Bitrix.');pending=null;return;}
  const matches=tiles(pending.label);if(closeDialog()||matches.length!==1||status(matches[0])!=='Resuelto')return;
  pending.submitted=true;const evidence={room:pending.room,revision:pending.revision,before:pending.before,after:'Resuelto',clickedAt:pending.clickedAt};commit({action:'commit',intent:pending.intent,evidence});
 }
 setInterval(tick,500);
})();

