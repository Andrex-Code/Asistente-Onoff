const {test} = require('node:test');
const assert = require('node:assert/strict');
const {assessReview} = require('../src/ikono-review-gate.cjs');
const complete = () => ({attentionId:'synthetic-attention-1',snapshotAttentionId:'synthetic-attention-1',
  identitySourceVerified:true,state:'RESUELTO',finalStateVerified:true,
  startedAtMs:1794410000000,closedAtMs:1794410100000,timestampsVerified:true,
  classification:{status:'selected',category:'Synthetic category',detail:'Synthetic detail'},
  capture:{eligibleCount:5,retainedCount:5,attentionIdentityVerified:true,
    attentionBoundariesVerified:true,historyCompletenessVerified:true}});
test('verified coherent facts can prepare human review, without submission output',()=>{
  assert.deepEqual(assessReview(complete()),{eligibleForHumanReview:true,reasons:[]});
});
test('ON_RATING with complete classification is not final closure',()=>{
  const input=complete();input.state='ON_RATING';input.closedAtMs=null;
  const result=assessReview(input);assert.equal(result.eligibleForHumanReview,false);
  assert.ok(result.reasons.includes('final_resolution_not_verified'));
});
test('pending, follow-up, menu and unknown states cannot pass',()=>{
  for(const state of ['PENDIENTE','EN SEGUIMIENTO','EN MENÚ','NEW_STATE',undefined]){
    assert.equal(assessReview({...complete(),state}).eligibleForHumanReview,false);
  }
});
test('modal disappearance and a resolved label do not replace verified state',()=>{
  assert.equal(assessReview({...complete(),finalStateVerified:false,modalDisappeared:true}).eligibleForHumanReview,false);
});
test('two attentions in the same room cannot share the snapshot',()=>{
  assert.equal(assessReview({...complete(),roomId:'same-room',attentionId:'next-attention'}).eligibleForHumanReview,false);
});
test('report row index and candidate composite key lack verified identity source',()=>{
  for(const id of ['0','synthetic-phone-line-start']){
    assert.equal(assessReview({...complete(),attentionId:id,snapshotAttentionId:id,identitySourceVerified:false}).eligibleForHumanReview,false);
  }
});
test('ambiguous timezone, date strings and inverted intervals cannot pass',()=>{
  for(const change of [{timestampsVerified:false},{closedAtMs:'2026-11-11 14:00:00'},
    {closedAtMs:1},{startedAtMs:NaN},{closedAtMs:null}]){
    assert.equal(assessReview({...complete(),...change}).eligibleForHumanReview,false);
  }
});
test('partial, unknown or changed DOM history cannot pass',()=>{
  for(const change of [{eligibleCount:46,retainedCount:40},{historyCompletenessVerified:false},
    {attentionBoundariesVerified:false},{domWindowChanged:true},{eligibleCount:0,retainedCount:0}]){
    const input=complete();Object.assign(input.capture,change);
    assert.equal(assessReview(input).eligibleForHumanReview,false);
  }
});
test('unsupported third level, missing detail and invalid capture facts cannot pass',()=>{
  for(const classification of [{status:'unknown',category:'',detail:''},{status:'selected',category:'A',detail:' '}]){
    assert.equal(assessReview({...complete(),classification}).eligibleForHumanReview,false);
  }
  for(const input of [null,[],false,{},{...complete(),capture:null},{...complete(),capture:{eligibleCount:1,retainedCount:2}}]){
    assert.equal(assessReview(input).eligibleForHumanReview,false);
  }
});
