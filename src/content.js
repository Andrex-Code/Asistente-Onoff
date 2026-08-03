const TEMPLATES = [
  ['TCXXXX - ESCALAMIENTO OPERACIONES', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/383/'],
  ['TCXXXX- PRIMER CONTACTO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/477/'],
  ['TCXXXX - S SOLICITUD DE RECAPACITACIÓN (CIUDAD OBLIGATORIA)', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/513/'],
  ['TCXXXX - ACTUALIZAR INFORMACION DE PRODUCTO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/606/'],
  ['TCXXXX - CESION DE CONTRATO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/648/'],
  ['TCXXXX - SOLICITUD DE RETIRO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/650/'],
  ['TCXXXX - S SOLICITUD BOLSAS ADICIONALES F.E', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/654/'],
  ['TCXXXX - S SOLICITUD CAMBIO DE PLAN F.E', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/656/'],
  ['TCXXXX - S IMPLEMENTACION F.E (CIUDAD)', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/658/'],
  ['TCXXXX - S ACTUALIZAR RESOLUCION POS', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/684/'],
  ['TCXXXX- I FALLAS EN SINCRONIZACIÓN', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/710/'],
  ['TCXXXX - S AJUSTE DE INVENTARIO', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/732/'],
  ['TCXXXX - S CAMBIO DE PLAN', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/764/'],
  ['TCXXXX- S ACTUALIZAR RESOLUCION DIAN', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/766/'],
  ['TCXXXX - S MARCACION DE IMPUESTOS', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/768/'],
  ['TCXXXX - S INHABILITAR RESOLUCION', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/770/'],
  ['TCXXXX - C FACTURACION', 'https://onoff.bitrix24.es/company/personal/user/2315788/tasks/templates/template/view/798/']
];

let currentBubble;
let currentToolbar;
let edgeLauncher;
let edgePanel;
let edgeAudioInput;
let lastSelectedText = '';
let lastSelectionRange = null;
let lastTextInputSelection = null;
let toolbarTimer;
let showCornerButton = true;
let showSelectionButtons = true;
let launcherPosition = null;
let launcherDragState = null;
let bubblePosition = null;
let bubbleDragState = null;

chrome.runtime.onMessage.addListener(async (message) => {
  if (message?.type === 'IKONO_TRANSLATE_SELECTION') await runTranslation(message.text, message.direction, message.label);
  if (message?.type === 'ONOFF_IMPROVE_SELECTION') await runImprove(message.text);
});

initSettings();
document.addEventListener('mouseup', scheduleSelectionToolbar, true);
document.addEventListener('keyup', scheduleSelectionToolbar, true);
document.addEventListener('selectionchange', () => {
  clearTimeout(toolbarTimer);
  toolbarTimer = setTimeout(showSelectionToolbar, 180);
});
document.addEventListener('scroll', removeToolbar, true);
window.addEventListener('resize', () => {
  removeToolbar();
  positionEdgePanelNearLauncher();
  keepBubbleInsideViewport();
});
document.addEventListener('mousedown', (event) => {
  if (event.target.closest?.('.ikono-translator-toolbar, .ikono-translator-bubble, .ikono-translator-launcher, .ikono-translator-panel')) return;
  removeToolbar();
  hideEdgePanel();
}, true);

function initSettings() {
  chrome.storage.sync.get(['showCornerButton', 'showSelectionButtons', 'launcherPosition'], (settings) => {
    showCornerButton = settings.showCornerButton ?? true;
    showSelectionButtons = settings.showSelectionButtons ?? true;
    launcherPosition = settings.launcherPosition || null;
    if (showCornerButton) initEdgeFallbackLauncher();
  });
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if (changes.launcherPosition) {
      launcherPosition = changes.launcherPosition.newValue || null;
      applyLauncherPosition();
    }
    if (changes.showSelectionButtons) {
      showSelectionButtons = changes.showSelectionButtons.newValue ?? true;
      syncSelectionButtonsCheckboxes();
      if (!showSelectionButtons) removeToolbar();
    }
    if (changes.showCornerButton) {
      showCornerButton = changes.showCornerButton.newValue ?? true;
      if (showCornerButton) initEdgeFallbackLauncher(); else removeEdgeFallbackLauncher();
    }
  });
}

function initEdgeFallbackLauncher() {
  if (!showCornerButton) return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createEdgeFallbackLauncher, { once: true });
  else createEdgeFallbackLauncher();
}

function createEdgeFallbackLauncher() {
  if (!showCornerButton || edgeLauncher || !document.body) return;
  edgeLauncher = document.createElement('button');
  edgeLauncher.className = 'ikono-translator-launcher';
  edgeLauncher.type = 'button';
  edgeLauncher.title = 'Asistente ONOFF. Clic para abrir. Mantenga presionado para mover.';
  edgeLauncher.innerHTML = `<img alt="ONOFF" src="${chrome.runtime.getURL('icons/icon48.png')}" />`;

  edgePanel = document.createElement('div');
  edgePanel.className = 'ikono-translator-panel';
  edgePanel.hidden = true;
  renderMainPanel();

  document.body.appendChild(edgeLauncher);
  document.body.appendChild(edgePanel);
  applyLauncherPosition();
  edgeLauncher.addEventListener('pointerdown', startLauncherPointerInteraction);
  edgePanel.addEventListener('mousedown', preventFocusLoss);
}

function renderMainPanel() {
  edgePanel.innerHTML = `
    <label class="ikono-translator-panel-check">
      <input type="checkbox" data-action="toggle-selection-buttons" />
      <span>Botones flotantes</span>
    </label>
    <button type="button" data-action="translate">Traducir selección</button>
    <button type="button" data-action="falar">Falar selección</button>
    <button type="button" data-action="improve">Mejorar texto seleccionado</button>
    <button type="button" data-action="templates">Plantillas</button>
    <button type="button" data-action="followups">Seguimientos</button>
    <button type="button" data-action="audio">Cargar audio</button>
    <input class="ikono-translator-audio-input" type="file" accept="audio/*,.opus,.ogg,.webm,.mp3,.m4a,.wav" hidden />
    <div class="onoff-panel-subview" data-subview></div>
  `;
  edgeAudioInput = edgePanel.querySelector('.ikono-translator-audio-input');
  syncSelectionButtonsCheckboxes();

  edgePanel.querySelector('[data-action="toggle-selection-buttons"]').addEventListener('change', (event) => setSelectionButtonsEnabled(event.target.checked));
  edgePanel.querySelector('[data-action="translate"]').addEventListener('click', async () => {
    const text = rememberCurrentSelection();
    if (!text) return showNoSelectionBubble();
    await runTranslation(text, 'pt-es', 'Traducción');
    hideEdgePanel();
  });
  edgePanel.querySelector('[data-action="falar"]').addEventListener('click', async () => {
    const text = rememberCurrentSelection();
    if (!text) return showNoSelectionBubble();
    await runTranslation(text, 'es-pt', 'Falar');
    hideEdgePanel();
  });
  edgePanel.querySelector('[data-action="improve"]').addEventListener('click', async () => {
    const text = rememberCurrentSelection();
    if (!text) return showNoSelectionBubble();
    await runImprove(text);
    hideEdgePanel();
  });
  edgePanel.querySelector('[data-action="templates"]').addEventListener('click', renderTemplates);
  edgePanel.querySelector('[data-action="followups"]').addEventListener('click', renderFollowUps);
  edgePanel.querySelector('[data-action="audio"]').addEventListener('click', () => {
    edgeAudioInput.value = '';
    edgeAudioInput.click();
  });
  edgeAudioInput.addEventListener('change', async () => {
    const file = edgeAudioInput.files?.[0];
    if (!file) return;
    await transcribeUploadedAudio(file);
    hideEdgePanel();
  });
}

function renderTemplates() {
  const view = edgePanel.querySelector('[data-subview]');
  view.innerHTML = `<div class="onoff-subtitle"><strong>Plantillas Bitrix</strong><button type="button" data-close-sub>×</button></div>${TEMPLATES.map(([name, url]) => `<button type="button" class="onoff-link-button" data-url="${url}">${escapeHtml(name)}</button>`).join('')}`;
  view.querySelector('[data-close-sub]').onclick = () => { view.innerHTML = ''; positionEdgePanelNearLauncher(); };
  view.querySelectorAll('[data-url]').forEach((button) => button.onclick = () => window.open(button.dataset.url, '_blank', 'noopener'));
  positionEdgePanelNearLauncher();
}

async function renderFollowUps() {
  const { followUps = [] } = await chrome.storage.local.get('followUps');
  const view = edgePanel.querySelector('[data-subview]');
  view.innerHTML = `
    <div class="onoff-subtitle"><strong>Seguimientos</strong><div><button type="button" data-add>+</button><button type="button" data-close-sub>×</button></div></div>
    <div class="onoff-follow-form" data-form hidden>
      <input type="text" data-name placeholder="Nombre del seguimiento" />
      <input type="url" data-url placeholder="Link de la tarea de Bitrix" />
      <button type="button" data-save>Guardar</button>
    </div>
    <div class="onoff-follow-list">${followUps.length ? followUps.map((item) => `<div class="onoff-follow-item"><button type="button" data-open="${escapeHtml(item.url)}">${escapeHtml(item.name)}</button><button type="button" data-delete="${item.id}" title="Eliminar">×</button></div>`).join('') : '<small>No hay seguimientos guardados.</small>'}</div>
  `;
  view.querySelector('[data-close-sub]').onclick = () => { view.innerHTML = ''; positionEdgePanelNearLauncher(); };
  view.querySelector('[data-add]').onclick = () => { view.querySelector('[data-form]').hidden = false; positionEdgePanelNearLauncher(); };
  view.querySelector('[data-save]').onclick = async () => {
    const name = view.querySelector('[data-name]').value.trim();
    const url = view.querySelector('[data-url]').value.trim();
    if (!/^https:\/\/onoff\.bitrix24\.es\//i.test(url)) {
      showBubble({ title: 'Seguimientos', original: url, translated: 'Ingrese un enlace válido de una tarea de Bitrix24.' });
      return;
    }
    followUps.unshift({ id: crypto.randomUUID(), name: name || 'Seguimiento Bitrix', url, createdAt: Date.now() });
    await chrome.storage.local.set({ followUps });
    renderFollowUps();
  };
  view.querySelectorAll('[data-open]').forEach((button) => button.onclick = () => window.open(button.dataset.open, '_blank', 'noopener'));
  view.querySelectorAll('[data-delete]').forEach((button) => button.onclick = async () => {
    await chrome.storage.local.set({ followUps: followUps.filter((item) => item.id !== button.dataset.delete) });
    renderFollowUps();
  });
  positionEdgePanelNearLauncher();
}

function setSelectionButtonsEnabled(enabled) {
  showSelectionButtons = Boolean(enabled);
  chrome.storage.sync.set({ showSelectionButtons });
  syncSelectionButtonsCheckboxes();
  if (!showSelectionButtons) removeToolbar();
}

function syncSelectionButtonsCheckboxes() {
  document.querySelectorAll('[data-action="toggle-selection-buttons"]').forEach((checkbox) => { checkbox.checked = showSelectionButtons; });
}

function startLauncherPointerInteraction(event) {
  event.preventDefault();
  rememberCurrentSelection();
  const rect = edgeLauncher.getBoundingClientRect();
  launcherDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top,
    dragging: false,
    holdTimer: window.setTimeout(() => {
      if (!launcherDragState) return;
      launcherDragState.dragging = true;
      edgeLauncher.classList.add('is-dragging');
      edgeLauncher.setPointerCapture?.(event.pointerId);
      hideEdgePanel();
    }, 260)
  };
  window.addEventListener('pointermove', moveLauncherPointerInteraction, true);
  window.addEventListener('pointerup', endLauncherPointerInteraction, true);
  window.addEventListener('pointercancel', endLauncherPointerInteraction, true);
}

function moveLauncherPointerInteraction(event) {
  if (!launcherDragState?.dragging) return;
  const left = clamp(launcherDragState.left + event.clientX - launcherDragState.startX, 8, window.innerWidth - edgeLauncher.offsetWidth - 8);
  const top = clamp(launcherDragState.top + event.clientY - launcherDragState.startY, 8, window.innerHeight - edgeLauncher.offsetHeight - 8);
  launcherPosition = { left: Math.round(left), top: Math.round(top) };
  applyLauncherPosition();
}

function endLauncherPointerInteraction(event) {
  if (!launcherDragState) return;
  window.clearTimeout(launcherDragState.holdTimer);
  window.removeEventListener('pointermove', moveLauncherPointerInteraction, true);
  window.removeEventListener('pointerup', endLauncherPointerInteraction, true);
  window.removeEventListener('pointercancel', endLauncherPointerInteraction, true);
  const wasDragging = launcherDragState.dragging;
  launcherDragState = null;
  edgeLauncher.classList.remove('is-dragging');
  edgeLauncher.releasePointerCapture?.(event.pointerId);
  if (wasDragging) chrome.storage.sync.set({ launcherPosition }); else toggleEdgePanel();
}

function applyLauncherPosition() {
  if (!edgeLauncher) return;
  if (!launcherPosition) {
    edgeLauncher.style.left = '';
    edgeLauncher.style.top = '';
    edgeLauncher.style.right = '18px';
    edgeLauncher.style.bottom = '86px';
  } else {
    edgeLauncher.style.left = `${clamp(launcherPosition.left, 8, window.innerWidth - edgeLauncher.offsetWidth - 8)}px`;
    edgeLauncher.style.top = `${clamp(launcherPosition.top, 8, window.innerHeight - edgeLauncher.offsetHeight - 8)}px`;
    edgeLauncher.style.right = 'auto';
    edgeLauncher.style.bottom = 'auto';
  }
  positionEdgePanelNearLauncher();
}

function toggleEdgePanel() {
  rememberCurrentSelection();
  edgePanel.hidden = !edgePanel.hidden;
  if (!edgePanel.hidden) renderMainPanel();
  positionEdgePanelNearLauncher();
}

function positionEdgePanelNearLauncher() {
  if (!edgePanel || edgePanel.hidden || !edgeLauncher) return;
  const rect = edgeLauncher.getBoundingClientRect();
  const panelWidth = edgePanel.offsetWidth || 280;
  const panelHeight = Math.min(edgePanel.offsetHeight || 360, window.innerHeight - 16);
  const left = clamp(rect.right - panelWidth, 8, window.innerWidth - panelWidth - 8);
  const top = rect.top > panelHeight + 16 ? rect.top - panelHeight - 8 : rect.bottom + 8;
  edgePanel.style.left = `${left}px`;
  edgePanel.style.top = `${clamp(top, 8, window.innerHeight - panelHeight - 8)}px`;
  edgePanel.style.right = 'auto';
  edgePanel.style.bottom = 'auto';
}

function removeEdgeFallbackLauncher() {
  edgeLauncher?.remove();
  edgePanel?.remove();
  edgeLauncher = null;
  edgePanel = null;
  edgeAudioInput = null;
}

function scheduleSelectionToolbar() {
  clearTimeout(toolbarTimer);
  toolbarTimer = setTimeout(showSelectionToolbar, 120);
}

function showSelectionToolbar() {
  if (!showSelectionButtons) return removeToolbar();
  const selectionData = getSelectionData();
  if (!selectionData.text || selectionData.text.length < 2) return removeToolbar();
  rememberSelectionData(selectionData);
  removeToolbar();
  currentToolbar = document.createElement('div');
  currentToolbar.className = 'ikono-translator-toolbar';
  currentToolbar.innerHTML = `<button type="button" data-action="translate">Traducir</button><button type="button" data-action="falar">Falar</button><button type="button" data-action="improve">Mejorar</button>`;
  document.body.appendChild(currentToolbar);
  placeElementNearRect(currentToolbar, selectionData.rect, 275);
  currentToolbar.querySelectorAll('button').forEach((button) => button.addEventListener('mousedown', preventFocusLoss));
  currentToolbar.querySelector('[data-action="translate"]').onclick = () => runTranslation(lastSelectedText, 'pt-es', 'Traducción');
  currentToolbar.querySelector('[data-action="falar"]').onclick = () => runTranslation(lastSelectedText, 'es-pt', 'Falar');
  currentToolbar.querySelector('[data-action="improve"]').onclick = () => runImprove(lastSelectedText);
}

async function runTranslation(text, direction, label) {
  removeToolbar();
  restoreSelectionIfPossible();
  showBubble({ title: label, original: text, translated: 'Procesando...' });
  const response = await chrome.runtime.sendMessage({ type: 'IKONO_TRANSLATE', text, direction });
  if (!response?.ok) return showBubble({ title: 'Error', original: text, translated: response?.error || 'No se pudo procesar.' });
  if (direction === 'es-pt') {
    const replaced = replaceEditableSelection(response.translatedText);
    showBubble({ title: label, original: text, translated: replaced ? `${response.translatedText}\n\nTexto reemplazado en el campo de escritura.` : `${response.translatedText}\n\nNo fue posible reemplazar automáticamente. Use Copiar.` });
  } else {
    showBubble({ title: label, original: text, translated: response.translatedText });
  }
}

async function runImprove(text) {
  removeToolbar();
  restoreSelectionIfPossible();
  showBubble({ title: 'Mejorar texto', original: text, translated: 'Mejorando texto...' });
  const response = await chrome.runtime.sendMessage({ type: 'ONOFF_IMPROVE', text });
  if (!response?.ok) return showBubble({ title: 'Error', original: text, translated: response?.error || 'No se pudo mejorar el texto.' });
  const replaced = replaceEditableSelection(response.improvedText);
  showBubble({ title: 'Texto mejorado', original: text, translated: replaced ? `${response.improvedText}\n\nTexto reemplazado en el campo de escritura.` : `${response.improvedText}\n\nNo fue posible reemplazar automáticamente. Use Copiar.` });
}

async function transcribeUploadedAudio(file) {
  if (file.size > 25 * 1024 * 1024) return showBubble({ title: 'Audio demasiado grande', original: file.name, translated: 'El archivo supera 25 MB.' });
  showBubble({ title: 'Transcripción de audio', original: file.name, translated: 'Procesando audio...' });
  try {
    const audioBase64 = await fileToBase64(file);
    const response = await chrome.runtime.sendMessage({ type: 'IKONO_TRANSCRIBE_AUDIO', audioBase64, fileName: file.name, mimeType: file.type });
    if (!response?.ok) throw new Error(response?.error || 'No se pudo transcribir el audio.');
    showBubble({ title: 'Audio traducido', original: response.transcript || file.name, translated: response.spanish || 'No se recibió traducción.' });
  } catch (error) {
    showBubble({ title: 'Error de audio', original: file.name, translated: error.message });
  }
}

function getSelectionData() {
  const active = document.activeElement;
  const isTextInput = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT');
  if (isTextInput && typeof active.selectionStart === 'number' && active.selectionStart !== active.selectionEnd) {
    const start = active.selectionStart;
    const end = active.selectionEnd;
    return { text: active.value.slice(start, end).trim(), rect: active.getBoundingClientRect(), range: null, textInput: active, start, end };
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return { text: '', rect: null, range: null, textInput: null };
  const range = selection.getRangeAt(0);
  return { text: selection.toString().trim(), rect: range.getBoundingClientRect(), range, textInput: null };
}

function rememberCurrentSelection() {
  const selectionData = getSelectionData();
  if (selectionData.text && selectionData.text.length >= 2) rememberSelectionData(selectionData);
  return lastSelectedText;
}

function rememberSelectionData(selectionData) {
  lastSelectedText = selectionData.text;
  lastSelectionRange = selectionData.range?.cloneRange?.() || null;
  lastTextInputSelection = selectionData.textInput ? { element: selectionData.textInput, start: selectionData.start, end: selectionData.end } : null;
}

function showBubble({ title, original, translated }) {
  currentBubble?.remove();
  currentBubble = document.createElement('div');
  currentBubble.className = 'ikono-translator-bubble';
  currentBubble.innerHTML = `<div class="ikono-translator-header" data-drag-handle><strong>${escapeHtml(title)}</strong><span class="ikono-translator-drag-hint">Mover</span><button type="button" aria-label="Cerrar">×</button></div><div class="ikono-translator-body"><div class="ikono-translator-section"><span>Texto seleccionado</span><p>${escapeHtml(original)}</p></div><div class="ikono-translator-section ikono-translator-result"><span>Resultado</span><p>${escapeHtml(translated)}</p></div></div><div class="ikono-translator-actions"><button type="button" data-copy>Copiar</button></div>`;
  document.body.appendChild(currentBubble);
  positionBubble(getSelectionData().rect);
  enableBubbleDrag();
  currentBubble.querySelector('[aria-label="Cerrar"]').onclick = () => currentBubble.remove();
  currentBubble.querySelector('[data-copy]').onclick = async () => {
    await navigator.clipboard.writeText(translated.replace(/\n\nTexto reemplazado.*$/s, '').replace(/\n\nNo fue posible.*$/s, ''));
    currentBubble.querySelector('[data-copy]').textContent = 'Copiado';
  };
}

function positionBubble(rect) {
  const width = currentBubble.offsetWidth || 360;
  const height = currentBubble.offsetHeight || 300;
  const margin = 12;
  if (bubblePosition) return applyBubblePosition(bubblePosition.left, bubblePosition.top);
  let left = rect?.left ?? 24;
  let top = rect ? (window.innerHeight - rect.bottom >= height + margin ? rect.bottom + margin : rect.top - height - margin) : 88;
  applyBubblePosition(clamp(left, margin, window.innerWidth - width - margin), clamp(top, margin, window.innerHeight - height - margin));
}

function enableBubbleDrag() {
  currentBubble?.querySelector('[data-drag-handle]')?.addEventListener('pointerdown', startBubbleDrag);
}

function startBubbleDrag(event) {
  if (event.target.closest('button')) return;
  event.preventDefault();
  const rect = currentBubble.getBoundingClientRect();
  bubbleDragState = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, top: rect.top };
  currentBubble.classList.add('is-dragging');
  window.addEventListener('pointermove', moveBubbleDrag, true);
  window.addEventListener('pointerup', endBubbleDrag, true);
}

function moveBubbleDrag(event) {
  if (!bubbleDragState || !currentBubble) return;
  const left = clamp(bubbleDragState.left + event.clientX - bubbleDragState.startX, 8, window.innerWidth - currentBubble.offsetWidth - 8);
  const top = clamp(bubbleDragState.top + event.clientY - bubbleDragState.startY, 8, window.innerHeight - currentBubble.offsetHeight - 8);
  bubblePosition = { left: Math.round(left), top: Math.round(top) };
  applyBubblePosition(left, top);
}

function endBubbleDrag() {
  currentBubble?.classList.remove('is-dragging');
  bubbleDragState = null;
  window.removeEventListener('pointermove', moveBubbleDrag, true);
  window.removeEventListener('pointerup', endBubbleDrag, true);
}

function applyBubblePosition(left, top) {
  if (!currentBubble) return;
  currentBubble.style.left = `${Math.round(left)}px`;
  currentBubble.style.top = `${Math.round(top)}px`;
}

function keepBubbleInsideViewport() {
  if (!currentBubble) return;
  const rect = currentBubble.getBoundingClientRect();
  applyBubblePosition(clamp(rect.left, 8, window.innerWidth - rect.width - 8), clamp(rect.top, 8, window.innerHeight - rect.height - 8));
}

function showNoSelectionBubble() {
  showBubble({ title: 'Asistente ONOFF', original: '', translated: 'Seleccione primero el texto que desea utilizar.' });
}

function placeElementNearRect(element, rect, expectedWidth) {
  const margin = 8;
  const width = Math.max(expectedWidth || 190, element.offsetWidth || 190);
  const height = element.offsetHeight || 46;
  const left = clamp(rect?.left ?? 24, margin, window.innerWidth - width - margin);
  const below = (rect?.bottom ?? 82) + margin;
  const top = clamp(below + height <= window.innerHeight - margin ? below : (rect?.top ?? 90) - height - margin, margin, window.innerHeight - height - margin);
  element.style.left = `${Math.round(left)}px`;
  element.style.top = `${Math.round(top)}px`;
}

function replaceEditableSelection(text) {
  if (lastTextInputSelection?.element?.isConnected) {
    const { element, start, end } = lastTextInputSelection;
    element.focus();
    if (typeof element.setRangeText === 'function') element.setRangeText(text, start, end, 'end');
    else element.value = element.value.slice(0, start) + text + element.value.slice(end);
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  if (lastSelectionRange) {
    const editableRoot = findEditableRoot(lastSelectionRange.commonAncestorContainer);
    if (editableRoot) {
      editableRoot.focus();
      lastSelectionRange.deleteContents();
      lastSelectionRange.insertNode(document.createTextNode(text));
      editableRoot.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      editableRoot.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
  }
  restoreSelectionIfPossible();
  return document.execCommand('insertText', false, text);
}

function findEditableRoot(node) {
  let element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  while (element && element !== document.body) {
    if (element.isContentEditable) return element;
    element = element.parentElement;
  }
  return null;
}

function restoreSelectionIfPossible() {
  if (!lastSelectionRange) return;
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(lastSelectionRange);
}

function removeToolbar() { currentToolbar?.remove(); currentToolbar = null; }
function hideEdgePanel() { if (edgePanel) edgePanel.hidden = true; }
function preventFocusLoss(event) { event.preventDefault(); }
function fileToBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '').split(',').pop()); reader.onerror = () => reject(new Error('No se pudo leer el archivo.')); reader.readAsDataURL(file); }); }
function clamp(value, min, max) { return max < min ? min : Math.min(max, Math.max(min, value)); }
function escapeHtml(value) { return String(value).replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#039;' }[char])); }
