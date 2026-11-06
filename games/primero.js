/* Primero tú: seal a prediction, flip evidence cards, revise your idea, and only then judge what an AI said. */
(() => {
'use strict';
const SHAPES = ['▲', '◆', '●', '★'];
const CONFIDENCE = ['Es una corazonada', 'Algo seguro', 'Bastante seguro', 'Muy seguro'];

async function play(ctx) {
  const { content: c, ico, esc } = ctx;
  await ctx.intro({ kicker: `${ico('bulb')}Primero tú, después la IA`, title: c.title, desc: 'Antes de ver cualquier respuesta, apuesta por tu propia idea.', cta: 'Hacer mi predicción',
    steps: [['bulb', 'Predice'], ['eye', 'Descubre evidencia'], ['spark', 'Juzga a la IA']] });

  // 1. Prediction, with Kahoot-style answer tiles and a confidence meter.
  ctx.progress(0.15);
  let sc = ctx.scene(`<span class="tg-kicker" data-in>${ico('bulb')}Tu predicción</span><div class="question tg-big-q" data-in translate="no"></div>
    <form class="tg-form"><div class="tg-tiles" role="radiogroup" aria-label="Predicciones">${c.options.map((o, i) => `<label class="tg-tile t${i}" data-in><input type="radio" name="prediction" value="${esc(o)}" required><span class="tg-shape" aria-hidden="true">${SHAPES[i]}</span><span translate="no">${esc(o)}</span></label>`).join('')}
    <label class="tg-tile t3" data-in><input type="radio" name="prediction" value="Tengo otra idea"><span class="tg-shape" aria-hidden="true">${SHAPES[3]}</span><span>Tengo otra idea</span></label></div>
    <div class="field" data-in><label for="why">¿Por qué lo piensas?</label><textarea id="why" name="why" required placeholder="Creo que… porque…"></textarea></div>
    <div class="field tg-confidence" data-in><label for="confidence">¿Qué tan seguro estás?</label><input id="confidence" name="confidence" type="range" min="0" max="3" value="1"><output>${CONFIDENCE[1]}</output></div>
    <button class="btn primary tg-cta" data-in>${ico('lock')}Sellar mi predicción</button></form>`);
  ctx.type(sc.querySelector('.tg-big-q'), c.question, 60);
  const range = sc.querySelector('#confidence');
  range.addEventListener('input', () => { sc.querySelector('output').textContent = CONFIDENCE[range.value]; });
  const prediction = await ctx.form(sc.querySelector('form'));
  prediction.confidence = CONFIDENCE[prediction.confidence];

  // Sealing moment: the idea is locked before any evidence appears.
  sc = ctx.scene(`<div class="tg-seal"><div class="tg-envelope">${ico('lock')}</div><h2>Predicción sellada</h2><p>Ya no puedes cambiarla. Ahora busquemos evidencia.</p></div>`);
  ctx.sfx('good');
  await ctx.wait(1500);

  // 2. Evidence cards, flipped one at a time.
  ctx.progress(0.4);
  sc = ctx.scene(`<div class="tg-row" data-in><h2>Descubre la evidencia</h2><span class="tg-counter">${ico('eye')}<b>0</b> / ${c.evidence.length}</span></div>
    <p class="tg-instruction" data-in>${ico('info')}<span>Toca cada carta para voltearla. Léela con calma.</span></p>
    <div class="tg-cards">${c.evidence.map((e, i) => `<button class="tg-flip" data-in data-tgv="${i}" aria-label="Voltear evidencia ${i + 1}"><span class="tg-flip-inner">
      <span class="tg-face front"><b>${i + 1}</b>Evidencia</span>
      <span class="tg-face back" translate="no"><strong>${esc(e.title)}</strong>${esc(e.text)}<small>${ico('book')}${esc(e.source)}</small></span></span></button>`).join('')}</div>
    <button class="btn primary tg-cta" data-tg="next" disabled>Comparar con mi idea${ico('arrow')}</button>`);
  let flipped = 0;
  sc.querySelector('.tg-cards').addEventListener('click', e => {
    const card = e.target.closest('.tg-flip');
    if (!card || card.classList.contains('open')) return;
    card.classList.add('open'); card.setAttribute('aria-label', `Evidencia ${Number(card.dataset.tgv) + 1} volteada`);
    ctx.sfx('reveal');
    sc.querySelector('.tg-counter b').textContent = ++flipped;
    sc.querySelector('[data-tg="next"]').disabled = flipped < c.evidence.length;
  });
  await ctx.click(sc, '[data-tg="next"]');

  // 3. Before / now.
  ctx.progress(0.6);
  sc = ctx.scene(`<h2 data-in>¿Tu idea cambió?</h2><div class="tg-compare"><div class="tg-before" data-in><span class="tg-kicker">${ico('lock')}Antes pensaba</span>
    <strong translate="no">${esc(prediction.prediction)}</strong><p translate="no">${esc(prediction.why)}</p><small>${esc(prediction.confidence)}</small></div>
    <form class="tg-form tg-now" data-in><span class="tg-kicker">${ico('bulb')}Ahora pienso</span>
    <fieldset class="tg-chips"><legend>Mi idea…</legend>${['Se confirmó', 'Cambió en parte', 'Cambió por completo'].map(v => `<label class="tg-chip-option"><input type="radio" name="shift" value="${v}" required><span>${v}</span></label>`).join('')}</fieldset>
    <div class="field"><label for="now">Ahora pienso que…</label><textarea id="now" name="now" required placeholder="La evidencia me mostró que…"></textarea></div>
    <button class="btn primary tg-cta">Ver qué dijo la IA${ico('arrow')}</button></form></div>`);
  const now = await ctx.form(sc.querySelector('form'));

  // 4. Only after the student's own effort does the AI speak — and it can be wrong.
  ctx.progress(0.8);
  sc = ctx.scene(`<span class="tg-kicker" data-in>${ico('spark')}Ahora sí: le preguntamos a una IA</span>${ctx.aiBubble()}
    <form class="tg-form" data-in hidden><div class="question" translate="no">${esc(c.aiQuestion)}</div>
    <fieldset class="tg-chips"><legend>La respuesta de la IA…</legend>${['Coincide con la evidencia', 'Le falta algo', 'Se equivoca'].map(v => `<label class="tg-chip-option"><input type="radio" name="judgement" value="${v}" required><span>${v}</span></label>`).join('')}</fieldset>
    <div class="field"><label for="reply">¿Qué evidencia usarías para responderle?</label><textarea id="reply" name="reply" required placeholder="Le diría que…"></textarea></div>
    <button class="btn primary tg-cta">Responderle a la IA${ico('chat')}</button></form>`);
  await ctx.type(sc.querySelector('.tg-ai-body'), c.aiAnswer, 45);
  const form = sc.querySelector('form');
  form.hidden = false; ctx.sfx('reveal');
  const verdict = await ctx.form(form);

  // 5. The AI answers the student's specific critique (concedes or asks for evidence) — a real exchange, not a script.
  const context = `Pregunta: ${c.question}\nRespuesta de la IA: ${c.aiAnswer}\nEvidencias: ${c.evidence.map(e => e.text).join(' | ')}`;
  let reply = verdict.reply, aiReply, active = form;
  for (let attempt = 0; ; attempt++) {
    active.outerHTML = `<div class="tg-mine" data-in translate="no">${esc(`${verdict.judgement}. ${reply}`)}</div>${ctx.thinking('La IA lee tu respuesta…')}`;
    ctx.lotties(sc);
    aiReply = await ctx.ask('coach', { kind: 'primero', context, studentText: `Juicio: ${verdict.judgement}. Argumento: ${reply}` },
      { message: 'Gracias por revisar mi respuesta con evidencia. Tienes razón en buscar lo que dicen las observaciones: una IA puede sonar segura y aun así equivocarse.' }, reply);
    sc.querySelector('.tg-thinking').remove();
    sc.insertAdjacentHTML('beforeend', ctx.aiBubble('La IA responde'));
    ctx.lotties(sc);
    await ctx.type([...sc.querySelectorAll('.tg-ai-body')].pop(), aiReply.message, 45);
    if (aiReply.onTopic || attempt >= 1) break;
    sc.insertAdjacentHTML('beforeend', `<form class="tg-form" data-in><div class="field"><label for="retry">Explícale tu idea otra vez</label><textarea id="retry" name="reply" required></textarea></div><button class="btn primary tg-cta">Responder${ico('chat')}</button></form>`);
    active = sc.querySelector('form');
    reply = (await ctx.form(active)).reply;
  }
  sc.insertAdjacentHTML('beforeend', `<button class="btn primary tg-cta" data-tg="send" data-in>Enviar a mi docente${ico('arrow')}</button>`);
  await ctx.click(sc, '[data-tg="send"]');
  await ctx.finish({ prediction, ...now, judgement: verdict.judgement, reply, aiReply: aiReply.message });
}

function review(c, edit) {
  return `<div class="question">${edit('question', c.question)}</div>
    <p><strong>Predicciones:</strong></p><ul class="tg-review-list">${c.options.map((o, i) => `<li>${edit(`options.${i}`, o)}</li>`).join('')}</ul>
    <p><strong>Evidencias que se revelan:</strong></p><ol class="tg-review-list">${c.evidence.map((e, i) => `<li>${edit(`evidence.${i}.title`, e.title, 'strong')}${edit(`evidence.${i}.text`, e.text, 'small')}</li>`).join('')}</ol>
    <p><strong>Respuesta de la IA para juzgar:</strong></p><div class="tg-review-q">${edit('aiAnswer', c.aiAnswer)}</div>`;
}

function summary(a, c, { ico, esc }) {
  const p = a.prediction || {};
  return `<div class="question" translate="no">${esc(c.question)}</div>
    <div class="work-compare"><div><h3>${ico('lock')} Antes pensaba</h3><p translate="no"><strong>${esc(p.prediction)}</strong> · ${esc(p.confidence)}</p><p class="work-quote" translate="no">${esc(p.why)}</p></div>
    <div><h3>${ico('bulb')} Ahora piensa</h3><p><span class="pill">${esc(a.shift)}</span></p><p class="work-quote" translate="no">${esc(a.now)}</p></div></div>
    <h3>${ico('spark')} Su juicio sobre la IA</h3><p translate="no"><span class="pill cream">${esc(a.judgement)}</span> ${esc(a.reply)}</p>
    ${a.aiReply ? `<p class="muted" translate="no">IA: ${esc(a.aiReply)}</p>` : ''}`;
}

window.TutokiGames.register('primero', { play, review, summary });
})();
