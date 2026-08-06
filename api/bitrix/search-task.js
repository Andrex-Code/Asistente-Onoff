module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método no permitido.' });

  try {
    const webhookUrl = normalizeWebhookUrl(process.env.BITRIX_WEBHOOK_URL);
    if (!webhookUrl) return res.status(503).json({ ok: false, error: 'La búsqueda de Bitrix no está configurada.' });

    const taskId = parseTaskId(req.body?.taskId);
    if (!taskId) return res.status(400).json({ ok: false, error: 'Ingrese un radicado válido, por ejemplo 505942.' });

    const result = await callBitrix(webhookUrl, 'tasks.task.get', { taskId });
    const task = result?.task || result;
    if (!task?.id) return res.status(404).json({ ok: false, error: `No se encontró el radicado ${taskId}.` });

    const [responsible, creator] = await Promise.all([
      resolveUser(webhookUrl, task.responsibleId),
      resolveUser(webhookUrl, task.createdBy)
    ]);

    const portalOrigin = new URL(webhookUrl).origin;
    const groupId = String(task.groupId || '');
    const tcMatch = String(task.title || '').match(/\bTC\s*[-:]?\s*(\d+)\b/i);
    const url = groupId && groupId !== '0'
      ? `${portalOrigin}/workgroups/group/${encodeURIComponent(groupId)}/tasks/task/view/${encodeURIComponent(task.id)}/`
      : `${portalOrigin}/company/personal/user/0/tasks/task/view/${encodeURIComponent(task.id)}/`;

    return res.status(200).json({
      ok: true,
      task: {
        id: String(task.id),
        title: String(task.title || `Radicado ${task.id}`),
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
      }
    });
  } catch (error) {
    const message = String(error?.message || error || 'Error consultando Bitrix.');
    const status = /not found|no se encontr/i.test(message) ? 404 : 500;
    return res.status(status).json({ ok: false, error: message });
  }
};

async function resolveUser(webhookUrl, id) {
  if (!id) return 'No especificado';
  try {
    const result = await callBitrix(webhookUrl, 'user.get', { ID: id });
    const user = Array.isArray(result) ? result[0] : null;
    return [user?.NAME, user?.LAST_NAME].filter(Boolean).join(' ').trim() || `Usuario ${id}`;
  } catch {
    return `Usuario ${id}`;
  }
}

async function callBitrix(webhookUrl, method, params = {}) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') body.append(key, String(value));
  });
  const response = await fetch(`${webhookUrl}${method}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) throw new Error(data?.error_description || data?.error || `Bitrix respondió ${response.status}.`);
  return data?.result;
}

function parseTaskId(value) {
  const match = String(value || '').match(/^\s*(?:RAD(?:ICADO)?\s*[-:#]?\s*|#\s*)?(\d+)\s*$/i);
  return match ? match[1] : '';
}
function taskStatus(value) {
  return ({ '1': 'Nueva', '2': 'Pendiente', '3': 'En progreso', '4': 'Pendiente de control', '5': 'Completada', '6': 'Diferida', '7': 'Rechazada' })[String(value)] || String(value || 'No especificado');
}
function normalizeWebhookUrl(value) { try { const url = new URL(String(value || '').trim()); return url.protocol === 'https:' ? `${url.origin}${url.pathname.replace(/\/+$/, '')}/` : ''; } catch { return ''; } }
function toIso(value) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function setCors(res) { res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); }
