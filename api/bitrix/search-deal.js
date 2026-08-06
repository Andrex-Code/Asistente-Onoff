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

    const list = await callBitrix(webhookUrl, 'crm.item.list', {
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

    const rawItems = Array.isArray(list?.items) ? list.items.slice(0, MAX_RESULTS) : [];
    if (!rawItems.length) {
      return res.status(200).json({ ok: true, tc, count: 0, deals: [] });
    }

    const context = await loadContext(webhookUrl, rawItems);
    const portalOrigin = new URL(webhookUrl).origin;
    const deals = rawItems.map((item) => normalizeDeal(item, tc, tcField, context, portalOrigin));

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

async function loadContext(webhookUrl, items) {
  const assignedIds = unique(items.map((item) => pick(item, 'assignedById', 'ASSIGNED_BY_ID')).filter(Boolean));
  const companyIds = unique(items.map((item) => pick(item, 'companyId', 'COMPANY_ID')).filter(Boolean));
  const contactIds = unique(items.map((item) => pick(item, 'contactId', 'CONTACT_ID')).filter(Boolean));
  const categories = unique(items.map((item) => Number(pick(item, 'categoryId', 'CATEGORY_ID') || 0)));

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
      // La negociación sigue siendo útil aunque no pueda resolverse el nombre.
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
      // Se usa el identificador como respaldo.
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
      // Se usa el identificador como respaldo.
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
  const id = String(pick(item, 'id', 'ID') || '');
  const title = String(pick(item, 'title', 'TITLE') || `Negociación ${id}`).trim();
  const stageId = String(pick(item, 'stageId', 'STAGE_ID') || '').trim();
  const categoryId = Number(pick(item, 'categoryId', 'CATEGORY_ID') || 0);
  const assignedById = String(pick(item, 'assignedById', 'ASSIGNED_BY_ID') || '').trim();
  const companyId = String(pick(item, 'companyId', 'COMPANY_ID') || '').trim();
  const contactId = String(pick(item, 'contactId', 'CONTACT_ID') || '').trim();
  const storedTc = String(item[tcField] ?? item[tcField.toLowerCase()] ?? requestedTc).trim();

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
    createdAt: toIsoOrNull(pick(item, 'dateCreate', 'DATE_CREATE')),
    updatedAt: toIsoOrNull(pick(item, 'dateModify', 'DATE_MODIFY')),
    url: `${portalOrigin}/crm/deal/details/${encodeURIComponent(id)}/`
  };
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
  return null;
}

function unique(values) {
  return [...new Set(values.map(String))];
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
