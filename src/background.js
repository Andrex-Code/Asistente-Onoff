const DEFAULTS = {
  backendUrl: 'https://traductor-try-controller.vercel.app'
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'translate', title: 'Traducir PT-BR → Español', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'falar', title: 'Falar Español → PT-BR', contexts: ['selection', 'editable'] });
    chrome.contextMenus.create({ id: 'improve', title: 'Mejorar texto seleccionado', contexts: ['selection', 'editable'] });
  });
  chrome.storage.sync.get(Object.keys(DEFAULTS), (settings) => chrome.storage.sync.set({ ...DEFAULTS, ...settings }));
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.selectionText) return;
  const type = info.menuItemId === 'translate' ? 'IKONO_TRANSLATE_SELECTION' : info.menuItemId === 'falar' ? 'IKONO_FALAR_SELECTION' : 'IKONO_IMPROVE_SELECTION';
  chrome.tabs.sendMessage(tab.id, { type, text: info.selectionText });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'IKONO_TRANSLATE') {
    callBackend('/api/translate', { text: message.text, direction: message.direction })
      .then((data) => sendResponse({ ok: true, translatedText: data.translatedText }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'IKONO_IMPROVE') {
    callBackend('/api/improve-text', { text: message.text })
      .then((data) => sendResponse({ ok: true, improvedText: data.improvedText }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  if (message?.type === 'IKONO_TRANSCRIBE_AUDIO') {
    callBackend('/api/transcribe', message.payload)
      .then((data) => sendResponse({ ok: true, ...data }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});

async function callBackend(path, body) {
  const settings = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const base = String(settings.backendUrl || DEFAULTS.backendUrl).replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Backend respondió ${response.status}.`);
  return data;
}
