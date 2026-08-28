const nativeFetch = globalThis.fetch.bind(globalThis);
const SESSION_KEYS = ['onoffAuthToken', 'onoffAuthExpiresAt'];
const DEVICE_KEYS = ['onoffDeviceId', 'onoffDeviceName', 'onoffRefreshToken', 'onoffRefreshExpiresAt'];
let refreshPromise = null;

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDeviceId();
  const ok = await ensureProvisioned().catch(() => false);
  await saveProvisioningStatus(ok ? 'authorized' : 'pending');
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDeviceId();
  const ok = await ensureProvisioned().catch(() => false);
  await saveProvisioningStatus(ok ? 'authorized' : 'pending');
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
  const requestedUrl = resolveUrl(message.url);
  if (!requestedUrl || !requestedUrl.pathname.startsWith('/api/') || isPublicAuthEndpoint(requestedUrl.pathname)) {
    throw new Error('Destino de API no autorizado.');
  }
  if (!['POST', 'GET', 'PUT', 'DELETE'].includes(message.method)) throw new Error('Método no autorizado.');

  const backendUrl = await getBackendUrl();
  const targetUrl = new URL(`${requestedUrl.pathname}${requestedUrl.search}`, backendUrl.origin);
  const headers = new Headers(message.headers || {});
  headers.delete('Authorization');
  const response = await authenticatedFetch(targetUrl.toString(), {
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
  const requestedUrl = resolveUrl(input);
  const backendUrl = await getBackendUrl();
  if (!requestedUrl || !requestedUrl.pathname.startsWith('/api/')) return nativeFetch(input, init);

  const targetUrl = new URL(`${requestedUrl.pathname}${requestedUrl.search}`, backendUrl.origin);
  const provisioned = await ensureProvisioned();
  if (!provisioned) {
    await saveProvisioningStatus('pending');
    throw new Error('Asistente ONOFF no pudo autorizar esta instalación. Solicite reinstalar el paquete actualizado.');
  }

  let auth = await chrome.storage.local.get(SESSION_KEYS);
  if (!auth.onoffAuthToken || Number(auth.onoffAuthExpiresAt || 0) <= Date.now()) {
    await saveProvisioningStatus('pending');
    throw new Error('Asistente ONOFF no pudo autorizar esta instalación. Solicite reinstalar el paquete actualizado.');
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', `Bearer ${auth.onoffAuthToken}`);
  let response = await nativeFetch(targetUrl.toString(), { ...init, headers });

  if (response.status === 401) {
    await chrome.storage.local.remove(SESSION_KEYS);
    const refreshed = await ensureProvisioned(true).catch(() => false);
    if (refreshed) {
      auth = await chrome.storage.local.get(SESSION_KEYS);
      headers.set('Authorization', `Bearer ${auth.onoffAuthToken}`);
      response = await nativeFetch(targetUrl.toString(), { ...init, headers });
    }
  }
  if (response.ok) await saveProvisioningStatus('authorized');
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
    await saveProvisioningStatus(`refresh-${response.status || 'failed'}`);
    return false;
  }
  await saveDeviceSession(data);
  return true;
}

async function activateSilently() {
  const installToken = String(globalThis.ONOFF_INSTALL_TOKEN || '').trim();
  if (!installToken) {
    await saveProvisioningStatus('missing-install-token');
    return false;
  }
  const deviceId = await ensureDeviceId();
  const backendUrl = await getBackendUrl();
  let response;
  try {
    response = await nativeFetch(`${backendUrl.origin}/api/auth/activate-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ installToken, deviceId })
    });
  } catch (error) {
    console.warn('[onoff-provisioning] activation network error', String(error?.message || error).slice(0, 160));
    await saveProvisioningStatus('activation-network-error');
    return false;
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok || !data?.token || !data?.refreshToken) {
    console.warn('[onoff-provisioning] activation failed', response.status);
    await saveProvisioningStatus(`activation-${response.status || 'failed'}`);
    return false;
  }
  await saveDeviceSession(data);
  await saveProvisioningStatus('authorized');
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

async function saveProvisioningStatus(status) {
  await chrome.storage.local.set({ onoffProvisioningStatus: String(status || 'unknown'), onoffProvisioningCheckedAt: Date.now() });
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
