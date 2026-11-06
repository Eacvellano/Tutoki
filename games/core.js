/* Tutoki game engine: AI client and the context every activity receives. */
(() => {
'use strict';
const T = () => window.Tutoki;
const games = {};
const { reduced, wait, type, typeMany, lottie, confetti, sfx, countdown } = window.TutokiFx;
const ico = n => T().ico(n);
const esc = v => T().esc(v);

/* ---------- AI client ---------- */
let status;
async function aiStatus() {
  if (status) return status;
  try { const r = await fetch('/api/status'); status = r.ok ? await r.json() : { ai: false }; }
  catch { status = { ai: false }; }
  return status;
}
async function ai(task, payload) {
  const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task, ...payload }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'La IA no respondió.'), { code: data.code });
  return data;
}

/* ---------- Shared UI pieces ---------- */
const aiBubble = (label = 'Asistente de IA', extra = '') => `<div class="tg-ai ${extra}" data-in><div class="tg-ai-head"><span class="tg-ai-avatar" data-lottie="spark" data-loop></span><strong>${label}</strong><span class="tg-ai-tag">${ico('info')}Puede equivocarse</span></div><div class="tg-ai-body" translate="no"></div></div>`;
const thinking = (text = 'Pensando…') => `<div class="tg-thinking" role="status"><span data-lottie="thinking" data-loop></span>${text}</div>`;
// Under-13 primary students never chat freely with the AI (UNESCO guidance in the project brief).
const liveAllowed = g => g?.level === 'Secundaria' || parseInt(g?.grade, 10) >= 4;
// Offline guard for demo mode: too few real words means we should not pretend we understood.
const seemsEmpty = text => { const words = String(text).toLowerCase().match(/[a-záéíóúñü]{2,}/g) || []; return words.length < 3 || new Set(words).size < 2; };
const CONFUSED = 'No logro entender tu idea. ¿Puedes explicarla con una razón concreta relacionada con el tema?';
const confused = fallback => ({ ...fallback, onTopic: false, offline: true, reply: CONFUSED, followUp: CONFUSED, noticed: '', reaction: CONFUSED, question: '', message: CONFUSED });

