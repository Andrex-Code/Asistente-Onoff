const crypto = require('node:crypto');
function config(req) {
 const c=JSON.parse(process.env.IKONO_TASK_PILOT||'{}');
 const token=String(req.headers.authorization||'').replace(/^Bearer /,'');
 const actual=crypto.createHash('sha256').update(token).digest('hex');
 if(!c.tokenHash||actual.length!==c.tokenHash.length||!crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(c.tokenHash))||Date.now()>c.expires)throw Error('Piloto no autorizado o vencido.');
 return c;
}
async function call(method,params={}) {
 const base=String(process.env.BITRIX_WEBHOOK_URL||'').replace(/\/+$/,'')+'/';
 if(!base.startsWith('https://'))throw Error('Bitrix no configurado.');
 const response=await fetch(base+method+'.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(params),signal:AbortSignal.timeout(18000)});
 const data=await response.json();if(!response.ok||data.error)throw Error('Bitrix: '+(data.error_description||data.error||response.status));return data.result;
}
async function inspect(c) {
 const [template,fields,stages,example,deal,tasks]=await Promise.all([
 call('tasks.template.get',{templateId:477,select:['*','UF_*']}),call('tasks.task.getFields'),call('task.stages.get',{entityId:53}),
 call('tasks.task.get',{taskId:523478,select:['*','UF_*']}),call('crm.deal.get',{id:c.dealId}),
 call('tasks.task.list',{filter:{GROUP_ID:53,'%TITLE':'TC'+c.tc},select:['ID','TITLE','STATUS','XML_ID'],order:{ID:'DESC'}})
 ]);
 return {template,fields,stages,example,deal,tasks};
}
module.exports={config,call,inspect};

