# Correcciones propuestas para auditoría tipificador 0.23.3

Fecha: 17/11/2026. Rama de trabajo: `fix/ikono-tipificador-auditoria-0233`. PR de revisión: #46. **Sin despliegue de producción, sin cambios en main.**

## Matriz de los seis hallazgos
| Hallazgo | Cambio propuesto | Evidencia automatizada |
| --- | --- | --- |
| P1 API de Bitrix sin autenticación | Verificación obligatoria del token de consultas en el servidor; CORS deja de ser autorización; límite de 60 peticiones/minuto/token por instancia | `tests/qa-audit-api.test.cjs` |
| P1 Error/timeout bloquea cierre | La alerta y el timeout son estados temporales; nueva señal del mismo cierre puede continuar, con revisión del asesor | `tests/qa-audit-closure.test.cjs` |
| P1 Resuelto de sala homónima | Comprobar coincidencia de ruta y del elemento seleccionado original, no solo el nombre de la tarjeta | `tests/qa-audit-closure.test.cjs` |
| P1 Rechazo explícito Bitrix | Registrar rechazo definitivo, bloquear reintento automático y permitir una corrección confirmada en nueva reserva exclusiva; timeout ambiguo sigue sin repetir `task.add` | `tests/qa-audit-delivery.test.cjs` y `tests/ikono-task-create.test.cjs` |
| P1 TC con sufijos no Esencial | Rechazar candidatos con sufijos que no sean `-1-1`; jamás atribuir `TC20107-C` a `TC20107` | `tests/qa-audit-tc.test.cjs` |
| P2 HTTP 502 HTML | Gestionar body no JSON y reintentar 429/502/503/504 como máximo dos veces; respuestas antiguas no sustituyen el nuevo chat | `tests/qa-audit-summary.test.cjs` |

## Configuración de autorización obligatoria
1. TI genera un token aleatorio de **al menos 32 bytes**. En Vercel configura solo el SHA-256 hexadecimal de ese token en `ONOFF_READ_TOKEN_HASH`. No publicar token, hash ni webhook en el repositorio.
2. Cada instalación autorizada del Asistente ONOFF introduce el token en **Ajustes > Herramientas de traducción > Acceso de consultas ONOFF**. Se almacena en `chrome.storage.local`, no en `chrome.storage.sync`.
3. El piloto iKono sigue utilizando la autorización de corta duración `IKONO_TASK_PILOT`; sus consultas CRM/IA pasan por el worker de la extensión. No exponer el token del piloto en la página iKono.
4. Si no se configura el secreto del servidor y el token correspondiente, las APIs de lectura devolverán 401 (cierre seguro); la extensión principal no podrá buscar en Bitrix ni usar el asistente IA. Revisar despliegue como cambio coordinado.
5. El límite actual opera por instancia de función, no es un límite distribuido global. Antes de escala empresarial evaluar un limitador centralizado, controles de cuenta/sesión, registro de auditoría sin PII y el uso de autorización institucional.

## Condiciones para aprobar
- CI de Node y navegador completamente verde, compilación y pruebas de extensión.
- Pruebas de seguridad de acceso anónimo/expirado, controles de errores, dos chats seguidos y salas homónimas.
- Ensayo real autorizado del asesor (sin datos sensibles compartidos): dos cierres, error temporal recuperado, recarga, respuesta de Bitrix perdida y confirmación humana.
- No hacer merge ni instalación de producción sin la revisión de SAC/IT y los requisitos anteriores.

Nota: cambios de código y tests no equivalen por sí solos a certificación de ausencia de fallos.
