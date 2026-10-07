'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/followups-transport.js'), 'utf8');
function harness() {
 const listeners = {}, calls = [];
 const settings = { backendUrl: 'https://preview.example.com' };
 const ctx = vm.createContext({ URL, AbortSignal, console, setTimeout, clearTimeout, chrome: { runtime: { id:'extension-id', onMessage: {addListener: cb => listeners.message=cb} }, storage: {sync:{get:async()=>settings},onChanged:{addListener:cb=>listeners.change=cb}} }, fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});await new Promise(r=>setTimeout(r,5));return {ok:true,status:200,json:async()=>({ok:true,tasks:[],updatedAt:new Date().toISOString()})};} });
 vm.runInContext(source,ctx);
 const send=(payload,id='extension-id')=>new Promise(resolve=>listeners.message({type:'ONOFF_FOLLOWUPS_REQUEST',payload},{id},resolve));
 return {send,calls,listeners,settings};
}
test('transport coalesces and caches identical calls across tabs',async()=>{
 const h=harness();const payload={action:'tasks',ownerIds:['10']};await Promise.all([h.send(payload),h.send(payload)]);assert.equal(h.calls.length,1);
 const cached=await h.send(payload);assert.equal(cached.clientCache,true);assert.equal(h.calls.length,1);
 await h.send({...payload,force:true});assert.equal(h.calls.length,2);
});
test('transport rejects external senders, arbitrary actions, and backend query strings',async()=>{
 const h=harness();assert.equal((await h.send({action:'tasks',ownerIds:['10']},'other')).ok,false);
 assert.equal((await h.send({action:'delete'})).ok,false);assert.equal(h.calls.length,0);
 h.settings.backendUrl='https://preview.example.com/?key=bad';assert.equal((await h.send({action:'sac'})).ok,false);assert.equal(h.calls.length,0);
});
test('changing backend invalidates cached responses',async()=>{
 const h=harness();await h.send({action:'sac'});h.settings.backendUrl='https://other.example.com';h.listeners.change({backendUrl:{}},'sync');await h.send({action:'sac'});assert.equal(h.calls.length,2);assert.ok(h.calls[1].url.startsWith('https://other.example.com/'));
});
