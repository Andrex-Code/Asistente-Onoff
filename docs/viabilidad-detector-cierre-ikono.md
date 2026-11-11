# Viabilidad técnica: detección del cierre iKono

**Fecha:** 2026-11-11 · **Estado:** VIABLE CONDICIONADO / pendiente de prueba sobre DOM real de iKono.
**Alcance:** observar el cierre, no sustituir el botón ni modificar las operaciones de iKono.

## Respuesta para gerencia

La extensión de navegador que ya utiliza SAC puede **observar acciones dentro de iKono**. La solución propuesta detectará que el asesor inicia el cierre, prepara un resumen basado en la conversación disponible y leerá los valores de tipificación y detalle que el asesor haya seleccionado. Con esos valores preparará un registro para Bitrix, inicialmente con confirmación humana.

La viabilidad de la **detección del botón** es alta si se trata de elementos del DOM accesibles al content script, pero la viabilidad completa no está confirmada aún: deben ensayarse los selectores concretos, el identificador estable de conversación, la cobertura del historial y el comportamiento del cierre en el sistema real. No se ha validado producción ni se ha registrado ninguna tarea automática.

## Diseño técnico propuesto

1. **Detectar apertura de cierre:** listener pasivo sobre `pointerdown`/`click` en fase de captura, acotado a la pestaña/origen de iKono. Reconocer el control usando semántica estable (atributos ARIA, tooltip, identificadores) y no solo texto visual; confirmar que es el botón correcto.
2. **Iniciar preprocesamiento:** tomar un snapshot acotado a la conversación activa *antes* de que iKono la retire de pantalla. Guardar una referencia estable al evento de cierre y lanzar generación del resumen con estado visible. El indicador no debe impedir trabajar al asesor.
3. **Identificar formulario dinámico:** `MutationObserver` detecta la aparición del modal; inspeccionar los campos reales de categoría y detalle. Escuchar `input`/`change` donde aplique, pero **volver a leer los valores definitivos al confirmar**. Cuando se cambia la categoría se invalida el detalle anterior.
4. **Detectar confirmación final:** observer + listener pasivo sobre «Resolver conversación» y «Resolver conversación sin mensaje» si ambos representan un cierre elegible. Capturar de forma síncrona tipificación/detalle y el identificador del chat **antes** de que iKono descarte el modal.
5. **Confirmar contexto:** verificar que el identificador del modal corresponde al snapshot previo. Si falta la identidad o algún campo, detener el registro en Bitrix y presentar corrección manual sin alterar el cierre de iKono.
6. **Mostrar revisión ONOFF:** indicador «Generando» mientras la IA termina, seguido de resumen editable y confirmación para MVP; luego automatizar solo tras aprobar el piloto.
7. **Crear tarea mediante backend autorizado:** control de permisos, mapeo campo a campo e idempotencia persistente para no duplicar cuando se presione dos veces o haya reintento.

### Límites y alternativas

| Dependencia | Qué podría pasar | Respuesta |
| --- | --- | --- |
| Botón y modal accesibles en DOM principal | Detección normal con eventos y observer | Prototipo con selectores estables |
| iKono utiliza iframe | El content script principal no ve controles internos | Verificar permisos e inyección en frames autorizados |
| Controles dentro de shadow DOM cerrado o estructura interna inaccesible | El listener de DOM puede no leer atributos/valores | Explorar API/eventos autorizados de iKono o alternativa con interacción explícita |
| iKono cambia estilos, clases, idioma o distribución | Falla una búsqueda por texto o CSS | Adaptador con múltiples señales + pruebas de regresión |
| El DOM borra la conversación al cerrar | Faltan mensajes para IA | Snapshot temprano; evaluar fuente autorizada de historial; informar cobertura parcial |
| Cambio de sala, recarga, doble clic | Riesgo de mezcla o duplicación | ID de conversación, estado aislado y idempotencia backend |
| Cierre sin mensaje o chat ya escalado | Puede tener distinta regla de negocio | Validar con Calidad/SAC antes de activar |

**No capturar cookies, tokens, contraseñas ni APIs internas no autorizadas.** Usar únicamente sesiones y accesos permitidos por el área responsable.

## Demostración técnica mínima (POC)

Prueba **sin crear tareas ni enviar datos a IA**, realizada con asesor autorizado y conversaciones de prueba:

- T1: el detector identifica 20 aperturas de «Resolver chat» consecutivas.
- T2: captura la categoría y detalle correctos en 20 cierres, incluyendo cambios de categoría.
- T3: detecta clic y confirmación rápidos con resumen aún pendiente.
- T4: diferencia dos conversaciones abiertas consecutivamente.
- T5: reconoce cierre normal y «sin mensaje», sujeto a regla validada.
- T6: en cada prueba iKono sigue resolviendo la conversación normalmente; sin bloqueo ni cambio de comportamiento.
- T7: registra una señal visible «Detectado / Preparando» y eventos de diagnóstico **sin contenido de clientes**.

El criterio mínimo propuesto es 100% en pruebas controladas T1/T2/T4/T6 y ninguna interferencia con iKono. Los umbrales de éxito reales del piloto deben acordarse con operación. **Hasta obtener estas evidencias, la detección es factible en principio, no un hecho validado.**

## Evidencia de código existente

- `manifest.json`: Manifest V3 e inyección de scripts en iKono (configuración general actualmente amplia).
- `src/assistant-chat.js`: lectura DOM actual `li.mx_EventTile[data-event-id]`; **máximo 40 mensajes visibles**, no garantiza historial íntegro.
- `src/content.js`: controles flotantes y mascota disponibles para reutilizar.
- `src/ikono-close-session.js` (rama de roadmap): primer motor desacoplado de estado por conversación; **no conectado al DOM**.
- `tests/ikono-close-session.test.js`: 11 casos de secuencia de cierre, aislamiento y reintento, evaluados en un entorno JS aislado; **pendiente ejecución formal de Node/CI en PR**.

## Dictamen de viabilidad

- **Detección del clic:** alta probabilidad; prueba real pendiente.
- **Lectura de categoría/detalle:** probable; prueba real pendiente.
- **Precalentar resumen IA:** arquitectura posible; depende de cobertura y consentimiento del uso de datos.
- **Registro en Bitrix:** posible mediante backend, pero bloqueado por campo/etapa/autorización e idempotencia.
- **Automatización totalmente autónoma:** no comprometida hasta pasar piloto con confirmación humana y controles de seguridad.

**Próximo paso verificable:** probar un adaptador pasivo de detección en iKono autorizado, sin leer ni publicar datos de clientes y sin crear tareas.
