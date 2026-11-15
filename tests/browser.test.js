/* Run: npm run test:browser   (needs Playwright: `npm i -D playwright && npx playwright install chromium`,
   or set PLAYWRIGHT_MODULE to an installed copy and CHROME_PATH to a Chrome/Chromium binary)

   End-to-end tests in a real browser:
     • the app is served under a sub-path, exactly like a GitHub Pages project site
       (https://user.github.io/repo/), and any missing asset or request to another site fails;
     • Chrome's fake microphone plays recorded notes with known pitches, so the whole chain —
       getUserMedia → Web Audio → detector → tracker → model → page — is checked;
     • a low E through a simulated phone microphone, "Pluck again" as a note dies, the signal
       quality indicator and the microphone-processing report;
     • permission denied, no microphone, stop/release, view switching (each tool stops when
       you leave it and stays stopped), presets, custom tunings, Simple/Advanced, reference
       pitch, the metronome (regression), and layout from 320 px to desktop with no
       horizontal overflow.
   Screenshots go to tests/screenshots/ (not committed). */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const assert = require('assert');
let pw;
try { pw = require(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
catch (e) { console.error('Playwright is needed for the browser tests: npm i -D playwright && npx playwright install chromium'); process.exit(1); }

const ROOT = path.join(__dirname, '..');
const BASE = '/professional-metronome/';
const SHOTS = path.join(__dirname, 'screenshots');
const FIX = fs.mkdtempSync(path.join(os.tmpdir(), 'tuner-audio-'));
process.argv[2] = FIX; require('./make-audio.js');
fs.mkdirSync(SHOTS, { recursive: true });

/* ---- static server, mounted under BASE like GitHub Pages ---- */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const misses = [];
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (!url.startsWith(BASE)) { if (url !== '/favicon.ico') misses.push(url); res.writeHead(404); return res.end(); }
  let rel = url.slice(BASE.length);
  if (!rel || rel.endsWith('/')) rel += 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (!/favicon\.ico$/.test(url)) misses.push(url);
    res.writeHead(404, { 'Content-Type': 'text/html' }); return res.end(fs.readFileSync(path.join(ROOT, '404.html')));
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const tests = [];
const t = (name, fn) => tests.push([name, fn]);
let ORIGIN;

async function open({ audio = null, viewport = { width: 390, height: 844 }, mobile = true, scheme = 'dark', init = null, grant = true, hash = '' } = {}) {
  const args = ['--autoplay-policy=no-user-gesture-required'];
  if (audio) args.push('--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${path.join(FIX, audio)}`);
  const browser = await pw.chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args });
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, colorScheme: scheme, permissions: grant && audio ? ['microphone'] : [] });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push('console: ' + m.text()); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  page.on('request', (r) => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) problems.push('third-party request: ' + r.url()); });
  await page.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  if (init) await page.addInitScript(init);
  await page.goto(ORIGIN + BASE + hash, { waitUntil: 'networkidle' });
  const done = async () => {
    const csp = await page.evaluate(() => window.__csp);
    await browser.close();
    assert.deepEqual(problems, [], 'browser problems');
    assert.deepEqual(csp, [], 'content-security-policy violations');
  };
  return { browser, page, done };
}
const read = (page) => page.evaluate(() => ({
  state: tuner.engine.state,
  note: document.querySelector('#noteName').textContent,
  hz: parseFloat(document.querySelector('#hzNow').textContent),
  cents: parseFloat(document.querySelector('#centsNow').textContent.replace('−', '-')),
  status: document.querySelector('#tuneStatusText').textContent,
  active: Array.from(document.querySelectorAll('.string.active')).map((b) => b.textContent),
  tuned: Array.from(document.querySelectorAll('.string.tuned')).map((b) => b.textContent),
}));
const listen = async (page, ms = 2500) => { await page.click('#micBtn'); await page.waitForTimeout(ms); return read(page); };

