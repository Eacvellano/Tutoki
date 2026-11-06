/* Duelo: three rounds against an AI that defends the other side with a seeded reasoning flaw to catch. */
(() => {
'use strict';
const FLAWS = {
  'sin-evidencia': ['No da evidencia', 'Afirma algo sin datos ni ejemplos que lo respalden.'],
  generaliza: ['Generaliza de más', 'Usa “todos”, “siempre” o “nunca” sin pruebas suficientes.'],
  'ataque-personal': ['Ataca a la persona', 'Critica a quien opina en lugar de discutir la idea.'],
  'dato-dudoso': ['Usa un dato dudoso', 'Da una cifra o hecho exagerado o sin fuente.'],
  'causa-confundida': ['Confunde causa y efecto', 'Supone que una cosa causa otra solo porque ocurren juntas.'],
};
const ROUNDS = 3;

async function play(ctx) {
  const { content: c, ico, esc } = ctx;
  await ctx.intro({ kicker: `${ico('chat')}Secundaria · 13+`, title: c.title, desc: c.motion, cta: 'Entrar a la arena',
    steps: [['flag', 'Elige postura'], ['chat', '3 rondas contra la IA'], ['search', 'Caza sus fallas'], ['bulb', 'Reconsidera']] });

  // 1. Pick a side; the AI takes the other one.
  ctx.progress(0.1);
  let sc = ctx.scene(`<div class="question center" data-in translate="no">${esc(c.motion)}</div><div class="tg-versus">
    ${c.positions.map((p, i) => `<button class="tg-side s${i}" data-in data-tgv="${i}"><small>Postura ${i ? 'B' : 'A'}</small><strong translate="no">${esc(p)}</strong></button>`).join('<span class="tg-vs" aria-hidden="true">VS</span>')}</div>
    <p class="tg-instruction" data-in>${ico('info')}<span>Elige la postura que defenderás. La IA defenderá la otra.</span></p>`);
  const side = Number((await ctx.click(sc, '.tg-side')).dataset.tgv);
  const aiSide = 1 - side;
  const fallbacks = aiSide === 0 ? c.counterA : c.counterB;
  sc.querySelector('.tg-versus').classList.add(`picked-${side}`);
  ctx.sfx('go');
  await ctx.wait(900);

  // 2. Rounds.
  const score = { evidence: 0, flaws: 0 };
  const history = [], rounds = [];
  const hand = c.evidenceCards.map((card, i) => ({ ...card, i }));
  for (let r = 0; r < ROUNDS; r++) {
    ctx.progress(0.2 + r * 0.2);
    sc = ctx.scene(`${board(c, side, score, r, ico, esc)}
      <form class="tg-form" data-in><div class="field"><label for="arg">Tu argumento${r ? ' (responde a la IA)' : ''}</label><textarea id="arg" name="argument" required placeholder="Pienso que… porque…"></textarea></div>
      <fieldset class="tg-hand"><legend>${ico('book')}Juega una carta de evidencia (opcional)</legend>${hand.filter(h => !h.used).map(h => `<label class="tg-card"><input type="radio" name="card" value="${h.i}"><span translate="no">${esc(h.text)}<small>${esc(h.source)}</small></span></label>`).join('')}</fieldset>
      <button class="btn primary tg-cta">${ico('chat')}Lanzar argumento</button></form>`);
    const move = await ctx.form(sc.querySelector('form'));
    const card = move.card === undefined ? null : hand[Number(move.card)];
    if (card) { card.used = true; score.evidence++; }
    const argument = card ? `${move.argument} (Evidencia: ${card.text})` : move.argument;
    sc.querySelector('form').outerHTML = `<div class="tg-mine tg-shot" translate="no">${esc(move.argument)}${card ? `<span class="tg-played">${ico('book')}${esc(card.text)}</span>` : ''}</div>${ctx.thinking('La IA prepara su contraataque…')}`;
    ctx.lotties(sc);
    const ai = await ctx.ask('duel', { motion: c.motion, aiSide: c.positions[aiSide], studentSide: c.positions[side], history, argument }, fallbacks[r], move.argument);
    const reply = ai.reply || ai.text;
    sc.querySelector('.tg-thinking').remove();
    if (!ai.onTopic) {
      // Nonsense does not earn a round: the rival asks for a real argument and the round restarts.
      if (card) { card.used = false; score.evidence--; }
      sc.insertAdjacentHTML('beforeend', `${ctx.aiBubble('IA contrincante', 'tg-ai-rival')}<button class="btn primary tg-cta" data-tg="again" hidden>${ico('edit')}Reformular mi argumento</button>`);
      ctx.lotties(sc);
      await ctx.type(sc.querySelector('.tg-ai-body'), reply, 45);
      sc.querySelector('[data-tg="again"]').hidden = false;
      await ctx.click(sc, '[data-tg="again"]');
      r--;
      continue;
    }
    history.push({ who: 'student', text: argument }, { who: 'ai', text: reply });
    sc.insertAdjacentHTML('beforeend', `${ctx.aiBubble('IA contrincante', 'tg-ai-rival')}<form class="tg-form" data-in hidden>
      <fieldset class="tg-chips"><legend>${ico('search')}¿Qué falla tiene su argumento?</legend>${Object.entries(FLAWS).map(([k, [label]]) => `<label class="tg-chip-option"><input type="radio" name="flaw" value="${k}" required><span>${label}</span></label>`).join('')}</fieldset>
      <button class="btn primary tg-cta">Señalar la falla${ico('flag')}</button></form>`);
    ctx.lotties(sc);
    await ctx.type(sc.querySelector('.tg-ai-body'), reply, 45);
    const flawForm = sc.querySelector('form');
    flawForm.hidden = false;
    const { flaw } = await ctx.form(flawForm);
    const hit = flaw === ai.flaw;
    if (hit) { score.flaws++; ctx.sfx('good'); ctx.confetti(); } else ctx.sfx('bad');
    const [label, why] = FLAWS[ai.flaw] || ['Falla sembrada', ''];
    flawForm.outerHTML = `<div class="tg-flaw ${hit ? 'hit' : 'miss'}" role="status"><strong>${hit ? '¡Falla detectada!' : `La falla sembrada era: ${label}`}</strong><p>${why}</p>
      <button class="btn primary tg-cta" data-tg="next">${r + 1 < ROUNDS ? 'Siguiente ronda' : 'Ver el balance'}${ico('arrow')}</button></div>`;
    rounds.push({ argument: move.argument, card: card?.text || null, ai: reply, seededFlaw: ai.flaw, studentFlaw: flaw });
    await ctx.click(sc, '[data-tg="next"]');
  }

  // 3. Balance (no winners) + reconsider.
  ctx.progress(0.85);
  sc = ctx.scene(`<h2 data-in>Balance del duelo</h2><div class="tg-stats" data-in><div><b>${score.flaws}/${ROUNDS}</b><span>Fallas detectadas</span></div><div><b>${score.evidence}</b><span>Evidencias usadas</span></div></div>
    <p class="tg-instruction" data-in>${ico('info')}<span>Sin ganadores: importa cómo argumentas y si sabes escuchar a la otra postura.</span></p>
    <form class="tg-form" data-in><fieldset class="tg-chips"><legend>Después del duelo…</legend>${['Mantengo mi postura', 'La ajusto', 'Necesito más evidencia'].map(v => `<label class="tg-chip-option"><input type="radio" name="stance" value="${v}" required><span>${v}</span></label>`).join('')}</fieldset>
    <div class="field"><label for="fair">¿Qué parte de la otra postura vale la pena considerar?</label><textarea id="fair" name="fair" required placeholder="Reconozco que…"></textarea></div>
    <div class="field"><label for="conclusion">Mi conclusión</label><textarea id="conclusion" name="conclusion" required placeholder="Concluyo que… porque…"></textarea></div>
    <button class="btn primary tg-cta">Enviar a mi docente${ico('arrow')}</button></form>`);
  const end = await ctx.form(sc.querySelector('form'));
  await ctx.finish({ side: c.positions[side], rounds, score, ...end });
}

function board(c, side, score, r, ico, esc) {
  return `<div class="tg-scoreboard" data-in><div class="me"><small>Tú</small><strong translate="no">${esc(c.positions[side])}</strong><span>${ico('book')}${score.evidence} · ${ico('search')}${score.flaws}</span></div>
    <span class="tg-round">Ronda ${r + 1}/${ROUNDS}</span><div class="rival"><small>IA</small><strong translate="no">${esc(c.positions[1 - side])}</strong></div></div>`;
}

function review(c, edit) {
  const flaw = k => (FLAWS[k] || [k])[0];
  return `<div class="question">${edit('motion', c.motion)}</div><p><strong>Posturas:</strong> ${edit('positions.0', c.positions[0])} vs ${edit('positions.1', c.positions[1])}</p>
    <p><strong>Argumentos de la IA con falla sembrada:</strong></p><ol class="tg-review-list">${[...c.counterA.map((a, i) => [a, `counterA.${i}`]), ...c.counterB.map((a, i) => [a, `counterB.${i}`])]
      .map(([a, p]) => `<li><span class="pill cream">${flaw(a.flaw)}</span>${edit(`${p}.text`, a.text)}</li>`).join('')}</ol>`;
}

function summary(a, c, { ico, esc }) {
  const flaw = k => (FLAWS[k] || [k || '—'])[0];
  return `<div class="question" translate="no">${esc(c.motion)}</div><p translate="no">Defendió: <strong>${esc(a.side)}</strong></p>
    <div class="work-stat"><b>${a.score?.flaws ?? 0}/${ROUNDS}</b> fallas detectadas · <b>${a.score?.evidence ?? 0}</b> evidencias usadas</div>
    <ol class="work-list">${(a.rounds || []).map(r => `<li translate="no"><strong>${esc(r.argument)}</strong>${r.card ? `<p class="muted">${ico('book')} ${esc(r.card)}</p>` : ''}
      <p class="muted">IA: ${esc(r.ai)}</p><p><span class="pill ${r.seededFlaw === r.studentFlaw ? 'green' : 'cream'}">Señaló: ${flaw(r.studentFlaw)} · Era: ${flaw(r.seededFlaw)}</span></p></li>`).join('')}</ol>
    <h3>${ico('bulb')} Después del duelo</h3><p><span class="pill">${esc(a.stance)}</span></p><p class="work-quote" translate="no">${esc(a.fair)}</p><p class="work-quote" translate="no">${esc(a.conclusion)}</p>`;
}

window.TutokiGames.register('duelo', { play, review, summary });
})();
