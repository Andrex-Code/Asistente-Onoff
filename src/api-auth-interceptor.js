(() => {
  const nativeFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input, init = {}) => {
    const url = resolveUrl(input);
    if (!url || !url.pathname.startsWith('/api/') || url.pathname === '/api/auth/login') return nativeFetch(input, init);

    const settings = await chrome.storage.sync.get(['backendUrl']);
    const backendUrl = normalizeBackend(settings.backendUrl || 'https://asistente-onoff.vercel.app');
    if (!backendUrl || url.origin !== backendUrl.origin) return nativeFetch(input, init);

    const requestHeaders = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    requestHeaders.delete('Authorization');
    const response = await chrome.runtime.sendMessage({
      type: 'ONOFF_SECURE_API_FETCH',
      url: url.toString(),
      method: String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase(),
      headers: Object.fromEntries(requestHeaders.entries()),
      body: typeof init.body === 'string' ? init.body : null
    });

    if (!response?.okTransport) throw new Error(response?.error || 'No fue posible conectar con el backend seguro.');
    return new Response(response.body || '', {
      status: response.status,
      statusText: response.statusText || '',
      headers: response.headers || { 'Content-Type': 'application/json' }
    });
  };

  function resolveUrl(input) {
    try { return new URL(typeof input === 'string' ? input : input.url, location.href); } catch { return null; }
  }
  function normalizeBackend(value) {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) return null;
      return url;
    } catch { return null; }
  }
})();
