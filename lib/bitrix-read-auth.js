const {createHash,timingSafeEqual}=require('node:crypto');
const {config}=require('./ikono-task-pilot');
const {readSession}=require('./admin-auth');
module.exports=function authorize(req,res){
  const expected=process.env.ONOFF_BITRIX_READ_TOKEN_SHA256||'';
  const bearer=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization||'');
  if(bearer&&/^[0-9a-f]{64}$/i.test(expected)){
    const actual=createHash('sha256').update(bearer[1]).digest();
    if(timingSafeEqual(actual,Buffer.from(expected,'hex')))return true;
  }
  try{config(req);return true;}catch{}
  try{if(readSession(req))return true;}catch{}
  res.status(401).json({ok:false,error:'Acceso Bitrix no autorizado. Usa la extensión autorizada o inicia sesión.'});
  return false;
};
