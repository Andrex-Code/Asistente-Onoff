# Continuidad del piloto ONOFF — 0.17.0

## Qué funciona y dónde quedamos

Se verificó una creación real de tipificación PRUEBA desde extensión, con TC, negociación/compañía, campos de iKono, plantilla PRIMER CONTACTO, responsable y equipo. Se recuperó la etapa de ese mismo radicado y se confirmó Finalizadas Solicitud tras recargar Bitrix. La recuperación fue necesaria porque el portal trunca XML_ID a 50 caracteres; corregido y probado. No se pulsó Completar ni se cambió main.

Dos cierres posteriores no devolvieron tareas de hoy al consultar sus TC. No se recrearon retroactivamente y no se atribuyó causa definitiva sin el diario. 0.16.2 corrigió el aviso que confundía cero con varios pendientes e incorporó historial. Resumen automático y cobertura diaria todavía requieren revisión humana: en el ensayo real se corrigieron una omisión de gestión y una frase de cierre anticipado.

El último pedido cambia la interacción: después de Resolver, el asesor debe confirmar crear la tarea. Se implementa ahora en 0.17.0; no se ha validado con otro cierre real.

## Recorrido 0.17.0

1. Abrir el chat/formulario. Confirmar TC, consultar y seleccionar negociación exacta. Revisar textos de hoy de esa TC y descripción Motivo/Gestión/Resultado. Mantener las correcciones humanas.
2. Al marcar la revisión final, la vista previa se prepara automáticamente tras una pausa breve y conserva el borrador firmado. Preparar vista previa sigue disponible para reintento explícito. Este paso solo consulta Bitrix, no crea tareas.
3. El asesor pulsa Resolver conversación en iKono. Si falta un requisito o cambió la revisión, el piloto explica lo que falta antes de permitir el cierre. La opción del piloto puede desmarcarse explícitamente para cerrar sin tarea PRUEBA. Resolver sin mensaje permanece bloqueado.
4. Tras la señal de cierre, aparece la vista previa con TC, título, resumen y **Confirmar crear tarea PRUEBA**. Todavía no hay tarea en Bitrix. Cerrar el aviso aplaza la decisión y conserva el registro.
5. Solo el clic explícito de confirmación solicita crear. Reserva duradera e identidad normalizada protegen contra duplicados. Se verifica el ID y se pasa a Finalizadas Solicitud sobre la misma tarea.
6. En Inicio, Consultar tareas PRUEBA pendientes distingue creadas, pendientes de resultado, pendientes de confirmación, borradores y preparaciones vencidas. Cada registro tiene su acción individual. Recargar/listar/aplazar nunca confirma una creación.

El servidor requiere confirmation=true para una primera creación cuando el piloto tiene requireConfirmation activo. Recuperar una tarea ya creada continúa sin otro add. La confirmación es una acción de UI autenticada, no prueba independiente de API iKono.

## Límites que siguen pendientes

- La salida a encuesta se infiere por clic humano + retiro de modal/tarjeta + Inicio estable, sin nuevas acciones ni alertas. Fue contrastada con un reporte ON_RATING; no es recibo de API iKono. No se descargan reportes en operación.
- Historial diario y separación de varias TC dependen de la revisión del asesor. No se garantiza paginación completa ni interpretación de audios. OCR es apoyo condicionado, no confirmación automática.
- Una preparación firmada vence a los 30 minutos o al vencer el piloto. El borrador se conserva, pero no se crea con autorización vencida. No se reabre una atención para reconstruirla automáticamente.
- Por diseño hay una tipificación por sala/día/TC. Reaperturas del mismo alcance no generan otra tarea automáticamente ni actualizan la existente.
- Bitrix asignó una fecha límite en el ensayo sin que se enviara DEADLINE. Falta revisar la política del portal; no se elimina ni se atribuye a una automatización concreta sin evidencia.

## Continuar desde otro equipo

Rama: docs/roadmap-ikono-bitrix-trazabilidad. Issue #38. Código y tests están en GitHub; datos de clientes, reportes, capturas, capacidad del piloto y ZIP privado permanecen fuera del repositorio.

Instalar dependencias del repositorio y ejecutar:

```text
node --test tests/ikono-task-create.test.cjs tests/ikono-task-journal.test.cjs tests/ikono-task-create-browser.test.cjs tests/ikono-task-panel.test.cjs tests/ikono-closure-handoff.test.cjs
node scripts/build-ikono-summary-preview.cjs
```

El paquete generado sin --pilot es seguro y no tiene autorización de escritura. El paquete privado se genera con --pilot usando dist/task-pilot-private.json local; no se debe subir ese archivo ni el ZIP privado a GitHub. En otro equipo hay que volver a preparar la capacidad privada con la conexión existente a Vercel y conservar el scope si se quiere recuperar el diario del mismo navegador. El diario local no se transfiere por clonar el repositorio.

Backend: proyecto asistente-onoff, ruta existente /api/bitrix/search-task para acciones del piloto, sin agregar funciones al límite Hobby. Activación requireConfirmation en configuración privada IKONO_TASK_PILOT; secretos Bitrix solo en servidor. No extender permisos ni generar claves OpenAI para probar este cambio.

## Siguiente ensayo

Cargar 0.17.0 y realizar un cierre autorizado: comprobar cero tareas antes del clic final, aplazar y reabrir el aviso desde historial, confirmar y verificar un solo radicado/etapa. Probar recarga y error de red con el mismo radicado. No volver a resolver clientes ya cerrados ni recrear registros sin revisión.

