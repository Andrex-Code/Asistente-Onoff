const {test}=require('node:test'),assert=require('node:assert/strict');const {parseTCCandidates:parse}=require('../src/ikono-tc.cjs');
test('extracts deduplicated numeric prefixes of person and business names, excludes phone and trailing numbers',()=>{
 assert.deepEqual(parse('70999RODRIGO DUQUE GALVEZ (Cali) (70999Mercapremium) (6985Granos Y Licores 2001) (573227142843)').map(c=>c.code),['TC70999','TC6985']);
 assert.deepEqual(parse('TC - 70999 - Cliente (Negocio) - Cali'),[{code:'TC70999',source:'explicit'}]);
 assert.deepEqual(parse('70999 - Cliente (6985 - Otro negocio)').map(c=>c.code),['TC70999','TC6985']);
 assert.deepEqual(parse('Cliente 70999 (Negocio 2001) (573227142843)'),[]);
 assert.deepEqual(parse('573227142843Cliente'),[]);
 assert.deepEqual(parse('70999Cliente TC70999'),[{code:'TC70999',source:'explicit'}]);
});
