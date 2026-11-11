# Roadmap · Automatización de trazabilidad iKono → Bitrix

**Inicio:** 2026-11-11. **Estado:** F01 · Análisis, en curso. **Ámbito:** Asistente ONOFF (extensión Chrome/Edge + backend Vercel). **Modo inicial:** confirmación humana. **Producción:** sin cambios.

## Última evidencia · ensayo instrumentado en Edge

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
