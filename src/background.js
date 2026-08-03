const DEFAULTS = {
  provider: 'backend-openai',
  backendUrl: 'https://asistente-onoff-andres-projects-bf9797b2.vercel.app',
  libreTranslateUrl: 'http://localhost:5000/translate',
  showCornerButton: true,
  showSelectionButtons: true
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'translate', title: 'Traducir PT-BR → Español', contexts: ['selection'] });
    chrome.contextMenus.create({ id: 'falar', title: 'Falar Español → PT-BR', contexts: ['selection', 'editable'] });
    chrome.contextMenus.create({ id: 'improve', title: 'Mejorar texto seleccionado', contexts: ['selection', 'editable'] });
  });

  chrome.storage.sync.get(Object.keys(DEFAULTS), (settings) => {
    chrome.storage.sync.set({ ...DEFAULTS, ...Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined)) });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id || !info.selectionText) return;
  const type = info.menuItemId === 'translate'
    ? 'IKONO_TRANSLATE_SELECTION'
    : info.menuItemId === 'falar'
      ? 'IKONO_FALAR_SELECTION'
      : 'IKONO_IMPROVE_SELECTION';
  chrome.tabs.sendMessage(tab.id, { type, text: info.selectionText });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'IKONO_TRANSLATE') {
    translate(message.text, message.direction)
      .then((translatedText) => sendResponse({ ok: true, translatedText }))
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
    const payload = message.payload || {
      audioBase64: message.audioBase64,
      fileName: message.fileName,
      mimeType: message.mimeType
    };
    callBackend('/api/transcribe', payload)
      .then((data) => sendResponse({ ok: true, ...data }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function translate(text, direction) {
  const settings = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  const provider = settings.provider || DEFAULTS.provider;

  if (provider === 'backend-openai') {
    const data = await callBackend('/api/translate', { text, direction });
    return data.translatedText;
  }

  if (provider === 'mymemory-free') {
    const langpair = direction === 'pt-es' ? 'pt-BR|es' : 'es|pt-BR';
    const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`);
    const data = await response.json();
    if (!response.ok || !data?.responseData?.translatedText) throw new Error('MyMemory no devolvió traducción.');
    return data.responseData.translatedText;
  }

  if (provider === 'libretranslate-local') {
    const [source, target] = direction === 'pt-es' ? ['pt', 'es'] : ['es', 'pt'];
    const response = await fetch(settings.libreTranslateUrl || DEFAULTS.libreTranslateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source, target, format: 'text' })
    });
    const data = await response.json();
    if (!response.ok) throw new Error('LibreTranslate no respondió.');
    return data.translatedText || data.translation || text;
  }

  return text;
}

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
