'use strict';
const legacy = require('../../lib/client-tasks-legacy');
const { getService } = require('../../lib/followups-service');

// Keep the established TC consultation untouched. Owner consultations use the
// optimized service without creating an additional Vercel Function.
module.exports = async function handler(req, res) {
  if (req.body?.mode !== 'owner') return await legacy(req, res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'M\u00e9todo no permitido.' });
  const started = Date.now();
  try {
    if (JSON.stringify(req.body).length > 16384) return res.status(413).json({ ok: false, error: 'La consulta es demasiado grande.' });
    const url = new URL(String(process.env.BITRIX_WEBHOOK_URL || '').trim());
    if (url.protocol !== 'https:' || url.search || url.hash) throw new Error('CONFIG');
    const webhookUrl = `${url.origin}${url.pathname.replace(/\/+$/, '')}/`;
    // Await is essential here: rejected async queries must reach this catch.
    const result = await getService(webhookUrl).execute(req.body);
    res.setHeader('Server-Timing', `followups;dur=${Date.now() - started}`);
    return res.status(200).json(result);
  } catch (error) {
    const configError = error.message === 'CONFIG' || error.code === 'ERR_INVALID_URL';
    const status = configError ? 503 : error.status || 500;
    console.warn(JSON.stringify({ component: 'followups', action: req.body?.action || 'legacy', code: error.code || 'ERROR', durationMs: Date.now() - started }));
    return res.status(status).json({ ok: false, code: error.code || 'ERROR', error: configError ? 'La b\u00fasqueda de Bitrix no est\u00e1 configurada.' : error.status ? error.message : 'No fue posible completar la consulta de tareas.' });
  }
};