t('opens on the tuner, under a project sub-path, with no errors or outside requests', async () => {
  const { page, done } = await open({ viewport: { width: 1280, height: 860 }, mobile: false });
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'tuner');
  assert.ok(await page.isVisible('#gauge'));
  assert.ok(!(await page.isVisible('#view-metronome')));
  assert.equal(await page.title(), 'Metronome & Tuner');
  assert.equal(await page.textContent('#about-title'), 'Metronome & Tuner');
  await page.screenshot({ path: path.join(SHOTS, 'desktop-tuner.png') });
  await done();
});
t('low E, 12 ¢ flat: E2, −12 ¢, "Tune up", low E string selected automatically', async () => {
  const { page, done } = await open({ audio: 'e2-flat.wav' });
  const r = await listen(page);
  assert.equal(r.state, 'listening'); assert.equal(r.note, 'E2');
  assert.ok(Math.abs(r.cents + 12) <= 1.5, 'cents ' + r.cents);
  assert.ok(Math.abs(r.hz - 81.84) <= 0.1, 'Hz ' + r.hz);
  assert.match(r.status, /^Tune up/); assert.deepEqual(r.active, ['E2']);
  await page.screenshot({ path: path.join(SHOTS, 'phone-e2-flat.png') });
  await done();
});
t('low E through a phone microphone (fundamental cut ~25 dB, room noise): E2, not E3', async () => {
  const { page, done } = await open({ audio: 'e2-phone.wav' });
  await page.evaluate(() => metronome.store.set({ mode: 'advanced', help: false }));
  const r = await listen(page, 2500);
  assert.equal(r.note, 'E2'); assert.ok(Math.abs(r.cents) <= 4, 'cents ' + r.cents);
  assert.deepEqual(r.active, ['E2']);
  assert.match(await page.getAttribute('#sigQuality', 'data-q'), /good|fair/, 'signal quality shown');
  assert.match(await page.textContent('#micProc'), /Raw sound|asked|requested/, 'processing reported');
  await page.screenshot({ path: path.join(SHOTS, 'phone-e2-through-phone-mic.png') });
  await done();
});
t('a note that dies away: "Pluck again", the last reading kept and dimmed', async () => {
  const { page, done } = await open({ audio: 'a2-decay.wav' });
  await page.click('#micBtn');
  await page.waitForFunction(() => document.querySelector('#noteName').textContent === 'A2', null, { timeout: 4000 });
  await page.waitForFunction(() => document.querySelector('#tuneStatusText').textContent === 'Pluck again', null, { timeout: 6000 });
  assert.equal(await page.textContent('#noteName'), 'A2');
  assert.equal(await page.getAttribute('#gaugeWrap', 'data-state'), 'hold');
  await page.screenshot({ path: path.join(SHOTS, 'phone-pluck-again.png') });
  await done();
});
t('A2 in tune: "In tune", string marked done', async () => {
  const { page, done } = await open({ audio: 'a2-intune.wav' });
  const r = await listen(page, 3000);
  assert.equal(r.note, 'A2'); assert.ok(Math.abs(r.cents) <= 1, 'cents ' + r.cents);
  assert.equal(r.status, 'In tune'); assert.deepEqual(r.tuned, ['A2']);
  await done();
});
t('5-string bass low B (31 Hz), 8 ¢ sharp', async () => {
  const { page, done } = await open({ audio: 'b0-bass.wav' });
  await page.evaluate(() => tuner.store.set({ tuningId: 'bass-5-standard' }));
  const r = await listen(page, 3000);
  assert.equal(r.note, 'B0'); assert.ok(Math.abs(r.cents - 8) <= 2, 'cents ' + r.cents);
  assert.deepEqual(r.active, ['B0']); assert.match(r.status, /^Tune down/);
  await done();
});
t('reference pitch: 442 Hz is +7.9 ¢ at A4 = 440 and in tune at A4 = 442', async () => {
  const { page, done } = await open({ audio: 'a4-442.wav' });
  await page.evaluate(() => { metronome.store.set({ mode: 'advanced' }); tuner.store.set({ tuningId: 'violin-standard' }); });
  let r = await listen(page);
  assert.equal(r.note, 'A4'); assert.ok(Math.abs(r.cents - 7.85) <= 1, 'cents ' + r.cents);
  await page.click('#a4Picks .chip[data-v="442"]');
  await page.waitForTimeout(800);
  r = await read(page);
  assert.equal(r.note, 'A4'); assert.ok(Math.abs(r.cents) <= 1); assert.equal(r.status, 'In tune');
  await page.fill('#a4Input', '999'); await page.press('#a4Input', 'Enter');
  assert.equal(await page.evaluate(() => tuner.store.get().a4), 442, 'out-of-range reference rejected');
  await done();
});
t('a typed target frequency is measured in cents', async () => {
  const { page, done } = await open({ audio: 'a4-442.wav' });
  await page.evaluate(() => metronome.store.set({ mode: 'advanced' }));
  await page.fill('#freqInput', '432'); await page.press('#freqInput', 'Enter');
  const r = await listen(page);
  const expected = 1200 * Math.log2(442 / 432);
  assert.ok(Math.abs(r.cents - expected) <= 1, `cents ${r.cents} vs ${expected.toFixed(1)}`);
  assert.match(await page.textContent('#targetLine'), /432\.00 Hz/);
  await done();
});
t('silence: no note, a prompt to play', async () => {
  const { page, done } = await open({ audio: 'silence.wav' });
  const r = await listen(page, 1500);
  assert.equal(r.note, ''); assert.equal(r.status, 'Play any string');
  await done();
});
t('stop and leaving the tuner both release the microphone', async () => {
  const { page, done } = await open({ audio: 'a2-intune.wav', init: () => {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    window.__streams = [];
    navigator.mediaDevices.getUserMedia = async (c) => { const s = await orig(c); window.__streams.push(s); return s; };
  } });
  await listen(page, 800);
  await page.click('#micBtn'); await page.waitForTimeout(200);
  assert.deepEqual(await page.evaluate(() => window.__streams.map((s) => s.getTracks().every((x) => x.readyState === 'ended'))), [true]);
  await listen(page, 800);
  await page.click('[data-view-btn="metronome"]'); await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => window.__streams.map((s) => s.getTracks().every((x) => x.readyState === 'ended'))), [true, true]);
  assert.equal(await page.evaluate(() => tuner.engine.state), 'idle');
  await done();
});
t('permission denied and no microphone: clear message, retry offered', async () => {
  for (const [name, re] of [['NotAllowedError', /blocked/i], ['NotFoundError', /No microphone/]]) {
    const { page, done } = await open({ init: `navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('x', '${name}'));` });
    await page.click('#micBtn'); await page.waitForTimeout(300);
    assert.ok(await page.isVisible('#tunerAlert'), name);
    assert.match(await page.textContent('#tunerAlertText'), re);
    assert.ok(await page.isVisible('#tunerRetry'));
    assert.equal(await page.getAttribute('#micBtn', 'aria-pressed'), 'false');
    await page.screenshot({ path: path.join(SHOTS, `phone-${name}.png`) });
    await done();
  }
});
t('instrument picker: choose violin; the choice survives a reload', async () => {
  const { page, done } = await open();
  await page.click('#tuningBtn');
  await page.click('#instPicks .chip:has-text("Violin")');
  await page.click('.tuning-row:has-text("Standard")');
  await page.waitForTimeout(300);
  assert.deepEqual(await page.$$eval('.string', (b) => b.map((x) => x.textContent)), ['G3', 'D4', 'A4', 'E5']);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.textContent('#tuningInst'), 'Violin');
  await done();
});
t('custom tuning: validate, save, select, survive a reload, delete', async () => {
  const { page, done } = await open({ viewport: { width: 1280, height: 860 }, mobile: false });
  await page.evaluate(() => metronome.store.set({ mode: 'advanced', help: false }));
  await page.click('#newTuning');
  await page.fill('#edName', 'Baritone guitar');
  await page.fill('#edNotes', 'B1 E2 A2 D3 F#3 H2');
  await page.click('#edSave');
  assert.match(await page.textContent('#edErrors'), /H2/);
  await page.fill('#edNotes', 'B1 E2 A2 D3 F#3 B3');
  await page.click('#edSave'); await page.waitForTimeout(300);
  assert.equal(await page.textContent('#tuningName'), 'Baritone guitar');
  await page.reload({ waitUntil: 'networkidle' });
  assert.deepEqual(await page.$$eval('.string', (b) => b.map((x) => x.textContent)), ['B1', 'E2', 'A2', 'D3', 'F♯3', 'B3']);
  page.on('dialog', (d) => d.accept());
  await page.click('#myTunings button:has-text("Edit")');
  await page.click('#edDelete'); await page.waitForTimeout(300);
  assert.equal(await page.textContent('#tuningName'), 'Standard');
  await done();
});
t('Simple and Advanced: professional controls only in Advanced', async () => {
  const { page, done } = await open();
  assert.ok(!(await page.isVisible('#a4Input')) && !(await page.isVisible('#scope')));
  await page.click('#modeSeg button[data-mode="advanced"]');
  assert.ok(await page.isVisible('#a4Input') && await page.isVisible('#scope') && await page.isVisible('#toneSw'));
  await page.click('#modeSeg button[data-mode="simple"]');
  assert.ok(!(await page.isVisible('#a4Input')));
  await done();
});
t('feedback, About (version) and privacy are one tap away', async () => {
  const { page, done } = await open();
  await page.click('#feedbackBtn');
  assert.equal(await page.getAttribute('#igLink', 'href'), 'https://www.instagram.com/sayrolivares/');
  assert.equal(await page.getAttribute('#xLink', 'href'), 'https://x.com/sayrolivares');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.click('#aboutBtn');
  assert.equal(await page.textContent('#appVersion'), await page.evaluate(() => MN.APP.version));
  await page.click('#about-dlg button[data-open="privacy"]');
  assert.match(await page.textContent('#privacy-dlg'), /never recorded, stored or sent/);
  await done();
});
t('metronome still works: plays, keys, deep link', async () => {
  const { page, done } = await open({ viewport: { width: 1280, height: 860 }, mobile: false, hash: '#metronome' });
  assert.equal(await page.evaluate(() => document.body.dataset.view), 'metronome');
  if (await page.isVisible('#gate')) await page.click('#gateBtn');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(() => metronome.store.get().bpm), 101);
  await page.keyboard.press('Space'); await page.waitForTimeout(1200);
  assert.ok(await page.evaluate(() => metronome.engine.running));
  await page.screenshot({ path: path.join(SHOTS, 'desktop-metronome.png') });
  await page.click('[data-view-btn="tuner"]');
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(() => metronome.store.get().bpm), 101, 'metronome keys are inactive on the tuner');
  await done();
});
t('switching tools stops the one you leave, and it stays stopped when you come back', async () => {
  const { page, done } = await open({ audio: 'a2-intune.wav', viewport: { width: 1280, height: 860 }, mobile: false, hash: '#metronome' });
  if (await page.isVisible('#gate')) await page.click('#gateBtn');
  await page.click('#playBtn'); await page.waitForTimeout(1500);
  assert.ok(await page.evaluate(() => metronome.engine.running), 'metronome playing');
  await page.click('[data-view-btn="tuner"]'); await page.waitForTimeout(300);
  const m = await page.evaluate(() => ({ running: metronome.engine.running, elapsed: metronome.engine.practiceElapsed(), beat: document.querySelector('#playBtn').classList.contains('playing') }));
  assert.deepEqual(m, { running: false, elapsed: 0, beat: false }, 'stopped and reset, not paused');
  await page.click('#micBtn'); await page.waitForTimeout(1200);
  assert.equal(await page.evaluate(() => tuner.engine.state), 'listening');
  await page.click('[data-view-btn="metronome"]'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => tuner.engine.state), 'idle', 'microphone off on the metronome');
  assert.ok(!(await page.evaluate(() => metronome.engine.running)), 'the metronome did not restart by itself');
  await page.click('[data-view-btn="tuner"]'); await page.waitForTimeout(800);
  assert.equal(await page.evaluate(() => tuner.engine.state), 'idle', 'the tuner did not restart by itself');
  assert.ok(!(await page.evaluate(() => metronome.engine.running)));
  await done();
});
t('language and notation: Spanish with German note names, then back to English', async () => {
  const { page, done } = await open({ viewport: { width: 1280, height: 860 }, mobile: false, init: () => localStorage.setItem('metronome.v1.settings', JSON.stringify({ lang: 'en', help: false })) });
  assert.equal(await page.getAttribute('#micBtn', 'aria-label'), 'Start listening');
  await page.evaluate(() => MN.dialogs.open('prefs'));
  await page.selectOption('#langSelect', 'es');
  await page.waitForFunction(() => document.querySelector('#micBtn').getAttribute('aria-label') === 'Empezar a escuchar', null, { timeout: 5000 });
  assert.equal(await page.getAttribute('html', 'lang'), 'es');
  let strings = await page.$$eval('#strings .sl', (els) => els.map((e) => e.textContent));
  assert.deepEqual(strings, ['Mi2', 'La2', 'Re3', 'Sol3', 'Si3', 'Mi4'], 'solfège in Spanish');
  await page.click('#notationList [data-v="de"]');
  strings = await page.$$eval('#strings .sl', (els) => els.map((e) => e.textContent));
  assert.deepEqual(strings, ['E2', 'A2', 'D3', 'G3', 'H3', 'E4'], 'German letters, H for B');
  assert.match(await page.textContent('#termsExample'), /H \(Si\).*negra \(Viertelnote\)/);
  await page.waitForFunction(() => { const v = JSON.parse(localStorage.getItem('metronome.v1.settings') || '{}'); return v.lang === 'es' && v.notation === 'de'; }, null, { timeout: 3000 });
  await page.selectOption('#langSelect', 'en');
  await page.click('#notationList [data-v="auto"]');
  await page.waitForFunction(() => document.querySelector('#micBtn').getAttribute('aria-label') === 'Start listening', null, { timeout: 5000 });
  strings = await page.$$eval('#strings .sl', (els) => els.map((e) => e.textContent));
  assert.deepEqual(strings, ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']);
  await done();
});

t('settings: gear button, text size, Stand mode, high contrast and colorblind-safe colors, saved and restored', async () => {
  const { page, done } = await open({ viewport: { width: 1280, height: 860 }, mobile: false, init: () => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('metronome.v1.settings', JSON.stringify({ lang: 'en', help: false, palette: 'nocturne' })); } } });
  assert.equal(await page.getAttribute('#prefsBtn', 'aria-label'), 'Settings');
  await page.click('#prefsBtn');
  await page.waitForSelector('#prefs-dlg.on');
  assert.equal(await page.textContent('#prefs-title'), 'Settings');
  /* text size: + twice = 120 %, − at the bottom of the range is disabled */
  await page.click('#fsPlus'); await page.click('#fsPlus');
  assert.equal(await page.textContent('#fsVal'), '120%');
  const fs = await page.evaluate(() => [getComputedStyle(document.documentElement).getPropertyValue('--fs-user').trim(), parseFloat(getComputedStyle(document.body).fontSize)]);
  assert.deepEqual(fs, ['1.2', 18], 'body text follows the text size');
  for (let i = 0; i < 4; i++) await page.click('#fsMinus');
  assert.equal(await page.textContent('#fsVal'), '80%');
  assert.ok(await page.$eval('#fsMinus', (b) => b.disabled), 'cannot go below 80%');
  await page.click('#fsPlus'); await page.click('#fsPlus');
  /* Stand mode: the size row only works while it is on */
  assert.ok(await page.$eval('#standSizeRow', (r) => r.classList.contains('off')));
  await page.click('#standSw');
  assert.ok(await page.evaluate(() => document.documentElement.hasAttribute('data-stand')));
  await page.click('#standPlus');
  assert.equal(await page.textContent('#standVal'), '150%');
  /* High contrast switches the palette and switching it off restores the previous one */
  await page.click('#contrastSw');
  assert.equal(await page.getAttribute('html', 'data-palette'), 'contrast');
  await page.click('#contrastSw');
  assert.equal(await page.getAttribute('html', 'data-palette'), 'nocturne');
  /* colorblind-safe: the tuner's in-tune colour becomes the safe blue */
  await page.click('#cvdSw');
  const ok = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tune-ok').trim());
  assert.ok(['#56b4e9', '#0072b2'].includes(ok), 'safe in-tune colour: ' + ok);
  await page.waitForFunction(() => { const v = JSON.parse(localStorage.getItem('metronome.v1.settings') || '{}'); return v.textScale === 1 && v.stand === true && v.standScale === 1.5 && v.cvd === true; }, null, { timeout: 3000 });
  /* after a reload it is all there before the first paint */
  await page.reload({ waitUntil: 'networkidle' });
  const after = await page.evaluate(() => ({ stand: document.documentElement.hasAttribute('data-stand'), cvd: document.documentElement.hasAttribute('data-cvd'), standScale: getComputedStyle(document.documentElement).getPropertyValue('--stand').trim() }));
  assert.deepEqual(after, { stand: true, cvd: true, standScale: '1.5' });
  /* "Reset all settings" in the metronome keeps the accessibility choices */
  await page.evaluate(() => metronome.store.reset());
  assert.equal(await page.evaluate(() => metronome.store.get().stand), true);
  await page.screenshot({ path: path.join(SHOTS, 'stand-mode.png') });
  await done();
});

