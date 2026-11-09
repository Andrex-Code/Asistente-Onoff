'use strict';

function text(value) { return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : ''; }
function field(record, name) {
  const camel = name.toLowerCase().replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  const key = Object.keys(record || {}).find(key => key.toLowerCase() === name.toLowerCase() || key.toLowerCase() === camel.toLowerCase());
  return record?.[key];
}
function multiValues(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(item => text(item?.VALUE ?? item?.value)).filter(Boolean))].slice(0, 10);
}

function normalizeCompany(record, id, origin, identificationField) {
  if (!record || text(record.ID ?? record.id) !== id) throw new Error('Compañía no verificada');
  return {
    status: 'available', id, name: text(record.TITLE ?? record.title),
    identification: text(field(record, identificationField)),
    phones: multiValues(record.PHONE ?? record.phone), emails: multiValues(record.EMAIL ?? record.email),
    url: `${origin}/crm/company/details/${encodeURIComponent(id)}/`
  };
}

async function loadPlan(call, webhook, id) {
  try {
    const rows = await call(webhook, 'crm.deal.productrows.get', { id });
    if (!Array.isArray(rows)) throw new Error('Respuesta de productos inválida');
    if (rows.some(row => row?.OWNER_ID != null && text(row.OWNER_ID) !== id || row?.OWNER_TYPE != null && row.OWNER_TYPE !== 'D')) throw new Error('Productos de otra negociación');
    const names = rows.map(row => text(row?.PRODUCT_NAME ?? row?.productName));
    if (names.some(name => !name)) throw new Error('Productos incompletos');
    const items = [...new Set(names)];
    return { status: items.length ? 'available' : 'empty', items: items.slice(0, 50), hasMore: items.length > 50 };
  } catch { return { status: 'unavailable', items: [] }; }
}

// Per-response data only; never persist customer contact details in a cache.
async function loadPlans(call, webhook, records) {
  const ids = [...new Set(records.map(record => text(record.ID ?? record.id)).filter(id => /^\d+$/.test(id)))];
  const plans = new Map(); let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, ids.length) }, async () => {
    while (next < ids.length) { const id = ids[next++]; plans.set(id, await loadPlan(call, webhook, id)); }
  }));
  return plans;
}

module.exports = { normalizeCompany, loadPlans };
