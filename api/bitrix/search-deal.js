const DEFAULT_TC_FIELD = 'UF_CRM_1642606760058';
const MAX_RESULTS = 10;

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  try {
    const webhookUrl = normalizeWebhookUrl(process.env.BITRIX_WEBHOOK_URL);
    if (!webhookUrl) {
      return res.status(503).json({
        ok: false,
        error: 'La búsqueda de Bitrix todavía no está configurada en el servidor.'
      });
    }

    const tc = parseTc(req.body?.tc);
    if (!tc) {
      return res.status(400).json({
        ok: false,
        error: 'Ingrese una TC válida, por ejemplo TC5900 o 5900.'
      });
    }

    const tcField = String(process.env.BITRIX_TC_FIELD || DEFAULT_TC_FIELD).trim();
    if (!/^UF_CRM_[A-Z0-9_]+$/i.test(tcField)) {
      throw new Error('BITRIX_TC_FIELD no tiene un formato válido.');
    }

    const rawItems = await findDeals(webhookUrl, tcField, tc);
    if (!rawItems.length) {
      return res.status(200).json({ ok: true, tc, count: 0, deals: [] });
    }

    const records = rawItems
      .map(unwrapRecord)
      .filter((item) => item && typeof item === 'object')
      .slice(0, MAX_RESULTS);

    const validRecords = records.filter((item) => String(pick(item, 'ID', 'id') || '').trim());
    if (!validRecords.length) {
      throw new Error('Bitrix encontró la TC, pero no devolvió el identificador de la negociación.');
    }

    const context = await loadContext(webhookUrl, validRecords);
    const portalOrigin = new URL(webhookUrl).origin;
    const deals = validRecords.map((item) => normalizeDeal(item, tc, tcField, context, portalOrigin));

    return res.status(200).json({
      ok: true,
      tc,
      count: deals.length,
      deals
    });
  } catch (error) {
    const message = cleanBitrixError(error);
    const status = /credencial|autoriz|access denied|invalid/i.test(message) ? 502 : 500;
    return res.status(status).json({ ok: false, error: message });
  }
};

async function findDeals(webhookUrl, tcField, tc) {
  let legacyError = null;

  try {
    const deals = await callBitrix(webhookUrl, 'crm.deal.list', {
      [`filter[${tcField}]`]: tc,
      'select[]': [
        'ID',
        'TITLE',
        'STAGE_ID',
        'CATEGORY_ID',
        'COMPANY_ID',
        'CONTACT_ID',
        'ASSIGNED_BY_ID',
        'DATE_CREATE',
        'DATE_MODIFY',
        tcField
      ],
      'order[DATE_MODIFY]': 'DESC',
      start: 0
    });

    if (Array.isArray(deals) && deals.length) return deals;
  } catch (error) {
    legacyError = error;
  }

  try {
    const result = await callBitrix(webhookUrl, 'crm.item.list', {
      entityTypeId: 2,
      useOriginalUfNames: 'Y',
      [`filter[${tcField}]`]: tc,
      'select[]': [
        'id',
        'title',
        'stageId',
        'categoryId',
        'companyId',
        'contactId',
        'assignedById',
        'dateCreate',
        'dateModify',
        tcField
      ],
      start: 0
    });

    return Array.isArray(result?.items) ? result.items : [];
  } catch (error) {
    throw legacyError || error;
  }
}

async function loadContext(webhookUrl, items) {
  const assignedIds = unique(items.map((item) => pick(item, 'ASSIGNED_BY_ID', 'assignedById')).filter(Boolean));
  const companyIds = unique(items.map((item) => pick(item, 'COMPANY_ID', 'companyId')).filter(Boolean));
  const contactIds = unique(items.map((item) => pick(item, 'CONTACT_ID', 'contactId')).filter(Boolean));
  const categories = uniqueNumbers(items.map((item) => pick(item, 'CATEGORY_ID', 'categoryId')));

  const [users, companies, contacts, stages] = await Promise.all([
    fetchUsers(webhookUrl, assignedIds),
    fetchCompanies(webhookUrl, companyIds),
    fetchContacts(webhookUrl, contactIds),
    fetchStages(webhookUrl, categories)
  ]);

  return { users, companies, contacts, stages };
}

async function fetchUsers(webhookUrl, ids) {
  const map = new Map();
  await Promise.all(ids.map(async (id) => {
    try {
      const result = await callBitrix(webhookUrl, 'user.get', { ID: id });
      const user = Array.isArray(result) ? result[0] : null;
      if (!user) return;
      const name = [user.NAME, user.LAST_NAME].filter(Boolean).join(' ').trim();
      map.set(String(id), name || `Usuario ${id}`);
    } catch {
      // El ID seguirá visible si el webhook no tiene permiso para leer usuarios.
    }
  }));
  return map;
}

