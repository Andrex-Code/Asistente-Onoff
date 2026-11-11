const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'dist', 'ikono-probe');
  await fs.mkdir(output, {recursive:true});
  for (const file of ['manifest.json','background.js','panel.js']) await fs.copyFile(path.join(root,'tools/ikono-probe',file),path.join(output,file));
  await fs.copyFile(path.join(root,'src/ikono-classification.cjs'),path.join(output,'classification.js'));
  await fs.copyFile(path.join(root,'src/ikono-close-probe.cjs'),path.join(output,'probe.js'));
  console.log(output);
})().catch(error => { console.error(error); process.exitCode=1; });
