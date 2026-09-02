const { guardExtensionApi } = require('../../lib/http-security');
const { getWebhookUrl, getPortalOrigin, callBitrix, resolveUser, toIso, safeBitrixError } = require('../../lib/bitrix-client');

module.exports = async function handler(req, res) {
  const session = guardExtensionApi(req, res, { rateKey: 'bitrix-task', rateLimit: 30, rateWindowMs: 60 * 1000, maxContentLength: 16 * 1024 });
  if (!session) return;

  try {
    const webhookUrl = getWebhookUrl();
    if (!webhookUrl) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada.' });
    const taskId = parseTaskId(req.body?.taskId);
    if (!taskId) return res.status(400).json({ ok: false, error: 'Ingrese un radicado válido.' });

    const result = await callBitrix(webhookUrl, 'tasks.task.get', { taskId });
    const task = result?.task || result;
    if (!task?.id) return res.status(404).json({ ok: false, error: 'No se encontró el radicado.' });

    const [responsible, creator] = await Promise.all([
      resolveUser(webhookUrl, task.responsibleId),
      resolveUser(webhookUrl, task.createdBy)
    ]);
    const portalOrigin = getPortalOrigin(webhookUrl);
    const groupId = String(task.groupId || '');
    const tcMatch = String(task.title || '').match(/\bTC\s*[-:]?\s*(\d+)\b/i);
    const url = groupId && groupId !== '0'
      ? `${portalOrigin}/workgroups/group/${encodeURIComponent(groupId)}/tasks/task/view/${encodeURIComponent(task.id)}/`
      : `${portalOrigin}/company/personal/user/0/tasks/task/view/${encodeURIComponent(task.id)}/`;

    return res.status(200).json({ ok: true, task: {
      id: String(task.id),
      title: String(task.title || `Radicado ${task.id}`).slice(0, 500),
      statusId: String(task.status || ''),
      status: taskStatus(task.status),
      responsible,
      creator,
      groupId,
      deadline: toIso(task.deadline),
      createdAt: toIso(task.createdDate),
      updatedAt: toIso(task.changedDate),
      tc: tcMatch ? tcMatch[1] : '',
      url
    }});
  } catch (error) {
    console.error('[bitrix-task]', String(error?.message || error).slice(0, 100));
    return res.status(502).json({ ok: false, error: safeBitrixError(error) });
  }
};

function parseTaskId(value) { const match = String(value || '').match(/^\s*(?:RAD(?:ICADO)?\s*[-:#]?\s*|#\s*)?(\d{1,12})\s*$/i); return match ? match[1] : ''; }
function taskStatus(value) { return ({ '1':'Nueva','2':'Pendiente','3':'En progreso','4':'Pendiente de control','5':'Completada','6':'Diferida','7':'Rechazada' })[String(value)] || String(value || 'No especificado'); }
