const nativeFetch = globalThis.fetch.bind(globalThis);
const SESSION_KEYS = ['onoffAuthToken', 'onoffAuthExpiresAt'];
const DEVICE_KEYS = ['onoffDeviceId', 'onoffDeviceName', 'onoffRefreshToken', 'onoffRefreshExpiresAt'];
let refreshPromise = null;

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDeviceId();
  await ensureProvisioned().catch(() => {});
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDeviceId();
  await ensureProvisioned().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ONOFF_SECURE_API_FETCH') return false;
  secureApiFetch(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ okTransport: false, error: error.message || 'Error de conexión segura.' }));
  return true;
});

globalThis.fetch = async (input, init = {}) => {
  const url = resolveUrl(input);
  if (!url || !url.pathname.startsWith('/api/')) return nativeFetch(input, init);
  if (isPublicAuthEndpoint(url.pathname)) return nativeFetch(input, init);
  return authenticatedFetch(url.toString(), init);
};

async function secureApiFetch(message) {
  const url = resolveUrl(message.url);
  if (!url) throw new Error('URL de backend inválida.');
  const backendUrl = await getBackendUrl();
  if (url.origin !== backendUrl.origin || !url.pathname.startsWith('/api/') || isPublicAuthEndpoint(url.pathname)) {
    throw new Error('Destino de API no autorizado.');
  }
  if (!['POST', 'GET', 'PUT', 'DELETE'].includes(message.method)) throw new Error('Método no autorizado.');

  const headers = new Headers(message.headers || {});
  headers.delete('Authorization');
  const response = await authenticatedFetch(url.toString(), {
    method: message.method,
    headers,
    body: ['GET', 'HEAD'].includes(message.method) ? undefined : (message.body || undefined)
  });
  const body = await response.text();
  const responseHeaders = {};
  const contentType = response.headers.get('content-type');
  if (contentType) responseHeaders['Content-Type'] = contentType;
  return { okTransport: true, status: response.status, statusText: response.statusText, headers: responseHeaders, body };
}

async function authenticatedFetch(input, init = {}) {
  const url = resolveUrl(input);
  const backendUrl = await getBackendUrl();
  if (!url || url.origin !== backendUrl.origin || !url.pathname.startsWith('/api/')) return nativeFetch(input, init);

  await ensureProvisioned();
  let auth = await chrome.storage.local.get(SESSION_KEYS);
  if (!auth.onoffAuthToken || Number(auth.onoffAuthExpiresAt || 0) <= Date.now()) {
    throw new Error('Asistente ONOFF no pudo autorizar esta instalación. Solicite reinstalar el paquete actualizado.');
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', `Bearer ${auth.onoffAuthToken}`);
  let response = await nativeFetch(input, { ...init, headers });

  if (response.status === 401) {
    await chrome.storage.local.remove(SESSION_KEYS);
    const refreshed = await ensureProvisioned(true).catch(() => false);
    if (refreshed) {
      auth = await chrome.storage.local.get(SESSION_KEYS);
      headers.set('Authorization', `Bearer ${auth.onoffAuthToken}`);
      response = await nativeFetch(input, { ...init, headers });
    }
  }
  return response;
}

async function ensureProvisioned(force = false) {
  if (refreshPromise) return refreshPromise;
  refreshPromise = provisionOrRefresh(force).finally(() => { refreshPromise = null; });
  return refreshPromise;
}

async function provisionOrRefresh(force) {
  const state = await chrome.storage.local.get([...SESSION_KEYS, ...DEVICE_KEYS]);
  const sessionValidFor = Number(state.onoffAuthExpiresAt || 0) - Date.now();
  if (!force && state.onoffAuthToken && sessionValidFor > 10 * 60 * 1000) return true;

  if (state.onoffDeviceId && state.onoffRefreshToken && Number(state.onoffRefreshExpiresAt || 0) > Date.now()) {
    const refreshed = await refreshDevice(state);
    if (refreshed) return true;
  }

  return activateSilently();
}

async function refreshDevice(state) {
  const backendUrl = await getBackendUrl();
  const response = await nativeFetch(`${backendUrl.origin}/api/auth/refresh-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: state.onoffDeviceId, refreshToken: state.onoffRefreshToken })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok || !data?.token || !data?.refreshToken) {
    if (response.status === 401) await chrome.storage.local.remove([...SESSION_KEYS, 'onoffRefreshToken', 'onoffRefreshExpiresAt']);
    return false;
  }
  await saveDeviceSession(data);
  return true;
}

async function activateSilently() {
  const installToken = String(globalThis.ONOFF_INSTALL_TOKEN || '').trim();
  if (!installToken) return false;
  const deviceId = await ensureDeviceId();
  const backendUrl = await getBackendUrl();
  const response = await nativeFetch(`${backendUrl.origin}/api/auth/activate-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installToken, deviceId })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok || !data?.token || !data?.refreshToken) return false;
  await saveDeviceSession(data);
  return true;
}

async function saveDeviceSession(data) {
  await chrome.storage.local.set({
    onoffAuthToken: data.token,
    onoffAuthExpiresAt: Number(data.expiresAt),
    onoffDeviceId: data.device?.deviceId,
    onoffDeviceName: data.device?.deviceName || 'Equipo ONOFF',
    onoffRefreshToken: data.refreshToken,
    onoffRefreshExpiresAt: Date.parse(data.refreshExpiresAt || '') || 0
  });
}

async function ensureDeviceId() {
  const stored = await chrome.storage.local.get('onoffDeviceId');
  if (stored.onoffDeviceId) return stored.onoffDeviceId;
  const deviceId = crypto.randomUUID();
  await chrome.storage.local.set({ onoffDeviceId: deviceId });
  return deviceId;
}

async function getBackendUrl() {
  const packaged = normalizeBackend(globalThis.ONOFF_BACKEND_URL || '');
  if (packaged) return packaged;

  const settings = await chrome.storage.sync.get(['backendUrl']);
  const configured = normalizeBackend(settings.backendUrl || 'https://asistente-onoff.vercel.app');
  if (!configured) throw new Error('Backend no autorizado.');
  return configured;
}
function isPublicAuthEndpoint(pathname) {
  return pathname === '/api/auth/activate-device' || pathname === '/api/auth/refresh-device';
}
function resolveUrl(input) { try { return new URL(typeof input === 'string' ? input : input.url); } catch { return null; } }
function normalizeBackend(value) {
  try {
    const url = new URL(String(value || '').trim());
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (local) return url.protocol === 'http:' ? new URL(url.origin) : null;
    if (url.protocol !== 'https:') return null;
    if (url.origin === 'https://asistente-onoff.vercel.app') return new URL(url.origin);
    const isVercelPreview = url.hostname.endsWith('.vercel.app') && /^asistente-onoff[-.]/i.test(url.hostname);
    return isVercelPreview ? new URL(url.origin) : null;
  } catch { return null; }
}
