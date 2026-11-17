# 0.23.2 — confirmación al cambiar de chat

Cada cierre humano conserva su instantánea e intento firmado en una cola independiente de la preparación actual. Se observa la señal DOM correlacionada antes de la siguiente navegación: Resuelto o retorno nativo a Inicio sin tarjeta ni modal anterior. Se mantiene una espera de dos segundos antes de guardar la confirmación. Navegar después de observar esa señal no la invalida; cancelar B no borra A. Si reaparece el modal original, no se confirma. Navegación sin señal válida no basta.

La confirmación guardada queda en journal persistente y, mientras se atiende B, se ofrece aviso compacto Revisar confirmaciones. No se crea ninguna tarea sin confirmación humana. Un fallo al guardar se reintenta con el mismo intento cada tres segundos. La observación anterior al guardado es memoria de la página: recargar durante esos dos segundos sigue siendo una limitación; no se promete confirmación si iKono no expuso señal de cierre.

Pruebas simuladas de navegación rápida a B/cancelar B y navegación sin señal: 2/2 aprobadas. QA envío previo: 5/5. Vista previa anticipada revalidada tras corregir que la preparación de B la retiraba. TC numérica sin nombre incorporada: 6/6. Sin cierres reales ni tareas creadas. Instalación del asesor pendiente.
