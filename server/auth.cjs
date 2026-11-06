'use strict';
const crypto = require('crypto');
const { id, now, get, run, newPin } = require('./db.cjs');
const { HttpError, cookies, sessionCookie, text, limiter } = require('./http.cjs');

const SESSION_DAYS = 30;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const loginLimit = limiter(10, 15 * 60 * 1000);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const candidate = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(candidate, Buffer.from(hash, 'hex'));
}

// Only the token's hash is stored, so a leaked database cannot be replayed as sessions.
function startSession(res, role, subject) {
  const token = crypto.randomBytes(32).toString('base64url');
  run('INSERT INTO sessions (token, role, subject, expires_at) VALUES (?, ?, ?, ?)', sha256(token), role, subject, Date.now() + SESSION_DAYS * 864e5);
  res.setHeader('Set-Cookie', sessionCookie(token, SESSION_DAYS * 86400));
}

function readSession(req) {
  const token = cookies(req).tutoki_session;
  if (!token) return null;
  const row = get('SELECT role, subject, expires_at FROM sessions WHERE token = ?', sha256(token));
  if (!row || row.expires_at < Date.now()) return null;
  if (row.role === 'teacher') {
    const teacher = get('SELECT id, name, email FROM teachers WHERE id = ?', row.subject);
    return teacher && { role: 'teacher', teacher };
  }
  const student = get('SELECT id, alias, avatar, group_id FROM students WHERE id = ?', row.subject);
  if (!student) return null;
  const group = get('SELECT id, name, level, grade FROM groups WHERE id = ?', student.group_id);
  return { role: 'student', student: { id: student.id, alias: student.alias, avatar: student.avatar }, group };
}

function endSession(req, res) {
  const token = cookies(req).tutoki_session;
  if (token) run('DELETE FROM sessions WHERE token = ?', sha256(token));
  res.setHeader('Set-Cookie', sessionCookie('', 0));
}

const emailOf = value => {
  const email = text(value, 120, 'Correo').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Escribe un correo válido.', 'bad-request');
  return email;
};

function register({ body, res }) {
  const name = text(body.name, 60, 'Nombre');
  const email = emailOf(body.email);
  const password = text(body.password, 128, 'Contraseña', { min: 8 });
  if (get('SELECT 1 FROM teachers WHERE email = ?', email)) throw new HttpError(409, 'Ya existe una cuenta con ese correo.', 'conflict');
  const teacherId = id();
  run('INSERT INTO teachers (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)', teacherId, name, email, hashPassword(password), now());
  startSession(res, 'teacher', teacherId);
  return { role: 'teacher', teacher: { id: teacherId, name, email } };
}

function login({ body, res, ip }) {
  const email = emailOf(body.email);
  loginLimit(`${ip}:${email}`);
  const row = get('SELECT id, name, email, password FROM teachers WHERE email = ?', email);
  if (!row || !verifyPassword(String(body.password || ''), row.password)) throw new HttpError(401, 'Correo o contraseña incorrectos.', 'unauthorized');
  startSession(res, 'teacher', row.id);
  return { role: 'teacher', teacher: { id: row.id, name: row.name, email: row.email } };
}

// Students join with the group code + alias. The first time they get a PIN; afterwards the PIN is required.
function join({ body, res, ip }) {
  const code = text(body.code, 12, 'Código').toUpperCase();
  const alias = text(body.alias, 30, 'Alias');
  loginLimit(`${ip}:${code}`);
  const group = get('SELECT id, name, level, grade FROM groups WHERE code = ?', code);
  if (!group) throw new HttpError(404, 'Ese código no existe. Confírmalo con tu docente.', 'not-found');
  const existing = get('SELECT id, pin, avatar FROM students WHERE group_id = ? AND alias = ? COLLATE NOCASE', group.id, alias);
  if (existing) {
    if (String(body.pin || '') !== existing.pin) throw new HttpError(401, 'Ese alias ya está en el grupo. Escribe tu PIN o pídelo a tu docente.', 'pin-required');
    startSession(res, 'student', existing.id);
    return { role: 'student', student: { id: existing.id, alias, avatar: existing.avatar }, group };
  }
  const studentId = id(), pin = newPin();
  run('INSERT INTO students (id, group_id, alias, pin, created_at) VALUES (?, ?, ?, ?, ?)', studentId, group.id, alias, pin, now());
  startSession(res, 'student', studentId);
  return { role: 'student', student: { id: studentId, alias, avatar: 'wave' }, group, pin };
}

module.exports = { readSession, endSession, register, login, join };
