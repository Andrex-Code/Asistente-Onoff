const provider = document.querySelector('#provider');
const backendUrl = document.querySelector('#backendUrl');
const libreTranslateUrl = document.querySelector('#libreTranslateUrl');
const showCornerButton = document.querySelector('#showCornerButton');
const showSelectionButtons = document.querySelector('#showSelectionButtons');
const status = document.querySelector('#status');
const authStatus = document.querySelector('#authStatus');
const authUsername = document.querySelector('#authUsername');
const authPassword = document.querySelector('#authPassword');
const loginButton = document.querySelector('#login');
const logoutButton = document.querySelector('#logout');
const loginFields = document.querySelector('#loginFields');

const DEFAULTS = {
  provider: 'backend-openai',
  backendUrl: 'https://asistente-onoff.vercel.app',
  libreTranslateUrl: 'http://localhost:5000/translate',
  showCornerButton: true,
  showSelectionButtons: true
};
const AUTH_KEYS = ['onoffAuthToken', 'onoffAuthExpiresAt', 'onoffAuthUser'];

init();

async function init() {
  const settings = await chrome.storage.sync.get(Object.keys(DEFAULTS));
  provider.value = settings.provider || DEFAULTS.provider;
  backendUrl.value = settings.backendUrl || DEFAULTS.backendUrl;
  libreTranslateUrl.value = settings.libreTranslateUrl || DEFAULTS.libreTranslateUrl;
  showCornerButton.checked = settings.showCornerButton ?? DEFAULTS.showCornerButton;
  showSelectionButtons.checked = settings.showSelectionButtons ?? DEFAULTS.showSelectionButtons;
  updateVisibleProviderFields();
  await renderAuthState();
}

provider.addEventListener('change', updateVisibleProviderFields);
loginButton.addEventListener('click', login);
logoutButton.addEventListener('click', logout);

document.querySelector('#save').addEventListener('click', async () => {
  try {
    const secureBackend = normalizeBackendUrl(backendUrl.value || DEFAULTS.backendUrl);
    chrome.storage.sync.set({
      provider: provider.value,
      backendUrl: secureBackend,
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

async function login() {
  const username = authUsername.value.trim();
  const password = authPassword.value;
  if (!username || !password) return setAuthStatus('Ingrese usuario y contraseña.', true);
  loginButton.disabled = true;
  setAuthStatus('Iniciando sesión…');
  try {
    const base = normalizeBackendUrl(backendUrl.value || DEFAULTS.backendUrl);
    const response = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok || !data?.token || !data?.expiresAt) throw new Error(data?.error || 'No fue posible iniciar sesión.');
    await chrome.storage.local.set({ onoffAuthToken: data.token, onoffAuthExpiresAt: Number(data.expiresAt), onoffAuthUser: data.user || username });
    authPassword.value = '';
    await renderAuthState();
  } catch (error) {
    await chrome.storage.local.remove(AUTH_KEYS);
    setAuthStatus(error.message || 'No fue posible iniciar sesión.', true);
  } finally {
    loginButton.disabled = false;
  }
}

async function logout() {
  await chrome.storage.local.remove(AUTH_KEYS);
  authPassword.value = '';
  await renderAuthState();
}

async function renderAuthState() {
  const auth = await chrome.storage.local.get(AUTH_KEYS);
  const active = Boolean(auth.onoffAuthToken && Number(auth.onoffAuthExpiresAt) > Date.now());
  if (!active) {
    if (auth.onoffAuthToken) await chrome.storage.local.remove(AUTH_KEYS);
    loginFields.hidden = false;
    logoutButton.hidden = true;
    setAuthStatus('Sin sesión. Inicie sesión para usar IA y Bitrix.', true);
    return;
  }
  loginFields.hidden = true;
  logoutButton.hidden = false;
  const expiry = new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(Number(auth.onoffAuthExpiresAt)));
  setAuthStatus(`Sesión activa: ${auth.onoffAuthUser || 'usuario'} · vence ${expiry}`);
}

function setAuthStatus(message, error = false) {
  authStatus.textContent = message;
  authStatus.classList.toggle('is-error', error);
}
function updateVisibleProviderFields() {
  document.querySelectorAll('[data-provider-box]').forEach((box) => { box.hidden = box.dataset.providerBox !== provider.value; });
}
function normalizeBackendUrl(value) {
  const url = new URL(String(value || '').trim());
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('El backend debe usar HTTPS. Solo localhost puede usar HTTP.');
  if (!local && url.origin !== 'https://asistente-onoff.vercel.app') throw new Error('Por seguridad, use el backend oficial de Asistente ONOFF.');
  return url.origin;
}
function normalizeLocalLibreUrl(value) {
  const url = new URL(String(value || '').trim());
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('LibreTranslate local debe usar http://localhost.');
  return url.toString().replace(/\/$/, '');
}
