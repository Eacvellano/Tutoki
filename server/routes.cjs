'use strict';
const { id, now, all, get, run, parse, newGroupCode, newPin } = require('./db.cjs');
const { HttpError, text, oneOf } = require('./http.cjs');
const auth = require('./auth.cjs');

const TYPES = ['detective', 'primero', 'defiendelo', 'comunidad', 'duelo'];
const LEVELS = ['Primaria', 'Secundaria'];
const GRADES = ['1.º', '2.º', '3.º', '4.º', '5.º', '6.º'];
const RUBRIC_LEVELS = ['Logrado', 'En desarrollo', 'Necesita acompañamiento'];
const AVATARS = ['wave', 'detective', 'speak', 'think', 'celebrate', 'plant', 'debate', 'teacher'];

const need = (session, role) => {
  if (!session) throw new HttpError(401, 'Inicia sesión para continuar.', 'unauthorized');
  if (role && session.role !== role) throw new HttpError(403, 'No tienes acceso a esta sección.', 'forbidden');
  return session;
};
const notFound = what => new HttpError(404, `${what} no existe o no es tuyo.`, 'not-found');
const ownGroup = (s, groupId) => get('SELECT * FROM groups WHERE id = ? AND teacher_id = ?', groupId, s.teacher.id) || (() => { throw notFound('El grupo'); })();

// Teacher owns the activity's group, or the student belongs to it.
function activityFor(s, activityId) {
  const a = get('SELECT a.*, g.teacher_id, g.name AS group_name, g.level, g.grade FROM activities a JOIN groups g ON g.id = a.group_id WHERE a.id = ?', activityId);
  const allowed = a && (s.role === 'teacher' ? a.teacher_id === s.teacher.id : a.group_id === s.group.id);
  if (!allowed) throw notFound('La actividad');
  return a;
}
const activityJson = a => ({ id: a.id, type: a.type, title: a.title, content: parse(a.content), source: a.source, createdAt: a.created_at, group: { id: a.group_id, name: a.group_name, level: a.level, grade: a.grade } });

function groupInput(body) {
  const level = oneOf(body.level, LEVELS, 'Nivel');
  const grade = oneOf(body.grade, level === 'Secundaria' ? GRADES.slice(0, 3) : GRADES, 'Grado');
  return { name: text(body.name, 40, 'Nombre del grupo'), level, grade };
}

const groupSummary = `SELECT g.id, g.name, g.level, g.grade, g.code, g.created_at AS createdAt,
  (SELECT COUNT(*) FROM students s WHERE s.group_id = g.id) AS students,
  (SELECT COUNT(*) FROM activities a WHERE a.group_id = g.id) AS activities,
  (SELECT COUNT(*) FROM submissions x JOIN activities a ON a.id = x.activity_id WHERE a.group_id = g.id AND x.reviewed_at IS NULL) AS pending
  FROM groups g`;

