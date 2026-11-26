/* Context gate: local, scoped, no media download or transcription. */
(() => {
 const plain=value=>String(value||'').replace(/\s+/g,' ').trim();
 const norm=value=>plain(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.,!?¡¿;:]/g,' ').replace(/\s+/g,' ').trim();
function vague(value){
 const t=norm(value);
 if(!t||/^(?:\d{1,2} \d{2}|nota de voz|mensaje de voz|audio(?: adjunto)?|imagen(?: adjunta)?|foto(?: adjunta)?|archivo adjunto|me sale (?:esto|eso)|es (?:esto|eso)|mira(?: la (?:foto|imagen))?|(?:te|le) (?:envio|mando) (?:un |el )?audio)$/.test(t))return true;
 const remainder=t.replace(/\b(?:muchas gracias|de acuerdo|buenos dias|buenas tardes|buenas noches|si|no|ok(?:ay)?|vale|claro|listo|entendid[oa]|perfecto|gracias|hola|senor[a]?|don|dona|bien|por favor)\b/gu,'').replace(/\s+/g,'');
 return !/[\p{L}\p{N}]/u.test(remainder);
}
function generic(value){
 const t=norm(value);
 return vague(t)||/^(?:consulta|solicitud|atencion|contacto|informacion|ayuda|soporte|asesoria)(?: (?:general|comercial|al cliente|del cliente|de cliente|de servicio|de soporte|de informacion|de atencion(?: al cliente)?|de ayuda|de asesoria|sin detalle|pendiente))*$/.test(t)||
 /^(?:no (?:consta|se (?:indico|identifico|pudo|especifico|conoce))|sin (?:identificar|especificar)|desconocid[oa])\b/.test(t)||
 /^(?:necesito|quiero|quisiera|solicito|me puede(?:n)? dar|me gustaria recibir|tengo|podria recibir|puede ayudarme con) (?:una? )?(?:ayuda|informacion|consulta|duda|problema|pregunta|solicitud|soporte|asesoria)(?: por favor)?$/.test(t);
}
function specificCustomer(value){
 const t=norm(value);
 if(generic(t)||/^(?:como esta|como estas|que tal|aqui estoy|buen dia|me puede ayudar|me pueden ayudar|me ayudas|necesito que me ayude|necesito ayuda|quiero hablar con (?:un )?asesor|me sale un error|no me funciona|no funciona|no puedo|no se puede|es esto|eso es|ya lo hice|ya hice eso|ahi esta|le envio|te envio|le mande|te mande)(?: por favor)?$/.test(t))return false;
 return /[\p{L}]/u.test(t)&&(!/^\d+$/.test(t));
}
function specificAdvisor(value){
 const t=norm(value);
 if(generic(t)||/\b(?:en que (?:le|te) (?:puedo|podemos) ayudar|como (?:le|te) (?:puedo|podemos) ayudar|mi nombre es|soy (?:su|el|la) asesor)\b/.test(t)&&!/\b(?:factur|inventar|credito|prestamo|desembolso|cuota|pago|cobro|producto|resolucion dian|pos|impresor|cartera|retiro|contrato|usuario|contrasena|sincroniz|bloque|capacit|plataforma|venta|devoluc|saldo|plan|licencia|tienda|modulo|internet|conexion)\w*/.test(t))return false;
 // An advisor's bare acknowledgment, greeting or generic offer is not evidence.
 return /\b(?:factur|inventar|credit|prestam|desembols|cuot|pag|cobr|product|resolucion dian|pos|impresor|carter|retir|contrat|usuari|contrasen|sincroniz|bloque|capacit|plataform|vent|devoluc|sald|plan|licenci|modul|internet|conexion|error|caj|recib|proveedor|contabil|iva|impuest|report|document|anul|pedido|equipo|tarjet|banc|recaud|instal|actualiz|registro|acces|configur|sistem)\w*/.test(t)&&/\b(?:su|sus|el|la|los|las|un|una|para|de|del|sobre|que|debe|puede|tiene|revis|solicit)\w*\b/.test(t)&&!/\b(?:en que (?:le|te) (?:puedo|podemos) ayudar|como (?:le|te) (?:puedo|podemos) ayudar)\b/.test(t);
}
function motive(value){
 const match=String(value||'').match(/(?:^|\n)\s*\*{0,2}(?:motivo|consulta)\*{0,2}\s*:\s*\*{0,2}\s*([^\n]+?)(?=\s+(?:\*{0,2}(?:gesti[oó]n|revisi[oó]n|resultado)\*{0,2}\s*:)|\n|$)/i);
 return plain(match?.[1]||'');
}
function assess(p,ctx){
 const rows=(p.messages||[]).map(([,m])=>m||{}).filter(m=>m.role!=='bot');
 const customers=rows.filter(m=>m.role==='customer'), advisors=rows.filter(m=>m.role==='advisor');
 const unknown=rows.filter(m=>!['customer','advisor'].includes(m.role));
 const audio=!!ctx.customerAudioIds?.length,photo=!!ctx.photoIds?.length;
 const clear=customers.some(m=>specificCustomer(m.text))||unknown.some(m=>specificCustomer(m.text));
 const explanation=advisors.some(m=>specificAdvisor(m.text));
 const outbound=advisors.some(m=>/\b(?:le escribo|le contacto|me comunico|nos comunicamos|lo contacto|la contacto) para\s+\S+/i.test(m.text||'')&&specificAdvisor(m.text));
 const noResponse=!customers.length&&!unknown.length&&!audio&&!photo&&advisors.length>0&&(/\b(?:sin respuesta|no responde|no contesta|no fue posible contactar|contacto fallido)\b/.test(norm(p.category+' '+p.detail))||outbound);
 if(noResponse)return {required:false,reason:'no-response',summary:outbound&&ctx.summaryReady&&!generic(motive(ctx.summary))?ctx.summary:'Motivo: Contacto iniciado por el asesor sin respuesta visible del cliente.\nGestión: Se realizó un contacto saliente.\nResultado: No consta respuesta del cliente en esta atención.'};
 if((audio||photo)&&!clear&&!explanation)return {required:true,reason:audio?'audio':'image'};
 if(rows.length&&!clear&&!explanation)return {required:true,reason:'insufficient'};
 if(!rows.length){
  const failed=/(?:no se encontraron textos|no hay textos|no se pudo generar|agoto|supera el limite)/.test(norm(ctx.generationStatus));
  return {required:failed||!!ctx.summaryReady,reason:'insufficient'};
 }
 if(!ctx.summaryReady&&/(?:no se pudo generar|agoto|supera el limite)/.test(norm(ctx.generationStatus)))return {required:true,reason:'summary-unavailable'};
 const stated=motive(ctx.summary);
 if(ctx.summaryReady&&(!stated||generic(stated))){
  // If the input explains the reason, use a literal excerpt instead of asking again.
  const evidence=customers.find(m=>specificCustomer(m.text))||unknown.find(m=>specificCustomer(m.text))||advisors.find(m=>specificAdvisor(m.text));
  if(evidence){
   const quote=plain(evidence.text).slice(0,320);
   const tail=String(ctx.summary||'').match(/(?:^|\n|\s)(?:\*{0,2}(?:gesti[oó]n|revisi[oó]n)\*{0,2}\s*:)[\s\S]*$/i)?.[0]?.trim();
   return {required:false,reason:'grounded-excerpt',summary:'Motivo: '+(evidence.role==='advisor'?'Según la respuesta del asesor: ':'Según el mensaje del cliente: ')+quote+'\n'+(tail||'Gestión: No consta una gestión confirmada.\nResultado: No consta un resultado confirmado.')};
  }
  return {required:true,reason:'generic'};
 }
 return {required:false,reason:'sufficient'};
}
function signature(p,ctx){return JSON.stringify([p.room,p.day,ctx.scopeKey,ctx.attention,p.category,p.detail,p.messages,ctx.customerAudioIds||[],ctx.photoIds||[]]);}
function summary(values){const [reason,management,result]=values.map(plain);if(!reason||generic(reason)||!specificCustomer(reason)||values.some(v=>plain(v).length>320))return '';return 'Motivo: '+reason+'\nGestión: '+(management||'No consta una gestión confirmada.')+'\nResultado: '+(result||'No consta un resultado confirmado.');}
 const api={needsManual:(p,ctx)=>assess(p,ctx).required,assess,signature,summary,vague,generic};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.ONOFFManualReview=api;
})();
