const { requireAdmin } = require('../../lib/admin-auth');
const { readConfig, writeConfig } = require('../../lib/config-store');
const { setCommonSecurityHeaders, requireSameOrigin } = require('../../lib/http-security');

module.exports = async function handler(req, res) {
  setCommonSecurityHeaders(res);
  if (!requireSameOrigin(req, res)) return;

  const size = Number(req.headers['content-length'] || 0);
  if (Number.isFinite(size) && size > 600 * 1024) return res.status(413).json({ ok: false, error: 'Solicitud demasiado grande.' });

  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    if (req.method === 'GET') {
      const config = await readConfig();
      return res.status(200).json({ ok: true, config });
    }

    if (req.method === 'PUT') {
      const { improvePrompt, assistantPrompt, knowledgeBase } = req.body || {};
      if (![improvePrompt, assistantPrompt, knowledgeBase].every((value) => typeof value === 'string')) {
        return res.status(400).json({ ok: false, error: 'Configuración incompleta.' });
      }
      if (improvePrompt.length > 20000 || assistantPrompt.length > 30000 || knowledgeBase.length > 500000) {
        return res.status(413).json({ ok: false, error: 'El contenido supera el tamaño permitido.' });
      }
      const config = await writeConfig({ improvePrompt, assistantPrompt, knowledgeBase }, session.sub);
      return res.status(200).json({ ok: true, config });
    }

    return res.status(405).json({ ok: false, error: 'Método no permitido.' });
  } catch (error) {
    console.error('[admin-config]', String(error?.message || error).slice(0, 200));
    return res.status(500).json({ ok: false, error: 'Error interno administrando la configuración.' });
  }
};
