#!/usr/bin/env node
// Blends the design from the private AI Studio repo (front-2) into this site. docs/front-sync.md
// explains the design; the /sync-front skill (.claude/skills/sync-front/) runs these steps:
//
//   node scripts/front-sync.mjs prepare   fetch front-2, scan it for secrets, check its prices, and
//                                         three-way merge its changes onto a sync/front-<sha> branch
//   node scripts/front-sync.mjs check     after conflicts are resolved: the contract checks, lint,
//                                         unit tests, a build, and secret and price scans of the build
//   node scripts/front-sync.mjs ship      commit, staging suite, push, wait for Pages, smoke test;
//                                         reverts and pushes again if the live site fails the smoke test
//
// front-2 stays private: its clone lives in .front-2/ (ignored by git, push disabled), and only the
// merged files are committed here, never its history. Each sync commit ends with the trailer
// `Front-2-Sync: <sha>`, which is how the next sync finds its merge base.
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPrices, PRICE_KEYS } from '../shared/rules.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FRONT = path.join(ROOT, '.front-2');
const FRONT_URL = 'https://github.com/sarayagent-alt/shorashim-front-2.git';
const GH_USER = 'shorashimstay-agent';
// The commit that imported the original AI Studio export. front-2 grew from the same export, so it
// is the merge base until the first sync records one.
const INITIAL_BASE = 'c4f2afb';
const TRAILER = 'Front-2-Sync';
const REVERTED_TRAILER = 'Front-2-Sync-Reverted';
const GITLEAKS = process.env.GITLEAKS || [path.join(os.homedir(), '.local/bin/gitleaks'), 'gitleaks'].find((p) => p === 'gitleaks' || fs.existsSync(p));

let STATE_DIR = '';
const stateDir = () => (STATE_DIR ||= path.join(git(['rev-parse', '--absolute-git-dir']), 'front-sync'));
const statePath = () => path.join(stateDir(), 'state.json');

// ---- Which files the front may change (docs/front-sync.md, "File ownership")

/** Production-owned: front-2's changes to these are reported and never taken. */
const PROTECTED = [
  /^package(-lock)?\.json$/,
  /^tsconfig\.json$/,
  /^vite\.config\.ts$/,
  /^metadata\.json$/,
  /^README\.md$/,
  /^\.env/,
  /^\.gitignore$/,
  /^\.github\//,
  /^\.githooks\//,
  /^\.claude\//,
  /^apps-script\//,
  /^shared\//,
  /^scripts\//,
  /^tests\//,
  /^docs\//,
  /^(en\/)?(terms|privacy|accessibility)\//,
  /^playwright\.config\.ts$/,
  /^public\/CNAME$/,
  /^public\/prices\.json$/,
  /^public\/admin\//,
  /^src\/lib\//,
  /^src\/booking\//,
  /^src\/legal\//,
  /^src\/components\/(AvailabilityCalendar|AccessibilityMenu|Picture)\.tsx$/,
  /^src\/data\/(bookingConfig|generatedImages)\.ts$/,
  /^src\/assets\/images\/optimized\//,
  /^src\/vite-env\.d\.ts$/,
];
/** Design files: merged three ways. Anything neither protected nor listed here is ignored. */
const DESIGN = [/^src\//, /^public\//, /^index\.html$/];

const isProtected = (p) => PROTECTED.some((re) => re.test(p));
const category = (p) => (isProtected(p) ? 'protected' : DESIGN.some((re) => re.test(p)) ? 'design' : 'ignored');

/** front-2's price fields in BRAND_DATA (src/data/shorashimData.ts) → prices.json keys. */
const FRONT_PRICE_FIELDS = {
  basePricePerNight: 'perNight',
  thirdGuestSurcharge: 'thirdGuestPerNight',
  brideDayPrice: 'bride_day',
  brideNightDayPrice: 'bride_night_day',
  weddingNightPrice: 'wedding_night',
};
const MAX_PRICE_CHANGE = 0.5;

/** Domains the site may link to or load from. A new one stops the sync until someone adds it here. */
const ALLOWED_DOMAINS = [
  'shorashimstay.com',
  'wa.me',
  'instagram.com',
  'www.instagram.com',
  'maps.google.com',
  'www.google.com',
  'policies.google.com',
  'developers.google.com',
  'docs.google.com',
  'script.google.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'www.w3.org',
];

// ---- Helpers

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}
const git = (args, opts) => run('git', args, opts).trimEnd();
const frontGit = (args, opts) => run('git', ['-C', FRONT, ...args], opts).trimEnd();

