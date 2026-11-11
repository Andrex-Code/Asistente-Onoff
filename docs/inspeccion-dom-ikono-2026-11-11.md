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