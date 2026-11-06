'use strict';
// Thin Gemini REST client. The API key stays on the server; the browser only talks to /api/ai.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const fail = (status, code, message) => Object.assign(new Error(message), { status, code });

async function generateJson({ system, parts, schema, temperature = 0.8 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw fail(503, 'no-key', 'GEMINI_API_KEY no está configurada.');
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) {
    const detail = await res.text();
    console.error(`Gemini ${res.status}: ${detail.slice(0, 400)}`);
    if (res.status === 429) throw fail(429, 'rate-limit', 'Se alcanzó el límite gratuito de Gemini. Intenta en un minuto.');
    throw fail(502, 'upstream', 'Gemini no pudo responder.');
  }
  const data = await res.json();
  // Thinking models may return thought parts; only the visible text holds the JSON answer.
  const text = (data.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
  if (!text) throw fail(502, 'blocked', 'Gemini no devolvió contenido (posible filtro de seguridad).');
  try { return JSON.parse(text); }
  catch { throw fail(502, 'bad-json', 'Gemini devolvió un formato inesperado.'); }
}

module.exports = { generateJson, MODEL };
