const { get, put } = require('@vercel/blob');

const CONFIG_PATH = 'onoff/config.json';

const DEFAULT_IMPROVE_PROMPT = [
  'Mejora textos de atención al cliente en español colombiano.',
  'Conserva estrictamente la intención y toda la información del texto original.',
  'Corrige ortografía, puntuación, claridad y redacción.',
  'Usa un tono profesional, amable, natural y humano.',
  'Dirígete siempre al cliente de usted. Nunca uses tuteo.',
  'No inventes datos, procedimientos, promesas, fechas, valores ni condiciones.',
  'Devuelve únicamente el texto final mejorado, sin explicaciones, títulos, comillas ni notas.'
].join(' ');

const DEFAULT_ASSISTANT_PROMPT = [
  'Usted es el Asistente ONOFF para agentes de atención al cliente.',
  'Analice la conversación actual y responda la pregunta del asesor.',
  'Para procedimientos, funciones del sistema, pasos operativos, condiciones y reglas, use exclusivamente la base de conocimiento proporcionada.',
  'Nunca complete procedimientos con conocimiento general ni suponga opciones, botones, rutas o pasos que no estén escritos en la base.',
  'No invente información, procesos, fechas, valores ni promesas.',
  'No repita preguntas que el cliente ya respondió.',
  'Cuando falte información, indique exactamente qué dato falta.',
  'Cuando el asesor solicite una respuesta para el cliente, entregue solo un texto listo para copiar, profesional, humano y tratando al cliente de usted.',
  'Cuando no exista una coincidencia directa en la base de conocimiento, diga claramente que no encontró información suficiente y no proponga pasos genéricos.'
].join(' ');

const DEFAULT_CONFIG = {
  version: 1,
  updatedAt: null,
  improvePrompt: DEFAULT_IMPROVE_PROMPT,
  assistantPrompt: DEFAULT_ASSISTANT_PROMPT,
  knowledgeBase: '# Base de conocimiento ONOFF\n\nAgregue aquí procedimientos, reglas y respuestas autorizadas desde el panel administrativo.',
  history: []
};

const STOP_WORDS = new Set([
  'para', 'como', 'cuando', 'donde', 'desde', 'hasta', 'sobre', 'entre', 'esta', 'este', 'estos', 'estas',
  'cliente', 'asesor', 'debe', 'hacer', 'puede', 'quiere', 'necesita', 'tiene', 'tienen', 'cual', 'cuales',
  'porque', 'pero', 'solo', 'tambien', 'algo', 'caso', 'actual', 'mensaje', 'mensajes', 'favor', 'segun', 'base',
  'conocimiento', 'informacion', 'respuesta', 'responder', 'indique', 'explicar', 'explique', 'forma', 'clara'
]);

async function readConfig() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ...DEFAULT_CONFIG, storageReady: false };
  try {
    const result = await get(CONFIG_PATH, { access: 'private', useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) return { ...DEFAULT_CONFIG, storageReady: true };
    const text = await new Response(result.stream).text();
    return { ...DEFAULT_CONFIG, ...JSON.parse(text), storageReady: true };
  } catch (error) {
    if (/not found|404/i.test(String(error?.message || error))) return { ...DEFAULT_CONFIG, storageReady: true };
    throw error;
  }
}

async function writeConfig(next, actor = 'admin') {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Falta conectar un almacenamiento Vercel Blob privado.');
  const current = await readConfig();
  const snapshot = {
    version: current.version,
    updatedAt: current.updatedAt,
    improvePrompt: current.improvePrompt,
    assistantPrompt: current.assistantPrompt,
    knowledgeBase: current.knowledgeBase
  };
  const history = [snapshot, ...(current.history || [])].slice(0, 15);
  const saved = {
    version: Number(current.version || 0) + 1,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
    improvePrompt: String(next.improvePrompt || current.improvePrompt).trim(),
    assistantPrompt: String(next.assistantPrompt || current.assistantPrompt).trim(),
    knowledgeBase: String(next.knowledgeBase || '').trim(),
    history
  };
  await put(CONFIG_PATH, JSON.stringify(saved, null, 2), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json; charset=utf-8'
  });
  return { ...saved, storageReady: true };
}

