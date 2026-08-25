const nativeFetch = globalThis.fetch.bind(globalThis);
const AUTH_KEYS = ['onoffAuthToken', 'onoffAuthExpiresAt', 'onoffAuthUser'];

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ONOFF_SECURE_API_FETCH') return false;
  secureApiFetch(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ okTransport: false, error: error.message || 'Error de conexión segura.' }));
  return true;
});

globalThis.fetch = async (input, init = {}) => {
  const url = resolveUrl(input);
  if (!url || !url.pathname.startsWith('/api/') || url.pathname === '/api/auth/login') return nativeFetch(input, init);
  return authenticatedFetch(url.toString(), init);
};

async function secureApiFetch(message) {
  const url = resolveUrl(message.url);
  if (!url) throw new Error('URL de backend inválida.');
  const backendUrl = await getBackendUrl();
  if (url.origin !== backendUrl.origin || !url.pathname.startsWith('/api/') || url.pathname === '/api/auth/login') {
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

  const auth = await chrome.storage.local.get(AUTH_KEYS);
  const expiresAt = Number(auth.onoffAuthExpiresAt || 0);
  if (!auth.onoffAuthToken || !expiresAt || expiresAt <= Date.now()) {
    await chrome.storage.local.remove(AUTH_KEYS);
    throw new Error('La sesión del Asistente ONOFF está vencida. Inicie sesión desde Opciones.');
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', `Bearer ${auth.onoffAuthToken}`);
  const response = await nativeFetch(input, { ...init, headers });
  if (response.status === 401) await chrome.storage.local.remove(AUTH_KEYS);
  return response;
}

async function getBackendUrl() {
  const settings = await chrome.storage.sync.get(['backendUrl']);
  const backendUrl = normalizeBackend(settings.backendUrl || 'https://asistente-onoff.vercel.app');
  if (!backendUrl) throw new Error('Backend no autorizado.');
  return backendUrl;
}
function resolveUrl(input) { try { return new URL(typeof input === 'string' ? input : input.url); } catch { return null; } }
function normalizeBackend(value) {
  try {
    const url = new URL(String(value || '').trim());
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null;
    if (!local && url.origin !== 'https://asistente-onoff.vercel.app') return null;
    return url;
  } catch { return null; }
}
