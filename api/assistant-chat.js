const { readConfig, findRelevantKnowledge } = require('../lib/config-store');

const DEFAULT_MODEL = 'gpt-4o-mini';

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Falta OPENAI_API_KEY en Vercel.' });

    const { question, conversation, history, mode } = req.body || {};
    if (!question || typeof question !== 'string') return res.status(400).json({ ok: false, error: 'Pregunta requerida.' });
    if (!Array.isArray(conversation)) return res.status(400).json({ ok: false, error: 'Conversación requerida.' });

    const cleanConversation = conversation.slice(-40).map((item) => ({
      role: item?.role === 'advisor' ? 'advisor' : 'customer',
      text: String(item?.text || '').slice(0, 4000)
    })).filter((item) => item.text);

    const cleanHistory = Array.isArray(history) ? history.slice(-8).map((item) => ({
      role: item?.role === 'assistant' ? 'assistant' : 'user',
      content: String(item?.content || '').slice(0, 4000)
    })) : [];

    const config = await readConfig();
    const searchText = `${question}\n${cleanConversation.slice(-12).map((item) => item.text).join('\n')}`;
    const knowledgeResult = findRelevantKnowledge(config.knowledgeBase, searchText);
    const conversationText = cleanConversation.map((item, index) => `${index + 1}. ${item.role === 'advisor' ? 'ASESOR' : 'CLIENTE'}: ${item.text}`).join('\n');
    const hasKnowledge = Boolean(knowledgeResult.text);

    const systemInstruction = [
      config.assistantPrompt,
      `MODO SOLICITADO: ${String(mode || 'pregunta libre')}`,
      hasKnowledge
        ? `BASE DE CONOCIMIENTO RELEVANTE:\n${knowledgeResult.text}`
        : 'NO HAY COINCIDENCIA DIRECTA EN LA BASE DE CONOCIMIENTO. Para preguntas sobre procedimientos, funciones, pasos o reglas, responda únicamente que no encontró información suficiente en la base. No sugiera pasos genéricos ni use conocimiento externo.',
      'La conversación sirve para interpretar el caso, pero no reemplaza la base de conocimiento cuando se solicitan procedimientos o instrucciones operativas.'
    ].join('\n\n');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        input: [
          { role: 'system', content: systemInstruction },
          {
            role: 'user',
            content: `CONVERSACIÓN ACTUAL:\n${conversationText || 'No hay mensajes de texto visibles.'}\n\nPREGUNTA DEL ASESOR:\n${question}`
          },
          ...cleanHistory
        ],
        temperature: 0.1,
        max_output_tokens: 1800
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) return res.status(response.status).json({ ok: false, error: data?.error?.message || 'Error del proveedor de IA.' });
    const answer = extractOutputText(data);
    if (!answer) return res.status(500).json({ ok: false, error: 'No se recibió respuesta del asistente.' });
    return res.status(200).json({
      ok: true,
      answer,
      knowledgeUsed: hasKnowledge,
      knowledgeSources: knowledgeResult.sources,
      configVersion: config.version || null
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message || 'Error interno.' });
  }
};

function extractOutputText(data) {
  if (data?.output_text) return clean(data.output_text);
  const content = data?.output?.flatMap((item) => item.content || []) || [];
  return clean(content.map((part) => part.text || '').join('\n'));
}

function clean(value) {
  return String(value || '').replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').trim();
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
