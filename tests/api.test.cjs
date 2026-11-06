// End-to-end API flow against a real server with an in-memory database. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 4300 + Math.floor(Math.random() * 500);
let server;

test.before(() => new Promise((resolve, reject) => {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server.cjs')], { env: { ...process.env, TUTOKI_PORT: PORT, TUTOKI_DB: ':memory:', GEMINI_API_KEY: '' } });
  server.stdout.on('data', d => { if (String(d).includes('listo')) resolve(); });
  server.on('error', reject);
}));
test.after(() => server.kill());

// Factory: an HTTP client with its own cookie jar (one per browser/user).
function client() {
  let cookie = '';
  return async (method, url, body) => {
    const res = await fetch(`http://127.0.0.1:${PORT}${url}`, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body && JSON.stringify(body) });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
}
const teacherData = (n = 1) => ({ name: `Ana ${n}`, email: `ana${n}-${Date.now()}@escuela.mx`, password: 'contrasena-segura' });

test('teacher with two groups, student joins, plays, gets feedback', async () => {
  const teacher = client(), student = client();
  assert.equal((await teacher('POST', '/api/auth/register', teacherData())).status, 200);
  const a = (await teacher('POST', '/api/groups', { name: '5.º A', level: 'Primaria', grade: '5.º' })).body;
  const b = (await teacher('POST', '/api/groups', { name: '2.º B', level: 'Secundaria', grade: '2.º' })).body;
  assert.match(a.code, /^[A-Z2-9]{3}-[A-Z2-9]{3}$/);
  assert.equal((await teacher('GET', '/api/groups')).body.length, 2);

  const act = (await teacher('POST', `/api/groups/${b.id}/activities`, { type: 'duelo', title: 'Duelo verde', content: { motion: '¿Jardín?' } })).body;
  const joined = (await student('POST', '/api/auth/join', { code: b.code.toLowerCase(), alias: 'Leo' })).body;
  assert.match(joined.pin, /^\d{4}$/);
  assert.equal((await student('GET', '/api/student/activities')).body[0].title, 'Duelo verde');
  assert.equal((await student('GET', `/api/activities/${act.id}`)).body.content.motion, '¿Jardín?');

  const sub = (await student('POST', `/api/activities/${act.id}/submissions`, { answers: { conclusion: 'Mantengo' } })).body;
  const detail = (await teacher('GET', `/api/groups/${b.id}`)).body;
  assert.equal(detail.activities[0].pending, 1);
  assert.equal(detail.students[0].alias, 'Leo');

  assert.equal((await teacher('POST', `/api/submissions/${sub.id}/review`, { feedback: '¿Qué evidencia falta?', rubric: ['Logrado', 'En desarrollo', 'Logrado'] })).status, 200);
  const seen = (await student('GET', `/api/submissions/${sub.id}`)).body;
  assert.equal(seen.feedback, '¿Qué evidencia falta?');
  assert.equal((await teacher('GET', '/api/progress')).body.reviews.length, 1);
});

test('isolation: other teachers and students cannot reach foreign data', async () => {
  const owner = client(), intruder = client(), kid = client();
  await owner('POST', '/api/auth/register', teacherData(2));
  await intruder('POST', '/api/auth/register', teacherData(3));
  const g = (await owner('POST', '/api/groups', { name: 'Grupo', level: 'Primaria', grade: '4.º' })).body;
  const act = (await owner('POST', `/api/groups/${g.id}/activities`, { type: 'detective', title: 'Caso', content: { x: 1 } })).body;
  assert.equal((await intruder('GET', `/api/groups/${g.id}`)).status, 404);
  assert.equal((await intruder('GET', `/api/activities/${act.id}`)).status, 404);
  await kid('POST', '/api/auth/join', { code: g.code, alias: 'Sol' });
  assert.equal((await kid('GET', '/api/groups')).status, 403);
  assert.equal((await kid('POST', '/api/ai', { task: 'generate', activity: 'detective', topic: 'x' })).status, 403);
});

test('student alias is protected by PIN; teacher can reset it', async () => {
  const t = client(), first = client(), other = client();
  await t('POST', '/api/auth/register', teacherData(4));
  const g = (await t('POST', '/api/groups', { name: 'G', level: 'Primaria', grade: '6.º' })).body;
  const { pin, student } = (await first('POST', '/api/auth/join', { code: g.code, alias: 'Dani' })).body;
  assert.equal((await other('POST', '/api/auth/join', { code: g.code, alias: 'dani' })).body.code, 'pin-required');
  assert.equal((await other('POST', '/api/auth/join', { code: g.code, alias: 'Dani', pin })).status, 200);
  const reset = (await t('POST', `/api/students/${student.id}/pin`)).body.pin;
  assert.equal((await first('GET', '/api/me')).body.role, null, 'reset logs the student out');
  assert.equal((await first('POST', '/api/auth/join', { code: g.code, alias: 'Dani', pin: reset })).status, 200);
});

test('rejects bad input, wrong passwords and anonymous AI calls', async () => {
  const c = client();
  assert.equal((await c('POST', '/api/auth/register', { name: 'X', email: 'no-email', password: '12345678' })).status, 400);
  assert.equal((await c('POST', '/api/auth/register', { name: 'X', email: 'x@y.mx', password: 'corta' })).status, 400);
  const data = teacherData(5);
  await c('POST', '/api/auth/register', data);
  assert.equal((await client()('POST', '/api/auth/login', { email: data.email, password: 'incorrecta' })).status, 401);
  assert.equal((await c('POST', '/api/groups', { name: 'G', level: 'Primaria', grade: '9.º' })).status, 400);
  assert.equal((await client()('POST', '/api/ai', { task: 'duel' })).status, 401);
  const res = await fetch(`http://127.0.0.1:${PORT}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' });
  assert.equal(res.status, 415, 'non-JSON posts are refused');
});
