/* Run: node tests/i18n.test.js
   Every language must translate everything the app can show:
     • all text and readable attributes in index.html and privacy.html (taken from the files
       themselves, so a new string without translations fails here);
     • instrument, tuning, sound and palette names, and the tuner's error messages;
     • the same keys in every language, with the same {placeholders} on both sides.
   The translation engine itself (patterns, notes in sentences, German H/B…) is checked too. */
const fs = require('fs'), path = require('path'), assert = require('assert');
global.window = global;
const ROOT = path.join(__dirname, '..');
for (const f of ['notation.js', 'i18n.js', 'locale-en.js']) require(path.join(ROOT, 'js', f));
const LANGS = (process.env.LANGS || 'es,de,it,fr,nl').split(',');
for (const l of LANGS) require(path.join(ROOT, 'js', `locale-${l}.js`));
for (const f of ['notes.js', 'tunings.js', 'sounds.js', 'themes.js']) require(path.join(ROOT, 'js', f));
const I = MN.i18n, NT = MN.notation;
let n = 0; const ok = (name) => { n++; console.log('ok —', name); };

/* ---- what has to be translated ---- */
function htmlStrings(file) {
  let s = fs.readFileSync(path.join(ROOT, file), 'utf8');
  s = s.replace(/<head>[\s\S]*?<\/head>/, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const out = new Set();
  const dec = (x) => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  const add = (x) => { for (const part of dec(x).split('::')) { const t = part.trim(); if (/[A-Za-z]{2}/.test(t)) out.add(t); } };
  /* attributes people read or hear, except inside translate="no" (handled by skipping those tags' text below) */
  for (const m of s.matchAll(/\s(data-help|aria-label|placeholder|title|alt)="([^"]*)"/g)) add(m[2]);
  /* text between tags, skipping elements marked translate="no" */
  const noTr = /<([a-z0-9]+)[^>]*translate="no"[^>]*>[\s\S]*?<\/\1>/g;
  for (const m of s.replace(noTr, '').replace(/<[^>]+>/g, '\u0000').split('\u0000')) add(m);
  return out;
}
const UNTRANSLATED_OK = new Set(['Metronome & Tuner', 'Hz', 'BPM', 'Moderato', 'TAP', 'Instagram', 'X (Twitter)', 'Nashville high strung', 'DADGAD', 'Vintage', 'Banjo', 'Marimba', 'Luthier', 'Esc', 'Total', 'Solo', 'Viola', 'Normal', 'Simple', 'Manual', 'Auto', 'Tempo', 'Swing', 'Shuffle', 'Visual', 'min', 'Cents', 'Contact', 'Version', 'Notes']);
const required = new Set([...htmlStrings('index.html'), ...htmlStrings('privacy.html')]);
for (const inst of MN.tunings.INSTRUMENTS) {
  required.add(inst.name); required.add(inst.blurb);
  for (const t of inst.tunings) { required.add(t.name); if (t.alias) required.add(t.alias); if (t.meta) required.add(t.meta); }
}
required.add(MN.tunings.CUSTOM_INSTRUMENT.name);
for (const v of MN.sounds.VOICES) { required.add(v.name); required.add(v.desc); }
for (const p of MN.themes.PALETTES) { required.add(p.name); required.add(p.blurb); }
/* sentences from the code: the tuner's messages, exactly as written there */
for (const f of ['tuner-audio.js', 'tuner-engine.js', 'tuner-ui.js', 'ui.js', 'tunings.js', 'mini.js']) {
  const src = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8');
  for (const m of src.matchAll(/(?:TunerError\('[a-z]+', |toast\(|textContent = |errors\.push\(|\btr\()'([^'\\]*(?:\\.[^'\\]*)*)'/g)) if (/[A-Za-z]{3}/.test(m[1]) && !/^[#.]/.test(m[1])) required.add(m[1]);
}
/* fragments the code completes before showing them */
const FRAGMENTS = new Set(['The microphone could not be started']);
[...required].forEach((k) => { if (!/[A-Za-z]{2}/.test(k) || /^\{.*\}$/.test(k) || FRAGMENTS.has(k)) required.delete(k); });

/* ---- tests ---- */
(async () => {
  /* 1. every language has the same keys, and each translation keeps its placeholders */
  const keysOf = (l) => new Set(Object.keys(I.TABLES[l]));
  const base = keysOf('es');
  for (const l of LANGS) {
    const k = keysOf(l);
    const missingKeys = [...base].filter((x) => !k.has(x)), extra = [...k].filter((x) => !base.has(x));
    assert.deepEqual([missingKeys, extra], [[], []], `${l}: keys differ from es\n  missing: ${missingKeys.join(' | ')}\n  extra: ${extra.join(' | ')}`);
    for (const [src, out] of Object.entries(I.TABLES[l])) {
      const names = (x) => [...x.matchAll(/\{[=#]?([a-zA-Z]\w*)\}/g)].map((m) => m[1]).sort().filter((v, i, a) => a.indexOf(v) === i);
      assert.deepEqual(names(out), names(src), `${l}: placeholders differ in “${src}” → “${out}”`);
      assert.ok(!/\{(?![=#]?[a-zA-Z]\w*\}|♪[A-G][♯♭]?\})/.test(out), `${l}: stray brace in “${out}”`);
      assert.ok(out.trim().length > 0, `${l}: empty translation for “${src}”`);
    }
  }
  ok(`${LANGS.length} languages × ${base.size} entries: same keys, same placeholders`);

  /* 2. everything the page and the data can show is translated in every language */
  for (const l of LANGS) {
    await I.set(l, 'auto');
    const gaps = [];
    for (const s of required) { I.tr(s); }
    for (const s of I.missing) if (!UNTRANSLATED_OK.has(s)) gaps.push(s);
    assert.deepEqual(gaps, [], `${l}: ${gaps.length} strings without a translation:\n  ${gaps.join('\n  ')}`);
  }
  ok(`all ${required.size} strings from the page, the data and the tuner's messages are translated in ${LANGS.join(', ')}`);

  /* 3. patterns, recursion, numbers */
  await I.set('es', 'auto');
  assert.equal(I.tr('Stage 3: 84 BPM'), 'Etapa 3: 84 BPM');
  assert.equal(I.tr('Guitar, my tuning'), 'Guitarra, mi afinación');            // {inst} is translated too
  assert.equal(I.tr('Tune up, about 2 semitones'), 'Sube la afinación, aprox. 2 semitonos');
  assert.equal(I.tr('Tune up, about 1 semitone'), 'Sube la afinación, aprox. 1 semitono');
  assert.equal(I.tr('Listening on Built-in Microphone.'), 'Escuchando en Built-in Microphone.');   // {=d} stays as written
  assert.equal(I.tr('  Target  '), '  Objetivo  ');                              // spacing kept
  assert.equal(I.tr('Signal quality: weak'), 'Calidad de la señal: débil');
  assert.equal(I.tr('−42 dB'), '−42 dB');
  assert.equal(I.tr('pan:L'), 'I');
  assert.equal(I.tr('Listen to the accent voice'), 'Escuchar la voz del acento');
  ok('patterns: numbers, translated and verbatim values, spacing, units');

  /* 4. notes inside sentences follow the notation, with the language's name in parentheses */
  assert.equal(I.tr('Play the E2 string'), 'Toca la cuerda Mi2');
  assert.equal(I.tr('B♭1 is in tune'), 'Si♭1 está afinada');
  assert.equal(I.tr('Drop D'), 'Drop Re');
  await I.set('es', 'de');                                                       // Spanish, German notation
  assert.equal(I.tr('Play the B3 string'), 'Toca la cuerda H3 (Si3)');
  assert.equal(I.tr('Play the B♭3 string'), 'Toca la cuerda B3 (Si♭3)');
  assert.equal(I.tr('Play the F♯3 string'), 'Toca la cuerda Fis3 (Fa♯3)');
  assert.equal(I.tr('E2 A2 D3 G3 B3 E4', { bare: true }), 'E2 A2 D3 G3 H3 E4');   // chips and tables: no parentheses
  await I.set('en-GB', 'de');                                                    // British English, German notation
  assert.equal(I.tr('Play the B3 string'), 'Play the H3 (B3) string');
  assert.equal(NT.note(4), 'crotchet (Viertelnote)');
  if (LANGS.includes('de')) {
    await I.set('de', 'auto');
    assert.equal(I.tr('Play the B3 string'), 'Spiele die H3-Saite');
    assert.equal(I.tr('Play the B♭3 string'), 'Spiele die B3-Saite');
  }
  await I.set('en', 'auto');
  assert.equal(I.tr('Play the B3 string'), 'Play the B3 string');
  assert.equal(I.tr('Drop D'), 'Drop D');
  await I.set('en', 'it');
  assert.equal(I.tr('Drop D'), 'Drop Re');
  assert.equal(I.tr('Middle C is C4.'), 'Middle Do is Do4 (C4).');
  ok('notes in text: German H and B, solfège, glosses in parentheses, bare names in chips');

  /* 5. the old American / British / Both setting moves over */
  const r = NT.resolvePrefs;
  const realDetect = NT.detect;
  assert.deepEqual(r({ lang: 'fr', notation: 'de' }), { lang: 'fr', notation: 'de' });
  assert.deepEqual(r({ lang: 'xx', notation: 'zz' }).notation, 'auto');
  ok('saved language and notation are validated; older settings migrate (see notation tests)');

  console.log(`\n${n} i18n tests passed`);
})().catch((e) => { console.error('FAIL —', e.message); process.exit(1); });
