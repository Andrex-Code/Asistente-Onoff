# Inspección de campos para la primera tarea de prueba · 2026-11-12

Se inspeccionó el portal Bitrix del usuario, en el grupo SAC TiendasOn (53), abriendo Crear y Formulario detallado. No se diligenció título/descripción, no se seleccionó un CRM ni se guardó configuración. Se cerró el formulario y se confirmó el descarte de cambios. No se creó tarea ni se enviaron mensajes, comentarios o archivos.

## Campos estándar observados

Nombre de la tarea; Descripción; Alta prioridad; Propietario de la tarea; Responsable; Fecha límite y su configuración; Proyecto; Resúmenes del estado de la tarea; Archivos; Listas de verificación; Participantes; Observadores; Flujo; Etiquetas; Recordatorios; Elementos del CRM; Tarea principal; Subtareas (deshabilitado en esta creación); Tareas relacionadas; Recurrencia; Gantt; Programación de tareas; Seguimiento del tiempo.

Al abrir desde el grupo, el proyecto estaba propuesto como SAC TiendasOn. Propietario y responsable mostraban el usuario conectado y había fecha límite preseleccionada. Son valores observados del formulario, no reglas acordadas para la integración. No se debe heredar al responsable comercial de una negociación como responsable de tarea sin regla explícita.

## Campos personalizados encontrados en su configuración

| Nombre exacto | Regla pendiente |
|---|---|
| Prioridad | Valores y relación con la casilla estándar Alta prioridad |
| Tipo de Incidencia | Correspondencia con tipificación de iKono |
| Tipificación 2 | Correspondencia con detalle/subcategoría de iKono |
| Gestión SAC | Definir fuente y valores |
| Producto | Definir si toma el producto de la negociación o una clasificación diferente |
| Tipificación TI | Definir cuándo aplica y valores |
| Plataforma | Definir representación de TC y manejo de sufijos |

Los nombres se verificaron abriendo Campos personalizados; no se modificaron ni guardaron sus definiciones. Falta obtener identificadores REST, tipos/opciones y obligatoriedad efectiva al guardar. Esta inspección no afirma que todos se presenten inicialmente como campos editables sin configuración adicional.

## Consulta y vista previa

Se usó la búsqueda existente de negociaciones por TC, revisada como lectura (crm.deal.list y lecturas de contexto) y una ficha del portal. Dos TC del mismo chat resolvieron a negociaciones distintas de la misma compañía. Se observó diferencia entre la compañía de Bitrix y el nombre del contacto en iKono: requiere validación de establecimiento/asociación antes de escribir. El nombre de compañía no permite sustituir la elección de TC. No se interpreta esa diferencia automáticamente como dato incorrecto: puede existir cambio de titular, historial o varios establecimientos; no se investigó aún.

Datos fuente útiles observados en negociación: plataforma/TC, nombre, compañía, etapa, responsable comercial, producto, planes, país, departamento, ciudad, periodicidad y regional. Su correspondencia con la tarea queda pendiente de indicación del usuario. No se copiarán precios ni datos de contacto por defecto.

Se generó y revisó visualmente una vista previa local estática, con botón de creación desactivado, título de prueba propuesto, resumen pendiente de seleccionar atención y reglas pendientes. Los resultados privados, nombres de clientes, IDs CRM, capturas y la vista previa se mantienen solo en dist local; no se publican en este repositorio. No se conectó aún la extensión a creación de tareas.

## Pendientes antes de crear

Confirmar TC/establecimiento/asociación; plantilla del título/descripción; proyecto destino; propietario/responsable; fechas; etiquetas; si se vincula negociación, compañía o ambas; valores para los siete campos personalizados. Mantener protección contra duplicados y revisión humana antes de habilitar una escritura de prueba. No se requiere cambiar el cierre de iKono para esta inspección.
