const { activateDevice, EnrollmentError } = require('../../lib/device-store');
const { createExtensionToken } = require('../../lib/extension-auth');
const { guardExtensionLogin } = require('../../lib/http-security');

module.exports = async function handler(req, res) {
  if (!guardExtensionLogin(req, res, { rateKey: 'device-activation', rateLimit: 10, rateWindowMs: 15 * 60 * 1000 })) return;
  try {
    const code = String(req.body?.code || '').trim();
    const deviceId = String(req.body?.deviceId || '').trim();
    if (!code || !deviceId) return res.status(400).json({ ok: false, error: 'Código de activación requerido.' });

    const activated = await activateDevice({
      code,
      deviceId,
      extensionId: extensionIdFromOrigin(req.headers.origin),
      userAgent: req.headers['user-agent']
    });
    const session = createExtensionToken(`device:${activated.device.deviceId}`, activated.device.deviceId);
    return res.status(200).json({
      ok: true,
      ...session,
      device: activated.device,
      refreshToken: activated.refreshToken,
      refreshExpiresAt: activated.refreshExpiresAt
    });
  } catch (error) {
    if (error instanceof EnrollmentError) return res.status(401).json({ ok: false, error: error.message });
    console.error('[device-activation]', String(error?.message || error).slice(0, 240));
    return res.status(503).json({ ok: false, error: 'No fue posible activar el dispositivo.' });
  }
};

function extensionIdFromOrigin(origin) {
  try {
    const url = new URL(String(origin || ''));
    return url.protocol === 'chrome-extension:' ? url.hostname : '';
  } catch { return ''; }
}
