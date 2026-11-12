/* Candidate detection from the room name only. Human confirmation is mandatory. */
function parseTCCandidates(name) {
 const found=new Map(),text=String(name||'');
 const add=(digits,source)=>{const code='TC'+digits;if(!found.has(code)||source==='explicit')found.set(code,{code,source});};
 for(const m of text.matchAll(/\bTC\s*[-:]?\s*(\d+)\b/gi))add(m[1],'explicit');
 // Unlabelled numbers: only at the start of the name or a parenthesized name.
 // 1–9 digits is a heuristic to exclude phone numbers, not a validated TC format.
 for(const m of text.matchAll(/(?:^|\()\s*(\d{1,9})(?!\d)\s*[-–—:]?\s*(?=\p{L})/gu))add(m[1],'position');
 return [...found.values()];
}
if(typeof module!=='undefined'&&module.exports)module.exports={parseTCCandidates};
if(typeof window!=='undefined')window.ONOFFIkonoTC={parseTCCandidates};
