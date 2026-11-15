# Languages and notation

The app speaks English, British English, Spanish, German, Italian, French and Dutch. Language and music notation are two separate settings (Settings › Language, Settings › Music notation).

## How translation works

- The markup and the code are written in English. English text **is** the key.
- `js/i18n.js` watches the page (a `MutationObserver`) and replaces English text nodes and the attributes `data-help`, `aria-label`, `placeholder`, `title`, `alt` and `aria-valuetext` with the current language's version. It remembers the English original, so switching language re-translates instantly without reloading.
- Each language is a table in `js/locale-<id>.js`: `MN.i18n.add('fr', { 'English text': 'texte français', … })`. Only the chosen language file is loaded (same-origin `<script>`, allowed by the content security policy). `build.js` inlines every table into the single-file build.
- `js/locale-en.js` holds English entries that name notes (so "Drop D" follows the notation) and the British spellings (`en-GB`). It is always loaded and is the fallback for every language.
- Help hints written as `Title::Body` are translated as two parts.
- Opt-outs: `translate="no"` (text and attributes untouched: user names, numbers, device names), `data-i18n="off"`, and `data-i18n="text-off"` (text untouched, attributes still translated).

### Placeholders

Text built in code uses templates, written the same way in every table:

| In the key | Meaning |
| --- | --- |
| `{name}` | any text; translated too if it's a known phrase |
| `{=name}` | inserted as it is (a note name, a user's preset name) |
| `{#name}` | a number |
| `{♪D}`, `{♪F♯}`, `{♪B♭}` | a note name without octave, written in the current notation |

Every translation must use exactly the placeholders of its key (the tests check this).

## Notation

`js/notation.js` defines the systems:

| System | Note names | B♮ / B♭ | Quarter note |
| --- | --- | --- | --- |
| American | C D E F G A B | B / B♭ | quarter note |
| British | C D E F G A B | B / B♭ | crotchet |
| German | C D E F G A H | H / B | Viertelnote |
| Dutch | C D E F G A B, -is / -es | B / Bes | kwartnoot |
| Italian, Spanish | Do Re Mi Fa Sol La Si | Si / Si♭ | semiminima, negra |
| French | Do Ré Mi Fa Sol La Si | Si / Si♭ | noire |

"Same as the language" uses the language's own system. Choosing another system adds the language's name in parentheses:

- note names: the system's name first, the language's in parentheses — Spanish with German notation shows **H (Si)**, **Fis (Fa♯)**;
- note values: the language's word first, the system's in parentheses — **negra (Viertelnote)**, British English with German notation **crotchet (Viertelnote)**.

Names that differ only by an accent (Re, Ré) get no parentheses. Lists of notes (strings, measurements, chips) show the bare names. Octaves use scientific numbering everywhere: middle C is C4, Do4, C4.

Any note written in text with an octave (`E2`, `F♯3`, `B♭1`) is rewritten into the current notation automatically, so tables and messages only need `{♪…}` for notes without an octave. Tunings are stored in English letters, whatever the display.

## Adding or correcting a language

1. Copy `js/locale-es.js` to `js/locale-<id>.js` and translate the values. Keep every key and placeholder.
2. Add the language to `LANGS` (its name in its own language and its default system) and to `detect()` in `js/notation.js`; add its note values (`VALUES`, `DOTTED`, `SUBS`) and article (`ARTICLE`), and a new system in `SYSTEMS`/`PITCH` if it names notes differently.
3. Add the id to the default `LANGS` in `tests/i18n.test.js` and run `npm test`. The test lists any string on the page or in the code that has no translation.
4. Check it in the browser at phone width: long words wrap, but very long note names (Sol♯) need the `.long` styles.

## The floating metronome

The pop-out window of the floating metronome (`js/mini.js`) is a separate document that the page translator doesn't watch, so the widget is marked `data-i18n="off"` and its labels are translated in code with `MN.i18n.tr()`. Those labels are ordinary entries in the locale files; `tests/i18n.test.js` collects every `tr('…')` string from the code, so a new label without translations fails the test.
