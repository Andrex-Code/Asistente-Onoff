'use strict';
const crypto = require('node:crypto');
const buckets = new Map();
function equalHash(token, expected) {
 if (!token || !/^[a-f0-9]{64}$/i.test(String(expected||''))) return false;
 const actual=crypto.createHash('sha256').update(token).digest('hex');
 return crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expected.toLowerCase()));
}
function bearer(req) {
 const value=String(req.headers?.authorization||'');
 const m=/^Bearer ([A-Za-z0-9._~-]{20,512})$/.exec(value);
 return m?m[1]:'';
}
function authorized(req) {
 const token=bearer(req);
 if (!token) return false;
 if (equalHash(token,process.env.ONOFF_READ_TOKEN_HASH)) return true;
 // A valid, unexpired, narrowly scoped iKono pilot can read CRM/AI without
 // exposing the pilot secret to the iKono webpage (worker performs fetch).
 try {
  const pilot=JSON.parse(process.env.IKONO_TASK_PILOT||'{}');
  return Date.now()<Number(pilot.expires)&&equalHash(token,pilot.tokenHash);
 } catch { return false; }
}
function cors(req,res) {
 const origin=String(req.headers?.origin||'');
 // The general ONOFF content script runs on different HTTPS customer portals.
 // CORS permits legitimate browser transport; bearer authorization is mandatory.
 if (/^chrome-extension:\/\/[a-p]{32}$/.test(origin)||/^https:\/\/[^/?#@]+$/.test(origin)){
  res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
 }
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
 res.setHeader('Cache-Control','private, no-store');
}
function requireReadAccess(req,res) {
 cors(req,res);
 if(req.method==='OPTIONS'){res.status(204).end();return false;}
 if(req.method!=='POST'){res.status(405).json({ok:false,error:'Método no permitido.'});return false;}
 if(!authorized(req)){res.status(401).json({ok:false,error:'Consulta no autorizada. Configure acceso de solo lectura.'});return false;}
 const key=crypto.createHash('sha256').update(bearer(req)).digest('hex');
 const now=Date.now();
 for(const [k,v] of buckets)if(now-v.start>60000)buckets.delete(k);
 const item=buckets.get(key)||{start:now,count:0};
 if(now-item.start>60000){item.start=now;item.count=0;}
 item.count++;buckets.set(key,item);
 if(item.count>60){res.setHeader('Retry-After','60');res.status(429).json({ok:false,error:'Demasiadas consultas. Intente nuevamente.'});return false;}
 return true;
}
module.exports={requireReadAccess,authorized};
