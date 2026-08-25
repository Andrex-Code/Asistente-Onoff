const crypto = require('node:crypto');
const { get, put, list } = require('@vercel/blob');
const { getAuthSecret } = require('./security-secrets');

const DEVICE_PREFIX = 'onoff/devices/';
const INSTALL_BATCH_PREFIX = 'onoff/install-batches/';
const DEFAULT_REFRESH_DAYS = 180;
const DEFAULT_BATCH_HOURS = 72;
const DEFAULT_BATCH_MAX = 50;
const MAX_DEVICE_RECORDS = 500;
const MAX_BATCH_RECORDS = 100;

async function createInstallBatch(options = {}, actor = 'admin') {
  ensureStorage();
  const label = normalizeLabel(options.label || 'Asesores ONOFF');
  const maxActivations = clampNumber(options.maxActivations, DEFAULT_BATCH_MAX, 1, 250);
  const validHours = clampNumber(options.validHours, DEFAULT_BATCH_HOURS, 1, 24 * 14);
  const token = `onoff_install_${crypto.randomBytes(32).toString('base64url')}`;
  const tokenId = secretDigest(token);
  const now = Date.now();
  const record = {
    version: 1,
    tokenId,
    label,
    status: 'active',
    createdAt: new Date(now).toISOString(),
    createdBy: String(actor || 'admin').slice(0, 100),
    expiresAt: new Date(now + validHours * 60 * 60 * 1000).toISOString(),
    maxActivations,
    activationCount: 0,
    lastActivationAt: null,
    revokedAt: null,
    revokedBy: null
  };
  await writeJson(installBatchPath(tokenId), record);
  return { installToken: token, batch: publicBatch(record) };
}

async function activateFromInstallBatch({ installToken, deviceId, extensionId, userAgent }) {
  ensureStorage();
  const token = String(installToken || '').trim();
  const id = normalizeDeviceId(deviceId);
  if (!/^onoff_install_[A-Za-z0-9_-]{30,120}$/.test(token) || !id) {
    throw new ProvisioningError('Paquete de instalación inválido.');
  }

  const tokenId = secretDigest(token);
  const path = installBatchPath(tokenId);
  const batch = await readJson(path);
  if (!batch || batch.status !== 'active') throw new ProvisioningError('El paquete de instalación ya no está autorizado.');
  if (Date.parse(batch.expiresAt || '') <= Date.now()) throw new ProvisioningError('El paquete de instalación venció. Solicite un paquete actualizado.');
  if (Number(batch.activationCount || 0) >= Number(batch.maxActivations || 0)) {
    throw new ProvisioningError('El paquete alcanzó el número máximo de instalaciones autorizadas.');
  }

  const existing = await readDevice(id);
  if (existing?.status === 'active' && existing.installBatchId === tokenId) {
    return issueFreshDeviceCredential(existing, extensionId, userAgent);
  }

  const ordinal = Number(batch.activationCount || 0) + 1;
  const now = Date.now();
  const record = {
    version: 1,
    deviceId: id,
    deviceName: `${normalizeLabel(batch.label || 'Equipo ONOFF')} ${String(ordinal).padStart(2, '0')}`.slice(0, 80),
    nameKey: `${normalizeNameKey(batch.label || 'equipo-onoff')}-${ordinal}`,
    status: 'active',
    extensionId: normalizeExtensionId(extensionId),
    installBatchId: tokenId,
    installBatchLabel: normalizeLabel(batch.label || ''),
    activatedAt: new Date(now).toISOString(),
    activatedBy: `batch:${String(batch.createdBy || 'admin').slice(0, 80)}`,
    lastSeenAt: new Date(now).toISOString(),
    refreshExpiresAt: null,
    refreshHash: null,
    userAgent: sanitizeUserAgent(userAgent),
    revokedAt: null,
    revokedBy: null,
    revokedReason: null
  };

  const credential = await issueFreshDeviceCredential(record, extensionId, userAgent);
  const nextBatch = {
    ...batch,
    activationCount: ordinal,
    lastActivationAt: new Date(now).toISOString()
  };
  await writeJson(path, nextBatch);
  return credential;
}

