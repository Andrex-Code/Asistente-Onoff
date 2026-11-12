const pilot=require('../../lib/ikono-task-pilot');
module.exports=async(req,res)=>{
 const origin=req.headers.origin||'';
 if(/^https:\/\/onoff\.[as]\.ikono\.im$/.test(origin)||/^chrome-extension:\/\/[a-p]+$/.test(origin))res.setHeader('Access-Control-Allow-Origin',origin);
 res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');res.setHeader('Cache-Control','no-store');
 if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return res.status(405).json({ok:false});
 try{const c=pilot.config(req);if(req.body?.action!=='inspect')return res.status(400).json({ok:false,error:'Acción no habilitada.'});return res.status(200).json({ok:true,data:await pilot.inspect(c)});}
 catch(e){return res.status(400).json({ok:false,error:String(e.message).replace(/https?:\/\/\S+/g,'[URL omitida]')});}
};

