# Asistente ONOFF para iKono

Extensión de navegador para apoyar la atención en iKono Chat con traducción, mejora de textos, plantillas, seguimientos, transcripción de audios, búsqueda de negociaciones en Bitrix y un asistente conversacional basado en la conversación visible.

## Funciones principales

- Traducción PT-BR → Español.
- Opción **Falar** para Español → PT-BR.
- Mejora de textos de atención al cliente.
- Plantillas de Bitrix.
- Seguimientos locales.
- Transcripción y traducción de audios.
- Chat lateral del Asistente ONOFF.
- Lectura de los mensajes visibles de la conversación activa en iKono.
- Acciones rápidas para interpretar, resumir, sugerir respuesta e identificar el siguiente paso.
- Botón para copiar respuestas sin escribir ni enviar automáticamente dentro de iKono.
- Búsqueda de negociaciones por `TC5900`, `TC 5900`, `TC-5900` o `5900`.
- Visualización de título, etapa, cliente, responsable, última actualización e ID de la negociación.
- Botones para abrir la negociación en Bitrix o copiar su enlace directo.

## Instalación en Chrome o Edge

1. Descargue o clone este repositorio.
2. Abra `chrome://extensions` o `edge://extensions`.
3. Active **Modo desarrollador**.
4. Presione **Cargar descomprimida**.
5. Seleccione la carpeta que contiene `manifest.json`.
6. Abra o recargue iKono Chat.

## Backend

El backend se publica en Vercel y expone funciones para traducción, mejora de textos, transcripción, asistencia conversacional y consulta segura de Bitrix24.

URL de producción:

```text
https://asistente-onoff.vercel.app
```

Panel administrativo:

```text
https://asistente-onoff.vercel.app/admin
```

Variables requeridas en Vercel:

```text
OPENAI_API_KEY
ADMIN_USERNAME
ADMIN_PASSWORD
BLOB_READ_WRITE_TOKEN
BITRIX_WEBHOOK_URL
BITRIX_TC_FIELD
```

`BITRIX_WEBHOOK_URL` debe contener la URL completa del webhook entrante de Bitrix con permiso CRM. Es una credencial secreta y nunca debe incluirse en el repositorio ni en la extensión.

`BITRIX_TC_FIELD` identifica el campo de la negociación que contiene la TC. Para el portal ONOFF se utiliza:

```text
UF_CRM_1642606760058
```

La base de conocimiento y los prompts se administran desde `/admin` y se guardan en Vercel Blob privado.

## Buscador de negociaciones

La extensión envía únicamente el número normalizado de la TC al endpoint:

```text
POST /api/bitrix/search-deal
```

Ejemplo de solicitud:

```json
{
  "tc": "5900"
}
```

El backend consulta Bitrix, resuelve información complementaria y devuelve una lista limitada de negociaciones. La URL privada del webhook permanece solamente en Vercel.

## Archivos principales

```text
manifest.json
src/background.js
src/content.js
src/content.css
src/assistant-chat.js
src/assistant-chat.css
src/bitrix-search.js
src/bitrix-search.css
api/assistant-chat.js
api/bitrix/search-deal.js
api/improve-text.js
api/translate.js
api/transcribe.js
api/admin/login.js
api/admin/config.js
admin/index.html
admin/app.js
admin/styles.css
lib/admin-auth.js
lib/config-store.js
```

## Privacidad

- La extensión analiza únicamente los mensajes visibles cargados en la conversación activa.
- Las respuestas del asistente se copian manualmente; no se envían automáticamente.
- Las claves de OpenAI y Bitrix permanecen en Vercel.
- Los prompts y la base de conocimiento no se incluyen dentro de la extensión.
- La búsqueda de Bitrix se realiza mediante el backend; la extensión nunca recibe la URL secreta del webhook.
- No se recomienda guardar conversaciones completas ni datos personales de clientes en la base de conocimiento.
