# QA de interrupciones y recuperación

Auditoría local del 13/11/2026. Se ejecutan los módulos reales de cola y journal en entornos aislados; red, almacenamiento del navegador y reloj simulados. No se cerraron chats ni se escribió en Bitrix.

## Casos reproducidos

1. Reinicio del worker cuando el cuarto y último intento estaba en fase sending, sin respuesta guardada.
2. Reinicio durante un intento anterior: restauración de la alarma y recuperación del registro.
3. Pérdida de respuesta después de que el servidor simulado creó una tarea: reintento con la misma intención y recuperación del mismo radicado.
4. Sin conexión y luego recuperación: se conserva borrador, confirmación e intención.
5. Autorización vencida: fallo explícito sin llamada de red; renovación de la misma sesión permite recuperar el registro.
6. Recarga sin confirmar el borrador: se conserva, pero no se envía ni se agenda.
7. Cambio de día: no elimina un envío ya confirmado ni altera su identidad.

## Defecto encontrado y corregido

P1 en delivery.js restore(): un cierre del worker durante el último intento dejaba attempts=4, phase=sending. Al reiniciar no se restauraba ninguna alarma ni se marcaba failed. La bandeja podía mostrar un envío en proceso indefinidamente.

La prueba nueva falló antes del arreglo: esperaba failed y encontró sending. Ahora restore marca explícitamente ese registro como fallo recuperable, conserva intención, evidencia y borrador, y explica que el resultado no está confirmado. No añade un quinto intento automático. El reintento manual usa el mismo registro, nunca una nueva intención. Los resultados ya guardados y los registros sin confirmación permanecen intactos.

## Resultado y límites

7/7 pruebas nuevas aprobadas. Ejecución conjunta con delivery, journal y creación de servidor: 36/36 aprobadas, sin fallos. Las pruebas existentes verifican además reserva idempotente, reconciliación por XML_ID después de respuesta perdida, cambio de etapa antes de completar y recuperación sin repetir la creación.

La prueba de respuesta perdida de esta auditoría usa servidor simulado con identidad estable; la reconciliación real del módulo servidor se valida por separado en la batería incluida. El reinicio se reproduce creando una nueva instancia del worker con el mismo almacenamiento persistido, no matando Edge real. El cambio de día de esta prueba cubre la cola confirmada, no certifica el historial DOM ni la cobertura diaria de una sala. No se garantiza resistencia a corrupción/borrado del almacenamiento, desinstalación de la extensión o a todas las variantes del portal. Una renovación con otra cuenta/scope no debe adoptar registros ajenos.

Archivos nuevos: tests/qa-interruptions.test.cjs y este informe. Archivo productivo corregido: tools/ikono-summary-preview/delivery.js. Incluido en el paquete privado 0.22.2; prueba en sesión real pendiente.
