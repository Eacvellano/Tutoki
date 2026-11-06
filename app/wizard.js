/* Teacher creation wizard: material + group → activity type → AI draft review → publish. */
(() => {
'use strict';
const T = window.Tutoki;
const G = () => window.TutokiGames;
const { ico, art, btn, action, field, select, formError, head, back, empty, teacher, userText, esc, typeOf, activities } = T;

const fileRow = () => {
  const name = G().materialName();
  return `<div class="file-row" id="file-label">${ico('file')}<strong>${name ? userText(name) : 'Sin archivo · La IA usará solo el tema'}</strong>${name ? `<button type="button" data-action="remove-file" aria-label="Quitar material">${ico('close')}</button>` : ''}</div>`;
};

async function step1() {
  const groups = await T.api('GET', '/api/groups');
  if (!groups.length) return teacher(empty('think', 'Primero crea un grupo', 'Las actividades se publican para un grupo.', btn('Crear grupo', '/docente/grupos/nuevo', 'primary', 'plus')), 'activities', 1);
  const current = groups.find(g => g.id === T.state.groupId) || groups[0];
  return teacher(`${back('/docente')}${head('Crear actividad', 'Sube tu material', 'Tutoki crea las preguntas a partir de lo que tú enseñas.')}
    <form class="form-card" data-form="material">${select('¿Para qué grupo?', 'group', groups.map(g => [g.id, `${g.name} · ${g.level} ${g.grade}`]), current.id)}
    <label class="upload mt" for="material-file">${ico('upload')}<strong>Sube tu material</strong><span>PDF, foto de un libro o texto · máx. 15 MB</span><small>Opcional, pero recomendado: la IA crea las preguntas a partir de él.</small>
    <input type="file" id="material-file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt" aria-label="Seleccionar material"></label>${fileRow()}
    <div class="mt">${field('Tema de la actividad', 'topic', 'Ej. La fotosíntesis, la Independencia de México…', T.state.topic || '', 'text', 'required maxlength="200"')}</div>
    ${formError()}<div class="form-actions"><button type="submit" class="btn primary">Continuar${ico('arrow')}</button></div></form>`, 'activities', 1);
}

function step2() {
  if (!T.state.groupMeta) return T.go('/docente/crear/1');
  const picked = T.state.activity, g = T.state.groupMeta;
  const warn = picked === 'duelo' && g.level !== 'Secundaria' ? ' Recomendada para secundaria (13+): el contrincante de IA conversa libremente.' : '';
  return teacher(`<section class="activity-picker-page">${back('/docente/crear/1')}${head('Crear actividad', 'Elige el tipo de reto', `Para ${userText(g.name)} · ${esc(g.level)} ${esc(g.grade)}`)}
    <div class="form-card activity-picker"><div class="activity-options">${activities.map((a, i) => `<button class="activity-option ${picked === a.id ? 'selected' : ''}" data-action="pick-activity" data-type="${a.id}" aria-pressed="${picked === a.id}" style="--slice:${i}">
    <span class="activity-option-heading">${ico(a.icon)}<strong>${a.name}</strong><small>${a.id === 'duelo' ? 'Secundaria · 13+' : 'Aprender a pensar'}</small></span><span class="activity-panorama" aria-hidden="true"></span></button>`).join('')}</div>
    <div class="hint mt">${ico('bulb')}<span>${esc(typeOf(picked).id === picked ? typeOf(picked).desc : 'Elige una actividad para preparar tu borrador.')}${warn}</span></div>
    <div class="row mt"><span class="pill">${ico('file')}${G().materialName() ? userText(G().materialName()) : userText(T.state.topic)}</span>
    ${action('Crear con IA', 'prepare', 'primary', 'spark', picked ? '' : 'disabled')}</div></div></section>`, 'activities', 2);
}

function step3() {
  return teacher(`${back('/docente/crear/2')}${head('Crear actividad', 'Revisa antes de compartir', 'Nada llega a tu grupo sin tu aprobación.')}${G().review()}`, 'activities', 3);
}

function step4() {
  const d = T.state.draft, g = T.state.groupMeta;
  if (!d || !g) return T.go('/docente/crear/1');
  return teacher(`${back('/docente/crear/3')}${head('Crear actividad', 'Publicar actividad', 'Tu grupo la verá en «Mis retos» en cuanto la publiques.')}
    <div class="form-card"><div class="file-row" style="margin:0">${ico(typeOf(d.activity).icon)}<div><span class="muted" style="font-size:13px">${typeOf(d.activity).name}</span><h3 class="mb0">${userText(d.content.title)}</h3></div></div>
    <div class="field mt"><label>Grupo</label><div class="pill">${ico('users')}${userText(g.name)} · ${esc(g.level)} ${esc(g.grade)}</div></div>
    <p style="font-size:13px">Cada estudiante la realiza en su dispositivo. También puedes proyectarla y resolverla con toda la clase.</p>
    <div class="row mt"><span class="pill green">${ico('check')}Revisada por ti</span>${action('Publicar actividad', 'publish', 'primary', 'share')}</div></div>`, 'activities', 4);
}

Object.assign(T.actions, {
  'wizard-step': el => T.go(`/docente/crear/${el.dataset.step}`),
  'pick-activity': el => { T.state.activity = el.dataset.type; T.persist(); const x = T.$('.activity-options').scrollLeft; T.render().then(() => { const o = T.$('.activity-options'); if (o) o.scrollLeft = x; }); },
  'remove-file': () => { G().clearMaterial(); T.$('#file-label').outerHTML = fileRow(); },
  prepare: async el => {
    el.disabled = true;
    await G().generate(T.state.activity);
    T.go('/docente/crear/3');
  },
  publish: async el => {
    const d = T.state.draft, g = T.state.groupMeta;
    el.disabled = true;
    try {
      const { id } = await T.api('POST', `/api/groups/${g.id}/activities`, { type: d.activity, title: d.content.title, content: d.content, source: d.source });
      T.state.draft = null; T.persist();
      await T.go(`/docente/grupo/${g.id}`);
      G().confetti(true);
      T.modal('¡El reto ya está listo!', `<div class="center">${art('celebrate')}<p>Ya aparece en «Mis retos» de ${userText(g.name)}.</p></div>
        <div class="stack">${btn('Proyectar en clase ahora', `/aula/${id}`, 'primary', 'eye')}${btn('Ver entregas', `/docente/actividad/${id}`, 'secondary', 'chevron')}</div>`);
    } finally { el.disabled = false; }
  },
});

T.forms.material = async data => {
  const groups = await T.api('GET', '/api/groups');
  const g = groups.find(x => x.id === data.group);
  if (!g) throw new Error('Elige un grupo válido.');
  Object.assign(T.state, { groupId: g.id, groupMeta: { id: g.id, name: g.name, level: g.level, grade: g.grade }, topic: data.topic });
  T.persist();
  T.go('/docente/crear/2');
};

document.addEventListener('change', async e => {
  if (e.target.id !== 'material-file' || !e.target.files[0]) return;
  try { await G().setMaterial(e.target.files[0]); T.$('#file-label').outerHTML = fileRow(); T.toast('Material listo: la IA creará las preguntas a partir de él.'); }
  catch (err) { e.target.value = ''; T.toast(err.message); }
});

T.route(/^\/docente\/crear\/1$/, step1, 'teacher');
T.route(/^\/docente\/crear\/2$/, step2, 'teacher');
T.route(/^\/docente\/crear\/3$/, step3, 'teacher');
T.route(/^\/docente\/crear\/4$/, step4, 'teacher');
})();
