const { guardExtensionApi } = require('../lib/http-security');

const MAX_BYTES = 24 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['audio/ogg', 'audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav']);

module.exports = async function handler(req, res) {
  const session = guardExtensionApi(req, res, {
    rateKey: 'transcribe',
    rateLimit: 10,
    rateWindowMs: 10 * 60 * 1000,
    maxContentLength: 34 * 1024 * 1024
  });
  if (!session) return;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(503).json({ ok: false, error: 'El servicio de IA no está configurado.' });

    const { audioBase64, fileName, mimeType } = req.body || {};
    if (typeof audioBase64 !== 'string' || !audioBase64) return res.status(400).json({ ok: false, error: 'Audio requerido.' });
    if (audioBase64.length > Math.ceil(MAX_BYTES * 4 / 3) + 16) return res.status(413).json({ ok: false, error: 'El audio supera 24 MB.' });
    if (!/^[A-Za-z0-9+/=\r\n]+$/.test(audioBase64)) return res.status(400).json({ ok: false, error: 'Formato de audio inválido.' });

    const audioBuffer = Buffer.from(audioBase64, 'base64');
    if (!audioBuffer.length || audioBuffer.byteLength > MAX_BYTES) return res.status(413).json({ ok: false, error: 'El audio supera 24 MB.' });

    const cleanMimeType = normalizeMimeType(mimeType || '');
    if (!ALLOWED_MIME_TYPES.has(cleanMimeType)) return res.status(415).json({ ok: false, error: 'Tipo de audio no compatible.' });
    const normalizedName = normalizeAudioFileName(fileName || 'audio.webm', cleanMimeType);

    const audioBlob = new Blob([audioBuffer], { type: cleanMimeType });
    const formData = new FormData();
    formData.append('file', audioBlob, normalizedName);
    formData.append('model', process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe');
    formData.append('language', 'pt');
    formData.append('prompt', 'Audio de un cliente en portugués brasileño dentro de un chat de atención al cliente.');
    formData.append('response_format', 'json');

    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData
    });
    const transcriptionData = await transcriptionResponse.json().catch(() => null);
    if (!transcriptionResponse.ok) {
      console.error('[transcribe] OpenAI error:', transcriptionResponse.status);
      return res.status(502).json({ ok: false, error: 'No fue posible transcribir el audio.' });
    }

    const transcript = clean(transcriptionData?.text || '');
    if (!transcript) return res.status(502).json({ ok: false, error: 'No se recibió transcripción.' });

    const translationResponse = await fetch(getBaseUrl(req) + '/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: String(req.headers.authorization || '')
      },
      body: JSON.stringify({ text: transcript, direction: 'pt-es' })
    });
    const translationData = await translationResponse.json().catch(() => null);
    if (!translationResponse.ok || !translationData?.ok) {
      return res.status(502).json({ ok: false, error: 'No fue posible traducir la transcripción.' });
    }

    return res.status(200).json({ ok: true, transcript, spanish: translationData.translatedText });
  } catch (error) {
    console.error('[transcribe] Error:', safeLog(error));
    return res.status(500).json({ ok: false, error: 'Error interno procesando el audio.' });
  }
};

function normalizeAudioFileName(fileName, mimeType) {
  const cleanName = String(fileName || 'audio.webm').split(';')[0].trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-').slice(0, 180);
  const base = cleanName.replace(/\.[^.]+$/, '') || 'audio';
  if (mimeType === 'audio/ogg') return `${base}.ogg`;
  if (mimeType === 'audio/webm') return `${base}.webm`;
  if (mimeType === 'audio/mpeg') return `${base}.mp3`;
  if (mimeType === 'audio/mp4') return `${base}.m4a`;
  if (mimeType === 'audio/wav') return `${base}.wav`;
  return `${base}.webm`;
}
function normalizeMimeType(value) {
  const mime = String(value || '').split(';')[0].trim().toLowerCase();
  if (['audio/ogg', 'application/ogg', 'audio/opus'].includes(mime)) return 'audio/ogg';
  if (['audio/webm', 'video/webm'].includes(mime)) return 'audio/webm';
  if (['audio/mpeg', 'audio/mp3'].includes(mime)) return 'audio/mpeg';
  if (['audio/mp4', 'audio/m4a'].includes(mime)) return 'audio/mp4';
  if (['audio/wav', 'audio/x-wav'].includes(mime)) return 'audio/wav';
  return '';
}
function clean(value) { return String(value || '').replace(/^```[a-z]*\s*/i, '').replace(/```$/i, '').replace(/^['"“”]+|['"“”]+$/g, '').trim(); }
function getBaseUrl(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  if (!host) throw new Error('Host no disponible.');
  return `${proto}://${host}`;
}
function safeLog(error) { return String(error?.message || error || 'error').replace(/[\r\n]/g, ' ').slice(0, 300); }
