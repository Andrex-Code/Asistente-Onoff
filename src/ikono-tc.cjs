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
if(typeof module!=='undefined'&&module.exports)module.exports={parseTCCandidates};
if(typeof window!=='undefined')window.ONOFFIkonoTC={parseTCCandidates};
