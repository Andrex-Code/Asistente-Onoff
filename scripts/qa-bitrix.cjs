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
    return res.end('<!doctype html><html><body>Prueba de búsqueda exacta ONOFF</body></html>');
  }
  // Intentionally no CORS headers: the old content-script fetch must fail.
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = JSON.parse(raw); calls.push({ endpoint: req.url, body });
  res.setHeader('Content-Type', 'application/json');
  if (body.tc === '9999') { res.writeHead(503); return res.end(JSON.stringify({ ok: false, error: 'Bitrix de prueba no disponible.' })); }
  const data = req.url.endsWith('search-deal')
    ? { ok: true, deals: [
      ...(body.tc === '898' ? [] : [{ id: '14008', tc: body.tc, title: 'Negociación de prueba', client: 'Cliente ficticio', url: 'https://example.com/deal',
        plan: body.tc === '897' ? { status: 'empty', items: [] } : { status: 'available', items: ['Servicio anual de prueba', 'Equipo POS'] },
        company: body.tc === '897' ? { status: 'none' } : { status: 'available', name: 'Compañía de prueba S.A.S.', identification: '900000000-0', phones: ['+57 300 000 0000'], emails: ['contacto@example.com'], url: 'https://example.com/company' }
      }]),
      { id: 'similar', tc: body.tc + '8', title: 'Similar de otro cliente', url: 'https://example.com/other' }
    ] }
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
      // Keep this focused search regression clear of the floating launcher.
      await chrome.storage.local.set({ onoffBitrixSearchPosition: { left: 20, top: 100 }, onoffBitrixSearchUserPlaced: true });
    }, backend);
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:' + port);
    const blocked = await page.evaluate(async url => {
      try { await fetch(url + '/api/bitrix/search-deal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"tc":"8968"}' }); return false; }
      catch { return true; }
    }, backend);
    assert.ok(blocked); record('El navegador reproduce el bloqueo del fetch directo entre orígenes');
    // The manifest loads the real content script in its isolated extension world.
    await page.locator('.onoff-mascot').click();
    await page.locator('[data-action=bitrix-search]').click();
    const panel = page.locator('.onoff-bitrix-search');
    await panel.getByRole('button', { name: 'Fijar ventana', exact: true }).click();
    assert.equal(await panel.getAttribute('data-pinned'), 'true');
    assert.equal((await worker.evaluate(()=>chrome.storage.local.get('onoffBitrixSearchPinned'))).onoffBitrixSearchPinned, true);
    await panel.getByRole('button', { name: 'Fijar ventana', exact: true }).click();
    const header = panel.locator('.onoff-bitrix-header');
    const before = await panel.boundingBox(); const handle = await header.boundingBox();
    await page.mouse.move(handle.x+60,handle.y+15); await page.mouse.down(); await page.mouse.move(handle.x+100,handle.y+55,{steps:6}); await page.mouse.up();
    const after = await panel.boundingBox(); assert.ok(after.x>before.x+20 && after.y>before.y+20);
    await header.locator('strong').dblclick(); assert.ok(await panel.evaluate(el=>el.classList.contains('is-minimized')));
    await header.locator('strong').dblclick(); assert.equal(await panel.evaluate(el=>el.classList.contains('is-minimized')),false);
    record('Ventana se mueve, recuerda posición, permite fijar y minimiza con doble clic');
    async function search(value) { await panel.locator('input').fill(value); await panel.locator('button[type=submit]').click(); }
    await search('TC8968');
    await panel.locator('.onoff-bitrix-card').first().waitFor();
    assert.match(await panel.innerText(), /TC8968/);
    await panel.locator('.onoff-bitrix-task-group').first().waitFor();
    record('TC 8968 y tareas funcionan por el service worker sin CORS en el servidor');
    const card = panel.locator('.onoff-bitrix-card').first();
    assert.equal(await card.getByRole('tab', { name: 'Negociación', exact: true }).getAttribute('aria-selected'), 'true');
    assert.match(await card.innerText(), /Servicio anual de prueba/);
    assert.equal(await card.locator('dt').filter({ hasText: /^(Estado|Responsable|ID)$/ }).count(), 0);
    const requestCount = calls.length;
    await card.getByRole('tab', { name: 'Compañía', exact: true }).click();
    assert.match(await card.innerText(), /900000000-0/);
    assert.match(await card.innerText(), /contacto@example.com/);
    assert.match(await card.innerText(), /\+57 300 000 0000/);
    assert.equal(await card.getByRole('button', { name: 'Abrir compañía', exact: true }).count(), 1);
    assert.equal(await card.getByRole('button', { name: 'Abrir negociación', exact: true }).isVisible(), false);
    assert.equal(calls.length, requestCount);
    await card.screenshot({ path: path.join(output, 'company-tab.png') });
    await panel.screenshot({ path: path.join(output, 'compact-window.png') });
    await card.getByRole('tab', { name: 'Compañía', exact: true }).press('ArrowLeft');
    assert.equal(await card.getByRole('tab', { name: 'Negociación', exact: true }).getAttribute('aria-selected'), 'true');
    await card.screenshot({ path: path.join(output, 'deal-tab.png') });
    record('Pestañas muestran plan y compañía, admiten teclado y no repiten consultas');
    assert.equal(await panel.locator('.onoff-bitrix-card').count(), 1);
    assert.match(await panel.locator('.onoff-bitrix-card').first().innerText(), /Coincidencia exacta/);
    record('La interfaz muestra solo la exacta cuando existe');
    await search('896'); await panel.locator('.onoff-bitrix-card').first().waitFor();
    assert.equal(await panel.locator('.onoff-bitrix-card').count(), 1);
    assert.match(await panel.locator('.onoff-bitrix-card').last().innerText(), /TC8968/);
    record('Buscar 896 muestra primero 896 y después 8968');
    assert.equal(await panel.locator('.onoff-bitrix-card').first().getByRole('tab', { name: 'Negociación', exact: true }).getAttribute('aria-selected'), 'true');
    await search('897'); await panel.locator('.onoff-bitrix-card').first().waitFor();
    assert.match(await panel.innerText(), /No hay productos registrados/);
    await panel.locator('.onoff-bitrix-card').first().getByRole('tab', { name: 'Compañía', exact: true }).click();
    assert.match(await panel.innerText(), /no tiene una compañía asociada/);
    assert.equal(await panel.getByRole('button', { name: 'Abrir compañía', exact: true }).count(), 0);
    record('Distingue compañía ausente y productos vacíos; cada búsqueda abre Negociación');
    await search('898'); await panel.locator('.onoff-bitrix-card').first().waitFor();
    assert.equal(await panel.locator('.onoff-bitrix-card').count(), 1);
    assert.match(await panel.locator('.onoff-bitrix-card').innerText(), /TC similar/);
    assert.equal(await panel.locator('.onoff-bitrix-tasks').count(), 0);
    record('Sin TC exacta muestra similares sin asociar tareas de otra TC');
    await search('9999');
    await panel.locator('[data-type=error]').waitFor();
    assert.match(await panel.locator('[data-type=error]').innerText(), /HTTP 503.*Bitrix de prueba/);
    assert.equal(await panel.locator('button[type=submit]').isEnabled(), true);
    record('Un error HTTP conserva el detalle y permite volver a buscar');
    await panel.locator('[data-mode=identification]').click(); await search('123456');
    await panel.locator('.onoff-bitrix-card').first().waitFor();
    assert.match(await panel.innerText(), /Cliente ficticio/); record('Búsqueda por identificación funciona');
    await panel.locator('[data-mode=task]').click(); await search('505942');
    await panel.locator('.onoff-bitrix-card').first().waitFor();
    assert.match(await panel.innerText(), /505942/); record('Búsqueda por radicado funciona');
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, calls, productionRequests: 0 }, null, 2));
  } catch (error) { console.error(error); console.error(JSON.stringify({ checks, calls })); process.exitCode = 1; }
  finally { await context?.close(); await new Promise(resolve => server.close(resolve)); }
})();