t('left-handed tuner: strings from high to low, settings on the left, arrow keys follow the picture', async () => {
  const { page, done } = await open({ viewport: { width: 1280, height: 860 }, mobile: false, init: () => localStorage.setItem('metronome.v1.settings', JSON.stringify({ lang: 'en', help: false })) });
  await page.click('#leftySw');
  assert.ok(await page.evaluate(() => document.documentElement.hasAttribute('data-lefty')));
  const xs = await page.$$eval('#strings .string', (els) => els.map((e) => e.getBoundingClientRect().left));
  assert.ok(xs[0] > xs[xs.length - 1], 'the lowest string is drawn on the right');
  const side = await page.$eval('.tuner-side', (e) => e.getBoundingClientRect().left), face = await page.$eval('.tuner-face', (e) => e.getBoundingClientRect().left);
  assert.ok(side < face, 'settings card on the left');
  assert.equal(await page.$eval('#leftySw2', (b) => b.classList.contains('on')), true, 'the switch in Settings follows');
  await page.click('#strings .string >> nth=2');            // D3, manual
  await page.keyboard.press('ArrowRight');                   // to the right in the picture = a lower string
  assert.equal(await page.evaluate(() => tuner.store.get().stringIndex), 1);
  await page.click('#leftySw');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(() => tuner.store.get().stringIndex), 2);
  await done();
});

