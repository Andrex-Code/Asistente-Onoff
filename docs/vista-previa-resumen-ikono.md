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


## Flujo automático 0.4.0 · sustituye la preparación manual

A petición explícita del usuario, el script se carga automáticamente en los dos dominios ONOFF. Al abrir el formulario de resolución aparece un panel compacto, sin pulsar el icono, casillas ni botones de generación. Después de completar la clasificación compatible y mantenerla estable dos segundos se envían automáticamente hasta los últimos 40 mensajes de texto montados al servicio IA existente. La autorización para este comportamiento se dio en la conversación del proyecto. El panel indica mensajes usados y omisiones por el límite; no garantiza historial completo. Mensajes superiores a 4000 caracteres bloquean el envío. La clasificación no se transmite como hecho de la atención. No usa almacenamiento persistente, no pulsa controles de cierre ni escribe en Bitrix.

Para activar: Volver a cargar la extensión y recargar iKono. Al abrir el formulario, llenar tipificación y detalle y esperar. Cancelar detiene solicitudes pendientes; no retira texto ya recibido por el servidor. Cambiar de sala limpia el panel. El botón × permite ocultar y detener el panel. La posición superior puede superponerse al formulario en pantallas pequeñas; se puede ocultar para acceder al control cubierto.

Pruebas locales del cambio: dos comprobaciones aprobadas, incluida generación simulada sin interacción con la extensión, espera reiniciada por cambios, ninguna llamada con clasificación incompleta, cancelación antes del envío, limpieza al navegar y cero clics de resolución. Pendiente validación 0.4.0 en Brave real; la captura del usuario confirma que 0.3.1 ya produjo un borrador real con preparación manual. Identidad, cobertura y cierre siguen pendientes para el recorrido definitivo.


## TC y consumo · 0.5.0 · 2026-11-12

Detecta TC candidatas en el nombre completo citado en el diálogo de resolución; como respaldo, usa el nombre del encabezado conocido. Nunca busca TC indiscriminadamente en todo el chat. Si no puede leer la fuente, informa que no encontró TC y ofrece ingreso manual. Normaliza TC + dígitos, elimina repetidas, propone la única TC sin confirmarla automáticamente, exige elección cuando hay varias y permite ingresar otra TC. El asesor debe indicar que confirmó con el cliente y pulsar Confirmar TC para esta prueba. No verifica existencia ni asociación en Bitrix. Cambiar fuente, TC, entrada manual, confirmación, sala o cerrar formulario revoca la confirmación anterior. El resumen puede generarse con la TC pendiente; no se habilita ninguna tarea.

Optimización sin cambiar modelo ni desplegar backend: pide máximo 150 palabras, conserva una sola respuesta en memoria por sala y tramo exacto, conserva correcciones del asesor, reutiliza al cambiar clasificación o reabrir el mismo tramo, evita solicitudes duplicadas mientras una está en curso. Cambiar mensajes obliga a nueva generación; si cambian durante la solicitud, descarta la respuesta desactualizada y programa otra. Cambiar sala limpia caché y datos locales. Muestra tiempo de respuesta medido desde el envío, excluyendo la espera de dos segundos. El límite de palabras es una instrucción, no un límite estricto del servidor. Las mejoras de latencia/calidad en producción aún requieren medición real.

Pruebas locales: suite de 43 comprobaciones aprobadas, incluida detección de varias/una/ninguna TC, entrada manual inválida y válida, confirmación humana e invalidación por cambio de nombre, conservación de edición sin segunda llamada por tipificación, nueva llamada al cambiar el texto y limpieza al navegar. Sin clic de resolución y sin llamadas a Bitrix. Formulario y respuesta IA simulados; falta prueba supervisada de 0.5.0 en Brave. Adjuntos y audios siguen excluidos.

Instalación: Volver a cargar la extensión desde la carpeta actualizada y recargar iKono; verificar 0.5.0. Abrir formulario, elegir/confirmar TC con el cliente, completar tipificación y detalle y revisar resumen. Salir con Cancelar. No pulsar botones nativos de resolución para esta prueba.


## Inicio inmediato 0.5.1 · 2026-11-12

El usuario validó detección de TC en Brave con 0.5.0 y reportó 14,3 s de generación. 0.5.1 inicia la lectura y solicitud al detectarse la apertura del formulario nativo de resolución, sin esperar tipificación, detalle, confirmación TC ni temporizador de dos segundos. Los campos no reinician la generación. La TC sigue requiriendo confirmación humana local y Bitrix continúa sin consultas ni escrituras. Reabrir el mismo tramo reutiliza el borrador editado; un tramo distinto genera otra solicitud. Cancelar aborta solicitudes cliente pendientes, sin retirar datos que el servicio ya hubiera recibido.

