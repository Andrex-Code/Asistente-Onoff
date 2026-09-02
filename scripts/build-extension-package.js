const fs = require('node:fs');
const path = require('node:path');

const installToken = String(process.env.ONOFF_INSTALL_TOKEN || '').trim();
if (!/^onoff_install_[A-Za-z0-9_-]{30,120}$/.test(installToken)) {
  console.error('Falta ONOFF_INSTALL_TOKEN o tiene un formato inválido.');
  process.exit(1);
}

const backendUrl = normalizeBackend(process.env.ONOFF_BACKEND_URL || 'https://asistente-onoff.vercel.app');
if (!backendUrl) {
  console.error('ONOFF_BACKEND_URL no corresponde al backend oficial ni a un Preview válido de Asistente ONOFF.');
  process.exit(1);
}

const vercelBypass = String(process.env.ONOFF_VERCEL_BYPASS || '').trim();
const isPreview = backendUrl.origin !== 'https://asistente-onoff.vercel.app' && backendUrl.hostname.endsWith('.vercel.app');
if (isPreview && !vercelBypass) {
  console.error('Este paquete apunta a un Preview protegido. Falta ONOFF_VERCEL_BYPASS.');
  console.error('Genere Protection Bypass for Automation en Vercel y vuelva a construir el paquete.');
  process.exit(1);
}
if (vercelBypass && !/^[A-Za-z0-9._~-]{16,512}$/.test(vercelBypass)) {
  console.error('ONOFF_VERCEL_BYPASS tiene un formato inválido.');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist', 'Asistente-Onoff');
const include = ['manifest.json', 'src', 'icons'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const entry of include) {
  fs.cpSync(path.join(root, entry), path.join(out, entry), { recursive: true });
}

const manifestPath = path.join(out, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.host_permissions = Array.from(new Set([
  ...(manifest.host_permissions || []),
  `${backendUrl.origin}/*`
]));
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

fs.writeFileSync(
  path.join(out, 'src', 'install-config.js'),
  [
    '// Generated distribution file. Do not commit.',
    `globalThis.ONOFF_INSTALL_TOKEN = ${JSON.stringify(installToken)};`,
    `globalThis.ONOFF_BACKEND_URL = ${JSON.stringify(backendUrl.origin)};`,
    `globalThis.ONOFF_VERCEL_BYPASS = ${JSON.stringify(vercelBypass)};`,
    ''
  ].join('\n'),
  'utf8'
);

console.log(`Paquete listo en: ${out}`);
console.log(`Backend del paquete: ${backendUrl.origin}`);
console.log(`Bypass de Preview: ${vercelBypass ? 'configurado' : 'no requerido'}`);
console.log('Entregue únicamente la carpeta dist/Asistente-Onoff a los asesores.');

function normalizeBackend(value) {
  try {
    const url = new URL(String(value || '').trim());
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (local) return url.protocol === 'http:' ? new URL(url.origin) : null;
    if (url.protocol !== 'https:') return null;
    if (url.origin === 'https://asistente-onoff.vercel.app') return new URL(url.origin);
    const isVercelPreview = url.hostname.endsWith('.vercel.app') && /^asistente-onoff[-.]/i.test(url.hostname);
    return isVercelPreview ? new URL(url.origin) : null;
  } catch {
    return null;
  }
}
