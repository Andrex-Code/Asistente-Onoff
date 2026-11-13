# 0.20.0 — atención de hoy y estados visibles

## Hallazgo real

La inspección DOM de la sala de pruebas mostró `.mx_TimelineSeparator[aria-label]` con `hoy`, `ayer` y día de semana, además de eventos `.mx_TextualEvent` de salida por Chat resuelto y entrada del asesor. Las horas visibles no incluyen fecha absoluta fiable. La captura anterior acumulaba texto de la sala sin aplicar esos separadores: el control humano del alcance no evitaba que el borrador inicial incluyera historia antigua. No se cerraron chats ni se crearon/editaron tareas durante esta corrección. La tarea 523536 aparece en las capturas y en el estado visible como creada; esta versión no la modifica retroactivamente.

## Nuevo alcance

- Solo se admiten textos asociados a Hoy o a fecha absoluta de hoy en America/Bogota. Texto sin fecha verificable se excluye; si faltan textos actuales se pide cargar el separador/atención. No se asume que un mensaje es de hoy porque esté cargado.
- La memoria por sala conserva eventos y orden al cargar historia anterior. Se divide por cierre/reapertura y saludo de asesor identificado. El primer saludo conserva el contexto inicial del cliente; un nuevo saludo de bienvenida de asesor después de otro saludo puede indicar otra atención. Un simple Hola del cliente no divide.
- El saludo es una señal inferida, no un ID oficial de atención. Transferencias, mensajes no cargados o formatos nuevos pueden exigir elegir/corregir el tramo. La tarjeta ofrece las atenciones detectadas de hoy y elige la última por defecto. La revisión de alcance por asesor permanece obligatoria. No se declara cobertura completa automáticamente.
- Resumen, TC, fotos y correcciones quedan ligados a la atención seleccionada. Fotos OCR limitadas a esa atención; bots/encuestas y contactos anteriores quedan fuera del texto para resumir. Selección manual de textos permite excluir otras TC dentro del mismo contacto.
- El resumen de atención usa todos sus textos dentro de límites (250 textos/48000 caracteres/4000 por texto), con el mismo modelo y salida de 450 tokens. No aumenta llamadas por actualización ni trunca silenciosamente a 40. Si supera los límites se detiene para revisión.
- El servidor firma la atención en el alcance de creación, además de sala/día/TC. Diferentes contactos pueden generar tareas separadas; la repetición/reintento de uno conserva idempotencia. Los borradores legados siguen usando su firma y alcance originales.

## Interfaz

TC única: distintivo compacto y opción Cambiar TC, manteniendo confirmación humana. Sin TC o varias: selector/ingreso desplegado. Al confirmar se consulta su asociación en Bitrix; no se confirman candidatas automáticamente. La tarjeta se coloca antes de los botones finales de iKono, sin exigir diagnóstico.

Guardar revisión muestra preparación en curso y se deshabilita; Resolver permanece deshabilitado mientras falta validación o preparación. Al terminar aparece Lista para resolver. Errores y cambios invalidantes se muestran en esa misma tarjeta. No se necesitan varios clics para preparar. No se envían clics artificiales a iKono.

La confirmación posterior queda centrada y adaptable al ancho, con colores explícitos para evitar heredar texto claro sobre fondo blanco, hover/foco/estado deshabilitado y mensaje Creando tarea. Historial y borradores anteriores plegados; confirmaciones/fallos permanecen visibles. No se ofrece Más tarde. Se mantienen lápiz, campos bloqueados, revisión humana y cola duradera.

## Validación

59 pruebas pertinentes aprobadas antes del último ajuste visual, con repeticiones dirigidas tras él: captura Hoy/Ayer, exclusión sin fecha, sesiones y memoria aisladas, reinserción de historia, saludo de cliente frente a asesor, carga solo de textos actuales al servicio, conservación de 55 mensajes sin recorte, límites del servicio, TC y CRM, bloqueo durante preparación, un solo clic humano, contraste en tema oscuro, editor, cierre correlacionado e idempotencia/reintentos. Servicios simulados; no se ejercitan escrituras reales.

Entrega privada: `dist/ONOFF-resumen-0.20.0-PRUEBA.zip`. Recargar extensión e iKono para activar. Cambios en rama `docs/roadmap-ikono-bitrix-trazabilidad`; main intacta. El servidor requiere desplegar esta revisión por el nuevo modo de resumen y alcance de atención. Pendiente ensayo de usuario en chat de pruebas; no confundir pruebas automatizadas con cierre real verificado en esta versión.

## Actualización 0.20.1 — etapa y después Completar

A petición del usuario, las nuevas preparaciones firmadas exigen completar la tarea después de verificar la etapa Finalizadas Solicitud. Se usa [tasks.task.complete](https://apidocs.bitrix24.com/api-reference/tasks/status/tasks-task-complete.html), luego se vuelve a consultar estado 5 y etapa destino. Solo entonces se devuelve éxito Completada al asesor. El hito de etapa se conserva antes de completar. Error o respuesta perdida al completar se recupera sobre el mismo ID; si ya está en estado 5 no se repite el método. La cola no guarda éxito parcial. Estado 4 por control/aprobación no se presenta como Completada ni se aprueba automáticamente.

Tres regresiones adicionales: orden etapa-completar y recuperación tras fallo, respuesta perdida sin segundo completar, y estado pendiente de aprobación sin falso éxito. 62 escenarios pertinentes en total, con verificaciones dirigidas. Tareas y borradores firmados anteriores no se modifican retroactivamente: para probar la nueva obligación se debe preparar desde 0.20.1. No se cambia el resumen histórico de la tarea 523536. Paquete final: dist/ONOFF-resumen-0.20.1-PRUEBA.zip.
