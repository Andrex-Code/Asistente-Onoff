(() => {
 const prefix='onoff-preparation-reviews-';
 const roomPattern=/^#\/room\/[^\s?#]{3,250}$/;
 const eventPattern=/^[-$A-Za-z0-9_:]{1,200}$/;
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'});
 const day=at=>format.format(at);
 const clean=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';

 function normalize(item){
  if(!item||item.state!=='preparation-review'||!roomPattern.test(item.room||'')||
   String(item.key||'').startsWith(prefix+'transfer-')||
   !Number.isFinite(item.at)||item.at<=0||item.at>Date.now()+60000)throw Error('El archivo no corresponde a un caso Por revisar.');
  const {review={}}=item;
  const category=clean(review?.category,500),detail=clean(review?.detail,500);
  if(!category||!detail)throw Error('El caso debe incluir la tipificación y el detalle.');
  const tc=/^\d{1,8}$/.test(item.tc||'')?String(item.tc):'';
  const phone=/^\d{10,15}$/.test(review.phone||'')?String(review.phone):'';
  return {
   room:item.room,tc,at:item.at,state:'preparation-review',
   title:(tc?'TC'+tc:phone?'Contacto '+phone:'Identidad pendiente')+' · '+detail,
   description:clean(item.description,12000),error:clean(item.error,1000),
   review:{category,detail,phone,dealId:/^\d+$/.test(review.dealId||'')?String(review.dealId):'',
    attention:eventPattern.test(review.attention||'')&&review.attention!=='empty'?review.attention:'',
    observations:clean(review.observations,3000)}
  };
 }

 function closure(events,item){
  const attention=item.review?.attention;
  if(!attention)return null;
  const start=events.findIndex(e=>e.id===attention);
  if(start<0||events[start].closed)return null;
  const expected=day(item.at);
  for(let index=start;index<events.length;index++){
   const event=events[index];
   if(event.day&&event.day!==expected)return null;
   if(event.closed)return event.day===expected&&eventPattern.test(event.id)&&event.id!==attention?
    {day:expected,closureId:event.id}:null;
   if(index>start&&(event.joined||event.greeting&&!(index===start+1&&events[start].joined)))return null;
  }
  return null;
 }

 const api={prefix,normalize,closure};
 if(typeof module!=='undefined')module.exports=api;
 else globalThis.ONOFFPreparationReview=api;
})();
