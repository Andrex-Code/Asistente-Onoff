# Recorrido conectado de prueba · 0.2.0

Fecha: 2026-11-11. Paquete separado, no integrado al manifiesto habitual ni main. Usuario eligió reutilizar la conexión IA existente. No se crean claves o despliegues y no existe ruta de escritura Bitrix en este paquete.

## Implementación y alcance

El icono de la extensión carga el diagnóstico anterior y un panel «Recorrido de prueba». El segundo panel requiere confirmar datos ficticios antes de armar la captura. Observa el clic Resolver chat, conserva en memoria una copia de textos DOM montados, permite delimitar un tramo, lee la categoría/detalle del diálogo y conserva el borrador al cancelar. Se oculta durante el diálogo nativo para no tapar controles.

Solo al marcar consentimiento y pulsar Generar borrador IA se envían role/text del tramo al endpoint existente https://asistente-onoff.vercel.app/api/assistant-chat, que usa OpenAI. No se envían IDs de sala/evento ni histórico del asistente. Roles basados en data-self no están semánticamente certificados; el prompt lo advierte. El resultado se trata como borrador editable, no resolución comprobada. Cambiar tramo invalida consentimiento y borrador. Cambio de sala, detener o cerrar descarta datos y aborta solicitudes; se ignoran respuestas tardías asociadas a una captura anterior. No hay almacenamiento persistente ni registro de chat en consola.

El lector de esta prueba **solo captura textos**; excluye notices y no transcribe audios/imágenes/archivos. No certifica historial completo ni límites de atención. El asesor revisa el tramo explícito. El backend existente limita a 40 mensajes y 4000 caracteres por mensaje: el panel rechaza límites superiores, no recorta silenciosamente. No se modificó el backend general ni su configuración. Sus permisos/autenticación y el dictamen de seguridad siguen pendientes para cualquier fase productiva.

La regla diagnóstica ikono-review-gate sigue separada del panel: este permite corregir un borrador incompleto y nunca lo marca como atención completa ni llama a Bitrix. La clasificación capturada permanece visible junto al borrador; todavía no se genera un objeto de tarea ni mapeo validado a Bitrix.

## Verificación realizada

- 40/40 pruebas locales en Node 24.22.1 (39 previas + escenario integrado Chromium con backend simulado). El escenario integrado se repitió tras añadir límite de 40 y ocultación del panel: aprobado. Node 22/CI pendiente.
- Chromium: consentimiento previo, snapshot, categoría/detalle, cancelación sin envío, llamada única autorizada, respuesta editable, revisión local, limpieza al cambiar sala, rechazo de 41 mensajes y cierre del panel.
- Prueba real al backend con **dos mensajes ficticios creados para el ensayo**: respuesta ok y texto no vacío. No se enviaron conversaciones iKono ni datos del XLSX. Esto comprueba disponibilidad del servicio, no calidad del resumen ni CORS desde la extensión real.
- La versión 0.2.0 aún requiere recarga manual y ensayo en iKono real. No se ha pulsado resolución final.

## Primera pasada con el asesor (sin cerrar)

1. Cerrar paneles de prueba anteriores, recargar la extensión desde Edge y abrirla en la sala de prueba. Mostrar «Recorrido de prueba · 0.2.0».
2. Confirmar datos ficticios y pulsar Preparar captura. Pulsar Resolver chat, elegir categoría/detalle y terminar con Cancelar.
3. Al reaparecer el panel, delimitar Inicio/Fin y Ver tramo. Revisar que no haya mensajes de atenciones anteriores ni datos reales. Si supera límites, detener; acotar sin considerar que el resto está cubierto.
4. Autorizar explícitamente el envío mostrado y pulsar Generar borrador IA. Si falla, mantener el borrador pendiente; no continuar al cierre definitivo.
5. Corregir el texto y pulsar Revisar borrador local. Comprobar clasificación y advertencias. Detener y borrar al finalizar.

La primera pasada prueba captura → clasificación → cancelación → resumen → revisión. La prueba con **resolución final** requiere autorización específica posterior para esa atención ficticia y comprobar si pasa a encuesta. La regla vigente sigue siendo no cerrar la atención ni escribir en Bitrix.