const routes = [
  ['GET', '/api/me', ({ session }) => session || { role: null }],
  ['POST', '/api/auth/register', auth.register],
  ['POST', '/api/auth/login', auth.login],
  ['POST', '/api/auth/join', auth.join],
  ['POST', '/api/auth/logout', ({ req, res }) => { auth.endSession(req, res); return { ok: true }; }],
  ['PATCH', '/api/me', ({ session, body }) => {
    const s = need(session);
    if (s.role === 'teacher') run('UPDATE teachers SET name = ? WHERE id = ?', text(body.name, 60, 'Nombre'), s.teacher.id);
    else run('UPDATE students SET avatar = ? WHERE id = ?', oneOf(body.avatar, AVATARS, 'Avatar'), s.student.id);
    return { ok: true };
  }],

  // Teacher: groups
  ['GET', '/api/groups', ({ session }) => all(`${groupSummary} WHERE g.teacher_id = ? ORDER BY g.created_at`, need(session, 'teacher').teacher.id)],
  ['POST', '/api/groups', ({ session, body }) => {
    const s = need(session, 'teacher'), g = groupInput(body), groupId = id(), code = newGroupCode();
    run('INSERT INTO groups (id, teacher_id, name, level, grade, code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', groupId, s.teacher.id, g.name, g.level, g.grade, code, now());
    return { id: groupId, ...g, code };
  }],
  ['GET', '/api/groups/:id', ({ session, params }) => {
    const g = ownGroup(need(session, 'teacher'), params.id);
    return {
      group: get(`${groupSummary} WHERE g.id = ?`, g.id),
      students: all(`SELECT s.id, s.alias, s.avatar, s.pin, (SELECT COUNT(*) FROM submissions x WHERE x.student_id = s.id) AS submissions
        FROM students s WHERE s.group_id = ? ORDER BY s.alias COLLATE NOCASE`, g.id),
      activities: all(`SELECT a.id, a.type, a.title, a.created_at AS createdAt, COUNT(x.id) AS submissions, SUM(x.id IS NOT NULL AND x.reviewed_at IS NULL) AS pending
        FROM activities a LEFT JOIN submissions x ON x.activity_id = a.id WHERE a.group_id = ? GROUP BY a.id ORDER BY a.created_at DESC`, g.id),
    };
  }],
  ['PATCH', '/api/groups/:id', ({ session, params, body }) => {
    const g = ownGroup(need(session, 'teacher'), params.id), input = groupInput(body);
    run('UPDATE groups SET name = ?, level = ?, grade = ? WHERE id = ?', input.name, input.level, input.grade, g.id);
    return { ok: true };
  }],
  ['DELETE', '/api/groups/:id', ({ session, params }) => { run('DELETE FROM groups WHERE id = ?', ownGroup(need(session, 'teacher'), params.id).id); return { ok: true }; }],
  ['POST', '/api/groups/:id/code', ({ session, params }) => {
    const g = ownGroup(need(session, 'teacher'), params.id), code = newGroupCode();
    run('UPDATE groups SET code = ? WHERE id = ?', code, g.id);
    return { code };
  }],
  ['POST', '/api/students/:id/pin', ({ session, params }) => {
    const s = need(session, 'teacher'), st = get('SELECT s.id FROM students s JOIN groups g ON g.id = s.group_id WHERE s.id = ? AND g.teacher_id = ?', params.id, s.teacher.id);
    if (!st) throw notFound('El estudiante');
    const pin = newPin();
    run('UPDATE students SET pin = ? WHERE id = ?', pin, st.id);
    run("DELETE FROM sessions WHERE role = 'student' AND subject = ?", st.id);
    return { pin };
  }],
  ['DELETE', '/api/students/:id', ({ session, params }) => {
    const s = need(session, 'teacher');
    const st = get('SELECT s.id FROM students s JOIN groups g ON g.id = s.group_id WHERE s.id = ? AND g.teacher_id = ?', params.id, s.teacher.id);
    if (!st) throw notFound('El estudiante');
    run('DELETE FROM students WHERE id = ?', st.id);
    run("DELETE FROM sessions WHERE role = 'student' AND subject = ?", st.id);
    return { ok: true };
  }],

  // Activities
  ['POST', '/api/groups/:id/activities', ({ session, params, body }) => {
    const g = ownGroup(need(session, 'teacher'), params.id);
    const content = JSON.stringify(body.content ?? null);
    if (!body.content || typeof body.content !== 'object' || content.length > 200000) throw new HttpError(400, 'El contenido de la actividad no es válido.', 'bad-request');
    const activityId = id();
    run('INSERT INTO activities (id, group_id, type, title, content, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      activityId, g.id, oneOf(body.type, TYPES, 'Tipo de actividad'), text(body.title, 120, 'Título'), content, text(body.source, 120, 'Fuente', { required: false }), now());
    return { id: activityId };
  }],
  ['GET', '/api/activities/:id', ({ session, params }) => activityJson(activityFor(need(session), params.id))],
  ['DELETE', '/api/activities/:id', ({ session, params }) => { run('DELETE FROM activities WHERE id = ?', activityFor(need(session, 'teacher'), params.id).id); return { ok: true }; }],
  ['GET', '/api/activities/:id/submissions', ({ session, params }) => {
    const a = activityFor(need(session, 'teacher'), params.id);
    return { activity: activityJson(a), submissions: all(`SELECT x.id, x.created_at AS createdAt, x.reviewed_at AS reviewedAt, s.alias, s.avatar
      FROM submissions x LEFT JOIN students s ON s.id = x.student_id WHERE x.activity_id = ? ORDER BY x.created_at DESC`, a.id) };
  }],
  ['POST', '/api/activities/:id/submissions', ({ session, params, body }) => {
    const s = need(session), a = activityFor(s, params.id);
    const answers = JSON.stringify(body.answers ?? {});
    if (answers.length > 100000) throw new HttpError(413, 'Las respuestas son demasiado largas.', 'too-large');
    const submissionId = id();
    // A teacher submission is the whole class working together on the projector.
    run('INSERT INTO submissions (id, activity_id, student_id, answers, created_at) VALUES (?, ?, ?, ?, ?)', submissionId, a.id, s.role === 'student' ? s.student.id : null, answers, now());
    return { id: submissionId };
  }],

  // Submissions + review
  ['GET', '/api/submissions/:id', ({ session, params }) => {
    const s = need(session);
    const x = get('SELECT x.*, s.alias, s.avatar FROM submissions x LEFT JOIN students s ON s.id = x.student_id WHERE x.id = ?', params.id);
    if (!x || (s.role === 'student' && x.student_id !== s.student.id)) throw notFound('La entrega');
    const a = activityFor(s, x.activity_id);
    return { id: x.id, alias: x.alias, avatar: x.avatar, createdAt: x.created_at, answers: parse(x.answers, {}), feedback: x.feedback, rubric: parse(x.rubric, []), reviewedAt: x.reviewed_at, activity: activityJson(a) };
  }],
  ['POST', '/api/submissions/:id/review', ({ session, params, body }) => {
    const s = need(session, 'teacher'), x = get('SELECT activity_id FROM submissions WHERE id = ?', params.id);
    if (!x) throw notFound('La entrega');
    activityFor(s, x.activity_id);
    const rubric = (Array.isArray(body.rubric) ? body.rubric : []).slice(0, 3).map(v => oneOf(v, RUBRIC_LEVELS, 'Rúbrica'));
    run('UPDATE submissions SET feedback = ?, rubric = ?, reviewed_at = ? WHERE id = ?', text(body.feedback, 1000, 'Devolución'), JSON.stringify(rubric), now(), params.id);
    return { ok: true };
  }],

  // Student + teacher overviews
  ['GET', '/api/student/activities', ({ session }) => {
    const s = need(session, 'student');
    return all(`SELECT a.id, a.type, a.title, a.created_at AS createdAt,
      (SELECT x.id FROM submissions x WHERE x.activity_id = a.id AND x.student_id = ? ORDER BY x.created_at DESC LIMIT 1) AS submissionId,
      (SELECT x.reviewed_at FROM submissions x WHERE x.activity_id = a.id AND x.student_id = ? ORDER BY x.created_at DESC LIMIT 1) AS reviewedAt
      FROM activities a WHERE a.group_id = ? ORDER BY a.created_at DESC`, s.student.id, s.student.id, s.group.id);
  }],
  ['GET', '/api/progress', ({ session }) => {
    const s = need(session, 'teacher');
    return {
      groups: all(`${groupSummary} WHERE g.teacher_id = ? ORDER BY g.created_at`, s.teacher.id),
      reviews: all(`SELECT a.group_id AS groupId, a.type, x.rubric FROM submissions x JOIN activities a ON a.id = x.activity_id JOIN groups g ON g.id = a.group_id
        WHERE g.teacher_id = ? AND x.reviewed_at IS NOT NULL`, s.teacher.id).map(r => ({ ...r, rubric: parse(r.rubric, []) })),
      pending: all(`SELECT x.id, x.created_at AS createdAt, s.alias, a.title, a.type, g.name AS groupName FROM submissions x JOIN activities a ON a.id = x.activity_id
        JOIN groups g ON g.id = a.group_id LEFT JOIN students s ON s.id = x.student_id WHERE g.teacher_id = ? AND x.reviewed_at IS NULL ORDER BY x.created_at DESC LIMIT 8`, s.teacher.id),
    };
  }],
];

// Compile "/api/groups/:id" into a matcher once.
const table = routes.map(([method, pattern, handler]) => {
  const keys = [];
  const regex = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([\\w-]+)'; })}$`);
  return { method, regex, keys, handler };
});
function match(method, url) {
  for (const r of table) {
    const m = r.method === method && url.match(r.regex);
    if (m) return { handler: r.handler, params: Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]])) };
  }
  return null;
}

module.exports = { match, need };
