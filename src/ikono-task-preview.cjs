/* Review plan only. Deliberately contains no Bitrix write client. */
function taskPreview({tc,tcConfirmed,deal,classification,summary,dayScope,owner,responsible,participants=[],participantsComplete=false,observers=[],product,phone,priority='Baja',template}){
 if(template){responsible=template.responsible;participants=template.participants||[];participantsComplete=template.participantsComplete===true;observers=template.observers||[];product=product||template.product;priority=template.priority??priority;}
 const normalize=value=>String(value||'').normalize('NFC').trim().toLocaleUpperCase('es-CO');
 const number=String(tc||'').trim().replace(/^TC\s*/i,'');
 const blockers=[];
 if(!template?.id||!template?.project?.id)blockers.push('Plantilla y proyecto de origen pendientes de verificar');
 if(dayScope?.selectedTc!==number||dayScope?.tcScopeVerified!==true)blockers.push('Resumen pendiente de separación y revisión para la TC seleccionada');
 if(!tcConfirmed||!/^\d+$/.test(number))blockers.push('TC sin confirmar por el asesor');
 if(!deal?.id||String(deal.tc)!==number||!deal.company?.id)blockers.push('Negociación y compañía sin validar para la TC exacta');
 if(!classification?.category||!classification?.detail)blockers.push('Falta tipificación o detalle de iKono');
 if(!summary?.trim()||dayScope?.coverage!=='complete'||!dayScope.withinLimit)blockers.push('Falta resumen revisado de todo el día con cobertura verificada');
 if(!owner||!responsible||!participantsComplete)blockers.push('Propietario, responsable o equipo pendiente');
 if(!product||!/^\d{7,15}$/.test(phone||''))blockers.push('Producto o teléfono fuente pendiente');
 return {writesEnabled:false,template:template?{id:template.id,name:template.name}:null,blockers,fields:{title:`TC${number} - TIPIFICACIÓN - ${normalize(classification?.detail)}`,description:summary||'',owner,responsible,deadline:template?.deadline??null,project:template?.project||null,crm:{dealId:deal?.id||null,companyId:deal?.company?.id||null},participants,observers,custom:{Prioridad:priority,'Tipo de Incidencia':normalize(classification?.category),'Tipificación 2':null,'Gestión SAC':phone?`iKono (${phone})`:'',Producto:product||'','Tipificación TI':normalize(classification?.detail),Plataforma:number}},afterCreate:{stageName:'Finalizadas Solicitud',requiresCreatedTaskId:true,stageId:null,enabled:false},note:'Vista previa sin cliente de escritura. Responsable, equipo, proyecto y fecha límite proceden de la plantilla elegida. Recurrencia no activada. IDs/opciones REST pendientes.'};
}
module.exports={taskPreview};
