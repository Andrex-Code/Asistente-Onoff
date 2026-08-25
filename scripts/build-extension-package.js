const fs = require('node:fs');
const path = require('node:path');

const installToken = String(process.env.ONOFF_INSTALL_TOKEN || '').trim();
if (!/^onoff_install_[A-Za-z0-9_-]{30,120}$/.test(installToken)) {
  console.error('Falta ONOFF_INSTALL_TOKEN o tiene un formato inválido.');
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

fs.writeFileSync(
  path.join(out, 'src', 'install-config.js'),
  `// Generated distribution file. Do not commit.\nglobalThis.ONOFF_INSTALL_TOKEN = ${JSON.stringify(installToken)};\n`,
  'utf8'
);

console.log(`Paquete listo en: ${out}`);
console.log('Entregue únicamente la carpeta dist/Asistente-Onoff a los asesores.');
