# QA independiente: tipificaciones consecutivas

Fecha: 13 de noviembre de 2026. Base auditada: 0.22.0. Ensayo local con Chromium, código cliente real y servicios IA/CRM/Bitrix simulados. No se operaron chats reales ni se realizaron escrituras en Bitrix.

## Hallazgos y cambios necesarios

### P1 — el cambio de sala cancelaba el resumen de la siguiente atención

Reproducción: completar la confirmación de A, ir a Inicio, cambiar la ruta a B y montar su formulario Resolver en el mismo turno de la interfaz. El observador detectaba `dialog-opened` de B e iniciaba su resumen antes de recibir `hashchange`; el manejador `clear()` posterior cancelaba ese trabajo y borraba el estado recién iniciado. La tarjeta podía conservar «Generando resumen…» sin resumen disponible. La TC y los mensajes de B sí estaban capturados; no era un error de expresión regular de TC.

Ubicación: `tools/ikono-summary-preview/auto.js`, funciones `clear()`, `messages()` y manejador `dialog-opened`. También se reprodujo al cancelar A y abrir B. Primera ejecución contra 0.22.0: 2 de 2 casos fallaron al esperar que B estuviera listo, con servicios simulados inmediatos. No se aumentó el tiempo de espera para esconder el fallo.

Cambio aplicado por el agente principal: sincronizar la sala antes de capturar/generar; no volver a limpiar la sala si su apertura ya procesó el cambio de ruta; reiniciar referencia de memoria y temporización al cambiar de sala. Se comprueba que cada nueva preparación contiene únicamente la TC, sala y mensajes actuales.

### P1 — una respuesta antigua del seguimiento podía restaurar la prioridad anterior

Ubicación: `tools/ikono-summary-preview/dashboard.js`, `poll()`; y `hub.js`, mantenimiento de prioridad. La respuesta de una consulta enviada mientras A estaba en revisión podía llegar después de abrir Resolver B y reemplazar su prioridad, dejando la generación en espera por otro chat.

Cambio aplicado por el agente principal: descartar respuestas con secuencia, URL o estado de cierre anteriores; mantener la prioridad local de Resolver; liberar la prioridad al cambiar de sala y acotar su vigencia. La prueba QA retiene deliberadamente la respuesta de A, prepara B y después libera A: B conserva su prioridad y datos.

### P1 — límite global de doce salas detenía salas posteriores

Ubicación: `tools/ikono-summary-preview/memory.js`, `get()` y `scoped()`. Hallazgo adicional del agente principal: después del límite global se devolvía `null`, aunque el resto del recorrido con timeline seguía esperando memoria. Eliminar ese bloqueo global, conservando separación por día/sala/atención y límites de textos por atención. La verificación de dieciséis salas está en las pruebas adicionales del agente principal.

## Pruebas QA añadidas

Archivo: `tests/qa-sequential-typifications.test.cjs`.

1. Tres tipificaciones completas en una misma extensión cargada: A → B → C, TC diferentes y mezcla de fecha verificada/provisional. Verifica tres confirmaciones y ausencia de mensajes ajenos.
2. Cancelar una preparación y abrir otro chat, sin escribir ninguna tarea.
3. Respuesta de seguimiento del chat anterior que llega tarde, después del Resolver actual.
4. Otro chat con la misma TC después de una creación: no hereda los textos del primero.
5. Fallo de consulta CRM en el segundo chat y reintento sin recargar, conservando TC y mensajes correctos.
6. Resumen de A en vuelo al cambiar a B: su respuesta tardía no reemplaza B ni impide preparar B.
7. Corrección humana de A, visita a B y regreso a A: se conserva la corrección de A y no se copia en B.
8. Fallo de IA en el segundo chat y reintento: la primera descripción no se presenta como válida para el siguiente cliente.
9. Segundo contacto de la misma sala y misma TC tras un cierre: los textos del contacto anterior quedan fuera de la nueva preparación y se permite una segunda confirmación.

Resultado final conjunto sobre 0.22.1: **100/100 pruebas aprobadas**, sin fallos, incluyendo los nueve escenarios QA en la misma ejecución (88,4 s). La prueba de la extensión empaquetada se actualizó para revelar el panel de diagnóstico exclusivamente en su fixture, porque permanece oculto por diseño en modo asesor. Revisión de los cambios: no se elimina la revisión humana final ni se alteran métodos de escritura/plantilla/etapas; se conservan límites por atención y se libera únicamente el bloqueo global por cantidad de salas.

## Alcance y siguiente comprobación

Estas pruebas prueban las transiciones reales del código cliente con dependencias simuladas y sin cambiar de proceso/extensión entre atenciones. No certifican la disponibilidad o latencia del servicio IA real, la forma exacta en que iKono remonta el diálogo en todas las cuentas, ni una escritura real nueva en Bitrix. La comprobación de usuario pendiente debe realizar dos cierres consecutivos en chats de prueba, revisar TC/resumen/negociación en ambos y verificar una sola tarea por confirmación, con etapa Finalizadas Solicitud y luego Completada. Las pruebas existentes de servidor/cola verifican por separado el orden y la recuperación sin duplicados.
