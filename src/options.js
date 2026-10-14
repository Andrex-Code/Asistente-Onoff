const provider = document.querySelector('#provider');
const backendUrl = document.querySelector('#backendUrl');
const libreTranslateUrl = document.querySelector('#libreTranslateUrl');
const showCornerButton = document.querySelector('#showCornerButton');
const showSelectionButtons = document.querySelector('#showSelectionButtons');
const status = document.querySelector('#status');
const mascotMotion = document.querySelector('#onoffMascotMotionEnabled');
const onoffTheme = document.querySelector('#onoffTheme');

const DEFAULTS = {
  provider: 'backend-openai',
  backendUrl: 'https://asistente-onoff.vercel.app',
  libreTranslateUrl: 'http://localhost:5000/translate',
  showCornerButton: true,
  showSelectionButtons: true,
  onoffMascotMotionEnabled: true,
  onoffTheme: 'system'
};

chrome.storage.sync.get(Object.keys(DEFAULTS), (settings) => {
  provider.value = settings.provider || DEFAULTS.provider;
  backendUrl.value = settings.backendUrl || DEFAULTS.backendUrl;
  libreTranslateUrl.value = settings.libreTranslateUrl || DEFAULTS.libreTranslateUrl;
  showCornerButton.checked = settings.showCornerButton ?? DEFAULTS.showCornerButton;
  showSelectionButtons.checked = settings.showSelectionButtons ?? DEFAULTS.showSelectionButtons;
  mascotMotion.checked = settings.onoffMascotMotionEnabled ?? true;
  onoffTheme.value = settings.onoffTheme || 'system';
  updateVisibleProviderFields();
});

provider.addEventListener('change', updateVisibleProviderFields);

document.querySelector('#save').addEventListener('click', () => {
  chrome.storage.sync.set({
    provider: provider.value,
    backendUrl: normalizeUrl(backendUrl.value || DEFAULTS.backendUrl),
    libreTranslateUrl: libreTranslateUrl.value || DEFAULTS.libreTranslateUrl,
    showCornerButton: showCornerButton.checked,
    showSelectionButtons: showSelectionButtons.checked,
    onoffMascotMotionEnabled: mascotMotion.checked,
    onoffTheme: onoffTheme.value
  }, () => {
    status.textContent = 'Preferencias guardadas. Ya están listas para usar.';
    setTimeout(() => { status.textContent = ''; }, 2600);
  });
});

function updateVisibleProviderFields() {
  document.querySelectorAll('[data-provider-box]').forEach((box) => {
    box.hidden = box.dataset.providerBox !== provider.value;
  });
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

document.querySelector('#resetLayout').addEventListener('click', async () => {
  try {await Promise.all([chrome.storage.sync.remove('launcherPosition'),chrome.storage.local.remove(['onoffAssistantPosition','onoffAssistantUserPlaced','onoffBitrixSearchPosition','onoffBitrixSearchUserPlaced','onoffFollowupsPosition','onoffFollowupsUserPlaced','onoffTemplatesPosition','onoffTemplatesUserPlaced','onoffScriptsPosition'])]);status.textContent='Posiciones restablecidas. Vuelve a abrir las ventanas para ubicarlas junto al menú.';}catch{status.textContent='No se pudieron restablecer las posiciones. Vuelve a intentarlo.';}
});
