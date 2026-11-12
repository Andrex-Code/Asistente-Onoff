# Vista previa independiente de resumen · 0.3.0

Permite evaluar un borrador sobre un tramo de una conversación autorizada, incluso real, sin resolverla ni escribir en Bitrix. No certifica el recorrido completo de una atención.

## Preparación

Ejecutar `node scripts/build-ikono-summary-preview.cjs`. Cargar la carpeta `dist/ikono-summary-preview` como extensión descomprimida en Edge o Chrome, desde Administrar extensiones → Modo desarrollador → Cargar descomprimida. Desactivar la extensión anterior de prueba durante esta revisión para evitar paneles duplicados. Abrir iKono y pulsar el icono de la nueva extensión.

## Prueba del asesor

1. Abrir una conversación cuyo uso para esta revisión esté autorizado. Cargar el historial que se desea revisar antes de capturar.
2. Confirmar el uso y pulsar **Leer mensajes disponibles**. Seleccionar inicio y fin; revisar el texto mostrado. La captura contiene solo mensajes de texto montados en pantalla, sin adjuntos. Máximo 40 mensajes de 4000 caracteres cada uno; se rechazan tramos mayores.
3. Autorizar expresamente el envío de ese tramo al backend existente del Asistente ONOFF y a OpenAI. Activar la generación automática.
4. Abrir **Resolver chat** y seleccionar tipificación y detalle. Tras dos segundos sin cambios comienza la solicitud; la respuesta depende del tiempo de la IA. Cambiar la clasificación reinicia la espera y descarta el borrador anterior.
5. Revisar y corregir el borrador. **No pulsar Resolver conversación**; usar **Cancelar** para abandonar el formulario. También se puede generar manualmente con el botón del panel.

El panel intenta ubicarse al lado del formulario. Si no hay espacio lateral suficiente, se oculta para dejar accesibles los controles de iKono y reaparece al cancelar. Cancelar detiene la espera pendiente, pero una solicitud ya enviada puede terminar. Cambiar de sala, retirar autorización o cerrar el panel borra los datos locales y aborta la solicitud cliente; no puede retirar datos ya recibidos por el servidor. No usa almacenamiento persistente ni incluye claves.

## Evidencia y límites · 2026-11-12

41 comprobaciones locales aprobadas, incluida una prueba de navegador con formulario y respuesta IA simulados: sin consentimiento no hay envío; cambios sucesivos respetan la espera; una sola solicitud; cero activaciones del cierre; limpieza al cambiar de sala. No equivale a una prueba de esta versión contra una conversación real ni de calidad del modelo. El endpoint existente había sido comprobado con mensajes ficticios en la versión anterior.

Pendiente: instalar 0.3.0 y revisar con el asesor un tramo real autorizado. No están resueltos la identidad de atención, cobertura completa del historial ni cierre definitivo. La integración de tareas en Bitrix sigue desactivada. El backend existente sigue requiriendo el endurecimiento de acceso ya identificado; esta entrega no modifica ni despliega el backend.


## Corrección 0.3.1 · supervisor en Brave

La captura del usuario mostró `onoff.s.ikono.im`. La versión 0.3.0 limitaba tanto la inyección como el observador a `onoff.a.ikono.im`, por lo que no se activaba en ese dominio. 0.3.1 admite ambos hosts HTTPS exactos. 42 comprobaciones locales aprobadas, incluida generación simulada en el dominio de supervisor y rechazo de hosts ajenos. Pendiente repetir en Brave real. El rol supervisor no certifica la identidad de los participantes; no cerrar la atención de la asesora.

Recargar la extensión desde la misma carpeta o extraer el ZIP nuevo y cargarla. Recargar iKono y pulsar el icono; revisar mensajes, autorizar envío y activar automático antes de completar tipificación y detalle. En ventanas sin espacio lateral el panel permanece oculto durante el formulario y reaparece con Cancelar. No pulsar ninguno de los dos botones de resolución.
