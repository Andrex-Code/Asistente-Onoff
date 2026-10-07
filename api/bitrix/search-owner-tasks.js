const MAX_TASK_PAGES = 20;
const MAX_OWNER_LOOKUPS = 80;
const CLOSED_STATUSES = new Set(['5', '7']);

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  }

  try {
    const webhookUrl = normalizeWebhookUrl(process.env.BITRIX_WEBHOOK_URL);
    if (!webhookUrl) {
      return res.status(503).json({
        ok: false,
        error: 'La búsqueda de Bitrix no está configurada.'
      });
    }

    const ownerId = parseOwnerId(req.body?.ownerId);

    if (ownerId) {
      return respondWithOwnerTasks(webhookUrl, ownerId, res);
    }

    const query = parseName(req.body?.name);
    if (!query) {
      return res.status(400).json({
        ok: false,
        error: 'Escriba el nombre del asesor que desea consultar.'
      });
    }

    const discovery = await listTasks(webhookUrl, {});
    const openTasks = discovery.tasks.filter(isOpenTask);

    if (!openTasks.length) {
      return res.status(200).json({
        ok: true,
        requiresSelection: false,
        owner: null,
        tasks: [],
        count: 0,
        truncated: discovery.truncated
      });
    }

    const owners = await discoverOwnersFromTasks(webhookUrl, openTasks);
    const matches = matchOwners(owners, query);

    if (!matches.length) {
      return res.status(404).json({
        ok: false,
        error: 'No se encontró un propietario que coincida con la búsqueda.'
      });
    }

    const exact = matches.filter(
      (owner) => normalizeName(owner.fullName) === normalizeName(query)
    );

    if (exact.length === 1) {
      return respondWithOwnerTasks(webhookUrl, exact[0].id, res, exact[0].fullName);
    }

    if (matches.length === 1) {
      return respondWithOwnerTasks(webhookUrl, matches[0].id, res, matches[0].fullName);
    }

    return res.status(200).json({
      ok: true,
      requiresSelection: true,
      users: matches.slice(0, 10).map(publicOwner)
    });
  } catch (error) {
    const message = String(error?.message || error || 'Error consultando tareas en Bitrix.');
    const status = /credencial|autoriz|access denied|insufficient_scope|higher privileges/i.test(message)
      ? 502
      : 500;

    return res.status(status).json({
      ok: false,
      error: cleanError(message)
    });
  }
};

async function respondWithOwnerTasks(webhookUrl, ownerId, res, knownName = '') {
  const result = await listTasks(webhookUrl, {
    'filter[CREATED_BY]': ownerId
  });

  const openTasks = result.tasks.filter(isOpenTask);
  let ownerName = knownName;

  if (!ownerName) {
    const sample = openTasks[0] || result.tasks[0];
    if (sample) ownerName = await getCreatorNameFromTask(webhookUrl, sample);
  }

  ownerName = ownerName || `Usuario ${ownerId}`;

  const portalOrigin = new URL(webhookUrl).origin;
  const tasks = openTasks
    .map((task) => normalizeTask(task, ownerName, portalOrigin))
    .sort(compareTasks);

  return res.status(200).json({
    ok: true,
    requiresSelection: false,
    owner: {
      id: String(ownerId),
      fullName: ownerName
    },
    tasks,
    count: tasks.length,
    truncated: result.truncated
  });
}

async function discoverOwnersFromTasks(webhookUrl, tasks) {
  const samples = new Map();

  for (const task of tasks) {
    const ownerId = String(pick(task, 'createdBy', 'CREATED_BY') || '').trim();
    const taskId = String(pick(task, 'id', 'ID') || '').trim();

    if (ownerId && taskId && !samples.has(ownerId)) {
      samples.set(ownerId, task);
    }

    if (samples.size >= MAX_OWNER_LOOKUPS) break;
  }

  const entries = await Promise.all(
    [...samples.entries()].map(async ([ownerId, task]) => {
      const embedded = creatorNameFromTask(task);
      if (embedded) {
        return {
          id: ownerId,
          fullName: embedded
        };
      }

      try {
        const fullName = await getCreatorNameFromTask(webhookUrl, task);
        return fullName
          ? { id: ownerId, fullName }
          : null;
      } catch {
        return null;
      }
    })
  );

  return entries.filter(Boolean);
}

async function getCreatorNameFromTask(webhookUrl, task) {
  const embedded = creatorNameFromTask(task);
  if (embedded) return embedded;

  const taskId = String(pick(task, 'id', 'ID') || '').trim();
  if (!taskId) return '';

  const result = await callBitrix(webhookUrl, 'tasks.task.get', { taskId });
  const fullTask = result?.task || result;
  return creatorNameFromTask(fullTask);
}

function creatorNameFromTask(task) {
  const creator = pick(task, 'creator', 'CREATOR');
  const name = String(
    creator?.name ||
    creator?.NAME ||
    ''
  ).replace(/\s+/g, ' ').trim();

  return name;
}

