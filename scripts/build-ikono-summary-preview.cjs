const fs=require('node:fs/promises');const path=require('node:path');
(async()=>{const root=path.resolve(__dirname,'..');const out=path.join(root,'dist','ikono-summary-preview');await fs.mkdir(out,{recursive:true});
for(const file of ['manifest.json','background.js','review.js','auto.js'])await fs.copyFile(path.join(root,'tools/ikono-summary-preview',file),path.join(out,file));
await fs.copyFile(path.join(root,'src/ikono-classification.cjs'),path.join(out,'classification.js'));
await fs.copyFile(path.join(root,'src/ikono-tc.cjs'),path.join(out,'tc.js'));
await fs.copyFile(path.join(root,'src/ikono-close-probe.cjs'),path.join(out,'probe.js'));console.log(out);
})().catch(error=>{console.error(error);process.exitCode=1;});
