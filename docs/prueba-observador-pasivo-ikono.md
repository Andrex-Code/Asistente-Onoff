# Observador pasivo de prueba iKono

Estado: preparado y probado localmente, no cargado en iKono. No incluido en el manifiesto productivo.

`src/ikono-close-probe.cjs` expone `installProbe(window, options)` en Node y `ONOFFIkonoCloseProbe.installProbe` al cargarse como script de navegador. Por defecto no instala nada. Requiere `enabled: true` y origen exacto `https://onoff.a.ikono.im`.

## Alcance

Observa clic en apertura, aparición/desaparición del diálogo, número de combobox, expansión y asociación de etiquetas. Distingue intención de cancelar y de resolver, pero no confirma éxito del cierre. La desaparición de un diálogo nunca implica una resolución completada.

No lee mensajes, identificadores de sala, observaciones, búsquedas ni valores de categoría. Emite solo metadatos acotados mediante callback; no usa red, IA, almacenamiento o Bitrix. El contador de sesión identifica aperturas locales, **no** atenciones de negocio. No se conecta al motor de creación de tareas.

## Prueba manual pendiente en extensión de prueba

1. Cargar el módulo únicamente en una copia de desarrollo de la extensión, sin añadirlo al manifiesto productivo ni reemplazar la extensión habitual.
2. En una sala de prueba confirmada, activar desde el contexto del content script: `const stop = ONOFFIkonoCloseProbe.installProbe(window, { enabled: true, onEvent: event => console.info('[iKono POC]', event) });`.
3. Abrir Resolver chat; comprobar open-requested y dialog-opened. Desplegar la categoría y elegir ASESORIA; comprobar aparición del segundo campo. Elegir detalle y cambiar categoría; contrastar visualmente el reinicio. El probe no certifica el valor seleccionado.
4. Pulsar únicamente Cancelar; comprobar cancel-requested y dialog-disappeared. No pulsar Resolver conversación ni su variante sin mensaje.
5. Ejecutar `stop()`; repetir apertura/cancelación y comprobar ausencia de nuevos registros. Retirar la copia de prueba al terminar.

La automatización de navegador disponible permite evaluación DOM de solo lectura; por ello no se inyectó este módulo mediante esa interfaz. Esta prueba requiere una carga explícita de desarrollo y sigue pendiente. No equivale a 20/20 confirmaciones ni certifica captura final, idempotencia o cobertura del historial.

## Validación local

`node --test tests/ikono-close-probe.test.cjs tests/ikono-close-session.test.js`: 14/14, ejecutadas con Node v24.22.1; proyecto declara Node 22, por lo que falta repetir en ese entorno/CI. Tres casos del probe usan linkedom (dependencia existente); once casos corresponden al motor previo. Los eventos de resolución del test son sintéticos y no cierran iKono.
