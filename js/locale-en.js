/* locale-en.js — English needs no translation, but the text that names notes without an
   octave ("Drop D", "the A string") is written here with {♪…} so it follows the notation
   chosen in Preferences (Drop Re, Drop D…). It is also the fallback for every language.
   British English (en-GB) differs only in spelling and a few words, listed at the end. */
MN.i18n.add('en', {
  /* tunings and instruments */
  'Drop D': 'Drop {♪D}',
  'E♭ standard': '{♪E♭} standard',
  'D Standard': '{♪D} standard',
  'Drop C': 'Drop {♪C}',
  'Open D': 'Open {♪D}',
  'Open G': 'Open {♪G}',
  'Open E': 'Open {♪E}',
  'Open C': 'Open {♪C}',
  '4-string Drop D': '4-string Drop {♪D}',
  '5-string Drop A': '5-string Drop {♪A}',
  '5-string, low B': '5-string, low {♪B}',
  'Standard (high G)': 'Standard (high {♪G})',
  'Re-entrant: the G string is higher than the C.': 'Re-entrant: the {♪G} string is higher than the {♪C}.',
  'Low G': 'Low {♪G}',
  'D tuning': '{♪D} tuning',
  'G D A E': '{♪G} {♪D} {♪A} {♪E}',
  'C G D A': '{♪C} {♪G} {♪D} {♪A}',
  /* help text that names notes */
  'The nearest note to what you play, with its octave. Middle C is C4; the A string of a violin is A4.': 'The nearest note to what you play, with its octave. Middle {♪C} is C4; the {♪A} string of a violin is A4.',
  'Spell in-between notes with sharps (C♯) or flats (D♭). Flat tunings, such as half step down, always use flats.': 'Spell in-between notes with sharps ({♪C♯}) or flats ({♪D♭}). Flat tunings, such as half step down, always use flats.',
  'Middle C is C4.': 'Middle {♪C} is C4.',
  /* the sharp / flat buttons in the tuner settings */
  'C♯': '{♪C♯}', 'D♭': '{♪D♭}',
  /* stereo position: centre, left, right */
  'pan:C': 'C', 'pan:L': 'L', 'pan:R': 'R',
  /* American spelling where the source text is British */
  'The tuner listens only while this is on. Sound is analysed on this device and never recorded or sent. Key: Space': 'The tuner listens only while this is on. Sound is analyzed on this device and never recorded or sent. Key: Space',
  'Press start and allow the microphone. Sound is analysed on this device and never recorded.': 'Press start and allow the microphone. Sound is analyzed on this device and never recorded.',
});

MN.i18n.add('en-GB', {
  'Colors': 'Colours',
  'Language, music notation, theme and color palettes.': 'Language, music notation, theme and colour palettes.',
  'Nothing logged yet. Practice for a while and press Stop to record a run.': 'Nothing logged yet. Practise for a while and press Stop to record a run.',
  'total practiced': 'total practised',
  'Progressive practice switched off: one tempo program at a time': 'Progressive practice switched off: one tempo programme at a time',
  'Tempo trainer switched off: one tempo program at a time': 'Tempo trainer switched off: one tempo programme at a time',
  'Start or pause the click. Pausing keeps your practice time and your place in a program. Key: Space': 'Start or pause the click. Pausing keeps your practice time and your place in a programme. Key: Space',
  /* metre: the time signature */
  'The note value one BPM count refers to. A dotted note means a compound meter felt in dotted beats.': 'The note value one BPM count refers to. A dotted note means a compound metre felt in dotted beats.',
  'Store this accent pattern. It can be applied to any meter with the same number of beats.': 'Store this accent pattern. It can be applied to any metre with the same number of beats.',
  'Return to the default accents for this meter.': 'Return to the default accents for this metre.',
  'How many evenly spaced pulses the second voice plays in each bar, against the current meter.': 'How many evenly spaced pulses the second voice plays in each bar, against the current metre.',
  'Save the whole setup: tempo, meter, rhythm, sounds and practice tools.': 'Save the whole setup: tempo, metre, rhythm, sounds and practice tools.',
  'Apply it to the current meter.': 'Apply it to the current metre.',
  'Switch to a meter with {#n} beats per bar to use this pattern.': 'Switch to a metre with {n} beats per bar to use this pattern.',
  'Available for compound meters such as 6/8, 9/8 and 12/8.': 'Available for compound metres such as 6/8, 9/8 and 12/8.',
  '{#a} beats per bar, each {=x}. Changing the meter resets the accent pattern.': '{a} beats per bar, each {x}. Changing the metre resets the accent pattern.',
  '{#a} dotted beats per bar, each {=x}; or {#b} pulses, each {=y}. Changing the meter resets the accent pattern.': '{a} dotted beats per bar, each {x}; or {b} pulses, each {y}. Changing the metre resets the accent pattern.',
  '{#a} beats against {#b} evenly spaced pulses per bar. Sets the meter to {#a}/4 and switches Polyrhythm on.': '{a} beats against {b} evenly spaced pulses per bar. Sets the metre to {a}/4 and switches Polyrhythm on.',
  'Press start and allow the microphone. Sound is analysed on this device and never recorded.': 'Press start and allow the microphone. Sound is analysed on this device and never recorded.',
  'The tuner listens only while this is on. Sound is analysed on this device and never recorded or sent. Key: Space': 'The tuner listens only while this is on. Sound is analysed on this device and never recorded or sent. Key: Space',
  /* 2.3 */
  "Language, music notation, theme and colors, accessibility, the left-handed tuner and the floating metronome.": "Language, music notation, theme and colours, accessibility, the left-handed tuner and the floating metronome.",
  "Switches to the High contrast palette. Turn it off to go back to the colors you had before.": "Switches to the High contrast palette. Turn it off to go back to the colours you had before.",
  "Colorblind-safe tuner colors": "Colour-blind-safe tuner colours",
  "Colorblind-safe tuner": "Colour-blind-safe tuner",
  "Replaces the tuner’s in-tune and out-of-tune colors with a blue and an orange that people with red-green or blue-yellow color blindness can tell apart. The arrows and the check mark still show the direction.": "Replaces the tuner’s in-tune and out-of-tune colours with a blue and an orange that people with red-green or blue-yellow colour blindness can tell apart. The arrows and the tick still show the direction.",
  "In tune is blue, out of tune is orange: colors that stay distinct with every common type of color blindness.": "In tune is blue, out of tune is orange: colours that stay distinct with every common type of colour blindness.",
});
