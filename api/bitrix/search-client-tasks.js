const DEFAULT_TC_FIELD = 'UF_CRM_1642606760058';
const MAX_PAGES = 10;
const CLOSED_STATUSES = new Set(['5', '7']);

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const previewGet = req.method === 'GET' && process.env.VERCEL_ENV !== 'production';
  if (req.method !== 'POST' && !previewGet) {
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const webhookUrl = normalizeWebhookUrl(process.env.BITRIX_WEBHOOK_URL);
    if (!webhookUrl) {
      return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada.' });
    }

    const tc = parseTc(previewGet ? req.query?.tc : req.body?.tc);
    if (!tc) return res.status(400).json({ ok: false, error: 'Ingrese una TC válida.' });

    const tcField = String(process.env.BITRIX_TC_FIELD || DEFAULT_TC_FIELD).trim();
    const deals = await findDeals(webhookUrl, tcField, tc);
    const bindings = buildCrmBindings(deals);
    const taskGroups = await Promise.all([
      ...bindings.map((binding) => listTasks(webhookUrl, { 'filter[UF_CRM_TASK]': binding })),
      listTasks(webhookUrl, { 'filter[%TITLE]': `TC${tc}` })
    ]);

    const tasks = dedupeTasks(taskGroups.flat())
      .filter((task) => isRelatedTask(task, bindings, tc));

    const userIds = unique(tasks.map((task) => task.responsibleId || task.RESPONSIBLE_ID).filter(Boolean));
    const users = await resolveUsers(webhookUrl, userIds);
    const portalOrigin = new URL(webhookUrl).origin;
    const normalized = tasks.map((task) => normalizeTask(task, users, portalOrigin));

    const open = normalized
      .filter((task) => !CLOSED_STATUSES.has(task.statusId))
      .sort(compareOpenTasks);

    const closed = normalized
      .filter((task) => CLOSED_STATUSES.has(task.statusId))
      .sort((a, b) => dateValue(b.closedAt || b.updatedAt) - dateValue(a.closedAt || a.updatedAt));

    return res.status(200).json({
      ok: true,
      tc,
      open: open.slice(0, 3),
      recentClosed: closed.slice(0, 2),
      counts: { open: open.length, closed: closed.length }
    });
  } catch (error) {
    const message = String(error?.message || error || 'Error consultando tareas en Bitrix.');
    const status = /credencial|autoriz|access denied|insufficient_scope/i.test(message) ? 502 : 500;
    return res.status(status).json({ ok: false, error: cleanError(message) });
  }
};

async function findDeals(webhookUrl, tcField, tc) {
  try {
    const result = await callBitrix(webhookUrl, 'crm.deal.list', {
      [`filter[${tcField}]`]: tc,
      'select[]': ['ID', 'COMPANY_ID', 'CONTACT_ID', tcField],
      'order[DATE_MODIFY]': 'DESC',
      start: 0
    });
    if (Array.isArray(result) && result.length) return result;
  } catch {
    // CRM Item fallback below.
  }

  const result = await callBitrix(webhookUrl, 'crm.item.list', {
    entityTypeId: 2,
    useOriginalUfNames: 'Y',
    [`filter[${tcField}]`]: tc,
    'select[]': ['id', 'companyId', 'contactId', tcField],
    start: 0
  });
  return Array.isArray(result?.items) ? result.items : [];
}

function buildCrmBindings(deals) {
  const bindings = new Set();
  for (const deal of deals) {
    const id = pick(deal, 'ID', 'id');
    const companyId = pick(deal, 'COMPANY_ID', 'companyId');
    const contactId = pick(deal, 'CONTACT_ID', 'contactId');
    if (id) bindings.add(`D_${id}`);
    if (companyId && String(companyId) !== '0') bindings.add(`CO_${companyId}`);
    if (contactId && String(contactId) !== '0') bindings.add(`C_${contactId}`);
  }
  return [...bindings];
}

async function listTasks(webhookUrl, extraParams = {}) {
  const tasks = [];
  let start = 0;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const data = await callBitrixRaw(webhookUrl, 'tasks.task.list', {
      ...extraParams,
      'order[CHANGED_DATE]': 'DESC',
      'select[]': [
        'ID', 'TITLE', 'STATUS', 'RESPONSIBLE_ID', 'CREATED_BY', 'GROUP_ID',
        'DEADLINE', 'CREATED_DATE', 'CHANGED_DATE', 'CLOSED_DATE', 'PRIORITY',
        'UF_CRM_TASK', 'RESPONSIBLE'
      ],
      start
    });

    const batch = Array.isArray(data?.result?.tasks)
      ? data.result.tasks
      : Array.isArray(data?.result)
        ? data.result
        : [];

    tasks.push(...batch);
    if (data?.next === undefined || data?.next === null || !batch.length) break;
    start = Number(data.next);
    if (!Number.isFinite(start)) break;
  }

  return tasks;
}

