const { requireAdmin } = require('../../lib/admin-auth');
const { setCommonSecurityHeaders, requireSameOrigin } = require('../../lib/http-security');
const { createEnrollment, listDevices, revokeDevice } = require('../../lib/device-store');

module.exports = async function handler(req, res) {
  setCommonSecurityHeaders(res);
  if (!requireSameOrigin(req, res)) return;
  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const devices = await listDevices();
      return res.status(200).json({ ok: true, devices });
    }

    if (req.method === 'POST') {
      const deviceName = String(req.body?.deviceName || '').trim();
      if (!deviceName || deviceName.length > 80) return res.status(400).json({ ok: false, error: 'Ingrese un nombre de equipo válido.' });
      const enrollment = await createEnrollment(deviceName, session.sub);
      return res.status(201).json({ ok: true, enrollment });
    }

    if (req.method === 'DELETE') {
      const deviceId = String(req.body?.deviceId || '').trim();
      if (!deviceId) return res.status(400).json({ ok: false, error: 'Dispositivo requerido.' });
      const device = await revokeDevice(deviceId, session.sub);
      if (!device) return res.status(404).json({ ok: false, error: 'Dispositivo no encontrado.' });
      return res.status(200).json({ ok: true, device });
    }

    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  } catch (error) {
    console.error('[admin-devices]', String(error?.message || error).slice(0, 240));
    return res.status(500).json({ ok: false, error: 'No fue posible administrar los dispositivos.' });
  }
};
