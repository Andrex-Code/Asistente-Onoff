const { refreshDeviceSession } = require('../../lib/device-store');
const { createExtensionToken } = require('../../lib/extension-auth');
const { guardExtensionLogin } = require('../../lib/http-security');

module.exports = async function handler(req, res) {
  if (!guardExtensionLogin(req, res, { rateKey: 'device-refresh', rateLimit: 60, rateWindowMs: 60 * 60 * 1000 })) return;
  try {
    const deviceId = String(req.body?.deviceId || '').trim();
    const refreshToken = String(req.body?.refreshToken || '');
    if (!deviceId || !refreshToken) return res.status(400).json({ ok: false, error: 'Dispositivo no activado.' });

    const refreshed = await refreshDeviceSession({
      deviceId,
      refreshToken,
      extensionId: extensionIdFromOrigin(req.headers.origin),
      userAgent: req.headers['user-agent']
    });
    if (!refreshed) return res.status(401).json({ ok: false, error: 'La activación del dispositivo no es válida o fue revocada.' });

    const session = createExtensionToken(`device:${refreshed.device.deviceId}`, refreshed.device.deviceId);
    return res.status(200).json({
      ok: true,
      ...session,
      device: refreshed.device,
      refreshToken: refreshed.refreshToken,
      refreshExpiresAt: refreshed.refreshExpiresAt
    });
  } catch (error) {
    console.error('[device-refresh]', String(error?.message || error).slice(0, 240));
    return res.status(503).json({ ok: false, error: 'No fue posible renovar la activación del dispositivo.' });
  }
};

function extensionIdFromOrigin(origin) {
  try {
    const url = new URL(String(origin || ''));
    return url.protocol === 'chrome-extension:' ? url.hostname : '';
  } catch { return ''; }
}
