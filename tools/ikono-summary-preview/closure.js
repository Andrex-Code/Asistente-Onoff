// Correlated UI acknowledgement, not an independent iKono API receipt.
function onoffClosure(state){
 if(!state.clicked||state.cancelled||state.interrupted||state.error||state.dialog)return '';
 if(state.sameRoom&&state.matches===1&&state.status==='Resuelto')return 'Resuelto';
 if(state.hash==='#/home'&&state.matches===0&&state.elapsed>=2000&&state.elapsed<=30000)return 'ON_RATING_HANDOFF';
 return '';
}
if(typeof module!=='undefined')module.exports=onoffClosure;

