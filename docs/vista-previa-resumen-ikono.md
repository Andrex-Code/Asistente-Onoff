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


## Lectura local de fotos y complemento · 0.7.0 · 2026-11-12

El resumen de texto se solicita inmediatamente al abrir el formulario y no espera las fotos. La extensión lee hasta las dos últimas fotos cargadas accesibles en `.mx_MImageBody` mediante OCR local empaquetado (Tesseract 7, español, worker separado). Incluye fotos de cualquier participante, pues el asesor también puede compartir la pantalla del POS. Solo se accede a píxeles ya cargados; no se consultan endpoints privados ni se eluden restricciones CORS. Fotos no cargadas, ilegibles o inaccesibles se informan como no leídas. Resolución máxima 2000 px por lado y 4 millones de píxeles; PNG local máximo 6 MB. La instalación pesa más por incluir el motor sin CDN.

No se envían imágenes a OpenAI. Solo texto OCR acotado (aprox. 1000 caracteres por foto) se envía en una solicitud adicional, independiente del resumen principal, al modo `image_ocr_test`. Máximo dos lecturas por sala/visita, una solicitud de complemento sin reintentos automáticos, salida limitada a 250 tokens y objetivo de 65 palabras, mismo modelo configurado. Cache solo en memoria durante la sala; reabrir reutiliza lecturas y ediciones. Cambiar de sala o recargar borra caché. Si se cancela una solicitud en curso, no se repite al reabrir dentro de esa sala. Cancelar/ocultar/navegar descarta resultados tardíos; no puede retirar texto ya recibido por el servidor. Una lectura OCR local ya comenzada puede terminar en segundo plano y sus resultados no se aplican al formulario cancelado.

TC candidatas: prefijo TC visible (incluido alias tipo tc70999@ad) y patrón de pie POS con número inicial de 4–9 dígitos y sufijos separados por barra; se conserva lectura completa, sin atribuir significado a sufijos. Se tolera una primera barra leída como y o |, marcada como incierta. Se excluyen fechas plausibles y números AnyDesk sin prefijo TC. Estas reglas son heurísticas, no validan formato ni existencia. OCR puede perder dígitos: el asesor debe comparar la evidencia con la foto. TC manual sigue disponible. Nuevas evidencias revocan confirmación anterior; distintas TC del nombre y fotos se presentan juntas, sin decidir por el asesor. La puntuación OCR es orientativa, no probabilidad de que la TC sea correcta.

El complemento aparece en su propio campo editable y conserva correcciones; no sobrescribe el resumen de texto ni certifica solución o cierre. Es lectura de texto en fotos, no análisis visual de objetos/colores. Audios siguen fuera de alcance. No consulta ni crea en Bitrix.

Evidencia local: 50 comprobaciones aprobadas, incluida extensión empaquetada con worker/offscreen/WASM reales en Chromium. Verifica texto antes de OCR, TC posterior revoca confirmación, complemento separado, reutilización sin llamadas nuevas y cancelación sin aplicar resultados tardíos. Pruebas con las dos imágenes aportadas, procesadas solo localmente en la extensión y con IA simulada: ambas produjeron TC70999; AnyDesk tc70999, POS 70999y2/4 (OCR), puntuaciones 73/68. No se subieron fotos ni su texto real a la IA durante estas verificaciones. La reducción inicial a 1600 px perdió dígitos en el pie POS; se aumentó a 2000 px y se añadieron exclusiones de fechas y prefijos cortos. Pendiente prueba en Brave real con fotos montadas/miniaturas; no se garantiza lectura de todo adjunto ni historial completo.

Instalación: recargar extensión desde la carpeta actualizada o cargar ZIP 0.7.0 descomprimido; recargar iKono. Asegurar fotos legibles cargadas antes de abrir formulario. Ver resumen de texto, luego sección Lectura de fotos y TC candidatas. Si hay diferencias, verificar con el cliente y confirmar manualmente. Terminar con Cancelar para esta prueba. Publicación del modo de complemento y prueba ficticia remota se documentarán tras verificar el despliegue.


### Publicación verificada

