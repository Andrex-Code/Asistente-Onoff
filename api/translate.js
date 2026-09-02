const { guardExtensionApi } = require('../lib/http-security');

const DEFAULT_MODEL = 'gpt-4o-mini';

module.exports = async function handler(req, res) {
  const session = guardExtensionApi(req, res, {
    rateKey: 'translate',
    rateLimit: 60,
    rateWindowMs: 60 * 1000,
    maxContentLength: 32 * 1024
  });
  if (!session) return;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ ok: false, error: 'El servicio de IA no está configurado.' });

    const { text, direction } = req.body || {};
    if (!text || typeof text !== 'string') return res.status(400).json({ ok: false, error: 'Texto requerido.' });
    if (text.length > 12000) return res.status(413).json({ ok: false, error: 'El texto es demasiado largo.' });
    if (!['pt-es', 'es-pt'].includes(direction)) return res.status(400).json({ ok: false, error: 'Dirección de traducción inválida.' });

    const sourceLanguage = direction === 'pt-es' ? 'portugués brasileño' : 'español';
    const targetLanguage = direction === 'pt-es' ? 'español colombiano natural' : 'portugués brasileño natural';

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TRANSLATION_MODEL || DEFAULT_MODEL,
        input: [
          {
            role: 'system',
            content: 'Eres un traductor profesional para atención al cliente. Devuelve solo la traducción, sin explicaciones, sin comillas y sin notas.'
          },
          {
            role: 'user',
            content: `Traduce de ${sourceLanguage} a ${targetLanguage}:\n\n${text}`
          }
        ],
        temperature: 0.2,
        max_output_tokens: 1200
      })
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error('[translate] OpenAI error:', response.status);
      return res.status(502).json({ ok: false, error: 'No fue posible consultar el servicio de traducción.' });
    }

    const translatedText = extractOutputText(data);
    if (!translatedText) return res.status(502).json({ ok: false, error: 'No se recibió la traducción.' });
    return res.status(200).json({ ok: true, translatedText });
  } catch (error) {
    console.error('[translate] Error:', safeLog(error));
    return res.status(500).json({ ok: false, error: 'Error interno procesando la traducción.' });
  }
};

function extractOutputText(data) {
  if (data?.output_text) return clean(data.output_text);
  const content = data?.output?.flatMap((item) => item.content || []) || [];
  const text = content.map((part) => part.text || '').join('\n').trim();
  return clean(text);
}

function clean(value) {
  return String(value || '').replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').replace(/^['\"“”]+|['\"“”]+$/g, '').trim();
}

function safeLog(error) {
  return String(error?.message || error || 'error').replace(/[\r\n]/g, ' ').slice(0, 300);
}
