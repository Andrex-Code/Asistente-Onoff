# Identidad de atención y cobertura de historial iKono

**Fecha:** 2026-11-11. **Estado:** diagnóstico real de solo lectura; pendientes identidad por atención y fuente de historial completo. Sin resolución, IA, Bitrix ni cambios en main.

## Evidencia de navegador

Se inspeccionó la misma sala de prueba autorizada, con el diagnóstico anterior detenido y sin panel. Se desplazó únicamente el historial y se devolvió al final. No se copiaron mensajes, nombres, teléfonos o IDs al repositorio.

| Muestra | Eventos DOM montados | Elegibles por lector actual | Retenidos por slice(-40) | Omitidos por límite |
| --- | --- | --- | --- | --- |
| Inicial | 47 | 26 | 26 | 0 |
| Tras cargar historial anterior | 76 | 46 | 40 | 6 |

El conteo reproduce los filtros de `src/assistant-chat.js:readConversation()`: ID no duplicado, data-self true/false, exclusión de notices/info, cuerpo de texto o audio/imagen. Los conteos describen elementos montados, no necesariamente visibles en el viewport ni el total de mensajes existentes en servidor.

Una comparación posterior de los IDs montados, realizada solo en memoria, encontró 56 incorporados y 22 retirados respecto de la muestra inicial. Los conteos evolucionaron durante la carga: **no corresponden al mismo instante que la fila de 76 eventos**. Esto demuestra que el conjunto DOM cambia con el desplazamiento; un snapshot no acredita historial completo. Se descartaron esos IDs de la memoria del ensayo tras comparar; no se publican valores o hashes.

## Identidad: sala no equivale a atención

Los enlaces de mensajes observados pertenecían a una sola sala. En el historial montado aparecieron 5 y luego 8 elementos con «Chat resuelto». **Son marcadores, no un conteo fiable de atenciones**: pueden existir varias señales por cierre y mensajes del bot. Junto al historial recurrente observado, indican riesgo de mezclar segmentos de la misma sala; no proporcionan una clave operacional validada por atención.

Los atributos de los event tiles observados incluyen data-event-id, data-self, data-scroll-tokens, data-layout y data-has-reply. No se encontró en esos tiles una clave explícita de atención operacional. Un event-id identifica un evento; el ID de sala identifica una sala. Ninguno debe convertirse por suposición en ID único de atención. El contador del panel solo identifica aperturas del formulario, por lo que cancelar y reabrir tampoco crea una nueva atención.

## Cambio preparado

`src/ikono-capture-assessment.cjs` es un evaluador **diagnóstico, aún no integrado**. Recibe conteos y hechos verificados; no lee mensajes/IDs, no envía datos ni modifica el lector habitual. Devuelve:

- `partial` cuando la captura omite mensajes por límite.
- `unknown` si no se ha verificado cobertura y límites de atención.
- Estado de uso completo solo cuando hay identidad de atención, límites e historial explícitamente verificados, sin omisiones, sin cambio de ventana DOM y con captura no vacía.

La bandera de ventana DOM cambiada exige una captura nueva verificada, no queda resuelta elevando el límite. Los hechos deben provenir de evidencia autorizada; el módulo no los certifica. Tampoco autoriza escrituras o sustituye autenticación e idempotencia.

**Pruebas:** 7 casos nuevos + 21 previos = 28/28 aprobados con Node 24.22.1, incluidos los escenarios reales 46→40 y 26→26. Node 22/CI sigue pendiente.

## Próximos pasos concretos

1. Identificar una clave de atención y sus límites desde una superficie o documentación oficial autorizada de iKono; verificar un ciclo posterior de la misma sala y otra sala de prueba. No deducir por texto «Chat resuelto» ni por la última incorporación de un agente.
2. Contrastar una atención ficticia de historial conocido contra una fuente autorizada que acredite inicio y fin; registrar cantidad y tipos de mensajes, incluidas notas, adjuntos y respuestas citadas.
3. Diseñar captura acotada al segmento de atención, deduplicada por evento y protegida contra cambio de sala. Hasta entonces etiquetar resumen como incompleto, sin envío automático.
4. Solo después, ensayar resolución final con autorización explícita, sin IA/Bitrix. La restricción actual de no cerrar sigue vigente.

La vista se dejó al final del historial; no quedaron modal ni panel abiertos. F02 continúa abierta. Las 20 aperturas/cancelaciones reales previas permanecen válidas, pero no cubren estas dependencias.
