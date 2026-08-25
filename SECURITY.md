# Seguridad de Asistente ONOFF

## Modelo de acceso de la extensión

La extensión usa activación por dispositivo, no cuentas individuales de asesores.

1. Un administrador entra a `/admin` y genera un código de activación de un solo uso para un nombre como `SAC-PC-01`.
2. El asesor instala la extensión, abre Opciones e ingresa ese código una sola vez.
3. El backend registra el dispositivo en Vercel Blob privado y entrega una credencial renovable.
4. La extensión obtiene tokens cortos automáticamente y los renueva sin pedir intervención al asesor.
5. Si el equipo se revoca desde `/admin`, deja de renovar su acceso.

## Persistencia y reinstalaciones

- Reiniciar Chrome/Edge: no requiere reactivación.
- Reiniciar Windows: no requiere reactivación.
- Actualizar o recargar la extensión: no requiere reactivación mientras el almacenamiento local siga intacto.
- Borrar caché/cookies normales del navegador: no debería afectar la activación de `chrome.storage.local`.
- Desinstalar completamente la extensión: Chrome elimina el almacenamiento local de la extensión; al reinstalar se debe generar un código nuevo.
- Borrar/restablecer el perfil del navegador o limpiar datos de extensiones: requiere reactivación.
- Migrar a otro PC/perfil: requiere una nueva activación.
- Si se reactiva usando el mismo nombre de equipo, la activación anterior se revoca automáticamente para evitar dispositivos fantasma.

Nunca se intenta recuperar automáticamente una credencial después de una desinstalación completa: eso exigiría guardar un secreto fuera del almacenamiento protegido de la extensión y reduciría la seguridad.

## Tokens y vencimientos

- Token de API: corto, por defecto 1 hora (`EXTENSION_SESSION_SECONDS=3600`).
- Credencial renovable del dispositivo: por defecto 180 días (`DEVICE_REFRESH_DAYS=180`). Cada uso normal la renueva automáticamente.
- Código de activación: un solo uso y por defecto 10 minutos (`DEVICE_ENROLLMENT_SECONDS=600`).

## Controles aplicados

- Todas las APIs de IA y Bitrix requieren autenticación.
- Las claves `OPENAI_API_KEY` y `BITRIX_WEBHOOK_URL` permanecen solo en Vercel.
- La extensión no contiene contraseñas compartidas ni secretos maestros.
- Los códigos de activación no se guardan en texto plano en el registro del servidor.
- Rate limiting y límites de tamaño protegen OpenAI, Bitrix y activaciones.
- Los endpoints devuelven errores genéricos para no exponer detalles internos.
- El panel `/admin` usa cookie `HttpOnly`, `Secure`, `SameSite=Strict` y `AUTH_SECRET` independiente.
- Los scripts de contenido se restringen a dominios iKono.
- El asistente no devuelve fuentes ni versión de la base de conocimiento y contiene defensa contra extracción del prompt.

## Variables obligatorias

- `AUTH_SECRET`: secreto aleatorio de al menos 32 caracteres.
- `OPENAI_API_KEY`
- `BITRIX_WEBHOOK_URL`
- `BLOB_READ_WRITE_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH` (recomendado) o `ADMIN_PASSWORD` como transición.

Recomendadas:

- `EXTENSION_SESSION_SECONDS=3600`
- `DEVICE_ENROLLMENT_SECONDS=600`
- `DEVICE_REFRESH_DAYS=180`
- `PUBLIC_BASE_URL=https://asistente-onoff.vercel.app`

`ALLOWED_EXTENSION_IDS` debe dejarse vacío mientras la extensión se distribuya desempaquetada y su ID no esté garantizado como estable. Cuando exista una distribución empaquetada con ID estable, se puede configurar como defensa adicional.

## Orden seguro de despliegue

1. Configure `AUTH_SECRET` y mantenga las demás credenciales de servidor en Vercel.
2. Despliegue esta rama.
3. Entre a `/admin` y genere un código para un equipo de prueba, por ejemplo `SAC-PC-TEST`.
4. Recargue la extensión y active el equipo desde Opciones.
5. Verifique IA, traducción, audio y las tres búsquedas de Bitrix.
6. Reinicie navegador y PC: el equipo debe seguir activo.
7. Recargue/actualice la extensión: debe seguir activo.
8. Desinstale y reinstale la extensión: debe pedir un código nuevo; reactive con el mismo nombre y confirme que el registro anterior queda revocado.
9. Revoque el dispositivo desde `/admin` y confirme que deja de renovar su acceso.
10. Compruebe que llamadas directas a APIs protegidas sin `Authorization` devuelven `401`.

## Respuesta ante posible exposición de secretos

Si alguna clave real fue publicada alguna vez fuera de Vercel, regenérela en su proveedor y actualícela en Vercel. Borrar un archivo del repositorio no invalida una credencial ya expuesta.
