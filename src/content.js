const TEMPLATES = [
  ['Escalamiento Operaciones','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/383/'],
  ['Primer contacto','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/477/'],
  ['Solicitud de recapacitación','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/513/'],
  ['Actualizar información de producto','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/606/'],
  ['Cesión de contrato','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/648/'],
  ['Solicitud de retiro','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/650/'],
  ['Bolsas adicionales F.E.','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/654/'],
  ['Cambio de plan F.E.','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/656/'],
  ['Implementación F.E.','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/658/'],
  ['Actualizar resolución POS','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/684/'],
  ['Fallas en sincronización','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/710/'],
  ['Ajuste de inventario','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/732/'],
  ['Cambio de plan','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/764/'],
  ['Actualizar resolución DIAN','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/766/'],
  ['Marcación de impuestos','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/768/'],
  ['Inhabilitar resolución','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/770/'],
  ['Facturación','https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/798/']
];

let lastSelection = null;
let panel;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.type === 'IKONO_TRANSLATE_SELECTION') return runTextAction(message.text, 'pt-es');
  if (message.type === 'IKONO_FALAR_SELECTION') return runTextAction(message.text, 'es-pt');
  if (message.type === 'IKONO_IMPROVE_SELECTION') return runImprove(message.text);
});

init();

function init() {
  if (!document.body || document.querySelector('.onoff-assistant-launcher')) return;
  const launcher = document.createElement('button');
  launcher.className = 'onoff-assistant-launcher';
  launcher.textContent = 'ON';
  launcher.title = 'Asistente ONOFF';
  launcher.addEventListener('click', togglePanel);
  document.body.appendChild(launcher);

  panel = document.createElement('div');
  panel.className = 'onoff-assistant-panel';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="onoff-title">Asistente ONOFF</div>
    <button data-action="translate">Traducir selección</button>
    <button data-action="falar">Falar selección</button>
    <button data-action="improve">Mejorar texto seleccionado</button>
    <button data-action="templates">Plantillas</button>
    <button data-action="tracking">Seguimientos</button>
    <button data-action="audio">Cargar audio</button>
    <input type="file" accept="audio/*,.ogg,.opus,.webm,.mp3,.m4a,.wav" hidden data-audio />
    <div class="onoff-subview" data-subview></div>`;
  document.body.appendChild(panel);

  panel.addEventListener('mousedown', () => rememberSelection());
  panel.addEventListener('click', handlePanelClick);
  panel.querySelector('[data-audio]').addEventListener('change', transcribeAudio);
}

function togglePanel() {
  rememberSelection();
  panel.hidden = !panel.hidden;
  if (!panel.hidden) renderHome();
}

function renderHome() {
  panel.querySelector('[data-subview]').innerHTML = '';
}

async function handlePanelClick(event) {
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === 'translate') return withSelection((text) => runTextAction(text, 'pt-es'));
  if (action === 'falar') return withSelection((text) => runTextAction(text, 'es-pt'));
  if (action === 'improve') return withSelection(runImprove);
  if (action === 'templates') return renderTemplates();
  if (action === 'tracking') return renderTracking();
  if (action === 'audio') return panel.querySelector('[data-audio]').click();
}

function withSelection(callback) {
  rememberSelection();
  if (!lastSelection?.text) return showMessage('Seleccione primero el texto que desea usar.');
  callback(lastSelection.text);
}

function rememberSelection() {
  const active = document.activeElement;
  if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT') && active.selectionStart !== active.selectionEnd) {
    lastSelection = { element: active, start: active.selectionStart, end: active.selectionEnd, text: active.value.slice(active.selectionStart, active.selectionEnd) };
    return;
  }
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) lastSelection = { text: selection.toString(), range: selection.getRangeAt(0).cloneRange() };
}

async function runTextAction(text, direction) {
  showMessage('Procesando...');
  const response = await chrome.runtime.sendMessage({ type: 'IKONO_TRANSLATE', text, direction });
  if (!response?.ok) return showMessage(response?.error || 'No se pudo procesar.');
  if (direction === 'es-pt') replaceSelection(response.translatedText);
  showMessage(response.translatedText, direction === 'es-pt');
}

async function runImprove(text) {
  showMessage('Mejorando texto...');
  const response = await chrome.runtime.sendMessage({ type: 'IKONO_IMPROVE', text });
  if (!response?.ok) return showMessage(response?.error || 'No se pudo mejorar el texto.');
  replaceSelection(response.improvedText);
  showMessage(response.improvedText, true);
}

function replaceSelection(value) {
  if (!lastSelection?.element) return false;
  const { element, start, end } = lastSelection;
  element.focus();
  element.setRangeText(value, start, end, 'end');
  element.dispatchEvent(new Event('input', { bubbles: true }));
  lastSelection = { element, start, end: start + value.length, text: value };
  return true;
}

function renderTemplates() {
  const view = panel.querySelector('[data-subview]');
  view.innerHTML = `<div class="onoff-subtitle">Plantillas</div>${TEMPLATES.map(([name,url]) => `<button class="onoff-link" data-url="${url}">${name}</button>`).join('')}`;
  view.querySelectorAll('[data-url]').forEach((button) => button.addEventListener('click', () => window.open(button.dataset.url, '_blank')));
}

async function renderTracking() {
  const { followUps = [] } = await chrome.storage.local.get('followUps');
  const view = panel.querySelector('[data-subview]');
  view.innerHTML = `
    <div class="onoff-subtitle">Seguimientos <button class="onoff-plus" data-add>+</button></div>
    <div data-form hidden><input data-name placeholder="Nombre del seguimiento"><input data-url-input placeholder="Pegue el enlace de la tarea"><button data-save>Guardar</button></div>
    <div data-list>${followUps.length ? followUps.map((item) => `<div class="onoff-follow"><button data-open="${item.url}">${escapeHtml(item.name)}</button><button data-delete="${item.id}">×</button></div>`).join('') : '<small>No hay seguimientos guardados.</small>'}</div>`;
  view.querySelector('[data-add]').onclick = () => { view.querySelector('[data-form]').hidden = false; };
  view.querySelector('[data-save]').onclick = async () => {
    const name = view.querySelector('[data-name]').value.trim();
    const url = view.querySelector('[data-url-input]').value.trim();
    if (!/^https:\/\/onoff\.bitrix24\.es\//i.test(url)) return showMessage('Ingrese un enlace válido de Bitrix24.');
    followUps.unshift({ id: crypto.randomUUID(), name: name || `Tarea Bitrix ${new URL(url).pathname.split('/').filter(Boolean).pop()}`, url, createdAt: Date.now() });
    await chrome.storage.local.set({ followUps });
    renderTracking();
  };
  view.querySelectorAll('[data-open]').forEach((button) => button.onclick = () => window.open(button.dataset.open, '_blank'));
  view.querySelectorAll('[data-delete]').forEach((button) => button.onclick = async () => {
    await chrome.storage.local.set({ followUps: followUps.filter((item) => item.id !== button.dataset.delete) });
    renderTracking();
  });
}

async function transcribeAudio(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 25 * 1024 * 1024) return showMessage('El audio supera 25 MB.');
  showMessage('Procesando audio...');
  const audioBase64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
  const response = await chrome.runtime.sendMessage({ type: 'IKONO_TRANSCRIBE_AUDIO', payload: { audioBase64, fileName: file.name, mimeType: file.type } });
  showMessage(response?.ok ? (response.spanish || response.transcript) : (response?.error || 'No se pudo transcribir.'));
}

function showMessage(text) {
  let bubble = document.querySelector('.onoff-assistant-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.className = 'onoff-assistant-bubble';
    bubble.innerHTML = '<button data-close>×</button><p></p><button data-copy>Copiar</button>';
    document.body.appendChild(bubble);
    bubble.querySelector('[data-close]').onclick = () => bubble.remove();
  }
  bubble.querySelector('p').textContent = text;
  bubble.querySelector('[data-copy]').onclick = () => navigator.clipboard.writeText(text);
}

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
