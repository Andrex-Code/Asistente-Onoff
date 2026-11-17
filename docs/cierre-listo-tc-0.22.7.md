# Preparación real desbloqueada — 17/11/2026

Inspección de la sesión real con extensión 0.22.7: autorización renovada operativa, resumen disponible en 2,4 s, TC y negociación identificadas, categoría y detalle completos. El servidor rechazaba con mensaje genérico de plantilla/asociación.

Consulta de solo lectura confirmó proyecto 53 y responsable 931952 en PRIMER CONTACTO. Búsqueda CRM devolvía una coincidencia exacta y otras terminales con sufijos. Se unificó la comprobación del servidor con exactTcRecords, ya utilizado por la búsqueda, para normalizar prefijo TC, espacios, variantes de campo y valores múltiples sin aceptar coincidencias parciales ni sufijos distintos. Se separaron mensajes de error de plantilla, compañía y TC. No se eliminó el control de plantilla ni asociación.

Optimización aplicada: la preparación multi reutiliza la negociación que acaba de verificar, eliminando una segunda llamada crm.deal.get idéntica dentro de la misma solicitud. No se añadió caché duradera ni se relajó la vigencia de la preparación. El resumen ya disponible se reutilizó durante el reintento; no se cambió el modelo.

22/22 pruebas de servidor y formato aprobadas, incluidas TC5046/5046/espacios/array y rechazo de 5046-1, 5046-C y 15046. Código publicado en la rama y desplegado en producción, commit 83d5979b1ba5f74d046e3c49a969c45a7da4771c, READY.

Se pulsó únicamente Revalidar preparación en la sesión real: apareció Lista para resolver y se verificaron disabled=false y ausencia de data-onoff-blocked. Preparación para TC8714, FALLAS EN SOFTWARE → PENDIENTES POR SINCRONIZAR. El radicado técnico previo se conserva como referencia. No se pulsó Resolver, no se envió mensaje y no se confirmó creación Bitrix por parte del agente. Cierre y confirmación final quedan a cargo del asesor. Falta verificar el radicado de tipificación después de su confirmación.
