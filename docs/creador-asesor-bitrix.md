# Autoría de tareas del tipificador

El envío utiliza OAuth del portal onoff.bitrix24.es. Cada preparación, corrección y envío, incluso uno reintentado después de reiniciar Chrome, solicita un código nuevo con la sesión del navegador. El servidor consulta user.current y ejecuta la operación con los permisos de ese asesor. Los campos de responsable, participantes y proyecto siguen viniendo de la plantilla.

## Configuración del piloto

1. Registrar una aplicación local OAuth en el portal y conceder acceso a los asesores que participarán. Habilitar los permisos correspondientes a usuarios, CRM, tareas y etapas de tareas que utiliza el flujo.
2. Registrar como URL de retorno https://ajjhcdmdnlecfdjigcgenejndabambdp.chromiumapp.org/ para el identificador estable de esta extensión piloto.
3. Configurar BITRIX_ADVISOR_CLIENT_ID y BITRIX_ADVISOR_CLIENT_SECRET únicamente en el servidor. Desplegar el código del servidor y generar el paquete con la configuración privada habitual del piloto.
4. Terminar o conciliar los envíos pendientes de la instalación anterior antes del cambio. Chrome almacena la cola por identificador de extensión. Desactivar el piloto anterior para evitar dos capturadores en iKono.
5. Validar en dos perfiles con cuentas distintas. Crear una tipificación autorizada con cada asesor, comprobar el campo de creador en Bitrix y verificar etapa y estado final. Probar también cambiar de cuenta entre preparación y envío.

Al incorporar el flujo al Asistente ONOFF principal, registrar la URL de retorno correspondiente al identificador de esa extensión y conservar el acceso de cada asesor a la plantilla y al proyecto.
