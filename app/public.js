/* Public screens: welcome, role choice, teacher login/register, student join. */
(() => {
'use strict';
const T = window.Tutoki;
const { ico, art, btn, field, formError, auth, esc } = T;

function welcome() {
  const role = T.session?.role;
  const next = role === 'teacher' ? btn('Ir a mi espacio docente', '/docente', 'primary', 'arrow') : role === 'student' ? btn('Ir a mis retos', '/estudiante', 'primary', 'arrow') : btn('Comenzar', '/acceso', 'primary', 'arrow');
  return auth(`<h1>Tu curiosidad<br>abre caminos<span style="color:#f9b140">.</span></h1><p>Observa, pregunta y descubre. Una plataforma que pregunta en lugar de responder.</p>${next}`, 'wave');
}

const chooseRole = () => auth(`<h1>Elige tu espacio</h1><p>Una aventura para aprender a pensar, juntos.</p><div class="stack">${[['teacher', 'Soy docente', '/ingresar'], ['wave', 'Soy estudiante', '/unirse']]
  .map(([pose, label, path]) => `<a class="role-card" style="text-decoration:none;color:inherit" href="#${path}">${art(pose)}${label}${ico('chevron')}</a>`).join('')}</div>`);

function login(register) {
  return auth(`<h1>${register ? 'Crear cuenta docente' : 'Entra a Tutoki'}</h1><form data-form="${register ? 'register' : 'login'}">
    ${register ? field('Nombre', 'name', '¿Cómo te llamas?', '', 'text', 'required maxlength="60" autocomplete="name"') : ''}
    ${field('Correo electrónico', 'email', 'tu@escuela.mx', '', 'email', 'required autocomplete="email"')}
    ${field('Contraseña', 'password', register ? 'Mínimo 8 caracteres' : 'Tu contraseña', '', 'password', `required minlength="${register ? 8 : 1}" autocomplete="${register ? 'new-password' : 'current-password'}"`)}
    ${register ? '<label class="checkline"><input type="checkbox" required> Acepto que Tutoki guarde mis datos y los de mis grupos solo para operar la plataforma.</label>' : ''}
    ${formError()}<button type="submit" class="btn primary full">${register ? 'Crear mi espacio' : 'Iniciar sesión'}${ico('arrow')}</button></form>
    ${btn(register ? 'Ya tengo una cuenta' : 'Crear cuenta', register ? '/ingresar' : '/registro', 'secondary', '')}`, register ? 'think' : 'teacher');
}

const join = () => auth(`${art('wave')}<h1>Entra a tu grupo</h1><p>Pide el código a tu docente.</p><form data-form="join">
  ${field('Código del grupo', 'code', 'ABC-123', '', 'text', 'required maxlength="12" autocapitalize="characters" autocomplete="off"')}
  ${field('Tu alias', 'alias', 'Como te llama tu grupo', '', 'text', 'required maxlength="30" autocomplete="nickname"')}
  <div class="field" id="pin-field" hidden><label for="pin">Tu PIN de 4 números</label><input id="pin" name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off"></div>
  ${formError()}<button class="btn primary full" type="submit">Entrar${ico('arrow')}</button></form>
  <div class="auth-bottom">¿Primera vez? Solo escribe el código y tu alias.</div>`);

async function enterTeacher(url, data) {
  T.session = await T.api('POST', url, data);
  T.go('/docente');
}

Object.assign(T.forms, {
  login: data => enterTeacher('/api/auth/login', data),
  register: async data => { await enterTeacher('/api/auth/register', data); T.toast(`¡Te damos la bienvenida, ${data.name}! Empieza creando tu primer grupo.`); },
  join: async (data, form) => {
    try { T.session = await T.api('POST', '/api/auth/join', data); }
    catch (e) {
      if (e.code === 'pin-required') { const box = form.querySelector('#pin-field'); box.hidden = false; box.querySelector('input').required = true; box.querySelector('input').focus(); }
      throw e;
    }
    if (!T.session.pin) return T.go('/estudiante');
    await T.go('/estudiante/avatar');
    // The PIN is shown once; the teacher can always see or reset it.
    T.modal('Tu PIN secreto', `<div class="center">${art('celebrate')}<p>Lo necesitarás para volver a entrar desde otro dispositivo.</p>
      <div class="code" aria-label="PIN ${esc(T.session.pin.split('').join(' '))}">${esc(T.session.pin)}</div><p>Anótalo en tu cuaderno. Tu docente también lo puede ver.</p></div>
      <button class="btn primary full" data-action="close-modal">Ya lo anoté${ico('check')}</button>`);
  },
});

T.route(/^\/$/, welcome);
T.route(/^\/acceso$/, chooseRole);
T.route(/^\/ingresar$/, () => login(false));
T.route(/^\/registro$/, () => login(true));
T.route(/^\/unirse$/, join);
})();
