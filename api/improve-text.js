const DEFAULT_MODEL = 'gpt-4o-mini';

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Metodo no permitido.' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Falta OPENAI_API_KEY en Vercel.' });

    const { text } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ ok: false, error: 'Texto requerido.' });
    if (text.length > 12000) return res.status(413).json({ ok: false, error: 'El texto es demasiado largo.' });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || process.env.OPENAI_TRANSLATION_MODEL || DEFAULT_MODEL,
        input: [
          {
            role: 'system',
            content: [
              'Mejora textos de atención al cliente en español colombiano.',
              'Conserva estrictamente la intención y toda la información del texto original.',
              'Corrige ortografía, puntuación, claridad y redacción.',
              'Usa un tono profesional, amable, natural y humano.',
              'Dirígete siempre al cliente de usted. Nunca uses tuteo ni formas como tú, tu, te, contigo o puedes.',
              'No inventes datos, procedimientos, promesas, fechas, valores ni condiciones.',
              'Devuelve únicamente el texto final mejorado, sin explicaciones, títulos, comillas ni notas.'
            ].join(' ')
          },
          { role: 'user', content: text }
        ],
        temperature: 0.2,
        max_output_tokens: 1600
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) return res.status(response.status).json({ ok: false, error: data?.error?.message || 'Error del proveedor de IA.' });

    const improvedText = extractOutputText(data);
    if (!improvedText) return res.status(500).json({ ok: false, error: 'No se recibió el texto mejorado.' });
    return res.status(200).json({ ok: true, improvedText });
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
  return String(value || '').replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').replace(/^['\"“”]+|['\"“”]+$/g, '').trim();
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