t('custom tuning: the create button starts from the instrument, strings move by semitones, the tuning is saved and used', async () => {
  const { page, done } = await open({ viewport: { width: 1280, height: 860 }, mobile: false, init: () => localStorage.setItem('metronome.v1.settings', JSON.stringify({ lang: 'en', help: false })) });
  await page.click('#tuningBtn');
  await page.click('#instPicks >> text=Bass');
  assert.match(await page.textContent('#tuneCreate'), /Create a custom tuning.*Bass, 4-string standard/);
  await page.click('#tuneCreate');
  assert.equal(await page.inputValue('#edNotes'), 'E1 A1 D2 G2');
  assert.equal(await page.inputValue('#edInst'), 'bass');
  await page.click('[data-k="0-"]'); await page.click('[data-k="0-"]');   // E1 → D1
  await page.click('[data-k="3+"]');                                       // G2 → G♯2
  await page.click('#edAdd');                                              // + a fourth above: C♯3
  assert.equal(await page.inputValue('#edNotes'), 'D1 A1 D2 G♯2 C♯3');
  await page.click('#edRemove');
  await page.fill('#edName', 'Low D bass');
  await page.click('#edSave');
  await page.waitForFunction(() => document.querySelector('#tuningName').textContent === 'Low D bass');
  const strings = await page.$$eval('#strings .sl', (els) => els.map((e) => e.textContent));
  assert.deepEqual(strings, ['D1', 'A1', 'D2', 'G♯2']);
  assert.ok(await page.isVisible('#tuneCreate'), 'after saving, the dialog shows My tunings with the create button on top');
  await page.keyboard.press('Escape');
  /* in German notation the editor speaks German: H and Fis */
  await page.evaluate(() => metronome.store.set({ notation: 'de' }));
  await page.click('#tuningBtn');
  await page.click('#instPicks >> text=Guitar');
  await page.click('#tuneCreate');
  assert.equal(await page.inputValue('#edNotes'), 'E2 A2 D3 G3 H3 E4');
  await page.click('[data-k="3+"]');
  assert.equal(await page.inputValue('#edNotes'), 'E2 A2 D3 Gis3 H3 E4');
  await page.evaluate(() => metronome.store.set({ notation: 'auto' }));
  await done();
});

