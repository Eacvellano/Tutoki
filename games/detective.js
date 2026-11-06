/* Detective: the AI writes a convincing text with seeded errors; the student hunts, classifies and explains them. */
(() => {
'use strict';
const ERROR_LABELS = { 'dato-falso': 'Dato falso', generaliza: 'Generaliza de más', 'causa-confundida': 'Confunde causa y efecto', sesgo: 'Tiene un sesgo', omite: 'Le falta información' };

async function play(ctx) {
  const { content: c, ico, esc } = ctx;
  const errors = c.sentences.filter(s => s.isError).length;
  await ctx.intro({ kicker: `${ico('search')}Caso abierto`, title: c.title, desc: c.caseIntro, cta: 'Abrir el caso',
    steps: [['book', 'Lee lo que escribió la IA'], ['search', 'Marca lo sospechoso'], ['bulb', 'Explica tus pistas']] });

  // 1. The AI "writes" live, sentence by sentence.
  ctx.progress(0.15);
  let sc = ctx.scene(`<div class="tg-row" data-in><h2>Lee con lupa</h2><span class="tg-counter">${ico('flag')}<b>${errors}</b> errores escondidos</span></div>
    ${ctx.aiBubble('Asistente de IA', 'tg-ai-case')}
    <p class="tg-instruction" data-in>${ico('search')}<span>Espera a que termine de escribir…</span></p>
    <button class="btn primary tg-cta" data-tg="check" disabled>Revisar mis sospechas${ico('arrow')}</button>`);
  const body = sc.querySelector('.tg-ai-body');
  body.innerHTML = c.sentences.map((s, i) => `<button class="tg-sentence" data-tgv="${i}" aria-pressed="false" disabled></button>`).join(' ');
  await ctx.typeMany([...body.children].map((el, i) => [el, c.sentences[i].text]), 55);
  ctx.sfx('reveal');
  sc.querySelector('.tg-instruction span').textContent = `Toca las frases que creas que tienen un error. Hay ${errors}.`;
  const marked = new Set();
  const checkBtn = sc.querySelector('[data-tg="check"]');
  body.querySelectorAll('.tg-sentence').forEach(b => { b.disabled = false; });
  body.addEventListener('click', e => {
    const b = e.target.closest('.tg-sentence');
    if (!b) return;
    const i = Number(b.dataset.tgv);
    marked.has(i) ? marked.delete(i) : marked.add(i);
    b.classList.toggle('marked', marked.has(i));
    b.setAttribute('aria-pressed', marked.has(i));
    ctx.sfx('tap');
    checkBtn.disabled = !marked.size;
  });
  await ctx.click(sc, '[data-tg="check"]');

  // 2. Interrogate each suspicion: classify it and give a reason.
  const suspects = [...marked].sort((a, b) => a - b);
  const notes = {};
  for (const [n, i] of suspects.entries()) {
    ctx.progress(0.35 + (n / suspects.length) * 0.3);
    sc = ctx.scene(`<span class="tg-kicker" data-in>${ico('search')}Sospecha ${n + 1} de ${suspects.length}</span>
      <blockquote class="tg-evidence" data-in translate="no">“${esc(c.sentences[i].text)}”</blockquote>
      <form class="tg-form" data-in><fieldset class="tg-chips"><legend>¿Qué tipo de error crees que es?</legend>
      ${Object.entries(ERROR_LABELS).map(([k, v]) => `<label class="tg-chip-option"><input type="radio" name="type" value="${k}" required><span>${v}</span></label>`).join('')}</fieldset>
      <div class="field"><label for="why-${i}">¿Qué pista te lo dice? ¿Cómo lo corregirías?</label><textarea id="why-${i}" name="why" required placeholder="Sospecho porque…"></textarea></div>
      <button class="btn primary tg-cta">${n + 1 < suspects.length ? 'Siguiente sospecha' : 'Abrir el expediente'}${ico('arrow')}</button></form>`);
    notes[i] = await ctx.form(sc.querySelector('form'));
  }

  // 3. Reveal the case file, one verdict at a time.
  ctx.progress(0.75);
  const found = suspects.filter(i => c.sentences[i].isError).length;
  sc = ctx.scene(`<div class="tg-row" data-in><h2>Expediente del caso</h2><span class="tg-counter">${ico('flag')}<b>0</b> / ${errors}</span></div>
    <ol class="tg-verdicts">${c.sentences.map((s, i) => verdict(s, i, marked.has(i), notes[i], ico, esc)).join('')}</ol>
    <div class="tg-stamp" hidden>${found === errors ? 'Caso resuelto' : 'Caso en progreso'}</div>
    <button class="btn primary tg-cta" data-tg="next" hidden>Cerrar el caso${ico('arrow')}</button>`);
  let count = 0;
  for (const li of sc.querySelectorAll('.tg-verdicts li')) {
    await ctx.wait(650);
    li.classList.add('shown');
    if (li.classList.contains('found')) { count++; sc.querySelector('.tg-counter b').textContent = count; ctx.sfx('good'); ctx.confetti(); }
    else if (li.classList.contains('missed')) ctx.sfx('bad');
  }
  sc.querySelector('.tg-stamp').hidden = false;
  sc.querySelector('[data-tg="next"]').hidden = false;
  ctx.sfx(found === errors ? 'fanfare' : 'reveal');

  // The chief detective (AI) reacts to the reasons this student actually wrote.
  const nextBtn = sc.querySelector('[data-tg="next"]');
  nextBtn.hidden = true;
  sc.insertAdjacentHTML('beforeend', ctx.thinking('El detective jefe lee tus pistas…'));
  ctx.lotties(sc);
  const studentText = suspects.map(i => `“${c.sentences[i].text}” → ${ERROR_LABELS[notes[i].type]}: ${notes[i].why}`).join('\n');
  const context = c.sentences.map(s => `${s.isError ? `[ERROR ${s.errorType}]` : '[correcta]'} ${s.text}`).join('\n');
  const coach = await ctx.ask('coach', { kind: 'detective', context, studentText }, {
    message: found === errors ? '¡Encontraste todas las pistas! ¿Cuál fue la más difícil de comprobar y qué parte del material te ayudó?' : `Encontraste ${found} de ${errors} pistas. Mira la que se te escapó: ¿qué parte del material la contradice?`,
  }, Object.values(notes).map(n => n.why).join(' '));
  sc.querySelector('.tg-thinking').remove();
  sc.insertAdjacentHTML('beforeend', ctx.aiBubble('Detective jefe'));
  ctx.lotties(sc);
  sc.append(nextBtn);
  await ctx.type([...sc.querySelectorAll('.tg-ai-body')].pop(), coach.message, 50);
  nextBtn.hidden = false;
  await ctx.click(sc, '[data-tg="next"]');

  // 4. Metacognition: how did you detect it?
  ctx.progress(0.9);
  sc = ctx.scene(`<div class="tg-intro-art small" data-in>${ctx.art('think')}</div><h2 data-in>Antes de cerrar el caso…</h2>
    <div class="question" data-in translate="no">${esc(c.reflectionPrompt)}</div>
    <form class="tg-form" data-in><div class="field"><label for="reflection">Mi reflexión</label><textarea id="reflection" name="reflection" required placeholder="Me di cuenta porque…"></textarea></div>
    <button class="btn primary tg-cta">Enviar a mi docente${ico('arrow')}</button></form>`);
  const { reflection } = await ctx.form(sc.querySelector('form'));
  await ctx.finish({ marked: suspects, notes, found, errors, coach: coach.message, reflection });
}

function verdict(s, i, wasMarked, note, ico, esc) {
  const kind = s.isError ? (wasMarked ? 'found' : 'missed') : (wasMarked ? 'false-alarm' : 'ok');
  const label = { found: `${ico('check')}¡Pista encontrada!`, missed: `${ico('eye')}Se te escapó`, 'false-alarm': `${ico('info')}Esta era correcta`, ok: `${ico('check')}Correcta` }[kind];
  const detail = s.isError || wasMarked
    ? `<p>${esc(s.explanation)}</p>${s.isError ? `<p class="tg-fix">${ico('edit')}<span>${esc(s.correction)}</span></p>` : ''}<small>${ico('book')}${esc(s.source)}${note && s.isError ? ` · Tú dijiste: ${esc(ERROR_LABELS[note.type])}${note.type === s.errorType ? ' ✓' : ''}` : ''}</small>`
    : '';
  return `<li class="${kind}" translate="no"><span class="tg-verdict-tag">${label}</span><strong>“${esc(s.text)}”</strong>${detail}</li>`;
}

function review(c, edit) {
  return `<p class="tg-review-intro">${edit('caseIntro', c.caseIntro)}</p><ol class="tg-review-list">${c.sentences.map((s, i) => `<li class="${s.isError ? 'is-error' : ''}">
    <span class="pill ${s.isError ? 'cream' : 'green'}">${s.isError ? `Error sembrado · ${ERROR_LABELS[s.errorType] || s.errorType}` : 'Correcta'}</span>
    ${edit(`sentences.${i}.text`, s.text, 'strong')}${s.isError ? edit(`sentences.${i}.explanation`, s.explanation, 'small') : ''}</li>`).join('')}</ol>
    <div class="tg-review-q">${edit('reflectionPrompt', c.reflectionPrompt)}</div>`;
}

function summary(a, c, { ico, esc }) {
  const marked = a.marked || [];
  return `<div class="work-stat"><b>${a.found ?? 0}/${a.errors ?? 0}</b> errores encontrados</div>
    <h3>${ico('search')} Sus sospechas</h3><ol class="work-list">${marked.map(i => {
      const s = c.sentences[i] || {}, n = a.notes?.[i] || {};
      return `<li class="${s.isError ? 'ok' : 'off'}"><strong translate="no">“${esc(s.text)}”</strong><span class="pill ${s.isError ? 'green' : 'cream'}">${s.isError ? 'Era un error' : 'Era correcta'}</span>
        <p translate="no">${esc(ERROR_LABELS[n.type] || n.type)}${n.type === s.errorType ? ' ✓' : ''} · ${esc(n.why)}</p></li>`;
    }).join('')}</ol>
    ${a.coach ? `<h3>${ico('spark')} Comentario de la IA</h3><p translate="no">${esc(a.coach)}</p>` : ''}
    <h3>${ico('bulb')} Su reflexión</h3><p class="work-quote" translate="no">${esc(a.reflection)}</p>`;
}

window.TutokiGames.register('detective', { play, review, summary });
})();
