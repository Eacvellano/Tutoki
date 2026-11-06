// Run: node tests/e2e/e2e.cjs (needs Chrome; set CHROME=path if it is elsewhere).
// Full product flow in headless Chrome against a real server + fresh database.
const { launch } = require('./cdp.cjs');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const APP = path.join(__dirname, '..', '..');
const PORT = 4410, BASE = `http://127.0.0.1:${PORT}`;
const DB = path.join(require('os').tmpdir(), 'tutoki-e2e.db');
const log = (...a) => console.log('•', ...a);

(async () => {
  for (const f of [DB, `${DB}-wal`, `${DB}-shm`]) fs.rmSync(f, { force: true });
  const server = spawn(process.execPath, [`${APP}/server.cjs`], { env: { ...process.env, TUTOKI_PORT: PORT, TUTOKI_DB: DB, GEMINI_API_KEY: '' } });
  await new Promise(r => server.stdout.on('data', d => String(d).includes('listo') && r()));
  const b = await launch();
  let t, s;
  try {
    t = await b.page();
    await t.goto(BASE);
    await t.run(`localStorage.setItem('tutoki-v2', JSON.stringify({ motion: true, volume: 0 }))`);
    await t.goto(`${BASE}/?fresh=1#/registro`);
    await t.run(`await __t.fill('#name','Ana Prueba'); await __t.fill('#email','ana@test.mx'); await __t.fill('#password','contrasena123');
      document.querySelector('.checkline input').checked = true; await __t.submit('form[data-form=register]'); await __t.wait('.hero')`);
    await t.shot('01-teacher-home-empty'); log('teacher registered');

    const code = await t.run(`location.hash='/docente/grupos/nuevo'; await __t.wait('form[data-form=group]'); await __t.fill('#name','5.º A');
      await __t.submit('form[data-form=group]'); await __t.wait('.invitation .code'); return __t.text('.invitation .code')`);
    await t.shot('02-invitation');
    await t.run(`location.hash='/docente/grupos/nuevo'; await __t.wait('form[data-form=group]'); await __t.fill('#name','2.º B');
      await __t.fill('#level','Secundaria'); await __t.sleep(100); await __t.fill('#grade','2.º'); await __t.submit('form[data-form=group]'); await __t.wait('.invitation .code')`);
    log('two groups created, code', code);

    for (const type of ['detective', 'primero', 'defiendelo', 'comunidad', 'duelo']) {
      await t.run(`location.hash='/docente/crear/1'; await __t.wait('form[data-form=material]'); document.querySelector('#group').selectedIndex = 0;
        await __t.fill('#topic','Las plantas y la luz'); await __t.submit('form[data-form=material]'); await __t.wait('.activity-options');
        await __t.click('[data-type=${type}]'); await __t.sleep(300); await __t.click('[data-action=prepare]'); await __t.wait('.tg-review', 15000)`);
      if (type === 'detective') await t.shot('03-review-draft');
      await t.run(`await __t.click('a[href="#/docente/crear/4"]'); await __t.click('[data-action=publish]'); await __t.wait('#modal[open]'); document.querySelector('#modal').close()`);
      log('published', type);
    }
    await t.run(`location.hash='/docente'; await __t.wait('.group-card')`);
    await t.shot('04-teacher-home-groups');

    s = await b.page();
    await s.goto(BASE);
    await s.run(`localStorage.setItem('tutoki-v2', JSON.stringify({ motion: true, volume: 0 }))`);
    await s.goto(`${BASE}/?fresh=1#/unirse`);
    const pin = await s.run(`await __t.fill('#code','${code.toLowerCase()}'); await __t.fill('#alias','Leo'); await __t.submit('form[data-form=join]');
      await __t.wait('#modal[open] .code'); const pin = __t.text('#modal .code'); await __t.click('#modal [data-action=close-modal]'); return pin`);
    log('student joined, pin', pin);
    const ids = Object.fromEntries((await s.run(`return (await (await fetch('/api/student/activities')).json()).map(a => [a.type, a.id])`)));
    await s.run(`location.hash='/estudiante/retos'; await __t.wait('.game-card')`);
    await s.shot('05-student-retos');

    // Detective
    await s.run(`location.hash='/juego/${ids.detective}'; await __t.click('[data-tg=start]'); await __t.wait('.tg-sentence:not([disabled])');
      await __t.click('.tg-sentence[data-tgv="2"]'); await __t.click('.tg-sentence[data-tgv="4"]')`);
    await s.shot('06-detective-marked');
    await s.run(`await __t.click('[data-tg=check]');
      for (const t of ['generaliza','dato-falso']) { await __t.wait('input[name=type]'); document.querySelector('input[name=type][value='+t+']').click();
        await __t.fill('textarea[name=why]','El experimento del material muestra que la luz cambia cómo crecen'); await __t.submit('.tg-form'); }
      await __t.wait('[data-tg=next]', 15000)`);
    await s.shot('07-detective-reveal');
    await s.run(`await __t.click('[data-tg=next]'); await __t.fill('#reflection','Comparé cada frase con el experimento de las dos plantas'); await __t.submit('.tg-form'); await __t.wait('.tg-done-actions', 8000)`);
    log('detective submitted');

    // Primero tú
    await s.run(`location.hash='/juego/${ids.primero}'; await __t.click('[data-tg=start]'); await __t.wait('.tg-tiles'); document.querySelector('input[name=prediction]').click();
      await __t.fill('#why','Porque sin luz no hay fotosíntesis suficiente'); await __t.submit('.tg-form'); await __t.wait('.tg-flip');
      for (const c of document.querySelectorAll('.tg-flip')) { c.click(); await __t.sleep(50); } await __t.click('[data-tg=next]');
      await __t.wait('input[name=shift]'); document.querySelector('input[name=shift]').click(); await __t.fill('#now','Crece más débil y pálida por menos alimento'); await __t.submit('.tg-now');
      await __t.wait('#reply'); document.querySelector('input[name=judgement][value="Le falta algo"]').click();
      await __t.fill('#reply','La evidencia dice que el tallo sí creció aunque más delgado'); await __t.submit('.tg-form'); await __t.wait('[data-tg=send]', 8000)`);
    await s.shot('08-primero-ai-reply');
    await s.run(`await __t.click('[data-tg=send]'); await __t.wait('.tg-done-actions', 8000)`);
    log('primero submitted');

    // Defiéndelo
    await s.run(`location.hash='/juego/${ids.defiendelo}'; await __t.click('[data-tg=start]'); await __t.wait('#answer');
      await __t.fill('#answer','Pondría una planta al sol y otra a la sombra con la misma agua'); await __t.submit('.tg-form');
      for (let i = 0; i < 6; i++) { await __t.wait('#answer', 8000); await __t.fill('#answer','Así solo cambia la luz y puedo comparar el crecimiento'); await __t.submit('.tg-form'); }
      await __t.wait('input[name=c0]'); for (const n of ['c0','c1','c2']) document.querySelector('input[name='+n+']').click(); await __t.submit('.tg-form'); await __t.wait('.tg-done-actions', 8000)`);
    log('defiendelo submitted');

    // Reto comunidad
    await s.run(`location.hash='/juego/${ids.comunidad}'; await __t.click('[data-tg=start]'); await __t.wait('.tg-problem'); document.querySelector('input[name=problem]').click(); await __t.submit('.tg-form');
      await __t.fill('#idea','Un jardín de plantas locales en las jardineras vacías'); document.querySelectorAll('input[name=resources]')[0].click(); document.querySelectorAll('input[name=allies]')[0].click();
      for (const n of [1,2,3]) await __t.fill('[name=step'+n+']','Paso '+n+' del plan'); await __t.submit('.tg-form'); await __t.click('.tg-person');
      await __t.wait('#adjust', 8000); await __t.fill('#adjust','Haremos un calendario de riego con las familias'); await __t.submit('.tg-form');
      await __t.fill('#success','Contaremos cuántas plantas siguen vivas en un mes'); await __t.submit('.tg-form'); await __t.wait('.tg-done-actions', 8000)`);
    log('comunidad submitted');

    await s.goto(`${BASE}/?ai=sim#/estudiante/retos`);
    // Duelo with a simulated live AI: first reply says it did not understand, so the round must not advance.
    await s.run(`window.__aiCalls = 0; const real = window.fetch; window.fetch = async (url, init) => {
        if (url === '/api/status') return new Response(JSON.stringify({ ai: true }));
        if (url === '/api/ai') { window.__aiCalls++; const first = window.__aiCalls === 1;
          return new Response(JSON.stringify(first ? { onTopic: false, reply: 'No entendí tu argumento. ¿Puedes explicarlo?', flaw: 'generaliza' } : { onTopic: true, reply: 'Dices que el jardín da sombra, pero todos los jardines siempre fallan.', flaw: 'generaliza' })); }
        return real(url, init); };
      location.hash='/juego/${ids.duelo}'; await __t.click('[data-tg=start]'); await __t.click('.tg-side.s0'); await __t.wait('#arg');
      await __t.fill('#arg','perro nube casa azul'); await __t.submit('.tg-form'); await __t.wait('[data-tg=again]', 8000)`);
    await s.shot('09-duel-not-understood');
    const roundAfterNonsense = await s.run(`await __t.click('[data-tg=again]'); await __t.wait('#arg'); return __t.text('.tg-round')`);
    if (roundAfterNonsense !== 'Ronda 1/3') throw new Error(`round advanced after nonsense: ${roundAfterNonsense}`);
    await s.run(`for (let r = 0; r < 3; r++) { await __t.wait('#arg'); await __t.fill('#arg','Un jardín da sombra y baja la temperatura del patio');
        const card = document.querySelector('input[name=card]'); if (card) card.click(); await __t.submit('.tg-form');
        await __t.wait('input[name=flaw]', 8000); document.querySelector('input[name=flaw][value=generaliza]').click(); await __t.submit('.tg-form'); await __t.click('[data-tg=next]'); }
      await __t.wait('input[name=stance]'); document.querySelector('input[name=stance]').click(); await __t.fill('#fair','El espacio para jugar también es importante');
      await __t.fill('#conclusion','Un jardín pequeño permite ambas cosas'); await __t.submit('.tg-form'); await __t.wait('.tg-done-actions', 8000)`);
    log('duelo submitted (nonsense round correctly repeated)');

    // Validation blocks junk answers outright.
    const blocked = await s.run(`location.hash='/juego/${ids.detective}'; await __t.click('[data-tg=start]'); await __t.wait('.tg-sentence:not([disabled])'); await __t.click('.tg-sentence[data-tgv="2"]');
      await __t.click('[data-tg=check]'); await __t.wait('input[name=type]'); document.querySelector('input[name=type]').click(); await __t.fill('textarea[name=why]','asd');
      await __t.submit('.tg-form'); return document.querySelector('textarea[name=why]')?.validationMessage || ''`);
    if (!blocked) throw new Error('junk answer was accepted'); log('junk answer blocked:', blocked);

    // Teacher reviews; student sees feedback.
    const groupId = await t.run(`return (await (await fetch('/api/groups')).json())[0].id`);
    await t.run(`location.hash='/docente/grupo/${groupId}'; await __t.wait('.activity-row')`);
    await t.shot('10-group-activities');
    await t.run(`location.hash='/docente/actividad/${ids.duelo}'; await __t.click('.table a.btn'); await __t.wait('form[data-form=review]')`);
    await t.shot('11-review-duel');
    await t.run(`await __t.fill('#feedback','¿Qué evidencia usarías para responder a la postura contraria?'); await __t.submit('form[data-form=review]'); await __t.wait('.table')`);
    const subId = await s.run(`return (await (await fetch('/api/student/activities')).json()).find(a => a.type === 'duelo').submissionId`);
    await s.run(`location.hash='/estudiante/entrega/${subId}'; await __t.wait('.feedback-card')`);
    await s.shot('12-student-feedback');
    await s.shot('13-student-feedback-mobile', 390);
    await t.run(`location.hash='/docente/progreso'; await __t.wait('.stack-bar')`);
    await t.shot('14-progress');
    await t.run(`location.hash='/docente/grupo/${groupId}'; await __t.wait('.activity-row')`);
    await t.shot('15-group-mobile', 390);
    log('review + feedback + progress ok');
  } catch (e) {
    console.error('FAILED:', e.message);
    if (s) await s.shot('fail-student').catch(() => {});
    if (t) await t.shot('fail-teacher').catch(() => {});
    process.exitCode = 1;
  } finally {
    console.log('teacher console errors:', t?.errors || []);
    console.log('student console errors:', s?.errors || []);
    b.close(); server.kill();
  }
})();
