const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parseTCCandidates,parseChatTCCandidates,normalizeTaskTC}=require('../src/ikono-tc.cjs');
test('non-Esencial suffix is never silently attributed to the base TC',()=>{
 for(const code of ['TC20107-C','TC20107-R','TC20107-1','TC20107-3']){
  assert.deepEqual(parseTCCandidates(code),[],code);
  assert.deepEqual(parseChatTCCandidates([{text:'Mi TC es '+code}]),[],code);
  assert.equal(normalizeTaskTC(code),'',code);
 }
});
test('only exact Esencial -1-1 is canonicalized and ordinary TC remains valid',()=>{
 for(const text of ['TC20107','TC20107-1-1']){
  assert.deepEqual(parseTCCandidates(text).map(x=>x.code),['TC20107'],text);
  assert.deepEqual(parseChatTCCandidates([{text:'Mi TC es '+text}]).map(x=>x.code),['TC20107'],text);
 }
 assert.equal(normalizeTaskTC('20107-1-1'),'20107');
 assert.deepEqual(parseChatTCCandidates([{text:'Mi TC es TC20107-C, no TC20107'}]).map(x=>x.code),['TC20107']);
});
