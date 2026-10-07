'use strict';

const { createHash } = require('node:crypto');
const OPEN_FIELDS = ['ID', 'TITLE', 'STATUS', 'CREATED_BY', 'RESPONSIBLE_ID', 'GROUP_ID', 'DEADLINE', 'CREATED_DATE', 'CHANGED_DATE', 'PRIORITY'];
const CLOSED = new Set(['5', '7']);
const TTL = { tasks: 45000, users: 300000, sac: 600000 };
const MAX_IDS = 30;
const MAX_PAGES = 100;

function failure(code, message, status = 502) {
  return Object.assign(new Error(message), { code, status });
}
function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
function excluded(task) { return /^tareas\s+de\s+proceso\b/i.test(String(task.title || task.TITLE || '').trim()); }
function pick(object, lower, upper) { return object?.[lower] ?? object?.[upper]; }
function parseIds(value) {
  const input = Array.isArray(value) ? value : value == null ? [] : [value];
  if (!input.length || input.length > MAX_IDS || input.some(id => !/^\d{1,12}$/.test(String(id)))) {
    throw failure('INVALID_OWNER', 'Seleccione un propietario v\u00e1lido.', 400);
  }
  return [...new Set(input.map(String))].sort((a, b) => Number(a) - Number(b));
}
function userRecord(user) {
  return {
    id: String(pick(user, 'id', 'ID') || ''),
    fullName: [pick(user, 'name', 'NAME'), pick(user, 'secondName', 'SECOND_NAME'), pick(user, 'lastName', 'LAST_NAME')].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  };
}
function groupUsers(users) {
  const groups = new Map();
  for (const user of users) {
    const key = normalize(user.fullName);
    if (!key || !/^\d{1,12}$/.test(user.id)) continue;
    const group = groups.get(key) || { id: user.id, fullName: user.fullName, ownerIds: [], openTaskCount: null };
    if (!group.ownerIds.includes(user.id)) group.ownerIds.push(user.id);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
}
function iso(value) { const n = value ? Date.parse(value) : NaN; return Number.isFinite(n) ? new Date(n).toISOString() : null; }

// The factory allows tests without credentials or live Bitrix data.
function createService({ webhookUrl, env = process.env, request, now = Date.now, metrics = () => {} }) {
  const cache = new Map(), pending = new Map(), knownUsers = new Map();
  const queue = [];
  let active = 0;
  const transport = request || httpRequest;
  async function limited(fn) {
    if (active >= 3) await new Promise(resolve => queue.push(resolve));
    else active += 1;
    try { return await fn(); }
    finally { const next = queue.shift(); if (next) next(); else active -= 1; }
  }
  async function call(method, params) {
    return limited(async () => {
      const started = now();
      const result = await transport(method, params);
      metrics({ method, durationMs: now() - started });
      return result;
    });
  }
  async function httpRequest(method, params) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) value.forEach(entry => body.append(key.endsWith('[]') ? key : key + '[]', String(entry)));
      else if (value != null) body.append(key, String(value));
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let response;
      try {
        response = await fetch(webhookUrl + method + '.json', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body, signal: AbortSignal.timeout(12000) });
      } catch (error) {
        if (/Timeout|Abort/i.test(error.name)) throw failure('BITRIX_TIMEOUT', 'Bitrix tard\u00f3 demasiado en responder. Intente nuevamente.', 504);
        throw failure('BITRIX_NETWORK', 'No fue posible conectar con Bitrix. Intente nuevamente.');
      }
      const data = await response.json().catch(() => null);
      if ((response.status === 429 || data?.error === 'QUERY_LIMIT_EXCEEDED') && attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 700));
        continue;
      }
      if (!response.ok || data?.error || !data) {
        const detail = String(data?.error_description || data?.error || '');
        if (/higher privileges|insufficient_scope/i.test(detail)) throw failure('BITRIX_SCOPE', 'El webhook necesita permiso de Usuarios y Tareas para realizar esta consulta.');
        if (/access denied/i.test(detail)) throw failure('BITRIX_ACCESS', 'El usuario del webhook no tiene acceso a esta informaci\u00f3n.');
        if (/invalid credentials|expired|unauthor/i.test(detail)) throw failure('BITRIX_CREDENTIALS', 'La credencial de Bitrix no es v\u00e1lida. Revise la configuraci\u00f3n del servidor.');
        throw failure('BITRIX_ERROR', 'Bitrix no pudo completar la consulta. Intente nuevamente.');
      }
      return data;
    }
    throw failure('BITRIX_RATE_LIMIT', 'Bitrix est\u00e1 limitando las consultas. Espere unos segundos.', 429);
  }
  async function memo(key, ttl, loader, force = false) {
    const hit = cache.get(key);
    if (!force && hit && now() - hit.at < ttl) return hit.value;
    // A concurrent refresh shares work instead of creating another API burst.
    if (pending.has(key)) return pending.get(key);
    const promise = loader().then(value => {
      if (cache.size >= 80) cache.delete(cache.keys().next().value);
      cache.delete(key);
      cache.set(key, { at: now(), value });
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  }
  function remember(raw) {
    const records = raw.filter(u => u.ACTIVE !== false && u.ACTIVE !== 'N').map(userRecord).filter(u => u.id && u.fullName);
    records.forEach(u => knownUsers.set(u.id, u.fullName));
    if (knownUsers.size > 1500) knownUsers.clear();
    return records;
  }
  async function listUsers(method, filter) {
    const users = [];
    let start = 0;
    for (let page = 0; page < 20; page += 1) {
      const data = await call(method, { ...filter, 'FILTER[ACTIVE]': 'true', 'FILTER[USER_TYPE]': 'employee', start });
      if (!Array.isArray(data.result)) throw failure('BITRIX_RESPONSE', 'Bitrix devolvi\u00f3 una lista de usuarios no v\u00e1lida.');
      users.push(...data.result);
      const next = data.next ?? data.result?.next;
      if (next == null) return remember(users);
      if (!Number.isFinite(Number(next)) || Number(next) <= start) throw failure('BITRIX_PAGING', 'Bitrix devolvi\u00f3 una paginaci\u00f3n no v\u00e1lida.');
      start = Number(next);
    }
    throw failure('TOO_MANY_USERS', 'La b\u00fasqueda es demasiado amplia. Escriba un nombre m\u00e1s completo.', 400);
  }
  async function search(name, force = false) {
    const query = String(name || '').replace(/\s+/g, ' ').trim();
    if (query.length < 2 || query.length > 80) throw failure('INVALID_NAME', 'Escriba entre 2 y 80 caracteres para buscar.', 400);
    const users = await memo('users:' + normalize(query), TTL.users, () => listUsers('user.get', { 'FILTER[NAME_SEARCH]': query }), force);
    const tokens = normalize(query).split(' ');
    const matches = groupUsers(users.filter(u => tokens.every(t => normalize(u.fullName).includes(t))));
    return { ok: true, requiresSelection: true, query, users: matches.slice(0, 30), moreMatches: matches.length > 30, updatedAt: new Date(now()).toISOString() };
  }
  async function sac(force = false) {
    return memo('sac', TTL.sac, async () => {
      let users, source;
      const manual = String(env.BITRIX_SAC_OWNER_IDS || '').split(/[\s,;]+/).filter(Boolean);
      const departments = String(env.BITRIX_SAC_DEPARTMENT_IDS || '').split(/[\s,;]+/).filter(Boolean);
      if (manual.length) {
        users = await listUsers('user.get', { 'FILTER[ID]': parseIds(manual) });
        source = 'Equipo SAC configurado por identificadores';
      } else if (departments.length) {
        users = await listUsers('user.get', { 'FILTER[UF_DEPARTMENT]': parseIds(departments) });
        source = 'Departamentos SAC configurados en Bitrix';
      } else {
        // Search by department, not job title or examples from the UI.
        const names = String(env.BITRIX_SAC_DEPARTMENT_NAMES || 'SAC|Servicio al cliente').split('|').map(v => v.trim()).filter(Boolean).slice(0, 4);
        const lists = await Promise.all(names.map(name => listUsers('user.search', { 'FILTER[UF_DEPARTMENT_NAME]': name })));
        users = lists.flat();
        source = 'Departamentos de Bitrix: ' + names.join(' / ');
      }
      const grouped = groupUsers(users);
      return { ok: true, users: grouped, source, updatedAt: new Date(now()).toISOString(), warning: grouped.length ? null : 'No se encontr\u00f3 un departamento SAC. Configure BITRIX_SAC_DEPARTMENT_IDS o BITRIX_SAC_OWNER_IDS; la b\u00fasqueda por nombre sigue disponible.' };
    }, force);
  }
  async function snapshot(ownerId, force = false) {
    return memo('tasks:' + ownerId, TTL.tasks, async () => {
      let start = 0, pages = 0;
      const tasks = new Map();
      const started = now();
      for (; pages < MAX_PAGES; pages += 1) {
        if (now() - started > 35000) throw failure('BITRIX_TIMEOUT', 'La consulta de tareas tard\u00f3 demasiado. No se muestran conteos incompletos.', 504);
        const data = await call('tasks.task.list', {
          'filter[CREATED_BY]': ownerId,
          'filter[!REAL_STATUS]': [5, 7],
          'order[ID]': 'ASC',
          'select[]': OPEN_FIELDS,
          start
        });
        const batch = data?.result?.tasks;
        if (!Array.isArray(batch)) throw failure('BITRIX_RESPONSE', 'Bitrix devolvi\u00f3 una lista de tareas no v\u00e1lida.');
        for (const task of batch) {
          const id = String(pick(task, 'id', 'ID') || '');
          const owner = String(pick(task, 'createdBy', 'CREATED_BY') || '');
          const status = String(pick(task, 'status', 'STATUS') || '');
          if (owner !== ownerId) throw failure('BITRIX_FILTER', 'Bitrix no aplic\u00f3 correctamente el filtro de propietario.');
          if (id && status && !CLOSED.has(status) && !excluded(task)) tasks.set(id, task);
        }
        const next = data.next ?? data.result?.next;
        if (next == null) {
          metrics({ phase: 'owner-tasks', pages: pages + 1, retained: tasks.size, durationMs: now() - started });
          return { tasks: [...tasks.values()], updatedAt: new Date(now()).toISOString(), complete: true };
        }
        if (!batch.length || !Number.isFinite(Number(next)) || Number(next) <= start) throw failure('BITRIX_PAGING', 'Bitrix devolvi\u00f3 una paginaci\u00f3n incompleta. Intente nuevamente.');
        start = Number(next);
      }
      throw failure('TOO_MANY_TASKS', 'El propietario supera el l\u00edmite de esta consulta. No se muestran conteos parciales.');
    }, force);
  }
  async function snapshots(ids, force) { return Promise.all(ids.map(id => snapshot(id, force))); }
  async function counts(groups, force = false) {
    if (!Array.isArray(groups) || !groups.length || groups.length > 6) throw failure('INVALID_GROUPS', 'Consulte de 1 a 6 propietarios por bloque.', 400);
    const parsed = groups.map(group => ({ id: String(group.id || ''), ownerIds: parseIds(group.ownerIds || group.id) }));
    const users = await Promise.all(parsed.map(async group => {
      try {
        const rows = await snapshots(group.ownerIds, force);
        const tasks = new Map(rows.flatMap(row => row.tasks).map(t => [String(pick(t, 'id', 'ID')), t]));
        return { ...group, openTaskCount: tasks.size, updatedAt: rows.map(r => r.updatedAt).sort()[0] };
      } catch (error) {
        return { ...group, openTaskCount: null, error: error.message, code: error.code || 'BITRIX_ERROR' };
      }
    }));
    return { ok: true, users };
  }
  async function tasks(idsValue, force = false) {
    const ids = parseIds(idsValue);
    const rows = await snapshots(ids, force);
    const raw = [...new Map(rows.flatMap(r => r.tasks).map(t => [String(pick(t, 'id', 'ID')), t])).values()];
    const missing = new Set(ids.filter(id => !knownUsers.has(id)));
    for (const task of raw) {
      const responsibleId = String(pick(task, 'responsibleId', 'RESPONSIBLE_ID') || '');
      const embedded = task.responsible?.name || task.RESPONSIBLE?.NAME;
      if (responsibleId && embedded) knownUsers.set(responsibleId, embedded);
      else if (responsibleId && !knownUsers.has(responsibleId)) missing.add(responsibleId);
    }
    // Resolve only missing names, in one filtered request per block, not one request per task.
    const missingIds = [...missing];
    for (let offset = 0; offset < missingIds.length; offset += MAX_IDS) {
      await listUsers('user.get', { 'FILTER[ID]': missingIds.slice(offset, offset + MAX_IDS) }).catch(() => {});
    }
    const ownerNames = [...new Set(ids.map(id => knownUsers.get(id)).filter(Boolean))];
    const fullName = ownerNames.length === 1 ? ownerNames[0] : ownerNames.length ? ownerNames.join(' / ') : 'Propietario seleccionado';
    const origin = new URL(webhookUrl).origin;
    const normalized = raw.map(task => {
      const id = String(pick(task, 'id', 'ID'));
      const group = String(pick(task, 'groupId', 'GROUP_ID') || '0');
      const ownerId = String(pick(task, 'createdBy', 'CREATED_BY'));
      const responsibleId = String(pick(task, 'responsibleId', 'RESPONSIBLE_ID') || '');
      const statusId = String(pick(task, 'status', 'STATUS'));
      return { id, title: String(pick(task, 'title', 'TITLE') || 'Tarea #' + id), statusId,
        status: ({ 1: 'Nueva', 2: 'Pendiente', 3: 'En progreso', 4: 'Pendiente de control', 6: 'Diferida' })[statusId] || 'Abierta',
        ownerId, owner: knownUsers.get(ownerId) || fullName,
        responsible: task.responsible?.name || knownUsers.get(responsibleId) || (responsibleId ? 'Usuario ' + responsibleId : 'No especificado'),
        priority: String(pick(task, 'priority', 'PRIORITY')) === '2' ? 'Alta' : 'Normal',
        deadline: iso(pick(task, 'deadline', 'DEADLINE')), createdAt: iso(pick(task, 'createdDate', 'CREATED_DATE')), updatedAt: iso(pick(task, 'changedDate', 'CHANGED_DATE')),
        url: group !== '0' ? `${origin}/workgroups/group/${encodeURIComponent(group)}/tasks/task/view/${encodeURIComponent(id)}/` : `${origin}/company/personal/user/0/tasks/task/view/${encodeURIComponent(id)}/`
      };
    });
    return { ok: true, requiresSelection: false, owner: { id: ids[0], ownerIds: ids, fullName }, tasks: normalized, count: normalized.length, complete: true, updatedAt: rows.map(r => r.updatedAt).sort()[0], cacheTtlSeconds: TTL.tasks / 1000 };
  }
  async function execute(body = {}) {
    const force = body.force === true;
    switch (body.action) {
      case 'sac': return sac(force);
      case 'search': return search(body.name, force);
      case 'counts': return counts(body.groups, force);
      case 'tasks': return tasks(body.ownerIds || body.ownerId, force);
      case undefined: { // Compatible with already installed 1.8.0 clients.
        if (body.ownerIds || body.ownerId) return tasks(body.ownerIds || body.ownerId, force);
        const found = await search(body.name, force);
        if (found.users.length === 1) return tasks(found.users[0].ownerIds, force);
        for (let i = 0; i < found.users.length; i += 6) {
          const result = await counts(found.users.slice(i, i + 6), force);
          result.users.forEach(row => Object.assign(found.users.find(u => u.id === row.id), row));
        }
        return found;
      }
      default: throw failure('INVALID_ACTION', 'Acci\u00f3n de consulta no permitida.', 400);
    }
  }
  return { execute };
}
let service, configKey;
function getService(webhookUrl) {
  const key = createHash('sha256').update(webhookUrl + JSON.stringify([process.env.BITRIX_SAC_OWNER_IDS, process.env.BITRIX_SAC_DEPARTMENT_IDS, process.env.BITRIX_SAC_DEPARTMENT_NAMES])).digest('hex');
  if (key !== configKey) {
    configKey = key;
    service = createService({ webhookUrl, metrics: event => console.info(JSON.stringify({ component: 'followups', ...event })) });
  }
  return service;
}
module.exports = { createService, getService, groupUsers, parseIds, excluded };
