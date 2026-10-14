const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
  const root=await fs.realpath(path.resolve(__dirname,'..'));
  const manifest=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'));
  if(manifest.manifest_version!==3)throw Error('Se requiere Manifest V3');
  const references=[manifest.background.service_worker,manifest.options_page,manifest.action.default_popup,...Object.values(manifest.icons),...manifest.content_scripts.flatMap(s=>[...s.js,...s.css])];
  for(const file of references)await fs.access(path.join(root,file));
  const dist=path.join(root,'dist');await fs.mkdir(dist,{recursive:true});
  if(await fs.realpath(dist)!==dist)throw Error('dist debe ser una carpeta dentro del repositorio');
  const target=path.resolve(dist,'extension');
  if(path.dirname(target)!==dist)throw Error('Destino de build fuera de dist');
  // Delete only the verified build directory; source and private data stay outside this package.
  await fs.rm(target,{recursive:true,force:true});await fs.mkdir(target,{recursive:true});
  for(const directory of ['src','icons'])await fs.cp(path.join(root,directory),path.join(target,directory),{recursive:true,force:true});
  await fs.copyFile(path.join(root,'manifest.json'),path.join(target,'manifest.json'));
  console.log('Extensión preparada en dist/extension. '+references.length+' recursos del manifest verificados.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
