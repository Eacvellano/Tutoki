/* Reto comunidad: a team mission — pick a real problem, design a proposal, hear a community voice, present a poster. */
(() => {
'use strict';
const list = (items, esc) => items.length ? items.map(esc).join(' · ') : '—';

async function play(ctx) {
  const { content: c, ico, esc } = ctx;
  await ctx.intro({ kicker: `${ico('users')}Misión en equipo`, title: c.title, desc: 'Usen lo que aprendieron para mejorar algo real de su comunidad.', cta: 'Aceptar la misión',
    steps: [['eye', 'Observen'], ['bulb', 'Diseñen'], ['users', 'Escuchen'], ['flag', 'Presenten']] });

  // 1. Mission briefing + choose a problem.
  ctx.progress(0.12);
  let sc = ctx.scene(`<div class="tg-transmission" data-in><span class="tg-kicker">${ico('bell')}Mensaje entrante</span><p translate="no"></p></div>
    <form class="tg-form" hidden><h2>¿Qué problema van a resolver?</h2><div class="tg-problems">${c.problems.map((p, i) => `<label class="tg-problem" data-in>
    <input type="radio" name="problem" value="${i}" required><span class="tg-emoji" aria-hidden="true">${esc(p.emoji)}</span><strong translate="no">${esc(p.title)}</strong><small translate="no">${esc(p.description)}</small></label>`).join('')}</div>
    <button class="btn primary tg-cta">Elegir este problema${ico('arrow')}</button></form>`);
  await ctx.type(sc.querySelector('.tg-transmission p'), c.mission, 55);
  const pickForm = sc.querySelector('form');
  pickForm.hidden = false; ctx.sfx('reveal');
  const problem = c.problems[Number((await ctx.form(pickForm)).problem)];

  // 2. Design the proposal with building blocks.
  ctx.progress(0.35);
  const chips = (name, items, max) => `<fieldset class="tg-chips" data-max="${max}"><legend>${name === 'resources' ? `Recursos (elige hasta ${max})` : `Aliados (elige hasta ${max})`}</legend>
    ${items.map(v => `<label class="tg-chip-option"><input type="checkbox" name="${name}" value="${esc(v)}"><span translate="no">${esc(v)}</span></label>`).join('')}</fieldset>`;
  sc = ctx.scene(`<div class="tg-row" data-in><h2>Diseñen su propuesta</h2><span class="tg-counter" translate="no">${esc(problem.emoji)} ${esc(problem.title)}</span></div>
    <form class="tg-form tg-board"><div class="field" data-in><label for="idea">Nuestra idea</label><textarea id="idea" name="idea" required placeholder="Proponemos…"></textarea></div>
    <div data-in>${chips('resources', c.resources, 3)}</div><div data-in>${chips('allies', c.allies, 2)}</div>
    <div class="tg-steps-input" data-in><span>Plan en 3 pasos</span>${[1, 2, 3].map(n => `<input name="step${n}" required placeholder="Paso ${n}" aria-label="Paso ${n}">`).join('')}</div>
    <button class="btn primary tg-cta" data-in>Preparar propuesta${ico('arrow')}</button></form>`);
  sc.querySelectorAll('.tg-chips').forEach(set => set.addEventListener('change', () => {
    const boxes = [...set.querySelectorAll('input')], max = Number(set.dataset.max);
    const full = boxes.filter(b => b.checked).length >= max;
    boxes.forEach(b => { b.disabled = full && !b.checked; });
  }));
  const form = sc.querySelector('form');
  const design = await ctx.form(form);
  const pickedOf = name => [...form.querySelectorAll(`[name="${name}"]:checked`)].map(b => b.value);
  const proposal = { idea: design.idea, resources: pickedOf('resources'), allies: pickedOf('allies'), steps: [design.step1, design.step2, design.step3] };

  // 3. A community voice reacts to this proposal (AI role-play, teacher-approved characters).
  ctx.progress(0.6);
  sc = ctx.scene(`<h2 data-in>Escuchen a la comunidad</h2><p data-in>Elijan a quién presentarle su idea primero.</p>
    <div class="tg-people">${c.stakeholders.map((p, i) => `<button class="tg-person" data-in data-tgv="${i}"><span class="tg-emoji" aria-hidden="true">${esc(p.emoji)}</span><strong translate="no">${esc(p.name)}</strong><small translate="no">${esc(p.role)}</small></button>`).join('')}</div>`);
  const person = c.stakeholders[Number((await ctx.click(sc, '.tg-person')).dataset.tgv)];
  sc.querySelector('.tg-people').classList.add('chosen');
  sc.insertAdjacentHTML('beforeend', ctx.thinking(`${esc(person.name)} lee su propuesta…`));
  ctx.lotties(sc);
  const proposalText = `${proposal.idea}. Recursos: ${proposal.resources.join(', ')}. Aliados: ${proposal.allies.join(', ')}. Pasos: ${proposal.steps.join('; ')}`;
  const voice = await ctx.ask('react', { mission: c.mission, problem: problem.title, proposal: proposalText, stakeholder: person },
    { reaction: `Leí su idea: “${proposal.idea.slice(0, 80)}”. Me gusta que quieran resolver "${problem.title}", pero me preocupa algo: ${person.concern}`, question: '¿Cómo cambiarían su propuesta para resolver esa preocupación?' }, proposal.idea);
  sc.querySelector('.tg-thinking').remove();
  sc.insertAdjacentHTML('beforeend', `${ctx.aiBubble(`${esc(person.emoji)} ${esc(person.name)} · voz simulada por IA`)}<form class="tg-form" data-in hidden>
    <div class="field"><label for="adjust">${voice.onTopic ? '¿Cómo ajustan su propuesta?' : `Explíquenle a ${esc(person.name)} su propuesta con más claridad`}</label><textarea id="adjust" name="adjust" required placeholder="Para resolverlo, vamos a…"></textarea></div>
    <button class="btn primary tg-cta">Ajustar propuesta${ico('arrow')}</button></form>`);
  ctx.lotties(sc);
  await ctx.type(sc.querySelector('.tg-ai-body'), `${voice.reaction} ${voice.question}`, 50);
  const adjustForm = sc.querySelector('form');
  adjustForm.hidden = false;
  const { adjust } = await ctx.form(adjustForm);

  // 4. Poster + how will we know it worked?
  ctx.progress(0.85);
  sc = ctx.scene(`<div class="tg-poster" data-in translate="no"><span class="tg-tape" aria-hidden="true"></span><span class="tg-emoji big" aria-hidden="true">${esc(problem.emoji)}</span>
    <h2>${esc(problem.title)}</h2><p class="tg-poster-idea">${esc(proposal.idea)}</p>
    <dl><dt>Recursos</dt><dd>${list(proposal.resources, esc)}</dd><dt>Aliados</dt><dd>${list(proposal.allies, esc)}</dd>
    <dt>Plan</dt><dd><ol>${proposal.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></dd><dt>Escuchamos a ${esc(person.name)}</dt><dd>${esc(adjust)}</dd></dl></div>
    <form class="tg-form" data-in><div class="question" translate="no">${esc(c.successQuestion)}</div><div class="field"><label for="success">Sabremos que funcionó si…</label>
    <textarea id="success" name="success" required placeholder="Observaremos que…"></textarea></div><button class="btn primary tg-cta">Presentar a mi docente${ico('arrow')}</button></form>`);
  ctx.sfx('good');
  const { success } = await ctx.form(sc.querySelector('form'));
  await ctx.finish({ problem: problem.title, ...proposal, stakeholder: person.name, voice: { reaction: voice.reaction, question: voice.question }, adjust, success });
}

function summary(a, c, { ico, esc }) {
  return `<h3>${ico('target')} Problema</h3><p translate="no"><strong>${esc(a.problem)}</strong></p><h3>${ico('bulb')} Su propuesta</h3><p class="work-quote" translate="no">${esc(a.idea)}</p>
    <p translate="no"><strong>Recursos:</strong> ${esc((a.resources || []).join(', ') || '—')}<br><strong>Aliados:</strong> ${esc((a.allies || []).join(', ') || '—')}</p>
    <ol class="work-list">${(a.steps || []).map(s => `<li translate="no">${esc(s)}</li>`).join('')}</ol>
    <h3>${ico('users')} Escucharon a ${esc(a.stakeholder)}</h3><p class="muted" translate="no">${esc(a.voice?.reaction)} ${esc(a.voice?.question)}</p><p class="work-quote" translate="no">${esc(a.adjust)}</p>
    <h3>${ico('check')} Cómo sabrán si funciona</h3><p class="work-quote" translate="no">${esc(a.success)}</p>`;
}

function review(c, edit) {
  const esc = window.Tutoki.esc;
  return `<p class="tg-review-intro">${edit('mission', c.mission)}</p><p><strong>Problemas para elegir:</strong></p>
    <ul class="tg-review-list">${c.problems.map((p, i) => `<li>${esc(p.emoji)} ${edit(`problems.${i}.title`, p.title, 'strong')}${edit(`problems.${i}.description`, p.description, 'small')}</li>`).join('')}</ul>
    <p><strong>Voces de la comunidad:</strong></p><ul class="tg-review-list">${c.stakeholders.map((p, i) => `<li>${esc(p.emoji)} <strong>${edit(`stakeholders.${i}.name`, p.name)}</strong> · ${edit(`stakeholders.${i}.role`, p.role)}<small>${edit(`stakeholders.${i}.concern`, p.concern)}</small></li>`).join('')}</ul>`;
}

window.TutokiGames.register('comunidad', { play, review, summary });
})();
