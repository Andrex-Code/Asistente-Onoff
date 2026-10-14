const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/scripts-data.js'),'utf8'),context);
const scripts=context.ONOFFScriptsData;
test('Catálogo incluye los 153 mensajes de YaDinero y 9 de Domicilios ON',()=>{
  assert.equal(scripts.length,162);assert.equal(scripts.filter(s=>s.channel==='YaDinero').length,153);assert.equal(scripts.filter(s=>s.channel==='Tiendas ON').length,9);assert.equal(new Set(scripts.map(s=>s.id)).size,162);
  assert.equal(scripts.some(s=>s.source.sheet==='Domicilios ON'&&s.source.cell==='B6'),false);
});
test('Cada variable requiere un campo distinto y conserva su origen',()=>{
  for(const script of scripts){assert.ok(script.originalText);assert.ok(script.topic);assert.match(script.source.cell,/^B\d+$/);assert.equal(script.category,script.source.sheet);const tokens=[...script.template.matchAll(/\{\{([^}]+)\}\}/g)].map(m=>m[1]);assert.equal(new Set(tokens).size,tokens.length);assert.deepEqual([...tokens].sort(),Array.from(script.fields,f=>f.id).sort());assert.doesNotMatch(script.template,/(?<![A-Za-z])X{2,}(?![A-Za-z])/i);}
  assert.equal(scripts.find(s=>s.id==='solicitud-b15').fields.length,3);assert.equal(scripts.find(s=>s.id==='pqr-b10').fields.length,7);
});
test('Los saludos usan el nombre propio del asesor y mantienen el original',()=>{
  for(const id of ['bienvenida-b1','domicilios-on-b1']){const script=scripts.find(s=>s.id===id);assert.match(script.originalText,/Mi nombre es Alejandra Gutiérrez/);assert.match(script.template,/Mi nombre es \{\{asesor\}\}/);assert.equal(script.fields[0].profile,true);}
});
