/* i18n.js — the interface in seven languages, translated in place.

   English is the source language: the HTML and the scripts are written in English, and
   each language file (js/locale-<id>.js) maps English text to its translation. This file
   watches the page and translates text as it appears, so the tuner and metronome code
   keeps writing plain English and never needs to know the language:
     • static text and the attributes people read or hear (data-help tooltips, aria-label,
       placeholder, title) are translated on load and whenever the language changes;
     • text the scripts write later (status lines, toasts, lists) is translated the moment
       it is written, before the browser paints it (a MutationObserver).
   The original English of every node is remembered, so switching language re-translates
   the whole page instantly, without a reload and without stopping the metronome or tuner.

   A language file entry is one of:
     'English': 'Translation'                      exact text
     'Stage {n}: {bpm} BPM': 'Etapa {n}: {bpm} BPM' a pattern; {name} matches any text and is
                                                   translated itself if it is a known phrase,
                                                   {=name} is copied as it is
   and a translation may name notes with {♪D}, {♪F♯} or {♪B♭}: they are written in the
   notation system in use (D / Re / D, Fis / Fa♯, B / Si♭…).

   Notes written with octaves (E2, F♯3, B♭1) are converted to the notation system in use
   everywhere, with the language's own name in parentheses when the system differs:
   "H3 (Si3)". Inside [data-pitch="bare"] (string chips, tables) only the name is shown.
   Elements with translate="no" (user content: preset and tuning names) are left alone. */
