# 0.22.1 — tipificaciones consecutivas sin reiniciar la extensión

## Fallo reproducido y correcciones

El QA independiente reprodujo el bloqueo del segundo chat en 0.22.0: dos recorridos fallaron incluso con servicios simulados que respondían inmediatamente. No era solamente lentitud del modelo. Al cambiar de ruta y montar Resolver en el mismo turno, el observador iniciaba el resumen nuevo antes del evento de cambio de ruta; la limpieza posterior cancelaba ese resumen.

Se sincroniza la sala antes de capturar mensajes y abrir la generación. El cambio de ruta es idempotente: si el chat nuevo ya inició su recorrido, el evento pendiente no vuelve a limpiarlo. Se reinician sus referencias y temporización, conservando el borrador y las correcciones de la sala anterior en su propia memoria.

Además, el seguimiento descarta respuestas enviadas para otra URL, una consulta anterior o un estado anterior del diálogo. Resolver conserva su prioridad local. La prioridad compartida tiene propietario, se libera al cambiar de sala y caduca sin señal reciente. Una sala distinta o una pestaña ajena no puede liberar la prioridad de otro propietario activo.

Se elimina el corte global de doce salas en memoria y seguimiento. Los chats visitados se conservan por día sin expulsar correcciones humanas. Se mantienen la separación por sala/atención/TC, los límites de textos por atención y la limpieza diaria; el cambio de día también limpia las líneas de tiempo.

## Alcance

Cambios del cliente de la extensión; sin cambio de modelo, llamadas adicionales de IA para detectar TC, permisos, configuración de acceso o métodos del servidor. Se conservan la TC obligatoria y asociación CRM exacta, revisión final humana, bloqueo de Resolver sin mensaje, cola y confirmación, y el orden Finalizadas Solicitud → Completar → verificar. No se crean tareas al navegar, consultar o recargar.

## Validación

**Resultado final: 100/100 pruebas aprobadas, sin fallos (88,4 s).** La batería conjunta incluye el motor cliente con servicios simulados, la extensión empaquetada, las pruebas de servidor/cola y nueve recorridos QA secuenciales. El panel de diagnóstico se revela exclusivamente dentro de su fixture para comprobarlo: sigue oculto para el asesor. El informe independiente detalla reproducción, casos y límites: [QA secuencial](qa-secuencial-0.22.md).

No se operaron ni cerraron chats reales y no se realizaron escrituras reales en Bitrix durante esta corrección. La prueba pendiente en la instalación del usuario es efectuar dos cierres consecutivos de prueba, revisar ambas TC y resúmenes y comprobar una única tarea por confirmación. No se afirma cobertura de toda posible variación del portal ni disponibilidad del servicio real.

Paquete privado local: `dist/ONOFF-resumen-0.22.1-PRUEBA.zip`. Recargar la extensión y después iKono. Código y documentación en `docs/roadmap-ikono-bitrix-trazabilidad`; main intacta. El paquete privado y sus credenciales no se publican en GitHub.
