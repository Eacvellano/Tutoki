'use strict';
// Small HTTP helpers shared by the API routes.
class HttpError extends Error {
  constructor(status, message, code = 'error') { super(message); this.status = status; this.code = code; }
}

function sendJson(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(JSON.stringify(body));
}

function readJson(req, maxBytes) {
  return new Promise((resolve, reject) => {
    // Requiring JSON blocks cross-site HTML form posts (a cheap CSRF guard alongside SameSite cookies).
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return reject(new HttpError(415, 'Se esperaba JSON.', 'bad-request'));
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) { reject(new HttpError(413, 'El contenido es demasiado grande.', 'too-large')); req.destroy(); }
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (!size) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'JSON inválido.', 'bad-request')); }
    });
    req.on('error', reject);
  });
}

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(([k, v]) => k && v).map(([k, v]) => [k, decodeURIComponent(v)]));
}

const secure = process.env.TUTOKI_SECURE_COOKIE === '1';
const sessionCookie = (token, maxAgeSeconds) => `tutoki_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`;

// Input guards used at the API boundary.
const text = (value, max, field, { required = true, min = 1 } = {}) => {
  const v = String(value ?? '').trim();
  if (!v && !required) return '';
  if (v.length < min || v.length > max) throw new HttpError(400, `${field}: entre ${min} y ${max} caracteres.`, 'bad-request');
  return v;
};
const oneOf = (value, options, field) => {
  if (!options.includes(value)) throw new HttpError(400, `${field} no es válido.`, 'bad-request');
  return value;
};

// Fixed-window rate limiter kept in memory (enough for a single-server MVP).
function limiter(max, windowMs) {
  const hits = new Map();
  return key => {
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.reset < now) { hits.set(key, { count: 1, reset: now + windowMs }); return; }
    if (++entry.count > max) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.', 'rate-limit');
  };
}

module.exports = { HttpError, sendJson, readJson, cookies, sessionCookie, text, oneOf, limiter };
