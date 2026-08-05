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
  'Use la base de conocimiento como fuente principal para procedimientos y reglas.',
  'No invente información, procesos, fechas, valores ni promesas.',
  'No repita preguntas que el cliente ya respondió.',
  'Cuando falte información, indique exactamente qué dato falta.',
  'Cuando el asesor solicite una respuesta para el cliente, entregue solo un texto listo para copiar, profesional, humano y tratando al cliente de usted.',
  'Cuando la base de conocimiento no sea suficiente, indíquelo claramente.'
].join(' ');

const DEFAULT_CONFIG = {
  version: 1,
  updatedAt: null,
  improvePrompt: DEFAULT_IMPROVE_PROMPT,
  assistantPrompt: DEFAULT_ASSISTANT_PROMPT,
  knowledgeBase: '# Base de conocimiento ONOFF\n\nAgregue aquí procedimientos, reglas y respuestas autorizadas desde el panel administrativo.',
  history: []
};

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

function getRelevantKnowledge(knowledgeBase, query, limit = 6) {
  const chunks = String(knowledgeBase || '')
    .split(/\n(?=#{1,3}\s)|\n{2,}/)
    .map((value) => value.trim())
    .filter((value) => value.length > 20);
  const terms = normalize(query).split(/\s+/).filter((term) => term.length > 3);
  return chunks
    .map((chunk, index) => ({ chunk, index, score: scoreChunk(chunk, terms) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .filter((item, index) => item.score > 0 || index < 2)
    .slice(0, limit)
    .map((item) => item.chunk)
    .join('\n\n---\n\n');
}

function scoreChunk(chunk, terms) {
  const normalized = normalize(chunk);
  return terms.reduce((score, term) => score + (normalized.includes(term) ? 2 : 0), 0);
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

module.exports = { readConfig, writeConfig, getRelevantKnowledge, DEFAULT_CONFIG };
