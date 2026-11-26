const pilot=require('./ikono-task-pilot');
module.exports=async(req,res)=>{
 const origin=req.headers.origin||'';
 if(/^https:\/\/onoff\.[as]\.ikono\.im$/.test(origin)||/^chrome-extension:\/\/[a-p]+$/.test(origin))res.setHeader('Access-Control-Allow-Origin',origin);
 res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({ok:false});
 const action=req.body?.pilotAction;
 try{const c=pilot.config(req);const service=pilot.createService();let data;
 if(action==='inspect')data=await pilot.inspect(c,req.body.taskId);else if(action==='prepare')data=await service.prepare(c,req.body.payload);else if(action==='prepare-recovery')data=await service.prepareRecovery(c,req.body.payload);else if(action==='renew')data=await service.renew(c,req.body);else if(action==='amend')data=await service.amend(c,req.body);else if(action==='commit')data=await service.commit(c,req.body);else throw Error('Acción no habilitada.');return res.status(200).json({ok:true,data});}
 catch(e){
  const preparing=action==='prepare'||action==='prepare-recovery';
  const transient=preparing&&(e.name==='TimeoutError'||e.name==='AbortError'||e.cause?.code||
   [408,429,500,502,503,504].includes(e.httpStatus)||e.message==='fetch failed'||
   ['QUERY_LIMIT_EXCEEDED','OPERATION_TIME_LIMIT'].includes(e.bitrixCode));
  return res.status(transient?503:400).json({ok:false,code:transient?'BITRIX_TEMPORARY':e.code||undefined,error:String(e.message).replace(/https?:\/\/\S+/g,'[URL omitida]')});
 }
};
