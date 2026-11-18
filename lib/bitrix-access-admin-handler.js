const { requireAdmin } = require('./admin-auth');
const { createActivationService } = require('./bitrix-read-activation');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['POST','DELETE'].includes(req.method)) return res.status(405).json({ ok: false });
  if (!requireAdmin(req,res)) return;
  try {
    const service = createActivationService();
    if (req.method === 'DELETE') {
      await service.revoke(req.body?.reference);
      return res.status(200).json({ ok: true });
    }
    return res.status(201).json({ ok: true, ...await service.issue() });
  } catch (error) {
    return res.status(error.status || 503).json({ ok: false, error: error.status ? error.message : 'El servicio de códigos no está disponible.' });
  }
};
