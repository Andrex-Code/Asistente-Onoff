import { readSgcCustomer } from './sgc-reader.mjs';

const SGC_MESSAGE = 'ONOFF_SEARCH_SGC';
const SGC_CALLER_ORIGINS = new Set(['https://sgc.yadinero.co', 'https://onoff.a.ikono.im']);
let sgcPending = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== SGC_MESSAGE) return false;
  if (sender.id !== chrome.runtime.id || !Number.isInteger(sender.tab?.id) || sender.frameId !== 0) {
    sendResponse({ ok: false, code: 'SGC_UNAUTHORIZED', error: 'Solicitud no autorizada.' });
    return false;
  }
  // Results rendered in a content-script panel can be read by its host page.
  // Do not expose credit information on arbitrary sites covered by <all_urls>.
  let callerOrigin;
  try { callerOrigin = new URL(sender.url).origin; } catch { /* Fail closed. */ }
  if (!SGC_CALLER_ORIGINS.has(callerOrigin)) {
    sendResponse({ ok: false, code: 'SGC_UNTRUSTED_PAGE', error: 'La búsqueda de SGC está disponible desde iKono ONOFF y SGC. Abre una de esas páginas para consultar.' });
    return false;
  }
  searchSgc(message.identification, sender.tab).then(sendResponse).catch(() => {
    sendResponse({ ok: false, code: 'SGC_CONNECTION', error: 'No fue posible consultar SGC. Verifica la pestaña y tu sesión.' });
  });
  return true;
});

async function searchSgc(value, senderTab) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (raw.length > 40 || !/^(?:(?:CC|CE|TI)\s*[-.:]?\s*)?\d[\d.\s-]*\d$/i.test(raw)) {
    return { ok: false, code: 'SGC_INVALID_IDENTIFICATION', error: 'Ingresa una cédula válida, de 5 a 15 dígitos.' };
  }
  const identification = raw.replace(/^(?:CC|CE|TI)/i, '').replace(/\D/g, '');
  if (!/^\d{5,15}$/.test(identification)) return { ok: false, code: 'SGC_INVALID_IDENTIFICATION', error: 'Ingresa una cédula válida, de 5 a 15 dígitos.' };
  // One lookup at a time across extension tabs; no persistent cache of client data.
  if (sgcPending) return { ok: false, code: 'SGC_BUSY', error: 'Ya hay una consulta de SGC en curso. Espera unos segundos.' };
  sgcPending = true;
  try {
    const tabs = (await chrome.tabs.query({ url: 'https://sgc.yadinero.co/*' }))
      .filter(tab => Number.isInteger(tab.id) && !tab.discarded && Boolean(tab.incognito) === Boolean(senderTab.incognito) && /^https:\/\/sgc\.yadinero\.co\//.test(tab.url || '') && !/\/(?:login|logout|register)(?:[/?#]|$)/.test(tab.url))
      .sort((a, b) => Number(b.windowId === senderTab.windowId) - Number(a.windowId === senderTab.windowId) || Number(b.active) - Number(a.active) || (b.lastAccessed || 0) - (a.lastAccessed || 0));
    if (!tabs.length) return { ok: false, code: 'SGC_SESSION_REQUIRED', error: 'Abre SGC e inicia sesión en este navegador. Después vuelve a buscar.' };
    const frames = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id, frameIds: [0] }, world: 'ISOLATED', func: readSgcCustomer, args: [identification]
    });
    const data = frames.find(frame => frame.frameId === 0)?.result;
    return data && typeof data.ok === 'boolean' ? data : { ok: false, code: 'SGC_TAB_CLOSED', error: 'La pestaña de SGC cambió o se cerró. Ábrela y vuelve a consultar.' };
  } finally { sgcPending = null; }
}