t('floating metronome: docked in the page when the big one is out of view, and popped out over other tabs', async () => {
  const { page, browser, done } = await open({ viewport: { width: 1280, height: 860 }, mobile: false, hash: '#metronome', init: () => { localStorage.setItem('metronome.v1.settings', JSON.stringify({ lang: 'en', help: false, mode: 'advanced', sig: { num: 3, den: 4, compound: true }, accents: [3, 1, 1] })); localStorage.setItem('metronome.v1.audioOk', '1'); } });
  const ctx = page.context();
  const popped = ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await page.click('#floatSw');
  const pip = await popped;
  const pipProblems = [];
  assert.ok(pip, 'a picture-in-picture window opened');
  pip.on('console', (m) => { if (m.type() === 'error') pipProblems.push(m.text()); });
  assert.equal(await pip.textContent('.mini-sig'), '3/4');
  assert.equal(await pip.$$eval('.mini-dot', (d) => d.length), 3);
  await pip.click('.mini-play');
  await page.waitForFunction(() => metronome.engine.running);
  await pip.waitForFunction(() => document.querySelector('.mini-dot.on'), null, { timeout: 3000 });
  await pip.click('.mini-round >> nth=1');
  assert.equal(await page.evaluate(() => metronome.store.get().bpm), 101);
  await pip.click('.mini-stop');
  assert.equal(await page.evaluate(() => metronome.engine.running), false);
  await pip.close();
  await page.waitForFunction(() => !MN.mini.api.isOpen);
  /* in the page: the dock shows only while the big metronome is out of view */
  assert.ok(await page.$eval('.mini-dock', (d) => d.hidden), 'hidden while the big metronome is in view');
  await page.evaluate(() => document.querySelector('#tabs').scrollIntoView());
  await page.waitForFunction(() => !document.querySelector('.mini-dock').hidden, null, { timeout: 3000 });
  await page.click('.mini-dock .mini-play');
  await page.waitForFunction(() => metronome.engine.running);
  await page.waitForFunction(() => document.querySelector('.mini-dock .mini-dot.on'), null, { timeout: 3000 });
  await page.screenshot({ path: path.join(SHOTS, 'floating-dock.png') });
  await page.click('.mini-dock .mini-stop');
  /* × turns the setting off */
  await page.click('.mini-dock [data-label="Turn off the floating metronome"]');
  assert.equal(await page.evaluate(() => metronome.store.get().floating), false);
  assert.ok(await page.$eval('.mini-dock', (d) => d.hidden));
  assert.deepEqual(pipProblems, []);
  await done();
});

