/* notation.js — the musical vocabulary of each language: note names (C D E… / Do Re Mi…,
   German H and B, the -is/-es endings) and note values (quarter note, crotchet, negra,
   Viertelnote…). Pure functions, no DOM, so the tests can run them in node.

   Two settings decide what appears:
     • the interface language (en, en-GB, es, de, it, fr, nl), and
     • the notation system: 'auto' (the language's own convention) or any system by id.
   When the chosen system is not the language's own, both are shown, so a musician can
   learn another country's vocabulary without changing the interface language:
     • note names: the system's name first, the language's in parentheses — "H (Si)";
     • note values: the language's word first, the system's in parentheses —
       "negra (Viertelnote)", "crotchet (Viertelnote)".
   Octaves always use scientific pitch numbering (middle C = C4), the convention of
   electronic tuners everywhere, so "E2" is the low E string in every language. */
(function (root) {
  const MN = (root.MN = root.MN || {});

  /* ---- languages ---- */
  const LANGS = [
    { id: 'en', name: 'English (US)', system: 'us' },
    { id: 'en-GB', name: 'English (UK)', system: 'uk' },
    { id: 'es', name: 'Español', system: 'es' },
    { id: 'de', name: 'Deutsch', system: 'de' },
    { id: 'it', name: 'Italiano', system: 'it' },
    { id: 'fr', name: 'Français', system: 'fr' },
    { id: 'nl', name: 'Nederlands', system: 'nl' },
  ];
  const LANG_IDS = LANGS.map((l) => l.id);
  const langInfo = (id) => LANGS.find((l) => l.id === id) || LANGS[0];

  /* ---- note-name systems ----
     names[pc] for the 12 pitch classes, spelled with sharps and with flats. Letter systems
     keep the accidental as a separate symbol (C + ♯); German and Dutch spell it into the
     name (Cis, Es), so the accidental part is empty. */
  const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const NAT_PC = [0, 2, 4, 5, 7, 9, 11];
  function symbolic(naturals) {
    const sharp = [], flat = [];
    for (let pc = 0; pc < 12; pc++) {
      const i = NAT_PC.indexOf(pc);
      if (i >= 0) { sharp[pc] = flat[pc] = [naturals[i], '']; continue; }
      sharp[pc] = [naturals[NAT_PC.indexOf(pc - 1)], '♯'];
      flat[pc] = [naturals[NAT_PC.indexOf(pc + 1)], '♭'];
    }
    return { sharp, flat };
  }
  const word = (list) => list.map((n) => [n, '']);
  const PITCH = {
    letters: symbolic(LETTERS),
    solfege: symbolic(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']),
    solfegeFr: symbolic(['Do', 'Ré', 'Mi', 'Fa', 'Sol', 'La', 'Si']),
    german: {
      sharp: word(['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'Ais', 'H']),
      flat: word(['C', 'Des', 'D', 'Es', 'E', 'F', 'Ges', 'G', 'As', 'A', 'B', 'H']),
    },
    dutch: {
      sharp: word(['C', 'Cis', 'D', 'Dis', 'E', 'F', 'Fis', 'G', 'Gis', 'A', 'Ais', 'B']),
      flat: word(['C', 'Des', 'D', 'Es', 'E', 'F', 'Ges', 'G', 'As', 'A', 'Bes', 'B']),
    },
  };

  /* ---- note values ----
     [singular, plural] for each denominator; dotted forms per language grammar. */
  const VALUES = {
    us: { 1: ['whole note', 'whole notes'], 2: ['half note', 'half notes'], 4: ['quarter note', 'quarter notes'], 8: ['eighth note', 'eighth notes'], 16: ['sixteenth note', 'sixteenth notes'], 32: ['thirty-second note', 'thirty-second notes'], 64: ['sixty-fourth note', 'sixty-fourth notes'] },
    uk: { 1: ['semibreve', 'semibreves'], 2: ['minim', 'minims'], 4: ['crotchet', 'crotchets'], 8: ['quaver', 'quavers'], 16: ['semiquaver', 'semiquavers'], 32: ['demisemiquaver', 'demisemiquavers'], 64: ['hemidemisemiquaver', 'hemidemisemiquavers'] },
    de: { 1: ['ganze Note', 'ganze Noten'], 2: ['halbe Note', 'halbe Noten'], 4: ['Viertelnote', 'Viertelnoten'], 8: ['Achtelnote', 'Achtelnoten'], 16: ['Sechzehntelnote', 'Sechzehntelnoten'], 32: ['Zweiunddreißigstelnote', 'Zweiunddreißigstelnoten'], 64: ['Vierundsechzigstelnote', 'Vierundsechzigstelnoten'] },
    nl: { 1: ['hele noot', 'hele noten'], 2: ['halve noot', 'halve noten'], 4: ['kwartnoot', 'kwartnoten'], 8: ['achtste noot', 'achtste noten'], 16: ['zestiende noot', 'zestiende noten'], 32: ['tweeëndertigste noot', 'tweeëndertigste noten'], 64: ['vierenzestigste noot', 'vierenzestigste noten'] },
    it: { 1: ['semibreve', 'semibrevi'], 2: ['minima', 'minime'], 4: ['semiminima', 'semiminime'], 8: ['croma', 'crome'], 16: ['semicroma', 'semicrome'], 32: ['biscroma', 'biscrome'], 64: ['semibiscroma', 'semibiscrome'] },
    fr: { 1: ['ronde', 'rondes'], 2: ['blanche', 'blanches'], 4: ['noire', 'noires'], 8: ['croche', 'croches'], 16: ['double croche', 'doubles croches'], 32: ['triple croche', 'triples croches'], 64: ['quadruple croche', 'quadruples croches'] },
    es: { 1: ['redonda', 'redondas'], 2: ['blanca', 'blancas'], 4: ['negra', 'negras'], 8: ['corchea', 'corcheas'], 16: ['semicorchea', 'semicorcheas'], 32: ['fusa', 'fusas'], 64: ['semifusa', 'semifusas'] },
  };
  const DOTTED = {
    us: (s) => 'dotted ' + s, uk: (s) => 'dotted ' + s,
    de: (s, pl) => 'punktierte ' + s,                       // eine punktierte Viertelnote · punktierte Achtelnoten
    nl: (s) => 'gepunteerde ' + s,
    it: (s, pl) => s + (pl ? ' puntate' : ' puntata'),     // every Italian value name is feminine
    fr: (s, pl) => s + (pl ? ' pointées' : ' pointée'),    // as is every French one
    es: (s) => s + ' con puntillo',
  };
  /* Subdivision buttons, with a quarter-note beat: [button label, phrase used in sentences]. */
  const SUBS = {
    us: { 1: ['Quarters', 'quarter notes'], 2: ['Eighths', 'eighth notes'], 3: ['Triplets', 'eighth-note triplets'], 4: ['Sixteenths', 'sixteenth notes'], 6: ['Sextuplets', 'sixteenth-note sextuplets'], 8: ['Thirty-seconds', 'thirty-second notes'] },
    uk: { 1: ['Crotchets', 'crotchets'], 2: ['Quavers', 'quavers'], 3: ['Triplets', 'quaver triplets'], 4: ['Semiquavers', 'semiquavers'], 6: ['Sextuplets', 'semiquaver sextuplets'], 8: ['Demisemiquavers', 'demisemiquavers'] },
    de: { 1: ['Viertel', 'Viertelnoten'], 2: ['Achtel', 'Achtelnoten'], 3: ['Triolen', 'Achteltriolen'], 4: ['Sechzehntel', 'Sechzehntelnoten'], 6: ['Sextolen', 'Sechzehntelsextolen'], 8: ['Zweiunddreißigstel', 'Zweiunddreißigstelnoten'] },
    nl: { 1: ['Kwarten', 'kwartnoten'], 2: ['Achtsten', 'achtste noten'], 3: ['Triolen', 'triolen van achtste noten'], 4: ['Zestienden', 'zestiende noten'], 6: ['Sextolen', 'sextolen van zestiende noten'], 8: ['Tweeëndertigsten', 'tweeëndertigste noten'] },
    it: { 1: ['Semiminime', 'semiminime'], 2: ['Crome', 'crome'], 3: ['Terzine', 'terzine di crome'], 4: ['Semicrome', 'semicrome'], 6: ['Sestine', 'sestine di semicrome'], 8: ['Biscrome', 'biscrome'] },
    fr: { 1: ['Noires', 'noires'], 2: ['Croches', 'croches'], 3: ['Triolets', 'triolets de croches'], 4: ['Doubles croches', 'doubles croches'], 6: ['Sextolets', 'sextolets de doubles croches'], 8: ['Triples croches', 'triples croches'] },
    es: { 1: ['Negras', 'negras'], 2: ['Corcheas', 'corcheas'], 3: ['Tresillos', 'tresillos de corcheas'], 4: ['Semicorcheas', 'semicorcheas'], 6: ['Seisillos', 'seisillos de semicorcheas'], 8: ['Fusas', 'fusas'] },
  };
  /* The indefinite article for a value name in each language. Every value name in the
     Romance languages and German is feminine, so one article is enough. */
  const ARTICLE = {
    en: (p) => (/^[aeiou]/i.test(p) ? 'an ' : 'a ') + p,
    es: (p) => 'una ' + p, it: (p) => 'una ' + p, fr: (p) => 'une ' + p, de: (p) => 'eine ' + p, nl: (p) => 'een ' + p,
  };

  /* ---- systems ---- */
  const SYSTEMS = {
    us: { id: 'us', pitch: 'letters', values: 'us', lang: 'en' },
    uk: { id: 'uk', pitch: 'letters', values: 'uk', lang: 'en-GB' },
    de: { id: 'de', pitch: 'german', values: 'de', lang: 'de' },
    nl: { id: 'nl', pitch: 'dutch', values: 'nl', lang: 'nl' },
    it: { id: 'it', pitch: 'solfege', values: 'it', lang: 'it' },
    fr: { id: 'fr', pitch: 'solfegeFr', values: 'fr', lang: 'fr' },
    es: { id: 'es', pitch: 'solfege', values: 'es', lang: 'es' },
  };
  const SYSTEM_IDS = Object.keys(SYSTEMS);

  /* ---- state ---- */
  let lang = 'en', choice = 'auto';
  const sysOf = (l) => langInfo(l).system;
  const ownSys = () => SYSTEMS[sysOf(lang)];                                   // the language's own convention
  const curSys = () => SYSTEMS[choice === 'auto' ? sysOf(lang) : choice];       // what is in use

  function configure({ lang: l, system } = {}) {
    if (l !== undefined) lang = LANG_IDS.includes(l) ? l : 'en';
    if (system !== undefined) choice = system === 'auto' || SYSTEMS[system] ? system : 'auto';
    return { lang, system: choice, resolved: curSys().id };
  }

  /* ---- note names ---- */
  /* "Re" and "Ré" are the same name to a reader: no gloss for an accent alone. */
  const plain = (x) => String(x).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const sameName = (a, b) => plain(a) === plain(b);
  const pcOf = (midi) => ((Math.round(midi) % 12) + 12) % 12;
  function partsIn(sys, midi, flats) {
    const [letter, accidental] = PITCH[sys.pitch][flats ? 'flat' : 'sharp'][pcOf(midi)];
    return { letter, accidental, name: letter + accidental };
  }
  /* Display parts of a MIDI note in the system in use, with the language's own name as a
     gloss when they differ:
       { letter, accidental, octave, text: 'H3', gloss: 'Si', glossText: 'Si3', full: 'H3 (Si3)' } */
  function display(midi, flats = false) {
    if (typeof midi !== 'number' || !Number.isFinite(midi)) return null;
    const m = Math.round(midi), octave = Math.floor(m / 12) - 1;
    const p = partsIn(curSys(), m, flats), own = partsIn(ownSys(), m, flats);
    const gloss = sameName(own.name, p.name) ? '' : own.name;
    const text = p.name + octave, glossText = gloss ? gloss + octave : '';
    return { letter: p.letter, accidental: p.accidental, octave, pc: pcOf(m), name: p.name, text, gloss, glossText, full: gloss ? `${text} (${glossText})` : text };
  }
  /* A pitch class without octave ("D", "Re", "Fis"), optionally with the gloss. */
  function pitchClass(pc, flats = false, withGloss = false) {
    const p = partsIn(curSys(), pc, flats), own = partsIn(ownSys(), pc, flats);
    return withGloss && !sameName(own.name, p.name) ? `${p.name} (${own.name})` : p.name;
  }
  /* The 12 pitch-class names in the system in use, e.g. for a note picker. */
  const pitchNames = (flats = false, withGloss = false) => Array.from({ length: 12 }, (_, pc) => pitchClass(pc, flats, withGloss));

  /* Reads a note written in the system in use or in English letters: "Fis3", "H2",
     "Sol♯3", "Ré4", "B♭1". German B is B♭ (and Dutch Bes) only in those systems, so a
     German musician can type the names they know. Returns a MIDI number or null. */
  function parseNote(text) {
    if (typeof text !== 'string') return null;
    const t = text.trim().replace(/\s+/g, '').replace(/♮/g, '');
    const m = /^(.*?)(-?\d)$/.exec(t);
    if (!m || !m[1]) return null;
    const head = m[1], octave = parseInt(m[2], 10);
    const pc = parsePitchClass(head);
    if (pc === null) return null;
    const midi = (octave + 1) * 12 + pc.pc + pc.shift;
    return midi >= 12 && midi <= 108 ? midi : null;
  }
  function parsePitchClass(head) {
    const sys = curSys();
    const low = head.toLowerCase(), norm = low.replace(/#/g, '♯');
    /* 1. the exact names of the system in use (Cis, Es, B = B♭ in German, Sol♯…) */
    for (const flats of [false, true]) {
      const list = PITCH[sys.pitch][flats ? 'flat' : 'sharp'];
      for (let pc = 0; pc < 12; pc++) if (list[pc][0].toLowerCase() + list[pc][1] === norm) return { pc, shift: 0 };
    }
    /* 2. solfège with an accidental (Do#, Réb, sol♭) */
    const sol = /^(do|ut|re|ré|mi|fa|sol|la|si)(♯|#|♭|b|x|𝄪|𝄫|bb)?$/.exec(low);
    if (sol) {
      const base = { do: 0, ut: 0, re: 2, 'ré': 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 }[sol[1]];
      return { pc: base, shift: accShift(sol[2]) };
    }
    /* 3. German/Dutch suffixes on any letter (cis, es, as, bes, his, eses…) */
    const gd = /^([a-h])((?:is|es|s)*)$/.exec(low);
    if (gd && (sys.pitch === 'german' || sys.pitch === 'dutch') && gd[2]) {
      let base = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11, h: 11 }[gd[1]];
      if (gd[1] === 'b' && sys.pitch === 'german') base = 10;                 // German B is B♭: "Bes" is not used
      const shift = (gd[2].match(/is/g) || []).length - (gd[2].replace(/is/g, '').match(/e?s/g) || []).length;
      return { pc: base, shift };
    }
    if (low === 'h' && (sys.pitch === 'german' || lang === 'de')) return { pc: 11, shift: 0 };   // H is B natural in German
    /* 4. English letters with an accidental (the app's own storage format) */
    const en = /^([a-g])(♯|#|♭|b|x|𝄪|𝄫|bb)?$/.exec(low);
    if (en) {
      let base = LETTERS.indexOf(en[1].toUpperCase());
      base = NAT_PC[base];
      if (en[1] === 'b' && !en[2] && sys.pitch === 'german') base = 10;       // plain B typed in German means B♭
      return { pc: base, shift: accShift(en[2]) };
    }
    return null;
  }
  const accShift = (a) => ({ '♯': 1, '#': 1, '♭': -1, b: -1, x: 2, '𝄪': 2, '𝄫': -2, bb: -2 }[a || ''] || 0);

  /* ---- note values ---- */
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  /* Lower-case a label for use mid-sentence; German nouns keep their capital. */
  const lower = (s, sysId) => (sysId === 'de' ? s : s.toLowerCase());
  function valueIn(sysId, den, o = {}) {
    const table = VALUES[sysId] || VALUES.us;
    const pair = table[den] || table[4];
    let s = pair[o.plural ? 1 : 0];
    if (o.dotted) s = DOTTED[sysId](s, !!o.plural);
    return s;
  }
  /* "quarter note", "negra (Viertelnote)", "crotchet (Viertelnote)"…
     options: plural, dotted, capital. The language's word first, the system's beside it. */
  function note(den, o = {}) {
    const main = valueIn(ownSys().values, den, o), other = valueIn(curSys().values, den, o);
    const s = sameName(other, main) ? main : `${main} (${other})`;
    return o.capital ? cap(s) : s;
  }
  /* With the indefinite article of the interface language: "a quarter note", "una negra". */
  function a(phrase) { return (ARTICLE[lang.slice(0, 2)] || ARTICLE.en)(phrase); }
  /* Subdivision button: [label, second line (the system's word) or ''] */
  function subLabel(n) {
    const main = (SUBS[ownSys().values][n] || SUBS.us[1])[0], other = (SUBS[curSys().values][n] || SUBS.us[1])[0];
    return [main, sameName(other, main) ? '' : lower(other, curSys().values)];
  }
  /* One line, e.g. for the practice log: "sixteenths (semiquavers)" */
  function subName(n) { const [m, o] = subLabel(n), lm = lower(m, ownSys().values); return o ? `${lm} (${o})` : lm; }
  /* In a sentence: "sixteenth notes", "semicorcheas (Sechzehntelnoten)" */
  function subLong(n) {
    const main = (SUBS[ownSys().values][n] || SUBS.us[1])[1], other = (SUBS[curSys().values][n] || SUBS.us[1])[1];
    return sameName(other, main) ? main : `${main} (${other})`;
  }

  /* ---- languages from the browser ---- */
  function detect(langs) {
    const list = (langs || (root.navigator && (root.navigator.languages || [root.navigator.language])) || []).map((l) => String(l || '').toLowerCase());
    for (const l of list) {
      if (/^en-(gb|ie|au|nz|za|in|sg|hk|mt|jm|ng|ke)/.test(l)) return 'en-GB';
      if (l.startsWith('en')) return 'en';
      for (const id of ['es', 'de', 'it', 'fr', 'nl']) if (l === id || l.startsWith(id + '-')) return id;
    }
    return 'en';
  }

  /* The language and notation to use, from saved settings (or the browser on a first
     visit). Settings from before 2.2 had only "terms": us / uk / both (American names
     with the British beside them), which map onto English and its notation systems. */
  function resolvePrefs(saved) {
    const s = saved && typeof saved === 'object' ? saved : {};
    let l = LANG_IDS.includes(s.lang) ? s.lang : null;
    let sys = s.notation === 'auto' || SYSTEMS[s.notation] ? s.notation : 'auto';
    if (!l) {
      l = detect();
      if (l === 'en' || l === 'en-GB') {
        if (s.terms === 'uk') l = 'en-GB';
        else if (s.terms === 'us') l = 'en';
        else if (s.terms === 'both') { l = 'en'; sys = 'uk'; }
      }
    }
    return { lang: l, notation: sys };
  }

  /* Summary of a system for the preferences: naturals and two chromatic notes, and values. */
  function systemSample(sysId) {
    const sys = SYSTEMS[sysId] || curSys();
    const nat = NAT_PC.map((pc) => partsIn(sys, pc, false).name);
    return { notes: nat.join(' '), sharp: partsIn(sys, 6, false).name, flat: partsIn(sys, 10, true).name, quarter: valueIn(sys.values, 4), eighth: valueIn(sys.values, 8) };
  }

  MN.notation = {
    LANGS, LANG_IDS, SYSTEMS, SYSTEM_IDS, PITCH, VALUES, SUBS,
    configure, detect, resolvePrefs, langInfo, systemSample,
    display, pitchClass, pitchNames, parseNote,
    note, a, subLabel, subName, subLong,
    get lang() { return lang; },
    get choice() { return choice; },
    get system() { return curSys().id; },
    get ownSystem() { return ownSys().id; },
    get differs() { return curSys().id !== ownSys().id; },
  };
  /* The metronome code calls these through MN.terms (its original name). */
  MN.terms = MN.notation;
})(typeof window !== 'undefined' ? window : globalThis);
