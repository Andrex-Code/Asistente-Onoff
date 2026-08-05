const { requireAdmin } = require('../../lib/admin-auth');
const { readConfig, writeConfig } = require('../../lib/config-store');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
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
    return res.status(500).json({ ok: false, error: error.message || 'Error interno.' });
  }
};