(function (root) {
  const MN = (root.MN = root.MN || {});
  const NT = () => MN.notation;

  const TABLES = {};                  // lang → { source: translation }
  let compiled = null, compiledFor = null;
  let lang = 'en';
  const cache = new Map();            // (context + source) → output, for the current language
  const listeners = new Set();
  const missing = new Set();          // English text with no translation (for the tests)
  let started = false, observer = null;

  /* ---------------- tables ---------------- */
  function add(l, table) {
    TABLES[l] = Object.assign(TABLES[l] || {}, table);
    if (l === lang || l === 'en') { compiled = null; cache.clear(); }
    const w = waiting.get(l);
    if (w) { waiting.delete(l); w.forEach((fn) => fn()); }
  }
  const has = (l) => !!TABLES[l];
  const chain = (l) => (l === 'en' ? ['en'] : l === 'en-GB' ? ['en-GB', 'en'] : [l, 'en']);

  const PLACEHOLDER = /\{[=#]?[a-zA-Z]\w*\}/, PLACEHOLDERS = /(\{[=#]?[a-zA-Z]\w*\})/;
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function compile() {
    if (compiled && compiledFor === lang) return compiled;
    const exact = new Map(), patterns = [];
    const seen = new Set();
    for (const l of chain(lang)) {
      const t = TABLES[l] || {};
      for (const src of Object.keys(t)) {
        if (seen.has(src)) continue;            // the first table in the chain wins
        seen.add(src);
        exact.set(src, t[src]);                 // templates too, for t('… {x} …', { x })
        if (!PLACEHOLDER.test(src)) continue;
        const names = [];
        let literal = '';
        const re = new RegExp('^' + src.split(PLACEHOLDERS).map((part) => {
          const m = /^\{([=#]?)([a-zA-Z]\w*)\}$/.exec(part);
          if (m) { names.push({ name: m[2], verbatim: !!m[1] }); return m[1] === '#' ? '([−+-]?\\d+(?:[.,]\\d+)?)' : '(.+?)'; }
          literal += part;
          return esc(part);
        }).join('') + '$', 's');
        patterns.push({ re, names, out: t[src], weight: literal.length, prefix: src.split('{')[0].slice(0, 3).toLowerCase() });
      }
    }
    patterns.sort((a, b) => b.weight - a.weight);  // the most specific pattern first
    const index = new Map(), loose = [];
    for (const p of patterns) {
      if (p.prefix.length < 3) { loose.push(p); continue; }
      if (!index.has(p.prefix)) index.set(p.prefix, []);
      index.get(p.prefix).push(p);
    }
    /* every translation in the current language: text that is already translated is
       left as it is and not reported as missing */
    const outputs = new Set();
    for (const v of exact.values()) if (!PLACEHOLDER.test(v)) outputs.add(v);
    compiled = { exact, index, loose, outputs };
    compiledFor = lang;
    return compiled;
  }

  /* ---------------- translating a string ---------------- */
  const LETTERS = /[A-Za-zÀ-ÿ]/;
  /* numbers with units only ("−42 dB", "440 Hz", "92 BPM") need no translation */
  const UNITS_ONLY = (s) => !LETTERS.test(s.replace(/\b(k?Hz|dBFS|dB|ms|BPM|bpm|s)\b/g, ''));
  function phrase(s, depth = 0) {
    const c = compile();
    if (c.exact.has(s)) return c.exact.get(s);
    if (depth < 2 && s.indexOf('::') > 0) {                       // tooltip "Title::Body"
      const i = s.indexOf('::');
      return phrase(s.slice(0, i).trim(), depth + 1) + '::' + phrase(s.slice(i + 2).trim(), depth + 1);
    }
    const key = s.slice(0, 3).toLowerCase();
    const lists = [c.index.get(key) || [], c.loose];
    for (const list of lists) for (const p of list) {
      const m = p.re.exec(s);
      if (!m) continue;
      let out = p.out;
      p.names.forEach((n, i) => {
        const v = m[i + 1];
        const val = n.verbatim ? v : (c.exact.has(v.trim()) ? c.exact.get(v.trim()) : depth < 2 ? phrase(v, depth + 1) : v);
        out = out.split(`{${n.name}}`).join(val).split(`{=${n.name}}`).join(val).split(`{#${n.name}}`).join(val);
      });
      return out;
    }
    if (lang !== 'en' && lang !== 'en-GB' && depth === 0 && !c.outputs.has(s) && (s.match(/[A-Za-z]{2,}/g) || []).length >= 1) missing.add(s);
    return s;
  }

  /* Notes: {♪D} in translations, and E2 / F♯3 / B♭1 anywhere. */
  const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function pitchTokens(s, bare) {
    const N = NT();
    if (!N) return s.replace(/\{♪([A-G])([♯♭]?)\}/g, '$1$2');
    s = s.replace(/\{♪([A-G])([♯♭]?)\}/g, (_, l, acc) => N.pitchClass(PITCH_CLASS[l] + (acc === '♯' ? 1 : acc === '♭' ? -1 : 0), acc === '♭', false));
    if (N.system === 'us' || N.system === 'uk') { if (N.ownSystem === 'us' || N.ownSystem === 'uk') return s; }
    return s.replace(/(^|[^\wÀ-ÿ♯♭])([A-G])([♯♭]?)(\d)(?![\w])/g, (all, pre, l, acc, oct) => {
      const midi = (parseInt(oct, 10) + 1) * 12 + PITCH_CLASS[l] + (acc === '♯' ? 1 : acc === '♭' ? -1 : 0);
      const d = N.display(midi, acc === '♭');
      return d ? pre + (bare ? d.text : d.full) : all;
    });
  }

  /* The text to show for an English source, in the current language and notation. */
  function tr(src, opts = {}) {
    if (src == null) return src;
    const s = String(src);
    if ((!LETTERS.test(s) || UNITS_ONLY(s)) && s.indexOf('{♪') < 0) return s;
    const bare = !!opts.bare;
    const ck = (bare ? 'b' : 'g') + s;
    if (cache.has(ck)) return cache.get(ck);
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s);
    const out = m[1] + pitchTokens(phrase(m[2]), bare) + m[3];
    if (cache.size > 4000) cache.clear();
    cache.set(ck, out);
    return out;
  }
  /* For code that builds a sentence itself: the translated template with {name} values,
     e.g. t('This browser kept {list} on.', { list }). */
  function t(src, vars) {
    const c = compile();
    let s = c.exact.has(src) ? c.exact.get(src) : src;
    if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k])).split(`{=${k}}`).join(String(vars[k])).split(`{#${k}}`).join(String(vars[k]));
    return pitchTokens(s, false);
  }
  /* "a, b and c" in the current language. */
  function list(items) {
    try { return new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(items); }
    catch (e) { return items.length > 1 ? items.slice(0, -1).join(', ') + ' & ' + items[items.length - 1] : items.join(''); }
  }

  /* ---------------- the page ---------------- */
  const ATTRS = ['data-help', 'aria-label', 'placeholder', 'title', 'alt', 'aria-valuetext'];
  /* text inside translate="no" / data-i18n="off" is left alone; data-i18n="text-off" keeps the
     element's text (set by the code, e.g. the tuner's big note) but translates its attributes */
  const SKIP_TEXT = 'script,style,textarea,[translate="no"],[data-i18n="off"],[data-i18n="text-off"]';
  const SKIP_ATTR = 'script,style,[translate="no"],[data-i18n="off"]';
  const textRec = new WeakMap();      // Text → { src, out }
  const attrRec = new WeakMap();      // Element → { attr: { src, out } }
  const skipped = (el) => !el || !!el.closest(SKIP_TEXT);
  const skippedAttr = (el) => !el || !!el.closest(SKIP_ATTR);
  const isBare = (el) => !!(el && el.closest('[data-pitch="bare"]'));

  function doText(node, force) {
    const el = node.parentElement;
    if (skipped(el)) return;
    const cur = node.nodeValue;
    const rec = textRec.get(node);
    let src = cur;
    if (rec && rec.out === cur) { if (!force) return; src = rec.src; }   // our own text
    const out = tr(src, { bare: isBare(el) });
    textRec.set(node, { src, out });
    if (out !== cur) node.nodeValue = out;
  }
  function doAttr(el, name, force) {
    if (skippedAttr(el) || !el.hasAttribute(name)) return;
    const cur = el.getAttribute(name);
    let recs = attrRec.get(el);
    const rec = recs && recs[name];
    let src = cur;
    if (rec && rec.out === cur) { if (!force) return; src = rec.src; }
    const out = tr(src, { bare: isBare(el) });
    if (!recs) { recs = {}; attrRec.set(el, recs); }
    recs[name] = { src, out };
    if (out !== cur) el.setAttribute(name, out);
  }
  function walk(rootNode, force) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) { doText(rootNode, force); return; }
    if (rootNode.nodeType !== 1 && rootNode.nodeType !== 9 && rootNode.nodeType !== 11) return;
    const start = rootNode.nodeType === 9 ? rootNode.body : rootNode;
    if (!start) return;
    if (start.nodeType === 1) for (const a of ATTRS) doAttr(start, a, force);
    const tw = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (n.nodeType === 3) { if (n.nodeValue.trim()) doText(n, force); }
      else for (const a of ATTRS) if (n.hasAttribute(a)) doAttr(n, a, force);
    }
  }
  function onMutations(list) {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
      else for (const n of m.addedNodes) walk(n);
    }
  }

  /* Starts translating the page; call once, before the app builds its interface. */
  function start() {
    if (started || !root.document) return;
    started = true;
    walk(document);
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  /* ---------------- language ---------------- */
  const waiting = new Map();
  /* Loads js/locale-<id>.js once (it calls MN.i18n.add). Resolves when the table is in. */
  function ensure(l) {
    if (l === 'en' || l === 'en-GB' || has(l) || !root.document) return Promise.resolve(true);   // English is always loaded (js/locale-en.js)
    return new Promise((resolve) => {
      const done = (ok) => { clearTimeout(timer); resolve(ok); };
      const timer = setTimeout(() => done(false), 8000);
      if (!waiting.has(l)) {
        waiting.set(l, []);
        const s = document.createElement('script');
        s.src = scriptBase() + 'locale-' + l + '.js';
        s.onerror = () => { const w = waiting.get(l) || []; waiting.delete(l); w.forEach((fn) => fn(false)); };
        document.head.appendChild(s);
      }
      waiting.get(l).push((ok) => done(ok !== false));
    });
  }
  function scriptBase() {
    const me = document.querySelector('script[src*="i18n.js"]');
    return me ? me.getAttribute('src').replace(/i18n\.js.*$/, '') : 'js/';
  }

  /* Language and notation together, so the page is re-translated once. */
  async function set(l, system) {
    const N = NT();
    const ids = N ? N.LANG_IDS : ['en'];
    l = ids.includes(l) ? l : 'en';
    const ok = await ensure(l);
    if (!ok) l = 'en';
    if (N) N.configure({ lang: l, system });
    lang = l;
    compiled = null; cache.clear(); missing.clear();
    if (root.document) {
      document.documentElement.lang = l;
      if (started) walk(document, true);
      document.documentElement.classList.remove('i18n-pending');
    }
    for (const fn of listeners) { try { fn(l); } catch (e) { console.error(e); } }
    return l;
  }
  /* Is this text English that should have been translated? (for the tests) */
  function leftover(s) {
    const x = String(s).trim();
    if (!x || !LETTERS.test(x) || UNTRANSLATED_UNITS(x)) return false;
    const saved = Array.from(missing);
    const out = phrase(x);
    missing.clear(); saved.forEach((m) => missing.add(m));
    return out !== x;
  }
  const UNTRANSLATED_UNITS = (x) => UNITS_ONLY(x);
  /* The English an attribute or text node was written in, for code that builds new text
     from what is on the page. */
  function source(el, attr) {
    if (!el) return null;
    if (!attr) { const t = el.nodeType === 3 ? el : el.firstChild; const r = t && textRec.get(t); return r ? r.src : el.textContent; }
    const recs = attrRec.get(el), r = recs && recs[attr];
    return r && r.out === el.getAttribute(attr) ? r.src : el.getAttribute(attr);
  }
  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  MN.i18n = {
    add, has, ensure, set, start, tr, t, list, source, leftover, onChange, compile,
    get lang() { return lang; },
    get missing() { return Array.from(missing); },
    TABLES,
  };

  /* Before the first paint: the saved (or browser) language is applied at once. While a
     language file loads, the page stays hidden for at most 1.5 s instead of flashing
     English. */
  if (root.document && NT()) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem('metronome.v1.settings') || '{}') || {}; } catch (e) { saved = {}; }
    const p = NT().resolvePrefs(saved);
    NT().configure({ lang: p.lang, system: p.notation });
    lang = p.lang;
    document.documentElement.lang = lang;
    if (lang !== 'en' && !has(lang)) {
      document.documentElement.classList.add('i18n-pending');
      setTimeout(() => document.documentElement.classList.remove('i18n-pending'), 1500);
      ensure(lang).then((ok) => { if (!ok) lang = 'en'; compiled = null; cache.clear(); if (started) walk(document, true); document.documentElement.classList.remove('i18n-pending'); for (const fn of listeners) { try { fn(lang); } catch (e) {} } });
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
