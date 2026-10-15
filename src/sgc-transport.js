import { readSgcCustomer } from './sgc-reader.mjs';

// Keep customer information in extension-only, non-persistent session storage.
// Unlike chrome.storage.local/sync, this is cleared when the browser closes.
const SGC_MESSAGE = 'ONOFF_SEARCH_SGC';
const SGC_CLEAR_MESSAGE = 'ONOFF_SGC_FORGET';
const SGC_DETAILS_MESSAGE = 'ONOFF_SGC_DETAILS';
const SGC_CALLER_ORIGINS = new Set(['https://sgc.yadinero.co', 'https://onoff.a.ikono.im']);
const CACHE_STORAGE_KEY = 'onoffSgcCustomerCacheV1';
const HINT_STORAGE_KEY = 'onoffSgcVerifiedRoutesV1';
const HINT_TTL_MS = 30 * 60 * 1000;
const CACHE_TTL_MS = 3 * 60 * 1000;
const CACHE_LIMIT = 8;
let sgcPending = null;
let cacheGeneration = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (![SGC_MESSAGE, SGC_CLEAR_MESSAGE, SGC_DETAILS_MESSAGE].includes(message?.type)) return false;
  if (sender.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.id) || sender.frameId !== 0) {
    sendResponse({ ok: false, code: 'SGC_UNAUTHORIZED', error: 'Solicitud no autorizada.' });
    return false;
  }
  let callerOrigin;
  try { callerOrigin = new URL(sender.url).origin; } catch { /* Fail closed. */ }
  if (!SGC_CALLER_ORIGINS.has(callerOrigin)) {
    sendResponse({ ok: false, code: 'SGC_UNTRUSTED_PAGE', error: 'La búsqueda de SGC está disponible desde iKono ONOFF y SGC. Abre una de esas páginas para consultar.' });
    return false;
  }
  const identification = normalizeIdentification(message.identification);
  if (!identification) {
    sendResponse({ ok: false, code: 'SGC_INVALID_IDENTIFICATION', error: 'Ingresa una cédula válida, de 5 a 15 dígitos.' });
    return false;
  }
  if (message.type === SGC_CLEAR_MESSAGE) {
    forgetCustomer(identification, Boolean(sender.tab.incognito)).then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false, error: 'No se pudo borrar el resultado guardado.' }));
    return true;
  }
  searchSgc(identification, sender.tab, message.force === true, message.type === SGC_DETAILS_MESSAGE).then(sendResponse).catch(() => {
    sendResponse({ ok: false, code: 'SGC_CONNECTION', error: 'No fue posible consultar SGC. Verifica la pestaña y tu sesión.' });
  });
  return true;
});

function normalizeIdentification(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (raw.length > 40 || !/^(?:(?:CC|CE|TI)\s*[-.:]?\s*)?\d[\d.\s-]*\d$/i.test(raw)) return '';
  const identification = raw.replace(/^(?:CC|CE|TI)/i, '').replace(/\D/g, '');
  return /^\d{5,15}$/.test(identification) ? identification : '';
}

async function sessionEntries() {
  try {
    const value = (await chrome.storage.session.get(CACHE_STORAGE_KEY))[CACHE_STORAGE_KEY];
    const now = Date.now();
    return Array.isArray(value) ? value.filter(entry =>
      entry && typeof entry.at === 'number' && now - entry.at >= 0 &&
      now - entry.at < CACHE_TTL_MS && entry.data?.ok && entry.data.customer && !entry.data.warning
    ).slice(-CACHE_LIMIT) : [];
  } catch { return []; }
}

async function routeHints() {
  try {
    const value = (await chrome.storage.session.get(HINT_STORAGE_KEY))[HINT_STORAGE_KEY];
    const now = Date.now();
    return Array.isArray(value) ? value.filter(h => h &&
      Number.isInteger(h.tabId) && typeof h.identification === 'string' &&
      typeof h.at === 'number' && now - h.at >= 0 && now - h.at < HINT_TTL_MS &&
      typeof h.path === 'string' && /^\/customers\/show\/\d+$/.test(h.path)
    ).slice(-CACHE_LIMIT) : [];
  } catch { return []; }
}

async function saveHints(hints) {
  try { await chrome.storage.session.set({ [HINT_STORAGE_KEY]: hints.slice(-CACHE_LIMIT) }); }
  catch { /* Fallback is the full server lookup. */ }
}

