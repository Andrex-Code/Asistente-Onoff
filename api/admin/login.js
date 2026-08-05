const { verifyCredentials, createSession, setSessionCookie, clearSessionCookie } = require('../../lib/admin-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  const { username, password } = req.body || {};
  if (!verifyCredentials(username, password)) return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos.' });
  setSessionCookie(res, createSession(String(username)));
  return res.status(200).json({ ok: true });
};
