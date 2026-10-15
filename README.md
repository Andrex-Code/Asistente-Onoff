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
- Botón **Abrir en Afacturar** al consultar una TC cuando existe un enlace directo en la base privada de Afacturar.
- **Buscar en SGC** por cédula: cliente, categoría, perfil, bloqueos, última solicitud, tipificación, montos, fechas, historial reciente y créditos mostrados en su ficha.

## Buscar en SGC (1.11.0)

1. Mantenga una pestaña de `https://sgc.yadinero.co` abierta, con su sesión iniciada en el mismo perfil del navegador.
2. Desde iKono ONOFF o SGC, abra **Buscar en SGC**, ingrese la cédula y pulse **Buscar**.
3. Consulte el resumen o use **Abrir cliente en SGC** y **Abrir solicitud en SGC** para revisar el registro original.

La primera búsqueda (y el botón **Actualizar**) realiza hasta tres consultas GET: búsqueda exacta del cliente, ficha del cliente y detalle de su última solicitud. Cuando la misma cédula se consulta nuevamente con un resultado completo todavía vigente, se reutiliza la caché temporal y no se repiten esas consultas. Reutiliza la sesión dentro de una pestaña de SGC sin extraer cookies ni claves. No necesita configurar una API, un webhook, variables de Vercel ni credenciales nuevas. Los permisos siguen siendo los del usuario que inició sesión en SGC.

**Diagnóstico de velocidad:** los resultados nuevos incluyen una sección plegable de tiempos por etapa (búsqueda de cliente, ficha y última solicitud). Muestra por separado la **espera hasta recibir las cabeceras HTTP** (conexión, red y procesamiento del servidor), la **transferencia del cuerpo HTML**, el tiempo de análisis y el tamaño aproximado del HTML, sin incluir cédulas, nombres, URL de fichas ni contenido de créditos. Estas métricas no permiten atribuir de forma aislada toda la espera al servidor; para hacerlo hay que revisar el desglose de red o los registros de SGC. La opción **Copiar diagnóstico** permite compartir únicamente esas cifras. Esta instrumentación no agrega consultas a SGC ni acelera por sí sola la primera búsqueda: permitirá identificar si el cuello de botella está en el servidor/red o en el análisis local, antes de modificar el flujo.

El resumen distingue el estado del cliente, el estado de la solicitud y el saldo de los créditos. El «valor a pagar» de una solicitud no se presenta como saldo actual. Se muestran hasta cinco solicitudes, cinco créditos y seis eventos recientes; la selección de la última solicitud usa fecha de creación e ID como desempate. «Bloqueo Fianza» y otras etiquetas del listado se conservan tal como las muestra SGC.

Los datos visibles de la ventana se borran al cerrarla o al cambiar de conversación de iKono. Para acelerar consultas repetidas, **solo los resultados completos** se guardan temporalmente en `chrome.storage.session` (almacenamiento no persistente, exclusivo de la extensión), hasta **3 minutos** y con un máximo de **8 clientes**. No se utiliza `chrome.storage.local`, `sync`, Vercel ni la IA para almacenar estas fichas. La caché se asocia a la pestaña de SGC, el perfil de navegación y la cuenta autenticada; se invalida al navegar en SGC, cerrar la pestaña, cambiar de sesión o alcanzar su vencimiento. **Actualizar** omite la caché y consulta SGC nuevamente; **Limpiar** también olvida la entrada guardada de esa cédula. La caché desaparece al cerrar el navegador. **Copiar resumen** requiere un clic del asesor; no envía mensajes ni llama a la IA. Para evitar que cualquier sitio lea datos del panel, el transporte solo acepta consultas desde los orígenes exactos de iKono ONOFF (`https://onoff.a.ikono.im`) y SGC (`https://sgc.yadinero.co`).

Este conector lee el HTML existente, no una API oficial de SGC. Si cambia la estructura de las vistas o vence la sesión, muestra un error o una advertencia de ficha incompleta. Nunca ejecuta bloqueos, envíos de correo, exportaciones, reliquidaciones, formularios ni cambios de estado. Los eventos de auditoría que SGC registre al consultar sus vistas pueden generarse normalmente. La implementación corresponde al asistente interno del asesor; una integración autónoma de Yabot requiere un servicio y autenticación propios.

Los casos de coincidencia exacta, datos parciales, permisos, sesión, propiedad de solicitudes, límites de consulta, transporte y caché temporal (reutilización, refresco, olvido e invalidación por cuenta) se comprueban con datos ficticios en `tests/sgc.test.js` (`node --test tests/sgc.test.js`).

