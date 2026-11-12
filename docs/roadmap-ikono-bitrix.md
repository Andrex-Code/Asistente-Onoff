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
