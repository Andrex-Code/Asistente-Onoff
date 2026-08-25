const { guardExtensionApi } = require('../../lib/http-security');
const { getWebhookUrl, getPortalOrigin, callBitrix, resolveUser, toIso, safeBitrixError } = require('../../lib/bitrix-client');

const DEFAULT_TC_FIELD = 'UF_CRM_1642606760058';
const MAX_RESULTS = 5;

module.exports = async function handler(req, res) {
  const session = guardExtensionApi(req, res, { rateKey: 'bitrix-deal', rateLimit: 30, rateWindowMs: 60 * 1000, maxContentLength: 16 * 1024 });
  if (!session) return;

  try {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada.' });
    const tc = parseTc(req.body?.tc);
    if (!tc) return res.status(400).json({ ok: false, error: 'Ingrese una TC válida.' });
    const tcField = validateField(process.env.BITRIX_TC_FIELD || DEFAULT_TC_FIELD);
    if (!tcField) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada correctamente.' });

    const raw = await callBitrix(webhookUrl, 'crm.deal.list', {
      [`filter[${tcField}]`]: tc,
      'select[]': ['ID','TITLE','STAGE_ID','CATEGORY_ID','COMPANY_ID','CONTACT_ID','ASSIGNED_BY_ID','DATE_CREATE','DATE_MODIFY',tcField],
      'order[DATE_MODIFY]': 'DESC',
      start: 0
    });
    const records = (Array.isArray(raw) ? raw : []).filter((item) => item?.ID || item?.id).slice(0, MAX_RESULTS);
    if (!records.length) return res.status(200).json({ ok: true, tc, count: 0, deals: [] });

    const portalOrigin = getPortalOrigin(webhookUrl);
    const deals = [];
    for (const item of records) {
      const id = String(item.ID || item.id || '').trim();
      const companyId = String(item.COMPANY_ID || item.companyId || '').trim();
      const contactId = String(item.CONTACT_ID || item.contactId || '').trim();
      const assignedById = String(item.ASSIGNED_BY_ID || item.assignedById || '').trim();
      const [client, responsible, stage] = await Promise.all([
        resolveClient(webhookUrl, companyId, contactId),
        resolveUser(webhookUrl, assignedById),
        resolveStage(webhookUrl, item.CATEGORY_ID || item.categoryId, item.STAGE_ID || item.stageId)
      ]);
      deals.push({
        id,
        tc: String(item[tcField] || item[tcField.toLowerCase()] || tc).trim(),
        title: String(item.TITLE || item.title || `Negociación ${id}`).slice(0, 500),
        stageId: String(item.STAGE_ID || item.stageId || ''),
        stage,
        client,
        responsible,
        createdAt: toIso(item.DATE_CREATE || item.dateCreate),
        updatedAt: toIso(item.DATE_MODIFY || item.dateModify),
        url: `${portalOrigin}/crm/deal/details/${encodeURIComponent(id)}/`
      });
    }
    return res.status(200).json({ ok: true, tc, count: deals.length, deals });
  } catch (error) {
    console.error('[bitrix-deal]', String(error?.message || error).slice(0, 100));
    return res.status(502).json({ ok: false, error: safeBitrixError(error) });
  }
};

async function resolveClient(webhookUrl, companyId, contactId) {
  try {
    if (companyId) {
      const company = await callBitrix(webhookUrl, 'crm.company.get', { id: companyId });
      return String(company?.TITLE || company?.title || `Empresa ${companyId}`).slice(0, 300);
    }
    if (contactId) {
      const contact = await callBitrix(webhookUrl, 'crm.contact.get', { id: contactId });
      return [contact?.NAME || contact?.name, contact?.LAST_NAME || contact?.lastName].filter(Boolean).join(' ').trim().slice(0, 300) || `Contacto ${contactId}`;
    }
  } catch {}
  return companyId ? `Empresa ${companyId}` : contactId ? `Contacto ${contactId}` : 'No especificado';
}

async function resolveStage(webhookUrl, categoryIdValue, stageIdValue) {
  const categoryId = Number(categoryIdValue || 0);
  const stageId = String(stageIdValue || '').trim();
  if (!stageId) return 'No especificado';
  try {
    const entityId = categoryId > 0 ? `DEAL_STAGE_${categoryId}` : 'DEAL_STAGE';
    const stages = await callBitrix(webhookUrl, 'crm.status.list', { 'filter[ENTITY_ID]': entityId, 'select[]': ['STATUS_ID','NAME'] });
    const match = (Array.isArray(stages) ? stages : []).find((item) => String(item.STATUS_ID || item.statusId) === stageId);
    return String(match?.NAME || match?.name || stageId);
  } catch { return stageId; }
}

function parseTc(value) { const match = String(value || '').match(/^\s*(?:TC\s*[-:]?\s*)?(\d{1,15})\s*$/i); return match ? match[1] : ''; }
function validateField(value) { const field = String(value || '').trim(); return /^UF_CRM_[A-Z0-9_]+$/i.test(field) ? field : ''; }
