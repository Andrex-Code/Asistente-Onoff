let scanBusy = false;
let scanDocumentPromise;
const scanTickets = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!['ONOFF_SCAN_CAPTURE', 'ONOFF_SCAN_READ', 'ONOFF_SCAN_CANCEL'].includes(message?.type)) return false;
  if (sender.id !== chrome.runtime.id || !sender.tab?.id || sender.frameId !== 0 || !/^https?:\/\//.test(sender.url || '')) {
    sendResponse({ ok: false, error: 'Abra una página web y use el botón de captura de ONOFF.' }); return false;
  }
  scanRequest(message, sender).then(sendResponse).catch(error => sendResponse({ ok: false, error: error.message || 'No fue posible capturar la imagen.' }));
  return true;
});

async function scanRequest(message, sender) {
  const tabId = sender.tab.id;
  if (message.type === 'ONOFF_SCAN_CANCEL') { scanTickets.delete(tabId); return { ok: true }; }
  if (message.type === 'ONOFF_SCAN_CAPTURE') {
    const [active] = await chrome.tabs.query({ active: true, windowId: sender.tab.windowId });
    if (active?.id !== tabId) throw new Error('Mantenga activa la pestaña de la imagen e intente de nuevo.');
    const image = await chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' });
    const [after] = await chrome.tabs.query({ active: true, windowId: sender.tab.windowId });
    if (after?.id !== tabId) throw new Error('La pestaña cambió durante la captura. Intente de nuevo.');
    for (const [id, expiry] of scanTickets) if (expiry < Date.now()) scanTickets.delete(id);
    scanTickets.set(tabId, Date.now() + 120000);
    return { ok: true, image };
  }
  if ((scanTickets.get(tabId) || 0) < Date.now()) throw new Error('La captura venció. Seleccione el área nuevamente.');
  if (scanBusy) throw new Error('Hay otra lectura en curso. Espere a que termine.');
  if (typeof message.image !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(message.image) || message.image.length > 12000000) throw new Error('Seleccione un área más pequeña de la imagen.');
  scanTickets.delete(tabId);
  scanBusy = true;
  let timer;
  try {
    if (!scanDocumentPromise) scanDocumentPromise = (async () => {
      const existing = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [chrome.runtime.getURL('src/scan-offscreen.html')] });
      if (!existing.length) await chrome.offscreen.createDocument({ url: 'src/scan-offscreen.html', reasons: ['WORKERS', 'BLOBS'], justification: 'Leer localmente texto y códigos del área de imagen seleccionada por el usuario.' });
    })();
    await scanDocumentPromise;
    return await Promise.race([
      chrome.runtime.sendMessage({ type: 'ONOFF_SCAN_PROCESS', image: message.image }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('La lectura tardó demasiado. Pruebe con un área más pequeña.')), 60000); })
    ]);
  } finally {
    clearTimeout(timer);
    await chrome.offscreen.closeDocument().catch(() => {});
    scanDocumentPromise = null; scanBusy = false;
  }
}
