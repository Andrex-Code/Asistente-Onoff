/* Daily capture contract. No network or guesses from a bare clock time. */
function colombiaDay(instant=Date.now()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
 const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
function absoluteTime(value){
 if(typeof value==='number'&&Number.isFinite(value)&&value>=946684800000&&value<4133980800000)return value;
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return null;
 const result=Date.parse(value);return Number.isFinite(result)?result:null;
}
function createDayCapture({room,now=Date.now()}){
 let day=colombiaDay(now),records=new Map(),older=false,tail=false;
 function rollover(at){const next=colombiaDay(at);if(next!==day){day=next;records.clear();older=false;tail=false;}}
 return {
  add(items,{now:at=Date.now(),startBoundaryVerified=false,liveTailVerified=false}={}){
   rollover(at);older ||= startBoundaryVerified;tail ||= liveTailVerified;
   for(const item of items){if(!item?.id||!item.text?.trim())continue;const ts=absoluteTime(item.timestamp);records.set(item.id,{id:item.id,text:item.text.trim(),timestamp:ts,role:'unverified'});}
  },
  snapshot({now:at=Date.now()}={}){
   rollover(at);const all=[...records.values()],unknown=all.filter(r=>r.timestamp===null).length;
   const messages=all.filter(r=>r.timestamp!==null&&colombiaDay(r.timestamp)===day).sort((a,b)=>a.timestamp-b.timestamp||a.id.localeCompare(b.id));
   const chars=messages.reduce((n,m)=>n+m.text.length,0),withinLimit=messages.length<=250&&chars<=48000&&messages.every(m=>m.text.length<=4000);
   return {room,day,timeZone:'America/Bogota',messages,unknownDates:unknown,startBoundaryVerified:older,liveTailVerified:tail,coverage:older&&tail&&!unknown?'complete':'partial',withinLimit,reason:!withinLimit?'El día supera el límite; no truncar silenciosamente.':unknown?'Hay mensajes sin fecha verificable.':!older?'Falta verificar el inicio del día.':!tail?'Falta verificar el final cargado de la conversación.':'Texto del día completo según las fronteras verificadas.'};
  }
 };
}
module.exports={colombiaDay,absoluteTime,createDayCapture};