async function saveEntries(entries) {
  try { await chrome.storage.session.set({ [CACHE_STORAGE_KEY]: entries.slice(-CACHE_LIMIT) }); }
  catch { /* Older browsers or storage failures must not block live SGC queries. */ }
}

async function forgetCustomer(identification, incognito) {
  cacheGeneration++;
  const entries = await sessionEntries();
  await saveEntries(entries.filter(entry => entry.identification !== identification || entry.incognito !== incognito));
  const hints = await routeHints();
  await saveHints(hints.filter(h => h.identification !== identification || h.incognito !== incognito));
}

async function forgetTab(tabId) {
  cacheGeneration++;
  const entries = await sessionEntries();
  await saveEntries(entries.filter(entry => entry.tabId !== tabId));
  const hints = await routeHints();
  await saveHints(hints.filter(h => h.tabId !== tabId));
}

async function forgetAll() {
  cacheGeneration++;
  try { await chrome.storage.session.remove([CACHE_STORAGE_KEY, HINT_STORAGE_KEY]); } catch { /* Best effort. */ }
}

// Opening a new session, leaving SGC, or closing its tab invalidates prior data.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'loading' && !changeInfo.url) return;
  const url = changeInfo.url || tab?.url || '';
  // Unrelated tabs must not invalidate a SGC lookup in progress.
  if (!url.startsWith('https://sgc.yadinero.co/')) return;
  if (/^https:\/\/sgc\.yadinero\.co\/(?:login|logout)(?:[/?#]|$)/.test(url)) {
    void forgetAll();
  } else {
    void forgetTab(tabId);
  }
});
chrome.tabs.onRemoved.addListener(tabId => { void forgetTab(tabId); });

// Verify the current SGC account before returning a cached credit result.
// Read only a logged-in marker and the account's email, never cookies or tokens.
async function activeSgcAccount(tabId) {
  try {
    const frames = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] }, world: 'ISOLATED',
      func: () => {
        if (location.origin !== 'https://sgc.yadinero.co' ||
            !document.querySelector('#logout-form,form[action$="/logout"]')) return null;
        const email = String(document.querySelector('.site-menubar-info .site-menubar-email')?.textContent || '').trim().toLowerCase();
        return /^[^\s@]+@[^\s@]+$/.test(email) ? email : null;
      }
    });
    const value = frames.find(frame => frame.frameId === 0)?.result;
    return typeof value === 'string' && value.length <= 180 ? value : null;
  } catch { return null; }
}

async function searchSgc(identification, senderTab, force, details) {
  const pendingKey = [senderTab.windowId, Boolean(senderTab.incognito), identification, Boolean(details)].join(':');
  if (sgcPending) {
    if (!force && sgcPending.key === pendingKey) return sgcPending.promise;
    return { ok: false, code: 'SGC_BUSY', error: 'Ya hay una consulta de SGC en curso. Espera unos segundos.' };
  }
  const promise = performSearch(identification, senderTab, force, details);
  sgcPending = { key: pendingKey, promise };
  try { return await promise; }
  finally { if (sgcPending?.promise === promise) sgcPending = null; }
}

