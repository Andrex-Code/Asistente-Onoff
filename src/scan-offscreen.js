// Isolated extension document: only bundled code and language files are used.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'ONOFF_SCAN_PROCESS' || sender.id !== chrome.runtime.id || sender.tab) return false;
  readImage(message.image).then(sendResponse).catch(() => sendResponse({ ok: false, error: 'No se pudo leer la selección. Amplíe la imagen e intente de nuevo.' }));
  return true;
});

async function readImage(dataUrl) {
  if (typeof dataUrl !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(dataUrl) || dataUrl.length > 12000000) throw new Error('Imagen inválida');
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), char => char.charCodeAt(0));
  if (bytes.length < 24 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) throw new Error('PNG inválido');
  const header = new DataView(bytes.buffer);
  const width = header.getUint32(16), height = header.getUint32(20);
  if (!width || !height || width * height > 8000000) throw new Error('Selección demasiado grande');
  // Image.decode()/canvas.toBlob() can wait for rendering in a hidden document.
  const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d').drawImage(image, 0, 0); image.close();
  const codes = [];
  // Decode bars first; OCR must not invent a barcode from unreadable stripes.
  for (let turn = 0; turn < 4 && !codes.length; turn++) {
    const rotated = document.createElement('canvas');
    rotated.width = turn % 2 ? canvas.height : canvas.width; rotated.height = turn % 2 ? canvas.width : canvas.height;
    const ctx = rotated.getContext('2d'); ctx.translate(rotated.width / 2, rotated.height / 2); ctx.rotate(turn * Math.PI / 2); ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    try {
      const reader = new ZXing.MultiFormatReader();
      const pixels = ctx.getImageData(0, 0, rotated.width, rotated.height).data;
      const grey = new Uint8ClampedArray(rotated.width * rotated.height);
      for (let i = 0; i < grey.length; i++) grey[i] = (pixels[i * 4] + 2 * pixels[i * 4 + 1] + pixels[i * 4 + 2]) / 4;
      const bitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(new ZXing.RGBLuminanceSource(grey, rotated.width, rotated.height)));
      const result = reader.decode(bitmap, new Map([[ZXing.DecodeHintType.TRY_HARDER, true]]));
      codes.push({ value: result.getText(), format: ZXing.BarcodeFormat[result.getBarcodeFormat()] || 'Código' });
      reader.reset();
    } catch { /* No readable barcode: continue with other orientations and text. */ }
    rotated.width = rotated.height = 0;
  }
  let worker;
  try {
    const base = chrome.runtime.getURL('src/vendor/scan/');
    worker = await Tesseract.createWorker('spa', 1, {
      workerPath: base + 'worker.min.js', corePath: base + 'core', langPath: base.replace(/\/$/, ''),
      workerBlobURL: false, cacheMethod: 'none'
    });
    await worker.setParameters({ tessedit_pageseg_mode: '11' });
    const { data } = await worker.recognize(dataUrl);
    return { ok: true, codes, text: String(data.text || '').trim().slice(0, 20000), confidence: Number(data.confidence || 0) };
  } catch {
    if (codes.length) return { ok: true, codes, text: '', warning: 'Se leyó el código, pero no se pudo extraer el texto.' };
    throw new Error('No se pudo iniciar el lector');
  } finally {
    await worker?.terminate();
    canvas.width = canvas.height = 0;
  }
}
