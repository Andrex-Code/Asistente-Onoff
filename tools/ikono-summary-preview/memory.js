(() => {
 if(window.ONOFFIkonoMemory)return;
 const owners=new Map(),rooms=new Map(),day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());let currentDay=day();
 function get(room){if(day()!==currentDay){rooms.clear();owners.clear();currentDay=day();}if(!rooms.has(room)){if(rooms.size>=12)return null;rooms.set(room,{messages:new Map(),cache:null,edited:false});}return rooms.get(room);}
 function capture(room){const state=get(room);if(!state)return null;for(const e of document.querySelectorAll('li.mx_EventTile[data-event-id]')){if(e.matches('.mx_EventTile_info')||e.querySelector('.mx_MNoticeBody'))continue;const id=e.getAttribute('data-event-id'),text=e.querySelector('.mx_EventTile_body.translate')?.textContent?.trim();if(!id||!text||owners.has(id)&&owners.get(id)!==room)continue;if(!state.messages.has(id)&&state.messages.size>=250){state.overflow=true;continue;}owners.set(id,room);state.messages.set(id,{role:'customer',text});}return state;}
 window.ONOFFIkonoMemory={get,capture};
})();
