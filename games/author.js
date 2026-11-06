/* Teacher side: read the material, generate an activity with Gemini, review/edit it, publish it. */
(() => {
'use strict';
const G = window.TutokiGames;
const T = () => window.Tutoki;
const MAX_BYTES = 15 * 1024 * 1024;
const MIME_BY_EXT = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', txt: 'text/plain' };
const RUBRICS = {
  detective: ['Detecta afirmaciones dudosas', 'Usa evidencia del material', 'Explica cómo lo detectó'],
  primero: ['Formula una predicción propia', 'Contrasta con evidencia', 'Evalúa la respuesta de la IA'],
  defiendelo: ['Justifica su respuesta', 'Conecta con evidencia', 'Reconoce cómo mejorar'],
  comunidad: ['Analiza un problema real', 'Propone soluciones viables', 'Integra otras perspectivas'],
  duelo: ['Argumenta con evidencia', 'Detecta fallas de razonamiento', 'Reconsidera con apertura'],
};
const STEPS = {
  detective: ['Leyendo tu material…', 'Escribiendo una explicación muy convincente…', 'Escondiendo errores verosímiles…', 'Armando el expediente del caso…'],
  primero: ['Leyendo tu material…', 'Buscando una pregunta intrigante…', 'Eligiendo evidencias para revelar…', 'Preparando una respuesta de IA para juzgar…'],
  defiendelo: ['Leyendo tu material…', 'Diseñando un reto breve…', 'Preparando preguntas de entrevista…', 'Afinando repreguntas socráticas…'],
  comunidad: ['Leyendo tu material…', 'Conectando el tema con tu comunidad…', 'Creando voces de la comunidad…', 'Preparando la misión…'],
  duelo: ['Leyendo tu material…', 'Buscando una pregunta debatible…', 'Repartiendo cartas de evidencia…', 'Sembrando fallas en los argumentos de la IA…'],
};
let material = null; // { name, mimeType, data } — kept in memory only, never in localStorage.

function setMaterial(file) {
  const mimeType = MIME_BY_EXT[file.name.split('.').pop().toLowerCase()];
  if (!mimeType) { material = null; return Promise.reject(new Error('Usa un PDF, una imagen (JPG, PNG, WEBP) o un archivo de texto.')); }
  if (file.size > MAX_BYTES) { material = null; return Promise.reject(new Error('El archivo pesa más de 15 MB. Prueba con menos páginas.')); }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { material = { name: file.name, mimeType, data: String(reader.result).split(',')[1] }; resolve(material); };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}
const clearMaterial = () => { material = null; };

function overlay(activity) {
  const el = document.createElement('div');
  el.className = 'tg-generating';
  el.setAttribute('role', 'status');
  el.innerHTML = `<div class="tg-generating-card">${T().art('think', 'float')}<span class="tg-generating-dots" data-lottie="thinking" data-loop></span><p class="tg-generating-text" translate="no"></p><small>Tú revisarás todo antes de publicar.</small></div>`;
  document.body.append(el);
  G.lottie(el.querySelector('[data-lottie]'));
  let alive = true, i = 0;
  (async () => { while (alive) { await G.type(el.querySelector('.tg-generating-text'), STEPS[activity][i++ % 4], 40); await G.wait(1400); } })();
  return () => { alive = false; el.remove(); };
}

async function generate(activity) {
  const s = T().state;
  const close = overlay(activity);
  const started = Date.now();
  let content, demo = false;
  try {
    if (!(await G.aiStatus()).ai) throw Object.assign(new Error('Modo demostración: agrega GEMINI_API_KEY para generar con IA.'), { code: 'no-key' });
    content = await G.ai('generate', { activity, topic: s.topic, level: s.groupMeta?.level, grade: s.groupMeta?.grade, file: material || undefined });
  } catch (e) {
    content = JSON.parse(JSON.stringify(window.TutokiDemo[activity]));
    demo = true;
    T().toast(e.code === 'no-key' ? e.message : `${e.message} Te mostramos un ejemplo.`);
  }
  await G.wait(Math.max(0, 2200 - (Date.now() - started))); // let the teacher see what is happening
  close();
  s.draft = { activity, content, demo, source: material ? material.name : (s.topic || 'Tema libre') };
  T().persist();
}

const edit = (path, value, tag = 'span') => `<${tag} class="tg-edit" contenteditable="true" spellcheck="true" data-edit-path="${path}" translate="no">${T().esc(value)}</${tag}>`;

function review() {
  const s = T().state, d = s.draft, { ico, esc } = T();
  if (!d || d.activity !== s.activity) return `<div class="form-card center">${T().art('think')}<h2>Aún no hay borrador</h2><p>Elige una actividad para preparar uno.</p><a class="btn primary" href="#/docente/crear/2">Elegir actividad${ico('arrow')}</a></div>`;
  const name = T().activities.find(a => a.id === d.activity).name;
  return `<div class="form-card tg-review"><div class="row"><span class="pill ${d.demo ? 'cream' : ''}">${ico('spark')}${d.demo ? 'Ejemplo sin IA · Modo demostración' : 'Generado con IA · Revísalo'}</span><span class="pill">${ico('file')}<span translate="no">${esc(d.source)}</span></span></div>
    <span class="eyebrow mt">${esc(name)}</span><h2 class="mt">${edit('title', d.content.title)}</h2>
    <p class="tg-review-note">${ico('edit')}Toca cualquier texto para editarlo. La IA puede equivocarse: tú decides qué llega a tu grupo.</p>
    ${G.games[d.activity].review(d.content, edit)}
    <div class="review-block"><h3 style="font-size:17px">${ico('file')} Rúbrica de proceso</h3><div class="rubric">${RUBRICS[d.activity].map(r => `<span>${ico('check')}${r}</span>`).join('')}</div></div>
    <div class="form-actions"><button class="btn secondary" data-tg-author="regenerate">${ico('spark')}Generar otra versión</button><a class="btn primary" href="#/docente/crear/4">Aprobar${ico('check')}</a></div></div>`;
}

// Write teacher edits straight into the draft, following the dotted path (e.g. "sentences.2.text").
document.addEventListener('input', e => {
  const el = e.target.closest?.('[data-edit-path]');
  const d = T()?.state.draft;
  if (!el || !d) return;
  const keys = el.dataset.editPath.split('.');
  const last = keys.pop();
  const parent = keys.reduce((o, k) => o?.[k], d.content);
  if (parent && last in parent) { parent[last] = el.textContent.trim(); T().persist(); }
});
// Edited fields are single values: Enter confirms instead of inserting markup.
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.closest?.('[data-edit-path]')) { e.preventDefault(); e.target.blur(); }
});
document.addEventListener('click', async e => {
  if (!e.target.closest('[data-tg-author="regenerate"]')) return;
  await generate(T().state.activity);
  T().render();
});

Object.assign(G, { setMaterial, clearMaterial, materialName: () => material?.name || '', generate, review, edit, RUBRICS });
})();
