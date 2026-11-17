# 0.22.8 — el panel Buscar en Bitrix no debe borrar la clasificación

En la sesión real se observó categoría FALLAS EN SOFTWARE y detalle FALLA EN LOGIN completos, TC/CRM correctos y resumen disponible. El borrador interno mostraba categoría/detalle pendientes. Había dos elementos role=dialog: Resolver conversación y Buscar en Bitrix. task.js recorría ambos y la lectura vacía del segundo reemplazaba los campos del primero. Cerrar la búsqueda la dejaba display:none, pero el selector seguía leyéndola.

Se reprodujo el fallo en dos pruebas nuevas con el motor cliente real: panel auxiliar visible y panel auxiliar oculto; ambas fallaron antes del arreglo. collect ahora identifica exclusivamente el diálogo visible cuyo nombre accesible es Resolver conversación. Si no hay uno único no reutiliza una clasificación anterior. No se fuerza el botón nativo ni se omite ningún requisito de preparación.

En la sesión real se comprobó que el compositor y Observaciones estaban vacíos. Se recargó iKono y se restauraron mediante UI los mismos campos seleccionados. Al no estar creado el panel auxiliar después de recargar, incluso la instalación 0.22.7 pudo preparar TC7133. Se verificaron el aviso Lista para resolver, disabled=false y ausencia del bloqueo ONOFF. No se pulsó Resolver ni se creó tarea por parte del agente.

La corrección permanente está en el paquete 0.22.8: actualizar la misma extensión y recargar iKono cuando no haya texto pendiente. La recarga de una pestaña por sí sola no actualizó la versión instalada, que permanecía 0.22.7. La solución temporal de la atención actual no debe confundirse con tener instalado el arreglo que permite reabrir Buscar en Bitrix sin interferencia.

La autorización privada vigente se conserva hasta 19/11/2026 09:24 Colombia; no se volvió a renovar ni se alteraron el servidor, cuenta, TC obligatoria o confirmación final PRUEBA. Main intacta.

Validación final: 35/35 pruebas de cliente aprobadas, incluyendo aislamiento del diálogo, campos parciales, errores/reintentos, confirmación humana, selector automático y recorridos consecutivos. Las dos pruebas de aislamiento fallaron antes de corregir y pasaron después.
