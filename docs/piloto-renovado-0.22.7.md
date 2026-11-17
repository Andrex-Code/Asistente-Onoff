# 0.22.7 — autorización vencida y aviso persistente

Inspección de solo lectura del modal real el 17/11/2026: TC detectada, CRM validado y resumen generado/revalidado sobre 15 mensajes. El panel interno mostraba Piloto no configurado o vencido, mientras el aviso del asesor permanecía en Preparando. No se pulsó Resolver ni se envió el borrador de despedida.

Se conserva el error de inicio del piloto como estado persistente y se prioriza sobre el progreso CRM en cada actualización. Revalidar preparación permanece disponible. No se habilita Resolver ni se omite la autorización cuando está vencida. Prueba específica: el error sigue visible después de varios ciclos y una revalidación recupera el flujo sin escritura. Pruebas dirigidas: 13 aprobadas (11 núcleo, 1 recuperación info y 1 persistencia del error).

Se renovó por 48 horas la misma capacidad privada, mismo token/scope/cuenta/reglas: vencimiento 19/11/2026 09:24 Colombia. Configuración de producción actualizada y redesplegada con el MISMO código servidor estable fc0e30a3a8fd60811fae3277058e5fafe2790fa4; alias production READY. Comprobación remota de autorización mediante acción no habilitada, sin pedir operación Bitrix: aceptó la credencial y rechazó la acción, como se esperaba.

El paquete privado local 0.22.7 incorpora el vencimiento renovado; credenciales fuera de GitHub. La página ya abierta conserva el worker/configuración anteriores: guardar la despedida sin enviar, recargar la misma extensión y después iKono. Volver al chat y seleccionar tipificación/detalle; comprobar Lista antes del cierre humano y confirmación final PRUEBA. No se declaró habilitado el botón de la sesión antigua ni se crearon tareas. Main intacta.
