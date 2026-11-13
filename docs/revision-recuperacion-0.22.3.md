# 0.22.3 — revisión de la recuperación antes del ensayo con clientes

Se revisó la solución 0.22.2 además de ejecutar sus pruebas. Se encontraron dos omisiones en la integración del worker, aunque las pruebas de la función restore aislada pasaban:

1. La recuperación solo se llamaba desde onStartup/onInstalled. Un worker MV3 puede iniciarse por un mensaje o alarma sin esos eventos. Ahora la recuperación se inicia al evaluar el módulo y se espera antes de atender mensajes o alarmas. Así un cuarto intento interrumpido pasa a fallo visible también en un reinicio ordinario. Las altas y reintentos nuevos no compiten con una restauración atrasada.
2. La comprobación global de vencimiento impedía listar el historial. Ahora list permanece disponible dentro del mismo scope aun vencido; preparar, confirmar o reintentar siguen bloqueados hasta contar con autorización vigente. No se adoptan registros de otra sesión.

Las tres pruebas nuevas de integración ejecutan task-background.js y delivery.js reales sin emitir eventos de instalación/inicio. Comprueban recuperación del último intento, alarma para intentos anteriores, historial vencido accesible y ausencia de red con acceso vencido. La batería dirigida pasó 39/39. Resultado final conjunto: **110/110 pruebas aprobadas, sin fallos** (195 s), incluida la extensión empaquetada. La batería general incluye los nueve recorridos secuenciales, siete interrupciones y estas tres pruebas.

Se conservan las salvaguardas: TC obligatoria y negociación exacta; tipificación y detalle de iKono; correcciones del asesor; confirmación humana posterior al cierre; marca PRUEBA; intención estable en reintentos; Finalizadas Solicitud antes de completar; resultado verificado antes de éxito. No se ha cambiado el servidor, el modelo ni los permisos de la extensión.

## Ensayo autorizado

Actualizar la misma carpeta instalada, recargar ONOFF y después iKono. Usar 0.22.3. Revisar TC, negociación, Motivo/Gestión/Resultado y confirmar una sola vez. Verificar radicado único, marca PRUEBA, etapa Finalizadas Solicitud y estado Completada. Repetir con el siguiente cliente sin reiniciar la extensión. Si hay un envío pendiente, consultar/reintentar su registro, sin crear otra tarea manual para sustituirlo.

La autorización local del piloto se comprobó vigente, con vencimiento el 15/11/2026 a las 17:55 de Colombia. No se amplió ni se publicaron credenciales. Su vencimiento exige renovación antes de nuevos envíos.

No se cerraron conversaciones ni se crearon tareas reales durante esta revisión. La batería usa dependencias simuladas y una extensión empaquetada en navegador de pruebas; falta observar la prueba real que efectúe el asesor. No se garantiza la disponibilidad de iKono, IA o Bitrix ni todas las variaciones de sus interfaces.