async function issueFreshDeviceCredential(record, extensionId, userAgent) {
  const refreshToken = createRefreshToken();
  const now = Date.now();
  const refreshExpiresAt = new Date(now + getRefreshSeconds() * 1000).toISOString();
  const next = {
    ...record,
    extensionId: record.extensionId || normalizeExtensionId(extensionId),
    lastSeenAt: new Date(now).toISOString(),
    refreshExpiresAt,
    refreshHash: secretDigest(refreshToken),
    userAgent: sanitizeUserAgent(userAgent) || record.userAgent
  };
  await writeJson(devicePath(next.deviceId), next);
  return { device: publicDevice(next), refreshToken, refreshExpiresAt };
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
  return issueFreshDeviceCredential(record, extensionId, userAgent);
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

async function revokeInstallBatch(tokenId, actor = 'admin') {
  ensureStorage();
  const id = String(tokenId || '').trim();
  if (!/^[a-f0-9]{64}$/i.test(id)) throw new Error('Identificador de paquete inválido.');
  const record = await readJson(installBatchPath(id));
  if (!record) return null;
  const next = {
    ...record,
    status: 'revoked',
    revokedAt: new Date().toISOString(),
    revokedBy: String(actor || 'admin').slice(0, 100)
  };
  await writeJson(installBatchPath(id), next);
  return publicBatch(next);
}

async function readDevice(deviceId) {
  const id = normalizeDeviceId(deviceId);
  return id ? readJson(devicePath(id)) : null;
}

async function listDevices() {
  ensureStorage();
  const blobs = await listAll(DEVICE_PREFIX, MAX_DEVICE_RECORDS);
  const records = await Promise.all(blobs.map((blob) => readJson(blob.pathname || blob.url).catch(() => null)));
  return records
    .filter(Boolean)
    .map(publicDevice)
    .sort((a, b) => String(b.activatedAt || '').localeCompare(String(a.activatedAt || '')));
}

async function listInstallBatches() {
  ensureStorage();
  const blobs = await listAll(INSTALL_BATCH_PREFIX, MAX_BATCH_RECORDS);
  const records = await Promise.all(blobs.map((blob) => readJson(blob.pathname || blob.url).catch(() => null)));
  return records
    .filter(Boolean)
    .map(publicBatch)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

async function listAll(prefix, maxRecords) {
  const blobs = [];
  let cursor;
  do {
    const result = await list({ prefix, cursor, limit: 100 });
    blobs.push(...(result.blobs || []));
    cursor = result.cursor;
  } while (cursor && blobs.length < maxRecords);
  return blobs.slice(0, maxRecords);
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

function createRefreshToken() { return crypto.randomBytes(32).toString('base64url'); }
function secretDigest(value) { return crypto.createHmac('sha256', getAuthSecret()).update(String(value || '')).digest('hex'); }
function devicePath(deviceId) { return `${DEVICE_PREFIX}${crypto.createHash('sha256').update(deviceId).digest('hex')}.json`; }
function installBatchPath(tokenId) { return `${INSTALL_BATCH_PREFIX}${tokenId}.json`; }
function normalizeDeviceId(value) {
  const text = String(value || '').trim();
  return /^[a-f0-9-]{20,64}$/i.test(text) ? text : '';
}
function normalizeExtensionId(value) {
  const text = String(value || '').trim();
  return /^[a-z0-9_-]{16,80}$/i.test(text) ? text : '';
}
function normalizeLabel(value) {
  return String(value || '').replace(/[\r\n\t]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Asesores ONOFF';
}
function normalizeNameKey(value) {
  return normalizeLabel(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
    installBatchLabel: record.installBatchLabel || '',
    activatedAt: record.activatedAt,
    lastSeenAt: record.lastSeenAt,
    refreshExpiresAt: record.refreshExpiresAt,
    revokedAt: record.revokedAt,
    revokedBy: record.revokedBy,
    revokedReason: record.revokedReason
  };
}
function publicBatch(record) {
  return {
    tokenId: record.tokenId,
    label: record.label,
    status: record.status,
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    expiresAt: record.expiresAt,
    maxActivations: Number(record.maxActivations || 0),
    activationCount: Number(record.activationCount || 0),
    lastActivationAt: record.lastActivationAt,
    revokedAt: record.revokedAt,
    revokedBy: record.revokedBy
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

class ProvisioningError extends Error {}

module.exports = {
  createInstallBatch,
  activateFromInstallBatch,
  refreshDeviceSession,
  revokeDevice,
  revokeInstallBatch,
  readDevice,
  listDevices,
  listInstallBatches,
  publicDevice,
  publicBatch,
  ProvisioningError
};
