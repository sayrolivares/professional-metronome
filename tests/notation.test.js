/* Run: node tests/notation.test.js
   Note names and note values in every notation system, the glosses shown in parentheses
   when the notation differs from the language, note parsing, and settings migration. */
const assert = require('assert');
require('../js/notation.js');
const N = globalThis.MN.notation;
const use = (lang, system = 'auto') => N.configure({ lang, system });
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('ok — ' + name); };

test('each language uses its own notation by default', () => {
  const B = (l) => { use(l); return [N.display(71, false).text, N.display(70, true).text, N.note(4)]; };
  assert.deepEqual(B('en'), ['B4', 'B♭4', 'quarter note']);
  assert.deepEqual(B('en-GB'), ['B4', 'B♭4', 'crotchet']);
  assert.deepEqual(B('de'), ['H4', 'B4', 'Viertelnote']);
  assert.deepEqual(B('nl'), ['B4', 'Bes4', 'kwartnoot']);
  assert.deepEqual(B('es'), ['Si4', 'Si♭4', 'negra']);
  assert.deepEqual(B('it'), ['Si4', 'Si♭4', 'semiminima']);
  assert.deepEqual(B('fr'), ['Si4', 'Si♭4', 'noire']);
  use('de'); assert.equal(N.pitchClass(6, false), 'Fis'); assert.equal(N.pitchClass(3, true), 'Es'); assert.equal(N.pitchClass(8, true), 'As');
});

test('another notation shows the language’s name in parentheses', () => {
  /* note names: the system’s name first, the language’s in parentheses */
  use('es', 'de');
  assert.equal(N.display(71, false).full, 'H4 (Si4)');
  assert.equal(N.pitchClass(10, true, true), 'B (Si♭)');
  assert.equal(N.pitchClass(6, false, true), 'Fis (Fa♯)');
  /* note values: the language’s word first, the system’s in parentheses */
  assert.equal(N.note(4), 'negra (Viertelnote)');
  assert.equal(N.a(N.note(4)), 'una negra (Viertelnote)');
  assert.deepEqual(N.subLabel(4), ['Semicorcheas', 'Sechzehntel']);
  use('en-GB', 'de');
  assert.equal(N.note(4), 'crotchet (Viertelnote)');
  assert.equal(N.display(71, false).full, 'H4 (B4)');
  use('en', 'uk');
  assert.equal(N.note(4), 'quarter note (crotchet)');
  assert.equal(N.subName(2), 'eighths (quavers)');
  assert.equal(N.display(71, false).full, 'B4', 'same letters: no gloss');
  /* names that differ only by an accent get no gloss */
  use('it', 'fr'); assert.equal(N.pitchClass(2, false, true), 'Ré');
});

test('note parsing accepts the system’s names and English', () => {
  use('es', 'de'); assert.equal(N.parseNote('H2'), 47);
  use('de'); assert.deepEqual(['H3', 'B3', 'Fis2', 'Es4', 'As1', 'E2'].map(N.parseNote), [59, 58, 42, 63, 32, 40]);
  use('es'); assert.deepEqual(['Si3', 'Sib3', 'Fa#2', 'E2', 'B♭1', 'sol4'].map(N.parseNote), [59, 58, 42, 40, 34, 67]);
  use('nl'); assert.deepEqual(['Bes3', 'B3', 'Cis4', 'As2'].map(N.parseNote), [58, 59, 61, 44]);
  use('en'); assert.equal(N.parseNote('H2'), null, 'H is not an English note name'); assert.equal(N.parseNote('X9'), null); assert.equal(N.parseNote('C9'), null);
});

test('language detection and migration of older settings', () => {
  assert.equal(N.detect(['es-CO']), 'es'); assert.equal(N.detect(['en-AU']), 'en-GB');
  assert.equal(N.detect(['nl-BE']), 'nl'); assert.equal(N.detect(['pt-BR']), 'en');
  assert.equal(N.detect(['pt-BR', 'fr-CA']), 'fr');
  assert.deepEqual(N.resolvePrefs({ lang: 'fr', notation: 'de' }), { lang: 'fr', notation: 'de' });
  const nav = globalThis.navigator;
  Object.defineProperty(globalThis, 'navigator', { value: { languages: ['en-US'] }, configurable: true });
  assert.deepEqual(N.resolvePrefs({ terms: 'both' }), { lang: 'en', notation: 'uk' });
  assert.deepEqual(N.resolvePrefs({ terms: 'uk' }), { lang: 'en-GB', notation: 'auto' });
  assert.deepEqual(N.resolvePrefs({ lang: 'xx', notation: 'zz' }), { lang: 'en', notation: 'auto' });
  Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true });
});

console.log(`\n${passed} notation tests passed`);
