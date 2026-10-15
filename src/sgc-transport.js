import { readSgcCustomer } from './sgc-reader.mjs';

// Keep customer information in extension-only, non-persistent session storage.
// Unlike chrome.storage.local/sync, this is cleared when the browser closes.
const SGC_MESSAGE = 'ONOFF_SEARCH_SGC';
const SGC_CLEAR_MESSAGE = 'ONOFF_SGC_FORGET';
const SGC_CALLER_ORIGINS = new Set(['https://sgc.yadinero.co', 'https://onoff.a.ikono.im']);
const CACHE_STORAGE_KEY = 'onoffSgcCustomerCacheV1';
const CACHE_TTL_MS = 3 * 60 * 1000;
const CACHE_LIMIT = 8;
let sgcPending = null;
let cacheGeneration = 0;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== SGC_MESSAGE && message?.type !== SGC_CLEAR_MESSAGE) return false;
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
  searchSgc(identification, sender.tab, message.force === true).then(sendResponse).catch(() => {
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

async function saveEntries(entries) {
  try { await chrome.storage.session.set({ [CACHE_STORAGE_KEY]: entries.slice(-CACHE_LIMIT) }); }
  catch { /* Older browsers or storage failures must not block live SGC queries. */ }
}

async function forgetCustomer(identification, incognito) {
  cacheGeneration++;
  const entries = await sessionEntries();
  await saveEntries(entries.filter(entry => entry.identification !== identification || entry.incognito !== incognito));
}

async function forgetTab(tabId) {
  cacheGeneration++;
  const entries = await sessionEntries();
  await saveEntries(entries.filter(entry => entry.tabId !== tabId));
}

async function forgetAll() {
  cacheGeneration++;
  try { await chrome.storage.session.remove(CACHE_STORAGE_KEY); } catch { /* Best effort. */ }
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

async function searchSgc(identification, senderTab, force) {
  const pendingKey = [senderTab.windowId, Boolean(senderTab.incognito), identification].join(':');
  if (sgcPending) {
    if (!force && sgcPending.key === pendingKey) return sgcPending.promise;
    return { ok: false, code: 'SGC_BUSY', error: 'Ya hay una consulta de SGC en curso. Espera unos segundos.' };
  }
  const promise = performSearch(identification, senderTab, force);
  sgcPending = { key: pendingKey, promise };
  try { return await promise; }
  finally { if (sgcPending?.promise === promise) sgcPending = null; }
}

async function performSearch(identification, senderTab, force) {
  const tabs = (await chrome.tabs.query({ url: 'https://sgc.yadinero.co/*' }))
    .filter(tab => Number.isInteger(tab.id) && !tab.discarded && Boolean(tab.incognito) === Boolean(senderTab.incognito) && /^https:\/\/sgc\.yadinero\.co\//.test(tab.url || '') && !/\/(?:login|logout|register)(?:[/?#]|$)/.test(tab.url))
    .sort((a, b) => Number(b.windowId === senderTab.windowId) - Number(a.windowId === senderTab.windowId) || Number(b.active) - Number(a.active) || (b.lastAccessed || 0) - (a.lastAccessed || 0));
  if (!tabs.length) return { ok: false, code: 'SGC_SESSION_REQUIRED', error: 'Abre SGC e inicia sesión en este navegador. Después vuelve a buscar.' };
  const tab = tabs[0];
  const account = await activeSgcAccount(tab.id);
  if (account && !force) {
    const entries = await sessionEntries();
    const hit = entries.find(entry => entry.tabId === tab.id && entry.incognito === Boolean(senderTab.incognito) && entry.account === account && entry.identification === identification);
    if (hit) return { ...hit.data, clientCache: true, cacheTtlSeconds: Math.round(CACHE_TTL_MS / 1000) };
  }
  const generation = cacheGeneration;
  const frames = await chrome.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [0] }, world: 'ISOLATED', func: readSgcCustomer, args: [identification]
  });
  const data = frames.find(frame => frame.frameId === 0)?.result;
  if (!data || typeof data.ok !== 'boolean') {
    return { ok: false, code: 'SGC_TAB_CLOSED', error: 'La pestaña de SGC cambió o se cerró. Ábrela y vuelve a consultar.' };
  }
  if (data.code === 'SGC_SESSION_REQUIRED') { await forgetAll(); return data; }
  // Never cache missing customers, partial results, errors or account-unverified data.
  if (account && data.ok && data.customer && !data.warning && generation === cacheGeneration) {
    const entries = await sessionEntries();
    const filtered = entries.filter(entry => !(entry.tabId === tab.id && entry.incognito === Boolean(senderTab.incognito) && entry.account === account && entry.identification === identification));
    filtered.push({ tabId: tab.id, incognito: Boolean(senderTab.incognito), account, identification, at: Date.now(), data });
    await saveEntries(filtered);
  }
  return { ...data, clientCache: false };
}
