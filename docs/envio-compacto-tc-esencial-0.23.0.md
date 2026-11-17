# 0.23.0 — envío compacto y TC Esencial

La TC Esencial 20107-1-1 se normaliza como 20107. Búsqueda y servidor comparten esta regla literal; no se eliminan otros sufijos. El resultado conserva originalTc e ID de negociación y compañía. Si hay varias negociaciones compatibles, el asesor elige. La tarea usa TC base en asunto y Plataforma; la ficha CRM no se modifica.

Se elimina la casilla adicional de fecha. El servidor comprueba el día Colombia de la preparación firmada y del clic de cierre, además del límite de atención y revisión. Esto valida el alcance del contacto observado, no convierte fechas ausentes del historial en fechas verificadas. Persisten separación por sala/atención/TC, controles de revisión y confirmación humana de crear.

Tras retirar iKono su modal se muestra antes el resumen congelado con Verificando cierre; no aparece confirmación de creación hasta la evidencia de cierre guardada. La espera de Inicio estable se mantiene. No se afirma una mejora medida de latencia real.

Confirmar crear minimiza el modal a barra de título/Creando/Ver detalle. Envíos independientes por registro no ocupan el bloqueo global de preparación ni borran el borrador de otro chat. Doble clic o reintento en vuelo reutiliza el mismo trabajo. Error permanece recuperable; el sondeo del journal local retira la barra si un reintento termina. No añade llamadas Bitrix de sondeo.

Se conserva crear → verificar Finalizadas Solicitud → completar → verificar estado. Reintentos y reserva idempotente existentes siguen vigentes. No se cierran chats reales ni se crean tareas reales en QA.

Pruebas: 33/33 de TC/consulta/servidor; 1/1 navegador con TC Esencial del texto y respuesta CRM con sufijo; 5/5 QA de envío conjunto; prueba de vista previa anticipada aprobada. Regresión adicional de cliente documentada al completar verificación. Fixtures y red simulados; ensayo instalado pendiente.

Paquete privado 0.23.0 generado con --pilot. Renovación temporal existente hasta 19/11/2026 09:24 Colombia, sin nueva ampliación. Credenciales, diario, datos de clientes y ZIP no se publican.
