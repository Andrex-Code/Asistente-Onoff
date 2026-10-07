const MAX_USER_PAGES = 20;
const MAX_TASK_PAGES = 20;
const CLOSED_STATUSES = new Set(['5', '7']);

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  try {
    const webhookUrl = normalizeWebhookUrl(process.env.BITRIX_WEBHOOK_URL);
    if (!webhookUrl) {
      return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada.' });
    }

    const ownerId = parseOwnerId(req.body?.ownerId);
    let owner;

    if (ownerId) {
      owner = await getUserById(webhookUrl, ownerId);
      if (!owner) return res.status(404).json({ ok: false, error: 'No se encontró el propietario seleccionado.' });
    } else {
      const query = parseName(req.body?.name);
      if (!query) {
        return res.status(400).json({ ok: false, error: 'Escriba el nombre del asesor que desea consultar.' });
      }

      const users = await listUsers(webhookUrl);
      const matches = matchUsers(users, query);

      if (!matches.length) {
        return res.status(404).json({ ok: false, error: 'No se encontró un usuario que coincida con la búsqueda.' });
      }

      const exact = matches.filter((user) => normalizeName(user.fullName) === normalizeName(query));
      if (exact.length === 1) owner = exact[0];
      else if (matches.length === 1) owner = matches[0];
      else {
        return res.status(200).json({
          ok: true,
          requiresSelection: true,
          users: matches.slice(0, 10).map(publicUser)
        });
      }
    }

    const taskResult = await listTasksByOwner(webhookUrl, owner.id);
    const openTasks = taskResult.tasks.filter((task) => !CLOSED_STATUSES.has(String(pick(task, 'status', 'STATUS') || '')));
    const responsibleIds = unique(openTasks.map((task) => pick(task, 'responsibleId', 'RESPONSIBLE_ID')).filter(Boolean));
    const responsibleUsers = await resolveUsers(webhookUrl, responsibleIds);
    const portalOrigin = new URL(webhookUrl).origin;

    const tasks = openTasks
      .map((task) => normalizeTask(task, owner, responsibleUsers, portalOrigin))
      .sort(compareTasks);

    return res.status(200).json({
      ok: true,
      owner: publicUser(owner),
      tasks,
      count: tasks.length,
      truncated: taskResult.truncated
    });
  } catch (error) {
    const message = String(error?.message || error || 'Error consultando tareas en Bitrix.');
    const status = /credencial|autoriz|access denied|insufficient_scope/i.test(message) ? 502 : 500;
    return res.status(status).json({ ok: false, error: cleanError(message) });
  }
};

async function listUsers(webhookUrl) {
  const users = [];
  let start = 0;

  for (let page = 0; page < MAX_USER_PAGES; page += 1) {
    const data = await callBitrixRaw(webhookUrl, 'user.get', {
      'FILTER[ACTIVE]': 'true',
      start
    });

    const batch = Array.isArray(data?.result) ? data.result : [];
    users.push(...batch);

    if (data?.next === undefined || data?.next === null || !batch.length) break;
    start = Number(data.next);
    if (!Number.isFinite(start)) break;
  }

  return users
    .map(normalizeUser)
    .filter((user) => user.id && user.fullName);
}

async function getUserById(webhookUrl, id) {
  const data = await callBitrixRaw(webhookUrl, 'user.get', { ID: id });
  const raw = Array.isArray(data?.result) ? data.result[0] : null;
  return raw ? normalizeUser(raw) : null;
}

