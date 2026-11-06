/* Teacher space: home, groups (many per teacher), invitations, students and account. */
(() => {
'use strict';
const T = window.Tutoki;
const { ico, art, btn, action, field, select, formError, head, back, empty, teacher, userText, esc, date, typeOf } = T;
const GRADES = ['1.º', '2.º', '3.º', '4.º', '5.º', '6.º'];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const groupCards = groups => `<div class="cards group-cards">${groups.map(g => `<a class="card card-link group-card" href="#/docente/grupo/${g.id}">
  <div class="row"><h3>${userText(g.name)}</h3><span class="pill">${esc(g.level)} · ${esc(g.grade)}</span></div>
  <p>${plural(g.students, 'estudiante', 'estudiantes')} · ${plural(g.activities, 'actividad', 'actividades')}</p>
  <div class="row"><span class="code-chip" translate="no">${esc(g.code)}</span>${g.pending ? `<span class="pill cream">${ico('clock')}${g.pending} por revisar</span>` : ''}</div></a>`).join('')}</div>`;

const pendingList = items => items.length
  ? `<div class="card list-card">${items.map(p => `<div class="list-row"><div><strong>${p.alias ? userText(p.alias) : 'Toda la clase'}</strong><small>${userText(p.title)} · ${userText(p.groupName)} · ${date(p.createdAt)}</small></div>${btn('Revisar', `/docente/entrega/${p.id}`, 'secondary small', 'chevron')}</div>`).join('')}</div>`
  : `<div class="card row"><p class="mb0">${ico('check')} Todo al día: no hay entregas pendientes.</p></div>`;

async function home() {
  const [groups, progress] = await Promise.all([T.api('GET', '/api/groups'), T.api('GET', '/api/progress')]);
  const first = T.session.teacher.name.split(' ')[0];
  const cta = groups.length ? btn('Crear actividad', '/docente/crear/1', 'primary', 'plus') : btn('Crear mi primer grupo', '/docente/grupos/nuevo', 'primary', 'plus');
  return teacher(`<section class="hero"><div class="hero-copy"><div class="eyebrow">Hola, ${userText(first)}</div><h1>Hoy hacemos<br>buenas preguntas<span style="color:#f5ac31">.</span></h1>
    <p>Sube tu material y Tutoki lo convierte en retos que ponen a pensar a tu grupo.</p>${cta}</div>${art('teacher', 'float')}</section>
    <div class="section-heading"><h2>Mis grupos</h2>${btn('Nuevo grupo', '/docente/grupos/nuevo', 'secondary small', 'plus')}</div>
    ${groups.length ? groupCards(groups) : empty('think', 'Aún no tienes grupos', 'Crea un grupo y comparte su código con tus estudiantes.', btn('Crear grupo', '/docente/grupos/nuevo', 'primary', 'plus'))}
    <div class="section-heading"><h2>${ico('file')} Para revisar</h2></div>${pendingList(progress.pending)}`, 'home');
}

async function groups() {
  const list = await T.api('GET', '/api/groups');
  return teacher(`${head('Mis grupos', 'Tus grupos', 'Cada grupo tiene su propio código, estudiantes y actividades.', btn('Nuevo grupo', '/docente/grupos/nuevo', 'primary', 'plus'))}
    ${list.length ? groupCards(list) : empty('think', 'Aún no tienes grupos', 'Crea el primero para empezar.', btn('Crear grupo', '/docente/grupos/nuevo', 'primary', 'plus'))}`, 'groups');
}

const gradeOptions = level => (level === 'Secundaria' ? GRADES.slice(0, 3) : GRADES).map(g => [g, g]);
async function groupForm(id) {
  const g = id ? (await T.api('GET', `/api/groups/${id}`)).group : { name: '', level: 'Primaria', grade: '5.º' };
  return teacher(`${back(id ? `/docente/grupo/${id}` : '/docente/grupos')}<div class="form-card"><div class="row"><div><div class="eyebrow">${id ? 'Ajustes del grupo' : 'Un nuevo comienzo'}</div>
    <h1>${id ? 'Editar grupo' : 'Crear grupo'}</h1><p>El nivel y el grado ajustan cómo la IA prepara las actividades.</p></div>${art('think')}</div>
    <form data-form="group"><input type="hidden" name="id" value="${esc(id || '')}">${field('Nombre del grupo', 'name', 'Ej. 5.º A', g.name, 'text', 'required maxlength="40"')}
    <div class="form-grid">${select('Nivel', 'level', [['Primaria', 'Primaria'], ['Secundaria', 'Secundaria']], g.level)}${select('Grado', 'grade', gradeOptions(g.level), g.grade)}</div>
    ${formError()}<div class="form-actions">${id ? action('Eliminar grupo', 'delete-group', 'secondary', 'trash', `data-id="${id}"`) : ''}<button class="btn primary" type="submit">${ico('check')}Guardar grupo</button></div></form></div>`, 'groups');
}

async function invitation(id) {
  const { group: g } = await T.api('GET', `/api/groups/${id}`);
  return teacher(`<section class="invitation-page">${back(`/docente/grupo/${id}`)}<article class="form-card invitation invitation-card" aria-labelledby="invitation-heading">
    <div class="invitation-banner" aria-hidden="true"><span class="invitation-blob"></span><img src="assets/toki/invitation-toki.png" alt="" draggable="false">
      <svg class="invitation-cap" viewBox="0 0 100 80"><path d="M5 28 49 6l44 14-42 24ZM25 39v23c15 9 34 10 48 0V35M86 25v30m0 0c-7 1-7 12 0 12s7-11 0-12"/></svg>
      <svg class="invitation-people" viewBox="0 0 110 80"><circle cx="25" cy="22" r="11"/><circle cx="59" cy="18" r="12"/><circle cx="91" cy="26" r="10"/><path d="M4 63V52c0-24 38-24 38 0v16m-5-7V48c0-25 42-25 42 0v21m-3-6V54c0-22 33-22 33 0v15"/></svg>
      <svg class="invitation-wave" viewBox="0 0 1100 80" preserveAspectRatio="none"><path d="M0 40C120-2 175 82 290 45S440 72 540 45 650 72 750 30 920 66 1100 38V80H0Z"/><path d="M0 40C120-2 175 82 290 45S440 72 540 45 650 72 750 30 920 66 1100 38"/></svg>
    </div><div class="invitation-copy"><div class="eyebrow">Una nueva aventura en equipo</div><h1 id="invitation-heading">${userText(g.name)} ya está listo</h1>
    <p>Comparte el código de invitación con tus estudiantes.</p><div class="invitation-code"><svg class="invitation-rays" viewBox="0 0 40 70" aria-hidden="true"><path d="m10 8 16 10M5 35h20m-15 27 16-10"/></svg><div class="code" translate="no">${esc(g.code)}</div><svg class="invitation-rays right" viewBox="0 0 40 70" aria-hidden="true"><path d="m10 8 16 10M5 35h20m-15 27 16-10"/></svg></div>
    <div class="invitation-actions">${action('Compartir invitación', 'share-code', 'secondary', 'share', `data-code="${esc(g.code)}"`)}${action('Copiar código', 'copy-code', 'secondary', 'copy', `data-code="${esc(g.code)}"`)}</div>
    <div class="mt">${btn('Ir a mi grupo', `/docente/grupo/${id}`, 'primary', 'arrow')}</div></div>
    <svg class="invitation-hills" viewBox="0 0 1100 180" preserveAspectRatio="none" aria-hidden="true"><path d="M0 25c90-12 90 80 180 83s110 35 140 72H0ZM1100 0c-110 25-45 104-170 120-60 8-91 36-120 60h290Z"/><path d="M1100 90c-72 0-111 48-168 58l-70 32h238Z"/></svg>
    </article></section>`, 'groups');
}

async function group(id) {
  const { group: g, students, activities } = await T.api('GET', `/api/groups/${id}`);
  const tab = T.state.tab === 'students' ? 'students' : 'activities';
  const tabs = `<div class="tabs" role="tablist" aria-label="Secciones del grupo">${[['activities', 'book', `Actividades (${activities.length})`], ['students', 'users', `Estudiantes (${students.length})`]]
    .map(([k, i, label]) => `<button class="tab ${tab === k ? 'selected' : ''}" role="tab" aria-selected="${tab === k}" data-action="tab" data-tab="${k}">${ico(i)}${label}</button>`).join('')}</div>`;
  const activityRows = activities.length ? activities.map(a => `<div class="card activity-row"><div class="row"><span class="card-icon">${ico(typeOf(a.type).icon)}</span><div><h3>${userText(a.title)}</h3><small>${typeOf(a.type).name} · ${date(a.createdAt)}</small></div></div>
    <div class="row">${a.pending ? `<span class="pill cream">${a.pending} por revisar</span>` : ''}${btn('Proyectar', `/aula/${a.id}`, 'secondary small', 'eye')}${btn(`Entregas (${a.submissions})`, `/docente/actividad/${a.id}`, 'primary small', 'chevron')}</div></div>`).join('')
    : empty('think', 'Aquí empiezan las buenas preguntas', 'Prepara el primer reto para este grupo.');
  const studentGrid = students.length ? `<div class="student-grid">${students.map(s => `<button class="student-card" data-action="student" data-id="${s.id}" data-alias="${esc(s.alias)}" data-pin="${esc(s.pin)}" aria-haspopup="dialog">
    <span class="avatar-art">${art(s.avatar)}</span><span><strong translate="no">${esc(s.alias)}</strong><small>${plural(s.submissions, 'entrega', 'entregas')}</small></span>${ico('chevron')}</button>`).join('')}</div>`
    : empty('wave', 'Todavía no se une nadie', `Comparte el código <strong translate="no">${esc(g.code)}</strong> con tu grupo.`);
  return teacher(`${back('/docente/grupos', 'Mis grupos')}${head(`${esc(g.level)} · ${esc(g.grade)}`, userText(g.name), '', `<div class="row"><button class="code-chip" data-action="copy-code" data-code="${esc(g.code)}" title="Copiar código">${ico('copy')}<span translate="no">${esc(g.code)}</span></button>${btn('Editar', `/docente/grupo/${id}/editar`, 'secondary small', 'edit')}</div>`)}
    ${tabs}<section role="tabpanel">${tab === 'activities' ? `${activityRows}<div class="form-actions">${action('Crear actividad', 'create-for-group', 'primary', 'plus', `data-id="${id}"`)}</div>`
    : `<p style="font-size:13px">Cada estudiante entra con el código del grupo, su alias y un PIN personal.</p>${studentGrid}<div class="form-actions">${btn('Invitar estudiantes', `/docente/grupo/${id}/invitacion`, 'secondary', 'share')}</div>`}</section>`, 'groups');
}

const account = sub => teacher(`${sub ? back('/docente/cuenta') : ''}${sub === 'accesibilidad' ? `${head('Accesibilidad', 'Ajusta tu espacio', 'Estos ajustes se guardan en este dispositivo.')}${T.accessibility()}`
  : `${head('Tu espacio', 'Mi cuenta')}<div class="two-col"><form class="card" data-form="profile">${field('Nombre', 'name', 'Tu nombre', T.session.teacher.name, 'text', 'required maxlength="60"')}
    <p class="muted" style="font-size:13px">${ico('mail')} ${userText(T.session.teacher.email)}</p>${formError()}<button class="btn primary" type="submit">${ico('check')}Guardar</button></form>
    <div class="card settings-menu"><a class="setting" style="text-decoration:none;color:inherit" href="#/docente/cuenta/accesibilidad"><span>${ico('volume')}Accesibilidad</span>${ico('chevron')}</a>
    <button class="setting" data-action="logout"><span>${ico('logout')}Cerrar sesión</span>${ico('chevron')}</button></div></div>`}`, 'settings');

Object.assign(T.actions, {
  tab: el => { T.state.tab = el.dataset.tab; T.persist(); T.render(); },
  'create-for-group': el => { T.state.groupId = el.dataset.id; T.persist(); T.go('/docente/crear/1'); },
  'delete-group': el => T.modal('¿Eliminar este grupo?', `<p>Se borrarán sus estudiantes, actividades y entregas. No se puede deshacer.</p>${action('Sí, eliminar grupo', 'confirm-delete-group', 'primary', 'trash', `data-id="${el.dataset.id}"`)}`),
  'confirm-delete-group': async el => { await T.api('DELETE', `/api/groups/${el.dataset.id}`); T.go('/docente/grupos'); T.toast('Grupo eliminado.'); },
  student: el => T.modal(esc(el.dataset.alias), `<p>PIN para entrar desde otro dispositivo:</p><div class="code" translate="no">${esc(el.dataset.pin)}</div>
    <div class="stack">${action('Generar un PIN nuevo', 'reset-pin', 'secondary', 'key', `data-id="${el.dataset.id}"`)}${action('Quitar del grupo', 'remove-student', 'secondary', 'trash', `data-id="${el.dataset.id}"`)}</div>`),
  'reset-pin': async el => { const { pin } = await T.api('POST', `/api/students/${el.dataset.id}/pin`); await T.render(); T.modal('PIN nuevo', `<div class="code" translate="no">${esc(pin)}</div><p>Compártelo con el estudiante. Su sesión anterior se cerró.</p>`); },
  'remove-student': async el => { await T.api('DELETE', `/api/students/${el.dataset.id}`); T.$('#modal').close(); T.toast('Estudiante quitado del grupo.'); T.render(); },
});

Object.assign(T.forms, {
  group: async data => {
    if (data.id) { await T.api('PATCH', `/api/groups/${data.id}`, data); T.toast('Grupo actualizado.'); return T.go(`/docente/grupo/${data.id}`); }
    const g = await T.api('POST', '/api/groups', data);
    T.state.groupId = g.id; T.persist();
    T.go(`/docente/grupo/${g.id}/invitacion`);
  },
  profile: async data => { await T.api('PATCH', '/api/me', data); T.session.teacher.name = data.name; T.toast('Perfil actualizado.'); T.render(); },
});

// Secundaria only has 1.º–3.º, so the grade list follows the level.
document.addEventListener('change', e => {
  if (e.target.id !== 'level') return;
  const grade = T.$('#grade');
  if (grade) grade.innerHTML = gradeOptions(e.target.value).map(([v]) => `<option>${v}</option>`).join('');
});

T.route(/^\/docente$/, home, 'teacher');
T.route(/^\/docente\/grupos$/, groups, 'teacher');
T.route(/^\/docente\/grupos\/nuevo$/, () => groupForm(null), 'teacher');
T.route(/^\/docente\/grupo\/([\w-]+)$/, group, 'teacher');
T.route(/^\/docente\/grupo\/([\w-]+)\/editar$/, groupForm, 'teacher');
T.route(/^\/docente\/grupo\/([\w-]+)\/invitacion$/, invitation, 'teacher');
T.route(/^\/docente\/cuenta(?:\/(accesibilidad))?$/, account, 'teacher');
})();
