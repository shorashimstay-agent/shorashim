// What a design change must keep, checked on every design push (.github/workflows/design.yml) and
// runnable by the designer's Codex agent before it ships:
//   node scripts/design-contract.mjs [built-site-dir]
// The design files carry the booking form's wiring, the accessibility hooks and the ids the tests
// use; the built site must not hard-code a ₪ price (prices come from the prices sheet at runtime).
// Each problem is printed in plain words; the exit code is 1 when there is any.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lockedFiles } from './locked-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '');

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    // Forward slashes on every OS, as git and CODEOWNERS write paths (path.join gives \ on Windows).
    const rel = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(tsx?|css|html)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function contractProblems() {
  const problems = [];

  const booking = read('src/components/BookingSection.tsx');
  for (const [needle, why] of [
    ["from '../booking/useBookingForm'", 'must take its behaviour from useBookingForm'],
    ['<DatePicker', 'must use the availability DatePicker'],
    ['<Honeypot', 'must keep the Honeypot field'],
    ['<Announcer', 'must keep the screen-reader Announcer'],
    ['<SendConsent', 'must keep the terms/privacy/reCAPTCHA consent'],
    ['<SentHeading', 'must keep the SentHeading focus target'],
    ['id="submit-booking-request"', 'must keep the send button id'],
    ['form.submit', 'the send button must call form.submit'],
    // The tests find the controls by these, not by their wording.
    ['data-stay-type={', 'stay-type buttons must carry data-stay-type'],
    ['data-adults={', 'guest-count buttons must carry data-adults'],
    ['name="guest-name"', 'the name input must be name="guest-name"'],
    ['name="phone"', 'the phone input must be name="phone"'],
    ['name="email"', 'the email input must be name="email"'],
    ['name="notes"', 'the notes textarea must be name="notes"'],
    // Texts the tests wait for: the calendar legend (availability loaded) and the sent panel.
    ['הבחירה שלכם', 'the calendar legend must say הבחירה שלכם'],
    ['מספר הבקשה:', 'the sent panel must show מספר הבקשה:'],
  ]) {
    if (!booking.includes(needle)) problems.push(`BookingSection.tsx ${why} (missing ${needle}).`);
  }
  if (!/id="booking"/.test(booking)) problems.push('BookingSection.tsx must keep <section id="booking">.');

  const app = read('src/App.tsx');
  if (!app.includes('href="#main"')) problems.push('App.tsx must keep the skip link to #main.');
  if (!/<main[^>]*id="main"/.test(app)) problems.push('App.tsx must keep <main id="main">.');
  if (!app.includes('<AccessibilityMenu')) problems.push('App.tsx must render <AccessibilityMenu />.');

  const components = sourceFiles('src/components').map(read).join('\n');
  for (const link of ['/terms/', '/privacy/', '/accessibility/']) {
    if (!read('src/components/Footer.tsx').includes(`"${link}"`)) problems.push(`Footer.tsx must link to ${link}.`);
  }
  for (const id of ['gallery', 'mobile-menu-toggle-btn', 'mobile-nav-drawer']) {
    if (!components.includes(`id="${id}"`)) problems.push(`A component must keep id="${id}" (the tests use it).`);
  }

  const designFiles = [...sourceFiles('src'), 'index.html'];
  const locked = new Set(lockedFiles(designFiles));
  for (const file of designFiles) {
    if (locked.has(file)) continue;
    const text = read(file);
    if (/^(<<<<<<<|>>>>>>>|\|\|\|\|\|\|\|) /m.test(text)) problems.push(`${file} still has conflict markers.`);
    if (/@google\/genai|GEMINI|process\.env|import\.meta\.env/.test(text)) problems.push(`${file} uses AI Studio / environment variables; the site has none.`);
  }

  // A new <script> can track visitors or load code nobody reviewed; adding one is the owner's call.
  let mainIndex = '';
  try {
    mainIndex = execFileSync('git', ['show', 'origin/main:index.html'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    mainIndex = read('index.html');
  }
  const mainScripts = new Set(mainIndex.match(/<script\b[^>]*>/g) ?? []);
  for (const tag of read('index.html').match(/<script\b[^>]*>/g) ?? []) {
    if (!mainScripts.has(tag)) problems.push(`index.html has a new script tag, which needs the owner: ${tag}`);
  }
  return problems;
}

const SHEKEL_AMOUNT = /₪\s?(\d{1,3}(?:,\d{3})+|\d{3,})|(\d{1,3}(?:,\d{3})+|\d{3,})\s?₪/g;
const amountsIn = (text) => [...text.matchAll(SHEKEL_AMOUNT)].map((m) => ({ text: m[0], value: Number((m[1] ?? m[2]).replace(/,/g, '')) }));

/**
 * The page shows prices only from the prices sheet, at runtime (usePrices / form.estimate), so no ₪
 * amount may be written into the built site: it would go stale the moment the sheet changes.
 * Amounts in the legal pages' text (e.g. the consumer-law cancellation cap) are not prices.
 */
function priceProblems(distDir) {
  const allowed = new Set(amountsIn(sourceFiles('src/legal').map(read).join('\n')).map((a) => a.value));
  const problems = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(entry.name)) {
        for (const a of amountsIn(fs.readFileSync(p, 'utf8'))) {
          if (!allowed.has(a.value)) problems.push(`"${a.text}" is written into the page (${path.relative(distDir, p)}); show prices with usePrices() or form.estimate, which read the prices sheet.`);
        }
      }
    }
  };
  walk(distDir);
  return problems;
}

const dist = process.argv[2];
const problems = [...new Set([...contractProblems(), ...(dist ? priceProblems(path.resolve(ROOT, dist)) : [])])];
if (problems.length) {
  console.error(`The design change breaks ${problems.length} rule(s) the site depends on:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`✓ design contract${dist ? ' and prices' : ''}`);
