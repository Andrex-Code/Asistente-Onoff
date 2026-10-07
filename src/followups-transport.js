// A fixed, read-only transport for Seguimientos. No caller-supplied URLs.
const FOLLOWUPS_MESSAGE = 'ONOFF_FOLLOWUPS_REQUEST';
const followupsCache = new Map();
const followupsPending = new Map();
const followupsTtls = { search: 300000, sac: 600000, tasks: 45000, counts: 45000 };
let followupsGeneration = 0;

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.backendUrl) {
    followupsGeneration += 1;
    followupsCache.clear();
    followupsPending.clear();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== FOLLOWUPS_MESSAGE) return false;
  if (sender.id !== chrome.runtime.id) {
    sendResponse({ ok: false, error: 'Solicitud no autorizada.' });
    return false;
  }
  requestFollowups(message.payload).then(sendResponse).catch(error => {
    sendResponse({ ok: false, code: 'EXTENSION_NETWORK', error: error.message || 'No fue posible consultar Seguimientos.' });
  });
  return true;
});

async function requestFollowups(input) {
  if (!input || !Object.hasOwn(followupsTtls, input.action)) throw new Error('Acci\u00f3n de consulta no permitida.');
  const settings = await chrome.storage.sync.get('backendUrl');
  const url = new URL(String(settings.backendUrl || 'https://asistente-onoff.vercel.app').trim());
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, '')) {
    throw new Error('Revise la URL del backend: debe ser la direcci\u00f3n base, sin rutas ni claves.');
  }
  const payload = { mode: 'owner', action: input.action, force: input.force === true };
  if (input.action === 'search') payload.name = String(input.name || '').trim().slice(0, 81);
  if (input.action === 'tasks') payload.ownerIds = [...new Set((input.ownerIds || []).map(String))].sort();
  if (input.action === 'counts') payload.groups = (input.groups || []).map(g => ({ id: String(g.id || ''), ownerIds: [...new Set((g.ownerIds || [g.id]).map(String))].sort() }));
  if (JSON.stringify(payload).length > 16384) throw new Error('La consulta es demasiado grande.');
  const keyPayload = { ...payload };
  delete keyPayload.force;
  const key = url.origin + ':' + JSON.stringify(keyPayload);
  const ttl = followupsTtls[input.action];
  const hit = followupsCache.get(key);
  if (!payload.force && hit && Date.now() - hit.at < ttl) return { ...hit.data, clientCache: true };
  if (followupsPending.has(key)) return followupsPending.get(key);
  const generation = followupsGeneration;
  const promise = (async () => {
    let response;
    try {
      response = await fetch(url.origin + '/api/bitrix/search-client-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(55000)
      });
    } catch (error) {
      if (/Timeout|Abort/i.test(error.name)) throw new Error('La consulta tard\u00f3 demasiado. Pulse Actualizar para intentar nuevamente.');
      throw new Error('No fue posible conectar con el backend. Revise la conexi\u00f3n y la URL configurada.');
    }
    const data = await response.json().catch(() => null);
    if (!data || !response.ok || !data.ok) {
      if (data?.error) return data;
      if (response.status === 401 || response.status === 403) throw new Error('El Preview requiere autorizaci\u00f3n de Vercel. Revise el acceso al backend de pruebas.');
      throw new Error(`El backend respondi\u00f3 ${response.status}. No se complet\u00f3 la consulta.`);
    }
    const partialCounts = payload.action === 'counts' && data.users?.some(u => u.openTaskCount == null);
    if (generation === followupsGeneration && !partialCounts) {
      if (followupsCache.size >= 40) followupsCache.delete(followupsCache.keys().next().value);
      const refreshed = data.updatedAt || (payload.action === 'counts' ? data.users?.map(u => u.updatedAt).filter(Boolean).sort()[0] : null);
      const sourceTime = refreshed ? Date.parse(refreshed) : NaN;
      followupsCache.set(key, { at: Number.isFinite(sourceTime) ? Math.min(sourceTime, Date.now()) : Date.now(), data });
    }
    return { ...data, clientCache: false };
  })().finally(() => { if (generation === followupsGeneration) followupsPending.delete(key); });
  followupsPending.set(key, promise);
  return promise;
}