function matchUsers(users, query) {
  const normalizedQuery = normalizeName(query);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  return users
    .map((user) => {
      const normalizedName = normalizeName(user.fullName);
      const nameTokens = normalizedName.split(' ').filter(Boolean);
      const containsAll = queryTokens.every((token) =>
        normalizedName.includes(token) || nameTokens.some((nameToken) => nameToken.startsWith(token))
      );
      if (!containsAll) return null;

      let score = 4;
      if (normalizedName === normalizedQuery) score = 0;
      else if (normalizedName.startsWith(normalizedQuery)) score = 1;
      else if (queryTokens.every((token) => nameTokens.some((nameToken) => nameToken.startsWith(token)))) score = 2;
      else if (normalizedName.includes(normalizedQuery)) score = 3;

      return { ...user, score };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || a.fullName.localeCompare(b.fullName, 'es'))
    .map(({ score, ...user }) => user);
}

async function listTasksByOwner(webhookUrl, ownerId) {
  const tasks = [];
  let start = 0;
  let truncated = false;

  for (let page = 0; page < MAX_TASK_PAGES; page += 1) {
    const data = await callBitrixRaw(webhookUrl, 'tasks.task.list', {
      'filter[CREATED_BY]': ownerId,
      'order[CHANGED_DATE]': 'DESC',
      'select[]': [
        'ID', 'TITLE', 'STATUS', 'RESPONSIBLE_ID', 'CREATED_BY', 'GROUP_ID',
        'DEADLINE', 'CREATED_DATE', 'CHANGED_DATE', 'PRIORITY', 'PARENT_ID',
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
    if (page === MAX_TASK_PAGES - 1) {
      truncated = true;
      break;
    }

    start = Number(data.next);
    if (!Number.isFinite(start)) break;
  }

  return { tasks: dedupeTasks(tasks), truncated };
}

async function resolveUsers(webhookUrl, ids) {
  const entries = await Promise.all(ids.map(async (id) => {
    try {
      const user = await getUserById(webhookUrl, id);
      return [String(id), user?.fullName || `Usuario ${id}`];
    } catch {
      return [String(id), `Usuario ${id}`];
    }
  }));
  return new Map(entries);
}

function normalizeUser(user) {
  const id = String(pick(user, 'ID', 'id') || '').trim();
  const name = String(pick(user, 'NAME', 'name') || '').trim();
  const lastName = String(pick(user, 'LAST_NAME', 'lastName') || '').trim();
  return {
    id,
    fullName: [name, lastName].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  };
}

function publicUser(user) {
  return { id: String(user.id), fullName: String(user.fullName) };
}

function normalizeTask(task, owner, users, portalOrigin) {
  const id = String(pick(task, 'id', 'ID') || '').trim();
  const groupId = String(pick(task, 'groupId', 'GROUP_ID') || '');
  const responsibleId = String(pick(task, 'responsibleId', 'RESPONSIBLE_ID') || '');
  const statusId = String(pick(task, 'status', 'STATUS') || '');
  const responsibleObject = pick(task, 'responsible', 'RESPONSIBLE');
  const responsibleName = String(responsibleObject?.name || responsibleObject?.NAME || '').trim();
  const url = groupId && groupId !== '0'
    ? `${portalOrigin}/workgroups/group/${encodeURIComponent(groupId)}/tasks/task/view/${encodeURIComponent(id)}/`
    : `${portalOrigin}/company/personal/user/0/tasks/task/view/${encodeURIComponent(id)}/`;

  return {
    id,
    title: String(pick(task, 'title', 'TITLE') || `Radicado ${id}`),
    statusId,
    status: taskStatus(statusId),
    owner: owner.fullName,
    responsible: responsibleName || (responsibleId ? users.get(responsibleId) || `Usuario ${responsibleId}` : 'No especificado'),
    priority: String(pick(task, 'priority', 'PRIORITY') || '1') === '2' ? 'Alta' : 'Normal',
    deadline: toIso(pick(task, 'deadline', 'DEADLINE')),
    createdAt: toIso(pick(task, 'createdDate', 'CREATED_DATE')),
    updatedAt: toIso(pick(task, 'changedDate', 'CHANGED_DATE')),
    parentId: pick(task, 'parentId', 'PARENT_ID'),
    url
  };
}

function compareTasks(a, b) {
  const aDeadline = dateValue(a.deadline);
  const bDeadline = dateValue(b.deadline);
  if (aDeadline && bDeadline && aDeadline !== bDeadline) return aDeadline - bDeadline;
  if (aDeadline && !bDeadline) return -1;
  if (!aDeadline && bDeadline) return 1;
  if (a.priority !== b.priority) return a.priority === 'Alta' ? -1 : 1;
  return dateValue(b.updatedAt) - dateValue(a.updatedAt);
}

function dedupeTasks(tasks) {
  const seen = new Set();
  return tasks.filter((task) => {
    const id = String(pick(task, 'id', 'ID') || '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function callBitrixRaw(webhookUrl, method, params = {}) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((entry) => body.append(key, String(entry)));
    else if (value !== undefined && value !== null && value !== '') body.append(key, String(value));
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

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

function parseOwnerId(value) {
  const text = String(value || '').trim();
  return /^\d{1,12}$/.test(text) ? text : '';
}

function parseName(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length >= 2 && text.length <= 80 ? text : '';
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function taskStatus(value) {
  return ({
    '1': 'Nueva',
    '2': 'Pendiente',
    '3': 'En progreso',
    '4': 'Pendiente de control',
    '5': 'Completada',
    '6': 'Diferida',
    '7': 'Rechazada'
  })[String(value)] || String(value || 'No especificado');
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
