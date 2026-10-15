// Local visual fixture only. It neither loads the extension nor connects to SGC.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end('<!doctype html><html><head><title>Buscar en SGC · Vista de desarrollo</title></head><body style="margin:0"><iframe title="Vista SGC con datos ficticios" src="/preview" style="display:block;width:100%;height:100vh;border:0"></iframe></body></html>');
      return;
    }
    // The iframe keeps installed top-frame extensions out of the fixture UI.
    const relative = pathname === '/preview' ? 'tests/fixtures/sgc-preview.html' : pathname.slice(1);
    if (pathname !== '/preview' && !/^src\/[a-z-]+\.(?:js|css)$/.test(relative)) { res.writeHead(404).end(); return; }
    const file = path.join(root, relative);
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
server.listen(0, '127.0.0.1', () => console.log(`Vista SGC con datos ficticios: http://127.0.0.1:${server.address().port}`));
