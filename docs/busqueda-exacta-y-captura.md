# TC exacta y captura de texto/códigos

## Comprobación y corrección de búsquedas

El 9 de noviembre de 2026, `POST /api/bitrix/search-deal` del backend
predeterminado recibió `{"tc":"896"}` y devolvió diez coincidencias parciales:
8968, 72896, 8967-C, 8967-C, 70896, 5896, 8963, 8896, 8896-C y 6896.

Se pide igualdad explícita con `filter[=UF_CRM_1642606760058]` tanto a
`crm.deal.list` como al fallback `crm.item.list`. Independientemente del filtro
remoto, el servidor verifica el valor real del campo TC antes de limitar los
resultados, resolver compañías o asociar tareas. Se normalizan prefijo TC,
espacios y mayúsculas, preservando los dígitos y el sufijo. `896`, `896-C`,
`896-R` y `8968` son búsquedas diferentes. No se usa el título para adivinar la TC.

La interfaz también descarta resultados parciales, incluso si el backend todavía
es una versión anterior. Si no recibe coincidencias exactas, muestra ausencia
de resultados y no carga tareas de candidatos parecidos. Puede mostrar más de
una negociación si sus campos TC coinciden realmente; no elige arbitrariamente
una negociación entre duplicados reales.

El filtro del cliente no puede recuperar una coincidencia que un backend antiguo
omitió de su respuesta. Para asegurar la selección completa deben desplegarse
primero estos cambios del backend en un entorno de pruebas, comprobarlos y luego
aprobar la distribución correspondiente. No se ha desplegado producción.

Documentación de los filtros:
https://apidocs.bitrix24.com/api-reference/crm/deals/crm-deal-list.html

## Captura local

El icono de escanear texto está a la izquierda del cierre del menú, en el lugar
indicado por el usuario. Su nombre accesible es «Capturar texto o código de barras».

1. Abrir y ampliar la imagen del cliente en la página web.
2. Pulsar el icono. Se oculta el menú y se captura la pestaña visible.
3. Arrastrar para seleccionar únicamente el área de interés.
4. Pulsar «Leer selección». Escape o Cancelar descartan la selección.
5. Revisar el código decodificado y/o el texto OCR. Hay botones separados para
   copiar cada resultado y el texto se puede corregir antes de copiar.

Solo se captura la pestaña activa del emisor y únicamente desde el marco principal
de una página HTTP(S). Un cambio de pestaña durante la captura invalida el
resultado. Se limita tamaño, duración y concurrencia; el permiso de captura vence
en dos minutos y permite una sola lectura.

ZXing decodifica el primer código legible de la selección, probando cuatro
orientaciones. Tesseract lee texto en español. Ambos motores, WASM y los datos de
idioma se empaquetan durante `npm run build`; no se utiliza un CDN durante el uso.
La imagen y los resultados no se suben al backend ni se guardan en preferencias.
El documento de procesamiento se cierra al terminar o al vencer el tiempo de
lectura, liberando el motor. La herramienta no pega ni envía mensajes.

Se añade el permiso `offscreen` para el procesamiento local, con Chrome/Edge
116 o posterior. WASM se permite mediante `wasm-unsafe-eval`; no se permite
JavaScript remoto ni `unsafe-eval`. El código de reconocimiento generado queda
en `src/vendor/scan` (ignorado en Git) y se incluye en `dist/extension`.

La captura lee la parte visible de la página: ampliar una foto mejora la lectura.
Fotos borrosas, reflejos, barras cortadas o códigos muy pequeños pueden fallar.
Los dígitos de OCR deben revisarse antes de utilizarlos. El resultado decodificado
del código de barras se distingue del texto estimado por OCR.

## Validación

- `npm test`: normalización y coincidencia exacta, fallback del backend,
  separación de TC con sufijo, seguridad y ciclo de captura local.
- `npm run build`: copia los motores y datos locales y verifica los recursos.
- `npm run test:bitrix`: comprueba que 896 no muestra 8968 y que la ausencia
  de TC exacta no produce tarjetas ni tareas de otros candidatos.
- `npm run test:scan`: prueba real de captura/recorte en Chromium, Code 128,
  OCR de «TC 8968», copia, cancelación y control de ausencia de red externa.
- `npm run test:ui`: regresión general del menú y las herramientas.

Todas las pruebas de navegador usan datos ficticios y bloquean conexiones de red
externas. En este equipo Kaspersky inyecta solicitudes externas en el navegador;
ese control puede fallar localmente y debe verificarse en CI limpio, sin omitirlo.

Los campos de plan contratado y las pestañas Negociación/Compañía siguen siendo
una propuesta visual separada; no se implementan por inferencia en este cambio.
