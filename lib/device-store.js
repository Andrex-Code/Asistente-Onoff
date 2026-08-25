const crypto = require('node:crypto');
const { get, put, list } = require('@vercel/blob');
const { getAuthSecret } = require('./security-secrets');

const DEVICE_PREFIX = 'onoff/devices/';
const ENROLLMENT_PREFIX = 'onoff/enrollments/';
const DEFAULT_ENROLLMENT_SECONDS = 10 * 60;
const DEFAULT_REFRESH_DAYS = 180;
const MAX_DEVICE_RECORDS = 500;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function createEnrollment(deviceName, actor = 'admin') {
  ensureStorage();
  const name = normalizeDeviceName(deviceName);
  if (!name) throw new Error('Ingrese un nombre de equipo válido.');

  const code = createReadableCode();
  const codeId = secretDigest(normalizeEnrollmentCode(code));
  const now = Date.now();
  const ttlSeconds = clampNumber(process.env.DEVICE_ENROLLMENT_SECONDS, DEFAULT_ENROLLMENT_SECONDS, 5 * 60, 30 * 60);
  const record = {
    version: 1,
    codeId,
    deviceName: name,
    nameKey: normalizeNameKey(name),
    createdAt: new Date(now).toISOString(),
    createdBy: String(actor || 'admin').slice(0, 100),
    expiresAt: new Date(now + ttlSeconds * 1000).toISOString(),
    usedAt: null,
    usedByDeviceId: null
  };

  await writeJson(enrollmentPath(codeId), record);
  return { code, deviceName: name, expiresAt: record.expiresAt };
}

async function activateDevice({ code, deviceId, extensionId, userAgent }) {
  ensureStorage();
  const normalizedCode = normalizeEnrollmentCode(code);
  const normalizedDeviceId = normalizeDeviceId(deviceId);
  if (!normalizedCode || !normalizedDeviceId) throw new Error('Código de activación o identificador de dispositivo inválido.');

  const codeId = secretDigest(normalizedCode);
  const path = enrollmentPath(codeId);
  const enrollment = await readJson(path);
  if (!enrollment) throw new EnrollmentError('Código de activación inválido o vencido.');
  if (enrollment.usedAt) throw new EnrollmentError('Este código de activación ya fue utilizado. Genere uno nuevo.');
  if (Date.parse(enrollment.expiresAt || '') <= Date.now()) throw new EnrollmentError('El código de activación venció. Genere uno nuevo.');

  const claimedAt = new Date().toISOString();
  await writeJson(path, { ...enrollment, usedAt: claimedAt, usedByDeviceId: normalizedDeviceId });
  const claimed = await readJson(path);
  if (!claimed || claimed.usedByDeviceId !== normalizedDeviceId) {
    throw new EnrollmentError('El código ya fue utilizado en otro equipo. Genere uno nuevo.');
  }

  await supersedeDevicesWithSameName(enrollment.nameKey, normalizedDeviceId);

  const refreshToken = createRefreshToken();
  const now = Date.now();
  const refreshExpiresAt = new Date(now + getRefreshSeconds() * 1000).toISOString();
  const record = {
    version: 1,
    deviceId: normalizedDeviceId,
    deviceName: normalizeDeviceName(enrollment.deviceName) || 'Equipo ONOFF',
    nameKey: enrollment.nameKey || normalizeNameKey(enrollment.deviceName),
    status: 'active',
    extensionId: normalizeExtensionId(extensionId),
    activatedAt: new Date(now).toISOString(),
    activatedBy: String(enrollment.createdBy || 'admin').slice(0, 100),
    lastSeenAt: new Date(now).toISOString(),
    refreshExpiresAt,
    refreshHash: secretDigest(refreshToken),
    userAgent: sanitizeUserAgent(userAgent),
    revokedAt: null,
    revokedBy: null,
    revokedReason: null
  };

  await writeJson(devicePath(normalizedDeviceId), record);
  return { device: publicDevice(record), refreshToken, refreshExpiresAt };
}

async function refreshDeviceSession({ deviceId, refreshToken, extensionId, userAgent }) {
  ensureStorage();
  const id = normalizeDeviceId(deviceId);
  const token = String(refreshToken || '');
  if (!id || token.length < 32 || token.length > 256) return null;

  const record = await readDevice(id);
  if (!record || record.status !== 'active') return null;
  if (Date.parse(record.refreshExpiresAt || '') <= Date.now()) return null;
  if (!safeEqual(record.refreshHash, secretDigest(token))) return null;

  const requestExtensionId = normalizeExtensionId(extensionId);
  if (record.extensionId && requestExtensionId && record.extensionId !== requestExtensionId) return null;

  const nextRefreshToken = createRefreshToken();
  const now = Date.now();
  const next = {
    ...record,
    extensionId: record.extensionId || requestExtensionId,
    lastSeenAt: new Date(now).toISOString(),
    refreshExpiresAt: new Date(now + getRefreshSeconds() * 1000).toISOString(),
    refreshHash: secretDigest(nextRefreshToken),
    userAgent: sanitizeUserAgent(userAgent) || record.userAgent
  };
  await writeJson(devicePath(id), next);
  return { device: publicDevice(next), refreshToken: nextRefreshToken, refreshExpiresAt: next.refreshExpiresAt };
}