async function fetchCompanies(webhookUrl, ids) {
  const map = new Map();
  await Promise.all(ids.map(async (id) => {
    try {
      const company = await callBitrix(webhookUrl, 'crm.company.get', { id });
      if (company) map.set(String(id), String(company.TITLE || company.title || `Empresa ${id}`));
    } catch {
      // El ID seguirá visible si no puede resolverse el nombre.
    }
  }));
  return map;
}

async function fetchContacts(webhookUrl, ids) {
  const map = new Map();
  await Promise.all(ids.map(async (id) => {
    try {
      const contact = await callBitrix(webhookUrl, 'crm.contact.get', { id });
      if (!contact) return;
      const name = [contact.NAME || contact.name, contact.LAST_NAME || contact.lastName].filter(Boolean).join(' ').trim();
      map.set(String(id), name || `Contacto ${id}`);
    } catch {
      // El ID seguirá visible si no puede resolverse el nombre.
    }
  }));
  return map;
}

async function fetchStages(webhookUrl, categories) {
  const map = new Map();
  await Promise.all(categories.map(async (categoryId) => {
    const entityId = categoryId > 0 ? `DEAL_STAGE_${categoryId}` : 'DEAL_STAGE';
    try {
      const result = await callBitrix(webhookUrl, 'crm.status.list', {
        'filter[ENTITY_ID]': entityId,
        'select[]': ['STATUS_ID', 'NAME', 'SORT']
      });
      if (!Array.isArray(result)) return;
      result.forEach((stage) => {
        const stageId = String(stage.STATUS_ID || stage.statusId || '');
        if (stageId) map.set(`${categoryId}:${stageId}`, String(stage.NAME || stage.name || stageId));
      });
    } catch {
      // Se mostrará el código de etapa cuando Bitrix no permita resolver el nombre.
    }
  }));
  return map;
}

function normalizeDeal(item, requestedTc, tcField, context, portalOrigin) {
  const id = String(pick(item, 'ID', 'id') || '').trim();
  const title = String(pick(item, 'TITLE', 'title') || `Negociación ${id}`).trim();
  const stageId = String(pick(item, 'STAGE_ID', 'stageId') || '').trim();
  const categoryId = Number(pick(item, 'CATEGORY_ID', 'categoryId') || 0);
  const assignedById = String(pick(item, 'ASSIGNED_BY_ID', 'assignedById') || '').trim();
  const companyId = String(pick(item, 'COMPANY_ID', 'companyId') || '').trim();
  const contactId = String(pick(item, 'CONTACT_ID', 'contactId') || '').trim();
  const storedTc = String(readCustomField(item, tcField) || requestedTc).trim();

  const client = companyId
    ? context.companies.get(companyId) || `Empresa ${companyId}`
    : contactId
      ? context.contacts.get(contactId) || `Contacto ${contactId}`
      : 'No especificado';

  return {
    id,
    tc: storedTc || requestedTc,
    title,
    stageId,
    stage: context.stages.get(`${categoryId}:${stageId}`) || stageId || 'No especificado',
    client,
    responsible: assignedById ? context.users.get(assignedById) || `Usuario ${assignedById}` : 'No especificado',
    createdAt: toIsoOrNull(pick(item, 'DATE_CREATE', 'dateCreate')),
    updatedAt: toIsoOrNull(pick(item, 'DATE_MODIFY', 'dateModify')),
    url: `${portalOrigin}/crm/deal/details/${encodeURIComponent(id)}/`
  };
}

function unwrapRecord(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.item && typeof value.item === 'object') return value.item;
  if (value.fields && typeof value.fields === 'object') return value.fields;
  if (value.deal && typeof value.deal === 'object') return value.deal;
  return value;
}

async function callBitrix(webhookUrl, method, params = {}) {
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
      const detail = data?.error_description || data?.error || `Bitrix respondió ${response.status}.`;
      throw new Error(detail);
    }
    return data?.result;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Bitrix tardó demasiado en responder. Intente nuevamente.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseTc(value) {
  const match = String(value || '').match(/^\s*(?:TC\s*[-:]?\s*)?(\d+)\s*$/i);
  return match ? match[1] : '';
}

function normalizeWebhookUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}/`;
  } catch {
    return '';
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

function readCustomField(object, apiName) {
  const camelName = String(apiName)
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, character) => character.toUpperCase());
  return pick(object, apiName, apiName.toLowerCase(), camelName);
}

function unique(values) {
  return [...new Set(values.map(String).filter(Boolean))];
}

function uniqueNumbers(values) {
  const numbers = values.map((value) => Number(value || 0)).filter((value) => Number.isFinite(value) && value >= 0);
  return [...new Set(numbers.length ? numbers : [0])];
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanBitrixError(error) {
  const message = String(error?.message || error || 'Error consultando Bitrix.');
  if (/invalid credentials|expired|unauthor/i.test(message)) return 'La credencial de Bitrix no es válida o fue regenerada. Actualice BITRIX_WEBHOOK_URL en Vercel.';
  if (/access denied|insufficient_scope/i.test(message)) return 'El webhook no tiene permisos suficientes para consultar CRM.';
  return message;
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
