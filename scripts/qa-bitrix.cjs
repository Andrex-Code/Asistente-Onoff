// Isolated cross-origin browser regression. No production requests or real customer data.
const { chromium } = require(process.argv[2] || 'playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output', 'bitrix-qa');
let context;
const checks = [], calls = [];
const record = label => { checks.push(label); console.log('OK ' + label); };
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/api/bitrix/')) {
    res.setHeader('Content-Type', 'text/html');
    return res.end('<!doctype html><html><body><div class="ikono-translator-panel"></div></body></html>');
  }
  // Intentionally no CORS headers: the old content-script fetch must fail.
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw); calls.push({ endpoint: req.url, body });
  res.setHeader('Content-Type', 'application/json');
  if (body.tc === '9999') { res.writeHead(503); return res.end(JSON.stringify({ ok: false, error: 'Bitrix de prueba no disponible.' })); }
  const data = req.url.endsWith('search-deal')
    ? { ok: true, deals: [{ id: '14008', tc: body.tc, title: 'Negociación de prueba', client: 'Cliente ficticio', url: 'https://example.com/deal' }] }
    : req.url.endsWith('search-company') ? { ok: true, companies: [{ id: '1', name: 'Cliente ficticio', url: 'https://example.com/client' }] }
    : req.url.endsWith('search-task') ? { ok: true, task: { id: body.taskId, title: 'Radicado de prueba', url: 'https://example.com/task' } }
    : { ok: true, open: [], closed: [], counts: { open: 0, closed: 0 } };
  res.end(JSON.stringify(data));
});

(async () => {
  try {
    await fs.mkdir(output, { recursive: true });
    await new Promise(resolve => server.listen(0, resolve));
    const port = server.address().port, backend = 'http://localhost:' + port;
    context = await chromium.launchPersistentContext(path.join(output, 'profile-' + Date.now()), {
      channel: 'chromium', headless: true,
      args: ['--disable-extensions-except=' + root, '--load-extension=' + root, '--proxy-server=127.0.0.1:9', '--proxy-bypass-list=localhost;127.0.0.1;[::1]']
    });
    context.setDefaultTimeout(10000);
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    await worker.evaluate(async backendUrl => {
      for (let n = 0; n < 100; n++) {
        if ((await chrome.storage.sync.get('provider')).provider) break;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      await chrome.storage.sync.set({ backendUrl });
    }, backend);
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:' + port);
    const blocked = await page.evaluate(async url => {
      try { await fetch(url + '/api/bitrix/search-deal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"tc":"8968"}' }); return false; }
      catch { return true; }
    }, backend);
    assert.ok(blocked); record('El navegador reproduce el bloqueo del fetch directo entre orígenes');
    // The manifest loads the real content script in its isolated extension world.
    await page.locator('[data-action=bitrix-search]').click();
    const panel = page.locator('.onoff-bitrix-search');
    async function search(value) { await panel.locator('input').fill(value); await panel.locator('button[type=submit]').click(); }
    await search('TC8968');
    await panel.locator('.onoff-bitrix-card').waitFor();
    assert.match(await panel.innerText(), /TC8968/);
    await panel.locator('.onoff-bitrix-task-group').first().waitFor();
    record('TC 8968 y tareas funcionan por el service worker sin CORS en el servidor');
    await search('9999');
    await panel.locator('[data-type=error]').waitFor();
    assert.match(await panel.locator('[data-type=error]').innerText(), /HTTP 503.*Bitrix de prueba/);
    assert.equal(await panel.locator('button[type=submit]').isEnabled(), true);
    record('Un error HTTP conserva el detalle y permite volver a buscar');
    await panel.locator('[data-mode=identification]').click(); await search('123456');
    await panel.locator('.onoff-bitrix-card').waitFor();
    assert.match(await panel.innerText(), /Cliente ficticio/); record('Búsqueda por identificación funciona');
    await panel.locator('[data-mode=task]').click(); await search('505942');
    await panel.locator('.onoff-bitrix-card').waitFor();
    assert.match(await panel.innerText(), /505942/); record('Búsqueda por radicado funciona');
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, calls, productionRequests: 0 }, null, 2));
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { await context?.close(); await new Promise(resolve => server.close(resolve)); }
})();
