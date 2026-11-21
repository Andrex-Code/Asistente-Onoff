module.exports = async function advisorSession(code, call) {
  const clientId = process.env.BITRIX_ADVISOR_CLIENT_ID;
  const secret = process.env.BITRIX_ADVISOR_CLIENT_SECRET;
  if (!clientId || !secret || typeof code !== 'string' || !code || code.length > 2048) {
    throw Error('Se requiere una sesión verificada del asesor en Bitrix.');
  }
  const response = await fetch('https://oauth.bitrix.info/oauth/token/', {
    method: 'POST',
    body: new URLSearchParams({grant_type: 'authorization_code', client_id: clientId, client_secret: secret, code}),
    signal: AbortSignal.timeout(15000)
  });
  const grant = await response.json();
  if (!response.ok || grant.client_endpoint !== 'https://onoff.bitrix24.es/rest/' || !grant.access_token) {
    throw Error('Bitrix no confirmó la sesión del asesor en el portal ONOFF.');
  }
  const bitrix = (method, params) => call(method, params, grant.access_token);
  const user = await bitrix('user.current');
  if (!/^[1-9]\d*$/.test(String(user?.ID))) throw Error('Bitrix no identificó al asesor.');
  return {actor: String(user.ID), bitrix};
};
