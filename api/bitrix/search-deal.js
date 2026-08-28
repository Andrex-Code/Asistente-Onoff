const { guardExtensionApi } = require('../../lib/http-security');
const { getWebhookUrl, getPortalOrigin, callBitrix, resolveUser, toIso, safeBitrixError } = require('../../lib/bitrix-client');

const DEFAULT_TC_FIELD = 'UF_CRM_1642606760058';
const MAX_RESULTS = 10;

module.exports = async function handler(req, res) {
  const session = guardExtensionApi(req, res, {
    rateKey: 'bitrix-deal',
    rateLimit: 30,
    rateWindowMs: 60 * 1000,
    maxContentLength: 16 * 1024
  });
  if (!session) return;

  try {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada.' });

    const tc = parseTc(req.body?.tc);
    if (!tc) return res.status(400).json({ ok: false, error: 'Ingrese una TC válida.' });

    const tcField = validateField(process.env.BITRIX_TC_FIELD || DEFAULT_TC_FIELD);
    if (!tcField) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada correctamente.' });

    const found = await findDeals(webhookUrl, tcField, tc);
    const records = found
      .map(unwrapRecord)
      .filter((item) => item && pick(item, 'ID', 'id'))
      .slice(0, MAX_RESULTS);

    if (!records.length) return res.status(200).json({ ok: true, tc, count: 0, deals: [] });

    const portalOrigin = getPortalOrigin(webhookUrl);
    const deals = [];

    for (const record of records) {
      const item = await hydrateDeal(webhookUrl, record);
      const id = String(pick(item, 'ID', 'id') || '').trim();
      const assignedById = String(pick(item, 'ASSIGNED_BY_ID', 'assignedById') || '').trim();
      const categoryId = pick(item, 'CATEGORY_ID', 'categoryId');
      const stageId = pick(item, 'STAGE_ID', 'stageId');

      const [client, responsible, stage] = await Promise.all([
        resolveDealClient(webhookUrl, item, id),
        resolveUser(webhookUrl, assignedById),
        resolveStage(webhookUrl, categoryId, stageId)
      ]);

      deals.push({
        id,
        tc: String(readCustomField(item, tcField) || tc).trim(),
        title: String(pick(item, 'TITLE', 'title') || `Negociación ${id}`).slice(0, 500),
        stageId: String(stageId || ''),
        stage,
        client,
        responsible,
        createdAt: toIso(pick(item, 'DATE_CREATE', 'dateCreate')),
        updatedAt: toIso(pick(item, 'DATE_MODIFY', 'dateModify')),
        url: `${portalOrigin}/crm/deal/details/${encodeURIComponent(id)}/`
      });
    }

    return res.status(200).json({ ok: true, tc, count: deals.length, deals });
  } catch (error) {
    console.error('[bitrix-deal]', String(error?.message || error).slice(0, 120));
    return res.status(502).json({ ok: false, error: safeBitrixError(error) });
  }
};

async function findDeals(webhookUrl, tcField, tc) {
  let legacyError = null;

  try {
    const deals = await callBitrix(webhookUrl, 'crm.deal.list', {
      [`filter[${tcField}]`]: tc,
      'select[]': [
        'ID', 'TITLE', 'STAGE_ID', 'CATEGORY_ID', 'COMPANY_ID', 'CONTACT_ID',
        'ASSIGNED_BY_ID', 'DATE_CREATE', 'DATE_MODIFY', tcField
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
        'id', 'title', 'stageId', 'categoryId', 'companyId', 'contactId',
        'assignedById', 'dateCreate', 'dateModify', tcField
      ],
      start: 0
    });
    return Array.isArray(result?.items) ? result.items : [];
  } catch (error) {
    throw legacyError || error;
  }
}

