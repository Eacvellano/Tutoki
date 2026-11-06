/* Defiéndelo: solve a short challenge, then defend it in a live interview with Socratic follow-ups. */
(() => {
'use strict';
const LEVELS = ['Todavía no', 'En camino', '¡Lo logré!'];

// Voice dictation into a textarea (Web Speech API). Hidden where the browser lacks it.
function dictation(ctx, scope) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const button = scope.querySelector('.tg-mic');
  const area = scope.querySelector('textarea');
  if (!SR) { button.hidden = true; return () => {}; }
  let rec = null;
  const stop = () => rec?.stop();
  button.addEventListener('click', () => {
    if (rec) return stop();
    rec = new SR();
    rec.lang = document.documentElement.lang === 'en' ? 'en-US' : 'es-MX';
    rec.interimResults = true; rec.continuous = true;
    const before = area.value ? `${area.value} ` : '';
    rec.onresult = e => { area.value = before + [...e.results].map(r => r[0].transcript).join(''); };
    rec.onerror = () => ctx.toast('No pude usar el micrófono. Puedes escribir tu respuesta.');
    rec.onend = () => { rec = null; button.classList.remove('rec'); button.setAttribute('aria-pressed', 'false'); };
    rec.start(); button.classList.add('rec'); button.setAttribute('aria-pressed', 'true');
  });
  return stop;
}

const answerForm = (ctx, label, placeholder, cta) => `<form class="tg-form" data-in><div class="field"><label for="answer">${label}</label>
  <div class="tg-voice"><textarea id="answer" name="answer" required placeholder="${placeholder}"></textarea>
  <button type="button" class="tg-mic" aria-pressed="false" aria-label="Dictar con mi voz">${ctx.ico('mic')}</button></div></div>
  <button class="btn primary tg-cta">${cta}${ctx.ico('arrow')}</button></form>`;

async function ask(ctx, scope, label, placeholder, cta) {
  scope.insertAdjacentHTML('beforeend', answerForm(ctx, label, placeholder, cta));
  const form = scope.querySelector('form');
  form.style.setProperty('--i', 0);
  const stop = dictation(ctx, form);
  form.querySelector('textarea').focus({ preventScroll: true });
  const { answer } = await ctx.form(form);
  stop();
  return answer;
}

async function play(ctx) {
  const { content: c, ico, esc } = ctx;
  await ctx.intro({ kicker: `${ico('mic')}Entrevista en vivo`, title: c.title, desc: 'Primero resuelve un reto. Después, defiende tu respuesta como en una entrevista.', cta: 'Entrar al estudio',
    steps: [['bulb', 'Resuelve el reto'], ['mic', 'Defiende tu idea'], ['check', 'Evalúa tu defensa']] });

  // 1. The challenge the student will later defend.
  ctx.progress(0.12);
  let sc = ctx.scene(`<span class="tg-kicker" data-in>${ico('target')}Tu reto</span><div class="question" data-in translate="no"></div>
    <details class="tg-hint" data-in><summary>${ico('bulb')}Necesito una pista</summary><p translate="no">${esc(c.hint)}</p></details>`);
  await ctx.type(sc.querySelector('.question'), c.challenge, 55);
  const solution = await ask(ctx, sc, 'Mi respuesta', 'Yo haría… porque…', 'Esta es mi respuesta');

  // 2. Interview: question, answer, one tailored follow-up.
  const transcript = [];
  for (const [n, q] of c.questions.entries()) {
    ctx.progress(0.25 + n * 0.2);
    sc = ctx.scene(`<div class="tg-studio" data-in><span class="tg-live">EN VIVO</span><span>Pregunta ${n + 1} de ${c.questions.length}</span></div>
      <div class="tg-interviewer" data-in>${ctx.art('speak')}<div class="tg-speech" translate="no"></div></div>`);
    await ctx.type(sc.querySelector('.tg-speech'), q.question, 50);
    let answer, reply;
    // One retry if the answer made no sense; the AI says so instead of pretending.
    for (let attempt = 0; ; attempt++) {
      answer = await ask(ctx, sc, attempt ? 'Inténtalo de nuevo' : 'Mi respuesta', 'Explica tu razonamiento…', 'Responder');
      sc.querySelector('form').remove();
      sc.insertAdjacentHTML('beforeend', `<div class="tg-mine" data-in translate="no">${esc(answer)}</div>${ctx.thinking('Toki escucha tu respuesta…')}`);
      ctx.lotties(sc);
      const quote = answer.length > 70 ? `${answer.slice(0, 70)}…` : answer;
      reply = await ctx.ask('followup', { challenge: c.challenge, solution, question: q.question, answer }, { noticed: `Dices que “${quote}”.`, followUp: q.followUp }, answer);
      sc.querySelector('.tg-thinking').remove();
      sc.insertAdjacentHTML('beforeend', ctx.aiBubble(reply.onTopic ? 'Toki pregunta otra vez' : 'Toki no entendió'));
      ctx.lotties(sc);
      await ctx.type([...sc.querySelectorAll('.tg-ai-body')].pop(), `${reply.noticed || ''} ${reply.followUp}`.trim(), 50);
      if (reply.onTopic || attempt >= 1) break;
    }
    const deeper = await ask(ctx, sc, 'Mi respuesta', 'Lo precisaría así…', n + 1 < c.questions.length ? 'Siguiente pregunta' : 'Terminar entrevista');
    transcript.push({ question: q.question, answer, followUp: reply.followUp, deeper });
  }

  // 3. Self-assessment (self-regulation), never an automatic grade.
  ctx.progress(0.88);
  sc = ctx.scene(`<h2 data-in>¿Cómo estuvo tu defensa?</h2><p data-in>Sé honesto: esto te ayuda a ti y a tu docente.</p>
    <form class="tg-form">${c.criteria.map((k, i) => `<fieldset class="tg-rate" data-in><legend translate="no">${esc(k)}</legend>
    ${LEVELS.map((l, v) => `<label><input type="radio" name="c${i}" value="${l}" required><span>${'★'.repeat(v + 1)}<small>${l}</small></span></label>`).join('')}</fieldset>`).join('')}
    <button class="btn primary tg-cta" data-in>Enviar a mi docente${ico('arrow')}</button></form>`);
  const rating = await ctx.form(sc.querySelector('form'));
  await ctx.finish({ solution, transcript, selfAssessment: c.criteria.map((k, i) => ({ criterion: k, level: rating[`c${i}`] })) });
}

function review(c, edit) {
  return `<div class="question">${edit('challenge', c.challenge)}</div><p class="tg-review-intro">Pista: ${edit('hint', c.hint)}</p>
    <ol class="tg-review-list">${c.questions.map((q, i) => `<li>${edit(`questions.${i}.question`, q.question, 'strong')}<small>Repregunta: ${edit(`questions.${i}.followUp`, q.followUp)}</small></li>`).join('')}</ol>`;
}

function summary(a, c, { ico, esc }) {
  return `<div class="question" translate="no">${esc(c.challenge)}</div><h3>${ico('target')} Su respuesta al reto</h3><p class="work-quote" translate="no">${esc(a.solution)}</p>
    <h3>${ico('mic')} La entrevista</h3><ol class="work-list">${(a.transcript || []).map(t => `<li translate="no"><strong>${esc(t.question)}</strong><p>${esc(t.answer)}</p>
      <p class="muted">Repregunta: ${esc(t.followUp)}</p><p>${esc(t.deeper)}</p></li>`).join('')}</ol>
    <h3>${ico('check')} Su autoevaluación</h3><div class="rubric">${(a.selfAssessment || []).map(s => `<span translate="no">${esc(s.criterion)}: <strong>${esc(s.level)}</strong></span>`).join('')}</div>`;
}

window.TutokiGames.register('defiendelo', { play, review, summary });
})();
