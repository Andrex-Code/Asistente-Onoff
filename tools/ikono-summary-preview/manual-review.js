(() => {
 const plain=value=>String(value||'').replace(/\s+/g,' ').trim();
 function vague(value){
  const t=plain(value).toLowerCase().replace(/[.,!?¡¿;:]/g,' ').replace(/\s+/g,' ').trim();
  if(!t||/^(?:\d{1,2} \d{2}|nota de voz|mensaje de voz|audio(?: adjunto)?|me sale (?:esto|eso)|es (?:esto|eso)|mira(?: la (?:foto|imagen))?|(?:te|le) (?:env[ií]o|mand[oé]) (?:un |el )?audio)$/.test(t))return true;
  const remainder=t.replace(/\b(?:muchas gracias|de acuerdo|buenos d[ií]as|buenas tardes|buenas noches|s[ií]|no|ok(?:ay)?|vale|claro|listo|entendid[oa]|perfecto|gracias|hola|se[nñ]or[a]?|don|do[nñ]a|bien)\b/gu,'').replace(/\s+/g,'');
  return !/[\p{L}\p{N}]/u.test(remainder);
 }
 function needsManual(p,ctx){
  const rows=(p.messages||[]).map(([,m])=>m),customer=rows.some(m=>m.role==='customer'&&!vague(m.text)),outbound=rows.some(m=>m.role==='advisor'&&/\b(?:le escribo|le contacto|me comunico|nos comunicamos|lo contacto|la contacto) para\s+\S+/i.test(m.text||''));
  return (!rows.length&&!ctx.summaryReady)|| (!!ctx.customerAudioIds?.length&&!customer)||(!customer&&!outbound&&rows.length>0)||/^\s*(?:motivo|consulta)\s*:\s*(?:no (?:consta|se (?:indic[oó]|identific[oó]|pudo|especific[oó]|conoce))|sin (?:identificar|especificar)|desconocid[oa])/im.test(ctx.summary||'')||(!ctx.summaryReady&&/(?:no se encontraron textos|no hay textos|no se pudo generar|agot[oó]|supera el l[ií]mite)/i.test(ctx.generationStatus||''));
 }
 function signature(p,ctx){return JSON.stringify([p.room,p.day,ctx.scopeKey,ctx.attention,p.category,p.detail,p.messages,ctx.customerAudioIds||[]]);}
 function summary(values){const [reason,management,result]=values.map(plain);if(!reason||vague(reason)||values.some(v=>plain(v).length>320))return '';return 'Motivo: '+reason+'\nGestión: '+(management||'No consta una gestión confirmada.')+'\nResultado: '+(result||'No consta un resultado confirmado.');}
 window.ONOFFManualReview={needsManual,signature,summary,vague};
})();
