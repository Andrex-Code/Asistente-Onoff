# Inspección DOM iKono · avance parcial

## Inspección inicial del navegador · 2026-11-11

- Acceso a la pestaña existente de iKono en Edge confirmado. Inspección de solo lectura; no se pulsó ningún control de cierre.
- «Resolver chat» aparece en el árbol de accesibilidad y se resolvió directamente desde el DOM principal mediante rol y nombre exacto.
- Elemento observado: `button`, `role="button"`, `aria-label="Resolver chat"`, `tabindex="0"`, `aria-disabled="false"`, `data-kind="primary"`. Selector candidato: `button[aria-label="Resolver chat"]`; alternativa semántica: rol button + nombre exacto. La unicidad fue suficiente para la lectura puntual; falta probar estabilidad entre salas y sesiones. No usar clases generadas ni el ID dinámico de `aria-labelledby` como contrato estable.
- Esto confirma accesibilidad DOM del control inicial, **no** la recepción de eventos por la extensión. `pointerdown/click` en captura sigue siendo propuesta sin ensayo; no se instalaron listeners ni se ejecutó un adaptador.
- «Resolver conversación», tipificación, subcategoría y sus eventos siguen pendientes: no se abrió el formulario porque la sala visible no estaba identificada como prueba. El usuario indicó que abrirá una conversación de prueba y avisará.
- No se validaron identidad estable, cobertura de historial, cambio de categoría, cierre rápido ni cierre sin mensaje. Los criterios 20/20 siguen pendientes.
- No se copiaron mensajes, teléfonos, IDs de sala, capturas de clientes ni credenciales al repositorio. Sin escrituras en Bitrix, sin modificaciones de main.

**Reanudación:** con la sala de prueba confirmada, inspeccionar el formulario de cierre y sus controles antes de cualquier confirmación final.

## Formulario en conversación de prueba · 2026-11-11

El usuario confirmó la conversación de prueba. Se abrió «Resolver chat», se inspeccionó el formulario, se hicieron selecciones temporales y se pulsó «Cancelar». La sala permaneció abierta y en estado Pendiente. No se pulsó ninguno de los dos botones de resolución.

### Evidencias
- Modal en DOM principal: rol `dialog`, nombre accesible exacto «Resolver conversación», título `mx_BaseDialog_title`.
- Tipificación: `input[role="combobox"]` de React Select. El menú expuso 33 opciones en esta sesión. Al elegir ASESORIA apareció un segundo combobox para «Detalle de la tipificación», con 9 opciones.
- Se eligió temporalmente CONTACTO COMERCIAL y la selección quedó visible. Al cambiar la categoría a CARTERA desapareció el detalle anterior y se recreó el segundo combobox (ID observado cambió de react-select-31-input a react-select-32-input).
- Accesibilidad: ambos combobox carecen de `aria-label` y `aria-labelledby`; sus etiquetas visibles no tienen `for`. No asumir que `getByLabel` funciona ni que el orden basta como contrato estable. Acotar al diálogo, verificar etiquetas/contenedores, cantidad y estado. IDs react-select-* y mx_Field_* son dinámicos.
- El `value` del input de React Select quedó vacío aun con CARTERA seleccionada; corresponde a búsqueda y **no certifica la selección**. Leer la etiqueta seleccionada del contenedor y validar contra opciones; el ID de negocio aún no está confirmado.
- Observaciones: textarea con etiqueta asociada mediante `for`; localizable como textbox «Observaciones». No se escribió texto.
- Botones finales accesibles por rol button y nombres exactos «Resolver conversación» (type=button) y «Resolver conversación sin mensaje» (sin type explícito). Ambos aparecieron habilitados inicialmente. No inferir validación de campos ni efecto de cada botón a partir de ello.

### Alcance de lo demostrado
Una apertura real del formulario y cambios de selección observables mediante DOM, sin cierre. **No se instrumentaron eventos**: pointerdown/click en captura, input/change y MutationObserver siguen siendo diseño propuesto; React Select requiere comprobar qué eventos expone realmente. No se validaron captura síncrona al resolver, persistencia, ID estable entre atenciones, cobertura del historial, cierres rápidos ni 20/20 aperturas/confirmaciones. La cancelación es la condición de salida usada en esta inspección.

**Siguiente paso:** adaptador pasivo de diagnóstico en entorno de prueba, sin datos de clientes, sin IA ni escrituras Bitrix; medir apertura, cambio de categoría y cancelación antes de ensayar cierres autorizados.


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
