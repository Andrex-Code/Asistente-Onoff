# Consulta autorizada de identidad e historial iKono

**Fecha de revisión:** 2026-11-11. Alcance: documentación pública y menú del perfil de agente; no se consultaron APIs internas, credenciales ni almacenamiento de sesión. No se resolvió ninguna atención.

## Documentación pública revisada

- [Características de iKono Chat](https://changelog.ikono.net.co/): declara conservación del historial ante cambios de estado/reasignación y reportes por estado, agente, tipificación y entradas a cola. Su sección APIs describe Sender y WAPI; en las páginas revisadas no se encontró un contrato de lectura por atención con paginación y límites verificables.
- [Changelog](https://changelog.ikono.net.co/changelog/): entrada 2025-10-27 anuncia detalle de tipificación con niveles ilimitados; entrada 2026-03-24 menciona transferencia a menú de calificación al resolver. Son capacidades publicadas, **no prueba de que la instalación ONOFF tenga esa configuración**.

Consecuencia de diseño (inferencia): el éxito de clic/retirada del modal no debe equivaler a finalización de todo el flujo; una categoría y un único detalle no son un esquema universal suficiente.

## Interfaz disponible

En el menú del usuario del perfil de agente observado solo se mostraron Notificaciones, Ajustes y Cerrar sesión, además de cambio de tema. No apareció un enlace de reportes. No se modificaron ajustes; se cerró el menú. Esto no demuestra que el producto carezca de reportes ni que el usuario no tenga otro acceso autorizado.

Se solicitó al usuario abrir un reporte de tipificaciones o detalle de conversaciones filtrado exclusivamente a la sala de prueba. Pendiente de inspección de esa superficie. No se requiere compartir contraseñas ni abrir permisos adicionales.

## Evidencia requerida del reporte o integración autorizada

| Dato requerido | Cómo comprobarlo | No sustituir por |
| --- | --- | --- |
| ID único de atención | Valor distinto en dos atenciones de la misma sala; estable al transferir o consultar de nuevo según semántica oficial | ID de sala, teléfono, contador de apertura |
| Inicio y fin de atención | Fechas con zona/offset, precisión y significado documentados | Última unión de agente o texto Chat resuelto |
| Relación con sala/canal | Misma atención enlazada explícitamente a su historial y canal | Coincidencia de nombre de contacto |
| Estado final | Distinguir resuelto, transferido a encuesta, abandonado y reabierto | Desaparición del modal |
| Tipificación completa | IDs y ruta ordenada de todos los niveles, con versión de catálogo cuando aplique | Primer detalle visible solamente |
| Historial | Fuente de solo lectura, orden, paginación, fin explícito y criterio de pertenencia a atención | Llegar al extremo del scroll |
| Eventos especiales | Tratamiento de adjuntos, notas internas, eliminados, editados, citas y encuestas | Texto plano sin distinguir origen |
| Consistencia | Qué ocurre si llegan mensajes durante la consulta o se reabre la sala | Una captura DOM tratada como definitiva |

Estos son requisitos de la integración ONOFF, **no un contrato de API publicado por iKono**. No se inventan rutas o nombres de campos del proveedor. Si un reporte expone ID y fechas pero no historial, sirve para contraste manual; no acredita que exista una API de lectura utilizable por la extensión.

## Ensayo de contraste preparado

1. Filtrar el reporte exclusivamente a la conversación ficticia; no exportar ni guardar filas de clientes.
2. Inspeccionar encabezados y tipos de dato antes de copiar valores. Registrar resultados anonimizados.
3. Contrastar dos ciclos históricos de la misma sala y, si hay muestra autorizada, otra sala. No producir nuevos cierres para conseguir la muestra.
4. Verificar estabilidad del ID ante reasignación y qué evento define inicio/fin; registrar excepciones y zona horaria.
5. Contrastar cantidad y pertenencia de mensajes con una atención de prueba conocida; confirmar paginación completa desde fuente autorizada.
6. Mantener sin verificar cualquier punto que el reporte no permita demostrar. No habilitar tareas ni resúmenes automáticos con cobertura desconocida.

## Protección de tipificación

El lector actual rechaza más de dos controles devolviendo unknown; no descarta silenciosamente niveles adicionales. Se añadieron regresiones para tercer nivel y campo dependiente aún sin montar. **30/30 pruebas locales aprobadas en Node 24.22.1**; Node 22/CI pendiente. No se amplió todavía el lector a niveles ilimitados: falta observar su estructura real y acordar cómo representar la ruta en Bitrix.

## Dependencia actual

La validación requiere una superficie de reportes disponible para el usuario o documentación de integración entregada por el administrador/proveedor. No se contactó a terceros ni se solicitó una credencial. F02 sigue abierta; quedan confirmación final autorizada, identidad y cobertura, aunque apertura/cancelación tenga 20/20.


## Reporte supervisor aportado por capturas · 2026-11-11

**Fuente:** capturas del usuario de «Onoff Detalle de Conversaciones», filtrado por la conversación de prueba; incluye la vista izquierda aportada antes y tres desplazamientos a la derecha. Lectura visual, sin descargar/exportar y sin inspección DOM de Brave. El control de Brave había sido detenido porque no pudo verificar su URL. No se publican las capturas ni datos identificativos de la fila.

### Campos observados

| Grupo | Columnas visibles | Qué permite afirmar |
| --- | --- | --- |
| Ciclo de atención | Fecha de inicio, duración de conversación, fecha de finalización, estado, tipo | La fila muestra PENDIENTE; finalización/duración no disponibles en esa muestra |
| Participación del agente | Invitación, conexión, respuesta, salida, tiempo conectado, tiempo para unirse, motivo de salida | Son tiempos y eventos distintos del inicio y del cierre de la conversación |
| Asignación | Agente asignado/anterior, autor y tipo de asignación | El valor BIC se ve en el reporte; su semántica no está documentada aquí y no se infiere |
| Resolución y mensajes | Usuario que resolvió, nombre, último mensaje, fecha y autor del último mensaje | No hay resolutor registrado visible para esta fila; último mensaje no equivale a fin de atención |
| Cola | Generador, estado, duración, tipo y fecha de entrada, cola | Columnas existen, pero muchos valores aparecen N/A; falta validar transferencias/reingresos |
| Contexto del chat | Fecha de creación del chat, campaña y subcampaña | Creación del chat es anterior al inicio mostrado para la fila; son conceptos diferentes |
| Clasificación | Tipificación, Detalle de Tipificación, Comentario de Tipificación, Resolución | Tipificación/detalle/comentario figuran N/A; no se acredita persistencia ni finalización por ello |
| Encuesta | CSAT, NPS, Calificación | Campos existen; valores no disponibles en la muestra |

### Conclusiones acotadas

1. La fecha de creación de la sala/chat **no** debe utilizarse como inicio de la atención actual. El reporte ofrece una Fecha de inicio separada; su semántica y zona horaria aún requieren validación.
2. No aparece una columna explícita de ID único de atención en las vistas aportadas. Esto **no demuestra que el dato no exista** en la plataforma o en otro reporte. Tampoco convierte teléfono + fecha en una clave validada.
3. El filtro por número y una sola fila visible no prueban cobertura de todos los ciclos históricos. Falta conocer rango de fechas, filtros globales, paginación y criterio de agregación del reporte.
4. N/A en tipificación es compatible con no haber confirmado el formulario. No prueba que Cancelar borre registros persistidos, que el reporte esté actualizado ni que otra fila histórica carezca de clasificación.
5. No se ve un historial completo de mensajes; solo datos de último mensaje. Este reporte aún no resuelve la dependencia de cobertura.

### Siguiente comprobación

Revisar **«Onoff Detalle de Tipificaciones»** filtrado al mismo contacto de prueba, con encabezados y rango de fechas visibles, manteniendo el filtro. Buscar ID de registro/atención, fecha de tipificación, relación con conversación/sala, ruta completa y autor. Si no muestra filas para la atención pendiente, usar únicamente un ciclo histórico de prueba ya existente; no cerrar la atención actual para generar datos. No exportar clientes reales ni inventar el vínculo entre reportes.

Estado: reporte de conversaciones inspeccionado visualmente; identidad única, zona horaria, correspondencia entre filas y fuente de historial siguen pendientes. Sin cierres, IA, Bitrix o main. F02 abierta.


## Exportación XLSX diaria · revisión de estructura 2026-11-11

El usuario aportó la exportación de conversaciones del día. Se abrió en modo de solo lectura, sin modificar/exportar el libro ni copiarlo al repositorio. Esta nota conserva únicamente hallazgos de estructura; excluye filas, contactos, mensajes, identificadores y métricas operativas del día.

### Lo que añade frente a las capturas

- Una hoja visible con 47 columnas. La columna A no tiene encabezado y sus valores coinciden exactamente con la posición de cada fila, empezando en cero. Es compatible con índice de exportación; **no hay contrato que lo valide como ID persistente de atención**. No usarlo para idempotencia.
- No existe encabezado explícito de ID de conversación/atención. El XLSX no descarta que el sistema conserve ese ID fuera de esta exportación.
- La combinación teléfono + línea + Fecha de inicio se repite con distintos agentes asignados, incluso usando la precisión de fecha/hora conservada en el archivo. Por tanto, no se puede tomar cada fila por una atención ni crear una tarea por fila. La granularidad exacta requiere confirmación del proveedor; es compatible con participaciones/asignaciones dentro de una atención.
- Existen registros ON_RATING con tipificación y detalle poblados, pero sin Fecha de finalización. **Clasificación poblada no implica cierre final confirmado**. Su significado operacional debe documentarse; no habilitar creación automática solo por tipificación o desaparición del modal.
- Los encabezados AO:AR son Tipificación, Detalle de Tipificación, Comentario de Tipificación y Resolución. No hay IDs de catálogo ni una ruta multinivel estructurada identificada por esos encabezados. No se publican valores de texto libre.
- Fecha de inicio y finalización se leen como fechas Excel sin zona explícita; Fecha de creación del chat aparece como texto con offset UTC en la muestra de prueba. No mezclar ni restar esos campos sin normalización y confirmación de zona.
- La fila del contacto de prueba conserva estado PENDIENTE, sin finalización ni clasificación registradas en este corte. El libro refleja una exportación puntual; no asegura sincronización en tiempo real.
- El campo de mensajes es Último mensaje, acompañado de fecha y autor. No proporciona el historial íntegro ni certifica su cobertura. El rango diario de inicio tampoco prueba que haya terminado toda atención iniciada ese día.

### Decisiones para el diseño

1. Mantener pendiente identidad de atención e idempotencia persistente: ni índice de fila ni teléfono/línea/inicio bastan con esta evidencia.
2. Separar en el modelo atención, participación/asignación del agente y clasificación; validar sus cardinalidades con fuente autorizada antes de unir tablas.
3. Modelar encuesta como estado observado pendiente de semántica oficial; distinguir intención de resolver, atención en calificación y resolución final.
4. Obtener ID y relación desde Detalle de Tipificaciones o documentación de exportación/API autorizada, y una fuente completa de mensajes. No inferir endpoints, consultar APIs internas ni usar credenciales extraídas.

**Siguiente evidencia necesaria:** reporte Detalle de Tipificaciones o diccionario técnico autorizado que explique clave de atención, clave de participación, relación con sala y eventos/fechas de inicio-cierre. No se solicita una nueva resolución para obtenerla.

Sin cambios de código o pruebas nuevas en esta revisión. Se mantienen los resultados previos de 30 pruebas locales y 20 aperturas/cancelaciones reales, con su alcance original. Sin cierres, Bitrix o main; F02 continúa abierta.
