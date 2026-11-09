# Buscar en Bitrix: diagnóstico y validación

## Evidencia del 9 de noviembre de 2026

Sobre `origin/main` en `2be2557`, el content script `src/bitrix-search.js`
realizaba directamente los POST de búsqueda y tareas desde el origen de la página.
Los permisos de hosts de una extensión no eximen esas peticiones de CORS:
https://developer.chrome.com/docs/extensions/develop/concepts/network-requests

Se consultó la URL predeterminada, sin cambiar datos:
`https://asistente-onoff.vercel.app/api/bitrix/search-deal`.

| Comprobación | Resultado |
| --- | --- |
| OPTIONS desde `https://onoff.a.ikono.im` | HTTP 204 |
| CORS | Origin `*`, métodos `POST, OPTIONS`, cabecera `Content-Type` |
| POST con `{ "tc": "8968" }` | HTTP 200, `ok: true`, una negociación, ID 14008 |

No se observó caída, error del endpoint, ni falta de permisos CRM para esa
consulta en ese momento. La captura por sí sola no identifica la URL guardada
en el navegador afectado; tampoco incluye consola ni registro de red. Por tanto,
no se puede atribuir definitivamente su fallo a CORS, URL local, proxy, TLS o
conectividad. La URL predeterminada sí funcionó y permitió el preflight.

El proceso Node local encontró `SELF_SIGNED_CERT_IN_CHAIN`; la misma consulta
con PowerShell y el almacén de certificados del sistema respondió correctamente.
No se desactivó la verificación TLS. Este resultado es una limitación del entorno
de diagnóstico, no evidencia de un certificado inválido del servidor.

## Corrección

- Las cuatro operaciones de lectura pasan por `ONOFF_BITRIX_REQUEST` al service
  worker. No se aceptan URLs ni endpoints enviados por el content script.
- Se validan emisor, acción, dato, URL base y permiso de host antes de consultar.
- Se limita la espera a 55 segundos y se distinguen URL inválida, permisos de
  extensión, conexión, espera agotada, autorización HTTP, error HTTP y respuesta
  inválida. Los errores HTTP conservan el detalle JSON del servidor.
- Se descartan resultados anteriores al cambiar de modo de búsqueda.
- No se amplían permisos del manifest ni se modifican credenciales o endpoints
  del backend.

## Validación reproducible

- `npm test`: pruebas del transporte para TC 8968, las cuatro rutas, validación,
  errores de red, timeout, 401/403, 404/503 y HTML inesperado.
- `npm run build`: prepara extensión y web.
- `npm run test:bitrix`: Chromium aislado con página en `127.0.0.1` y backend en
  `localhost` sin cabeceras CORS. Reproduce el fallo de un fetch desde la página
  y verifica búsquedas y tareas a través de la extensión. Incluye recuperación
  tras HTTP 503. Usa exclusivamente datos ficticios y no llama a producción.
- `npm run test:ui`: regresión general existente con fixtures locales.

La nueva regresión se ejecuta también en el flujo de validación de pull requests.

Resultado local: 43 pruebas automáticas aprobadas, build aprobado y las cinco
comprobaciones de `test:bitrix` aprobadas. La regresión general recorrió sus
comprobaciones funcionales (incluido Bitrix), pero su control final de ausencia
de peticiones externas falló por scripts de Kaspersky inyectados en el navegador
(`gc.kes.v2.scr.kaspersky-labs.com`). No se omitió ni se desactivó ese control;
debe repetirse en CI o en un entorno sin esa inyección antes de integrar.

## Antes de distribuir o desplegar

1. Cargar `dist/extension` en un perfil de pruebas y recargar la página anfitriona.
2. Confirmar en Opciones la URL efectiva del backend del usuario afectado.
3. Probar TC 8968 en su entorno y verificar negociación y tareas. Si vuelve a
   fallar, recoger el mensaje específico y la consola/red del service worker.
4. Revisar los resultados de CI antes de integrar a `main`.

Esta rama no requiere desplegar el backend para corregir el transporte. No se
realizó despliegue a producción. Teléfono y correo son una propuesta visual
independiente; no se implementan en esta corrección.
