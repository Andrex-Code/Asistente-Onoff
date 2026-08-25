# Seguridad de Asistente ONOFF

## Controles aplicados

- Todas las APIs de IA y Bitrix requieren un token temporal emitido por `/api/auth/login`.
- La extensión nunca contiene `OPENAI_API_KEY`, `BITRIX_WEBHOOK_URL`, contraseñas ni secretos de firma.
- Las contraseñas de la extensión se almacenan en Vercel únicamente como hashes PBKDF2-SHA256.
- Los tokens expiran y se guardan localmente en Chrome; la contraseña no se persiste.
- Las consultas están limitadas por usuario e IP y los cuerpos tienen límites de tamaño.
- Los endpoints devuelven errores genéricos para no exponer detalles del proveedor o del webhook.
- El asistente no devuelve fuentes, versión de configuración ni fragmentos de la base de conocimiento.
- El panel administrativo usa cookies `HttpOnly`, `Secure`, `SameSite=Strict`, secreto independiente y protección contra fuerza bruta.
- La extensión solo puede comunicarse por red con el backend oficial, MyMemory y servicios locales explícitos.
- Los scripts de contenido se restringen a dominios iKono.

## Variables obligatorias antes de desplegar

Configure en Vercel como secretos de Producción:

- `AUTH_SECRET`: secreto aleatorio de al menos 32 caracteres. Recomendado: 64 caracteres hexadecimales.
- `OPENAI_API_KEY`
- `BITRIX_WEBHOOK_URL`
- `BLOB_READ_WRITE_TOKEN`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH` (recomendado) o `ADMIN_PASSWORD` como transición.
- `EXTENSION_USERNAME`
- `EXTENSION_PASSWORD_HASH`

Opcionales/recomendadas:

- `ALLOWED_EXTENSION_IDS`: IDs de la extensión separados por coma. Configúrelo después de confirmar el ID en `chrome://extensions` o `edge://extensions`.
- `EXTENSION_SESSION_SECONDS=28800`
- `PUBLIC_BASE_URL=https://asistente-onoff.vercel.app`

## Crear hashes de contraseña

```bash
npm run hash-password -- "UNA-CONTRASENA-LARGA-Y-UNICA"
```

Copie únicamente el resultado `pbkdf2_sha256$...` a Vercel. No guarde la contraseña ni el hash en Git.

## Orden seguro de despliegue

1. Configure `AUTH_SECRET` y las credenciales hash de la extensión en Vercel.
2. Despliegue el backend de esta rama.
3. Recargue la extensión desde `chrome://extensions` o `edge://extensions`.
4. Abra Opciones e inicie sesión.
5. Verifique IA, traducción, audio y las tres búsquedas de Bitrix.
6. Compruebe que una llamada directa sin `Authorization` a `/api/*` devuelve `401`.
7. Configure `ALLOWED_EXTENSION_IDS` con el ID real de la extensión y vuelva a desplegar.

## Respuesta ante posible exposición de secretos

Si alguna clave real fue publicada alguna vez fuera de Vercel, no basta con borrar el archivo: regenere la clave en su proveedor y actualícela en Vercel. Esto aplica especialmente a OpenAI, Bitrix y tokens de Vercel Blob.