function makeCtx(activity, root, meta, opts) {
  const group = activity.group || {};
  const answers = {};
  const body = root.querySelector('.tg-body');
  const bar = root.querySelector('.tg-progress span');
  const ctx = {
    id: activity.type, activity, meta, root, answers, content: activity.content, classroom: Boolean(opts.classroom), liveAI: liveAllowed(group),
    ico, esc, type, typeMany, wait, sfx, confetti, aiBubble, thinking, art: T().art, user: T().userText, toast: T().toast, seemsEmpty,
    progress: f => { bar.style.width = `${Math.round(f * 100)}%`; },
    scene(html) {
      const next = document.createElement('div');
      next.className = 'tg-scene';
      next.innerHTML = html;
      body.replaceChildren(next);
      next.querySelectorAll('[data-in]').forEach((el, i) => el.style.setProperty('--i', i));
      next.querySelectorAll('[data-lottie]').forEach(lottie);
      root.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
      return next;
    },
    lotties: scope => scope.querySelectorAll('[data-lottie]').forEach(lottie),
    // Resolves with the first enabled element matching `sel` that is clicked inside `scope`.
    click: (scope, sel) => new Promise(resolve => scope.addEventListener('click', function handler(e) {
      const el = e.target.closest(sel);
      if (!el || !scope.contains(el) || el.disabled) return;
      scope.removeEventListener('click', handler); sfx('tap'); resolve(el);
    })),
    form: form => new Promise(resolve => form.addEventListener('submit', function handler(e) {
      e.preventDefault();
      form.querySelectorAll('textarea[required]').forEach(t => t.setCustomValidity(seemsEmpty(t.value) ? 'Escribe una idea completa, con al menos unas palabras.' : ''));
      if (!form.checkValidity()) return form.reportValidity();
      form.removeEventListener('submit', handler); sfx('tap'); resolve(Object.fromEntries(new FormData(form)));
    })),
    // Live AI turn that answers what the student actually wrote. Falls back gracefully so the activity never stalls.
    async ask(task, payload, fallback, studentText = '') {
      const offline = !ctx.liveAI || !(await aiStatus()).ai;
      if (!offline) {
        try { return { onTopic: true, ...(await ai(task, { level: group.level, grade: group.grade, ...payload })) }; }
        catch (e) { T().toast(`${e.message} Seguimos sin IA en vivo.`); }
      } else await wait(1000);
      return seemsEmpty(studentText) ? confused(fallback) : { onTopic: true, ...fallback, offline: true };
    },
    async intro({ kicker, title, desc, steps, cta }) {
      ctx.progress(0);
      const sc = ctx.scene(`<div class="tg-intro"><div class="tg-intro-art" data-in>${T().art(meta.pose, 'float')}</div>
        <span class="tg-kicker" data-in>${kicker}</span><h1 data-in translate="no">${esc(title)}</h1><p class="tg-lead" translate="no"></p>
        <ol class="tg-steps">${steps.map(([icon, label]) => `<li data-in>${ico(icon)}<span>${label}</span></li>`).join('')}</ol>
        <button class="btn primary tg-cta" data-tg="start" data-in>${cta}${ico('arrow')}</button>
        <p class="tg-ethic" data-in>${ico('shield')}${ctx.classroom ? 'Modo aula: respondan juntos y escriban la idea del grupo.' : 'Aprobada por tu docente. Lo importante es cómo piensas.'}</p></div>`);
      type(sc.querySelector('.tg-lead'), desc, 70);
      await ctx.click(sc, '[data-tg="start"]');
      await countdown(root);
    },
    async finish(extra = {}) {
      Object.assign(answers, extra);
      ctx.progress(1);
      const sc = ctx.scene(`<div class="tg-done">${thinking(ctx.classroom ? 'Guardando el trabajo de la clase…' : 'Enviando a tu docente…')}</div>`);
      for (;;) {
        try { await T().api('POST', `/api/activities/${activity.id}/submissions`, { answers }); break; }
        catch (e) {
          sc.innerHTML = `<div class="tg-done">${T().art('think')}<h2>No se pudo enviar</h2><p>${esc(e.message)}</p><button class="btn primary tg-cta" data-tg="retry">${ico('refresh')}Reintentar</button></div>`;
          await ctx.click(sc, '[data-tg="retry"]');
          sc.innerHTML = `<div class="tg-done">${thinking('Enviando…')}</div>`;
          ctx.lotties(sc);
        }
      }
      const links = ctx.classroom
        ? `<a class="btn primary" href="#/docente/actividad/${activity.id}">Ver entregas${ico('arrow')}</a><a class="btn secondary" href="#/docente/grupo/${group.id}">Volver al grupo${ico('users')}</a>`
        : `<a class="btn primary" href="#/estudiante/avance">Ver mi recorrido${ico('arrow')}</a><a class="btn secondary" href="#/estudiante/retos">Explorar otro reto${ico('target')}</a>`;
      ctx.scene(`<div class="tg-done"><div class="tg-done-anim" data-lottie="success"></div><span class="pill green" data-in>${ico('check')}${ctx.classroom ? 'Guardado para el grupo' : 'Enviado a tu docente'}</span>
        <h1 data-in>¡Tu idea ha crecido!</h1><p data-in>${ctx.classroom ? 'El trabajo de la clase quedó en las entregas de esta actividad.' : 'Tu docente revisará cómo pensaste, no solo el resultado.'}</p>
        <div class="tg-done-actions" data-in>${links}</div></div>`);
      sfx('fanfare'); confetti(true);
    },
  };
  return ctx;
}

function mount(activity, root, opts = {}) {
  const meta = T().typeOf(activity.type);
  if (!games[activity.type] || !activity.content) { root.innerHTML = '<p>No pudimos abrir este reto.</p>'; return; }
  root.className = `tg tg-${activity.type}`;
  const exit = opts.classroom ? `/docente/actividad/${activity.id}` : '/estudiante/retos';
  root.innerHTML = `<header class="tg-top"><a class="circle-button" href="#${exit}" aria-label="Salir del reto">${ico('close')}</a>
    <div class="tg-progress" aria-hidden="true"><span></span></div><span class="tg-chip">${ico(meta.icon)}${meta.name}</span></header><div class="tg-body"></div>`;
  games[activity.type].play(makeCtx(activity, root, meta, opts)).catch(e => { console.error(e); T().toast('Algo salió mal en este reto. Intenta de nuevo.'); });
}

// Teacher/student read-only view of a submission; each game knows how to present its own answers.
function summary(type, answers, content) {
  const game = games[type];
  if (game?.summary && content) { try { return game.summary(answers || {}, content, { ico, esc }); } catch (e) { console.error(e); } }
  return `<pre class="work-raw" translate="no">${esc(JSON.stringify(answers, null, 2))}</pre>`;
}

window.TutokiGames = { games, register: (id, game) => { games[id] = game; }, mount, summary, ai, aiStatus, type, wait, sfx, confetti, lottie, aiBubble, thinking };
})();
