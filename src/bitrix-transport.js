// Read-only Bitrix requests run in the extension origin, not the host page.
const BITRIX_ROUTES = Object.freeze({
  tc: ['search-deal', 'tc'],
  identification: ['search-company', 'identification'],
  task: ['search-task', 'taskId'],
  tasks: ['search-client-tasks', 'tc']
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ONOFF_BITRIX_REQUEST') return false;
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, code: 'UNAUTHORIZED', error: 'Solicitud no autorizada.' });
    return false;
  }
  requestBitrix(message.action, message.value).then(sendResponse).catch(error => {
    sendResponse({ ok: false, code: error.code || 'EXTENSION_ERROR', error: error.message });
  });
  return true;
});

function bitrixFailure(code, message) {
  return Object.assign(new Error(message), { code });
}

async function requestBitrix(action, value) {
  if (!Object.hasOwn(BITRIX_ROUTES, action)) throw bitrixFailure('INVALID_INPUT', 'Tipo de búsqueda no permitido.');
  const text = String(value || '').trim();
  const valid = action === 'identification' ? /^\d{5,20}$/.test(text)
    : action === 'task' ? /^\d{1,20}$/.test(text) : /^\d{1,20}(?:-[A-Z])?$/i.test(text);
  if (!valid) throw bitrixFailure('INVALID_INPUT', 'Ingrese un valor válido para la búsqueda seleccionada.');

  const settings = await chrome.storage.sync.get('backendUrl');
  let url;
  try {
    url = new URL(String(settings.backendUrl || 'https://asistente-onoff.vercel.app').trim());
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) ||
        url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
  } catch {
    throw bitrixFailure('BACKEND_URL', 'Revise la URL del backend en Opciones: use la dirección base HTTPS, sin rutas ni claves.');
  }
  if (!await chrome.permissions.contains({ origins: [url.origin + '/*'] })) {
    throw bitrixFailure('HOST_PERMISSION', `La extensión no tiene permiso para acceder a ${url.origin}. Revise el acceso a sitios en la configuración de la extensión.`);
  }

  const [endpoint, field] = BITRIX_ROUTES[action];
  let response, data;
  try {
    response = await fetch(`${url.origin}/api/bitrix/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: text }), signal: AbortSignal.timeout(55000),
      credentials: 'omit', redirect: 'error'
    });
    data = await response.json().catch(() => null);
  } catch (error) {
    if (/Timeout|Abort/i.test(error.name)) throw bitrixFailure('TIMEOUT', 'Bitrix tardó demasiado en responder. Intente nuevamente.');
    throw bitrixFailure('BACKEND_NETWORK', `No fue posible conectar con ${url.origin}. Revise la conexión, la URL y la disponibilidad del backend.`);
  }
  if (response.status === 401 || response.status === 403) {
    throw bitrixFailure('BACKEND_ACCESS', `El backend rechazó el acceso (HTTP ${response.status}). Revise la autorización del servidor o del Preview.`);
  }
  if (!response.ok) {
    throw bitrixFailure('BACKEND_HTTP', `El backend respondió HTTP ${response.status}. ${data?.error || 'No se completó la consulta de Bitrix.'}`);
  }
  if (!data || typeof data.ok !== 'boolean') throw bitrixFailure('BACKEND_RESPONSE', 'El backend no devolvió una respuesta válida de Bitrix. Revise la URL y el endpoint configurados.');
  if (!data.ok) throw bitrixFailure('BITRIX_ERROR', data.error || 'Bitrix no pudo completar la consulta.');
  return data;
}
