# 0.16.1 — primera creación real desde extensión y recuperación de etapa

El asesor confirmó TC, cobertura de hoy y ambos contactos del historial. La extensión generó el resumen diario; la revisión corrigió omisión de un contacto anterior y una frase que afirmaba cierre antes del clic. Se preservó categoría/detalle elegidos por el asesor. El resumen debe seguir revisándose: la generación automática todavía puede omitir gestiones.

Tras el Resolver humano, 0.16.0 detectó salida a Inicio y creó una tarea real PRUEBA mediante el backend. Se verificaron en UI responsable, proyecto, 12 participantes, observador, negociación/compañía, Plataforma, Tipo de Incidencia, Gestión SAC, Producto, Tipificación TI, prioridad y descripción. No hubo creación manual del asistente.

La comprobación posterior detuvo el movimiento a Finalizadas Solicitud: este portal recortó XML_ID a 50 caracteres. Se conservó el ID devuelto por task.add en el registro duradero. Se normaliza ahora XML_ID tanto al crear como al comparar y reconciliar tareas anteriores. La recuperación usa el ID ya guardado y no vuelve a ejecutar task.add. Prueba adicional reproduce el truncamiento real y confirma un solo add y un solo movimiento tras recuperación.

0.16.1 añade Consultar tareas PRUEBA pendientes visible desde Inicio, incluso después de recargar. Si hay más de un pendiente, se detiene para revisión; no elige arbitrariamente. Borradores sin evidencia de cierre no son pendientes recuperables.

Hallazgo adicional: Bitrix asignó una fecha límite a la tarea, aunque la creación no envió DEADLINE y la plantilla mostraba sin fecha límite. Causa y política de automatizaciones pendientes de confirmar; no se modifica manualmente esta fecha sin regla acordada.

Estado actualizado: creación real desde extensión comprobada y recuperación real completada desde el botón de Inicio de 0.16.1. La extensión devolvió el mismo ID y Finalizadas Solicitud; se recargó la ficha de Bitrix y persistieron descripción PRUEBA, CRM, campos, equipo y etapa. No se usó creación ni cambio de etapa manual por el asistente. Evidencia y radicado conservados en dist privado, sin datos de clientes en GitHub. Main intacta.

