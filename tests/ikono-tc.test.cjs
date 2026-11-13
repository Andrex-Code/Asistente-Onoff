const {test}=require('node:test'),assert=require('node:assert/strict');const {parseTCCandidates:parse}=require('../src/ikono-tc.cjs');
test('extracts deduplicated numeric prefixes of person and business names, excludes phone and trailing numbers',()=>{
 assert.deepEqual(parse('70999RODRIGO DUQUE GALVEZ (Cali) (70999Mercapremium) (6985Granos Y Licores 2001) (573227142843)').map(c=>c.code),['TC70999','TC6985']);
 assert.deepEqual(parse('TC - 70999 - Cliente (Negocio) - Cali'),[{code:'TC70999',source:'explicit'}]);
 assert.deepEqual(parse('70999 - Cliente (6985 - Otro negocio)').map(c=>c.code),['TC70999','TC6985']);
 assert.deepEqual(parse('Cliente 70999 (Negocio 2001) (573227142843)'),[]);
 assert.deepEqual(parse('573227142843Cliente'),[]);
 assert.deepEqual(parse('70999Cliente TC70999'),[{code:'TC70999',source:'explicit'}]);
});

test('short suffix after a name is a candidate, while phone numbers and ambiguous years are excluded',()=>{assert.deepEqual(parse('Cliente-61523 (573000000000)').map(c=>c.code),['TC61523']);assert.deepEqual(parse('Cliente - 573000000000'),[]);assert.deepEqual(parse('Negocio-2026'),[]);});

const {parseChatTCCandidates:chat}=require('../src/ikono-tc.cjs');
test('chat extraction handles varied TC language, punctuation and contextual numeric answers',()=>{for(const text of ['mi TC es 5900','La T.C. es: 5900.','TC número 5900','TC: 5900','TC5900','la TC corresponde a 5900','código de la tienda: 5900','código del establecimiento es 5900','plataforma 5900','tc5900@ad']){assert.deepEqual(chat([{text}]).map(c=>c.code),['TC5900'],text);}assert.deepEqual(chat([{text:'¿Me confirmas cuál es la TC?'},{text:'70821'}]).map(c=>c.code),['TC70821']);});
test('phone/date/ticket/bare-number are not TC; questions, negation and multiple TC stay reviewable',()=>{for(const text of ['Teléfono 573007561667','radicado 523536','5900','TC 573007561667','TC 2026/11/13','TC 5900.50'])assert.deepEqual(chat([{text}]),[],text);assert.equal(chat([{text:'¿Es la TC 5900?'}])[0].uncertain,true);assert.equal(chat([{text:'No es TC5900'}])[0].uncertain,true);assert.deepEqual(chat([{text:'TC5900 o TC5046'}]).map(c=>c.code),['TC5900','TC5046']);assert.equal(chat([{text:'Mi TC es 5900, radicado 523536'}])[0].uncertain,false);});
