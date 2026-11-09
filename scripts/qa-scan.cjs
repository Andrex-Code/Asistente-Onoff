// Real offline OCR/barcode + screenshot/crop flow, with only synthetic data.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs/promises'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'output/scan-qa');
const checks = [], requests = [];
let context;
const record = label => { checks.push(label); console.log('OK ' + label); };
const server = http.createServer(async (req, res) => {
  if (req.url === '/barcode.js') { res.setHeader('Content-Type', 'application/javascript;charset=utf-8'); return res.end(await fs.readFile(path.join(root, 'node_modules/jsbarcode/dist/JsBarcode.all.min.js'))); }
  res.setHeader('Content-Type', 'text/html;charset=utf-8');
  res.end('<!doctype html><html><body style="margin:0;background:#f2f5f3"><canvas id="label" width="700" height="280" style="position:absolute;left:80px;top:160px"></canvas><script src="/barcode.js"></script></body></html>');
});
(async () => {
  try {
    await fs.mkdir(output, { recursive: true });
    await new Promise(resolve => server.listen(0, resolve));
    const base = 'http://localhost:' + server.address().port;
    context = await chromium.launchPersistentContext(path.join(output, 'profile-' + Date.now()), {
      channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
      args: ['--disable-extensions-except=' + root, '--load-extension=' + root, '--proxy-server=127.0.0.1:9', '--proxy-bypass-list=localhost;127.0.0.1;[::1]']
    });
    context.setDefaultTimeout(10000);
    context.on('console', message => { if (message.type() === 'error') console.error('Browser:', message.text()); });
    context.on('requestfailed', request => console.error('Resource failed:', request.url(), request.failure()?.errorText));
    context.on('request', r => requests.push(r.url()));
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const page = await context.newPage(); await page.goto(base);
    await page.evaluate(() => {
      const canvas = document.querySelector('#label'), ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 700, 280); ctx.fillStyle = '#000'; ctx.font = 'bold 42px Arial'; ctx.fillText('TC 8968', 35, 62);
      const barcode = document.createElement('canvas');
      JsBarcode(barcode, '896812345678', { format: 'CODE128', width: 3, height: 110, displayValue: false, margin: 12 });
      ctx.drawImage(barcode, 35, 90);
      ctx.font = '28px Arial'; ctx.fillText('896812345678', 200, 255);
    });
    const scan = page.getByRole('button', { name: 'Capturar texto o código de barras' });
    await page.locator('.onoff-mascot').click();
    await scan.waitFor();
    assert.ok(await scan.evaluate(el => el.nextElementSibling?.hasAttribute('data-menu-close')));
    record('Icono de escaneo situado junto al cierre del menú');
    await page.locator('.onoff-menu-head').screenshot({ path: path.join(output, 'scan-icon.png') });
    await scan.click();
    const host = page.locator('.onoff-image-scan');
    await host.locator('.capture').waitFor();
    await page.keyboard.press('Escape');
    await host.waitFor({ state: 'detached' });
    record('Escape cancela sin extraer ni guardar una captura');
    await page.evaluate(() => { document.querySelector('.ikono-translator-panel').hidden = false; });
    await page.waitForTimeout(600); await scan.click();
    await host.locator('.capture').waitFor();
    await page.mouse.move(80, 160); await page.mouse.down(); await page.mouse.move(780, 440, { steps: 8 }); await page.mouse.up();
    await host.getByRole('button', { name: 'Leer selección' }).click();
    await host.getByRole('button', { name: 'Copiar código' }).waitFor({ timeout: 90000 });
    assert.equal(await host.locator('code').textContent(), '896812345678');
    record('Decodifica un código de barras real desde el recorte de pantalla');
    const text = host.getByRole('textbox', { name: 'Texto extraído' });
    assert.match(await text.inputValue(), /TC\s*8968/);
    record('OCR real reconoce TC 8968 usando únicamente recursos empaquetados');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    await host.getByRole('button', { name: 'Copiar código' }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '896812345678');
    record('Copiar conserva exactamente los dígitos decodificados');
    await page.screenshot({ path: path.join(output, 'resultado.png') });
    await host.locator('.result').screenshot({ path: path.join(output, 'reader-result.png') });
    await host.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('.onoff-image-scan'));
    const stored = await worker.evaluate(() => chrome.storage.local.get(null));
    assert.ok(!JSON.stringify(stored).includes('896812345678'));
    record('Cerrar retira la captura; el código no se almacena en preferencias');
    const external = requests.filter(url => /^https?:/.test(url) && new URL(url).hostname !== 'localhost');
    assert.deepEqual(external, []);
    record('Cero solicitudes externas durante captura y reconocimiento');
    await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ checks, externalRequests: external.length }, null, 2));
  } catch (error) {
    console.error(error); process.exitCode = 1;
    if (context) {
      const pages = context.pages(); for (const page of pages) { console.error(await page.locator('body').innerText().catch(() => '')); await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {}); }
    }
  } finally { await context?.close(); await new Promise(resolve => server.close(resolve)); }
})();
