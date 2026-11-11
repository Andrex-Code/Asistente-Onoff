# Revisión asistida con el reporte disponible

**Fecha:** 2026-11-11. **Estado:** reglas del prototipo y diseño, no integrado en extensión habitual ni desplegado. El usuario confirmó que la exportación de conversaciones aportada es lo que puede obtener de iKono. Se cierra la solicitud de otro reporte al usuario; no se presume acceso a más datos.

## Decisión de alcance

Las columnas disponibles no acreditan un ID persistente de atención ni historial completo. No se asignará un supuesto ID usando fila o teléfono/fecha, ni se declarará completa la captura por haber llegado al extremo de scroll. La ruta viable mientras persista esa limitación es una revisión humana explícita del segmento disponible. Esto permite avanzar diseño/UX, **no autoriza registro autónomo ni resuelve por sí solo idempotencia**.

## Flujo asistido propuesto

1. Al abrir el cierre nativo, preparar un snapshot **local y acotado**, sin bloquear iKono. Si no hay cobertura verificada, indicar «Historial disponible; cobertura completa sin verificar».
2. Mostrar el tramo propuesto y permitir que el asesor revise su inicio y fin. No elegir automáticamente el último texto Chat resuelto ni la última entrada de agente como límite fiable.
3. Separar datos observados, correcciones del asesor y datos sin verificar. La revisión humana del texto no convierte una clave local en ID oficial de atención ni certifica que no existan mensajes omitidos.
4. Mostrar categoría y ruta de detalle admitida; ante más niveles de los soportados, mostrar «Requiere revisión manual». No descartar niveles.
5. Mantener el estado nativo separado: Pendiente / Seguimiento / Menú / En encuesta / Resuelto verificado. Un clic o una tipificación poblada no bastan para marcar resuelto.
6. Si posteriormente se autoriza IA, generar un borrador que describa solo lo disponible y marque omisiones. Esa autorización y conexión **no forman parte de esta implementación**.
7. Para cualquier escritura futura: revisión final, autenticación y autorización de servidor, mapeo validado, registro persistente e idempotencia. Si no puede demostrarse que la atención no está ya registrada, conservar registro manual; no resolverlo con contador de apertura o número de fila.

**Textos propuestos:** «Falta verificar qué atención corresponde a este tramo»; «La conversación continúa en encuesta»; «Historial incompleto: revisa los mensajes que faltan»; «Borrador pendiente de revisión». No mostrar tarea creada antes de respuesta validada del servidor.

## Regla diagnóstica implementada

`src/ikono-review-gate.cjs` conecta el evaluador de captura con los requisitos de una **revisión preparada como atención completa**. Recibe un contrato interno normalizado; no son campos de una API iKono descubierta.

Requiere simultáneamente:
- Identidad de atención y snapshot coincidentes, desde una fuente verificada.
- Estado RESUELTO confirmado desde una fuente validada.
- Inicio y cierre normalizados a época en milisegundos, orden coherente y zona/semántica verificadas previamente.
- Clasificación seleccionada y soportada.
- Historial no vacío, con identidad, límites y cobertura verificados, sin omisiones ni cambio de ventana DOM.

Devuelve únicamente `eligibleForHumanReview` y motivos. Ese nombre se refiere al paquete completo verificado, **no impide diseñar una pantalla de corrección manual para datos incompletos**. No crea tareas, no autoriza envíos, no llama a IA y no instala listeners. Los datos del reporte actual no cumplen todos los requisitos, por lo que no se fuerza un resultado positivo.

ON_RATING, estados desconocidos, fechas sin normalización, cambio de atención dentro de la misma sala, índice de exportación, cobertura parcial y tercer nivel no soportado se rechazan. La veracidad de las banderas debe proporcionarla un adaptador aún pendiente; el módulo no obtiene datos ni los certifica.

## Validación

9 pruebas nuevas con datos sintéticos, más 30 previas: **39/39 pruebas locales aprobadas** en Node 24.22.1. Después de endurecer entradas nulas/inválidas, se repitieron las 9 afectadas: 9/9. Node 22/CI pendiente. No se incluyen datos del XLSX en fixtures.

## Maqueta local preparada

`tools/ikono-review-preview/index.html` es una vista autónoma con datos ficticios. Permite revisar el tramo, cambiar un estado de ejemplo y editar un borrador. No captura chats ni genera resúmenes IA. Conserva advertencias de identidad/cobertura y no tiene acción de envío.

Verificada en Chromium: solicita revisar el tramo, diferencia encuesta y revisión, no realiza solicitudes de red. Captura local `dist/ikono-assisted-review.png`. No está conectada al módulo de reglas ni a la extensión habitual: es una demostración UX independiente, no prueba de integración.

La maqueta permite continuar el diseño sin un reporte adicional. No completa F02 ni resuelve identidad/idempotencia. La restricción sigue vigente: no cerrar la atención de prueba ni escribir en Bitrix.
