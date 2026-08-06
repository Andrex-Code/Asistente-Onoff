const DEFAULT_ID_FIELD = 'UF_CRM_1599251398';
const DEFAULT_TC_FIELD = 'UF_CRM_1642606760058';

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  try {
    const webhookUrl = normalizeWebhookUrl(process.env.BITRIX_WEBHOOK_URL);
    if (!webhookUrl) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada.' });

    const identification = parseIdentification(req.body?.identification);
    if (!identification) return res.status(400).json({ ok: false, error: 'Ingrese una identificación válida.' });

    const idField = String(process.env.BITRIX_IDENTIFICATION_FIELD || DEFAULT_ID_FIELD).trim();
    const tcField = String(process.env.BITRIX_TC_FIELD || DEFAULT_TC_FIELD).trim();

    const companies = await callBitrix(webhookUrl, 'crm.company.list', {
      [`filter[${idField}]`]: identification,
      'select[]': ['ID', 'TITLE', 'ASSIGNED_BY_ID', 'DATE_CREATE', 'DATE_MODIFY', idField],
      start: 0
    });

    const companyList = Array.isArray(companies) ? companies.slice(0, 10) : [];
    const portalOrigin = new URL(webhookUrl).origin;
    const results = [];

    for (const company of companyList) {
      const companyId = String(company.ID || company.id || '');
      const responsible = await resolveUser(webhookUrl, company.ASSIGNED_BY_ID || company.assignedById);
      const deals = await callBitrix(webhookUrl, 'crm.deal.list', {
        'filter[COMPANY_ID]': companyId,
        'select[]': ['ID', 'TITLE', 'STAGE_ID', 'DATE_MODIFY', tcField],
        'order[DATE_MODIFY]': 'DESC',
        start: 0
      }).catch(() => []);

      results.push({
        id: companyId,
        name: String(company.TITLE || company.title || `Cliente ${companyId}`),
        identificationMasked: maskIdentification(identification),
        responsible,
        updatedAt: toIso(company.DATE_MODIFY || company.dateModify),
        url: `${portalOrigin}/crm/company/details/${encodeURIComponent(companyId)}/`,
        deals: (Array.isArray(deals) ? deals : []).slice(0, 10).map((deal) => ({
          id: String(deal.ID || deal.id || ''),
          tc: String(deal[tcField] || deal[tcField.toLowerCase()] || '').trim(),
          title: String(deal.TITLE || deal.title || 'Negociación'),
          stage: String(deal.STAGE_ID || deal.stageId || 'No especificado'),
          updatedAt: toIso(deal.DATE_MODIFY || deal.dateModify),
          url: `${portalOrigin}/crm/deal/details/${encodeURIComponent(deal.ID || deal.id || '')}/`
        }))
      });
    }

    return res.status(200).json({ ok: true, identificationMasked: maskIdentification(identification), count: results.length, companies: results });
  } catch (error) {
    return res.status(500).json({ ok: false, error: cleanError(error) });
  }
};

async function resolveUser(webhookUrl, id) {
  if (!id) return 'No especificado';
  try {
    const users = await callBitrix(webhookUrl, 'user.get', { ID: id });
    const user = Array.isArray(users) ? users[0] : null;
    return [user?.NAME, user?.LAST_NAME].filter(Boolean).join(' ').trim() || `Usuario ${id}`;
  } catch {
    return `Usuario ${id}`;
  }
}

async function callBitrix(webhookUrl, method, params = {}) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((entry) => body.append(key, String(entry)));
    else if (value !== undefined && value !== null && value !== '') body.append(key, String(value));
  });
  const response = await fetch(`${webhookUrl}${method}.json`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) throw new Error(data?.error_description || data?.error || `Bitrix respondió ${response.status}.`);
  return data?.result;
}

function parseIdentification(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 5 && digits.length <= 20 ? digits : '';
}
function maskIdentification(value) { const text = String(value); return `${'*'.repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`; }
function normalizeWebhookUrl(value) { try { const url = new URL(String(value || '').trim()); return url.protocol === 'https:' ? `${url.origin}${url.pathname.replace(/\/+$/, '')}/` : ''; } catch { return ''; } }
function toIso(value) { const date = new Date(value || ''); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function cleanError(error) { const message = String(error?.message || error || 'Error consultando Bitrix.'); if (/access denied|insufficient_scope/i.test(message)) return 'El webhook no tiene permisos suficientes.'; return message; }
function setCors(res) { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); }
