/* Teacher: activity library, submissions, review with rubric, progress and classroom projection. */
(() => {
'use strict';
const T = window.Tutoki;
const G = () => window.TutokiGames;
const { ico, art, btn, action, area, select, formError, head, back, empty, teacher, userText, esc, date, typeOf, activities } = T;
const LEVELS = ['Logrado', 'En desarrollo', 'Necesita acompañamiento'];

const library = () => teacher(`${head('Biblioteca docente', 'Actividades', 'Cinco maneras de hacer buenas preguntas. Elige una y Tutoki la prepara con tu material.')}
  <div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${activities.map(a => `<button class="card card-link game-card" data-action="pick-type" data-type="${a.id}" style="text-align:left;background:${a.id === 'primero' ? '#fff8ee' : '#fbf5ff'}">
  ${art(a.pose)}<div class="game-card-text"><h3>${a.name}</h3><p>${a.desc}</p><span class="text-btn">Preparar reto ${ico('arrow')}</span></div></button>`).join('')}</div>`, 'activities');

async function activity(id) {
  const { activity: a, submissions } = await T.api('GET', `/api/activities/${id}/submissions`);
  const rows = submissions.length ? `<div class="card"><table class="table"><thead><tr><th>Estudiante</th><th>Enviado</th><th>Estado</th><th></th></tr></thead><tbody>${submissions.map(s => `<tr>
    <td><strong>${s.alias ? userText(s.alias) : 'Toda la clase'}</strong></td><td>${date(s.createdAt)}</td>
    <td><span class="pill ${s.reviewedAt ? 'green' : 'cream'}">${s.reviewedAt ? 'Revisada' : 'Por revisar'}</span></td><td>${btn('Ver entrega', `/docente/entrega/${s.id}`, 'secondary small', 'chevron')}</td></tr>`).join('')}</tbody></table></div>`
    : empty('think', 'Aún no hay entregas', 'Cuando tus estudiantes terminen el reto, aparecerán aquí.');
  return teacher(`${back(`/docente/grupo/${a.group.id}`, userText(a.group.name))}${head(typeOf(a.type).name, userText(a.title), `${userText(a.group.name)} · Publicada ${date(a.createdAt)}`,
    `<div class="row">${btn('Proyectar en clase', `/aula/${a.id}`, 'secondary', 'eye')}${action('Eliminar', 'delete-activity', 'secondary', 'trash', `data-id="${a.id}" data-group="${a.group.id}"`)}</div>`)}${rows}`, 'activities');
}

async function review(id) {
  const s = await T.api('GET', `/api/submissions/${id}`);
  const a = s.activity;
  const criteria = G().RUBRICS[a.type];
  return teacher(`${back(`/docente/actividad/${a.id}`)}${head('Una mirada a su razonamiento', s.alias ? `Entrega de ${userText(s.alias)}` : 'Entrega de toda la clase', `${userText(a.title)} · ${userText(a.group.name)} · ${date(s.createdAt)}`)}
    <div class="two-col review-layout"><div class="card work">${G().summary(a.type, s.answers, a.content)}</div>
    <form class="card review-form" data-form="review"><input type="hidden" name="id" value="${s.id}"><input type="hidden" name="activity" value="${a.id}">
    <span class="pill">${ico('shield')}Tú decides · Ninguna calificación es automática</span><h2 class="mt">Tu devolución</h2>
    ${criteria.map((c, i) => select(esc(c), `rubric-${i}`, LEVELS.map(l => [l, l]), s.rubric[i] || 'En desarrollo')).join('')}
    ${area('Una pregunta para seguir pensando', 'feedback', '¿Qué otra evidencia podrías buscar…?', s.feedback || '')}
    ${formError()}<div class="form-actions"><button type="submit" class="btn primary">${ico('share')}${s.reviewedAt ? 'Actualizar devolución' : 'Enviar devolución'}</button></div></form></div>`, 'activities');
}

async function progress() {
  const { groups, reviews } = await T.api('GET', '/api/progress');
  if (!groups.length) return teacher(`${head('Mirar el proceso', 'Progreso')}${empty('think', 'Sin datos todavía', 'Crea un grupo y publica actividades para ver cómo piensa tu grupo.', btn('Crear grupo', '/docente/grupos/nuevo', 'primary', 'plus'))}`, 'progress');
  const cards = groups.map(g => {
    const levels = reviews.filter(r => r.groupId === g.id).flatMap(r => r.rubric);
    const share = l => levels.length ? Math.round(levels.filter(v => v === l).length / levels.length * 100) : 0;
    return `<div class="card"><div class="row"><h3>${userText(g.name)}</h3><span class="pill">${esc(g.level)} · ${esc(g.grade)}</span></div>
      <p>${g.students} estudiantes · ${g.activities} actividades · ${g.pending} por revisar</p>
      ${levels.length ? `<div class="stack-bar" role="img" aria-label="Logrado ${share(LEVELS[0])}%, en desarrollo ${share(LEVELS[1])}%, necesita acompañamiento ${share(LEVELS[2])}%">
        ${LEVELS.map((l, i) => `<span class="lv${i}" style="width:${share(l)}%"></span>`).join('')}</div>
        <div class="stack-legend">${LEVELS.map((l, i) => `<span><i class="lv${i}"></i>${l} ${share(l)}%</span>`).join('')}</div>`
      : '<p class="muted" style="font-size:13px">Las barras aparecen cuando revises entregas.</p>'}
      ${btn('Ver grupo', `/docente/grupo/${g.id}`, 'secondary small', 'chevron')}</div>`;
  }).join('');
  return teacher(`${head('Mirar el proceso', 'Cómo está pensando cada grupo', 'Basado en las rúbricas que tú asignaste. Sin rankings individuales.')}<div class="cards progress-cards">${cards}</div>`, 'progress');
}

async function classroom(id) {
  const a = await T.api('GET', `/api/activities/${id}`);
  return [teacher(`${back(`/docente/actividad/${id}`)}<div class="row classroom-bar"><span class="pill">${ico('users')}Modo aula · ${userText(a.group.name)}</span>
    ${action('Pantalla completa', 'fullscreen', 'secondary small', 'eye')}</div><section id="game-root" class="tg"></section>`, 'activities'),
  () => G().mount(a, T.$('#game-root'), { classroom: true })];
}

Object.assign(T.actions, {
  'pick-type': el => { T.state.activity = el.dataset.type; T.persist(); T.go('/docente/crear/1'); },
  'delete-activity': el => T.modal('¿Eliminar esta actividad?', `<p>Se borrarán también sus entregas.</p>${action('Sí, eliminar', 'confirm-delete-activity', 'primary', 'trash', `data-id="${el.dataset.id}" data-group="${el.dataset.group}"`)}`),
  'confirm-delete-activity': async el => { await T.api('DELETE', `/api/activities/${el.dataset.id}`); T.go(`/docente/grupo/${el.dataset.group}`); T.toast('Actividad eliminada.'); },
  fullscreen: async () => {
    document.body.classList.toggle('focus-mode');
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch (e) { console.warn('Fullscreen unavailable.', e); }
  },
});

T.forms.review = async data => {
  await T.api('POST', `/api/submissions/${data.id}/review`, { feedback: data.feedback, rubric: [0, 1, 2].map(i => data[`rubric-${i}`]) });
  T.toast('Devolución enviada. El estudiante ya la puede ver.');
  T.go(`/docente/actividad/${data.activity}`);
};

T.route(/^\/docente\/actividades$/, library, 'teacher');
T.route(/^\/docente\/actividad\/([\w-]+)$/, activity, 'teacher');
T.route(/^\/docente\/entrega\/([\w-]+)$/, review, 'teacher');
T.route(/^\/docente\/progreso$/, progress, 'teacher');
T.route(/^\/aula\/([\w-]+)$/, classroom, 'teacher');
})();
