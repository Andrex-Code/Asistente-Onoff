## Estado actual · 0.21.0: TC contextual y recuadro condicional

Detección general por contexto de TC en nombre/chat, con OCR acotado si hace falta. Sin número específico codificado. TC única clara: aviso compacto, consulta CRM y borrador preparados sin rellenar tarjeta blanca; el asesor confirma TC y resumen en el paso final antes de escribir en Bitrix. Sin TC o con ambigüedad: ingreso/elección explícitos. Se conservan fechas/atenciones, correcciones, completar después de etapa y reintentos. Ver [reglas y recorrido](piloto-creacion-extension-0.21.0.md). Ensayo real pendiente; main intacta.

## Estado actual · 0.20.1: etapa y tarea completada

Las nuevas tareas verifican primero Finalizadas Solicitud y después estado Completada. Reintentos recuperan el mismo radicado y no repiten completar si ya llegó a estado 5. El éxito parcial no se presenta como tarea terminada. Incluye las correcciones de fecha, atención y diseño de 0.20.0. No se editan tareas previas automáticamente. Ver [guía y evidencia](piloto-creacion-extension-0.20.0.md#actualización-0201--etapa-y-después-completar). Main intacta.

## Estado actual · 0.20.0: hoy, atención separada y estados visibles

Confirmada en DOM la existencia de separadores Hoy/Ayer. Captura excluye otras fechas y fechas desconocidas, separa cierres/reaperturas y usa saludo de asesor como señal revisable. Memoria/resumen/fotos aislados por atención; selección visible de contacto de hoy. Resumen acotado completo sin recorte a 40. Alcance firmado por atención/TC para tareas separadas con reintentos idempotentes. TC única compacta, estados de carga, Resolver bloqueado durante preparación, confirmación centrada y contraste explícito. 59 pruebas pertinentes aprobadas; ensayo real de 0.20 pendiente. Ver [hallazgos y límites](piloto-creacion-extension-0.20.0.md). No se modifica la tarea anterior ni main.

## Estado actual · 0.19.0: TC validada en la interfaz del asesor

La tarjeta dentro de Resolver reúne candidatas del nombre/chat/fotos, ingreso manual, confirmación humana, negociación/compañía exactas y revisión del resumen diario de la TC. Diagnóstico oculto: no se necesita para operar. Sin TC confirmada y asociada no se prepara ni crea tarea. Cambios de TC/mensajes invalidan la revisión; correcciones conservadas al cancelar/reabrir. Después del cierre humano se mantiene confirmación final, editor y reintentos de 0.18. Pruebas locales aprobadas; ensayo real de la nueva tarjeta pendiente. Ver [recorrido y reglas](piloto-creacion-extension-0.19.0.md). Main intacta.

## Estado actual · 0.18.0: editor real y reintentos

Editor de borrador conectado al servicio: resumen/título/campos permitidos/CRM; tipificación, detalle y equipo bloqueados en servidor. Confirmación sin Más tarde. Un intento inicial más tres reintentos duraderos; fallos conservados por registro. Corregida desactivación tras el primer cliente. Pruebas aprobadas; ensayo real de esta versión pendiente en el chat de pruebas del usuario. Ver [recorrido y límites](piloto-creacion-extension-0.18.0.md). Main intacta.

## Estado actual · 0.17.0: confirmación posterior a Resolver

Implementado: preparación automática de vista previa tras revisión, conservación del borrador, cierre humano y aviso posterior para Confirmar crear tarea PRUEBA. Recargar, consultar o aplazar no crea tareas. Pruebas locales de flujo y recuperación; ensayo real de esta interacción pendiente. La creación y recuperación reales anteriores siguen verificadas; cobertura diaria automática y fecha límite del portal pendientes. Ver [estado y guía de continuidad](continuar-piloto-0.17.0.md). Sin cambios main.

## Actualización · 0.16.2: consultar historial y evitar cierres sin preparación

Dos cierres posteriores no produjeron tareas visibles en la consulta Bitrix por TC. Se corrige aviso ambiguo de cero/varios pendientes y se añade historial con estado por registro. El piloto privado requiere preparación antes de Resolver por defecto, con exclusión explícita por el asesor. Pruebas aprobadas; inspección real del diario posterior a recarga pendiente. Ver [detalle y límites](piloto-creacion-extension-0.16.2.md). No se recrearon tareas ni se cambió main.

## Estado comprobado · primera tarea real desde extensión, 0.16.1

Creación PRUEBA tras Resolver humano confirmada. Recuperación de etapa del mismo ID completada desde la extensión tras corregir el truncamiento XML_ID del portal; ficha recargada y verificada. Sin segunda tarea ni cambios manuales de etapa. Piloto de otros clientes habilitado con revisión y confirmación humana; automatización general, cobertura diaria automática y regla de fecha límite siguen pendientes. Ver [resultado y límites](piloto-creacion-extension-0.16.1.md). Main intacta.

## Estado actual · 0.16.0: salida a encuesta

Reporte contrastado: Resolver transfiere a ON_RATING y retira la sala del asesor. Corregida detección correlacionada de salida a Inicio, sin requerir reportes en operación. Borrador persistido antes del clic; varios clientes aislados por sala/día/TC, con PRUEBA y confirmación humana. Pruebas simuladas aprobadas; primera creación real con esta versión pendiente. Ver [evidencia, inferencia y límites](piloto-creacion-extension-0.16.0.md). No se declara creada la tarea del cierre anterior ni se cambia main.

## Estado actual · piloto de creación desde extensión 0.15.0

Preparación firmada sin escritura y creación PRUEBA tras cierre humano y transición DOM a Resuelto de la misma sala. Plantilla/equipo y campos personalizados verificados por REST. Reserva privada evita repetir task.add y permite recuperar la etapa de la misma tarea. Pruebas simuladas aprobadas; validación real desde la extensión pendiente. Escritura restringida a un único piloto autorizado; main intacta. Ver [recorrido y límites](piloto-creacion-extension-0.15.0.md).

| Recorrido | Estado |
|---|---|
| Memoria, TC y resumen revisado | Implementado |
| Plantilla, CRM y campos | Verificados en lectura |
| Creación desde extensión y reintentos | Pruebas simuladas aprobadas |
| Primera creación real desde extensión | Pendiente del asesor |
| Cobertura diaria automática y despliegue general | Pendientes |

## Estado actual · primera tarea PRUEBA asistida

Primera creación real autorizada por el usuario, realizada de forma asistida en la interfaz de Bitrix y verificada tras recargar. La extensión continúa sin creación automática. El formulario de resolución de iKono quedó abierto; el asistente no confirmó el cierre.

# Roadmap · Automatización de trazabilidad iKono → Bitrix

**Inicio:** 2026-11-11. **Estado:** F01 · Análisis, en curso. **Ámbito:** Asistente ONOFF (extensión Chrome/Edge + backend Vercel). **Modo inicial:** confirmación humana. **Producción:** sin cambios.

## Primera pasada conectada en iKono real · resultado actual

- 0.2.0 probado desde la extensión real: captura de textos, clasificación temporal, Cancelar, delimitación de dos mensajes ficticios, IA existente, corrección y revisión local. Conectividad navegador-backend comprobada.
- Snapshot contenía intercambios anteriores; se usó un tramo histórico manual, sin declararlo atención actual completa. Borrador requirió corregir atribución de crédito y terminología de cierre.
- Datos locales borrados, paneles cerrados y sala Pendiente. Sin resolución final, Bitrix, main o despliegue. [Evidencia y límites](recorrido-conectado-prueba-ikono.md).
- Siguiente hito: atención ficticia delimitada y cierre nativo autorizado específicamente, con seguimiento de encuesta. Identidad/cobertura y controles productivos pendientes. F02 abierta, 0/6 fases completadas.

## Preparación del recorrido 0.2.0 · antecedentes

- Paquete de prueba conecta captura de textos, delimitación manual, tipificación, resumen IA autorizado y revisión local. Reutiliza backend existente, sin Bitrix ni despliegue.
- 40/40 pruebas locales; escenario integrado repetido con límite de 40 mensajes, limpieza por cambio de sala y panel oculto durante diálogo nativo.
- Backend real respondió a dos mensajes ficticios. Falta ensayo desde la extensión real: recarga manual y pasada con Cancelar. No se ha probado resolución final.
- [Instrucciones, evidencia y límites](recorrido-conectado-prueba-ikono.md). Identidad, cobertura completa, seguridad productiva y cierre final siguen pendientes. F02 abierta; 0/6 fases completadas.

## Ruta asistida y maqueta local · antecedente

- Usuario confirma que el XLSX de conversaciones es la exportación disponible. No se solicita otro reporte.
- Reglas diagnósticas preparadas para separar tipificación, encuesta y resolución verificada: **39/39 pruebas locales**. No integradas ni con envío.
- Maqueta local con datos ficticios: revisión del tramo, borrador editable y advertencias de cobertura/identidad. Verificada en Chromium sin red, aún sin conexión al motor o extensión.
- [Reglas, flujo y límites](flujo-asistido-ikono.md). Identidad, cobertura y cierre final siguen pendientes. F02 abierta, 0/6 fases completadas. Sin main ni Bitrix.

## Exportación XLSX · hallazgos previos

- La columna sin nombre coincide con el orden de exportación; no se valida como ID de atención. Teléfono/línea/inicio tampoco es único entre filas con distintos agentes.
- ON_RATING puede tener clasificación sin fecha final. No tomar clasificación como confirmación de cierre. Exportación contiene último mensaje, no historial completo.
- Pendientes: clave de atención/participación, relación con tipificaciones, semántica de cierre y zona horaria. [Contraste y decisiones](consulta-autorizada-identidad-ikono.md).
- F02 abierta, 0/6 fases completadas. Sin publicar filas o métricas del reporte, sin cierres, Bitrix ni cambios en main.

## Reporte supervisor · evidencia visual previa

- Capturas filtradas de Detalle de Conversaciones: fecha de creación del chat distinta de Fecha de inicio; fila pendiente con finalización y tipificación no disponibles.
- Columnas de tiempos/asignación/cola y clasificación identificadas. No se observa ID único de atención ni historial completo en las vistas aportadas; no se declara su inexistencia.
- Siguiente contraste: Detalle de Tipificaciones del mismo contacto de prueba, más rango y filtros globales del reporte. [Resultados y límites](consulta-autorizada-identidad-ikono.md).
- 20/20 aperturas/cancelaciones reales y 30/30 pruebas locales previas conservan su alcance. F02 sigue abierta; 0/6 fases completadas.

## Contraste con documentación oficial · antecedentes

- Revisadas características y changelog públicos de iKono: reportes e historial conservado; se documentan tipificaciones multinivel y posible encuesta al resolver. Su disponibilidad en ONOFF requiere verificación.
- No se encontró contrato público de lectura por atención en las páginas revisadas. Perfil de agente observado sin enlace de reportes; pendiente que el usuario abra reporte filtrado a la conversación ficticia o facilite documentación autorizada.
- Añadidas dos regresiones de clasificación para no perder un tercer nivel ni aceptar un campo dependiente sin montar: **30/30 pruebas locales**.
- [Requisitos y ensayo de contraste preparados](consulta-autorizada-identidad-ikono.md). Sin cierre, Bitrix ni main; F02 continúa abierta.

## Identidad e historial · diagnóstico previo

- **Problema real confirmado:** al cargar mensajes anteriores el lector encuentra 46 mensajes elegibles y conserva 40: 6 omitidos en esa muestra. El DOM cambia al desplazarse; no certifica el total del servidor.
- Sala y event-id no equivalen a atención. Hay marcadores históricos de cierre dentro de la misma sala; falta clave y límites de atención verificados.
- Evaluador diagnóstico preparado, **no integrado** a la extensión habitual; 7 pruebas nuevas, **28/28 locales** aprobadas. No habilita IA/Bitrix.
- [Evidencia, límites y siguiente validación](identidad-cobertura-ikono.md). F02 sigue abierta, 0/6 fases completadas.

## Resultado previo · 20 aperturas y cancelaciones reales

- **F02: 20/20 aperturas y 20/20 cancelaciones verificadas** en sala de prueba, con versión 0.1.1 y espera de formulario estable. Sin pulsar resolución. Ciclo 4 con incidencia del localizador de espera, verificada y recuperada antes de cancelar; sin repetir Cancelar.
- **21/21 pruebas locales** aprobadas, incluidas carga tardía y geometría en movimiento. Node 22/CI pendiente.
- Conversación Pendiente al terminar; registros del panel borrados y panel cerrado. Observador detenido; extensión de prueba permanece instalada.
- F02 no completada: faltan confirmaciones finales autorizadas, identidad y cobertura del historial. **0/6 fases completadas**. Sin Bitrix ni cambios en main.
- [Resultados y límites](prueba-observador-pasivo-ikono.md) · [Registro por ciclo](evidencia-ikono-20-aperturas-2026-11-11.json).

## Ensayo inicial previo · antecedentes

- Observador ejecutado en sala de prueba: 2 aperturas/cancelaciones detectadas; ASESORIA → CONTACTO COMERCIAL leído; cambio a CARTERA invalida el detalle.
- Diagnóstico detenido, registros borrados y panel retirado; comprobada ausencia de nuevas señales tras detener. Extensión de prueba permanece instalada.
- Pendiente estabilizar montaje y clics rápidos: un intento temprano de Cancelar no llegó al botón; reintento con formulario estable funcionó. No se declara validación 20/20 ni interferencia cero.
- Sin confirmaciones finales, Bitrix o main. F02 sigue en investigación; 0/6 fases completadas. [Evidencia completa](inspeccion-dom-ikono-2026-11-11.md).

## Antecedentes de preparación · 2026-11-11

- **F01 — En análisis:** proceso descrito preliminarmente, todavía faltan mediciones y validación de la matriz por SAC/Calidad.
- **F02 — Viabilidad investigada (sin cerrar):** análisis de técnica de eventos `pointerdown/click` + `MutationObserver`, acceso DOM del botón «Resolver chat» comprobado en Edge; formulario y detalle dependiente inspeccionados en conversación de prueba; eventos y cierre final pendientes. Ver [documento de viabilidad](viabilidad-detector-cierre-ikono.md) e [issue #38](https://github.com/Andrex-Code/Asistente-Onoff/issues/38).
- **Prototipo técnico no integrado:** `src/ikono-close-session.js` modela sesiones aisladas, confirmación, resúmenes que terminan tarde, errores y doble clic; 11 casos del motor y 3 del observador pasivo superados con node --test (14/14, Node 24; pendiente Node 22/CI). **No se ha integrado al manifiesto, ejecutado CI ni validado eventos instrumentados en iKono todavía. Botón y formulario inspeccionados; apertura y cancelación realizadas en sala de prueba sin resolver.**
- **Sin cambios productivos:** ninguna creación en Bitrix, ningún cambio en la rama `main`.
- **Siguiente hito:** POC de detección en una sesión iKono autorizada con datos de prueba; instrumentar eventos pasivos y validar captura final, identidad y cobertura; DOM inicial y formulario ya inspeccionados sin cierre.

## Inspección de navegador · avance parcial

DOM de «Resolver chat» y diálogo «Resolver conversación» confirmados en sala de prueba. Tipificación y detalle dependiente accesibles; cambio de categoría borra el detalle previo. Selecciones temporales descartadas con Cancelar. Eventos instrumentados y confirmación final pendientes. No se cerró ninguna atención. Ver [evidencia y límites](inspeccion-dom-ikono-2026-11-11.md). F02 permanece en investigación, sin criterios de aceptación completados.

## Objetivo de negocio
Que una atención resuelta en iKono genere una tarea de trazabilidad en Bitrix con tipo de incidencia, detalle de tipificación, asunto y resumen fiel de lo conversado, sin obligar al asesor a duplicar el registro.

## Fuente de seguimiento
Consultar [issues de F01 a F06](https://github.com/Andrex-Code/Asistente-Onoff/issues?q=is%3Aissue+is%3Aopen+in%3Atitle+F0). Cada issue documenta actividad, criterios de aceptación y dependencias. Estados: pendiente, en análisis, desarrollo, revisión, validado y bloqueado. Marcar completado solo con evidencia. Las tareas se pueden gestionar sin alterar main.

## Fases y entregables

| Fase | Propósito | Issues | Puerta de salida |
| --- | --- | --- | --- |
| F01 · Análisis | AS-IS, mediciones y matriz iKono–Bitrix | #36 #37 | Requisitos validados por SAC/Calidad |
| F02 · Viabilidad | Captura completa del chat, selectores y seguridad | #38 #39 | Pruebas de captura y diseño autorizado |
| F03 · Diseño | UX de progreso/confirmación | #40 | Aprobación del prototipo |
| F04 · MVP | Detector, resumen estructurado y creación segura | #41 #42 #43 | Pruebas automatizadas + pruebas de integración |
| F05 · Piloto | Validación humana de cada tarea | #44 | Métricas y autorización documentada |
| F06 · Operación | Automatización gradual, monitoreo y rollback | #45 | Aprobación operacional y de seguridad |

## Flujo TO-BE propuesto
1. Asesor pulsa «Resolver chat» en iKono: se toma snapshot aislado por conversación y se inicia el resumen IA (sin detener el cierre nativo).
2. Asesor elige tipificación y detalle dependiente en el diálogo de iKono.
3. Asesor pulsa «Resolver conversación»: la extensión intenta capturar los valores **finalmente seleccionados** y confirma el ID del chat.
4. Se abre aviso de revisión; si la IA aún procesa, presenta estado «Generando». No asume que el chat completo está disponible.
5. Asesor confirma o corrige, y el backend **autenticado** intenta crear exactamente una tarea en Bitrix.
6. Éxito: mostrar enlace a tarea; falla: guardar estado de reintento controlado. Ningún envío duplicado.
7. Después del piloto aprobado: habilitación progresiva del modo automático con opción de desactivación.

## Reglas funcionales preliminares (pendientes de validación)
- Tipo de incidencia Bitrix = Tipificación iKono.
- Tipificación TI Bitrix = Detalle de tipificación iKono.
- Asunto de tarea Bitrix = detalle iKono. Confirmar si «Asunto» equivale a título, si debe incluir identificador y cuál es la convención de mayúsculas.
- Descripción Bitrix = Incidente / Revisión y análisis / Solución o estado pendiente + referencia mínima del chat.
- Destino deseado = FINALIZADAS SOLICITUD: **no confirmado** si es etapa de grupo/proyecto o tarea completada. Validar también plantilla y permisos.
- El resumen no inventará acciones, respuestas ni una resolución no confirmada. Explicitará «conversación incompleta» si aplica.

## Diagnóstico inicial del código existente (main v1.12.5)
- `manifest.json`: extensión Manifest V3, content scripts inyectados en todas las URL; introducir módulo de cierre restringido al origen autorizado de iKono.
- `src/assistant-chat.js`: `readConversation()` usa `li.mx_EventTile[data-event-id]`, excluye notices y lee **hasta 40 mensajes visibles**. Riesgo de historia incompleta y de pérdida tras cerrar.
- `api/assistant-chat.js`: resume actualmente con servicio IA, pero el endpoint es de conversación general, no salida estructurada ni flujo de escritura; debe diferenciarse.
- `src/bitrix-transport.js`: transporte de **solo lectura**; no reutilizarlo para escritura sin autorización.
- `api/bitrix/search-task.js` y demás consultas: credencial webhook en backend Vercel; verificar permisos de creación y campos.
- `src/content.js`: ya tiene ventanas flotantes/mascota y catálogo de plantillas; reutilizar patrones de interfaz, sin interferir con iKono.

## Controles de riesgo (bloqueantes)
1. **Seguridad:** autenticación + autorización en servidor para la creación de tareas. CORS no es mecanismo de autenticación. Evaluar incidencia de seguridad previa #20.
2. **Datos personales:** evitar conversaciones reales en repositorio, tickets, prompts de prueba y logs; validar política de tratamiento y retención antes de transmitir datos a IA.
3. **Exactitud:** identificar el chat con un ID estable; no asociar el resumen de un chat con la tipificación del siguiente.
4. **Integridad:** idempotencia persistente y protección frente a doble clic, latencia, respuesta parcial y reintentos.
5. **Captura:** la lectura DOM actual no certifica cobertura completa, y un cambio de interfaz iKono puede romper selectores. Probar en ambiente autorizado.
6. **Disponibilidad:** si falla el backend, el asesor puede cerrar iKono sin bloquearlo; mostrar estado pendiente y alternativa de registro manual.

## Métricas para gerencia
- Atenciones realizadas por periodo (fuente oficial iKono).
- Porcentaje de cierres con tarea confirmada en Bitrix.
- Tiempo empleado en registro manual y confirmación asistida.
- Tasa de resumen aceptado sin modificación.
- Fallos, omisiones, duplicados y errores de mapeo.
- Cobertura real de historial en muestra de prueba.

**No estimar ahorro sin línea base.** Medir piloto con casos anonimizados y umbrales de aceptación acordados.

## Próximas acciones
1. #36 y #37: confirmar proceso, matriz y destino.
2. #38: prototipo observador de eventos sobre entorno de prueba autorizado.
3. #39: concretar autorización de escritura y privacidad.
4. #40: maqueta interactiva; luego implementar MVP en rama separada.

## Responsabilidad
**Analista funcional/validador:** representante SAC, con revisión de Calidad y propietario Bitrix. **Implementación y pruebas técnicas:** asistente de desarrollo. **Aprobación de automatización:** gerencia/operación/seguridad según proceso corporativo.

> Este roadmap es una propuesta técnica versionada. No implica autorización para usar datos de clientes, crear tareas productivas ni modificar el flujo de cierre en iKono.

## Observador pasivo preparado

Módulo desactivado por defecto y fuera del manifiesto; 3 pruebas DOM locales aprobadas. No cargado en iKono. Ver [alcance y procedimiento](prueba-observador-pasivo-ikono.md). Próximo hito: cargar copia de desarrollo y observar apertura/cancelación sin cerrar la atención. F02 sigue abierta.

## Paquete de diagnóstico local · avance actual

- Extensión separada preparada, con inicio y detención explícitos; sin permisos permanentes de sitios ni conexión a Bitrix/IA.
- Lector opcional de tipificación y detalle, basado en selección visible del DOM real; no confunde búsqueda con selección. Lectura final aún sin validar en cierre real.
- **20/20 pruebas automáticas aprobadas**, incluida prueba Chromium con 20 aperturas/cancelaciones ficticias. Node 22/CI pendiente.
- Falta aprobación para instalar el paquete de prueba y ensayarlo en la pestaña iKono autorizada. No instalado ni activo en producción. F02 permanece en investigación y 0/6 fases completadas.


## Vista previa independiente 0.3.0 · 2026-11-12

- [x] Extensión separada: captura y selección manual del tramo, consentimiento explícito y espera de dos segundos tras completar tipificación y detalle.
- [x] 41 comprobaciones locales aprobadas; prueba nueva con formulario y respuesta IA simulados. Sin cierre ni escritura en Bitrix.
- [ ] Instalar 0.3.0 y validar calidad del resumen con el asesor sobre un tramo real autorizado.
- [ ] Verificar identidad, cobertura completa y cierre antes de habilitar el recorrido definitivo hacia Bitrix.

[Instalación, prueba y límites](vista-previa-resumen-ikono.md). La espera inicia la solicitud; no garantiza recibir el resumen en dos segundos.


## TC y resumen 0.5.0 · 2026-11-12

- [x] Detección de TC en el nombre y confirmación humana local; varias TC requieren elección; ninguna permite ingreso manual. No valida asociación en Bitrix.
- [x] Resumen breve y reutilización del mismo tramo sin llamadas repetidas por cambios de tipificación; muestra tiempo de generación.
- [x] 43 comprobaciones locales aprobadas; flujo nuevo con formulario e IA simulados.
- [ ] Verificar 0.5.0 con el asesor en Brave y medir tiempos/calidad reales.
- [ ] Verificar adjuntos, identidad/cobertura/cierre y asociación TC → compañía/negociación antes de habilitar tareas.

**Creación en Bitrix desactivada.** [Prueba, instalación y límites](vista-previa-resumen-ikono.md).


## Inicio inmediato 0.5.1

- [x] Lectura y solicitud del resumen al abrir formulario; independientes de tipificación, detalle y confirmación TC.
- [x] 43 comprobaciones locales aprobadas; reapertura del mismo tramo reutiliza borrador sin otra solicitud.
- [ ] Validación Brave 0.5.1 y medición del servicio: usuario reportó 14,3 s con 0.5.0. Sin cambio de modelo/backend en esta entrega.

TC detectada en Brave confirmada por el usuario; asociación y creación en Bitrix siguen desactivadas.


## Ruta compacta y TC numérica 0.6.0

- [x] El usuario validó resumen/TC en varios chats con 0.5.1; pide admitir números sin prefijo.
- [x] 0.6.0 detecta candidatos al inicio del nombre y de negocios entre paréntesis, elimina repetidos y exige confirmación humana.
- [x] Ruta compacta publicada desde rama de trabajo, sin modificar main ni activar Bitrix; mismo modelo mini, salida limitada y sin cargar conocimiento general.
- [x] 47 comprobaciones locales únicas aprobadas. Caso ficticio de seis mensajes: antes 4,41/3,53 s y después 2,11/1,88 s; muestra pequeña, no comparable directamente con el caso real de 14,3 s.
- [ ] Probar 0.6.0 en Brave con TC sin prefijo y medir calidad/tiempos reales.
- [ ] Adjuntos, identidad/cobertura/cierre y asociación TC con Bitrix pendientes. Creación de tareas desactivada.

[Instalación y límites](vista-previa-resumen-ikono.md) · [mediciones](medicion-resumen-0.6.0.json).


## Fotos por OCR local · 0.7.0

- [x] Resumen de texto inmediato e independiente de las fotos.
- [x] Hasta dos fotos cargadas, OCR local sin subir imágenes; una solicitud de texto breve para complemento separado y editable.
- [x] TC de alias AnyDesk y pie POS como candidatas; conserva lectura cruda, excluye fechas y exige confirmación humana renovada ante evidencia nueva.
- [x] 50 comprobaciones aprobadas, incluidas extensión empaquetada/offscreen/WASM reales, no bloqueo del texto, cache, cancelación y rechazo de fallback genérico.
- [x] Dos fotos aportadas procesadas localmente por la extensión produjeron TC70999; IA simulada, sin subirlas ni enviar su texto real. Backend del suplemento publicado y probado con datos ficticios.
- [ ] Validar 0.7.0 en Brave con fotos montadas de iKono y calidad de miniaturas/OCR.
- [ ] Visión semántica, audios, identidad/cobertura/cierre y asociación TC con Bitrix pendientes. Creación de tareas desactivada.

[Guía y límites](vista-previa-resumen-ikono.md).


## Fotos condicionadas a necesidad · 0.8.0

- [x] Texto claro con TC identificada: sin OCR ni complemento de fotos.
- [x] Varias TC no aclaradas en el chat/por asesor, o contexto muy ambiguo dependiente de fotos: lectura local limitada.
- [x] Evaluación en la misma solicitud del resumen, sin llamada adicional para decidir. Cita de TC contrastada con el texto; confirmación humana permanece.
- [x] 53 comprobaciones locales aprobadas y tres casos ficticios remotos verificados tras despliegue READY, mismo modelo mini.
- [ ] Probar 0.8.0 con el asesor en Brave y comprobar falsos positivos/negativos del criterio de ambigüedad.
- [ ] Creación y consulta de asociación en Bitrix desactivadas; identidad/cobertura/cierre aún pendientes.

[Regla, evidencia y límites](vista-previa-resumen-ikono.md).


## Primera vista previa de tarea · inspección sin escritura

- [x] Consulta de TC y revisión de negociación en Bitrix, solo lectura.
- [x] Inspección del formulario detallado y siete campos personalizados; formulario descartado sin crear tarea.
- [x] Vista previa local revisable con creación desactivada. Datos privados y capturas permanecen locales.
- [ ] Confirmar asociación TC/negociación ante diferencias de nombre y varios establecimientos de una compañía.
- [ ] Usuario debe definir diligenciamiento de campos, responsables, fechas y vínculo CRM; verificar IDs/tipos/opciones REST antes de implementar escritura.

[Inventario observado y reglas pendientes](campos-tarea-bitrix-inspeccion.md). La creación permanece desactivada.


## 2026-11-12 · Vista previa basada en PRIMER CONTACTO

- Verificada en Bitrix la plantilla PRIMER CONTACTO, ID 477: responsable, participantes, observador, proyecto y ausencia de fecha límite se conservan; no se deducen de la cuenta del asesor. La recurrencia permanece desactivada.
- Vista previa local con campos de iKono en mayúsculas: categoría → Tipo de Incidencia; detalle → Tipificación TI y asunto; TC → Plataforma. Tipificación 2 sin regla asignada. Descripción: Incidente, Revisión y análisis, Solución y referencia de conversación pendiente de ID de atención.
- Alcance requerido: todos los contactos y reaperturas de hoy en America/Bogota, separados por TC seleccionada. TC ambigua requiere revisión humana; no se mezcla el día de otras TC.
- Inspección DOM: sala accesible desde inicio hasta cierre; el texto disponible carece de fecha absoluta por mensaje y separadores de fecha. Una hora aislada no certifica el día. Resumen provisional marcado como tal; pendiente verificar cobertura diaria y separación por TC.
- Añadidos módulos puros de captura diaria y composición de vista previa, con cuatro pruebas. No están integrados todavía al capturador de la extensión ni al backend; el flujo instalado continúa limitado al texto montado y al límite vigente de mensajes. No se publica una nueva versión ni se afirma captura diaria completa.
- Sin creación, guardado de borradores, adjuntos, cambios de etapa ni otras escrituras en Bitrix. Tras una futura creación autorizada y verificación del ID, la etapa prevista es Finalizadas Solicitud; transición actualmente desactivada.


### Extensión 0.9.0 · Vista previa integrada
- Panel desplegable PRIMER CONTACTO con valores de plantilla 477 verificados el 12/11/2026; no lectura dinámica de la plantilla. Conserva responsable, proyecto, equipo y observador, sin fecha límite ni recurrencia.
- Campos categoría/detalle/TC y teléfono disponibles en DOM; descripción provisional editable. Consulta de TC exclusivamente de lectura, tras confirmación humana; selección explícita de negociación cuando hay varias. No existe llamada de creación ni transición de etapa.
- Acumulación local de textos por sala y día de Colombia, deduplicados por evento; navegación y cambio de día limpian datos. Cuenta fechas desconocidas y muestra cobertura pendiente.
- Límite explícito: la acumulación NO se conecta todavía al resumen IA. Continúa hasta 40 textos montados, sin garantizar hoy ni separación por TC. El panel lo advierte y pide revisión/separación; no se declara resumen diario completo ni filtrado automático por TC implementado.
- Seis pruebas locales pasaron, incluyendo Chromium con consulta simulada, bloqueo sin confirmación, dos negociaciones, selección exacta y creación desactivada. El escenario afectado se repitió tras ajustes. No equivale a validación real en iKono. Paquete local 0.9.0 preparado; pendiente recarga por el usuario.


### 0.10.0 · Resumen diario por TC con revisión humana
- Captura acumulada conectada a revisión de mensajes: el asesor marca exclusivamente textos de hoy correspondientes a la TC confirmada y declara haber cargado todos sus contactos/reaperturas. No se asignan automáticamente fechas ausentes ni TC ambiguas.
- Nueva ruta daily_summary_test, validada antes del recorte anterior de 40: hasta 250 mensajes / 48000 caracteres / 4000 por mensaje, una llamada mini con 600 tokens máximos, caché del mismo conjunto. Rechaza mezcla de días/TC, duplicados o exceso sin truncar. Descripción diaria separada del resumen inmediato.
- Cobertura declarada por asesor, no certificada por iKono; falta automatizar fechas y paginación de historial. La revisión manual es necesaria para este ensayo. Mensajes mezclados requieren separación humana. Sin audio ni fotos en esta ruta.
- Seis pruebas locales aprobadas: conservación de 80 mensajes, rechazos de alcance/límites, captura diaria y panel Chromium. Pendiente ensayo real por el usuario. Bitrix continúa sin creación ni transición.


Servicio diario desplegado READY desde 9cb4968b05d9a339322d44ceb952aa414a83d86f. Ensayo remoto solo ficticio: 60 mensajes recibidos, HTTP 200, daily-reviewed-v1, 995 tokens de entrada y 97 de salida; sin garantía de coste fijo ni latencia. Chromium adicional verificó generación diaria simulada hasta descripción. Conserva ediciones de descripción hechas durante solicitud. Creación Bitrix desactivada.


### 0.11.0 · Protección de cierre y memoria por sala
- Guard cargado en document_start: desactiva exactamente Resolver conversación sin mensaje en diálogos, aviso visible y bloqueo en captura de puntero/ratón/táctil/Enter/Espacio; reaplica tras remontaje. No sustituye el cierre por otro botón. Sin pruebas de cierre en chats reales.
- Memoria volátil por sala/día de Colombia (hasta 12 salas / 250 textos por sala): deduplica eventos y conserva borradores al navegar. Sin almacenamiento persistente; recarga descarta memoria. Solo observa DOM accesible, no recibe eventos de salas ocultas.
- Resumen provisional empieza tras observar el chat, sin abrir Resolver: pausa de 8 segundos y mínimo 20 segundos entre intentos por sala activa. Reutiliza caché y conserva ediciones humanas. Se mantiene el límite de 40 textos para el resumen inmediato; resumen diario por TC conserva revisión humana de 0.10.0. No se afirma clasificación oficial automática ni cobertura diaria completa.
- Cinco escenarios locales únicos aprobados: protección ratón/teclado/remontaje y botones permitidos; aislamiento de tres salas; actualización previa a Resolver y preservación de edición; regresión de resumen y vista previa. IA y cierres simulados, sin datos reales ni escritura Bitrix. Pendiente comprobar guard en iKono real sin cerrar atención.


### 0.12.0 · Panel permanente y seguimiento de chats visitados
- Panel con una tarjeta por sala, resumen Motivo/Gestión/Resultado bajo TIPIFICACIÓN DEL CHAT, hora de resumen, pendiente de actualización, edición humana y ausencia de señal reciente. No certifica cobertura diaria/TC; revisión humana sigue obligatoria. Misma familia mini, salida inmediata 450 tokens / diaria 600, sin llamada por cada sondeo.
- Inspección real de solo lectura: siete salas listadas, un historial accesible; las otras tarjetas no exponen ID de sala ni mensajes. Sin navegar conversaciones, resolver ni extraer estado interno/credenciales. No se publican datos de los contactos inspeccionados.
- Seguimiento optativo por botón: hasta cuatro pestañas auxiliares inactivas para salas ya visitadas. Transporta resúmenes por identificador de sala y origen; no agrupa por nombre. Requiere visitar inicialmente cada sala para conocer su URL. Puede marcar como leídos los mensajes; aviso antes de activar. No se presenta como servicio de eventos o lectura completa del servidor. Pestañas en segundo plano pueden sufrir ralentización del navegador. Detener cierra solo las auxiliares creadas por el seguimiento.
- Memoria volátil hasta 12 salas, reinicio al cambiar día; edición conservada, eventos ya asociados a otra sala no se capturan de nuevo, exceso de 250 textos detiene actualización inmediata. Fallos/desconexión no se muestran como estado actualizado.
- 14 escenarios locales únicos aprobados al corregir expectativa de formato: panel, aislamiento origen/sala, ratón/teclado, memoria, actualización, límites diarios, servicio y mensajería multitab de extensión empaquetada. Integración multitab con navegación inicial de auxiliar dirigida a fixture interceptada: mensaje nuevo en auxiliar actualiza solo su tarjeta y no cambia la sala principal. Todas las respuestas IA y chats de estas pruebas son simulados; no prueba aún sesión/autenticación/latencia real de iKono en auxiliares.
- Sin creación de tareas ni transición Bitrix. Backend cambia formato del resumen; pendientes ensayo real de auxiliares por usuario y límite/cobertura diaria automatizados.


Backend 0.12 READY: dpl_88Rr6U29ccteqQFBRY443YnVjMy3, código 1efb97e216171f7e804efc09d22856a61b5d588e. Ensayo remoto con dos mensajes ficticios: HTTP 200, encabezado TIPIFICACIÓN DEL CHAT y Motivo/Gestión/Resultado presentes, resultado pendiente conservado; 397 tokens entrada, 91 salida. No se usaron textos de clientes ni se escribió en Bitrix.


### 0.13.1 · Panel movible, revalidación y bloqueo real multiventana
- Inspección real de 0.12: el seguimiento auxiliar NO funciona en este portal. La pestaña auxiliar muestra que iKono está abierto en otra ventana y ofrece Continuar para desconectar la atención principal. No se pulsó Continuar. Se detuvo seguimiento con el botón del panel y se verificaron cero auxiliares. Esto reemplaza la hipótesis de viabilidad de 0.12; los fixtures multitab no acreditaban compatibilidad con el bloqueo real de iKono.
- 0.13.1 desactiva la activación auxiliar en interfaz y servicio: no abre otras ventanas. Se conserva memoria de chats visitados y revalidación al volver. El seguimiento de salas ocultas requiere una fuente autorizada de eventos/historial dentro de una sola sesión; pendiente, sin extracción de credenciales ni uso de API interna.
- Movimiento por título de ambos paneles, soporte de flechas y límites de pantalla, botón minimizar/restaurar en panel de chats. Usuario confirmó movimiento en 0.13.0; inspección DOM posterior confirmó panel desplazado, tres tarjetas y creación Bitrix desactivada. Captura privada local, no publicada. Tres resúmenes visibles con motivos distintos; no se certifica ausencia absoluta de mezcla ni cobertura diaria, y las salas no activas se muestran como antiguas/pendientes.
- Abrir Resolver humano prioriza la sala y revalida inmediatamente el texto cargado sin espera de fondo. Si snapshot no cambió, reutiliza borrador; texto nuevo durante modal se actualiza con pausa breve. Ediciones humanas se conservan incluso al cancelar/reabrir. El registro de prioridad pausa nuevos trabajos de otras salas y los reanuda al liberarse. No se pulsa cierre nativo ni se modifican campos de iKono.
- Hallazgo de calidad real: un borrador atribuía atención finalizada sin cierre actual verificado. Se endurece instrucción de ambos modos para diferenciar solución de problema de cierre actual e interpretar marcadores históricos con cautela. El servicio rechaza expresiones directas de atención cerrada/finalizada/resuelta en vez de presentarlas como hechos verificados. Revisión de día y TC continúa obligatoria; resumen inmediato sigue limitado a 40 textos.
- Pruebas locales afectadas aprobadas: arrastre/teclado/minimizar, prioridad y cambios durante Resolver, preservación de edición al reabrir, bloqueo de auxiliar empaquetado, aislamiento por origen/sala, validación diaria y rechazo de cierre no verificado. Fixture de movimiento ajustado a esperar resize antes de comprobar límites; no equivale a cierres reales.
- No se cerraron conversaciones, no se crearon tareas ni se cambió etapa Bitrix. Sin cambios main. Actualizar a 0.13.1 y regenerar borradores antiguos para aplicar la instrucción corregida.


Servicio corregido desplegado READY en dpl_64yZ8cCe9gEgxumdELfSH9Bh3Zqx desde f8aa8662d3e45b27cb38c2e9a13bc919eb9f0d8f. Ensayo remoto exclusivamente ficticio: cierre histórico por inactividad + problema actual resuelto; HTTP 200, formato Motivo/Gestión/Resultado válido y cierre actual correctamente no confirmado. 536 tokens entrada / 107 salida. ZIP 0.13.1 verificado con move.js y hub.js. Captura privada real documenta tres tarjetas y cero auxiliares, sin publicar contactos.


### 0.14.0 · Verificación de recorrido y preparación de primera PRUEBA asistida
- Verificada en simulación ida/vuelta entre tres salas: cada una recupera su TC confirmada y corrección; no se cruzan las entradas enviadas a IA. Se conserva la elección al cancelar/reabrir y se revoca si cambia el nombre/contexto, aparecen otras TC explícitas en mensajes nuevos o cambian candidatas de fotos. Una TC no encontrada sigue admitiendo ingreso manual con confirmación humana.
- Añadida detección de candidato numérico corto después del nombre separado por guion; excluye teléfonos largos y años ambiguos. Nunca confirma automáticamente. Fixtures públicos usan nombres y números ficticios.
- Al abrir Resolver captura de inmediato mensajes recientes incluso con borrador corregido. Conserva ese borrador y muestra por separado los mensajes posteriores pendientes de revisión; no los incorpora silenciosamente como si el asesor ya los hubiera revisado.
- Correcciones de la descripción de tarea quedan separadas por sala/día/TC. Cambios de mensajes, selección o TC invalidan la revisión diaria anterior antes de enviar y antes de aceptar una respuesta. El panel de chats se minimiza al abrir Resolver para no tapar Cancelar; las correcciones OCR existentes se conservan al reabrir un borrador editado.
- Ocho pruebas finales específicas aprobadas: tres salas/TC/correcciones, prioridad al resolver y texto reciente, descripción por alcance, invalidación de revisión, selección CRM, mapeo de vista previa y candidatos TC. Prueba empaquetada de OCR/correcciones también aprobada; no se suman repeticiones como casos únicos. Sin cierres reales en estas pruebas.
- Inspección real solo lectura: el asesor seguía atendiendo con texto sin enviar; se preservó la sala y su borrador. Plantilla PRIMER CONTACTO 477 revalidada, con responsable/equipo y recurrencia en pausa. No se abrió ni modificó el borrador Bitrix anterior.
- El usuario autorizó una futura primera tarea asistida sobre clientes que atiende, marcada PRUEBA. Dos candidatos revisados por TC exacta: ambos con negociación única; la consulta de uno no devolvió tareas, el otro ya tiene una tarea abierta y requiere revisar duplicidad. Datos de contactos, IDs CRM y capturas conservados solo en dist privado, no publicados.
- Durante verificación: ninguna tarea creada ni transición Bitrix, ningún mensaje enviado ni cierre nativo. La extensión mantiene creación desactivada. La primera creación será asistida en la UI de Bitrix desde PRIMER CONTACTO, descripción con PRUEBA, después de revisar TC, clasificación, resumen diario/resultado y vínculo CRM con el formulario humano abierto. Asunto conserva la regla TC + TIPIFICACIÓN + detalle en mayúsculas. El cierre en iKono lo realiza el asesor.
- Preparación 0.14.0 lista; pendiente carga del usuario y primera ejecución real. Creación desde la extensión/API e idempotencia persistente siguen fuera de esta versión.


### 2026-11-12 · Primera tarea PRUEBA creada y verificada
- Usuario eligió un contacto real autorizado y dejó abierto Resolver con categoría/detalle. Se releyeron las selecciones actuales y el tramo de texto bajo el separador hoy, excluyendo contactos históricos anteriores al marcador. Se preparó manualmente un resumen Motivo/Gestión/Resultado con PRUEBA visible, sin números de documento, correos ni imágenes de identificación.
- La revisión distingue solicitud de retiro pendiente de validación, cancelación efectiva del servicio y cierre del contacto por inactividad. No se afirmó cancelación del servicio ni cierre nativo confirmado.
- Consulta previa de tareas no devolvió registros para la TC elegida. Se creó una sola tarea desde PRIMER CONTACTO 477, conservando responsable/equipo/observador/proyecto/sin fecha límite y asignando negociación y compañía exactas. Tipo de Incidencia y Tipificación TI replican respectivamente categoría y detalle de iKono; Plataforma contiene la TC, Gestión SAC la línea/contacto del chat y Producto/Prioridad conservan la plantilla. Tipificación 2 sin asignación por falta de regla.
- Creación confirmada por radicado, ficha visible y consulta API de solo lectura. Se pasó a Finalizadas Solicitud, conforme a la instrucción del usuario, sin pulsar Completar. Tras recargar persistieron descripción PRUEBA, campos, CRM y etapa. La tarea conserva estado Pendiente, distinto de etapa del tablero.
- No se modificó el borrador previo del usuario, no se creó una tarea para el segundo candidato que ya tenía una abierta, y no se enviaron mensajes al cliente ni se pulsó resolución en iKono. Versión visible de extensión 0.14.0; Resolver seguía abierto al terminar.
- Evidencia privada local: captura antes/después y registro con radicado/TC/CRM. No se publican identificadores ni datos de cliente en GitHub. Esta creación asistida no valida todavía creación desde extensión/API, idempotencia persistente ni cierre nativo automático. F02 y límites de historial/identidad siguen abiertos.
