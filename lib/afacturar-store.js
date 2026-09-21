const { get, put } = require('@vercel/blob');

const AFACTURAR_PATH = 'onoff/afacturar-index.json';
const CACHE_MS = 5 * 60 * 1000;
const MAX_RECORDS = 20000;
let cache = null;
let cacheExpiresAt = 0;

async function readAfacturarIndex() {
  ensureStorage();
  if (cache && Date.now() < cacheExpiresAt) return cache;

  try {
    const result = await get(AFACTURAR_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return emptyIndex();
    const text = await new Response(result.stream).text();
    cache = normalizeStoredIndex(JSON.parse(text));
    cacheExpiresAt = Date.now() + CACHE_MS;
    return cache;
  } catch (error) {
    if (/not found|404/i.test(String(error?.message || error))) return emptyIndex();
    throw error;
  }
}

async function getAfacturarMetadata() {
  const index = await readAfacturarIndex();
  return {
    ready: index.records.length > 0,
    count: index.records.length,
    updatedAt: index.updatedAt || null,
    updatedBy: index.updatedBy || null,
    sourceName: index.sourceName || null,
    rejectedRows: Number(index.rejectedRows || 0)
  };
}

async function importAfacturarCsv(csvText, options = {}) {
  ensureStorage();
  const rows = parseCsv(String(csvText || ''));
  if (rows.length < 2) throw new Error('AFACTURAR_EMPTY_FILE');

  const header = rows[0].map(normalizeHeader);
  const platformIndex = findColumn(header, ['plataforma', 'tc', 'codigoplataforma', 'numeroplataforma']);
  const urlIndex = findColumn(header, ['accesodirecto', 'url', 'enlace', 'link', 'hipervinculo']);
  const statusIndex = findColumn(header, ['estado']);
  const businessNameIndex = findColumn(header, ['razonsocial', 'juridico', 'empresa']);
  const personNameIndex = findColumn(header, ['representantelegal', 'natural', 'nombre']);

  if (platformIndex < 0 || urlIndex < 0) throw new Error('AFACTURAR_REQUIRED_COLUMNS');

  const records = [];
  let rejectedRows = 0;
  const seen = new Set();

  for (const row of rows.slice(1)) {
    const platform = normalizePlatform(row[platformIndex]);
    const url = normalizeAfacturarUrl(row[urlIndex]);
    if (!platform || !url) {
      if (row.some((value) => String(value || '').trim())) rejectedRows += 1;
      continue;
    }

    const key = `${platform}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const businessName = String(businessNameIndex >= 0 ? row[businessNameIndex] : '').trim();
    const personName = String(personNameIndex >= 0 ? row[personNameIndex] : '').trim();
    records.push({
      platform,
      url,
      status: String(statusIndex >= 0 ? row[statusIndex] : '').trim().slice(0, 40),
      name: (businessName || personName).slice(0, 180)
    });

    if (records.length > MAX_RECORDS) throw new Error('AFACTURAR_TOO_MANY_RECORDS');
  }

  if (!records.length) throw new Error('AFACTURAR_NO_VALID_ROWS');

  const saved = {
    version: 1,
    updatedAt: new Date().toISOString(),
    updatedBy: String(options.actor || 'admin').slice(0, 120),
    sourceName: sanitizeSourceName(options.sourceName),
    rejectedRows,
    records
  };

  await put(AFACTURAR_PATH, JSON.stringify(saved), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8'
  });

  cache = saved;
  cacheExpiresAt = Date.now() + CACHE_MS;
  return publicMetadata(saved);
}

async function lookupAfacturar(criteria = {}) {
  const index = await readAfacturarIndex();
  const platform = normalizePlatform(criteria.platform);
  if (!platform || !index.records.length) return null;

  const candidates = index.records.filter((record) => record.platform === platform);
  if (!candidates.length) return null;

  const selected = candidates.find((record) => normalizeHeader(record.status) === 'activo') || candidates[0];
  return {
    url: selected.url,
    platform: selected.platform,
    status: selected.status || '',
    name: selected.name || ''
  };
}

function publicMetadata(index) {
  return {
    ready: index.records.length > 0,
    count: index.records.length,
    updatedAt: index.updatedAt || null,
    sourceName: index.sourceName || null,
    rejectedRows: Number(index.rejectedRows || 0)
  };
}

function normalizeStoredIndex(value) {
  const records = Array.isArray(value?.records)
    ? value.records.map((record) => ({
        platform: normalizePlatform(record?.platform),
        url: normalizeAfacturarUrl(record?.url),
        status: String(record?.status || '').slice(0, 40),
        name: String(record?.name || '').slice(0, 180)
      })).filter((record) => record.platform && record.url)
    : [];

  return {
    version: 1,
    updatedAt: value?.updatedAt || null,
    updatedBy: value?.updatedBy || null,
    sourceName: value?.sourceName || null,
    rejectedRows: Number(value?.rejectedRows || 0),
    records
  };
}

function emptyIndex() {
  return { version: 1, updatedAt: null, updatedBy: null, sourceName: null, rejectedRows: 0, records: [] };
}

function parseCsv(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(source);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (!quoted && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((value) => String(value || '').trim())) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }

  row.push(field);
  if (row.some((value) => String(value || '').trim())) rows.push(row);
  return rows;
}

function detectDelimiter(text) {
  const firstLine = String(text || '').split(/\r?\n/, 1)[0] || '';
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  if (tabs > commas && tabs > semicolons) return '\t';
  return semicolons > commas ? ';' : ',';
}

function findColumn(headers, accepted) {
  return headers.findIndex((header) => accepted.includes(header));
}

function normalizeHeader(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeAfacturarUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:') return '';
    const hostname = url.hostname.toLowerCase();
    if (hostname !== 'afacturar.com' && hostname !== 'www.afacturar.com') return '';
    if (!/^\/(?:obligado|empresas-registro-get)\/\d+\/?$/i.test(url.pathname)) return '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function normalizePlatform(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^TC\s*/i, '')
    .replace(/\s+/g, '');
}

function sanitizeSourceName(value) {
  return String(value || 'Base Afacturar.csv').replace(/[\\/<>:"|?*]/g, '_').trim().slice(0, 140) || 'Base Afacturar.csv';
}

function ensureStorage() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('AFACTURAR_STORAGE_NOT_READY');
}

module.exports = { getAfacturarMetadata, importAfacturarCsv, lookupAfacturar };
