const { importAfacturarCsv } = require('../../lib/afacturar-store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  if (String(req.query?.confirm || '') !== 'import-afacturar-2026') {
    return res.status(404).json({ ok: false });
  }

  try {
    const source = new URL(String(req.query?.source || ''));
    if (source.protocol !== 'https:' || !source.hostname.endsWith('.oaiusercontent.com')) {
      return res.status(400).json({ ok: false, error: 'Fuente temporal no permitida.' });
    }

    const response = await fetch(source.toString(), { redirect: 'follow' });
    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'No fue posible descargar la fuente temporal.' });
    }

    const csv = await response.text();
    if (!csv || csv.length > 4 * 1024 * 1024) {
      return res.status(400).json({ ok: false, error: 'Fuente vacía o demasiado grande.' });
    }

    const meta = await importAfacturarCsv(csv, {
      actor: 'bootstrap-preview',
      sourceName: 'NIT HIPERVINCULO AFACTURAR.xlsx'
    });

    return res.status(200).json({ ok: true, meta });
  } catch (error) {
    console.error('[afacturar-bootstrap]', String(error?.message || error).slice(0, 160));
    return res.status(500).json({ ok: false, error: 'No fue posible inicializar Afacturar.' });
  }
};
