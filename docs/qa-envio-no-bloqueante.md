# QA — envío no bloqueante

Pruebas aisladas en Chromium con el motor real de la extensión y el fixture de asesor. Red IA/CRM y journal/Bitrix simulados. No se opera iKono real ni se crean tareas reales.

Archivo: tests/qa-nonblocking-delivery.test.cjs.

Contratos probados:

1. Confirmar A oculta el modal grande y deja una barra con su título mientras se retiene deliberadamente la respuesta. Se puede abrir/preparar B. Al terminar A, la TC, mensajes y estado preparado de B se conservan.
2. La barra ofrece Ver detalle. Si A falla, el error y su registro recuperable permanecen visibles sin borrar B.
3. Preparar un borrador, sin cierre humano verificado, no ofrece confirmación de envío ni llama confirm.
4. Ver detalle abre historial de envío pendiente; reintentar desde allí durante el primer envío no duplica confirm ni dispara resume. Cerrar historial oculta el detalle y conserva la barra.

Se usan fechas verificadas para aislar el contrato de envío del cambio paralelo de validación interna de fecha. El mock de confirmación del fixture se intercepta solo dentro de este archivo. La prueba no demuestra la latencia de Bitrix real ni reinicia Edge. Resultado sobre fuentes productivas estables: **3/3 casos aprobados**, sin fallos, en 58,4 s. Un ensayo anterior coincidió con la edición del código y no se considera comparación antes/después concluyente. El cuarto caso focal de expansión/cierre y deduplicación aprobó por separado: 1/1 en 26,2 s. Para representarlo, el mock cambia explícitamente el registro a pending mientras retiene la respuesta; equivale al estado persistido por el background real. Se comprobó confirm=1 y resume=0 durante el primer envío. El journal y la recuperación de red tienen cobertura separada.


Quinto contrato añadido: un fallo A visible en barra se reconcilia al detectar en el journal local que el reintento del worker terminó creado. La barra debe desaparecer en seis segundos, mostrar aviso de éxito, no reabrir historial y conservar B preparado. El test no llama resume; simula únicamente el cambio de estado del registro local. Resultado focal del quinto caso sobre código estable: **1/1 aprobado**, sin fallos, en 14,4 s. Se verificó el aviso de éxito y la ausencia de un nuevo envío. Evidencia acumulada: 3/3 iniciales más 1/1 detalle más 1/1 reconciliación, en ejecuciones separadas; la ejecución conjunta final corresponde al agente principal.
