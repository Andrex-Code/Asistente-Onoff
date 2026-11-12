# Piloto: tarea desde extensión 0.15.0

Implementado para una única tarea PRUEBA y una TC/sala autorizadas, con capacidad privada que vence en 24 horas. El paquete público no incluye esta capacidad. Credenciales Bitrix permanecen en el servidor; no se publican datos de clientes.

## Recorrido

1. Confirmar TC, consultar y seleccionar negociación exacta.
2. Revisar mensajes acumulados, marcar los correspondientes a hoy y esa TC; declarar cobertura revisada por el asesor. La cobertura diaria todavía no está certificada automáticamente.
3. Revisar/corregir descripción con Motivo, Gestión y Resultado. Confirmar revisión y tarea PRUEBA separada del radicado anterior.
4. Preparar tarea: el servidor solo consulta plantilla 477, metadatos, negociación y etapas. Firma el borrador, sin tarea en Bitrix.
5. El asesor pulsa Resolver conversación. La extensión compara TC, sala, clasificación, textos, selección y correcciones con la preparación. Cualquier cambio obliga a revisar de nuevo.
6. Esperar desaparición del diálogo **y transición de la misma sala identificada de forma única a Resuelto**. El clic y la desaparición por sí solos no permiten crear. La señal es DOM del cliente autenticado, no confirmación independiente de API iKono. Si la sala sale de la lista o no cambia de estado, no se crea automáticamente.
7. Reservar registro privado duradero; crear con XML_ID único, conservar plantilla/equipo y pasar a etapa del proyecto Finalizadas Solicitud. Verificar tarea y etapa; mostrar enlace.

Cancelar no crea tareas. Resolver sin mensaje continúa bloqueado. La extensión nunca pulsa Resolver por el asesor. Fuera del piloto no se habilitan escrituras.

## Mapeo verificado por REST, solo lectura

| Valor | Campo Bitrix |
|---|---|
| Categoría iKono, mayúsculas | UF_AUTO_573900885241 — Tipo de Incidencia |
| Detalle iKono, mayúsculas | UF_AUTO_676155297603 — Tipificación TI |
| iKono (teléfono) | UF_AUTO_650987796781 — Gestión SAC |
| TC confirmada | UF_AUTO_696155978843 — Plataforma |
| Negociación y compañía exactas | UF_CRM_TASK D_ID, CO_ID |
| Resumen revisado + PRUEBA + referencia de atención | DESCRIPTION |
| TC + TIPIFICACIÓN + detalle | TITLE |

Plantilla 477: responsable 931952, proyecto 53, 12 participantes y observador heredados en cada preparación. Producto y prioridad conservan valores admitidos de plantilla. Tipificación 2 no se usa como subcategoría. Destino 1421, etapa Finalizadas Solicitud; no se completa la tarea. No se activa repetición de plantilla.

## Reintentos y límites

Registro Blob privado exclusivo por piloto, reserva con allowOverwrite:false. El primer solicitante puede invocar task.add una sola vez. Tras timeout no se repite add: se reconcilia XML_ID; ante duda se detiene para revisión. Fallo de etapa recupera el mismo ID. Diario local permite Consultar resultado tras recargar si ya hubo cierre verificado; el borrador firmado contiene el resumen revisado y permanece local durante el piloto. No recargar mientras se espera la transición de cierre: todavía no se persiste una transición no verificada.

Pruebas: reserva concurrente, reintentos, timeout ambiguo, fallo de etapa, firma alterada, TC/sala/negociación incorrectas, cambios de resumen/mensajes/TC, cancelar, etiqueta de sala duplicada y desaparición sin estado Resuelto. Escrituras simuladas; ensayo final real de extensión pendiente del asesor. La tarea previa de prueba creada manualmente no constituye validación de esta automatización.

