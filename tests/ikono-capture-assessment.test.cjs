const {test} = require('node:test');
const assert = require('node:assert/strict');
const {assessCapture} = require('../src/ikono-capture-assessment.cjs');
test('observed 46 to 40 capture is partial and omits six', () => {
  const result=assessCapture({eligibleCount:46,retainedCount:40});
  assert.equal(result.omittedCount,6);assert.equal(result.coverage,'partial');
  assert.equal(result.usableAsCompleteAttention,false);
});
test('below the cap does not prove complete history', () => {
  const result=assessCapture({eligibleCount:26,retainedCount:26});
  assert.equal(result.coverage,'unknown');assert.equal(result.usableAsCompleteAttention,false);
});
test('room identity alone does not verify a recurring attention', () => {
  const result=assessCapture({eligibleCount:26,retainedCount:26,roomIdentityVerified:true,
    attentionBoundariesVerified:true,historyCompletenessVerified:true});
  assert.ok(result.reasons.includes('attention_identity_unverified'));
});
test('complete room history without attention boundaries is not usable', () => {
  const result=assessCapture({eligibleCount:26,retainedCount:26,attentionIdentityVerified:true,historyCompletenessVerified:true});
  assert.equal(result.coverage,'unknown');assert.equal(result.usableAsCompleteAttention,false);
});
test('changing DOM window requires a fresh verified snapshot', () => {
  const result=assessCapture({eligibleCount:26,retainedCount:26,attentionIdentityVerified:true,
    attentionBoundariesVerified:true,historyCompletenessVerified:true,domWindowChanged:true});
  assert.equal(result.usableAsCompleteAttention,false);assert.ok(result.reasons.includes('dom_window_changed'));
});
test('only explicit verified evidence allows complete-attention use', () => {
  const result=assessCapture({eligibleCount:26,retainedCount:26,attentionIdentityVerified:true,
    attentionBoundariesVerified:true,historyCompletenessVerified:true});
  assert.equal(result.usableAsCompleteAttention,true);assert.deepEqual(result.reasons,[]);
});
test('invalid and empty counts cannot pass', () => {
  for(const counts of [[-1,0],[2,3],[NaN,0],[1.5,1]])assert.throws(()=>assessCapture({eligibleCount:counts[0],retainedCount:counts[1]}));
  assert.equal(assessCapture({eligibleCount:0,retainedCount:0,attentionIdentityVerified:true,
    attentionBoundariesVerified:true,historyCompletenessVerified:true}).usableAsCompleteAttention,false);
});
