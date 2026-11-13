# 0.22.6 — validar la sala actual de la pestaña

La captura del asesor muestra TC detectada y rechazo de sala/piloto. El paquete local conserva modo multi y autorización vigente. El mensaje de error se originaba en una comprobación del worker que comparaba payload.room con MessageSender.url, sin consultar la pestaña actual.

Se reprodujo el mismo rechazo en un fixture del worker real: metadatos de emisor en sala A, pestaña actual en B y preparación de B. Antes del cambio fallaba B y, además, aceptaba el payload viejo de A. Ambos casos se agregaron como regresión. Este escenario reproduce el fallo; no se inspeccionaron los metadatos de la sesión real del usuario.

Ahora prepare consulta chrome.tabs.get y compara el origen y la sala actuales con el payload. Un cambio de sala o un origen distinto sigue rechazándose antes de la consulta de preparación. Las capacidades limitadas a una sola TC/sala siguen limitadas: se distingue ese error de un cambio de chat. Si no puede verificarse la pestaña, falla con explicación y permite revalidar; no se acepta el payload sin esa comprobación.

El manifiesto añade permisos de host limitados a onoff.a.ikono.im y onoff.s.ikono.im para leer la URL de la pestaña sin depender de un clic en la barra de extensiones. Son los mismos dos sitios donde ya se ejecutan los scripts; la autorización de Bitrix y el servidor no cambian. Edge puede requerir habilitar el acceso a esos sitios al recargar esta versión.

## Pruebas

- Cuatro pruebas de sala: metadatos antiguos/sala actual, payload anterior rechazado, piloto de una TC preservado y origen distinto rechazado. Antes: dos fallos; después: cuatro aprobadas.
- Batería dirigida de sala, recuperación, cola, journal y servidor: 43/43 aprobadas.
- Prueba con extensión realmente cargada en Chromium: navegación de ruta A a B sin recargar ni pulsar el icono; lectura de la URL actual e invocación desde el contenido de la pestaña. El payload de A se rechaza antes de la red. Aprobada.

No se cerraron chats reales ni se escribieron tareas Bitrix. El paquete privado 0.22.6 debe reemplazar los archivos de la misma extensión instalada, recargarse y después recargar iKono. Main intacta; comprobación en la sesión del asesor pendiente. Mantiene TC/CRM obligatorios, automatización del selector, confirmación final PRUEBA y recuperación sin cambiar la intención del envío.

Resultado final: 122/122 pruebas de regresión aprobadas, sin fallos (200 s), más la prueba independiente de permisos y navegación de la extensión cargada aprobada.
