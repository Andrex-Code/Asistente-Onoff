const crypto = require('node:crypto');
const { getAuthSecret } = require('./security-secrets');

const COOKIE_NAME = 'onoff_admin_session';
const SESSION_SECONDS = 60 * 60 * 8;

function verifyCredentials(username, password) {
  const expectedUser = String(process.env.ADMIN_USERNAME || '').trim();
  const storedPassword = String(process.env.ADMIN_PASSWORD || '');
  const storedHash = String(process.env.ADMIN_PASSWORD_HASH || '').trim();
  if (!expectedUser || (!storedPassword && !storedHash)) return false;
  if (!safeEqual(String(username || ''), expectedUser)) return false;
  if (storedHash) return verifyPassword(String(password || ''), storedHash);
  return safeEqual(String(password || ''), storedPassword);
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

function createSession(username) {
  const payload = Buffer.from(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS })).toString('base64url');
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function readSession(req) {
  const token = parseCookies(req.headers.cookie || '')[COOKIE_NAME];
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed?.sub || Number(parsed.exp) < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch { return null; }
}

function requireAdmin(req, res) {
  let session = null;
  try { session = readSession(req); } catch { session = null; }
  if (!session) {
    res.status(401).json({ ok: false, error: 'Sesión no autorizada.' });
    return null;
  }
  return session;
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`);
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
}
function sign(value) { return crypto.createHmac('sha256', getAuthSecret()).update(value).digest('base64url'); }
function parseCookies(header) {
  return Object.fromEntries(String(header).split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return index === -1 ? [part, ''] : [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
  }));
}
function safeEqual(a, b) {
  const left = Buffer.from(String(a)); const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = { verifyCredentials, createSession, requireAdmin, setSessionCookie, clearSessionCookie };
