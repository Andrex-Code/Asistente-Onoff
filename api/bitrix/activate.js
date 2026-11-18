const { createActivationService } = require('../../lib/bitrix-read-activation');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  try {
    const result = await createActivationService().activate(req.body?.code, req.body?.secret);
    return res.status(200).json({ ok: true, ...result });
  } catch (error) {
    return res.status(error.status || 503).json({ ok: false, error: error.status ? error.message : 'Activación no disponible. Reintenta con el mismo código.' });
  }
};
