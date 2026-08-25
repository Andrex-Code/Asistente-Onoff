const crypto = require('node:crypto');
const { getAuthSecret } = require('./security-secrets');

const TOKEN_ISSUER = 'asistente-onoff';
const TOKEN_AUDIENCE = 'onoff-extension';
const DEFAULT_SESSION_SECONDS = 60 * 60 * 8;

function verifyExtensionCredentials(username, password) {
  const user = normalizeUsername(username);
  const rawPassword = String(password || '');
  if (!user || !rawPassword || rawPassword.length > 256) return false;

  const users = loadConfiguredUsers();
  const encoded = users.get(user.toLowerCase());
  if (!encoded) return false;
  return verifyPassword(rawPassword, encoded);
}

function createExtensionToken(username) {
  const sub = normalizeUsername(username);
  if (!sub) throw new Error('Usuario inválido.');

  const now = Math.floor(Date.now() / 1000);
  const ttl = getSessionSeconds();
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeJson({
    sub,
    iss: TOKEN_ISSUER,
    aud: TOKEN_AUDIENCE,
    iat: now,
    exp: now + ttl,
    jti: crypto.randomUUID()
  });
  const unsigned = `${header}.${payload}`;
  const signature = sign(unsigned);

  return {
    token: `${unsigned}.${signature}`,
    expiresAt: (now + ttl) * 1000,
    user: sub
  };
}

function readExtensionToken(token) {
  const raw = String(token || '');
  if (!raw || raw.length > 4096) return null;
  const parts = raw.split('.');
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signature] = parts;
  const unsigned = `${headerPart}.${payloadPart}`;
  if (!safeEqual(signature, sign(unsigned))) return null;

  try {
    const header = decodeJson(headerPart);
    const payload = decodeJson(payloadPart);
    const now = Math.floor(Date.now() / 1000);
    if (header?.alg !== 'HS256' || header?.typ !== 'JWT') return null;
    if (payload?.iss !== TOKEN_ISSUER || payload?.aud !== TOKEN_AUDIENCE) return null;
    if (!payload?.sub || typeof payload.sub !== 'string' || payload.sub.length > 100) return null;
    if (!Number.isFinite(Number(payload.exp)) || Number(payload.exp) <= now) return null;
    if (!Number.isFinite(Number(payload.iat)) || Number(payload.iat) > now + 60) return null;
    return payload;
  } catch {
    return null;
  }
}

function requireExtensionAuth(req, res) {
  const authorization = String(req?.headers?.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const session = match ? readExtensionToken(match[1]) : null;
  if (!session) {
    res.status(401).json({ ok: false, error: 'Sesión no autorizada o vencida.' });
    return null;
  }
  return session;
}

function loadConfiguredUsers() {
  const users = new Map();
  const rawJson = String(process.env.EXTENSION_USERS_JSON || '').trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        Object.entries(parsed).forEach(([name, encoded]) => {
          const normalized = normalizeUsername(name);
          if (normalized && typeof encoded === 'string' && encoded.trim()) {
            users.set(normalized.toLowerCase(), encoded.trim());
          }
        });
      }
    } catch {
      // Configuración inválida = sin usuarios autorizados.
    }
  }

  const singleUser = normalizeUsername(process.env.EXTENSION_USERNAME);
  const singleHash = String(process.env.EXTENSION_PASSWORD_HASH || '').trim();
  if (singleUser && singleHash) users.set(singleUser.toLowerCase(), singleHash);
  return users;
}

function verifyPassword(password, encoded) {
  const [algorithm, iterationsRaw, salt, expected] = String(encoded || '').split('$');
  if (algorithm !== 'pbkdf2_sha256' || !iterationsRaw || !salt || !expected) return false;
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 2000000) return false;
  if (!/^[a-f0-9]{16,256}$/i.test(salt) || !/^[a-f0-9]{64}$/i.test(expected)) return false;
  const actual = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return safeEqual(actual, expected);
}

function getSessionSeconds() {
  const configured = Number(process.env.EXTENSION_SESSION_SECONDS || DEFAULT_SESSION_SECONDS);
  if (!Number.isFinite(configured)) return DEFAULT_SESSION_SECONDS;
  return Math.min(60 * 60 * 12, Math.max(60 * 15, Math.floor(configured)));
}

function sign(value) {
  return crypto.createHmac('sha256', getAuthSecret()).update(value).digest('base64url');
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function normalizeUsername(value) {
  const text = String(value || '').trim();
  return text && text.length <= 100 ? text : '';
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = {
  verifyExtensionCredentials,
  createExtensionToken,
  readExtensionToken,
  requireExtensionAuth
};
