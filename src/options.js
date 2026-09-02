const provider = document.querySelector('#provider');
const backendUrl = document.querySelector('#backendUrl');
const libreTranslateUrl = document.querySelector('#libreTranslateUrl');
const showCornerButton = document.querySelector('#showCornerButton');
const showSelectionButtons = document.querySelector('#showSelectionButtons');
const status = document.querySelector('#status');

const DEFAULTS = {
  provider: 'backend-openai',
  backendUrl: 'https://asistente-onoff.vercel.app',
  libreTranslateUrl: 'http://localhost:5000/translate',
  showCornerButton: true,
  showSelectionButtons: true
};

chrome.storage.sync.get(Object.keys(DEFAULTS), (settings) => {
  provider.value = settings.provider || DEFAULTS.provider;
  backendUrl.value = settings.backendUrl || DEFAULTS.backendUrl;
  libreTranslateUrl.value = settings.libreTranslateUrl || DEFAULTS.libreTranslateUrl;
  showCornerButton.checked = settings.showCornerButton ?? DEFAULTS.showCornerButton;
  showSelectionButtons.checked = settings.showSelectionButtons ?? DEFAULTS.showSelectionButtons;
  updateVisibleProviderFields();
});

provider.addEventListener('change', updateVisibleProviderFields);

document.querySelector('#save').addEventListener('click', () => {
  try {
    chrome.storage.sync.set({
      provider: provider.value,
      backendUrl: normalizeBackendUrl(backendUrl.value || DEFAULTS.backendUrl),
      libreTranslateUrl: normalizeLocalLibreUrl(libreTranslateUrl.value || DEFAULTS.libreTranslateUrl),
      showCornerButton: showCornerButton.checked,
      showSelectionButtons: showSelectionButtons.checked
    }, () => {
      status.textContent = 'Opciones guardadas. Recargue iKono para aplicar los cambios visuales.';
      setTimeout(() => { status.textContent = ''; }, 2600);
    });
  } catch (error) {
    status.textContent = error.message;
  }
});

function updateVisibleProviderFields() {
  document.querySelectorAll('[data-provider-box]').forEach((box) => {
    box.hidden = box.dataset.providerBox !== provider.value;
  });
}

function normalizeBackendUrl(value) {
  const url = new URL(String(value || '').trim());
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('El backend debe usar HTTPS.');
  if (!local && url.origin !== 'https://asistente-onoff.vercel.app') throw new Error('Use el backend oficial de Asistente ONOFF.');
  return url.origin;
}

function normalizeLocalLibreUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('LibreTranslate local debe usar http://localhost.');
  return url.toString().replace(/\/$/, '');
}
