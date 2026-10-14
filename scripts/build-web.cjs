// The Vercel project expects a public output folder. Package only the static
// administration UI here; serverless /api handlers remain at repository root.
const fs = require('node:fs/promises');
const path = require('node:path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const source = path.join(root, 'admin');
  const destination = path.join(root, 'public');
  await fs.access(path.join(source, 'index.html'));
  await fs.mkdir(destination, { recursive: true });
  await fs.cp(source, path.join(destination, 'admin'), { recursive: true, force: true });
  await fs.writeFile(
    path.join(destination, 'index.html'),
    '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Asistente ONOFF</title></head><body style="font-family:system-ui,sans-serif;margin:3rem;color:#18352b"><h1>Asistente ONOFF</h1><p>Servicio de apoyo para la extensi\u00f3n de navegador.</p><a href="/admin/">Administraci\u00f3n</a></body></html>\n',
    'utf8'
  );
  console.log('Salida web preparada en public/ con administraci\u00f3n y sin datos privados.');
})().catch(error => { console.error(error); process.exitCode = 1; });
