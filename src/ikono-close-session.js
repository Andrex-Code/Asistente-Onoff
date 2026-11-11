/*
 * Motor de sesión para el futuro cierre iKono -> Bitrix.
 * Sin I/O: no lee conversaciones, no llama a IA y no crea tareas.
 * Compatible con content scripts y pruebas Node.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ONOFFIkonoCloseSession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MAX_SESSIONS = 6;
  const MAX_TEXT_LENGTH = 6000;

  function clean(value, limit = MAX_TEXT_LENGTH) {
    return String(value ?? '').trim().slice(0, limit);
  }

  function required(value, label) {
    const text = clean(value, 500);
    if (!text) throw new Error(label + ' requerido.');
    return text;
  }

  function copy(item) {
    return item ? { ...item, classification: { ...item.classification } } : null;
  }

  function createStore(options = {}) {
    const maximum = Number.isInteger(options.maxSessions) && options.maxSessions > 0
      ? options.maxSessions : MAX_SESSIONS;
    const sessions = new Map();

    function find(id) {
      const key = required(id, 'Identificador de conversación');
      const item = sessions.get(key);
      if (!item) throw new Error('No existe una sesión activa para esta conversación.');
      return item;
    }

    function start({ conversationId, messageCount = 0, coverage = 'unknown' }) {
      const id = required(conversationId, 'Identificador de conversación');
      if (sessions.has(id)) return copy(sessions.get(id));
      if (sessions.size >= maximum) {
        throw new Error('Se alcanzó el máximo de sesiones en memoria; cierre una sesión anterior.');
      }
      const item = {
        conversationId: id,
        messageCount: Number.isSafeInteger(messageCount) && messageCount >= 0 ? messageCount : 0,
        coverage: ['complete', 'partial', 'unknown'].includes(coverage) ? coverage : 'unknown',
        classification: { category: '', detail: '' },
        summary: '',
        confirmed: false,
        status: 'capturing',
        taskId: null,
        error: ''
      };
      sessions.set(id, item);
      return copy(item);
    }

    function classify({ conversationId, category, detail }) {
      const item = find(conversationId);
      if (item.confirmed || ['submitting', 'submitted'].includes(item.status)) {
        throw new Error('La tipificación está bloqueada después de confirmar el cierre.');
      }
      item.classification = {
        category: required(category, 'Tipificación'),
        detail: required(detail, 'Detalle de tipificación')
      };
      return copy(item);
    }

    function setSummary({ conversationId, summary }) {
      const item = find(conversationId);
      if (['submitting', 'submitted'].includes(item.status)) {
        throw new Error('El resumen ya está siendo registrado o fue registrado.');
      }
      item.summary = required(summary, 'Resumen');
      item.error = '';
      item.status = item.confirmed ? 'ready' : 'summary_ready';
      return copy(item);
    }

    function confirm({ conversationId }) {
      const item = find(conversationId);
      if (!item.classification.category || !item.classification.detail) {
        throw new Error('Faltan tipificación o detalle; no se puede preparar el registro.');
      }
      if (item.confirmed) return copy(item);
      item.confirmed = true;
      item.status = item.summary ? 'ready' : 'waiting_summary';
      return copy(item);
    }

    function beginSubmit({ conversationId }) {
      const item = find(conversationId);
      if (!['ready', 'error'].includes(item.status) ||
          !item.confirmed || !item.summary || !item.classification.detail) return false;
      item.error = '';
      item.status = 'submitting';
      return true;
    }

    function succeed({ conversationId, taskId }) {
      const item = find(conversationId);
      if (item.status !== 'submitting') throw new Error('No hay registro en curso.');
      item.taskId = required(taskId, 'ID de tarea Bitrix');
      item.status = 'submitted';
      return copy(item);
    }

    function fail({ conversationId, message = 'No fue posible registrar la atención.' }) {
      const item = find(conversationId);
      if (item.status !== 'submitting') throw new Error('No hay registro en curso.');
      item.error = clean(message, 300);
      item.status = 'error';
      return copy(item);
    }

    function get(conversationId) {
      return copy(find(conversationId));
    }

    function clear(conversationId) {
      return sessions.delete(required(conversationId, 'Identificador de conversación'));
    }

    return { start, classify, setSummary, confirm, beginSubmit, succeed, fail, get, clear };
  }

  return { createStore };
});
