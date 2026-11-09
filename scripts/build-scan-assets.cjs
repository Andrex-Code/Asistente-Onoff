// Bundle pinned engines and Spanish language data. No runtime CDN requests.
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const destination = path.resolve(__dirname, '../src/vendor/scan');
  await fs.mkdir(destination, { recursive: true });
  const tess = path.dirname(require.resolve('tesseract.js/package.json'));
  const core = path.dirname(require.resolve('tesseract.js-core', { paths: [tess] }));
  const zxing = path.dirname(require.resolve('@zxing/library/package.json'));
  const language = path.dirname(require.resolve('@tesseract.js-data/spa/package.json'));
  for (const file of ['tesseract.min.js', 'worker.min.js']) await fs.copyFile(path.join(tess, 'dist', file), path.join(destination, file));
  await fs.mkdir(path.join(destination, 'core'), { recursive: true });
  for (const file of (await fs.readdir(core)).filter(file => file.endsWith('.wasm.js'))) {
    await fs.copyFile(path.join(core, file), path.join(destination, 'core', file));
  }
  await fs.copyFile(path.join(zxing, 'umd/index.min.js'), path.join(destination, 'zxing.min.js'));
  await fs.copyFile(path.join(language, '4.0.0_best_int/spa.traineddata.gz'), path.join(destination, 'spa.traineddata.gz'));
  await fs.copyFile(path.join(tess, 'LICENSE.md'), path.join(destination, 'TESSERACT-LICENSE.txt'));
  await fs.copyFile(path.join(core, 'LICENSE'), path.join(destination, 'CORE-LICENSE.txt'));
  await fs.copyFile(path.join(zxing, 'LICENSE'), path.join(destination, 'ZXING-LICENSE.txt'));
  console.log('Motores de lectura y datos en español preparados para uso sin conexión.');
})().catch(error => { console.error(error); process.exitCode = 1; });
