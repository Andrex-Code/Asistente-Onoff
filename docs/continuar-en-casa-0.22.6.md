# Continuar Asistente ONOFF desde casa — 0.22.6

Rama de continuidad: `docs/roadmap-ikono-bitrix-trazabilidad` en `Andrex-Code/Asistente-Onoff`. Seguimiento: issue #38. Main no se modificó. Este documento describe el estado vigente; las guías 0.17 y anteriores son históricas.

## Dónde quedamos

- Extensión independiente 0.22.6 para pruebas autorizadas; aún no integrada en la extensión principal del Asistente.
- Memoria aislada por sala/atención/TC. Actualiza al visitar el chat y revalida al abrir Resolver. Las salas ocultas no se leen continuamente; los chats deben visitarse. Motivo, Gestión y Resultado; correcciones humanas conservadas.
- TC del nombre, textos o apoyo OCR condicionado. Entre varias TC del nombre se usa una afirmación inequívoca del chat o evidencia literal de la misma llamada IA del resumen. No se hacen llamadas IA adicionales para extraer la TC. Sin evidencia suficiente se elige/escribe.
- Seleccionar/escribir TC consulta CRM y prepara automáticamente, sin Buscar TC ni Confirmar establecimiento. Negociación única exacta con compañía se selecciona sola; varias exigen elección. Campos de iKono y preparación vigente siguen obligatorios.
- El asesor pulsa Resolver conversación. La opción sin mensaje permanece protegida. Después se exige confirmar la tarea PRUEBA, con editor de borrador; tipificación, detalle y equipo de plantilla permanecen bloqueados.
- Plantilla PRIMER CONTACTO; crear, verificar Finalizadas Solicitud, completar y verificar resultado. Misma intención/registro en reintentos; fallos persistidos y recuperables. Éxito breve, sin panel residual.
- Si falta fecha accesible, solo se admite el contacto activo delimitado y se requiere confirmación explícita de fecha/alcance al crear. No se da por certificado todo el historial.

## Último fallo y corrección

El asesor reportó TC8055 detectada y «Este piloto solo permite la TC y sala autorizadas». La comprobación usaba la ruta del emisor del mensaje interno. Se reprodujo un emisor con ruta anterior A y pestaña en B: rechazaba B y podía aceptar el payload viejo A.

0.22.6 consulta la URL actual con `chrome.tabs.get`, conserva origen/sala/capacidad y distingue un cambio de sala de una instalación configurada para una sola TC. Permisos de host limitados a los mismos dos sitios iKono para verificar la pestaña sin clic en el icono. Edge puede pedir habilitar ese acceso al recargar.

Validación: **122/122 pruebas de regresión**, más **una prueba independiente con la extensión cargada en Chromium** para leer la ruta actual sin clic y rechazar datos de la sala anterior. Sin cierre de chats reales ni nuevas escrituras Bitrix durante esta corrección. Detalles en [la evidencia](sala-actual-piloto-0.22.6.md).

## Preparar otro equipo

Clonar el repositorio y seleccionar esta rama. Node 22 y dependencias del lockfile:

```sh
git clone --branch docs/roadmap-ikono-bitrix-trazabilidad https://github.com/Andrex-Code/Asistente-Onoff.git
cd Asistente-Onoff
npm ci
npx playwright install chromium
```

Comprobación inicial sin acceso real a Bitrix:

```sh
node --test tests/ikono-spa-room.test.cjs tests/qa-worker-lifecycle.test.cjs tests/ikono-task-journal.test.cjs tests/qa-interruptions.test.cjs tests/ikono-delivery.test.cjs tests/ikono-task-create.test.cjs
node --test tests/ikono-advisor.test.cjs tests/ikono-attended-tc.test.cjs tests/ikono-tc-selector.test.cjs tests/qa-sequential-typifications.test.cjs
```

Las pruebas anteriores usan servicios simulados. Código del cliente: `tools/ikono-summary-preview`; extracción TC: `src/ikono-tc.cjs`; servicio y cola: `lib/ikono-task-pilot.js`, `tools/ikono-summary-preview/task-background.js` y `delivery.js`. Backend existente `asistente-onoff.vercel.app`, sin cambio de servidor en 0.22.6.

El generador `node scripts/build-ikono-summary-preview.cjs` crea `dist/ikono-summary-preview` **sin capacidad de escritura**. Para producir un paquete autorizado se usa `--pilot` con `dist/task-pilot-private.json` privado disponible localmente. No ejecutar la compilación sin `--pilot` sobre la carpeta instalada esperando conservar su autorización: el generador reemplaza `pilot-auth.js` por una configuración sin autorización.

## Lo que no viaja por GitHub

ZIP privado `ONOFF-resumen-0.22.6-PRUEBA.zip`, `dist/task-pilot-private.json`, `pilot-auth.js` generado, secretos de Vercel/Bitrix y datos/reportes/capturas de clientes. El código y las pruebas están publicados; esos archivos privados no. Si se necesita escribir desde casa, trasladar el paquete autorizado mediante un canal privado propio o preparar una nueva capacidad con la configuración existente. No subir las credenciales a la rama.

La capacidad actual se verificó en modo multi, vigente hasta el **15/11/2026, 17:55 Colombia**. Su autorización no se renovó ni amplió. Los diarios locales de Chrome/Edge tampoco se transfieren al clonar: un envío pendiente se recupera desde su registro original, no creando una nueva intención en otro equipo.

## Próximo ensayo pendiente

Actualizar la misma extensión instalada a 0.22.6, verificar su versión en Extensiones, habilitar acceso a los sitios iKono si se solicita y recargar iKono sin texto pendiente. El asesor vuelve a abrir Resolver en el cliente que esté atendiendo y revisa TC/negociación/resumen. Con campos completos, debe aparecer Lista; el cierre lo pulsa el asesor y después confirma crear PRUEBA.

Verificar un único radicado nuevo, TC y CRM correctos, marca PRUEBA, Finalizadas Solicitud y Completada. Repetir con otro cliente sin recargar la extensión. Si aparece un fallo, consultar/reintentar el mismo registro; no recrear manualmente la tarea ni cerrar nuevamente chats ya cerrados. La corrección de sala aún no se ha observado en la sesión real del asesor.