t('accessibility extremes: 160% text and Stand mode at 200% fit from 320 px to desktop', async () => {
  for (const [name, w, h, mobile] of [['phone-320', 320, 640, true], ['phone-390', 390, 844, true], ['tablet-768', 768, 1024, true], ['desktop-1440', 1440, 900, false]]) {
    const { page, done } = await open({ viewport: { width: w, height: h }, mobile, init: () => localStorage.setItem('metronome.v1.settings', JSON.stringify({ lang: 'en', help: false, textScale: 1.6, stand: true, standScale: 2, leftHanded: true, mode: 'advanced' })) });
    for (const view of ['tuner', 'metronome']) {
      await page.evaluate((v) => MN.views.show(v), view);
      await page.waitForTimeout(150);
      const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
      assert.ok(o.sw <= o.w, `${name} ${view}: page is ${o.sw}px wide in a ${o.w}px window`);
    }
    await page.evaluate(() => MN.dialogs.open('prefs'));
    await page.waitForTimeout(250);
    const d = await page.$eval('#prefs-dlg .dlg-box', (b) => ({ sw: b.scrollWidth, cw: b.clientWidth }));
    assert.ok(d.sw <= d.cw + 1, `${name}: Settings dialog overflows (${d.sw} > ${d.cw})`);
    if (name === 'phone-390') await page.screenshot({ path: path.join(SHOTS, 'settings-160.png') });
    await done();
  }
});

