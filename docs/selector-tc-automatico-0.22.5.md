# 0.22.5 — elegir TC y continuar automáticamente

Se elimina la necesidad de Buscar TC y Confirmar establecimiento antes del cierre. Ambos controles internos permanecen ocultos; no intervienen en el recorrido del asesor. La confirmación humana final para crear la tarea PRUEBA después del cierre sigue siendo obligatoria.

- TC inequívoca por nombre/chat: aviso compacto, sin selector; consulta CRM y preparación automáticas.
- Varias TC sin evidencia suficiente: solo elegir la TC atendida inicia la consulta y preparación.
- Sin TC: escribir el número inicia la consulta después de una breve pausa. No se muestra un selector redundante con una sola opción manual.
- Una negociación exacta con compañía: selección automática y nombre visible como información.
- Varias negociaciones exactas: se elige la negociación; la preparación continúa sin otro botón de confirmación.
- Sin asociación válida o con error: se explica el fallo y Resolver continúa bloqueado. Revalidar preparación se muestra también fuera del aviso compacto para recuperar el flujo manual.

Resolver exige además tipificación/detalle completos, resumen vigente y preparación firmada. No se fuerza el disabled nativo de iKono. Cambiar la TC invalida la preparación y cancela la consulta anterior; las respuestas tardías no se aplican. Las consultas iniciadas automáticamente no dependen del disabled de un botón de búsqueda oculto.

Pruebas nuevas con motor cliente real y CRM simulado: selección entre dos TC sin clics adicionales; escritura y cambio manual de TC; elección entre varias negociaciones; ausencia de selector con TC clara y bloqueo al vaciar detalle. Se actualizó la prueba anterior del formulario manual para exigir el recorrido automático. No se cerraron chats reales ni se crearon tareas Bitrix durante la verificación. Main intacta; ensayo de la instalación pendiente.

Validación: batería general de 118 casos, 117 aprobados inicialmente. El único fallo fue un dato ficticio de prueba llamado Negocio Ejemplo, que activa deliberadamente la regla de mención ejemplificativa; se sustituyó por Comercio Central para probar una afirmación inequívoca. Reejecución del archivo afectado junto al selector: 8/8 aprobadas. No se debilitó la regla de incertidumbre para hacer pasar el caso. Los otros 117 casos (incluidos reintentos, reinicios y tipificaciones consecutivas) no fallaron.
