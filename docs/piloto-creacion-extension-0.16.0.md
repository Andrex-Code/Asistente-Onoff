# 0.16.0 — salida a encuesta y piloto de varios clientes

## Evidencia del fallo

Se analizó de solo lectura el reporte XLSX entregado por el usuario. Para el contacto seleccionado hay dos atenciones del día: una anterior RESUELTO y la del ensayo en ON_RATING, con salida del asesor por Resolución y categoría/detalle conservados. ON_RATING indica que la atención pasó a encuesta; no equivale a resolución técnica del incidente. No se publican archivo, filas, nombres, teléfonos ni IDs del cliente.

En la UI real, tras Resolver humano, desaparecieron modal y sala de la lista y la ruta pasó a #/home. La 0.15.0 esperaba Resuelto en una tarjeta que ya no existía: no envió task.add. Intentar leer la sala después mostró que no permite previsualización; no se pulsó Unirse ni se reabrió la atención.

## Corrección

- El borrador firmado se conserva en almacenamiento local antes de mostrar Lista. Recargar no convierte una preparación en evidencia de cierre.
- Se admite el patrón correlacionado: clic humano de Resolver sobre borrador vigente + diálogo retirado + tarjeta original retirada + #/home estable durante dos segundos + ausencia de alertas y de nuevas acciones de teclado/puntero. También se conserva la vía explícita Resuelto en la sala original. Cambio de chat, retiro de modal o clic aislados no bastan.
- Esta señal es una inferencia de UI basada en el comportamiento observado y contrastado con el reporte; **no es un recibo independiente de API iKono**. Errores, interacción durante la espera y casos ambiguos detienen la creación. No se descarga ningún reporte en el recorrido habitual.
- Aviso de creación persistente y enlace desde Inicio, aunque se oculte el panel de la sala.
- Piloto autenticado temporal para varias TC, con asociación CRM validada en servidor. Plantilla, responsable, participantes y observador se conservan. Los radicados técnicos del resumen son referencias; Bitrix asigna un número nuevo a la tipificación.
- Reserva duradera separada por sala/día Colombia/TC. Repetir un cierre con revisión distinta del mismo alcance no crea una segunda tipificación; requiere revisar el registro existente. No se implementa actualización automática de una tarea ya creada.
- Sigue siendo obligatorio confirmar TC, seleccionar negociación, revisar cobertura diaria y resumen, y preparar PRUEBA antes del Resolver humano. No se habilitan tareas fuera del paquete piloto privado.

## Validación y límites

Pruebas de UI con respuestas simuladas reproducen el retorno a Inicio y muestran envío único del borrador. Pruebas de servidor verifican aislamiento de alcances, rechazo de segunda revisión y recuperación del mismo ID tras fallos. Los tests de almacenamiento verifican persistencia antes de armar y que preparar no permite Consultar resultado como si hubiera cierre.

Pendiente recarga 0.16.0 y primera creación real originada por extensión. La atención ya cerrada con 0.15.0 no se vuelve a cerrar y no se declara creada retroactivamente. No se usó task.add real durante esta corrección. Main intacta.

