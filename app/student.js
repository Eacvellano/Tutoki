/* Student space: home, avatar, assigned challenges, play, journey, teacher feedback, account. */
(() => {
'use strict';
const T = window.Tutoki;
const G = () => window.TutokiGames;
const { ico, art, btn, head, back, empty, student, userText, esc, date, typeOf } = T;
const AVATARS = ['wave', 'detective', 'speak', 'think', 'celebrate', 'plant', 'debate', 'teacher'];

const status = a => a.reviewedAt ? ['green', 'Con devolución'] : a.submissionId ? ['green', 'Enviado'] : ['', 'Nuevo'];
const card = a => {
  const [cls, label] = status(a), t = typeOf(a.type);
  return `<a class="card card-link game-card" href="#/juego/${a.id}" style="background:${a.type === 'primero' ? '#fff8ef' : '#fbf6ff'}">${art(t.pose)}
    <div class="game-card-text"><div class="row"><h3>${userText(a.title)}</h3><span class="pill ${cls}">${label}</span></div><p>${t.name} · ${t.desc}</p>
    <span class="text-btn">${a.submissionId ? 'Jugar de nuevo' : 'Empezar reto'}${ico('arrow')}</span></div></a>`;
};

async function home() {
  const list = await T.api('GET', '/api/student/activities');
  const next = list.find(a => !a.submissionId);
  const feedback = list.filter(a => a.reviewedAt);
  const hero = next ? `<section class="student-hero"><div><span class="pill" style="background:#ffffff88">${typeOf(next.type).name}</span><h2 class="mt">${userText(next.title)}</h2>
    <p>${typeOf(next.type).desc}</p>${btn('Empezar', `/juego/${next.id}`, 'primary', 'arrow')}</div>${art(typeOf(next.type).pose, 'float')}</section>`
    : empty('celebrate', list.length ? '¡Estás al día!' : 'Todavía no hay retos', list.length ? 'Terminaste todos tus retos. Puedes volver a jugarlos cuando quieras.' : 'Tu docente pronto publicará el primero.');
  return student(`<div class="page-heading"><div><div class="eyebrow">Un nuevo día para descubrir</div><h1>¡Hola, ${userText(T.session.student.alias)}!</h1><p>¿Qué buena pregunta harás hoy?</p></div>
    <a href="#/estudiante/avatar" class="avatar-button" aria-label="Cambiar avatar">${art(T.session.student.avatar)}</a></div>
    <div class="section-heading"><h2>Tu próxima aventura</h2></div>${hero}
    ${feedback.length ? `<div class="section-heading"><h2>${ico('bell')} Tu docente te respondió</h2></div><div class="card list-card">${feedback.slice(0, 3).map(a => `<div class="list-row"><div><strong>${userText(a.title)}</strong><small>Revisado ${date(a.reviewedAt)}</small></div>${btn('Ver devolución', `/estudiante/entrega/${a.submissionId}`, 'secondary small', 'chevron')}</div>`).join('')}</div>` : ''}`);
}

const avatar = () => student(`<div class="center"><span class="pill">${ico('school')}${userText(T.session.group.name)}</span><h1 class="mt">¡Hola, ${userText(T.session.student.alias)}!</h1><p>Elige tu avatar para esta aventura.</p></div>
  <div class="avatar-options">${AVATARS.map(p => `<button class="avatar-choice ${T.session.student.avatar === p ? 'selected' : ''}" data-action="avatar" data-avatar="${p}" aria-label="Avatar ${p}" aria-pressed="${T.session.student.avatar === p}">${art(p)}</button>`).join('')}</div>
  ${btn('Listo', '/estudiante', 'primary full', 'check')}`, 'home', true);

async function library() {
  const list = await T.api('GET', '/api/student/activities');
  return student(`${head('De tu docente', 'Mis retos', 'Una pregunta. Muchas formas de descubrir.')}${list.length ? `<div class="cards game-cards">${list.map(card).join('')}</div>` : empty('think', 'Todavía no hay retos', 'Tu docente pronto publicará el primero.')}`, 'games');
}

async function play(id) {
  const a = await T.api('GET', `/api/activities/${id}`);
  return [student('<section id="game-root" class="tg"></section>', 'games'), () => G().mount(a, T.$('#game-root'))];
}

async function journey() {
  const list = (await T.api('GET', '/api/student/activities')).filter(a => a.submissionId);
  const counts = list.reduce((c, a) => ({ ...c, [a.type]: (c[a.type] || 0) + 1 }), {});
  return student(`${head('Cada idea cuenta', 'Mi recorrido', 'Mira todo lo que has pensado.')}
    <div class="milestones">${T.activities.map(t => `<div class="milestone ${counts[t.id] ? 'on' : ''}">${ico(t.icon)}${t.name}<small>${counts[t.id] || 0}</small></div>`).join('')}</div>
    ${list.length ? `<div class="card list-card mt">${list.map(a => `<div class="list-row"><div><strong>${userText(a.title)}</strong><small>${typeOf(a.type).name} · ${a.reviewedAt ? 'Con devolución' : 'Esperando a tu docente'}</small></div>
    ${btn('Ver', `/estudiante/entrega/${a.submissionId}`, 'secondary small', 'chevron')}</div>`).join('')}</div>` : empty('think', 'Tu recorrido empieza aquí', 'Cuando termines un reto, aparecerá en esta lista.', btn('Ver mis retos', '/estudiante/retos', 'primary', 'target'))}`, 'progress');
}

async function submission(id) {
  const s = await T.api('GET', `/api/submissions/${id}`);
  const criteria = G().RUBRICS[s.activity.type];
  const feedback = s.reviewedAt ? `<div class="card feedback-card">${art('teacher')}<div><span class="pill green">${ico('check')}Tu docente revisó tu trabajo</span>
    <div class="question" translate="no">${esc(s.feedback)}</div><div class="rubric">${criteria.map((c, i) => `<span>${ico('check')}${esc(c)}: <strong>${esc(s.rubric[i] || '—')}</strong></span>`).join('')}</div></div></div>`
    : `<div class="hint">${ico('clock')}Tu docente todavía no revisa este trabajo.</div>`;
  return student(`${back('/estudiante/avance')}${head(typeOf(s.activity.type).name, userText(s.activity.title), `Enviado ${date(s.createdAt)}`)}${feedback}
    <div class="card mt work">${G().summary(s.activity.type, s.answers, s.activity.content)}</div>`, 'progress', true);
}

const account = sub => student(`${sub ? back('/estudiante/cuenta') : ''}${sub ? `${head('Accesibilidad', 'Aprender a tu manera')}${T.accessibility()}`
  : `${head('Tu espacio', 'Mi cuenta')}<div class="card settings-menu"><div class="setting"><span>${ico('user')}${userText(T.session.student.alias)}</span><span class="pill">${userText(T.session.group.name)}</span></div>
  <a class="setting" style="text-decoration:none;color:inherit" href="#/estudiante/avatar"><span>${ico('edit')}Cambiar avatar</span>${ico('chevron')}</a>
  <a class="setting" style="text-decoration:none;color:inherit" href="#/estudiante/cuenta/accesibilidad"><span>${ico('volume')}Accesibilidad</span>${ico('chevron')}</a>
  <button class="setting" data-action="logout"><span>${ico('logout')}Salir</span>${ico('chevron')}</button></div><div class="hint">${ico('key')}Si olvidas tu PIN, pídeselo a tu docente.</div>`}`, 'account', true);

T.actions.avatar = async el => {
  await T.api('PATCH', '/api/me', { avatar: el.dataset.avatar });
  T.session.student.avatar = el.dataset.avatar;
  T.render();
};

T.route(/^\/estudiante$/, home, 'student');
T.route(/^\/estudiante\/avatar$/, avatar, 'student');
T.route(/^\/estudiante\/retos$/, library, 'student');
T.route(/^\/juego\/([\w-]+)$/, play, 'student');
T.route(/^\/estudiante\/avance$/, journey, 'student');
T.route(/^\/estudiante\/entrega\/([\w-]+)$/, submission, 'student');
T.route(/^\/estudiante\/cuenta(?:\/(accesibilidad))?$/, account, 'student');
})();