43 comprobaciones locales aprobadas. Prueba del cambio: respuesta simulada recibida antes de 1,5 s desde abrir formulario con detalle vacío y TC aún sin confirmar; cambios de campo no repiten llamada; reapertura reutiliza edición y cambio de texto genera nueva llamada. No es una medición de latencia del proveedor. Pendiente validar 0.5.1 en Brave. Este cambio adelanta el trabajo al tiempo de llenado y elimina la espera previa; no modifica modelo ni despliega backend, por lo que no garantiza reducir los 14,3 s de la solicitud IA observada.

Recargar extensión, comprobar 0.5.1 y recargar iKono. Abrir formulario y comprobar estado de generación antes de llenar campos. Confirmar TC mientras se genera. Terminar con Cancelar, sin pulsar resolución definitiva.


## Ruta compacta y TC sin prefijo · 0.6.0 · 2026-11-12

La extracción admite TC explícitas con espacios o guion y números sin prefijo únicamente al inicio del nombre o al inicio de un nombre entre paréntesis. Caso verificado: `70999RODRIGO (70999Mercapremium) (6985Granos Y Licores 2001) (573227142843)` produce TC70999 y TC6985, sin duplicar TC70999 ni tomar 2001 o el teléfono. Los números sin prefijo se etiquetan como candidatos pendientes de confirmar. El límite heurístico de 1–9 dígitos excluye teléfonos largos, no certifica formato ni existencia de una TC; un negocio cuyo nombre empieza por un número puede generar un candidato falso. Se conserva selección e ingreso manual y confirmación humana obligatoria. No se infiere TC desde mensajes, fotos ni audios.

`summary_test` usa una ruta compacta en el mismo endpoint: no consulta configuración/base de conocimiento, no añade procedimientos ni historial de preguntas, pide máximo 100 palabras, limita salida a 450 tokens y no atribuye roles verificados a participantes. Conserva el modelo configurado en OPENAI_MODEL (por defecto gpt-4o-mini); sin tarifa prioritaria ni cambio a modelo más caro. Devuelve tiempo, modelo y conteo de tokens para medir consumo. Rechaza respuestas incompletas. Mantiene límites de entrada y caché local por tramo. La ruta general y Bitrix no se modifican.

Pruebas: 46 comprobaciones de la suite aprobadas, más prueba de integración de la API compacta aprobada. Formulario y API simulados; sin llamadas Bitrix. Antes del despliegue, dos solicitudes reales con el mismo caso ficticio de seis mensajes tardaron 4,409 y 3,531 s; no son comparables directamente con los 14,3 s del caso real reportado por el usuario. Publicación de la ruta compacta y medición posterior se documentarán tras verificar el despliegue.


### Publicación y medición verificadas · 0.6.0

Ruta compacta publicada en el proyecto Vercel existente desde `f45cc0af85bc1126ef88b4c4c0751afd79747fa5`, deployment `dpl_GZdpkFZZYMsnV1uHJayfLwL8HZxa`, READY. Dominio `asistente-onoff.vercel.app` verificado apuntando a ese deployment. No se modificó main; revisión contra la versión anterior confirma cambios de ejecución limitados a la ruta summary_test y su helper. Página principal y administración responden 200; preflight CORS del dominio supervisor devuelve 204.

Con el mismo caso ficticio de seis mensajes: antes 4,409/3,531 s, después 2,112/1,882 s. Nueva ruta usó `gpt-4o-mini-2024-07-18`, 223 tokens de entrada por solicitud y 77/84 de salida. La ruta antigua no devolvía consumo ni modelo, por lo que no se certifica el ahorro exacto frente a ella. Dos muestras por versión no son un benchmark controlado ni prometen ese tiempo para el caso real de 14,3 s. Las respuestas revisadas conservaron el problema, revisión y estado pendiente sin afirmar solución. [Mediciones sin datos personales](medicion-resumen-0.6.0.json).

47 comprobaciones locales únicas aprobadas (46 de la suite y prueba adicional de integración API). El usuario puede recargar 0.6.0 para detectar TC sin prefijo; la optimización del servidor ya se aplica a las extensiones anteriores que envían summary_test. Confirmación TC humana y Bitrix sin consulta/creación permanecen. Pendiente medir calidad y tiempos sobre conversaciones reales autorizadas y validar nueva heurística numérica con asesores.
