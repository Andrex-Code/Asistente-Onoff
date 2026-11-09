# Pestañas Negociación y Compañía (1.12.0)

Al buscar una TC exacta, cada tarjeta abre Negociación y permite alternar a
Compañía con clic o con las flechas del teclado. No se repite ninguna consulta al
cambiar de pestaña. Las tareas del cliente permanecen debajo de las tarjetas.

- Negociación: TC, título, cliente, NIT/identificación, plan contratado y última
  actualización; conserva Abrir negociación, Copiar enlace y Afacturar.
- Compañía: nombre, NIT/identificación, teléfonos y correos; permite abrir la
  ficha exacta de esa compañía o copiar su enlace.
- Estado, Responsable e ID ya no se muestran en la tarjeta de negociación.

## Origen de los datos

Se verificó en la ficha de Bitrix que «Producto Plan» corresponde a las filas de
productos de la negociación. `crm.deal.productrows.get` obtiene esos nombres
por el ID exacto del resultado, sin inferir un plan del título ni del catálogo.
Se muestran todos los nombres de esa sección, incluidos equipos si están
registrados allí; no se adivina cuál de ellos es el servicio. El límite de 50
nombres se indica mediante un aviso para abrir la negociación.

La compañía se obtiene con `crm.company.get` usando `COMPANY_ID` de la
negociación. Se verifica que el ID recibido sea el solicitado. El documento
proviene de `BITRIX_IDENTIFICATION_FIELD` o del campo predeterminado
`UF_CRM_1599251398`; teléfono y correo vienen de las listas estándar `PHONE` y
`EMAIL`. Se conserva el documento tal como está guardado, incluidos ceros y
dígito de verificación. La etiqueta «NIT / identificación» contempla fichas de
personas naturales cuyo documento es una cédula.

No se mezclan teléfonos o correos de un contacto personal con los de la compañía.
Una negociación sin `COMPANY_ID` muestra «no tiene una compañía asociada».
Permisos, error de red o una respuesta de compañía no verificable muestran un
aviso diferente; no se interpretan como datos vacíos. Del mismo modo, se
distinguen productos vacíos de una consulta de productos fallida.

Las compañías repetidas se consultan una sola vez dentro de la respuesta y la
consulta de productos tiene como máximo tres peticiones simultáneas. No se
persisten datos de contacto. Los campos anteriores del contrato de la API se
conservan para compatibilidad con versiones anteriores de la extensión.

## Validación

`npm test` verifica normalización, asociación por ID, filas de productos de otra
negociación, datos ausentes, errores y concurrencia. `npm run test:bitrix`
verifica pestañas, teclado, enlaces de cada ficha, campos visibles, regreso a
Negociación al buscar otra TC y ausencia de consultas al alternar pestañas.
Los datos utilizados en las pruebas son ficticios.

Referencias:
- https://apidocs.bitrix24.com/api-reference/crm/deals/crm-deal-productrows-get.html
- https://apidocs.bitrix24.com/api-reference/crm/companies/crm-company-get.html
