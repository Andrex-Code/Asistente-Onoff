const { lookupAfacturar } = require('../../lib/afacturar-store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false });
  }

  const cases = ['5713', '6143-C', '8038-R', '6577', '999999999'];
  const results = {};
  for (const platform of cases) {
    try {
      const match = await lookupAfacturar({ platform });
      results[platform] = {
        found: Boolean(match),
        kind: match?.url?.includes('/empresas-registro-get/') ? 'empresas-registro-get'
          : match?.url?.includes('/obligado/') ? 'obligado'
          : null,
        status: match?.status || null
      };
    } catch {
      results[platform] = { found: false, kind: null, status: null };
    }
  }

  return res.status(200).json({ ok: true, results });
};
