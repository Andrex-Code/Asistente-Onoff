const { guardExtensionApi } = require('../../lib/http-security');
const { getWebhookUrl, getPortalOrigin, callBitrix, resolveUser, toIso, safeBitrixError } = require('../../lib/bitrix-client');

const DEFAULT_ID_FIELD = 'UF_CRM_1599251398';
const DEFAULT_TC_FIELD = 'UF_CRM_1642606760058';
const MAX_RESULTS = 5;

module.exports = async function handler(req, res) {
  const session = guardExtensionApi(req, res, { rateKey: 'bitrix-company', rateLimit: 30, rateWindowMs: 60 * 1000, maxContentLength: 16 * 1024 });
  if (!session) return;

  try {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada.' });
    const identification = parseIdentification(req.body?.identification);
    if (!identification) return res.status(400).json({ ok: false, error: 'Ingrese una identificación válida.' });

    const idField = validateField(process.env.BITRIX_IDENTIFICATION_FIELD || DEFAULT_ID_FIELD);
    const tcField = validateField(process.env.BITRIX_TC_FIELD || DEFAULT_TC_FIELD);
    if (!idField || !tcField) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada correctamente.' });

    const companies = await callBitrix(webhookUrl, 'crm.company.list', {
      [`filter[${idField}]`]: identification,
      'select[]': ['ID', 'TITLE', 'ASSIGNED_BY_ID', 'DATE_MODIFY', idField],
      start: 0
    });

    const portalOrigin = getPortalOrigin(webhookUrl);
    const results = [];
    for (const company of (Array.isArray(companies) ? companies : []).slice(0, MAX_RESULTS)) {
      const companyId = String(company.ID || company.id || '').trim();
      if (!companyId) continue;
      const [responsible, deals] = await Promise.all([
        resolveUser(webhookUrl, company.ASSIGNED_BY_ID || company.assignedById),
        callBitrix(webhookUrl, 'crm.deal.list', {
          'filter[COMPANY_ID]': companyId,
          'select[]': ['ID', 'TITLE', 'STAGE_ID', 'DATE_MODIFY', tcField],
          'order[DATE_MODIFY]': 'DESC',
          start: 0
        }).catch(() => [])
      ]);
      results.push({
        id: companyId,
        name: String(company.TITLE || company.title || `Cliente ${companyId}`).slice(0, 300),
        responsible,
        updatedAt: toIso(company.DATE_MODIFY || company.dateModify),
        url: `${portalOrigin}/crm/company/details/${encodeURIComponent(companyId)}/`,
        deals: (Array.isArray(deals) ? deals : []).slice(0, MAX_RESULTS).map((deal) => ({
          id: String(deal.ID || deal.id || ''),
          tc: String(deal[tcField] || deal[tcField.toLowerCase()] || '').trim(),
          title: String(deal.TITLE || deal.title || 'Negociación').slice(0, 300),
          stage: String(deal.STAGE_ID || deal.stageId || 'No especificado'),
          updatedAt: toIso(deal.DATE_MODIFY || deal.dateModify),
          url: `${portalOrigin}/crm/deal/details/${encodeURIComponent(deal.ID || deal.id || '')}/`
        }))
      });
    }

    return res.status(200).json({ ok: true, identificationMasked: maskIdentification(identification), count: results.length, companies: results });
  } catch (error) {
    console.error('[bitrix-company]', String(error?.message || error).slice(0, 100));
    return res.status(502).json({ ok: false, error: safeBitrixError(error) });
  }
};

function parseIdentification(value) { const digits = String(value || '').replace(/\D/g, ''); return digits.length >= 5 && digits.length <= 20 ? digits : ''; }
function maskIdentification(value) { const text = String(value); return `${'*'.repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`; }
function validateField(value) { const field = String(value || '').trim(); return /^UF_CRM_[A-Z0-9_]+$/i.test(field) ? field : ''; }
