function imageEvidence(text,confidence=0) {
 const value=String(text||''),found=new Map();
 for(const m of value.matchAll(/\bTC\s*[-:]?\s*(\d+)\b/gi))found.set('TC'+m[1],{code:'TC'+m[1],reading:m[0],kind:'prefijo TC'});
 // POS footer only: preserve the complete reading, don't interpret terminal suffixes.
 for(const m of value.matchAll(/^\s*(\d{4,9})\s*(?:\/|[y|])\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*$/gm)){
  const [first,second,third]=m.slice(1).map(Number);
  if(first>=1900&&first<=2100&&second>=1&&second<=12&&third>=1&&third<=31)continue;
  found.set('TC'+m[1],{code:'TC'+m[1],reading:m[0].trim(),kind:'posible pie del POS; separadores OCR sin verificar'});
 }
 // Plain AnyDesk IDs and unrelated numbers are never TC evidence.
 return {candidates:[...found.values()],text:value.slice(0,650)+'\n'+(value.length>650?value.slice(-350):''),confidence:Number(confidence)||0};
}
if(typeof module!=='undefined'&&module.exports)module.exports={imageEvidence};
if(typeof window!=='undefined')window.ONOFFIkonoImageEvidence={imageEvidence};
