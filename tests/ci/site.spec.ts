// What every design change must keep working (playwright.ci.config.ts). Failures here are reported to
// the designer by her Codex agent, so each assertion says in plain words what broke.
import { expect, test, type Page } from '@playwright/test';
import { FAKE_API } from '../../playwright.ci.config';
import { addDays } from '../../shared/rules.js';
import { openBooking, submitBooking } from '../e2e/lib/site';

const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

interface Sent {
  body: Record<string, unknown> | null;
}

/** Answers the booking API and reCAPTCHA the way the real ones do; records the request the form sends. */
async function fakeBackend(page: Page): Promise<Sent> {
  const sent: Sent = { body: null };
  await page.route('https://www.google.com/recaptcha/**', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'window.grecaptcha = { ready: (f) => f(), execute: () => Promise.resolve("ci-token") };',
    })
  );
  await page.route(`${FAKE_API}**`, async (route) => {
    const req = route.request();
    if (req.method() === 'GET') {
      const from = israelToday();
      return route.fulfill({ json: { ok: true, from, to: addDays(from, 365), blocked: [] } });
    }
    sent.body = JSON.parse(req.postData() ?? 'null');
    return route.fulfill({ json: { ok: true, ref: 'SH-CI000', holdHours: 24 } });
  });
  return sent;
}

test('the home page loads without errors or broken files', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`script error: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`console error: ${m.text()}`));
  page.on('response', (r) => r.url().startsWith('http://localhost') && r.status() >= 400 && errors.push(`missing file (${r.status()}): ${r.url()}`));
  await fakeBackend(page);
  await page.goto('/');
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
  });
  expect(errors, 'the page shows errors in the browser').toEqual([]);
});

test('the booking form still sends a complete request', async ({ page }) => {
  const sent = await fakeBackend(page);
  await openBooking(page);
  const booking = page.locator('#booking');
  await expect(booking.locator('input[name="website"]'), 'the hidden anti-spam field (Honeypot) is missing from the booking form').toHaveCount(1);
  await expect(booking.locator('a[href="/terms/"]'), 'the link to the booking terms is missing next to the send button').not.toHaveCount(0);
  await expect(booking.locator('a[href="/privacy/"]'), 'the link to the privacy policy is missing next to the send button').not.toHaveCount(0);

  const checkIn = addDays(israelToday(), 40);
  const ref = await submitBooking(page, {
    stayType: 'couple',
    checkIn,
    checkOut: addDays(checkIn, 2),
    adults: 2,
    name: 'בדיקה אוטומטית',
    phone: '0501234567',
    email: 'ci@example.com',
    notes: 'CI',
  });
  expect(ref).toBe('SH-CI000');
  expect(sent.body, 'the booking form did not send the request').toMatchObject({
    action: 'request',
    stayType: 'couple',
    checkIn,
    checkOut: addDays(checkIn, 2),
    adults: 2,
    name: 'בדיקה אוטומטית',
    phone: '0501234567',
    email: 'ci@example.com',
    notes: 'CI',
    website: '',
    recaptchaToken: 'ci-token',
  });
});

test('the page passes the accessibility scan', async ({ page }) => {
  const { AxeBuilder } = await import('@axe-core/playwright');
  await fakeBackend(page);
  await page.goto('/');
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(
    result.violations.map((v) => `${v.help} (${v.id}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`),
    'the page breaks accessibility rules (Israeli law requires them)'
  ).toEqual([]);
});

test('the legal pages are built in both languages', async ({ request }) => {
  for (const path of ['/terms/', '/privacy/', '/accessibility/', '/en/terms/', '/en/privacy/', '/en/accessibility/']) {
    expect((await request.get(path)).status(), `the page ${path} is missing`).toBe(200);
  }
});