async function hydrateDeal(webhookUrl, record) {
  const id = String(pick(record, 'ID', 'id') || '').trim();
  if (!id) return record;
  try {
    const full = await callBitrix(webhookUrl, 'crm.deal.get', { id });
    return full && typeof full === 'object' ? { ...record, ...full } : record;
  } catch {
    return record;
  }
}

async function resolveDealClient(webhookUrl, item, dealId) {
  let companyId = normalizeId(pick(item, 'COMPANY_ID', 'companyId'));
  let contactId = normalizeId(pick(item, 'CONTACT_ID', 'contactId'));

  if (!contactId && dealId) {
    try {
      const contacts = await callBitrix(webhookUrl, 'crm.deal.contact.items.get', { id: dealId });
      if (Array.isArray(contacts) && contacts.length) {
        const primary = contacts.find((entry) => String(pick(entry, 'IS_PRIMARY', 'isPrimary') || '').toUpperCase() === 'Y') || contacts[0];
        contactId = normalizeId(pick(primary, 'CONTACT_ID', 'contactId', 'CONTACTID', 'contactId'));
      }
    } catch {
      // Algunos portales/webhooks no exponen la colección de contactos del negocio.
    }
  }

  if (companyId) {
    try {
      const company = await callBitrix(webhookUrl, 'crm.company.get', { id: companyId });
      const title = String(pick(company, 'TITLE', 'title') || '').trim();
      if (title) return title.slice(0, 300);
    } catch {
      return `Empresa ${companyId}`;
    }
  }

  if (contactId) {
    try {
      const contact = await callBitrix(webhookUrl, 'crm.contact.get', { id: contactId });
      const contactCompanyId = normalizeId(pick(contact, 'COMPANY_ID', 'companyId'));
      if (!companyId && contactCompanyId) {
        try {
          const company = await callBitrix(webhookUrl, 'crm.company.get', { id: contactCompanyId });
          const companyTitle = String(pick(company, 'TITLE', 'title') || '').trim();
          if (companyTitle) return companyTitle.slice(0, 300);
        } catch {
          // Si no se resuelve la empresa, se usa el nombre del contacto.
        }
      }
      const name = [pick(contact, 'NAME', 'name'), pick(contact, 'LAST_NAME', 'lastName')]
        .filter(Boolean)
        .join(' ')
        .trim();
      return name.slice(0, 300) || `Contacto ${contactId}`;
    } catch {
      return `Contacto ${contactId}`;
    }
  }

  return 'No asociado en Bitrix';
}

async function resolveStage(webhookUrl, categoryIdValue, stageIdValue) {
  const categoryId = Number(categoryIdValue || 0);
  const stageId = String(stageIdValue || '').trim();
  if (!stageId) return 'No especificado';
  try {
    const entityId = categoryId > 0 ? `DEAL_STAGE_${categoryId}` : 'DEAL_STAGE';
    const stages = await callBitrix(webhookUrl, 'crm.status.list', {
      'filter[ENTITY_ID]': entityId,
      'select[]': ['STATUS_ID', 'NAME']
    });
    const match = (Array.isArray(stages) ? stages : []).find(
      (item) => String(pick(item, 'STATUS_ID', 'statusId') || '') === stageId
    );
    return String(pick(match, 'NAME', 'name') || stageId);
  } catch {
    return stageId;
  }
}

function unwrapRecord(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.item && typeof value.item === 'object') return value.item;
  if (value.fields && typeof value.fields === 'object') return value.fields;
  if (value.deal && typeof value.deal === 'object') return value.deal;
  return value;
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

function normalizeId(value) {
  const id = String(value || '').trim();
  return id && id !== '0' ? id : '';
}

function parseTc(value) {
  const match = String(value || '').match(/^\s*(?:TC\s*[-:]?\s*)?(\d{1,15})\s*$/i);
  return match ? match[1] : '';
}

function validateField(value) {
  const field = String(value || '').trim();
  return /^UF_CRM_[A-Z0-9_]+$/i.test(field) ? field : '';
}
