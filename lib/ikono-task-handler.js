const pilot=require('./ikono-task-pilot');
module.exports=async(req,res)=>{
 const origin=req.headers.origin||'';
 if(/^https:\/\/onoff\.[as]\.ikono\.im$/.test(origin)||/^chrome-extension:\/\/[a-p]+$/.test(origin))res.setHeader('Access-Control-Allow-Origin',origin);
 res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({ok:false});
 try{const c=pilot.config(req);const action=req.body?.pilotAction;if(action==='advisor-config'){
  if(!process.env.BITRIX_ADVISOR_CLIENT_ID||!process.env.BITRIX_ADVISOR_CLIENT_SECRET)throw Error('Falta configurar la aplicación de asesores en Bitrix.');
  return res.status(200).json({ok:true,data:{clientId:process.env.BITRIX_ADVISOR_CLIENT_ID}});
 }
 if(action==='inspect')return res.status(200).json({ok:true,data:await pilot.inspect(c,req.body.taskId)});
 if(!['prepare','amend','commit'].includes(action))throw Error('Acción no habilitada.');
 const {actor,bitrix}=await require('./bitrix-advisor-session')(req.body.advisorCode,pilot.call);
 c.actor=actor;
 const service=pilot.createService({bitrix});let data;
 if(action==='prepare')data=await service.prepare(c,req.body.payload);else if(action==='amend')data=await service.amend(c,req.body);else if(action==='commit')data=await service.commit(c,req.body);else throw Error('Acción no habilitada.');return res.status(200).json({ok:true,data});}
 catch(e){const rejected=e.code==='BITRIX_REJECTED';return res.status(rejected?409:400).json({ok:false,...(rejected?{code:e.code}:{}),error:String(e.message).replace(/https?:\/\/\S+/g,'[URL omitida]')});}
};