function matchOwners(owners, query) {
  const normalizedQuery = normalizeName(query);
  const queryTokens = normalizedQuery.split(' ').filter(Boolean);

  return owners
    .map((owner) => {
      const normalizedName = normalizeName(owner.fullName);
      const nameTokens = normalizedName.split(' ').filter(Boolean);

      const matches = queryTokens.every(
        (token) =>
          normalizedName.includes(token) ||
          nameTokens.some((nameToken) => nameToken.startsWith(token))
      );

      if (!matches) return null;

      let score = 4;
      if (normalizedName === normalizedQuery) score = 0;
      else if (normalizedName.startsWith(normalizedQuery)) score = 1;
      else if (
        queryTokens.every((token) =>
          nameTokens.some((nameToken) => nameToken.startsWith(token))
        )
      ) score = 2;
      else if (normalizedName.includes(normalizedQuery)) score = 3;

      return { ...owner, score };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.fullName.localeCompare(b.fullName, 'es')
    )
    .map(({ score, ...owner }) => owner);
}

async function listTasks(webhookUrl, extraParams = {}) {
  const tasks = [];
  let start = 0;
  let truncated = false;

  for (let page = 0; page < MAX_TASK_PAGES; page += 1) {
    const data = await callBitrixRaw(webhookUrl, 'tasks.task.list', {
      ...extraParams,
      'order[CHANGED_DATE]': 'DESC',
      'select[]': [
        'ID',
        'TITLE',
        'STATUS',
        'RESPONSIBLE_ID',
        'CREATED_BY',
        'GROUP_ID',
        'DEADLINE',
        'CREATED_DATE',
        'CHANGED_DATE',
        'PRIORITY',
        'PARENT_ID',
        'RESPONSIBLE'
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

  return {
    tasks: dedupeTasks(tasks),
    truncated
  };
}

function normalizeTask(task, ownerName, portalOrigin) {
  const id = String(pick(task, 'id', 'ID') || '').trim();
  const groupId = String(pick(task, 'groupId', 'GROUP_ID') || '');
  const responsibleId = String(
    pick(task, 'responsibleId', 'RESPONSIBLE_ID') || ''
  );
  const statusId = String(pick(task, 'status', 'STATUS') || '');

  const responsibleObject = pick(task, 'responsible', 'RESPONSIBLE');
  const responsibleName = String(
    responsibleObject?.name ||
    responsibleObject?.NAME ||
    ''
  ).replace(/\s+/g, ' ').trim();

  const url =
    groupId && groupId !== '0'
      ? `${portalOrigin}/workgroups/group/${encodeURIComponent(groupId)}/tasks/task/view/${encodeURIComponent(id)}/`
      : `${portalOrigin}/company/personal/user/0/tasks/task/view/${encodeURIComponent(id)}/`;

  return {
    id,
    title: String(pick(task, 'title', 'TITLE') || `Radicado ${id}`),
    statusId,
    status: taskStatus(statusId),
    owner: ownerName,
    responsible:
      responsibleName ||
      (responsibleId ? `Usuario ${responsibleId}` : 'No especificado'),
    priority:
      String(pick(task, 'priority', 'PRIORITY') || '1') === '2'
        ? 'Alta'
        : 'Normal',
    deadline: toIso(pick(task, 'deadline', 'DEADLINE')),
    createdAt: toIso(pick(task, 'createdDate', 'CREATED_DATE')),
    updatedAt: toIso(pick(task, 'changedDate', 'CHANGED_DATE')),
    parentId: pick(task, 'parentId', 'PARENT_ID'),
    url
  };
}

function isOpenTask(task) {
  const statusId = String(pick(task, 'status', 'STATUS') || '');
  return !CLOSED_STATUSES.has(statusId);
}

function compareTasks(a, b) {
  const aDeadline = dateValue(a.deadline);
  const bDeadline = dateValue(b.deadline);

  if (aDeadline && bDeadline && aDeadline !== bDeadline) {
    return aDeadline - bDeadline;
  }

  if (aDeadline && !bDeadline) return -1;
  if (!aDeadline && bDeadline) return 1;

  if (a.priority !== b.priority) {
    return a.priority === 'Alta' ? -1 : 1;
  }

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

async function callBitrix(webhookUrl, method, params = {}) {
  const data = await callBitrixRaw(webhookUrl, method, params);
  return data?.result;
}

async function callBitrixRaw(webhookUrl, method, params = {}) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => body.append(key, String(entry)));
    } else if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      body.append(key, String(value));
    }
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${webhookUrl}${method}.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body,
      signal: controller.signal
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || data?.error) {
      throw new Error(
        data?.error_description ||
        data?.error ||
        `Bitrix respondió ${response.status}.`
      );
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Bitrix tardó demasiado en responder.');
    }

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
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

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

function publicOwner(owner) {
  return {
    id: String(owner.id),
    fullName: String(owner.fullName)
  };
}

function pick(object, ...keys) {
  for (const key of keys) {
    if (
      object?.[key] !== undefined &&
      object?.[key] !== null
    ) {
      return object[key];
    }
  }

  const entries = Object.entries(object || {});

  for (const key of keys) {
    const match = entries.find(
      ([name]) => name.toLowerCase() === String(key).toLowerCase()
    );

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
    return url.protocol === 'https:'
      ? `${url.origin}${url.pathname.replace(/\/+$/, '')}/`
      : '';
  } catch {
    return '';
  }
}

function cleanError(message) {
  if (/invalid credentials|expired|unauthor/i.test(message)) {
    return 'La credencial de Bitrix no es válida o fue regenerada.';
  }

  if (/access denied/i.test(message)) {
    return 'El usuario del webhook no tiene acceso a estas tareas.';
  }

  if (/insufficient_scope|higher privileges/i.test(message)) {
    return 'El webhook de Bitrix no tiene permisos suficientes para esta consulta.';
  }

  return message;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
