// Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

process.env.GEMINI_API_KEY = 'test-key';
const runTask = require('../ai/tasks.cjs');
const schemas = require('../ai/schemas.cjs');

// Factory: a fake Gemini reply that records the request it received.
function mockGemini(payload, { status = 200, thought = false } = {}) {
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    const parts = [...(thought ? [{ text: 'razonando…', thought: true }] : []), { text: JSON.stringify(payload) }];
    return { ok: status === 200, status, json: async () => ({ candidates: [{ content: { parts } }] }), text: async () => 'error body' };
  };
  return calls;
}

// Minimal validator for the Gemini schema subset we use.
function conforms(value, schema, at = 'root') {
  if (schema.type === 'OBJECT') {
    assert.equal(typeof value, 'object', `${at} should be an object`);
    for (const key of schema.required) conforms(value[key], schema.properties[key], `${at}.${key}`);
  } else if (schema.type === 'ARRAY') {
    assert.ok(Array.isArray(value), `${at} should be an array`);
    assert.ok(value.length >= schema.minItems && value.length <= schema.maxItems, `${at} length ${value.length}`);
    value.forEach((v, i) => conforms(v, schema.items, `${at}[${i}]`));
  } else if (schema.type === 'STRING') {
    assert.equal(typeof value, 'string', `${at} should be a string`);
    if (schema.enum) assert.ok(schema.enum.includes(value), `${at}="${value}" not in enum`);
  } else if (schema.type === 'BOOLEAN') assert.equal(typeof value, 'boolean', at);
  else if (schema.type === 'INTEGER') assert.ok(Number.isInteger(value), at);
}

test('demo content matches every activity schema', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../games/demo.js'), 'utf8'), sandbox);
  for (const [id, schema] of Object.entries(schemas.activities)) conforms(sandbox.window.TutokiDemo[id], schema, id);
});

test('generate sends the PDF inline with the activity schema', async () => {
  const calls = mockGemini({ title: 'ok' });
  const result = await runTask({ task: 'generate', activity: 'detective', topic: 'Plantas', level: 'Secundaria', grade: '2.º', file: { mimeType: 'application/pdf', data: 'JVBERi0=' } });
  assert.deepEqual(result, { title: 'ok' });
  const { body, init } = calls[0];
  assert.equal(init.headers['x-goog-api-key'], 'test-key');
  assert.deepEqual(body.contents[0].parts[2], { inlineData: { mimeType: 'application/pdf', data: 'JVBERi0=' } });
  assert.deepEqual(body.generationConfig.responseSchema, schemas.activities.detective);
  assert.match(body.contents[0].parts[0].text, /Exactamente 3 oraciones/); // secundaria gets 3 seeded errors
});

test('generate ignores thought parts from thinking models', async () => {
  mockGemini({ title: 'visible' }, { thought: true });
  assert.deepEqual(await runTask({ task: 'generate', activity: 'primero', topic: 'Agua' }), { title: 'visible' });
});

test('rejects unknown tasks, activities and file types', async () => {
  mockGemini({});
  await assert.rejects(() => runTask({ task: 'hack' }), { status: 400 });
  await assert.rejects(() => runTask({ task: 'generate', activity: 'nope', topic: 'x' }), { status: 400 });
  await assert.rejects(() => runTask({ task: 'generate', activity: 'duelo', file: { mimeType: 'application/x-msdownload', data: 'AA' } }), { status: 400 });
  await assert.rejects(() => runTask({ task: 'generate', activity: 'duelo' }), { status: 400 });
});

test('maps Gemini rate limits to a friendly 429', async () => {
  mockGemini({}, { status: 429 });
  await assert.rejects(() => runTask({ task: 'followup', question: 'q', answer: 'a' }), { status: 429, code: 'rate-limit' });
});

test('duel prompt carries the conversation and clips long input', async () => {
  const calls = mockGemini({ reply: 'r', flaw: 'generaliza' });
  await runTask({ task: 'duel', motion: 'M', aiSide: 'A', studentSide: 'B', argument: 'x'.repeat(5000), history: [{ who: 'ai', text: 'antes' }] });
  const prompt = calls[0].body.contents[0].parts[0].text;
  assert.match(prompt, /IA: antes/);
  assert.ok(!prompt.includes('x'.repeat(601)), 'argument should be clipped to 600 chars');
});

test('every live answer declares whether the student made sense', () => {
  for (const [task, schema] of Object.entries(schemas.live)) assert.ok(schema.required.includes('onTopic'), `${task} lacks onTopic`);
});

test('coach answers the student text with the activity context', async () => {
  const calls = mockGemini({ onTopic: true, message: 'ok' });
  await runTask({ task: 'coach', kind: 'primero', context: 'Respuesta de la IA: X', studentText: 'Se equivoca porque el tallo creció' });
  const prompt = calls[0].body.contents[0].parts[0].text;
  assert.match(prompt, /el tallo creció/);
  assert.match(calls[0].body.systemInstruction.parts[0].text, /onTopic=false/);
  await assert.rejects(() => runTask({ task: 'coach', kind: 'otro' }), { status: 400 });
});

test('missing API key fails fast with no-key', async () => {
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(() => runTask({ task: 'react', proposal: 'p' }), { status: 503, code: 'no-key' });
  process.env.GEMINI_API_KEY = 'test-key';
});
