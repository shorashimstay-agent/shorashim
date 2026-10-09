// Read-only checks of the live site and production backend (tests/e2e/PLAN.md §5). Writes nothing.
import { expect, test } from '@playwright/test';
import { snapshot, webApp } from './lib/backend';
import { pricesCsvUrl, production as cfg } from './lib/env';
import { recaptchaToken } from './lib/site';
import { pricesFromRows } from '../../shared/rules.js';
import { parseCsv } from '../../src/lib/csv';

const api = webApp(cfg);

test('the site answers on every address and ends at https://shorashimstay.com/', async ({ request }) => {
  for (const url of ['https://shorashimstay.com/', 'http://shorashimstay.com/', 'https://www.shorashimstay.com/', 'http://www.shorashimstay.com/']) {
    const res = await request.get(url);
    expect(res.status(), url).toBe(200);
    expect(res.url(), url).toBe('https://shorashimstay.com/');
  }
});

test('the page loads its assets and the booking calendar', async ({ page }) => {
  const failed: string[] = [];
  page.on('response', (r) => {
    if (r.url().startsWith('https://shorashimstay.com/') && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });
  await page.goto('/#booking');
  await page.locator('#booking').evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
  await expect(page.locator('.shorashim-calendar')).toBeVisible();
  await expect(page.locator('#booking').getByText('הבחירה שלכם', { exact: true })).toBeVisible({ timeout: 60_000 });
  expect(failed).toEqual([]);
});

test('production availability, snapshot and triggers are healthy', async () => {
  const a = await api.availability();
  expect(a.ok).toBe(true);
  const s = await snapshot(cfg);
  expect(Date.now() - Date.parse(s.generatedAt)).toBeLessThan(15 * 60_000);
  expect(s.blocked).toEqual(a.blocked);
  const diag = await api.diag();
  expect(diag.error).toBeUndefined();
  expect(diag.triggers).toEqual(expect.arrayContaining(['onSheetEdit:ON_EDIT', 'onSnapshotTimer:CLOCK']));
});

test('the prices sheet is public, and the production web app prices from the same sheet', async ({ request }) => {
  // What every page reads: the sheet's CSV, with no login.
  const csv = await (await request.get(pricesCsvUrl(cfg))).text();
  const live = pricesFromRows(parseCsv(csv));
  if (!live.ok) throw new Error(`the prices sheet fails the checks: ${live.error}`);
  // Passing the version, as a page does, makes the web app re-read the sheet if its copy is older.
  expect((await api.diag(live.version)).pricesVersion).toBe(live.version);
});

test('the owner console at /admin is live and its backend refuses calls without a login', async ({ request }) => {
  const page = await (await request.get('/admin/')).text();
  expect(page).toContain('כניסה למסוף');
  expect(page).toContain(`content="${cfg.webAppUrl}"`);
  expect(page).toContain('noindex');
  expect(await api.consoleWithToken('overview', 'v1-x.forged.token.sig')).toMatchObject({ ok: false, error: 'unauthorized' });
  // Signed with the secret (as tools may call it): read-only. Only the shape is checked; the guest
  // details it holds are not printed.
  const o = await api.console('overview');
  expect(o.ok).toBe(true);
  expect(o.health.staging).toBe(false);
  for (const key of ['requests', 'decisions', 'bookings', 'channels']) expect(Array.isArray(o[key])).toBe(true);
});

test('reCAPTCHA tokens from the live page verify for shorashimstay.com', async ({ page }) => {
  await page.goto('/#booking');
  await page.locator('#booking').evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
  const token = await recaptchaToken(page, cfg.recaptchaSiteKey);
  expect(token.length).toBeGreaterThan(100);
  // Verification needs the secret, which only the backend config holds; it is read locally, never sent anywhere but Google.
  const secret = (cfg as unknown as { recaptchaSecret: string }).recaptchaSecret;
  const res = await (await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: token }) })).json();
  expect(res).toMatchObject({ success: true, hostname: 'shorashimstay.com', action: 'booking_request' });
  // No check on res.score: it rates this automated browser, not the site, and drops to 0.1 after a few
  // runs in a day. The backend still enforces the threshold for real visitors (recaptchaMinScore).
});

test('the legal pages are live in both languages', async ({ request }) => {
  for (const path of ['/terms/', '/privacy/', '/accessibility/', '/en/terms/', '/en/privacy/', '/en/accessibility/']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
  }
});

test('the live home page passes the axe accessibility scan', async ({ page }) => {
  const { AxeBuilder } = await import('@axe-core/playwright');
  await page.goto('/');
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('iframe[src*="recaptcha"]').analyze();
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
});
