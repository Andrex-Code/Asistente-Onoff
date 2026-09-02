const { activateFromInstallBatch, ProvisioningError } = require('../../lib/device-store');
const { createExtensionToken } = require('../../lib/extension-auth');
const { guardExtensionLogin } = require('../../lib/http-security');

module.exports = async function handler(req, res) {
  if (!guardExtensionLogin(req, res, { rateKey: 'device-activation', rateLimit: 20, rateWindowMs: 15 * 60 * 1000 })) return;
  try {
    const installToken = String(req.body?.installToken || '').trim();
    const deviceId = String(req.body?.deviceId || '').trim();
    if (!installToken || !deviceId) return res.status(400).json({ ok: false, error: 'Paquete de instalación no autorizado.' });

    const activated = await activateFromInstallBatch({
      installToken,
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
    if (error instanceof ProvisioningError) return res.status(401).json({ ok: false, error: error.message });
    console.error('[device-activation]', String(error?.message || error).slice(0, 240));
    return res.status(503).json({ ok: false, error: 'No fue posible autorizar esta instalación.' });
  }
};

function extensionIdFromOrigin(origin) {
  try {
    const url = new URL(String(origin || ''));
    return url.protocol === 'chrome-extension:' ? url.hostname : '';
  } catch { return ''; }
}
