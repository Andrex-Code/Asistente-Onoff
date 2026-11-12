const fs=require('node:fs/promises');const path=require('node:path');
(async()=>{const root=path.resolve(__dirname,'..');const out=path.join(root,'dist','ikono-summary-preview');await fs.mkdir(out,{recursive:true});
for(const file of ['manifest.json','guard.js','move.js','memory.js','hub.js','dashboard.js','background.js','review.js','auto.js','task.js','images.js','ocr.js','ocr.html'])await fs.copyFile(path.join(root,'tools/ikono-summary-preview',file),path.join(out,file));
await fs.copyFile(path.join(root,'src/ikono-classification.cjs'),path.join(out,'classification.js'));
await fs.copyFile(path.join(root,'src/ikono-tc.cjs'),path.join(out,'tc.js'));
await fs.copyFile(path.join(root,'src/ikono-image-evidence.cjs'),path.join(out,'image-evidence.js'));
// Pinned local OCR engine. No runtime CDN or image upload.
const tess=path.dirname(require.resolve('tesseract.js/package.json'));
const core=path.dirname(require.resolve('tesseract.js-core',{paths:[tess]}));
const language=path.dirname(require.resolve('@tesseract.js-data/spa/package.json'));
await fs.mkdir(path.join(out,'vendor','core'),{recursive:true});
for(const file of ['tesseract.min.js','worker.min.js'])await fs.copyFile(path.join(tess,'dist',file),path.join(out,'vendor',file));
for(const file of (await fs.readdir(core)).filter(file=>file.endsWith('.wasm.js')))await fs.copyFile(path.join(core,file),path.join(out,'vendor','core',file));
await fs.copyFile(path.join(language,'4.0.0_best_int/spa.traineddata.gz'),path.join(out,'vendor/spa.traineddata.gz'));
await fs.copyFile(path.join(tess,'LICENSE.md'),path.join(out,'vendor/TESSERACT-LICENSE.txt'));
await fs.copyFile(path.join(core,'LICENSE'),path.join(out,'vendor/CORE-LICENSE.txt'));
await fs.copyFile(path.join(root,'src/ikono-close-probe.cjs'),path.join(out,'probe.js'));console.log(out);
})().catch(error=>{console.error(error);process.exitCode=1;});
