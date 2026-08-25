const { requireAdmin } = require('../../lib/admin-auth');
const { setCommonSecurityHeaders, requireSameOrigin } = require('../../lib/http-security');
const { createInstallBatch, listDevices, listInstallBatches, revokeDevice, revokeInstallBatch } = require('../../lib/device-store');

module.exports = async function handler(req, res) {
  setCommonSecurityHeaders(res);
  if (!requireSameOrigin(req, res)) return;
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const [devices, batches] = await Promise.all([listDevices(), listInstallBatches()]);
      return res.status(200).json({ ok: true, devices, batches });
    }

    if (req.method === 'POST') {
      const label = String(req.body?.label || 'Asesores ONOFF').trim();
      const maxActivations = Number(req.body?.maxActivations || 50);
      const validHours = Number(req.body?.validHours || 72);
      const installBatch = await createInstallBatch({ label, maxActivations, validHours }, session.sub);
      return res.status(201).json({ ok: true, installBatch });
    }

    if (req.method === 'DELETE') {
      const deviceId = String(req.body?.deviceId || '').trim();
      const tokenId = String(req.body?.tokenId || '').trim();
      if (deviceId) {
        const device = await revokeDevice(deviceId, session.sub);
        if (!device) return res.status(404).json({ ok: false, error: 'Dispositivo no encontrado.' });
        return res.status(200).json({ ok: true, device });
      }
      if (tokenId) {
        const batch = await revokeInstallBatch(tokenId, session.sub);
        if (!batch) return res.status(404).json({ ok: false, error: 'Paquete no encontrado.' });
        return res.status(200).json({ ok: true, batch });
      }
      return res.status(400).json({ ok: false, error: 'Dispositivo o paquete requerido.' });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  } catch (error) {
    console.error('[admin-devices]', String(error?.message || error).slice(0, 240));
    return res.status(500).json({ ok: false, error: 'No fue posible administrar los dispositivos.' });
  }
};
