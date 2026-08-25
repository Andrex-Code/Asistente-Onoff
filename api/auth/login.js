const { verifyExtensionCredentials, createExtensionToken } = require('../../lib/extension-auth');
const { guardExtensionLogin } = require('../../lib/http-security');

module.exports = async function handler(req, res) {
  if (!guardExtensionLogin(req, res)) return;

  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || username.length > 100 || !password || password.length > 256) {
      return res.status(400).json({ ok: false, error: 'Credenciales inválidas.' });
    }

    if (!verifyExtensionCredentials(username, password)) {
      await delay(250);
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }

    const session = createExtensionToken(username);
    return res.status(200).json({ ok: true, ...session });
  } catch (error) {
    console.error('[security] No fue posible iniciar sesión de extensión:', safeLog(error));
    return res.status(503).json({ ok: false, error: 'El acceso seguro de la extensión no está configurado correctamente.' });
  }
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeLog(error) {
  return String(error?.message || error || 'error').replace(/[\r\n]/g, ' ').slice(0, 300);
}
