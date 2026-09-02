# Seguridad de Asistente ONOFF

## Experiencia para los asesores

La seguridad no cambia el uso diario de la extensión.

1. Un administrador prepara un paquete de instalación autorizado.
2. El asesor carga la carpeta de la extensión como lo hacía anteriormente.
3. La extensión se registra automáticamente en segundo plano.
4. No existe login de asesor, código de activación ni cuenta individual.
5. IA, traducción, mejora de texto, audio y Bitrix funcionan con normalidad.

El paquete contiene únicamente una credencial temporal de aprovisionamiento. Esa credencial no está en Git y sirve para registrar un número limitado de instalaciones durante un tiempo limitado. Cada instalación obtiene después su propia credencial renovable.

## Persistencia y reinstalaciones

- Reiniciar Chrome/Edge: no cambia nada.
- Reiniciar Windows: no cambia nada.
- Actualizar o recargar la extensión: no cambia nada mientras `chrome.storage.local` siga intacto.
- Borrar caché/cookies/historial normales: no afecta la autorización.
- Desinstalar completamente la extensión o borrar el perfil: Chrome elimina la credencial local.
- Si el mismo paquete todavía está vigente y conserva cupos, la reinstalación se registra automáticamente sin pedir nada al asesor.
- Si el paquete ya venció o agotó sus instalaciones, el administrador prepara una carpeta nueva y el asesor simplemente la instala. No se le pide login ni código.
- Un equipo puede revocarse desde `/admin`; en ese caso deja de renovar acceso.

## Tokens y vencimientos

- Token de API: corto, por defecto 1 hora (`EXTENSION_SESSION_SECONDS=3600`).
- Credencial renovable del dispositivo: por defecto 180 días (`DEVICE_REFRESH_DAYS=180`) y se renueva automáticamente con el uso.
- Credencial del paquete: se define al crear el lote en `/admin`; se recomienda 72 horas y un máximo cercano al número real de equipos que se van a instalar.

## Controles aplicados

- Todas las APIs de IA y Bitrix requieren autenticación.
- Las claves `OPENAI_API_KEY` y `BITRIX_WEBHOOK_URL` permanecen solo en Vercel.
- No hay contraseñas compartidas ni login para asesores.
- El secreto del paquete no se guarda en Git; se inyecta únicamente al generar `dist/Asistente-Onoff`.
- Rate limiting y límites de tamaño protegen OpenAI, Bitrix y aprovisionamiento.
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
- `DEVICE_REFRESH_DAYS=180`
- `PUBLIC_BASE_URL=https://asistente-onoff.vercel.app`

`ALLOWED_EXTENSION_IDS` debe dejarse vacío mientras la extensión sea desempaquetada y su ID no esté garantizado como estable. Cuando exista una distribución con ID estable, se puede activar esta restricción como capa adicional.

## Preparar la carpeta que reciben los asesores

1. Entre a `/admin` y genere un lote de instalación indicando nombre, número máximo de equipos y vigencia.
2. Copie la credencial generada.
3. En Windows PowerShell, desde el repositorio:

```powershell
$env:ONOFF_INSTALL_TOKEN="onoff_install_..."
npm run build-extension
```

4. Entregue únicamente `dist/Asistente-Onoff`.
5. Nunca entregue la carpeta del repositorio ni `src/install-config.js` del código fuente como mecanismo de aprovisionamiento.

## Pruebas obligatorias antes de producción

1. Generar un lote de prueba para 3 instalaciones.
2. Construir `dist/Asistente-Onoff` con la credencial del lote.
3. Instalar en Chrome/Edge: no debe mostrar login ni solicitar códigos.
4. Probar IA, Mejorar, Traducir, Audio y las tres búsquedas de Bitrix.
5. Reiniciar navegador y Windows: todo debe seguir funcionando.
6. Recargar/actualizar la extensión: todo debe seguir funcionando.
7. Borrar caché/historial: todo debe seguir funcionando.
8. Desinstalar y reinstalar el mismo paquete mientras siga vigente: debe autorizarse solo.
9. Agotar o revocar el lote y comprobar que una instalación nueva no se autoriza.
10. Preparar un paquete nuevo y comprobar que el asesor solo necesita instalarlo.
11. Revocar un dispositivo y confirmar que deja de renovar acceso.
12. Las llamadas directas a APIs protegidas sin Bearer deben responder `401`.

## Respuesta ante posible exposición de secretos

Si alguna clave real fue publicada alguna vez fuera de Vercel, regenérela en su proveedor y actualícela en Vercel. Borrar un archivo del repositorio no invalida una credencial ya expuesta.
