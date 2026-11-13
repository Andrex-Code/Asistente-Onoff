# 0.21.4 — continuidad de fecha en captura

La frase completa con mi tc es 5900 se reconoce por el extractor. Se reproduce un fallo distinto: al retirarse el separador Hoy del DOM, mensajes nuevos posteriores a un evento ya fechado de la misma sala quedaban sin fecha y fuera de la atención. Ahora heredan únicamente ese ancla verificada en el orden capturado; no se asigna hoy por defecto ni se comparte entre salas. Nueve pruebas de fecha/TC aprobadas, más una de ingreso manual mínimo. Ensayo real del caso del usuario pendiente.

Incluye la tarjeta mínima solicitada: TC, Buscar, negociación y Confirmar establecimiento; resumen revisado solo al confirmar creación. Paquete privado dist/ONOFF-resumen-0.21.4-PRUEBA.zip. Servidor sin cambios; main intacta.