async function revokeDevice(deviceId, actor = 'admin', reason = 'Revocado por administrador') {
  ensureStorage();
  const id = normalizeDeviceId(deviceId);
  if (!id) throw new Error('Identificador de dispositivo inválido.');
  const record = await readDevice(id);
  if (!record) return null;
  if (record.status !== 'active') return publicDevice(record);

  const next = {
    ...record,
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    revokedBy: String(actor || 'admin').slice(0, 100),
    revokedReason: String(reason || 'Revocado').slice(0, 200),
    refreshHash: null
  };
  await writeJson(devicePath(id), next);
  return publicDevice(next);
}

async function readDevice(deviceId) {
  const id = normalizeDeviceId(deviceId);
  return id ? readJson(devicePath(id)) : null;
}

async function listDevices() {
  ensureStorage();
  const blobs = [];
  let cursor;
  do {
    const result = await list({ prefix: DEVICE_PREFIX, cursor, limit: 100 });
    blobs.push(...(result.blobs || []));
    cursor = result.cursor;
  } while (cursor && blobs.length < MAX_DEVICE_RECORDS);

  const records = await Promise.all(blobs.slice(0, MAX_DEVICE_RECORDS).map((blob) => readJson(blob.pathname || blob.url).catch(() => null)));
  return records
    .filter(Boolean)
    .map(publicDevice)
    .sort((a, b) => String(b.activatedAt || '').localeCompare(String(a.activatedAt || '')));
}

async function supersedeDevicesWithSameName(nameKey, currentDeviceId) {
  if (!nameKey) return;
  const devices = await listDevices();
  const matches = devices.filter((device) => device.status === 'active' && device.nameKey === nameKey && device.deviceId !== currentDeviceId);
  await Promise.all(matches.map((device) => revokeDevice(device.deviceId, 'system', 'Reemplazado por una nueva activación del mismo equipo')));
}

async function readJson(pathOrUrl) {
  try {
    const result = await get(pathOrUrl, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch (error) {
    if (/not found|404/i.test(String(error?.message || error))) return null;
    throw error;
  }
}

async function writeJson(path, value) {
  await put(path, JSON.stringify(value, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8'
  });
}

function createReadableCode() {
  const bytes = crypto.randomBytes(8);
  let value = '';
  for (let index = 0; index < 8; index += 1) value += CODE_ALPHABET[bytes[index] % CODE_ALPHABET.length];
  return `ONOFF-${value.slice(0, 4)}-${value.slice(4)}`;
}

function createRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function secretDigest(value) {
  return crypto.createHmac('sha256', getAuthSecret()).update(String(value || '')).digest('hex');
}

function devicePath(deviceId) {
  return `${DEVICE_PREFIX}${crypto.createHash('sha256').update(deviceId).digest('hex')}.json`;
}
function enrollmentPath(codeId) { return `${ENROLLMENT_PREFIX}${codeId}.json`; }
function normalizeEnrollmentCode(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function normalizeDeviceId(value) {
  const text = String(value || '').trim();
  return /^[a-f0-9-]{20,64}$/i.test(text) ? text : '';
}
function normalizeExtensionId(value) {
  const text = String(value || '').trim();
  return /^[a-z0-9_-]{16,80}$/i.test(text) ? text : '';
}
function normalizeDeviceName(value) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}
function normalizeNameKey(value) {
  return normalizeDeviceName(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function sanitizeUserAgent(value) { return String(value || '').replace(/[\r\n]/g, ' ').slice(0, 240); }
function getRefreshSeconds() {
  const days = clampNumber(process.env.DEVICE_REFRESH_DAYS, DEFAULT_REFRESH_DAYS, 7, 365);
  return days * 24 * 60 * 60;
}
function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}
function publicDevice(record) {
  return {
    deviceId: record.deviceId,
    deviceName: record.deviceName,
    nameKey: record.nameKey,
    status: record.status,
    extensionId: record.extensionId || '',
    activatedAt: record.activatedAt,
    lastSeenAt: record.lastSeenAt,
    refreshExpiresAt: record.refreshExpiresAt,
    revokedAt: record.revokedAt,
    revokedBy: record.revokedBy,
    revokedReason: record.revokedReason
  };
}
function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
function ensureStorage() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Falta conectar Vercel Blob privado.');
}

class EnrollmentError extends Error {}

module.exports = {
  createEnrollment,
  activateDevice,
  refreshDeviceSession,
  revokeDevice,
  readDevice,
  listDevices,
  publicDevice,
  EnrollmentError
};
