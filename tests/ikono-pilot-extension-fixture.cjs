'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
module.exports=function pilotExtensionFixture(){
 const target=fs.mkdtempSync(path.join(os.tmpdir(),'onoff-ikono-fixture-'));
 fs.cpSync(path.resolve('dist/ikono-summary-preview'),target,{recursive:true});
 const token='test_pilot_capability_for_browsers_123456789';
 const auth={mode:'multi',scope:'fixture',token,expires:Date.now()+15*60000};
 fs.writeFileSync(path.join(target,'pilot-auth.js'),'self.ONOFF_TASK_PILOT='+JSON.stringify(auth)+';\n');
 return {extension:target,cleanup:()=>fs.rmSync(target,{recursive:true,force:true})};
};
