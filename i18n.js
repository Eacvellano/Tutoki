(() => {
  'use strict';
  const dictionary = window.TutokiTranslations;
  const escaped = Object.keys(dictionary).sort((a, b) => b.length - a.length)
    .map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const phrases = new RegExp(`(?<![\\p{L}\\p{N}])(?:${escaped.join('|')})(?![\\p{L}\\p{N}])`, 'gu');
  const originals = new WeakMap();
  const attributes = new WeakMap();
  let language = 'es';
  try { language = localStorage.getItem('tutoki-language') === 'en' ? 'en' : 'es'; }
  catch (error) { console.warn('Language preference cannot be read.', error); }

  const translate = text => language === 'en'
    ? text.replace(phrases, phrase => dictionary[phrase]) : text;

  // Keep the Spanish source separately so repeated toggles do not compound translations.
  function sourceFor(store, key, current) {
    const previous = store.get(key);
    return previous && previous.output === current ? previous.source : current;
  }

  function apply() {
    observer.disconnect();
    document.documentElement.lang = language;
    const walker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.parentElement || node.parentElement.closest('script, style, textarea, [translate="no"]')) continue;
      const source = sourceFor(originals, node, node.textContent);
      const output = translate(source);
      originals.set(node, { source, output });
      if (node.textContent !== output) node.textContent = output;
    }
    document.querySelectorAll('[aria-label], [placeholder], [title], [alt]').forEach(element => {
      if (element.closest('[translate="no"]')) return;
      const records = attributes.get(element) || new Map();
      for (const name of ['aria-label', 'placeholder', 'title', 'alt']) {
        if (!element.hasAttribute(name)) continue;
        const source = sourceFor(records, name, element.getAttribute(name));
        const output = translate(source);
        records.set(name, { source, output });
        if (element.getAttribute(name) !== output) element.setAttribute(name, output);
      }
      attributes.set(element, records);
    });
    document.querySelectorAll('.language-button').forEach(button => {
      const label = language === 'es' ? 'Cambiar a inglés' : 'Switch to Spanish';
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.querySelector('.language-code').textContent = language.toUpperCase();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  }

  // Typewriter effects mutate untranslated regions many times per second; re-walking the page for those is wasted work.
  const insideUntranslated = record => (record.target.nodeType === 1 ? record.target : record.target.parentElement)?.closest('[translate="no"]');
  const observer = new MutationObserver(records => { if (!records.every(insideUntranslated)) apply(); });
  window.TutokiI18n = {
    translate,
    toggle() {
      language = language === 'es' ? 'en' : 'es';
      try { localStorage.setItem('tutoki-language', language); }
      catch (error) { console.warn('Language preference cannot be saved.', error); }
      apply();
    }
  };
  apply();
})();
