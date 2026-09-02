const { requireExtensionAuth } = require('./extension-auth');
const { consumeRateLimit, getClientIp, applyRateLimitHeaders } = require('./rate-limit');

function setCommonSecurityHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
}

function handleExtensionCors(req, res, methods = ['POST', 'OPTIONS']) {
  const origin = String(req?.headers?.origin || '').trim();
  const allowed = !origin || isAllowedExtensionOrigin(origin);
  if (!allowed) return false;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    appendVary(res, 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Vercel-Protection-Bypass');
  res.setHeader('Access-Control-Max-Age', '600');
  return true;
}

function isAllowedExtensionOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol === 'chrome-extension:') {
      const configuredIds = splitCsv(process.env.ALLOWED_EXTENSION_IDS);
      return configuredIds.length === 0 || configuredIds.includes(url.hostname);
    }

    const extraOrigins = splitCsv(process.env.ALLOWED_ORIGINS);
    if (extraOrigins.includes(url.origin)) return true;

    if (process.env.NODE_ENV !== 'production' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
      return url.protocol === 'http:' || url.protocol === 'https:';
    }
  } catch {
    return false;
  }
  return false;
}

function guardExtensionApi(req, res, options = {}) {
  const {
    methods = ['POST'],
    rateKey = 'api',
    rateLimit = 60,
    rateWindowMs = 60000,
    maxContentLength = 1024 * 1024
  } = options;

  setCommonSecurityHeaders(res);
  if (!handleExtensionCors(req, res, [...methods, 'OPTIONS'])) {
    res.status(403).json({ ok: false, error: 'Origen no autorizado.' });
    return null;
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return null;
  }
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).json({ ok: false, error: 'Método no permitido.' });
    return null;
  }

  const contentLength = Number(req?.headers?.['content-length'] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxContentLength) {
    res.status(413).json({ ok: false, error: 'Solicitud demasiado grande.' });
    return null;
  }

  const session = requireExtensionAuth(req, res);
  if (!session) return null;

  const state = consumeRateLimit(`${rateKey}:${session.sub}:${getClientIp(req)}`, rateLimit, rateWindowMs);
  applyRateLimitHeaders(res, state);
  if (!state.allowed) {
    res.status(429).json({ ok: false, error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' });
    return null;
  }
  return session;
}

function guardExtensionLogin(req, res, options = {}) {
  const {
    rateKey = 'extension-login',
    rateLimit = 8,
    rateWindowMs = 15 * 60 * 1000,
    maxContentLength = 16 * 1024
  } = options;

  setCommonSecurityHeaders(res);
  if (!handleExtensionCors(req, res, ['POST', 'OPTIONS'])) {
    res.status(403).json({ ok: false, error: 'Origen no autorizado.' });
    return false;
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Método no permitido.' });
    return false;
  }

  const contentLength = Number(req?.headers?.['content-length'] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxContentLength) {
    res.status(413).json({ ok: false, error: 'Solicitud demasiado grande.' });
    return false;
  }

  const state = consumeRateLimit(`${rateKey}:${getClientIp(req)}`, rateLimit, rateWindowMs);
  applyRateLimitHeaders(res, state);
  if (!state.allowed) {
    res.status(429).json({ ok: false, error: 'Demasiados intentos. Espere antes de volver a intentar.' });
    return false;
  }
  return true;
}

function requireSameOrigin(req, res) {
  const origin = String(req?.headers?.origin || '').trim();
  if (!origin) return true;

  try {
    const expected = configuredPublicOrigin(req);
    if (new URL(origin).origin === expected) return true;
  } catch {
    // Se rechaza abajo.
  }

  res.status(403).json({ ok: false, error: 'Origen no autorizado.' });
  return false;
}

function configuredPublicOrigin(req) {
  const configured = String(process.env.PUBLIC_BASE_URL || '').trim();
  if (configured) return new URL(configured).origin;
  const host = String(req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').split(',')[0].trim();
  const proto = String(req?.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim();
  if (!host) throw new Error('Host no disponible.');
  return `${proto}://${host}`;
}

function appendVary(res, value) {
  const current = String(res.getHeader?.('Vary') || '');
  const values = current.split(',').map((item) => item.trim()).filter(Boolean);
  if (!values.includes(value)) values.push(value);
  res.setHeader('Vary', values.join(', '));
}

function splitCsv(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

module.exports = {
  setCommonSecurityHeaders,
  handleExtensionCors,
  guardExtensionApi,
  guardExtensionLogin,
  requireSameOrigin
};
