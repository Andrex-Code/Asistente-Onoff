# 0.18.0 — editor real y cola persistente

## Recorrido

Revisar TC, negociación y resumen → Resolver humano → vista previa obligatoria → lápiz para editar borrador o check para confirmar creación real PRUEBA → Bitrix → Finalizadas Solicitud. Se retiraron Más tarde y el cierre del aviso de confirmación. En el piloto activo no se puede desmarcar la tipificación. Se corrigió además que crear una tarea desactivara el piloto para el siguiente chat.

La edición del lápiz ya usa el servicio real, no la maqueta de conversación. Permite resumen, título (prefijo TC obligatorio), producto, prioridad, teléfono de Gestión SAC y TC/negociación. La compañía se deriva de la negociación validada en servidor. Cambiar asociación exige confirmar nuevamente alcance del resumen y asociación exacta de TC.

Tipificación, detalle, responsable, participantes, observador y proyecto son inmutables para el editor. El servidor rechaza intentos de enviar esos cambios, aunque se manipule la interfaz. No se implementa edición arbitraria de tareas ya creadas: una vez confirmado un envío, hay que recuperar su resultado antes de cambiar el borrador. Se evita alterar una tarea cuyo resultado pudo perderse por un timeout.

## Reintentos y fallos

Tras confirmación: un intento inicial y hasta tres reintentos automáticos, separados por 1, 3 y 10 minutos. Son cuatro intentos máximos por ciclo automático. chrome.alarms conserva los horarios y el diario guarda intentos, error, próxima ejecución y resultado. El reinicio del servicio o navegador recupera los pendientes. Dos solicitudes simultáneas comparten el mismo envío en curso.

Todos los intentos usan exactamente el mismo borrador firmado. La reserva duradera del servidor impide repetir task.add cuando la respuesta original fue incierta. Se reconcilia XML_ID y se recupera el mismo ID/etapa. Un fallo persistente queda en la bandeja de tipificaciones pendientes/fallidas; el asesor u operador puede revisar y reintentar expresamente. No se borra al agotar reintentos. Autorización vencida o errores de validación detienen el ciclo y requieren revisión.

La cola no envía borradores sin confirmación humana. La bandeja muestra resultados inciertos sin afirmar que no exista una tarea en Bitrix. La futura integración en el Asistente principal debe reutilizar este diario; aún no se cambia main.

## Pruebas y entrega

38 escenarios pertinentes aprobados antes del último ajuste de continuidad del piloto; repetidos los escenarios de cierre y editor tras dicho ajuste. Incluyen edición y creación simuladas, campos bloqueados, asociación CRM, truncamiento de XML_ID, cuatro intentos máximos, alarmas tras reinicio, exclusión de concurrencia, recuperación y conservación de errores. Se probó la escritura mediante llamadas simuladas a Bitrix; el siguiente ensayo real debe usar el chat de pruebas autorizado del usuario. No se crearon tareas de clientes al desarrollar esta versión.

Paquete privado: dist/ONOFF-resumen-0.18.0-PRUEBA.zip. Permiso nuevo: alarms, para reintentos aun sin panel abierto. Se debe recargar la extensión y después iKono; no se actualiza automáticamente una copia ya ejecutándose. La capacidad privada de prueba permanece temporal y fuera de GitHub. Los datos del diario son locales a ese perfil/navegador.

## Límites conservados

La captura diaria y separación por TC siguen requiriendo revisión. La salida de iKono se detecta mediante señales correlacionadas de interfaz, no recibo independiente de API. La preparación/evidencia tienen vencimientos; un pendiente vencido se conserva pero no se envía con autorización antigua. La fecha límite que añade Bitrix sigue pendiente de regla. El editor modifica el borrador antes de crear, no cualquier tarea del portal.