function findRelevantKnowledge(knowledgeBase, query, limit = 6) {
  const sections = splitKnowledgeSections(knowledgeBase);
  const terms = getSearchTerms(query);
  if (!sections.length || !terms.length) return { text: '', sources: [], score: 0 };

  const ranked = sections
    .map((section, index) => ({ ...section, index, score: scoreSection(section, terms, query) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const bestScore = ranked[0]?.score || 0;
  if (bestScore < 3) return { text: '', sources: [], score: bestScore };

  const minimumScore = Math.max(2, Math.floor(bestScore * 0.35));
  const selected = ranked.filter((item) => item.score >= minimumScore).slice(0, limit);
  return {
    text: selected.map((item) => item.text).join('\n\n---\n\n'),
    sources: selected.map((item) => item.title).filter(Boolean),
    score: bestScore
  };
}

function getRelevantKnowledge(knowledgeBase, query, limit = 6) {
  return findRelevantKnowledge(knowledgeBase, query, limit).text;
}

function splitKnowledgeSections(knowledgeBase) {
  const lines = String(knowledgeBase || '').replace(/\r/g, '').split('\n');
  const sections = [];
  let title = 'Base de conocimiento';
  let body = [];

  const flush = () => {
    const content = body.join('\n').trim();
    if (content.length > 20) sections.push({ title, text: `${title ? `# ${title}\n` : ''}${content}`.trim() });
    body = [];
  };

  for (const line of lines) {
    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      flush();
      title = heading[1].trim();
    } else {
      body.push(line);
    }
  }
  flush();

  if (!sections.length) {
    return String(knowledgeBase || '')
      .split(/\n{2,}/)
      .map((text, index) => ({ title: `Sección ${index + 1}`, text: text.trim() }))
      .filter((item) => item.text.length > 20);
  }
  return sections;
}

function scoreSection(section, terms, rawQuery) {
  const normalizedTitle = normalize(section.title);
  const normalizedText = normalize(section.text);
  const normalizedQuery = normalize(rawQuery);
  let score = 0;

  if (normalizedQuery.length > 12 && normalizedText.includes(normalizedQuery)) score += 20;

  for (const term of terms) {
    if (normalizedTitle.includes(term.value)) score += 7;
    else if (normalizedTitle.includes(term.stem)) score += 5;

    if (normalizedText.includes(term.value)) score += 3;
    else if (normalizedText.includes(term.stem)) score += 2;
  }

  const queryPairs = terms.slice(0, 8).flatMap((term, index) => terms.slice(index + 1, index + 4).map((next) => `${term.stem} ${next.stem}`));
  for (const pair of queryPairs) {
    if (normalizedText.includes(pair)) score += 4;
  }
  return score;
}

function getSearchTerms(value) {
  const unique = new Map();
  for (const token of normalize(value).match(/[a-z0-9]+/g) || []) {
    if (token.length < 3 || STOP_WORDS.has(token)) continue;
    const stem = stemSpanish(token);
    if (stem.length < 3) continue;
    unique.set(stem, { value: token, stem });
  }
  return [...unique.values()].slice(0, 28);
}

function stemSpanish(value) {
  return String(value)
    .replace(/(amientos|imientos|uciones|adoras|adores|aciones|amiento|imiento|ucion|adoras|adores|acion|mente)$/i, '')
    .replace(/(iendo|ando|ados|adas|idos|idas|ando|iendo|izar|ificar)$/i, '')
    .replace(/(ar|er|ir|an|en|es|os|as|ado|ada|ido|ida|s)$/i, '');
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { readConfig, writeConfig, getRelevantKnowledge, findRelevantKnowledge, DEFAULT_CONFIG };