Servicio de complemento publicado desde `7cd95096c5b4c23755d4c37a2bb3f47799433102`, deployment `dpl_FWkTe7vBNyGJQvjYN8NDWYPCXL8A`, READY y dominio asistente-onoff.vercel.app verificado. Sin cambios en main. La extensión exige el marcador de la ruta compacta: una respuesta genérica de una versión antigua se rechaza como complemento.

Smoke remoto posterior al READY, exclusivamente ficticio: texto principal 1,781 s (120 tokens entrada/46 salida); complemento OCR de dos textos ficticios 3,416 s (182 entrada/84 salida), mismo gpt-4o-mini-2024-07-18. Las fotos reales aportadas se procesaron solo localmente con respuesta IA simulada. Son muestras aisladas de canales independientes, no garantías de tiempo ni coste para otras fotos/conversaciones. El motor local no genera tokens de imagen; el suplemento sí consume tokens de texto. Bitrix permanece sin consultas ni escrituras. Pendiente validación en Brave real y acceso a fotos montadas de iKono.


## Fotos solo cuando hacen falta · 0.8.0 · 2026-11-12

Esta regla sustituye la lectura de fotos en cada apertura de 0.7.0. Se solicita primero el resumen de texto, incluyendo una evaluación pequeña en la misma llamada/modelo, con salida estructurada y límite de 450 tokens. No hay una segunda llamada de IA para decidir. El resumen se muestra antes de iniciar OCR. Mencionar una foto o tener algo pendiente no es suficiente: la evaluación solo señala ambigüedad cuando falta descripción del caso y se depende de una imagen (por ejemplo, "me sale esto" sin aclaración). Es una evaluación del modelo, no una garantía semántica; el asesor sigue revisando.

La extensión activa OCR si el texto es muy ambiguo, o si el nombre contiene varias TC y no hay una afirmación explícita en el tramo que aclare cuál recibe gestión. La TC indicada por el modelo debe tener una cita literal existente en un mensaje y el número correspondiente; el cliente contrasta también la cita y la pertenencia a las TC candidatas del nombre. Una mera mención, pregunta o alternativa no debe considerarse confirmación según la instrucción. Si el asesor ya confirmó una TC localmente antes de recibirse el resumen, no se leen fotos solo para ese motivo. Ante texto claro y TC aclarada, se omiten OCR y solicitud de complemento.

Solo en los casos activados se conservan los límites previos: hasta dos fotos locales y un complemento acotado; no se suben imágenes. Si las fotos no resuelven el caso/TC, o no hay fotos accesibles, se indica confirmar directamente con el cliente. No se selecciona ni confirma una TC automáticamente. Confirmación del asesor y Bitrix desactivado permanecen; tampoco se bloquea ni pulsa resolución nativa.

53 comprobaciones locales aprobadas, incluidas rutas claras sin OCR, varias TC aclaradas en chat sin OCR, varias TC no resueltas con OCR, ambigüedad visual con OCR, cita inventada rechazada, cache/cancelación y motor de extensión empaquetado. Falta verificación remota de la evaluación estructurada y prueba Brave 0.8.0. Es necesario actualizar la extensión y recargar iKono: 0.7.0 no aplica esta política aunque se actualice el servidor.


### Verificación del despliegue 0.8.0

Backend READY `dpl_gxJgkwuV5z1K6YrSexn7rioAZvQq`, commit `dfa45eed3790ec5e07bc9577e8eb268f876ba4e1`; dominio productivo verificado, sin modificar main. Tres pruebas remotas ficticias aprobaron: caso claro con foto pendiente → ambiguous=false; afirmación explícita de TC en chat → TC67890 con cita literal; "mira la foto, me sale esto" sin descripción → ambiguous=true. Tiempos aislados 3,106/1,440/1,279 s, entradas 341/339/338 tokens y salidas 52/50/45, mismo mini. No son benchmark de casos reales. Ninguna prueba requirió subir imágenes ni consultar Bitrix.

Una TC confirmada manualmente por el asesor, aunque no esté entre las del encabezado, también evita leer fotos solo para resolver TC. La ambigüedad del contenido sigue siendo motivo independiente. Las decisiones del modelo pueden equivocarse; mantener revisión y confirmación humana. Debe instalarse 0.8.0 y recargarse iKono para aplicar el nuevo comportamiento.
