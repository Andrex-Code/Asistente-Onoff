# 0.21.0 — detección contextual de TC e identificación condicional

La extracción de TC del chat se separa de las reglas posicionales del nombre. No se codifica ningún número de cliente. Reconoce prefijo TC/T.C., conectores (es, número, corresponde a, etc.), código de tienda/establecimiento, plataforma numérica y respuestas numéricas directas después de una solicitud explícita de TC. Deduplica las candidatas. Teléfonos largos, fechas, importes decimales, radicados sin contexto TC y números sueltos sin solicitud previa no se convierten en TC. Preguntas, negaciones, ejemplos y menciones ambiguas requieren revisión; varias candidatas no se eligen automáticamente.

Se conservan las reglas del nombre y la lectura OCR local acotada cuando faltan datos o hay ambigüedad. OCR por sí solo no habilita el recorrido compacto. La IA existente puede aportar una cita literal fundamentada; no se añade otra llamada para detectar TC. Encontrar un número sigue sin demostrar asociación CRM: siempre se consulta la negociación y compañía exactas.

## Interfaz

Con TC única clara, la tarjeta blanca de identificación se oculta. Se muestra solo un aviso pequeño con TC detectada, progreso y Cambiar TC. La extensión consulta CRM y prepara el borrador cuando tipificación/detalle y resumen actual están disponibles. Resolver permanece bloqueado durante esa preparación.

Esta preparación automática no autoriza escrituras: el asesor confirma TC y resumen mediante Confirmar crear tarea después de Resolver. El borrador firmado y la selección interna provisional no se presentan como aprobación humana anterior. Si se cambia la TC, faltan datos o la candidata es ambigua, se conserva el recorrido de revisión explícita. La opción Cambiar TC abre los campos; una corrección humana pendiente conserva su texto y su revisión, incluso al cancelar/reabrir.

Sin TC, el recuadro permite escribirla. Con varias o con una mención incierta, exige elegir/confirmar. Si CRM falla o no permite una asociación única, no se arma el cierre; muestra el aviso y permite revisar. No se confunde detección con creación. El resumen solo toma la atención seleccionada de hoy, como en 0.20.

Se conservan confirmación final obligatoria, edición de borrador, campos bloqueados, idempotencia, reintentos y el orden crear → verificar Finalizadas Solicitud → completar → verificar estado 5, del servidor 0.20.1. Esta versión solo cambia el cliente; no requiere despliegue de servidor ni nuevos permisos.

## Pruebas y límites

Pruebas de variantes de lenguaje/puntuación y respuesta contextual, rechazo de números ajenos, preguntas/negaciones/múltiples TC, recorrido compacto sin tarjeta blanca, preparación sin escritura, confirmación final necesaria, apertura manual y conservación de correcciones. La cobertura de historia y la interpretación de frases no se certifican por tener una candidata: una expresión no reconocida o incierta deriva a humano. No promete comprender cualquier redacción posible ni infiere TC de cualquier número.

Paquete privado: dist/ONOFF-resumen-0.21.0-PRUEBA.zip. Recargar extensión e iKono para aplicar. Main intacta; código en docs/roadmap-ikono-bitrix-trazabilidad. No se cerraron chats ni se crearon tareas reales durante esta versión. Pendiente ensayo real por el usuario.
