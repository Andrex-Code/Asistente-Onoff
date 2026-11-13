# 0.21.1 — Resolver sin estados contradictorios

Inspección DOM de solo lectura: iKono mantiene el botón final dentro de mx_Dialog_buttons_row, con clasificación React Select separada. Se observaron los dos valores seleccionados y preparación Lista, sin pulsar Resolver ni alterar tareas. El síntoma del usuario se investigó además en pruebas sintéticas.

## Fallos corregidos

- La captura retenía la categoría anterior cuando el control quedaba vacío. Ahora conserva también valores vacíos/incompletos, por lo que vaciar o reabrir no reutiliza una tipificación previa.
- La extensión escribía disabled directamente en el botón administrado por iKono. Eso puede desincronizar el estado visible y el estado del manejador de React. Ahora iKono conserva la propiedad disabled; ONOFF aplica su propia barrera visual/aria y captura del evento sin forzar habilitación nativa.
- La barrera verifica atómicamente categoría, detalle, vigencia del borrador, firma actual, revisión y actividad en curso. Se sincroniza después de actualizar/preparar, no solo antes de procesar el formulario.
- Cancelar, cambiar de sala o retirar el diálogo invalida la generación de preparación. Una respuesta tardía del formulario anterior no habilita el nuevo. Se reinician las claves de preparación; las correcciones se conservan.
- Si una revisión automática se invalida, el contexto puede volver a prepararse. Los fallos ofrecen Revalidar preparación; no se mantienen indefinidamente como un botón gris sin explicación. Un intento de cierre que mantiene abierto el diálogo con error o sin confirmación durante 30 segundos se retira como pendiente ambiguo, sin creación de tarea. Un nuevo intento requiere nueva acción humana.

## Recorrido probado

Formulario sin valores → solo categoría → categoría y detalle completos → preparación → Resolver; vaciar nuevamente; cancelar/reabrir y llenar; respuesta demorada de una preparación cancelada; propiedad disabled nativa que cambia al seleccionar; envío correlacionado y confirmación final. Los escenarios de cierre se ejecutan en Chromium sintético, con servicios simulados y sin cerrar chats reales ni crear tareas.

Se conservan TC contextual, separación de atenciones de hoy, resumen/correcciones, confirmación final obligatoria, CRM exacto, protección del botón sin mensaje, reintentos e idempotencia. El servidor sigue siendo 0.20.1, incluyendo mover a Finalizadas Solicitud antes de completar y verificar estado 5. No requiere despliegue nuevo de servidor.

Paquete privado: dist/ONOFF-resumen-0.21.1-PRUEBA.zip. Recargar ONOFF y después iKono; abrir Resolver de nuevo y seleccionar los dos campos. Esperar el aviso Lista si el resumen o CRM todavía se están validando. No se certifica el recorrido de una instalación anterior como prueba de esta versión. Main intacta; código y pruebas en la rama acordada. Ensayo real posterior a la recarga pendiente.
