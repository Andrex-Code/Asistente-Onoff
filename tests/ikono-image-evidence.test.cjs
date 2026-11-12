const {test}=require('node:test'),assert=require('node:assert/strict');const {imageEvidence:read}=require('../src/ikono-image-evidence.cjs');
test('OCR aliases and POS footer yield candidates, not AnyDesk numeric IDs or dates',()=>{
 assert.deepEqual(read('Su dirección tc70999@ad').candidates.map(c=>c.code),['TC70999']);
 assert.equal(read('70999/2/4\nVersión 7.1.1').candidates[0].reading,'70999/2/4');
 assert.equal(read('70999y2/4\nVersión 7.1.1').candidates[0].code,'TC70999');
 assert.deepEqual(read('123456789\n99/2/4\n2026/11/12\nInformación del 2026/11/12 09:41').candidates,[]);
 assert(read('a'.repeat(5000)).text.length<=1001);
});
