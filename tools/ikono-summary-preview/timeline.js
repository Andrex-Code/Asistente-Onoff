(() => {
 if(window.ONOFFTimeline)return;
 const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 function dateLabel(label){const s=label.trim().toLowerCase();if(s==='hoy'||s==='today')return day();if(s==='ayer'||s==='yesterday')return 'older';const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(m)return `${m[3]}-${m[2]}-${m[1]}`;if(/^\d{4}-\d\d-\d\d$/.test(s))return s;return 'older';}
 function read(){let date=null,sender='';const items=[];
  for(const e of document.querySelectorAll('.mx_TimelineSeparator,.mx_DateSeparator,li.mx_EventTile[data-event-id]')){
   if(e.matches('.mx_TimelineSeparator,.mx_DateSeparator')){date=dateLabel(e.getAttribute('aria-label')||e.textContent);continue;}
   const raw=e.querySelector('time[datetime]')?.getAttribute('datetime')||e.getAttribute('data-timestamp');let eventDay=date;
   if(raw&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(raw)&&Number.isFinite(Date.parse(raw)))eventDay=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(raw));
   const avatar=e.querySelector('.mx_EventTile_avatar [title]')?.getAttribute('title');if(avatar)sender=avatar;else if(!e.classList.contains('mx_EventTile_continuation'))sender='';
   const text=e.querySelector('.mx_EventTile_body.translate')?.textContent?.trim()||e.querySelector('.mx_TextualEvent')?.textContent?.trim()||'';
   const bot=/^@(?:menubot|acd|wb_whatsappbot)/i.test(sender),advisor=/^@(?:agente|supervisor)\d*:/i.test(sender)||e.dataset.self==='true'&&!bot;
   const notice=e.matches('.mx_EventTile_info')||!!e.querySelector('.mx_MNoticeBody');
   const closed=notice&&/chat resuelto/i.test(text),joined=advisor&&notice&&/se ha unido a la sala/i.test(text);
   const greeting=advisor&&!notice&&/^(?:hola\b|buen(?:os|as)\s+(?:d[ií]as|tardes|noches)|bienvenid[oa])/i.test(text)&&/(?:mi nombre|soy |gestor|asesor|podemos ayudar|puedo ayudar|ayudarte|servicio|soporte)/i.test(text);
   items.push({id:e.dataset.eventId,day:eventDay,text,role:advisor?'advisor':bot?'bot':'customer',notice,closed,joined,greeting,photo:!!e.querySelector('.mx_MImageBody')});
  }return items;
 }
 function sessions(events){const result=[];let current=null,closed=false;
  for(const e of events){if(e.day!==day())continue;if(e.closed){closed=true;continue;}
   if(e.role==='bot')continue;
   if(e.notice&&!e.joined)continue;
   const split=!current||closed||(e.greeting&&current.greeting&&current.messages.size>1);
   if(split){current={id:e.id,reason:closed?'Reapertura tras cierre':e.greeting?'Saludo del asesor':'Inicio visible de atención',messages:new Map(),photoIds:[]};result.push(current);closed=false;}
   if(e.joined&&!current.anchor){current.id=e.id;current.anchor=true;}if(e.greeting){if(!current.anchor){current.id=e.id;current.anchor=true;}current.greeting=true;}
   if(e.photo)current.photoIds.push(e.id);
   if(!e.notice&&e.text)current.messages.set(e.id,{text:e.text,role:e.role,day:e.day});
  }return result;
 }
 window.ONOFFTimeline={day,read,sessions};
})();
