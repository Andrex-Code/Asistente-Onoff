const { verifyCredentials, createSession, setSessionCookie, clearSessionCookie } = require('../../lib/admin-auth');
const { setCommonSecurityHeaders, requireSameOrigin } = require('../../lib/http-security');
const { consumeRateLimit, getClientIp, applyRateLimitHeaders } = require('../../lib/rate-limit');

module.exports = async function handler(req, res) {
  setCommonSecurityHeaders(res);
  if (!requireSameOrigin(req, res)) return;
  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  const size = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(size) && size > 16 * 1024) return res.status(413).json({ ok: false, error: 'Solicitud demasiado grande.' });
  const state = consumeRateLimit(`admin-login:${getClientIp(req)}`, 8, 15 * 60 * 1000);
  applyRateLimitHeaders(res, state);
  if (!state.allowed) return res.status(429).json({ ok: false, error: 'Demasiados intentos. Espere antes de volver a intentar.' });

  try {
    const { username, password } = req.body || {};
    if (!verifyCredentials(username, password)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
    }
    setSessionCookie(res, createSession(String(username)));
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[admin-login]', String(error?.message || error).slice(0, 200));
    return res.status(503).json({ ok: false, error: 'El acceso administrativo no está configurado correctamente.' });
  }
};
