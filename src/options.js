const provider = document.querySelector('#provider');
const backendUrl = document.querySelector('#backendUrl');
const libreTranslateUrl = document.querySelector('#libreTranslateUrl');
const showCornerButton = document.querySelector('#showCornerButton');
const showSelectionButtons = document.querySelector('#showSelectionButtons');
const status = document.querySelector('#status');

const DEFAULTS = {
  provider: 'backend-openai',
  backendUrl: 'https://asistente-onoff-andres-projects-bf9797b2.vercel.app',
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
  chrome.storage.sync.set({
    provider: provider.value,
    backendUrl: normalizeUrl(backendUrl.value || DEFAULTS.backendUrl),
    libreTranslateUrl: libreTranslateUrl.value || DEFAULTS.libreTranslateUrl,
    showCornerButton: showCornerButton.checked,
    showSelectionButtons: showSelectionButtons.checked
  }, () => {
    status.textContent = 'Opciones guardadas. Recargue iKono para aplicar los cambios.';
    setTimeout(() => status.textContent = '', 2800);
  });
});

function updateVisibleProviderFields() {
  document.querySelectorAll('[data-provider-box]').forEach((box) => {
    box.hidden = box.dataset.providerBox !== provider.value;
  });
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}
