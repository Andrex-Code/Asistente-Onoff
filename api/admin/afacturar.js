const { requireAdmin } = require('../../lib/admin-auth');
const { setCommonSecurityHeaders, requireSameOrigin } = require('../../lib/http-security');
const { getAfacturarMetadata, importAfacturarCsv } = require('../../lib/afacturar-store');

module.exports = async function handler(req, res) {
  setCommonSecurityHeaders(res);
  if (!requireSameOrigin(req, res)) return;
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const meta = await getAfacturarMetadata();
      return res.status(200).json({ ok: true, meta });
    }

    if (req.method === 'PUT') {
      const csv = typeof req.body?.csv === 'string' ? req.body.csv : '';
      const sourceName = String(req.body?.sourceName || 'Base Afacturar.csv');
      if (!csv) return res.status(400).json({ ok: false, error: 'Seleccione un archivo CSV.' });
      if (csv.length > 5 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'El archivo supera 5 MB.' });
      const meta = await importAfacturarCsv(csv, { actor: session.sub, sourceName });
      return res.status(200).json({ ok: true, meta });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  } catch (error) {
    const code = String(error?.message || error);
    console.error('[admin-afacturar]', code.slice(0, 160));
    const messages = {
      AFACTURAR_EMPTY_FILE: 'El archivo está vacío.',
      AFACTURAR_REQUIRED_COLUMNS: 'Faltan columnas requeridas: PLATAFORMA, NIT-CC y ACCESO DIRECTO.',
      AFACTURAR_TOO_MANY_RECORDS: 'La base supera el máximo permitido.',
      AFACTURAR_NO_VALID_ROWS: 'No se encontraron filas válidas con enlace de Afacturar.',
      AFACTURAR_STORAGE_NOT_READY: 'Falta configurar el almacenamiento privado.'
    };
    return res.status(500).json({ ok: false, error: messages[code] || 'No fue posible actualizar la base de Afacturar.' });
  }
};