/** Runs a command with its output shown; returns whether it succeeded. */
function step(label, cmd, args, env = {}) {
  console.log(`\n▶ ${label}`);
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
  return res.status === 0;
}

function fail(message) {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function ghToken() {
  try {
    return run('gh', ['auth', 'token', '--user', GH_USER]).trim();
  } catch {
    fail(`No GitHub token for ${GH_USER}. Sign in with: gh auth login (as ${GH_USER}).`);
  }
}

/** git over HTTPS with a one-off credential helper, so the token is never stored in a remote URL. */
function gitWithToken(args, cwd) {
  const helper = '!f(){ echo username=x-access-token; echo "password=$T"; }; f';
  return run('git', ['-c', 'credential.helper=', '-c', `credential.helper=${helper}`, ...args], { cwd, env: { ...process.env, T: ghToken() } });
}

function readState() {
  if (!fs.existsSync(statePath())) fail('No sync in progress. Run: node scripts/front-sync.mjs prepare');
  return JSON.parse(fs.readFileSync(statePath(), 'utf8'));
}

function writeState(state) {
  fs.mkdirSync(stateDir(), { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify(state, null, 2));
}

/** Files of a tree as path → blob id. Blob ids are content hashes, so they compare across repos. */
function lsTree(repoGit, rev) {
  const out = new Map();
  for (const line of repoGit(['ls-tree', '-r', '-z', rev]).split('\0')) {
    if (!line) continue;
    const [meta, file] = line.split('\t');
    const [, type, blob] = meta.split(' ');
    if (type === 'blob') out.set(file, blob);
  }
  return out;
}

/** A blob's bytes from the repo `repoGit` works on (this repo or .front-2). */
const readBlob = (repoGit, blob) => run('git', [...(repoGit === frontGit ? ['-C', FRONT] : []), 'cat-file', 'blob', blob], { encoding: 'buffer' });
const isBinary = (buf) => buf.subarray(0, 8000).includes(0);
const sha7 = (sha) => sha.slice(0, 7);

/** The front-2 commit the last sync merged, skipping syncs that were reverted; null before the first sync. */
function lastSyncedSha() {
  const reverted = new Set();
  for (const body of git(['log', '--format=%B%x00', 'HEAD']).split('\0')) {
    const r = body.match(new RegExp(`^${REVERTED_TRAILER}: ([0-9a-f]{40})$`, 'm'));
    if (r) reverted.add(r[1]);
    const s = body.match(new RegExp(`^${TRAILER}: ([0-9a-f]{40})$`, 'm'));
    if (s && !reverted.has(s[1])) return s[1];
  }
  return null;
}

// ---- Secret scanning

function gitleaks(args) {
  if (!GITLEAKS || (GITLEAKS !== 'gitleaks' && !fs.existsSync(GITLEAKS))) {
    fail('gitleaks is not installed. Install it to ~/.local/bin (https://github.com/gitleaks/gitleaks/releases).');
  }
  const report = path.join(stateDir(), `gitleaks-${crypto.randomUUID()}.json`);
  fs.mkdirSync(stateDir(), { recursive: true });
  const res = spawnSync(GITLEAKS, [...args, '--no-banner', '--redact', '--exit-code', '0', '--report-format', 'json', '--report-path', report], { cwd: ROOT, encoding: 'utf8' });
  if (res.status !== 0) fail(`gitleaks failed: ${res.stderr.slice(-500)}`);
  const findings = JSON.parse(fs.readFileSync(report, 'utf8') || '[]');
  fs.rmSync(report);
  // Never print the secret: only the rule, the file and the line.
  return findings.map((f) => `${f.RuleID} in ${f.File.replace(ROOT + '/', '')}${f.StartLine ? `:${f.StartLine}` : ''}${f.Commit ? ` (commit ${sha7(f.Commit)})` : ''}`);
}

// ---- prepare

function ensureClone() {
  if (!fs.existsSync(path.join(FRONT, '.git'))) {
    console.log(`Cloning front-2 into ${path.relative(ROOT, FRONT)}/ ...`);
    gitWithToken(['clone', '--quiet', '--no-checkout', FRONT_URL, FRONT], ROOT);
  }
  // Read-only: any push from this clone fails.
  frontGit(['remote', 'set-url', '--push', 'origin', 'no-push://front-2-is-read-only']);
  gitWithToken(['fetch', '--quiet', '--prune', 'origin'], FRONT);
  return frontGit(['rev-parse', 'origin/HEAD']);
}

/** front-2's prices, read from its BRAND_DATA. Returns an error string when a field is missing. */
function frontPrices(newSha) {
  let source;
  try {
    source = frontGit(['show', `${newSha}:src/data/shorashimData.ts`]);
  } catch {
    return { error: 'front-2 no longer has src/data/shorashimData.ts, where its prices are' };
  }
  const prices = {};
  for (const [field, key] of Object.entries(FRONT_PRICE_FIELDS)) {
    const m = source.match(new RegExp(`\\b${field}\\s*:\\s*([0-9][0-9_]*)\\s*[,}\\n]`));
    if (!m) return { error: `front-2's price field ${field} is missing or not a plain number` };
    prices[key] = Number(m[1].replace(/_/g, ''));
  }
  return { prices };
}

function planPrices(newSha) {
  const current = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/prices.json'), 'utf8'));
  const found = frontPrices(newSha);
  if (found.error) return { stop: found.error };
  const changes = PRICE_KEYS.filter((k) => found.prices[k] !== current.prices[k]).map((k) => ({ key: k, from: current.prices[k], to: found.prices[k] }));
  if (!changes.length) return { changes };
  const file = { version: `front-2@${sha7(newSha)}`, prices: found.prices };
  const checked = checkPrices(file);
  if (!checked.ok) return { stop: `front-2's prices fail the checks (${checked.error}): ${JSON.stringify(found.prices)}` };
  const big = changes.filter((c) => Math.abs(c.to - c.from) / c.from > MAX_PRICE_CHANGE);
  if (big.length) return { stop: `price change over ${MAX_PRICE_CHANGE * 100}%: ${big.map((c) => `${c.key} ${c.from} → ${c.to}`).join(', ')}` };
  return { changes, file };
}

function prepare() {
  if (git(['rev-parse', '--abbrev-ref', 'HEAD']) !== 'main') fail('Start from main.');
  if (git(['status', '--porcelain', '--', '.', ':!.claude'])) fail('The working tree has uncommitted changes. Commit or stash them first.');
  git(['fetch', '--quiet', 'origin', 'main']);
  if (git(['rev-parse', 'HEAD']) !== git(['rev-parse', 'origin/main'])) fail('main is not the same as origin/main. Pull or push first.');

  const newSha = ensureClone();
  const lastSha = lastSyncedSha();
  if (lastSha === newSha) {
    console.log(`Nothing to sync: front-2 is still at ${sha7(newSha)}, which is already in the site.`);
    return;
  }
  if (lastSha) {
    try {
      frontGit(['cat-file', '-e', `${lastSha}^{commit}`]);
    } catch {
      fail(`The last synced front-2 commit ${sha7(lastSha)} is gone from front-2 (history rewritten?). The merge base is unknown; stopping.`);
    }
  }
  const base = lastSha ? { repo: 'front', rev: lastSha, label: `front-2 ${sha7(lastSha)}` } : { repo: 'site', rev: INITIAL_BASE, label: `the original AI Studio import (${INITIAL_BASE})` };
  const baseGit = base.repo === 'front' ? frontGit : git;
  console.log(`front-2 ${sha7(newSha)} (${frontGit(['log', '-1', '--format=%cs %s', newSha])})\nmerge base: ${base.label}`);

  // 1. Secrets. A secret in the files to be taken stops the sync. One only in front-2's history is
  //    not published by the sync, but it has been exposed, so it is reported.
  const exportDir = path.join(stateDir(), 'front');
  fs.rmSync(exportDir, { recursive: true, force: true });
  fs.mkdirSync(exportDir, { recursive: true });
  execFileSync('bash', ['-c', `git -C "${FRONT}" archive ${newSha} | tar -x -C "${exportDir}"`]);
  const inFiles = gitleaks(['dir', exportDir]);
  const inHistory = gitleaks(['git', FRONT, '--log-opts', lastSha ? `${lastSha}..${newSha}` : newSha]);
  if (inFiles.length) {
    fail(`Possible secrets in front-2's files. Nothing was merged.\n  ${inFiles.join('\n  ')}\nAsk for the key to be removed in AI Studio and replaced (it is exposed there already), then sync again.`);
  }

  // 2. Prices.
  const prices = planPrices(newSha);
  if (prices.stop) fail(`Prices: ${prices.stop}. Nothing was merged.`);

  // 3. Three-way merge of the design files, on a branch.
  const branch = `sync/front-${sha7(newSha)}`;
  git(['checkout', '--quiet', '-B', branch]);
  const baseFiles = lsTree(baseGit, base.rev);
  const newFiles = lsTree(frontGit, newSha);
  const ours = lsTree(git, 'HEAD');
  const report = { taken: [], added: [], deleted: [], merged: [], conflicts: [], notTaken: [], ignored: [] };
  const mergeDir = path.join(stateDir(), 'merge');
  fs.mkdirSync(mergeDir, { recursive: true });

  for (const file of [...new Set([...baseFiles.keys(), ...newFiles.keys()])].sort()) {
    const b = baseFiles.get(file);
    const n = newFiles.get(file);
    if (b === n) continue; // front-2 did not change it
    const kind = category(file);
    if (kind === 'protected') {
      report.notTaken.push(file);
      continue;
    }
    if (kind === 'ignored') {
      report.ignored.push(file);
      continue;
    }
    const o = ours.get(file);
    const target = path.join(ROOT, file);
    const write = (buf) => {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
    };
    if (!n) {
      if (o && o === b) {
        fs.rmSync(target);
        report.deleted.push(file);
      } else if (o) {
        report.conflicts.push({ file, why: 'front-2 deleted it; the site changed it. Kept the site version.' });
      }
      continue;
    }
    const theirs = readBlob(frontGit, n);
    if (o === n) continue;
    if (!o && b) {
      report.conflicts.push({ file, why: 'the site deleted it; front-2 changed it. Not re-added; front-2\'s version is in .git/front-sync/front/.' });
      continue;
    }
    if (!o) {
      write(theirs);
      report.added.push(file);
      continue;
    }
    if (o === b) {
      write(theirs);
      report.taken.push(file);
      continue;
    }
    const mine = fs.readFileSync(target);
    const original = b ? readBlob(baseGit, b) : Buffer.alloc(0);
    if (isBinary(mine) || isBinary(theirs)) {
      report.conflicts.push({ file, why: 'binary file changed on both sides. Kept the site version; front-2\'s is in .git/front-sync/front/.' });
      continue;
    }
    const tmp = (name, buf) => {
      const p = path.join(mergeDir, name);
      fs.writeFileSync(p, buf);
      return p;
    };
    const res = spawnSync('git', ['merge-file', '-p', '--diff3', '-L', 'site', '-L', 'base', '-L', 'front-2', tmp('ours', mine), tmp('base', original), tmp('theirs', theirs)], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
    if (res.status < 0 || res.status === null || res.status > 127) fail(`git merge-file failed on ${file}`);
    write(res.stdout);
    if (res.status === 0) report.merged.push(file);
    else report.conflicts.push({ file, why: `${res.status} conflicting hunk(s), marked <<<<<<< site / ||||||| base / ======= / >>>>>>> front-2` });
  }

  if (prices.file) fs.writeFileSync(path.join(ROOT, 'public/prices.json'), JSON.stringify(prices.file, null, 2) + '\n');

  const state = { newSha, base, branch, startMain: git(['rev-parse', 'main']), report, prices: prices.changes, historySecrets: inHistory, checkedTree: null, preparedAt: new Date().toISOString() };
  writeState(state);
  printReport(state);
}

function printReport({ newSha, base, branch, report, prices, historySecrets }) {
  const list = (title, items) => items.length && console.log(`\n${title} (${items.length}):\n  ${items.map((i) => (typeof i === 'string' ? i : `${i.file}: ${i.why}`)).join('\n  ')}`);
  console.log(`\nBranch ${branch}: front-2 ${sha7(newSha)} merged onto the site (base: ${base.label}).`);
  list('Taken from front-2 (unchanged on the site)', report.taken);
  list('New files from front-2', report.added);
  list('Deleted by front-2', report.deleted);
  list('Merged cleanly with site changes', report.merged);
  list('CONFLICTS to resolve', report.conflicts);
  list('Production-owned, front-2 changes NOT taken', report.notTaken);
  list('Ignored (outside the design files)', report.ignored);
  if (prices?.length) console.log(`\nPrices: ${prices.map((c) => `${c.key} ${c.from} → ${c.to}`).join(', ')} (public/prices.json updated)`);
  else console.log('\nPrices: unchanged.');
  if (historySecrets?.length) console.log(`\n⚠ Possible secrets in front-2's commit history (not in the files taken, so not published):\n  ${historySecrets.join('\n  ')}\n  They are exposed inside AI Studio and front-2: have them replaced.`);
  console.log('\nNext: resolve the conflicts and rewire (see the /sync-front skill), then: node scripts/front-sync.mjs check');
}

// ---- check

/** Paths changed on this branch against main, committed or not, excluding .claude/. */
function changedPaths() {
  const out = git(['status', '--porcelain', '-z', '--untracked-files=all', '--', '.', ':!.claude']).split('\0').filter(Boolean);
  const files = new Set(git(['diff', '--name-only', 'main...HEAD']).split('\n').filter(Boolean));
  for (const entry of out) files.add(entry.slice(3));
  return [...files].sort();
}

function sourceFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(tsx?|css|html)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

function contractProblems(state) {
  const problems = [];
  const read = (f) => (fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '');

  for (const file of changedPaths()) {
    if (isProtected(file) && file !== 'public/prices.json') problems.push(`${file} is production-owned; a sync may not change it (docs/front-sync.md).`);
    if (fs.existsSync(path.join(ROOT, file)) && !isBinary(fs.readFileSync(path.join(ROOT, file))) && /^(<<<<<<<|>>>>>>>|\|\|\|\|\|\|\|) /m.test(read(file))) {
      problems.push(`${file} still has conflict markers.`);
    }
  }
  if (state.prices?.length && !changedPaths().includes('public/prices.json')) problems.push('front-2 changed prices but public/prices.json is unchanged.');

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

  for (const file of [...sourceFiles('src'), 'index.html']) {
    if (isProtected(file)) continue;
    const text = read(file);
    if (/@google\/genai|GEMINI|process\.env|import\.meta\.env/.test(text)) problems.push(`${file} uses AI Studio / environment variables; the site has none.`);
    for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      if (!ALLOWED_DOMAINS.includes(m[1].toLowerCase())) problems.push(`${file} uses a new domain ${m[1]} (add it to ALLOWED_DOMAINS in scripts/front-sync.mjs if it is intended).`);
    }
  }

  const mainScripts = new Set((git(['show', 'main:index.html']).match(/<script\b[^>]*>/g) ?? []));
  for (const tag of read('index.html').match(/<script\b[^>]*>/g) ?? []) {
    if (!mainScripts.has(tag)) problems.push(`index.html has a new script tag: ${tag}`);
  }
  return [...new Set(problems)];
}

const SHEKEL_AMOUNT = /₪\s?(\d{1,3}(?:,\d{3})+|\d{3,})|(\d{1,3}(?:,\d{3})+|\d{3,})\s?₪/g;
const amountsIn = (text) => [...text.matchAll(SHEKEL_AMOUNT)].map((m) => ({ text: m[0], value: Number((m[1] ?? m[2]).replace(/,/g, '')) }));

/**
 * ₪ amounts in the built site must be prices from prices.json. Amounts in the legal pages' text
 * (production-owned, e.g. the consumer-law cancellation cap) are not prices and are allowed.
 */
function priceProblems(distDir) {
  const { prices } = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/prices.json'), 'utf8'));
  const legal = sourceFiles('src/legal').map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  const allowed = new Set([...Object.values(prices), ...amountsIn(legal).map((a) => a.value)]);
  const problems = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(js|html)$/.test(entry.name)) {
        const text = fs.readFileSync(p, 'utf8');
        for (const a of amountsIn(text)) {
          if (!allowed.has(a.value)) problems.push(`"${a.text}" in ${path.relative(distDir, p)} is not a price in public/prices.json`);
        }
      }
    }
  };
  walk(distDir);
  return [...new Set(problems)];
}

