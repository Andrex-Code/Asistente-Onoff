# 0.16.2 — historial y prevención de cierres sin preparación

Tras dos cierres adicionales, la consulta Bitrix por las TC de los chats últimos visitados no devolvió tareas creadas hoy. No se crearon tareas retroactivamente. El aviso de 0.16.1 era ambiguo: candidates.length!==1 trataba cero y varios pendientes igual; no probaba que hubiera dos tareas pendientes. No se atribuye causa definitiva a los cierres sin el diario del navegador o confirmación de preparación por el asesor.

Cambios:

- Consultar tareas PRUEBA pendientes muestra historial del piloto: creadas con enlace, cierre registrado pendiente de resultado o borrador preparado sin cierre. Cero registros tiene un mensaje propio.
- Cada pendiente tiene su botón de consulta; no se elige arbitrariamente cuando hay varios. Mostrar historial no crea ni consulta Bitrix por sí mismo.
- Se conserva TC/sala al guardar evidencia en el diario. Registros anteriores se identifican desde su borrador firmado, sin mostrar ni divulgar la capacidad privada.
- En un paquete privado con piloto multi activo, Crear tarea al cierre se marca por defecto. Resolver humano queda bloqueado si falta revisión/preparación vigente. El asesor puede desmarcarlo explícitamente para cerrar sin tarea PRUEBA. Fuera de un piloto configurado no se activa esta política.

Pruebas: historial vacío/preparado/creado sin llamadas de escritura, selección de un pendiente, protección antes del cierre no preparado y regresiones de creación/aislamiento/edición/cancelación. No se cerraron atenciones reales para probar estos cambios. Main intacta.

