/* Router, API client, preferences and global events. Loaded last. */
(() => {
'use strict';
const T = window.Tutoki;
const { $, ico, art, btn, action, auth } = T;

// Device preferences + wizard draft. Accounts and classroom data live on the server.
let saved = {};
try { saved = JSON.parse(localStorage.getItem('tutoki-v2') || '{}'); } catch (e) { console.warn('Preferences unreadable.', e); }
T.state = { motion: false, large: false, read: false, volume: 70, tab: 'activities', ...saved };
T.persist = () => { try { localStorage.setItem('tutoki-v2', JSON.stringify(T.state)); } catch (e) { console.warn('Preferences not saved.', e); } };

// Opening index.html directly (file:// or an editor's live preview) loads the pages but not the API.
const NO_SERVER = 'No encuentro el servidor de Tutoki. En la carpeta del proyecto ejecuta «node server.cjs» y abre http://localhost:4173.';
T.api = async (method, url, body) => {
  let res;
  try { res = await fetch(url, { method, headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new Error(location.protocol === 'file:' ? NO_SERVER : 'Sin conexión con Tutoki. Revisa tu internet e intenta de nuevo.'); }
  if (!String(res.headers.get('content-type')).includes('application/json')) throw new Error(NO_SERVER);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Algo salió mal. Intenta de nuevo.'), { status: res.status, code: data.code });
  return data;
};
T.refreshSession = async () => { T.session = await T.api('GET', '/api/me').catch(() => ({ role: null })); };

const routes = T.routes;
// Resolves once the destination is painted, so callers can open a modal on the new screen.
let painted = [];
T.go = path => new Promise(resolve => { painted.push(resolve); if (location.hash === `#${path}`) render(); else location.hash = path; });
T.render = () => render();
const home = () => ({ teacher: '/docente', student: '/estudiante' }[T.session?.role] || '/');

const notFound = () => auth(`${art('think')}<h1>Busquemos otro camino</h1><p>Esta pantalla no existe.</p>${btn('Volver al inicio', home(), 'primary', 'home')}`);
const errorView = e => auth(`${art('think')}<h1>No pudimos cargar esta pantalla</h1><p>${T.esc(e.message)}</p>${action('Reintentar', 'reload', 'primary', 'refresh')} ${btn('Ir al inicio', home(), 'secondary', 'home')}`);

let ticket = 0;
async function render() {
  const mine = ++ticket;
  const path = location.hash.replace(/^#/, '') || '/';
  if (!T.session) await T.refreshSession();
  let hit = null, params = [];
  for (const r of routes) { const m = path.match(r.pattern); if (m) { hit = r; params = m.slice(1); break; } }
  if (hit?.role && T.session.role !== hit.role) return T.go(hit.role === 'teacher' ? '/ingresar' : '/unirse');
  document.body.classList.add('is-loading');
  let out;
  try { out = hit ? await hit.view(...params) : notFound(); }
  catch (e) {
    if (e.status === 401) { T.session = null; return T.go('/acceso'); }
    console.error(e);
    out = errorView(e);
  }
  if (mine !== ticket || out === undefined) return; // a newer navigation won, or the view redirected
  const [html, after] = Array.isArray(out) ? out : [out];
  $('#app').innerHTML = html;
  document.body.classList.remove('is-loading');
  document.body.classList.toggle('large-text', T.state.large);
  document.body.classList.toggle('reduce-motion', T.state.motion);
  const h1 = $('#app h1');
  document.title = `Tutoki · ${h1 ? h1.textContent.trim() : 'Aprender a pensar'}`;
  window.scrollTo(0, 0);
  after?.();
  if (T.state.read && h1) T.speak(h1.textContent);
  const waiting = painted; painted = [];
  waiting.forEach(resolve => resolve());
}

T.speak = text => {
  if (!('speechSynthesis' in window)) return T.toast('La lectura en voz alta no está disponible en este navegador.');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(window.TutokiI18n.translate(text));
  u.lang = document.documentElement.lang === 'en' ? 'en-US' : 'es-MX';
  u.rate = 0.9; u.volume = (T.state.volume ?? 70) / 100;
  speechSynthesis.speak(u);
};

T.accessibility = () => `<div class="card">${[['read', 'volume', 'Leer títulos en voz alta'], ['large', 'book', 'Texto grande'], ['motion', 'play', 'Reducir movimiento']].map(([k, i, label]) =>
  `<div class="setting"><span>${ico(i)}${label}</span><button class="switch" role="switch" aria-label="${label}" aria-checked="${Boolean(T.state[k])}" data-action="toggle-setting" data-setting="${k}"></button></div>`).join('')}
  <div class="setting"><label for="volume">Volumen de sonidos</label><input id="volume" type="range" min="0" max="100" value="${T.state.volume}" style="width:55%;accent-color:var(--purple)"></div></div>`;

Object.assign(T.actions, {
  language: () => window.TutokiI18n.toggle(),
  reload: () => render(),
  'mobile-menu': () => $('.sidebar')?.classList.toggle('open'),
  'close-modal': () => $('#modal').close(),
  'toggle-setting': el => { T.state[el.dataset.setting] = !T.state[el.dataset.setting]; T.persist(); const y = scrollY; render().then(() => scrollTo(0, y)); },
  logout: async () => { await T.api('POST', '/api/auth/logout'); T.session = { role: null }; T.go('/'); T.toast('Cerraste sesión.'); },
  'copy-code': async el => {
    try { await navigator.clipboard.writeText(el.dataset.code); T.toast(`Código copiado: ${el.dataset.code}`); }
    catch { T.modal('Copia el código', `<input aria-label="Código del grupo" value="${T.esc(el.dataset.code)}" readonly onclick="this.select()">`); }
  },
  'share-code': async el => {
    const text = `Únete a mi grupo en Tutoki (${location.origin}/#/unirse). Código: ${el.dataset.code}`;
    if (navigator.share) { try { await navigator.share({ title: 'Tutoki · Invitación al grupo', text }); } catch (e) { if (e.name !== 'AbortError') T.toast('No se pudo compartir.'); } }
    else T.modal('Comparte la invitación', `<textarea readonly aria-label="Texto de invitación" onclick="this.select()">${T.esc(text)}</textarea>`);
  },
});

document.addEventListener('click', async e => {
  if (e.target.closest('#modal a[href^="#"]')) $('#modal').close();
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const handler = T.actions[el.dataset.action];
  if (!handler) return;
  if (el.tagName === 'BUTTON') e.preventDefault();
  try { await handler(el, e); }
  catch (err) { console.error(err); T.toast(err.message); }
});

document.addEventListener('submit', async e => {
  const form = e.target;
  const handler = T.forms[form.dataset.form];
  if (!handler) return;
  e.preventDefault();
  if (!form.checkValidity()) return form.reportValidity();
  const submit = form.querySelector('[type="submit"]');
  const error = form.querySelector('.form-error');
  if (submit) submit.disabled = true;
  if (error) error.hidden = true;
  try { await handler(Object.fromEntries(new FormData(form)), form); }
  catch (err) {
    if (error) { error.textContent = err.message; error.hidden = false; } else T.toast(err.message);
  } finally { if (submit) submit.disabled = false; }
});

document.addEventListener('input', e => { if (e.target.id === 'volume') { T.state.volume = Number(e.target.value); T.persist(); } });
window.addEventListener('hashchange', () => {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  if ($('#modal').open) $('#modal').close();
  render();
});
$('#modal').addEventListener('click', e => {
  if (e.target !== $('#modal')) return;
  const r = $('#modal').getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('#modal').close();
});

render();
})();