function check() {
  const state = readState();
  if (git(['rev-parse', '--abbrev-ref', 'HEAD']) !== state.branch) fail(`Switch to ${state.branch} first.`);
  const problems = contractProblems(state);
  if (problems.length) fail(`Contract checks failed:\n  ${problems.join('\n  ')}`);
  console.log('✓ contract checks');

  if (!step('lint (tsc)', 'npm', ['run', 'lint'])) fail('Lint failed.');
  if (!step('unit tests', 'npm', ['test'])) fail('Unit tests failed.');
  const dist = path.join(stateDir(), 'dist');
  if (!step('build', 'npm', ['run', 'build', '--', '--outDir', dist, '--emptyOutDir'])) fail('Build failed.');

  const leaks = [...gitleaks(['dir', dist]), ...changedPaths().filter((f) => fs.existsSync(path.join(ROOT, f))).flatMap((f) => gitleaks(['dir', path.join(ROOT, f)]))];
  if (leaks.length) fail(`Possible secrets in the site:\n  ${leaks.join('\n  ')}`);
  console.log('✓ no secrets in the changed files or the build');
  const wrongPrices = priceProblems(dist);
  if (wrongPrices.length) fail(`Prices in the page text do not match public/prices.json:\n  ${wrongPrices.join('\n  ')}`);
  console.log('✓ every ₪ amount in the build is a price from prices.json');

  git(['add', '-A', '--', '.', ':!.claude']);
  state.checkedTree = git(['write-tree']);
  writeState(state);
  console.log(`\n✓ All checks passed. Next: node scripts/front-sync.mjs ship`);
}

