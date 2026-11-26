const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const vm=require('node:vm');

function bootTaskWorker(globals){
 const load=file=>vm.runInContext(readFileSync(resolve('tools/ikono-summary-preview',file),'utf8'),context,{filename:file});
 const context=vm.createContext({
  setTimeout,...globals,
  importScripts:(...files)=>files.filter(file=>file!=='pilot-auth.js'&&file!=='delivery.js').forEach(load)
 });
 return load('task-background.js');
}

module.exports={bootTaskWorker};
