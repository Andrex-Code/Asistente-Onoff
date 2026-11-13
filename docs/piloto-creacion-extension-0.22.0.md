# 0.22.0 — contacto activo sin depender del separador Hoy

## Evidencia y corrección

Inspección DOM de solo lectura en la sala de pruebas: sala activa En seguimiento, tipificación y detalle seleccionados, TC detectada, último cierre seguido de entrada del asesor y mensajes actuales, sin separadores ni fechas absolutas accesibles. El bloqueo provenía de un conjunto de textos vacío tras el filtro estricto de fecha. Las correcciones anteriores de regex y ancla de fecha no cubrían una carga inicial sin ancla.

Se conserva el camino de fecha verificada. Si no existe, se admite un tramo provisional únicamente en la sala activa seleccionada, con frontera visible de cierre/reapertura o entrada/saludo de asesor. Se excluyen bot/encuesta y contactos anteriores. Una fecha explícitamente anterior no se convierte en hoy; sin sala activa o sin frontera suficiente no se toma historia arbitraria. El tramo mantiene fecha no verificada y no se certifica cobertura diaria.

La TC se detecta en ese contacto aunque falte en el nombre. El resumen y la preparación ya no esperan un separador inexistente. Después del Resolver humano, la confirmación final indica la limitación y exige marcar que el tramo corresponde a esta atención de hoy y TC. El servidor firma esa necesidad y rechaza la creación sin dateReviewed; la cola conserva la confirmación en reintentos. No se añade revisión de resumen al formulario mínimo de TC.

## Recuperación

- Cambiar el origen de la misma TC (nombre a chat) revoca la asociación anterior y ejecuta otra consulta: no queda una clave de lookup que impida reconstruirla.
- Vaciar campos, seleccionar solo una categoría, cambiar detalle, cancelar/reabrir y recibir una respuesta tardía vuelven a preparar el estado actual.
- Fallos de IA, CRM, preparación o carga del piloto muestran Revalidar preparación y recuperan el recorrido sin recarga. Consulta CRM acotada a 15 s y cancelada al cambiar TC.
- Un borrador vencido se renueva; no habilita uno caducado ni queda gris para siempre. iKono conserva control de disabled nativo.
- Persisten la confirmación final, protección del botón sin mensaje, aislamiento por sala/atención/TC, idempotencia y orden etapa Finalizadas Solicitud → completar → verificar.

## Verificación

Pruebas con el motor cliente real, servicios simulados y nombres con prefijo TC, prefijo numérico, sufijo y sin TC; mención solo en el chat; carga en frío sin Hoy; contacto anterior excluido; formulario mínimo manual; varias TC y negociaciones; campos parciales; errores/reintento; cancelación y respuesta tardía; caducidad; cambio del nombre sin perder TC del chat; y confirmación de fecha exigida en cliente, servidor y cola.

La reproducción cambia el nombre del formulario sintético; no se renombró ni cerró el contacto real, ni se crearon tareas Bitrix. La inspección real quedó hecha, pero el control nativo de Edge se detuvo al no poder verificar la URL, por lo que no se recargó la extensión real ni se declara comprobada esa instalación. Se entrega paquete privado dist/ONOFF-resumen-0.22.0-PRUEBA.zip y actualización de servidor; requiere recargar extensión e iKono. Main intacta.