`node scripts/preview-sgc.cjs` abre una vista local con datos ficticios para revisar el panel, los temas y los mensajes de error. La comprobación de la sesión real debe realizarse después de cargar esta versión de la extensión; las pruebas automatizadas no contactan producción.

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

La base de conocimiento y los prompts se administran desde `/admin`. La base de Afacturar puede mantenerse en Vercel Blob privado y los paquetes internos de distribución pueden incluir `data/afacturar-index.json`, generado a partir del archivo corporativo `NIT HIPERVINCULO AFACTURAR.xlsx`. Ese índice privado está excluido de Git. El buscador conserva la TC exacta, incluidos sufijos como `-C` y `-R`, y admite enlaces `/obligado/...` y `/empresas-registro-get/...`.

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

## Experiencia visual 1.10.0

La mascota conserva el concepto blanco perla con visor negro y luz verde suave. El modelo vectorial local añade reflejos, articulaciones, mirada del cursor y expresiones para las operaciones reales. Las animaciones se detienen al ocultar la pestaña o activar movimiento reducido.

El menú, conversación, traducción, Bitrix, seguimientos, plantillas, popup, ajustes y administración comparten una interfaz clara y oscura. El menú permite buscar herramientas; las plantillas se filtran sin distinguir acentos. En pantallas pequeñas, abrir una herramienta cierra el menú para dejarla visible.

Desde Personaliza tu espacio o Ajustes se elige el tema y el movimiento. Ajustes también permite restablecer posiciones. El popup acepta audios arrastrados y permite copiar resultados. El chat evita consultas duplicadas mientras procesa y permite reintentar después de un error.

### Build y comprobaciones locales

- `npm test`: pruebas de seguimientos y transporte.
- `npm run build`: valida los recursos del manifest y prepara `dist/extension` para Cargar descomprimida. No incluye el backend ni datos privados.
- `npm install`, `npx playwright install chromium`, `npm run test:ui`: abre Chromium con un perfil separado y prueba la extensión con datos ficticios de un servidor local. La prueba bloquea conexiones externas y guarda capturas e informe en `output/playwright`.

Para actualizar una instalación descomprimida, descargue la rama correspondiente, pulse Recargar en la tarjeta de ONOFF dentro de `chrome://extensions` y recargue las páginas donde usa la extensión.

## Scripts de atención para YaDinero

- Biblioteca local con 153 mensajes de YaDinero en nueve temas y 9 de Domicilios ON, en el canal Tiendas ON. Se conserva el texto del Excel, con hoja y celda de origen en cada mensaje.
- Busca por tema o contenido, guarda favoritos y vuelve a los últimos 12 mensajes usados. Seleccionar un mensaje abre una vista previa editable.
- Completa tu nombre una sola vez. Los campos del cliente (crédito, ticket, fechas, montos) se completan por mensaje y se borran al cambiar de chat. No se guardan esos valores ni mensajes personalizados en el almacenamiento.
- **Pegar en iKono** inserta en el borrador, conserva su contenido y nunca envía. Reconoce el editor de iKono basado en Matrix/Element, tanto texto simple como enriquecido. Al cambiar de cliente o reemplazarse el editor, selecciona el campo actual antes de pegar. Si el editor no se reconoce, usa **Copiar**.
- **Alt + Mayús + Y** abre o enfoca la biblioteca. Puede ajustarse desde chrome://extensions/shortcuts. **Ctrl + Enter**, solo dentro de la ventana de scripts, pega el mensaje listo.
- Favoritos, recientes, nombre y posición se guardan localmente. Los mensajes no requieren backend ni conexión. El catálogo está en src/scripts-data.js, con originalText separado de la plantilla personalizada.

QA de scripts: nombre obligatorio, variables distintas, conservación del borrador, no envío, cambio de cliente, editor enriquecido, fallback sin editor, canal separado y preferencias persistentes. El navegador usa una página de prueba local que replica los selectores de iKono; la comprobación final en la sesión real de cada instalación se realiza cargando la extensión y pegando en un borrador.

## Tamaños compactos 1.10.1

Menú de 260 px y máximo 450 px de alto, con una fila por herramienta. El menú se cierra al abrir una subventana también en escritorio. Los nombres y las descripciones accesibles se conservan. La mascota ocupa menos espacio y no usa el tooltip negro nativo del navegador.

Límites iniciales: conversación 350 × 460, Bitrix 390 × 460, seguimientos 410 × 490, plantillas 320 × 410 y scripts 500 × 490 px. Se ajustan al espacio de la pantalla y mantienen el desplazamiento interno. El popup de la barra mide 320 px de ancho, sin el bloque de bienvenida repetido.