// ---- ship

function waitForPages(sha) {
  console.log(`\n▶ waiting for the Pages deploy of ${sha7(sha)}`);
  const env = { ...process.env, GH_TOKEN: ghToken() };
  const deadline = Date.now() + 15 * 60_000;
  while (Date.now() < deadline) {
    const runs = JSON.parse(run('gh', ['run', 'list', '--repo', 'shorashimstay-agent/shorashim', '--workflow', 'deploy.yml', '--commit', sha, '--json', 'status,conclusion,databaseId'], { env }));
    const done = runs.find((r) => r.status === 'completed');
    if (done) {
      if (done.conclusion !== 'success') return false;
      // Give the CDN a moment to pick up the new files.
      spawnSync('sleep', ['60']);
      return true;
    }
    spawnSync('sleep', ['15']);
  }
  return false;
}

function push() {
  const helper = '!f(){ echo username=x-access-token; echo "password=$T"; }; f';
  console.log('\n▶ git push origin main');
  const res = spawnSync('git', ['-c', 'credential.helper=', '-c', `credential.helper=${helper}`, 'push', 'origin', 'main'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, T: ghToken() } });
  return res.status === 0;
}

function smoke() {
  if (step('production smoke test', 'npm', ['run', 'test:smoke'])) return true;
  console.log('Smoke test failed; trying once more in 2 minutes in case the CDN was still updating.');
  spawnSync('sleep', ['120']);
  return step('production smoke test (retry)', 'npm', ['run', 'test:smoke']);
}