function isRelatedTask(task, bindings, tc) {
  const crm = Array.isArray(task.ufCrmTask)
    ? task.ufCrmTask.map(String)
    : Array.isArray(task.UF_CRM_TASK)
      ? task.UF_CRM_TASK.map(String)
      : [];
  if (crm.some((value) => bindings.includes(value))) return true;
  return taskMentionsTc(task.title || task.TITLE, tc);
}

function taskMentionsTc(title, tc) {
  const escaped = String(tc).replace(/[.*+?^$()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|\\b)TC\\s*[-:]?\\s*${escaped}(?![A-Z0-9-])`, 'i').test(String(title || ''));
}

function dedupeTasks(tasks) {
  const seen = new Set();
  return tasks.filter((task) => {
    const id = String(task?.id || task?.ID || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function resolveUsers(webhookUrl, ids) {
  const entries = await Promise.all(ids.map(async (id) => {
    try {
      const result = await callBitrix(webhookUrl, 'user.get', { ID: id });
      const user = Array.isArray(result) ? result[0] : null;
      const name = [user?.NAME, user?.LAST_NAME].filter(Boolean).join(' ').trim();
      return [String(id), name || `Usuario ${id}`];
    } catch {
      return [String(id), `Usuario ${id}`];
    }
  }));
  return new Map(entries);
}

function normalizeTask(task, users, portalOrigin) {
  const id = String(task.id || task.ID || '').trim();
  const groupId = String(task.groupId || task.GROUP_ID || '');
  const responsibleId = String(task.responsibleId || task.RESPONSIBLE_ID || '');
  const statusId = String(task.status || task.STATUS || '');
  const responsibleName = String(task.responsible?.name || task.RESPONSIBLE?.name || '').trim();
  const url = groupId && groupId !== '0'
    ? `${portalOrigin}/workgroups/group/${encodeURIComponent(groupId)}/tasks/task/view/${encodeURIComponent(id)}/`
    : `${portalOrigin}/company/personal/user/0/tasks/task/view/${encodeURIComponent(id)}/`;

  return {
    id,
    title: String(task.title || task.TITLE || `Radicado ${id}`),
    statusId,
    status: taskStatus(statusId),
    responsible: responsibleName || (responsibleId ? users.get(responsibleId) || `Usuario ${responsibleId}` : 'No especificado'),
    priority: String(task.priority || task.PRIORITY || '1') === '2' ? 'Alta' : 'Normal',
    deadline: toIso(task.deadline || task.DEADLINE),
    createdAt: toIso(task.createdDate || task.CREATED_DATE),
    updatedAt: toIso(task.changedDate || task.CHANGED_DATE),
    closedAt: toIso(task.closedDate || task.CLOSED_DATE),
    url
  };
}

function compareOpenTasks(a, b) {
  if (a.priority !== b.priority) return a.priority === 'Alta' ? -1 : 1;
  const aDeadline = dateValue(a.deadline);
  const bDeadline = dateValue(b.deadline);
  if (aDeadline && bDeadline && aDeadline !== bDeadline) return aDeadline - bDeadline;
  if (aDeadline && !bDeadline) return -1;
  if (!aDeadline && bDeadline) return 1;
  return dateValue(b.updatedAt) - dateValue(a.updatedAt);
}

async function callBitrix(webhookUrl, method, params = {}) {
  const data = await callBitrixRaw(webhookUrl, method, params);
  return data?.result;
}

async function callBitrixRaw(webhookUrl, method, params = {}) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((entry) => body.append(key, String(entry)));
    else if (value !== undefined && value !== null && value !== '') body.append(key, String(value));
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${webhookUrl}${method}.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
      signal: controller.signal
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.error) {
      throw new Error(data?.error_description || data?.error || `Bitrix respondió ${response.status}.`);
    }
    return data;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Bitrix tardó demasiado en responder.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function pick(object, ...keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object?.[key] !== null) return object[key];
  }
  const entries = Object.entries(object || {});
  for (const key of keys) {
    const match = entries.find(([name]) => name.toLowerCase() === String(key).toLowerCase());
    if (match) return match[1];
  }
  return null;
}

function parseTc(value) {
  const match = String(value || '').trim().toUpperCase().match(/^(?:TC\s*[-:]?\s*)?(\d+(?:-[A-Z])?)$/i);
  return match ? match[1].replace(/\s+/g, '') : '';
}

function taskStatus(value) {
  return ({ '1': 'Nueva', '2': 'Pendiente', '3': 'En progreso', '4': 'Pendiente de control', '5': 'Completada', '6': 'Diferida', '7': 'Rechazada' })[String(value)] || String(value || 'No especificado');
}

function unique(values) {
  return [...new Set(values.map(String).filter(Boolean))];
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function dateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function normalizeWebhookUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return url.protocol === 'https:' ? `${url.origin}${url.pathname.replace(/\/+$/, '')}/` : '';
  } catch {
    return '';
  }
}

function cleanError(message) {
  if (/invalid credentials|expired|unauthor/i.test(message)) return 'La credencial de Bitrix no es válida o fue regenerada.';
  if (/access denied|insufficient_scope/i.test(message)) return 'El webhook no tiene permisos suficientes para consultar tareas.';
  return message;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
