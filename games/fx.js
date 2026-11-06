/* Visual and sound effects shared by every activity: typewriter, Lottie, confetti, beeps, countdown. */
(() => {
'use strict';
const T = () => window.Tutoki;
const reduced = () => T().state.motion || matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, reduced() ? Math.min(ms, 60) : ms));

// Types text like a live AI. Tapping anywhere in the game finishes it at once (kids should never wait).
async function type(el, text, cps = 50) {
  if (!el) return;
  text = String(text ?? '');
  if (reduced()) { el.textContent = text; return; }
  let skip = false;
  const stage = el.closest('.tg') || document;
  const onSkip = () => { skip = true; };
  stage.addEventListener('pointerdown', onSkip);
  el.classList.add('tg-typing');
  for (let i = 1; i <= text.length && !skip && el.isConnected; i++) {
    el.textContent = text.slice(0, i);
    await new Promise(r => setTimeout(r, /[.,;:!?]/.test(text[i - 1]) ? 260 : 1000 / cps));
  }
  el.textContent = text;
  el.classList.remove('tg-typing');
  stage.removeEventListener('pointerdown', onSkip);
}

// Types several elements in sequence; one tap finishes all of them, not just the current one.
async function typeMany(pairs, cps = 50) {
  if (!pairs.length) return;
  const stage = pairs[0][0].closest('.tg') || document;
  let skipped = false;
  const onSkip = () => { skipped = true; };
  stage.addEventListener('pointerdown', onSkip);
  for (const [el, text] of pairs) {
    if (skipped || reduced()) el.textContent = text;
    else await type(el, text, cps);
  }
  stage.removeEventListener('pointerdown', onSkip);
}

function lottie(el) {
  if (!window.lottie || !el || el.dataset.ready) return;
  el.dataset.ready = '1';
  const loop = el.hasAttribute('data-loop') && !reduced();
  const anim = window.lottie.loadAnimation({ container: el, renderer: 'svg', loop, autoplay: !reduced(), path: `assets/lottie/${el.dataset.lottie}.json` });
  if (reduced()) anim.addEventListener('DOMLoaded', () => anim.goToAndStop(anim.totalFrames - 1, true));
}

function confetti(big = false) {
  if (reduced() || !window.confetti) return;
  const colors = ['#8125b5', '#ffb34f', '#d9a8f5', '#6fbf73', '#ffffff'];
  window.confetti({ particleCount: big ? 160 : 60, spread: big ? 100 : 60, startVelocity: big ? 45 : 30, origin: { y: 0.65 }, colors, disableForReducedMotion: true });
}

let audio;
const NOTES = { tap: [660], good: [523, 659, 784], bad: [330, 262], tick: [880], go: [523, 784, 1047], reveal: [392, 587], fanfare: [523, 659, 784, 1047] };
function sfx(kind) {
  const volume = (T().state.volume ?? 70) / 100;
  if (!volume || !NOTES[kind]) return;
  try { audio = audio || new AudioContext(); } catch { return; }
  NOTES[kind].forEach((freq, i) => {
    const t0 = audio.currentTime + i * 0.09, osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'triangle'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.07 * volume, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    osc.connect(gain).connect(audio.destination); osc.start(t0); osc.stop(t0 + 0.25);
  });
}

async function countdown(root) {
  if (reduced()) return;
  const layer = document.createElement('div');
  layer.className = 'tg-count'; layer.setAttribute('aria-hidden', 'true');
  root.append(layer);
  for (const n of ['3', '2', '1', '¡A pensar!']) {
    layer.innerHTML = `<span class="${n.length > 1 ? 'go' : ''}">${n}</span>`;
    sfx(n.length > 1 ? 'go' : 'tick');
    await wait(n.length > 1 ? 750 : 620);
  }
  layer.remove();
}

window.TutokiFx = { reduced, wait, type, typeMany, lottie, confetti, sfx, countdown };
})();
