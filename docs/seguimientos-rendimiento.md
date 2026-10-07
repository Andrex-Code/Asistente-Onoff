# Seguimientos 1.9.0: rendimiento y equipo SAC

## Hallazgos de la revision (7 de octubre de 2026)

La version 1.8.0 consultaba hasta 20 paginas del historial por propietario, filtraba las tareas cerradas y de proceso despues de descargarlas, repetia la consulta al seleccionar al asesor y esperaba todos los conteos antes de entregar las coincidencias. La paginacion visual de 10 no evitaba esas descargas. Dos solicitudes al Preview desde una sesion de pruebas tardaron 20.393 s (consulta individual, 133 tareas) y 14.424 s (busqueda con 6 coincidencias). Son mediciones puntuales del servidor, no un SLA ni tiempos medidos en el PC del asesor.

## Cambios

- Busqueda de usuarios inmediata, separada de los conteos. Los conteos se solicitan en bloques de 4 y no bloquean la seleccion.
- Filtro de propietario CREATED_BY y de estados reales abiertos desde Bitrix. Solo se consideran tareas principales (PARENT_ID vacio/0); las subtareas y el prefijo Tareas de proceso se excluyen tanto de listas como de conteos.
- Cache por propietario durante 45 segundos y reutilizacion entre conteos y consulta. Cache de usuarios por 5 minutos y equipo SAC por 10 minutos. Cache en el service worker para reutilizar respuestas entre pestanas. No se usan nombres precargados ni claves en la extension.
- Maximo de tres llamadas simultaneas a Bitrix por instancia; solicitudes identicas comparten la misma promesa. Se aprovechan los nombres incluidos en las tareas y se resuelven solo los faltantes, por bloques.
- Actualizar fuerza lectura reciente. Se muestra la fecha de consulta. Cancelar descarta respuestas para esta ventana; no interrumpe una consulta compartida que pueda estar usando otra pestana.
- Selector Equipo SAC junto al nombre. Seleccion directa por ID, sin buscar coincidencias ni contar tareas ajenas.
- Nueva busqueda, volver a coincidencias, paginacion de 10, salto de pagina, orden por creacion/prioridad y preferencia de orden guardada.
- Timeout y errores JSON controlados con await en el router. Nunca se convierte un error de conteo en cero. No se presentan paginas incompletas como si fueran un total exacto.
- Sin nueva funcion serverless. El endpoint existente delega las consultas por TC al archivo original conservado en lib/client-tasks-legacy.js. No cambia main ni habilita escrituras en Bitrix.

## Fuente de la lista SAC

Se usan usuarios activos de Bitrix. Precedencia opcional de variables: BITRIX_SAC_OWNER_IDS, BITRIX_SAC_DEPARTMENT_IDS y BITRIX_SAC_MEMBER_NAMES. Si no se configura ninguna, el backend resuelve por nombre un roster SAC aprobado de 12 integrantes y solo devuelve coincidencias de esa lista; nunca se sustituye por todos los empleados. Si algun integrante no puede resolverse, el selector informa cuantos faltan. Los homonimos exactos se agrupan por nombre normalizado y conservan sus IDs.

## Pruebas

Ejecutar npm test (Node 22). Pruebas sin credenciales: busqueda sin consultar tareas, filtros de propietario/estado/PARENT_ID, exclusion de subtareas y procesos, paginacion, cache/coalescencia, caducidad/refresh, conteos fallidos, limites de concurrencia, roster SAC, validacion de IDs y transporte restringido. La interfaz tambien se verifico en Chromium con respuestas simuladas: selector, legibilidad, orden, paginas, volver, limpiar, actualizar, minimizar y pantalla pequena. La comprobacion final con datos reales se hace en el Preview.

## Otros frentes detectados (no mezclados con esta entrega)

1. Seguridad: varias APIs existentes no exigen autenticacion de dispositivo y el alias de pruebas tiene una excepcion de proteccion. La cache y la validacion de mensajes no sustituyen esa autenticacion. Revisar el endurecimiento antes de ampliar el despliegue.
2. Configuracion/IA: lib/config-store.js relee Blob sin cache en cada peticion. Evaluar cache breve con invalidacion al guardar y no cambiar modelos para resolver la lentitud de Seguimientos: este modulo no usa IA.
3. Interfaz general: menu-polish.js ejecuta sincronizacion cada 500 ms; window-layout-fix.js observa todo el body. Conviene consolidar eventos y controladores de ventanas en una entrega con pruebas de todas las herramientas.
4. CRM: se repiten resoluciones de usuarios/empresas/etapas entre endpoints. Centralizar un cliente Bitrix compartido y cachear catalogos sin mezclar resultados de clientes.
5. Afacturar: ya existe cache de 5 minutos del indice remoto; comprobar empaquetado porque background.js contempla data/afacturar-index.json y ese archivo no estaba en el arbol revisado. No eliminar el respaldo remoto.
6. Cache serverless: memoria local no garantiza aciertos entre instancias. Medir antes de contratar almacenamiento o cambiar plan; el service worker ya reduce repeticiones en el navegador. Para conjuntos muy grandes, una segunda fase puede paginar en servidor preservando conteos y orden global exactos.

## Referencias tecnicas

- https://apidocs.bitrix24.com/api-reference/tasks/tasks-task-list.html
- https://apidocs.bitrix24.com/api-reference/user/user-get.html
- https://apidocs.bitrix24.com/api-reference/user/user-search.html
