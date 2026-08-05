(() => {
  const PANEL_SELECTOR = '.ikono-translator-panel';
  const SUBVIEW_SELECTOR = '.onoff-panel-subview';
  let observedPanel = null;
  let activeTrigger = null;

  installSafeReplacement();
  init();

  function init() {
    const panel = document.querySelector(PANEL_SELECTOR);
    if (!panel) {
      window.setTimeout(init, 200);
      return;
    }
    if (observedPanel === panel) return;
    observedPanel = panel;

    removeBlockingPanelHandler(panel);
    panel.addEventListener('mousedown', handlePanelMouseDown, true);
    panel.addEventListener('click', handlePanelClick, true);

    const observer = new MutationObserver(() => {
      enableFollowUpFields(panel);
      positionSideWindow(panel);
    });
    observer.observe(panel, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });

    window.addEventListener('resize', () => positionSideWindow(panel));
    window.addEventListener('scroll', () => positionSideWindow(panel), true);

    enableFollowUpFields(panel);
    positionSideWindow(panel);
  }

  function removeBlockingPanelHandler(panel) {
    try {
      if (typeof preventFocusLoss === 'function') panel.removeEventListener('mousedown', preventFocusLoss);
    } catch {
      // La extensión sigue funcionando aunque una versión anterior no exponga esta función.
    }
  }

  function handlePanelMouseDown(event) {
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) {
      event.stopPropagation();
      return;
    }
    if (event.target.closest('button')) event.preventDefault();
  }

  function handlePanelClick(event) {
    const trigger = event.target.closest('[data-action="templates"], [data-action="followups"]');
    if (trigger) {
      const subview = observedPanel?.querySelector(SUBVIEW_SELECTOR);
      const sameOpenTrigger = activeTrigger === trigger && Boolean(subview?.textContent.trim());
      if (sameOpenTrigger) {
        event.preventDefault();
        event.stopImmediatePropagation();
        subview.innerHTML = '';
        trigger.classList.remove('is-active');
        activeTrigger = null;
        positionSideWindow(observedPanel);
        return;
      }
      activeTrigger?.classList.remove('is-active');
      activeTrigger = trigger;
      activeTrigger.classList.add('is-active');
    }

    const closeButton = event.target.closest('[data-close-sub]');
    if (closeButton) {
      activeTrigger?.classList.remove('is-active');
      activeTrigger = null;
    }

    const addButton = event.target.closest('[data-add]');
    if (addButton) {
      window.setTimeout(() => {
        enableFollowUpFields(observedPanel);
        observedPanel.querySelector('[data-name]')?.focus();
        positionSideWindow(observedPanel);
      }, 0);
    }

    window.setTimeout(() => positionSideWindow(observedPanel), 0);
  }

  function enableFollowUpFields(panel) {
    panel.querySelectorAll('.onoff-follow-form input').forEach((input) => {
      if (input.dataset.onoffInputReady === 'true') return;
      input.dataset.onoffInputReady = 'true';

      ['mousedown', 'pointerdown', 'click', 'keydown', 'keyup', 'paste', 'contextmenu'].forEach((type) => {
        input.addEventListener(type, (event) => event.stopPropagation());
      });

      input.addEventListener('click', () => input.focus());
    });
  }

  function positionSideWindow(panel) {
    const subview = panel?.querySelector(SUBVIEW_SELECTOR);
    if (!subview || !subview.textContent.trim() || panel.hidden) {
      if (subview) resetSideWindow(subview);
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const triggerRect = activeTrigger?.isConnected ? activeTrigger.getBoundingClientRect() : panelRect;
    const gap = 10;
    const width = Math.min(360, window.innerWidth - 24);

    subview.style.position = 'fixed';
    subview.style.width = `${width}px`;
    subview.style.maxWidth = 'calc(100vw - 24px)';
    subview.style.maxHeight = 'calc(100vh - 16px)';
    subview.style.margin = '0';
    subview.style.zIndex = '2147483647';

    const measuredHeight = Math.min(subview.getBoundingClientRect().height || subview.scrollHeight || 420, window.innerHeight - 16);
    const fitsLeft = panelRect.left >= width + gap + 8;
    const fitsRight = window.innerWidth - panelRect.right >= width + gap + 8;

    let left;
    if (fitsLeft) left = panelRect.left - width - gap;
    else if (fitsRight) left = panelRect.right + gap;
    else left = clamp(panelRect.left, 8, window.innerWidth - width - 8);

    const top = clamp(triggerRect.top - 12, 8, window.innerHeight - measuredHeight - 8);
    subview.style.left = `${Math.round(left)}px`;
    subview.style.top = `${Math.round(top)}px`;
    subview.style.right = 'auto';
    subview.style.bottom = 'auto';
  }

  function resetSideWindow(subview) {
    subview.style.left = '';
    subview.style.top = '';
    subview.style.right = '';
    subview.style.bottom = '';
  }

  function installSafeReplacement() {
    try {
      replaceEditableSelection = function safeReplaceEditableSelection(text) {
        const replacement = sanitizeReplacement(text);
        if (!replacement) return false;

        if (lastTextInputSelection?.element?.isConnected) {
          const { element, start, end } = lastTextInputSelection;
          const nextValue = element.value.slice(0, start) + replacement + element.value.slice(end);
          element.focus();
          setNativeValue(element, nextValue);
          const caret = start + replacement.length;
          element.setSelectionRange?.(caret, caret);
          dispatchInputEvents(element, replacement);
          lastTextInputSelection = { element, start, end: caret };
          lastSelectedText = replacement;
          return true;
        }

        if (lastSelectionRange) {
          const range = lastSelectionRange.cloneRange();
          const editableRoot = findEditableContainer(range.commonAncestorContainer);
          if (!editableRoot?.isConnected) return false;

          editableRoot.focus();
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);

          let inserted = false;
          try {
            inserted = document.execCommand('insertText', false, replacement);
          } catch {
            inserted = false;
          }

          if (!inserted) {
            range.deleteContents();
            const node = document.createTextNode(replacement);
            range.insertNode(node);
            range.setStartAfter(node);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }

          dispatchInputEvents(editableRoot, replacement);
          lastSelectionRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
          lastSelectedText = replacement;
          return true;
        }

        return false;
      };
    } catch {
      // La función principal conserva su implementación si el navegador aísla el ámbito.
    }
  }

  function sanitizeReplacement(value) {
    return String(value || '')
      .replace(/\n\n(?:Texto reemplazado|Texto actualizado|No fue posible)[\s\S]*$/i, '')
      .trim();
  }

  function setNativeValue(element, value) {
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
  }

  function dispatchInputEvents(element, text) {
    try {
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertReplacementText',
        data: text
      }));
    } catch {
      element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  function findEditableContainer(node) {
    let element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
    while (element && element !== document.body) {
      if (element.isContentEditable) return element;
      element = element.parentElement;
    }
    return null;
  }

  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
})();
