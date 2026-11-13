/* Candidate detection from the room name only. Human confirmation is mandatory. */
function parseTCCandidates(name) {
 const found=new Map(),text=String(name||'');
 const add=(digits,source)=>{const code='TC'+digits;if(!found.has(code)||source==='explicit')found.set(code,{code,source});};
 for(const m of text.matchAll(/\bTC\s*[-:]?\s*(\d+)\b/gi))add(m[1],'explicit');
 // Unlabelled numbers: only at the start of the name or a parenthesized name.
 // 1–9 digits is a heuristic to exclude phone numbers, not a validated TC format.
 for(const m of text.matchAll(/(?:^|\()\s*(\d{1,9})(?!\d)\s*[-–—:]?\s*(?=\p{L})/gu))add(m[1],'position');
 // A short numeric suffix separated from the customer's name is only a candidate.
 const suffix=text.match(/^[^()\d]{1,120}[-–—]\s*(\d{1,9})(?!\d)(?=\s*(?:\(|$))/u);
 if(suffix&&!(suffix[1].length===4&&Number(suffix[1])>=1900&&Number(suffix[1])<=2099))add(suffix[1],'position');
 return [...found.values()];
}
// Contextual extraction is deliberately separate from positional room-name rules.
// A bare number is accepted only as the direct answer to a request for the TC.
function parseChatTCCandidates(messages){
 const found=new Map(),items=(messages||[]).map(m=>String(m?.text||'').normalize('NFKC'));
 const label='(?:T\\.?\\s*C\\.?|c[oó]digo\\s+(?:(?:de\\s+(?:la\\s+)?|del\\s+))?(?:tienda|establecimiento)|plataforma)';
 const connector='(?:\\s*(?:[-:#=]|es|ser[ií]a|corresponde\\s+a|n[uú]mero|n[uú]m\\.?|nro\\.?|no\\.?|de\\s+la\\s+tienda)\\s*){0,3}';
 const pattern=new RegExp('\\b'+label+connector+'\\s*(\\d{1,8})(?!\\d|[.,/-]\\d)','gi');
 const add=(digits,text,uncertain,source)=>{const code='TC'+digits,item=found.get(code)||{code,source,uncertain:false,evidence:[]};item.uncertain ||= uncertain;item.evidence.push(text.slice(0,240));found.set(code,item);};
 for(let i=0;i<items.length;i++){
  const text=items[i];for(const m of text.matchAll(pattern)){
   const around=text.slice(Math.max(0,m.index-55),Math.min(text.length,m.index+m[0].length+35));
   const uncertain=/[?¿]|\b(?:no|otra|anterior|antes|equivocad[ao]|ejemplo)\b/i.test(around);
   add(m[1],text,uncertain,'explicit-chat');
  }
  if(i&&/^\s*\d{1,8}\s*$/.test(text)&&new RegExp('(?:cu[aá]l|confirma|indica|comparte|env[ií]a|reg[aá]la|dime|n[uú]mero|c[oó]digo)[\\s\\S]{0,90}'+label,'i').test(items[i-1]))add(text.trim(),text,false,'answer-to-tc');
 }
 return [...found.values()];
}
if(typeof module!=='undefined'&&module.exports)module.exports={parseTCCandidates,parseChatTCCandidates};
if(typeof window!=='undefined')window.ONOFFIkonoTC={parseTCCandidates,parseChatTCCandidates};
