'use strict';

function normalizeTc(value) {
  const match = String(value ?? '').trim().toUpperCase().match(/^(?:TC\s*[-:]?\s*)?(\d+(?:-[A-Z0-9]+)*)$/);
  return match ? match[1] : '';
}

// Never label a partial result (or a record without a TC) as the requested TC.
function exactTcRecords(items, tcField, requestedTc) {
  const expected = normalizeTc(requestedTc);
  if (!expected || !Array.isArray(items)) return [];
  const camel = tcField.toLowerCase().replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  return items.map(value => value?.item || value?.fields || value?.deal || value)
    .filter(item => {
      if (!item || typeof item !== 'object') return false;
      const key = Object.keys(item).find(key => key.toLowerCase() === tcField.toLowerCase() || key.toLowerCase() === camel.toLowerCase());
      const values = Array.isArray(item[key]) ? item[key] : [item[key]];
      return values.some(value => normalizeTc(value) === expected);
    });
}

module.exports = { normalizeTc, exactTcRecords };
