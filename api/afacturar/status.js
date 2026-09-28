const { getAfacturarMetadata } = require('../../lib/afacturar-store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const meta = await getAfacturarMetadata();
    return res.status(200).json({
      ok: true,
      storageConfigured: true,
      ready: Boolean(meta.ready),
      count: Number(meta.count || 0),
      updatedAt: meta.updatedAt || null
    });
  } catch (error) {
    const code = String(error?.message || error);
    if (code === 'AFACTURAR_STORAGE_NOT_READY') {
      return res.status(503).json({
        ok: false,
        storageConfigured: false,
        ready: false,
        count: 0,
        updatedAt: null
      });
    }
    console.error('[afacturar-status]', code.slice(0, 160));
    return res.status(500).json({ ok: false, error: 'No fue posible consultar el estado de Afacturar.' });
  }
};
