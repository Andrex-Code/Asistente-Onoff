const { normalizeTc } = require('./bitrix-tc');

async function findPhoneDeals(phone, tcField, call) {
  const numbers = [phone, '+' + phone];
  if (/^573\d{9}$/.test(phone)) numbers.push(phone.slice(2));
  if (/^3\d{9}$/.test(phone)) numbers.push('57' + phone, '+57' + phone);
  const associations = [['CONTACT','CONTACT_ID'],['COMPANY','COMPANY_ID']];
  const groups = await Promise.all(associations.map(async ([entity, field]) => {
    const matches = await call('crm.duplicate.findbycomm', {entity_type:entity, type:'PHONE','values[]':numbers});
    const ids = (Array.isArray(matches?.[entity]) ? matches[entity] : []).map(String).filter(id=>/^[1-9]\d*$/.test(id));
    if (!ids.length) return {rows:[],truncated:false};
    const rows = await call('crm.deal.list', {
      ['filter[='+field+'][]']:ids,
      'select[]':['ID','TITLE','COMPANY_ID','CONTACT_ID',tcField],
      'order[ID]':'DESC'
    });
    if(!Array.isArray(rows)) throw Error('Bitrix no devolvió las negociaciones.');
    const accepted = new Set(ids);
    return {rows:rows.filter(row=>accepted.has(String(row[field]))),truncated:ids.length>=20||rows.length>=50};
  }));
  const byId = new Map();
  for (const {rows} of groups) for (const row of rows) {
    const tc = normalizeTc(row[tcField]);
    const id=String(row.ID), company=String(row.COMPANY_ID);
    if (/^\d{1,8}$/.test(tc) && /^[1-9]\d*$/.test(id) && /^[1-9]\d*$/.test(company)) {
      byId.set(id,{id,tc,title:String(row.TITLE||('Negociación #'+id)),company:{id:company,name:'Compañía #'+company}});
    }
  }
  const deals=[...byId.values()];
  return {deals:deals.slice(0,20),truncated:deals.length>20||groups.some(group=>group.truncated)};
}
module.exports = { findPhoneDeals };