function ship() {
  const state = readState();
  if (git(['rev-parse', '--abbrev-ref', 'HEAD']) !== state.branch) fail(`Switch to ${state.branch} first.`);
  git(['add', '-A', '--', '.', ':!.claude']);
  if (!state.checkedTree || git(['write-tree']) !== state.checkedTree) fail('The files changed since the last check. Run: node scripts/front-sync.mjs check');

  const r = state.report;
  const alreadyCommitted = git(['log', '--format=%B', `${state.startMain}..HEAD`]).includes(`${TRAILER}: ${state.newSha}`);
  const lines = alreadyCommitted
    ? [`Finish the front-2 ${sha7(state.newSha)} sync`]
    : [
        `Blend front-2 ${sha7(state.newSha)} into the site`,
        '',
        `Merged the AI Studio design (front-2 ${sha7(state.newSha)}) with base ${state.base.label}.`,
        r.taken.length + r.added.length ? `Taken from front-2: ${[...r.taken, ...r.added].join(', ')}.` : '',
        r.merged.length ? `Merged with site changes: ${r.merged.join(', ')}.` : '',
        r.conflicts.length ? `Resolved by hand: ${r.conflicts.map((c) => c.file).join(', ')}.` : '',
        r.deleted.length ? `Deleted by front-2: ${r.deleted.join(', ')}.` : '',
        r.notTaken.length ? `Production-owned, not taken: ${r.notTaken.join(', ')}.` : '',
        state.prices?.length ? `Prices: ${state.prices.map((c) => `${c.key} ${c.from} -> ${c.to}`).join(', ')}.` : '',
        '',
        `${TRAILER}: ${state.newSha}`,
      ].filter((l, i, all) => l !== '' || all[i - 1] !== '');
  if (git(['diff', '--cached', '--name-only'])) {
    git(['commit', '--quiet', '-F', '-'], { input: lines.join('\n') + '\n', stdio: ['pipe', 'pipe', 'pipe'] });
  } else if (!alreadyCommitted) {
    fail('Nothing to commit and no sync commit on the branch.');
  }
  const commit = git(['rev-parse', 'HEAD']);
  console.log(`Shipping ${git(['rev-list', '--count', `${state.startMain}..HEAD`])} commit(s) up to ${sha7(commit)}.`);

  if (!step('staging suite (npm run test:e2e)', 'npm', ['run', 'test:e2e'])) {
    fail(`The staging suite failed. Nothing was pushed; fix it on ${state.branch}, amend or add a commit, run check again, then ship.`);
  }
  git(['checkout', '--quiet', 'main']);
  git(['merge', '--quiet', '--ff-only', state.branch]);
  if (!push()) fail('Push failed; main is ahead of origin/main locally.');
  if (waitForPages(commit) && smoke()) {
    git(['branch', '-D', state.branch]);
    fs.rmSync(statePath());
    console.log(`\n✓ front-2 ${sha7(state.newSha)} is live at https://shorashimstay.com/`);
    return;
  }

  console.log('\n✖ The live site failed after the sync. Reverting it.');
  git(['revert', '--no-commit', `${state.startMain}..${commit}`]);
  git(['commit', '--quiet', '-F', '-'], { input: `Revert the front-2 ${sha7(state.newSha)} sync: the live smoke test failed\n\n${REVERTED_TRAILER}: ${state.newSha}\n`, stdio: ['pipe', 'pipe', 'pipe'] });
  const reverted = git(['rev-parse', 'HEAD']);
  if (!push()) fail('The revert could not be pushed. Push main by hand now.');
  const back = waitForPages(reverted) && smoke();
  fail(`Reverted the sync (${back ? 'the previous site is back and passes the smoke test' : 'CHECK THE LIVE SITE: the smoke test still fails after the revert'}). The branch ${state.branch} is kept for investigation.`);
}

const command = process.argv[2];
if (command === 'prepare') prepare();
else if (command === 'check') check();
else if (command === 'ship') ship();
else fail('Usage: node scripts/front-sync.mjs prepare | check | ship');
