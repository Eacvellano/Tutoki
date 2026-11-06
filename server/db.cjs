'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
// node:sqlite is built into Node 22.5+; it still prints an "experimental" warning we can ignore.
const { DatabaseSync } = require('node:sqlite');

const file = process.env.TUTOKI_DB || path.join(__dirname, '..', 'data', 'tutoki.db');
if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new DatabaseSync(file);

db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, role TEXT NOT NULL, subject TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL, level TEXT NOT NULL, grade TEXT NOT NULL, code TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  alias TEXT NOT NULL, pin TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT 'wave', created_at TEXT NOT NULL,
  UNIQUE (group_id, alias));
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  type TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, source TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE, answers TEXT NOT NULL, created_at TEXT NOT NULL,
  feedback TEXT, rubric TEXT, reviewed_at TEXT);
CREATE INDEX IF NOT EXISTS idx_groups_teacher ON groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_activities_group ON activities(group_id);
CREATE INDEX IF NOT EXISTS idx_submissions_activity ON submissions(activity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
`);

const id = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const all = (sql, ...params) => db.prepare(sql).all(...params);
const get = (sql, ...params) => db.prepare(sql).get(...params);
const run = (sql, ...params) => db.prepare(sql).run(...params);
// JSON.parse(null) returns null instead of throwing, so missing columns need the explicit fallback.
const parse = (value, fallback = null) => { if (value == null) return fallback; try { return JSON.parse(value); } catch { return fallback; } };

// Group codes avoid look-alike characters (0/O, 1/I) so kids can type them from the board.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newGroupCode() {
  for (;;) {
    const raw = Array.from(crypto.randomBytes(6), b => CODE_CHARS[b % CODE_CHARS.length]).join('');
    const code = `${raw.slice(0, 3)}-${raw.slice(3)}`;
    if (!get('SELECT 1 FROM groups WHERE code = ?', code)) return code;
  }
}
const newPin = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');

module.exports = { db, id, now, all, get, run, parse, newGroupCode, newPin };
