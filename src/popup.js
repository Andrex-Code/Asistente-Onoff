const audioFile = document.querySelector('#audioFile');
const transcribeButton = document.querySelector('#transcribeButton');
const showSelectionButtons = document.querySelector('#showSelectionButtons');
const statusEl = document.querySelector('#status');
const transcriptBox = document.querySelector('#transcriptBox');
const spanishBox = document.querySelector('#spanishBox');
const transcriptEl = document.querySelector('#transcript');
const spanishEl = document.querySelector('#spanish');

chrome.storage.sync.get(['showSelectionButtons'], (settings) => {
  showSelectionButtons.checked = settings.showSelectionButtons ?? true;
});

showSelectionButtons.addEventListener('change', () => {
  chrome.storage.sync.set({ showSelectionButtons: showSelectionButtons.checked });
});

transcribeButton.addEventListener('click', async () => {
  const file = audioFile.files?.[0];
  if (!file) return setStatus('Seleccione primero un archivo de audio.', true);
  if (file.size > 25 * 1024 * 1024) return setStatus('El archivo supera 25 MB.', true);

  try {
    transcribeButton.disabled = true;
    transcriptBox.hidden = true;
    spanishBox.hidden = true;
    setStatus('Procesando audio...');

    const audioBase64 = await fileToBase64(file);
    const response = await chrome.runtime.sendMessage({
      type: 'IKONO_TRANSCRIBE_AUDIO',
      audioBase64,
      fileName: file.name.replace(/\.opus$/i, '.ogg'),
      mimeType: file.type.includes('opus') ? 'audio/ogg' : (file.type || 'audio/ogg')
    });

    if (!response?.ok) throw new Error(response?.error || 'No se pudo transcribir el audio.');
    transcriptEl.textContent = response.transcript || '';
    spanishEl.textContent = response.spanish || '';
    transcriptBox.hidden = false;
    spanishBox.hidden = false;
    setStatus('Listo.');
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    transcribeButton.disabled = false;
  }
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || '').split(',').pop());
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'status error' : 'status';
}
