const nativeFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = async (input, init = {}) => {
  const url = resolveUrl(input);
  if (!url || !url.pathname.startsWith('/api/') || url.pathname === '/api/auth/login') return nativeFetch(input, init);

  const settings = await chrome.storage.sync.get(['backendUrl']);
  const backendUrl = normalizeBackend(settings.backendUrl || 'https://asistente-onoff.vercel.app');
  if (!backendUrl || url.origin !== backendUrl.origin) return nativeFetch(input, init);

  const auth = await chrome.storage.local.get(['onoffAuthToken', 'onoffAuthExpiresAt']);
  const expiresAt = Number(auth.onoffAuthExpiresAt || 0);
  if (!auth.onoffAuthToken || !expiresAt || expiresAt <= Date.now()) {
    await chrome.storage.local.remove(['onoffAuthToken', 'onoffAuthExpiresAt', 'onoffAuthUser']);
    throw new Error('La sesión del Asistente ONOFF está vencida. Inicie sesión desde Opciones.');
  }

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
  headers.set('Authorization', `Bearer ${auth.onoffAuthToken}`);
  const response = await nativeFetch(input, { ...init, headers });
  if (response.status === 401) await chrome.storage.local.remove(['onoffAuthToken', 'onoffAuthExpiresAt', 'onoffAuthUser']);
  return response;
};

function resolveUrl(input) {
  try { return new URL(typeof input === 'string' ? input : input.url); } catch { return null; }
}
function normalizeBackend(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) return null;
    return url;
  } catch { return null; }
}
