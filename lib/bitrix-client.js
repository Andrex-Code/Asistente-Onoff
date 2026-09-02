const DEFAULT_TIMEOUT_MS = 12000;

function getWebhookUrl() {
  const raw = String(process.env.BITRIX_WEBHOOK_URL || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}/`;
  } catch {
    return '';
  }
}

function getPortalOrigin(webhookUrl) {
  return new URL(webhookUrl).origin;
}

async function callBitrix(webhookUrl, method, params = {}) {
  if (!/^[a-z0-9_.]+$/i.test(String(method || ''))) throw new Error('Método de Bitrix inválido.');
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((entry) => body.append(key, String(entry)));
    else if (value !== undefined && value !== null && value !== '') body.append(key, String(value));
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const response = await fetch(`${webhookUrl}${method}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) throw new Error('BITRIX_REQUEST_FAILED');
    return data?.result;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('BITRIX_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveUser(webhookUrl, id) {
  if (!id) return 'No especificado';
  try {
    const users = await callBitrix(webhookUrl, 'user.get', { ID: id });
    const user = Array.isArray(users) ? users[0] : null;
    return [user?.NAME, user?.LAST_NAME].filter(Boolean).join(' ').trim() || `Usuario ${id}`;
  } catch {
    return `Usuario ${id}`;
  }
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeBitrixError(error) {
  const code = String(error?.message || error || 'BITRIX_ERROR');
  if (code === 'BITRIX_TIMEOUT') return 'Bitrix tardó demasiado en responder. Intente nuevamente.';
  return 'No fue posible consultar Bitrix en este momento.';
}

module.exports = { getWebhookUrl, getPortalOrigin, callBitrix, resolveUser, toIso, safeBitrixError };
