const {config}=require('./ikono-task-pilot');
const {readSession}=require('./admin-auth');
module.exports=function authorize(req,res){try{config(req);return true;}catch{}try{if(readSession(req))return true;}catch{}res.status(401).json({ok:false,error:'Acceso Bitrix no autorizado. Usa la extensión autorizada o inicia sesión.'});return false;};
