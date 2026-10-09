// After a deploy: waits until https://shorashimstay.com serves the build in dist/, then checks that
// its files and the legal pages load. Exits non-zero, saying what is wrong, if they do not.
import fs from 'node:fs';

const SITE = 'https://shorashimstay.com';
const PAGES = ['/terms/', '/privacy/', '/accessibility/', '/en/terms/', '/en/privacy/', '/en/accessibility/'];
const assetsOf = (html) => [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);

const built = assetsOf(fs.readFileSync('dist/index.html', 'utf8'));
if (!built.length) throw new Error('dist/index.html references no /assets/ files');

const deadline = Date.now() + 10 * 60_000;
let live = [];
for (;;) {
  const res = await fetch(`${SITE}/?live-check=${Date.now()}`, { cache: 'no-store' });
  live = assetsOf(await res.text());
  if (res.ok && built.every((a) => live.includes(a))) break;
  if (Date.now() > deadline) {
    console.error(`The live site still serves an older build after 10 minutes (expected ${built.join(', ')}; live has ${live.join(', ')}).`);
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 15_000));
}

const failures = [];
for (const url of [...built, ...PAGES]) {
  const res = await fetch(`${SITE}${url}`);
  if (!res.ok) failures.push(`${res.status} ${url}`);
}
if (failures.length) {
  console.error(`The live site is up, but these do not load:\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`Live: ${SITE} serves this build (${built.length} files), and the legal pages load.`);
