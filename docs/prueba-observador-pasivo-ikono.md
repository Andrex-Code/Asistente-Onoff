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

## Versión instalable de prueba · avance actual

Se preparó una extensión separada: ONOFF · Prueba pasiva iKono, v0.1.0. No reemplaza ni modifica la extensión habitual. Compilar con `node scripts/build-ikono-probe.cjs`; resultado: `dist/ikono-probe`. Solo solicita activeTab y scripting; no tiene permisos permanentes de sitios, red, almacenamiento o backend. Al pulsar su icono en iKono abre un panel detenido; requiere pulsar Iniciar prueba. Detener y borrar elimina los registros en memoria; Cerrar panel retira el panel y sus listeners. Al navegar se pierde el estado.

El lector opcional `src/ikono-classification.cjs` usa `.mx_DropdownTypification .select__single-value`, observado en DOM real, con control de estructura y etiqueta de categoría. No toma el value de búsqueda de React Select. Devuelve unknown ante estructuras ambiguas; no dispone aún de IDs de catálogo ni garantiza estabilidad tras cambios de interfaz. El diagnóstico básico sigue sin leer selecciones si no se le proporciona ese lector. La extensión de prueba muestra las etiquetas seleccionadas únicamente en la misma pestaña.

### Instalación pendiente (requiere aprobación)

Cargar `dist/ikono-probe` como extensión descomprimida en Edge, desde Administrar extensiones → Modo de desarrollador → Cargar descomprimida. Esto instala código nuevo con acceso temporal a la pestaña al activarlo; no se realizó automáticamente. Usar exclusivamente en sala de prueba. Pulsar su icono, Iniciar prueba, abrir Resolver chat, seleccionar categoría/detalle y terminar con Cancelar. Nunca usar los botones Resolver conversación ni Resolver conversación sin mensaje durante este ensayo. Después Detener y borrar → Cerrar panel; retirar la extensión desde Administrar extensiones.

### Resultado de validación local ampliada

20/20 tests automáticos aprobados en Node 24.22.1: 11 del motor, 3 del observador, 5 de clasificación y 1 de navegador Chromium. El test de navegador hace 20 aperturas/cancelaciones en un formulario ficticio, comprueba lectura síncrona antes de retirar el formulario, detención del panel y ausencia de solicitudes externas. Toda navegación del test es interceptada y respondida localmente; no usa sesión ni servidor iKono. El simulador linkedom no reproduce correctamente captura frente a handlers del objetivo; el caso crítico se verificó en Chromium. No confundir estas 20 cancelaciones simuladas con el criterio 20/20 cierres reales del issue #38.

Node 22/CI sigue pendiente: este equipo tiene Node 24 y no dispone de npx. Captura de prueba: `dist/ikono-probe-fixture.png`, sin datos de usuarios. No se ha instalado la extensión en Edge ni instrumentado iKono real. Ninguna escritura en Bitrix o cambio en main.


## Ensayo instrumentado en iKono real · 2026-11-11

**Estado actual:** extensión de prueba cargada manualmente por el usuario tras autorización explícita. Activada únicamente en la sala de prueba autorizada. Panel y observador comprobados en Edge, luego detenidos y panel retirado. La extensión sigue instalada; no confundir detener con desinstalar.

### Resultados observados
- Inicio explícito en el panel. Primera apertura: señales «Apertura solicitada» y «Formulario detectado».
- Selección ASESORIA → CONTACTO COMERCIAL: el panel leyó ambas etiquetas correctamente.
- Cambio a CARTERA: el panel mostró «Detalle: sin elegir», sin conservar CONTACTO COMERCIAL.
- Cancelar: señales «Cancelación detectada» y «Formulario retirado (no confirma cierre)».
- Segunda apertura y cancelación instrumentadas: ambas señales observadas. Un primer intento automatizado de cancelar inmediatamente tras abrir no retiró el modal ni produjo señal de cancelación; el foco quedó en Observaciones. Se inspeccionó de nuevo y Cancelar funcionó con el formulario estable. **No se atribuye causa al observador ni se declara interferencia cero con esta evidencia**. La secuencia masiva se detuvo, no se completaron 20 ciclos.
- Durante montaje del formulario el observador vio transitoriamente cero campos y «No se reconoce la estructura de los campos», seguido de un campo y estado incompleto. No tratar esa fase de montaje como selección válida ni como fallo definitivo.
- «Detener y borrar»: panel pasó a «Detenido. Registros borrados». Una tercera apertura/cancelación con diagnóstico detenido no añadió señales.
- «Cerrar panel»: verificado cero paneles y cero diálogos de resolución. La sala permaneció Pendiente.

### Balance y límites
**2 aperturas y 2 cancelaciones instrumentadas observadas**, 1 combinación de categoría/detalle, 1 cambio de categoría, 1 comprobación adicional detenido. **0 clics de resolución realizados por el asistente**, 0 confirmaciones finales ensayadas. Los 20 tests automáticos previos son pruebas locales, no 20 cierres reales.

No se probó captura final al resolver, cierre sin mensaje, reconexión, cambio de sala, ID estable de atención ni cobertura de historial. Tampoco se enviaron datos a IA o Bitrix. No se copiaron teléfono, nombre de contacto, ID de sala o mensajes a esta documentación. Captura local recortada al panel: `dist/ikono-live-cancel.jpg`, sin datos de conversación; no publicada en el repositorio.

**Próximo paso:** estabilizar la espera de montaje del formulario y repetir apertura/cancelación con trazas acotadas, antes de ensayar confirmaciones finales autorizadas. F02 sigue en investigación; no se habilita el MVP productivo.
