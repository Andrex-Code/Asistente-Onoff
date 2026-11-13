# 0.19.0 — TC en la interfaz del asesor

## Recorrido visible

Al abrir Resolver conversación aparece dentro del formulario una tarjeta de validación del asesor. Incluye TC candidata con su origen, ingreso manual si falta, confirmación humana, validación CRM, negociación/compañía, resumen editable y revisión de textos/alcance diario. No exige interactuar con los paneles de diagnóstico; estos se ocultan en el paquete de asesor, pero el motor de memoria/resumen sigue ejecutándose.

Guardar revisión para Resolver prepara el borrador desde la tarjeta. Sin TC válida confirmada, asociación exacta en Bitrix y revisión del resumen no se habilita la preparación. El Resolver humano verifica además que esa tarjeta esté validada y que no haya cambiado su snapshot. Después del cierre se conserva la confirmación final de creación, lápiz, campos bloqueados y cola de reintentos de 0.18.

La validación se realiza antes de perder el acceso al historial al resolver; no se permite cerrar primero con identidad desconocida para crear una tarea incompleta después. Tras resolver, la tarea muestra la TC ya validada y el editor CRM puede cambiarla solo con las validaciones del servidor.

## Reglas de TC

- Nombre: reutiliza parseo de prefijo TC, posiciones numéricas permitidas y sufijo corto. Un número candidato nunca confirma por sí mismo.
- Chat: recoge TC explícitas y la propuesta de IA solo si tiene cita literal presente en el texto. No se interpretan números de teléfono, IDs AnyDesk numéricos o números sueltos como TC.
- Fotos: conserva OCR local acotado de hasta dos fotos, extracción de alias TC/posible pie de POS, caché y límites. Se usa cuando falta TC en nombre/chat, hay varias TC sin aclarar o el contexto es ambiguo. No retrasa el resumen de texto. La propuesta de OCR requiere verificación humana.
- Una candidata puede quedar seleccionada para facilitar la revisión, pero su confirmación humana siempre comienza desmarcada. Varias candidatas requieren elección. Si no hay candidatas se muestra ingreso manual.
- Nuevas candidatas, mensajes nuevos o cambios de TC revocan la validación; cambiar TC exige otra consulta CRM. Resultados de consulta que llegan tarde para otra sala/TC se descartan. Una asociación sin compañía queda bloqueada.

Las correcciones de resumen en la tarjeta sobreviven a Cancelar/reabrir dentro de la sesión y no son reemplazadas por la respuesta IA. Se conserva su texto, pero se exige nuevamente validación al reabrir. No se certifica cobertura completa automáticamente: el asesor confirma que cargó todos los contactos de hoy y selecciona solo textos de la TC atendida.

## Evidencia y entrega

Pruebas Chromium con el motor real y respuestas de servicios simuladas verifican uso exclusivo de tarjeta del asesor con diagnóstico oculto, TC única, manual, varias TC, chat/fotos como fuentes, CRM inexistente, revocación tras mensaje con otra TC y conservación de correcciones al cancelar. Regresiones de creación, cola, firma, campos bloqueados y recuperación aprobadas. No se cerraron chats reales ni crearon tareas durante este cambio. El servicio Bitrix activo sigue siendo el de 0.18: no necesita un nuevo endpoint ni cambio de credenciales para esta versión.

Paquete privado: dist/ONOFF-resumen-0.19.0-PRUEBA.zip. Recargar extensión e iKono para usarlo. Código y pruebas en docs/roadmap-ikono-bitrix-trazabilidad; main intacta. La activación privada no se publica en GitHub. Pendiente primer ensayo real de esta tarjeta; vigencia del piloto, límites diarios, interpretación de audios y fecha límite automática de Bitrix siguen como en la guía anterior.
