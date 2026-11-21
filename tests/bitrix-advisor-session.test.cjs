const test = require('node:test');
const assert = require('node:assert/strict');
const session = require('../lib/bitrix-advisor-session');
const pilot = require('../lib/ikono-task-pilot');

test('each advisor uses their own grant for profile lookup and task creation', async t => {
  t.mock.method(global, 'fetch', async (_, {body}) => Response.json({
    access_token: 'grant-' + body.get('code'), client_endpoint: 'https://onoff.bitrix24.es/rest/'
  }));
  process.env.BITRIX_ADVISOR_CLIENT_ID = 'local.test';
  process.env.BITRIX_ADVISOR_CLIENT_SECRET = 'test';
  for (const id of ['17', '28']) {
    const calls = [];
    const advisor = await session(id, async (method, params, token) => {
      calls.push([method, token]);
      return {ID:token.slice(6)};
    });
    assert.equal(advisor.actor, id);
    await advisor.bitrix('tasks.task.add', {fields:{CREATED_BY:advisor.actor}});
    assert.deepEqual(calls, [['user.current','grant-'+id], ['tasks.task.add','grant-'+id]]);
  }
  await assert.rejects(session('', pilot.call), /sesión/);
});

test('account switch blocks signed drafts before storage or Bitrix writes in both modes', async () => {
  process.env.AUTH_SECRET = 'fixture-only';
  const service = pilot.createService({storage:{},bitrix:assert.fail});
  const intent = pilot.seal({fields:{CREATED_BY:'17'}});
  for (const mode of ['single','multi']) {
    await assert.rejects(service.commit({mode,actor:'28'}, {intent}), /otra sesión/);
  }
});