t('layouts from 320 px phones to desktop: no horizontal overflow, controls reachable', async () => {
  for (const [name, w, h, mobile] of [['phone-320', 320, 640, true], ['phone-390', 390, 844, true], ['phone-landscape', 844, 390, true], ['tablet-768', 768, 1024, true], ['tablet-1024', 1024, 768, true], ['desktop-1440', 1440, 900, false]]) {
    for (const mode of ['simple', 'advanced']) {
      const { page, done } = await open({ viewport: { width: w, height: h }, mobile });
      await page.evaluate((m) => metronome.store.set({ mode: m, help: false }), mode);
      for (const view of ['tuner', 'metronome']) {
        await page.evaluate((v) => MN.views.show(v), view);
        await page.waitForTimeout(150);
        const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth }));
        assert.ok(o.sw <= o.w, `${name} ${mode} ${view}: page is ${o.sw}px wide in a ${o.w}px window`);
      }
      await page.evaluate(() => MN.views.show('tuner'));
      const box = await page.$eval('#micBtn', (b) => { const r = b.getBoundingClientRect(); return { bottom: r.bottom }; });
      const bar = await page.evaluate(() => { const v = document.querySelector('#viewNav'); return getComputedStyle(v).position === 'fixed' ? v.getBoundingClientRect().top : innerHeight; });
      if (mode === 'simple' && h >= 640) assert.ok(box.bottom <= bar, `${name}: Start button hidden behind the bottom bar or below the fold (${box.bottom} > ${bar})`);
      if (mode === 'simple') await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
      await done();
    }
  }
});

server.listen(0, '127.0.0.1', async () => {
  ORIGIN = `http://127.0.0.1:${server.address().port}`;
  let n = 0, failed = 0;
  for (const [name, fn] of tests) {
    try { await fn(); n++; console.log('ok —', name); }
    catch (e) { failed++; console.error('FAIL —', name, '\n   ', e.message.split('\n').slice(0, 6).join('\n    ')); }
  }
  server.close();
  fs.rmSync(FIX, { recursive: true, force: true });
  if (misses.length) { console.error('missing files:', [...new Set(misses)]); failed++; }
  console.log(`\n${n} browser tests passed${failed ? `, ${failed} failed` : ''} (screenshots in tests/screenshots/)`);
  process.exit(failed ? 1 : 0);
});