async function performSearch(identification, senderTab, force, details) {
  const tabs = (await chrome.tabs.query({ url: 'https://sgc.yadinero.co/*' }))
    .filter(tab => Number.isInteger(tab.id) && !tab.discarded && Boolean(tab.incognito) === Boolean(senderTab.incognito) && /^https:\/\/sgc\.yadinero\.co\//.test(tab.url || '') && !/\/(?:login|logout|register)(?:[/?#]|$)/.test(tab.url))
    .sort((a, b) => Number(b.windowId === senderTab.windowId) - Number(a.windowId === senderTab.windowId) || Number(b.active) - Number(a.active) || (b.lastAccessed || 0) - (a.lastAccessed || 0));
  if (!tabs.length) return { ok: false, code: 'SGC_SESSION_REQUIRED', error: 'Abre SGC e inicia sesión en este navegador. Después vuelve a buscar.' };
  const tab = tabs[0];
  const account = await activeSgcAccount(tab.id);
  const matching = entry => entry.tabId === tab.id &&
    entry.incognito === Boolean(senderTab.incognito) &&
    entry.account === account && entry.identification === identification;
  const previous = account ? (await sessionEntries()).find(matching) : null;
  if (details) {
    if (!account || !previous?.data?.latestRequest || previous.data.warning) {
      return { ok: false, code: 'SGC_SEARCH_REQUIRED', error: 'Primero busque la cédula para verificar la ficha en SGC.' };
    }
    if (previous.data.latestRequest.detailsAvailable) {
      return { ...previous.data, clientCache: true };
    }
    const customerId = String(previous.data.customer?.id || '');
    const requestId = String(previous.data.latestRequest.id || '');
    if (!/^\d+$/.test(customerId) || !/^\d+$/.test(requestId)) {
      return { ok: false, code: 'SGC_ROUTE', error: 'No hay una solicitud verificada para ampliar.' };
    }
    const generation = cacheGeneration;
    const frames = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] }, world: 'ISOLATED',
      func: readSgcCustomer, args: [identification, {
        mode: 'details', customerPath: '/customers/show/' + customerId,
        requestPath: '/requests/edit/' + requestId
      }]
    });
    const detail = frames.find(frame => frame.frameId === 0)?.result;
    if (!detail || typeof detail.ok !== 'boolean') {
      return { ok: false, code: 'SGC_TAB_CLOSED', error: 'La pestaña de SGC cambió. Intente nuevamente.' };
    }
    if (!detail.ok) {
      if (detail.code === 'SGC_CUSTOMER_MISMATCH' || detail.code === 'SGC_SESSION_REQUIRED') {
        await forgetCustomer(identification, Boolean(senderTab.incognito));
      }
      return detail;
    }
    if (detail.request?.id !== requestId || generation !== cacheGeneration) {
      return { ok: false, code: 'SGC_STALE_SESSION', error: 'La sesión cambió durante la consulta. Vuelva a buscar.' };
    }
    const base = previous.data.latestRequest;
    const request = {
      ...base,
      status: detail.request.status || base.status,
      typification: detail.request.typification || base.typification,
      amount: detail.request.amount || base.amount,
      totalToPay: detail.request.totalToPay,
      createdAt: detail.request.createdAt || base.createdAt,
      deadline: detail.request.deadline, days: detail.request.days || base.days,
      history: detail.request.history || [], detailsAvailable: true
    };
    const merged = {
      ...previous.data, latestRequest: request, detailCheckedAt: detail.checkedAt,
      timing: detail.timing, clientCache: false
    };
    const entries = (await sessionEntries()).filter(entry => !matching(entry));
    entries.push({ ...previous, at: Date.now(), data: merged });
    if (generation === cacheGeneration) await saveEntries(entries);
    return merged;
  }
  if (previous && !force) return { ...previous.data, clientCache: true, cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000) };
  const generation = cacheGeneration;
  const hint = account && !force
    ? (await routeHints()).find(h => matching(h)) : null;
  const options = hint ? { hint: { path: hint.path, name: hint.name } } : {};
  const frames = await chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [0] }, world: 'ISOLATED',
    func: readSgcCustomer, args: [identification, options]
  });
  const data = frames.find(frame => frame.frameId === 0)?.result;
  if (!data || typeof data.ok !== 'boolean') {
    return { ok: false, code: 'SGC_TAB_CLOSED', error: 'La pestaña de SGC cambió o se cerró. Ábrela y vuelve a consultar.' };
  }
  if ((hint && !data.ok) || data.code === 'SGC_SESSION_REQUIRED' || data.code === 'SGC_CUSTOMER_MISMATCH') {
    await forgetCustomer(identification, Boolean(senderTab.incognito));
    return data;
  }
  // Only verified and fully loaded customer fichas may be cached. Request detail
  // remains deliberately deferred and is never presented as up-to-date.
  if (account && data.ok && data.customer && !data.warning && data.creditsAvailable &&
      generation === cacheGeneration) {
    const entries = (await sessionEntries()).filter(entry => !matching(entry));
    entries.push({ tabId: tab.id, incognito: Boolean(senderTab.incognito), account, identification, at: Date.now(), data });
    await saveEntries(entries);
    if (!data.fastPath) {
      const customerPath = '/customers/show/' + data.customer.id;
      if (/^\/customers\/show\/\d+$/.test(customerPath)) {
        const hints = (await routeHints()).filter(entry => !matching(entry));
        hints.push({ tabId: tab.id, incognito: Boolean(senderTab.incognito), account,
          identification, path: customerPath, name: data.customer.name, at: Date.now() });
        if (generation === cacheGeneration) await saveHints(hints);
      }
    }
  }
  return { ...data, clientCache: false };
}
