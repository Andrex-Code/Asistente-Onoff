# Consulta autorizada de identidad e historial iKono

**Fecha de revisión:** 2026-11-11. Alcance: documentación pública y menú del perfil de agente; no se consultaron APIs internas, credenciales ni almacenamiento de sesión. No se resolvió ninguna atención.

## Documentación pública revisada

- [Características de iKono Chat](https://changelog.ikono.net.co/): declara conservación del historial ante cambios de estado/reasignación y reportes por estado, agente, tipificación y entradas a cola. Su sección APIs describe Sender y WAPI; en las páginas revisadas no se encontró un contrato de lectura por atención con paginación y límites verificables.
- [Changelog](https://changelog.ikono.net.co/changelog/): entrada 2025-10-27 anuncia detalle de tipificación con niveles ilimitados; entrada 2026-03-24 menciona transferencia a menú de calificación al resolver. Son capacidades publicadas, **no prueba de que la instalación ONOFF tenga esa configuración**.

Consecuencia de diseño (inferencia): el éxito de clic/retirada del modal no debe equivaler a finalización de todo el flujo; una categoría y un único detalle no son un esquema universal suficiente.

## Interfaz disponible

En el menú del usuario del perfil de agente observado solo se mostraron Notificaciones, Ajustes y Cerrar sesión, además de cambio de tema. No apareció un enlace de reportes. No se modificaron ajustes; se cerró el menú. Esto no demuestra que el producto carezca de reportes ni que el usuario no tenga otro acceso autorizado.

Se solicitó al usuario abrir un reporte de tipificaciones o detalle de conversaciones filtrado exclusivamente a la sala de prueba. Pendiente de inspección de esa superficie. No se requiere compartir contraseñas ni abrir permisos adicionales.

## Evidencia requerida del reporte o integración autorizada

| Dato requerido | Cómo comprobarlo | No sustituir por |
| --- | --- | --- |
| ID único de atención | Valor distinto en dos atenciones de la misma sala; estable al transferir o consultar de nuevo según semántica oficial | ID de sala, teléfono, contador de apertura |
| Inicio y fin de atención | Fechas con zona/offset, precisión y significado documentados | Última unión de agente o texto Chat resuelto |
| Relación con sala/canal | Misma atención enlazada explícitamente a su historial y canal | Coincidencia de nombre de contacto |
| Estado final | Distinguir resuelto, transferido a encuesta, abandonado y reabierto | Desaparición del modal |
| Tipificación completa | IDs y ruta ordenada de todos los niveles, con versión de catálogo cuando aplique | Primer detalle visible solamente |
| Historial | Fuente de solo lectura, orden, paginación, fin explícito y criterio de pertenencia a atención | Llegar al extremo del scroll |
| Eventos especiales | Tratamiento de adjuntos, notas internas, eliminados, editados, citas y encuestas | Texto plano sin distinguir origen |
| Consistencia | Qué ocurre si llegan mensajes durante la consulta o se reabre la sala | Una captura DOM tratada como definitiva |

Estos son requisitos de la integración ONOFF, **no un contrato de API publicado por iKono**. No se inventan rutas o nombres de campos del proveedor. Si un reporte expone ID y fechas pero no historial, sirve para contraste manual; no acredita que exista una API de lectura utilizable por la extensión.

## Ensayo de contraste preparado

1. Filtrar el reporte exclusivamente a la conversación ficticia; no exportar ni guardar filas de clientes.
2. Inspeccionar encabezados y tipos de dato antes de copiar valores. Registrar resultados anonimizados.
3. Contrastar dos ciclos históricos de la misma sala y, si hay muestra autorizada, otra sala. No producir nuevos cierres para conseguir la muestra.
4. Verificar estabilidad del ID ante reasignación y qué evento define inicio/fin; registrar excepciones y zona horaria.
5. Contrastar cantidad y pertenencia de mensajes con una atención de prueba conocida; confirmar paginación completa desde fuente autorizada.
6. Mantener sin verificar cualquier punto que el reporte no permita demostrar. No habilitar tareas ni resúmenes automáticos con cobertura desconocida.

## Protección de tipificación

El lector actual rechaza más de dos controles devolviendo unknown; no descarta silenciosamente niveles adicionales. Se añadieron regresiones para tercer nivel y campo dependiente aún sin montar. **30/30 pruebas locales aprobadas en Node 24.22.1**; Node 22/CI pendiente. No se amplió todavía el lector a niveles ilimitados: falta observar su estructura real y acordar cómo representar la ruta en Bitrix.

## Dependencia actual

La validación requiere una superficie de reportes disponible para el usuario o documentación de integración entregada por el administrador/proveedor. No se contactó a terceros ni se solicitó una credencial. F02 sigue abierta; quedan confirmación final autorizada, identidad y cobertura, aunque apertura/cancelación tenga 20/20.
