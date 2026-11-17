# 0.23.0 — envío compacto y TC Esencial

La TC Esencial 20107-1-1 se normaliza como 20107. Búsqueda y servidor comparten esta regla literal; no se eliminan otros sufijos. El resultado conserva originalTc e ID de negociación y compañía. Si hay varias negociaciones compatibles, el asesor elige. La tarea usa TC base en asunto y Plataforma; la ficha CRM no se modifica.

Se elimina la casilla adicional de fecha. El servidor comprueba el día Colombia de la preparación firmada y del clic de cierre, además del límite de atención y revisión. Esto valida el alcance del contacto observado, no convierte fechas ausentes del historial en fechas verificadas. Persisten separación por sala/atención/TC, controles de revisión y confirmación humana de crear.

Tras retirar iKono su modal se muestra antes el resumen congelado con Verificando cierre; no aparece confirmación de creación hasta la evidencia de cierre guardada. La espera de Inicio estable se mantiene. No se afirma una mejora medida de latencia real.

Confirmar crear minimiza el modal a barra de título/Creando/Ver detalle. Envíos independientes por registro no ocupan el bloqueo global de preparación ni borran el borrador de otro chat. Doble clic o reintento en vuelo reutiliza el mismo trabajo. Error permanece recuperable; el sondeo del journal local retira la barra si un reintento termina. No añade llamadas Bitrix de sondeo.

Se conserva crear → verificar Finalizadas Solicitud → completar → verificar estado. Reintentos y reserva idempotente existentes siguen vigentes. No se cierran chats reales ni se crean tareas reales en QA.

Pruebas: 33/33 de TC/consulta/servidor; 1/1 navegador con TC Esencial del texto y respuesta CRM con sufijo; 5/5 QA de envío conjunto; prueba de vista previa anticipada aprobada. Regresión adicional de cliente documentada al completar verificación. Fixtures y red simulados; ensayo instalado pendiente.

Paquete privado 0.23.0 generado con --pilot. Renovación temporal existente hasta 19/11/2026 09:24 Colombia, sin nueva ampliación. Credenciales, diario, datos de clientes y ZIP no se publican.

## Verificación final

13/13 pruebas conjuntas de selector y contactos secuenciales aprobadas; 5/5 QA envío aprobadas en ejecución conjunta. Regresión de creador: seis casos aprobados en la batería; recuperación actualizada al aviso compacto aprobó por separado, y el aviso de un segundo aprobó usando tiempo real (el reloj simulado bloqueaba la acción del navegador). La batería amplia anterior se interrumpió al quedar detenida en este último ensayo; sus 23 casos con resultado emitido aprobaron, no se declara batería completa aprobada.

Servidor desplegado READY desde 01542cce269ff3a52471122dfaf25e383791bc1f, alias de producción verificado. Consulta remota de solo lectura para 20107: HTTP200, tc 20107, originalTc 20107-1-1, coincidencia exacta con negociación y compañía presentes. No se crean ni editan tareas reales durante la comprobación. Carpeta privada y ZIP 0.23.0 verificados contra fuentes; recarga instalada pendiente del asesor.
