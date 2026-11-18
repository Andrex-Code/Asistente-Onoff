const { createHash, randomBytes, timingSafeEqual } = require('node:crypto');

const randomSecret = () => randomBytes(32).toString('base64url');
const hash = value => createHash('sha256').update(value).digest('hex');
const secretValid = value => typeof value === 'string' && /^[\w-]{43}$/.test(value);
const referenceValid = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const match = (actual, expected) => referenceValid(expected) && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
const failure = (status, message) => Object.assign(Error(message), { status });

function createActivationService({ storage = require('@vercel/blob'), now = Date.now } = {}) {
  const pathFor = reference => 'onoff/bitrix-read-access/' + reference + '.json';
  async function read(reference) {
    const blob = await storage.get(pathFor(reference), { access: 'private', useCache: false });
    if (!blob || blob.statusCode === 404) return null;
    if (blob.statusCode !== 200 || !blob.stream) throw Error('No se pudo leer el acceso');
    return { value: await new Response(blob.stream).json(), etag: blob.etag };
  }
  async function write(reference, value, previous) {
    if (previous && !previous.etag) throw Error('Falta la versión del acceso');
    await storage.put(pathFor(reference), JSON.stringify(value), {
      access: 'private', addRandomSuffix: false, allowOverwrite: !!previous,
      ...(previous ? { ifMatch: previous.etag } : {}), contentType: 'application/json'
    });
  }
  async function issue() {
    const code = randomSecret(), reference = hash(code), expiresAt = now() + 24 * 60 * 60 * 1000;
    await write(reference, { state: 'unused', expiresAt });
    return { code, reference, expiresAt };
  }
  async function activate(code, secret) {
    if (!secretValid(code) || !secretValid(secret)) throw failure(400, 'Código inválido.');
    const reference = hash(code), credential = hash(secret);
    const current = await read(reference);
    if (!current || current.value.state === 'revoked') throw failure(400, 'Código inválido o revocado.');
    if (current.value.state === 'unused' && current.value.expiresAt <= now()) throw failure(410, 'El código venció.');
    if (current.value.state === 'unused') {
      try { await write(reference, { state: 'active', credential, activatedAt: now() }, current); }
      catch (error) {
        const updated = await read(reference);
        if (!updated || updated.value.state === 'unused') throw error;
        if (updated.value.state !== 'active' || !match(credential, updated.value.credential)) {
          throw failure(409, 'El código ya no está disponible.');
        }
      }
    } else if (current.value.state !== 'active' || !match(credential, current.value.credential)) {
      throw failure(409, 'El código ya fue utilizado.');
    }
    return { token: 'onoff1.' + reference + '.' + secret };
  }
  async function authorized(token) {
    const parts = /^onoff1\.([a-f0-9]{64})\.([\w-]{43})$/.exec(token);
    if (!parts) return false;
    const record = await read(parts[1]);
    return record?.value.state === 'active' && match(hash(parts[2]), record.value.credential);
  }
  async function revoke(reference) {
    if (!referenceValid(reference)) throw failure(400, 'Referencia inválida.');
    for (let attempt=0; attempt<2; attempt++) {
      const record = await read(reference);
      if (!record) throw failure(404, 'Acceso no encontrado.');
      if (record.value.state === 'revoked') return;
      try { await write(reference, { state: 'revoked', revokedAt: now() }, record); return; }
      catch (error) { if (attempt===1) throw error; }
    }
  }
  return { issue, activate, authorized, revoke };
}
module.exports = { createActivationService };
