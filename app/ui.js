/* Shared UI helpers and page layouts. Everything hangs off window.Tutoki (T). */
(() => {
'use strict';
const T = window.Tutoki = window.Tutoki || {};
const $ = (s, r = document) => r.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const userText = v => `<span translate="no">${esc(v)}</span>`;
const displayText = (v, fallback) => v ? userText(v) : esc(fallback);
const icons = {translate:'M3 5h12M9 2v3M5 5c0 6 4 9 8 11M12 5c0 5-4 10-9 13M13 22l5-12 5 12M15 18h6',home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',book:'M12 5v16M3 3c4-1 7 0 9 2 2-2 5-3 9-2v16c-4-1-7 0-9 2-2-2-5-3-9-2Z',chart:'M4 21V13M10 21V8M16 21V3M22 21H2',plus:'M12 5v14M5 12h14',arrow:'M4 12h16M14 6l6 6-6 6',back:'M20 12H4M10 6l-6 6 6 6',chevron:'m9 5 7 7-7 7',down:'m6 9 6 6 6-6',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',search:'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',bulb:'M9 18h6M10 22h4M8 14a7 7 0 1 1 8 0l-1 4H9Z',chat:'M21 4H3v13h5v4l5-4h8Z',leaf:'M20 3C8 2 1 9 5 17s17 1 15-14ZM5 20l11-12',mic:'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',upload:'M12 16V3M7 8l5-5 5 5M3 15v6h18v-6',file:'M14 2H5v20h14V7ZM14 2v5h5M8 12h8M8 16h6',copy:'M9 9h12v12H9ZM3 15V3h12',share:'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM9 10l6-4M9 14l6 4',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM9 2h6l1 4 4 1 2 5-3 3 1 4-5 3-3-3-4 1-3-5 3-3Z',help:'M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17v.2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',mail:'M2 4h20v16H2ZM2 5l10 8L22 5',lock:'M6 10h12v12H6ZM8 10V6a4 4 0 0 1 8 0v4',user:'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2M16 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',logout:'M9 4H3v16h6M12 12h10M17 7l5 5-5 5',bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9 21h6',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',edit:'m15 3 6 6L8 22l-6 1 1-6ZM12 6l6 6',spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3ZM20 2v4M18 4h4',target:'M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5M12 12l9-9M17 3h4v4',trophy:'M7 3h10v9a5 5 0 0 1-10 0ZM7 5H2v3a5 5 0 0 0 5 5M17 5h5v3a5 5 0 0 1-5 5M12 17v5M8 22h8',shield:'m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6ZM8 12l3 3 5-6',volume:'M4 9h4l5-5v16l-5-5H4ZM17 7a8 8 0 0 1 0 10M20 4a12 12 0 0 1 0 16',download:'M12 2v14M7 11l5 5 5-5M3 17v5h18v-5',wifi:'M2 7a17 17 0 0 1 20 0M5 11a12 12 0 0 1 14 0M9 15a5 5 0 0 1 6 0M12 19h.01M3 3l18 18',menu:'M3 6h18M3 12h18M3 18h18',play:'m7 3 14 9-14 9Z',clock:'M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',flag:'M4 22V3c7-4 9 4 16 0v11c-7 4-9-4-16 0',printer:'M6 8V2h12v6M6 17H2V8h20v9h-4M6 14h12v8H6Z',school:'m2 9 10-7 10 7M5 8v14h14V8M10 22v-6h4v6M8 11h1M15 11h1',info:'M12 11v6M12 7h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0'};
Object.assign(icons, { trash: 'M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 11v6M14 11v6', key: 'M15 3a6 6 0 1 1-5.2 9L3 18.8V21h3v-2h2v-2h2l1.6-1.6A6 6 0 0 1 15 3ZM16.5 7.5h.01', refresh: 'M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6' });
const ico = n => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[n] || icons.spark}"/></svg>`;
const poses = ['teacher', 'detective', 'think', 'wave', 'celebrate', 'plant', 'speak', 'debate'];
const art = (p = 'wave', cls = '') => `<div class="art ${cls}" aria-hidden="true"><img src="assets/toki/${poses.includes(p) ? p : 'wave'}.png" alt="" draggable="false"></div>`;
const activities = [
  { id: 'detective', name: 'Detective', icon: 'search', pose: 'detective', desc: 'Analiza información, busca evidencias y saca conclusiones.' },
  { id: 'primero', name: 'Primero tú', icon: 'bulb', pose: 'think', desc: 'Piensa, analiza y formula tu propia respuesta.' },
  { id: 'defiendelo', name: 'Defiéndelo', icon: 'mic', pose: 'speak', desc: 'Explica cómo llegaste a tu idea.' },
  { id: 'comunidad', name: 'Reto comunidad', icon: 'users', pose: 'plant', desc: 'Aplica lo que sabes para proponer soluciones.' },
  { id: 'duelo', name: 'Duelo', icon: 'chat', pose: 'debate', desc: 'Contrasta posturas y argumenta con evidencia.' },
];
const typeOf = id => activities.find(a => a.id === id) || activities[0];
const date = iso => new Date(iso).toLocaleDateString(document.documentElement.lang === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const languageButton = () => `<button class="language-button" data-action="language" aria-label="Cambiar idioma" title="Cambiar idioma">${ico('translate')}<span class="language-code" aria-hidden="true">ES</span></button>`;
const brand = (to = '/') => `<a class="brand spark" href="#${to}" aria-label="Tutoki, inicio"><span class="brand-mark"></span>Tutoki</a>`;
const btn = (text, to, kind = 'primary', icon = 'arrow') => `<a class="btn ${kind}" href="#${to}">${esc(text)}${icon ? ico(icon) : ''}</a>`;
const action = (text, id, kind = 'primary', icon = '', data = '') => `<button type="button" class="btn ${kind}" data-action="${id}" ${data}>${icon ? ico(icon) : ''}${esc(text)}</button>`;
const field = (label, name, placeholder = '', value = '', type = 'text', extra = 'required') => `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" placeholder="${esc(placeholder)}" value="${esc(value)}" ${extra}></div>`;
const area = (label, name, placeholder = '', value = '', required = true) => `<div class="field"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" placeholder="${esc(placeholder)}" ${required ? 'required' : ''}>${esc(value)}</textarea></div>`;
const select = (label, name, options, value) => `<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}">${options.map(([v, t]) => `<option value="${esc(v)}" ${v === value ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
const formError = () => '<p class="form-error" role="alert" hidden></p>';
const head = (tag, title, desc = '', right = '') => `<div class="page-heading"><div><div class="eyebrow">${tag}</div><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ''}</div>${right}</div>`;
const back = (to, text = 'Volver') => `<a class="back" href="#${to}">${ico('back')}${text}</a>`;
const empty = (pose, title, desc, cta = '') => `<div class="card empty">${art(pose)}<h2>${title}</h2><p>${desc}</p>${cta}</div>`;

function toast(text) {
  const t = $('#toast');
  t.textContent = text; t.classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('visible'), 3600);
}
function modal(title, html) {
  const m = $('#modal');
  m.innerHTML = `<div class="modal-title"><h2 id="modal-heading">${title}</h2><button class="circle-button" data-action="close-modal" aria-label="Cerrar">${ico('close')}</button></div>${html}`;
  m.setAttribute('aria-labelledby', 'modal-heading');
  if (!m.open) m.showModal();
}

function teacher(content, active = 'home', step = 0) {
  const name = T.session?.teacher?.name || '';
  const nav = [['home', 'home', 'Inicio', '/docente'], ['groups', 'users', 'Mis grupos', '/docente/grupos'], ['activities', 'book', 'Actividades', '/docente/actividades'], ['progress', 'chart', 'Progreso', '/docente/progreso']];
  const crumb = step ? 'Crear actividad' : ({ home: 'Inicio', groups: 'Mis grupos', activities: 'Actividades', progress: 'Progreso', settings: 'Mi cuenta' }[active]);
  return `<div class="shell"><aside class="sidebar"><a class="brand sidebar-brand" href="#/docente" aria-label="Tutoki, inicio">Tutoki</a>
    <nav class="nav" aria-label="Navegación principal">${nav.map(([id, ic, label, path]) => `<a href="#${path}" class="${id === active ? 'active' : ''}">${ico(ic)}${label}</a>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="side-tip">${ico('bulb')}<strong>Las buenas preguntas abren caminos.</strong>Primero pensamos. Después exploramos juntos.</div>
    <a class="account" href="#/docente/cuenta" style="text-decoration:none;color:inherit"><span class="avatar">${userText(name.charAt(0))}</span><span>${userText(name)}<small>Espacio docente</small></span>${ico('settings')}</a></div></aside>
    <main class="main ${step ? 'wizard-content' : ''}"><header class="topbar"><span class="row"><button class="circle-button mobile-menu" data-action="mobile-menu" aria-label="Abrir menú">${ico('menu')}</button>Mi espacio / ${crumb}</span>
    <div class="top-actions">${languageButton()}</div></header><div class="content">${content}</div></main></div>${step ? stepper(step) : ''}`;
}
const stepper = n => `<nav class="stepper" aria-label="Pasos de creación de actividad"><div class="stepper-inner">${['Material', 'Actividad', 'Revisión', 'Publicar'].map((s, i) => `<button class="step ${i + 1 === n ? 'current' : i + 1 < n ? 'done' : ''}" ${i + 1 === n ? 'aria-current="step"' : ''} data-action="wizard-step" data-step="${i + 1}" ${i + 1 > n ? 'disabled' : ''}><span class="step-dot">${i + 1 < n ? '✓' : i + 1}</span>${i + 1} · ${s}</button>`).join('')}</div></nav>`;

function student(content, active = 'home', narrow = false) {
  const nav = [['home', 'home', 'Inicio', '/estudiante'], ['games', 'target', 'Retos', '/estudiante/retos'], ['progress', 'chart', 'Mi avance', '/estudiante/avance'], ['account', 'user', 'Mi cuenta', '/estudiante/cuenta']];
  return `<div class="student-shell"><header class="student-header">${brand('/estudiante')}<div class="top-actions"><span class="pill">${ico('school')}${userText(T.session?.group?.name || '')}</span>${languageButton()}</div></header>
    <main class="student-main ${narrow ? 'narrow' : ''}">${content}</main>
    <nav class="student-nav" aria-label="Navegación estudiante">${nav.map(([id, ic, label, path]) => `<a class="${active === id ? 'active' : ''}" href="#${path}">${ico(ic)}${label}</a>`).join('')}</nav></div>`;
}
const auth = (content, pose = '') => `<main class="auth-page"><div class="auth-card ${pose ? 'auth-split' : ''}"><header class="auth-header">${brand()}${languageButton()}</header>${pose ? `<div class="auth-layout">${art(pose, 'auth-illustration')}<div class="auth-copy">${content}</div></div>` : content}</div></main>`;

// Route registry lives here because every module registers routes at load time, before main.js runs.
const routes = [];
const route = (pattern, view, role = null) => routes.push({ pattern, view, role });

Object.assign(T, { routes, route, $, esc, userText, displayText, ico, art, activities, typeOf, date, btn, action, field, area, select, formError, head, back, empty, toast, modal, teacher, student, auth, actions: {}, forms: {} });
})();
