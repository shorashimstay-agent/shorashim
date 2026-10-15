// What every design change must keep working (playwright.ci.config.ts). Failures here are reported to
// the designer by her Codex agent, so each assertion says in plain words what broke.
import { expect, test, type Page } from '@playwright/test';
import { FAKE_API } from '../../playwright.ci.config';
import fs from 'node:fs';
import { addDays, estimatePrice } from '../../shared/rules.js';
import { openBooking, submitBooking } from '../e2e/lib/site';

const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

interface Sent {
  body: Record<string, unknown> | null;
  /** The live checks the page ran, as "start..end". */
  checks: string[];
}

interface FakeOptions {
  /** Nights the live check reports as taken (the snapshot still shows them free, as when it is stale). */
  taken?: string[];
  /** The live check gets no usable answer (`true`), or none for its first N calls. */
  checkFails?: boolean | number;
  /** The live check answers this late. */
  checkDelayMs?: number;
  /** What the request (POST) answers, instead of success. */
  postAnswer?: Record<string, unknown>;
}

/** Answers the booking API and reCAPTCHA the way the real ones do; records the request the form sends. */
async function fakeBackend(page: Page, options: FakeOptions = {}): Promise<Sent> {
  const sent: Sent = { body: null, checks: [] };
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
      const url = new URL(req.url());
      if (url.searchParams.get('action') === 'check') {
        const [start, end] = [url.searchParams.get('start')!, url.searchParams.get('end')!];
        sent.checks.push(`${start}..${end}`);
        const failing = options.checkFails === true || (typeof options.checkFails === 'number' && sent.checks.length <= options.checkFails * 4);
        if (failing) return route.fulfill({ status: 500, body: '<html>error</html>' });
        if (options.checkDelayMs) await new Promise((r) => setTimeout(r, options.checkDelayMs));
        const taken = options.taken ?? [];
        const conflicts = taken.filter((d) => d >= start && d < end);
        return route.fulfill({ json: { ok: true, free: !conflicts.length, conflicts, from, to: addDays(from, 366), blocked: taken } });
      }
      return route.fulfill({ json: { ok: true, from, to: addDays(from, 365), blocked: [] } });
    }
    sent.body = JSON.parse(req.postData() ?? 'null');
    return route.fulfill({ json: options.postAnswer ?? { ok: true, ref: 'SH-CI000', holdHours: 24 } });
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

const testPrices = JSON.parse(fs.readFileSync('tests/e2e/fixtures/prices.json', 'utf8')).prices as Record<string, number>;

/** The home page with the booking bar as a visitor sees it (not the #booking direct link). */
async function openBar(page: Page) {
  await page.goto('/');
  const booking = page.locator('#booking');
  await booking.evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
  await expect(booking.locator('.booking-bar-continue'), 'the booking bar has no "להזמנה" button').toBeVisible();
  return booking;
}

/** Opens the dates panel and picks days in the calendar. */
async function pickDates(page: Page, dates: string[]) {
  const panel = page.locator('#booking .booking-bar-dates');
  for (const date of dates) {
    if (!(await panel.evaluate((el) => (el as HTMLDetailsElement).open))) await panel.locator('summary').click();
    const cell = page.locator(`.shorashim-calendar [data-day="${date}"]`);
    for (let i = 0; i < 14 && !(await cell.isVisible()); i++) await page.locator('.shorashim-calendar .rdp-button_next').click();
    await cell.locator('button').click();
  }
}

for (const viewport of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 375, height: 800 }]) {
  test.describe(`"להזמנה" on ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('without dates it explains, sends back to the calendar, and never opens the details', async ({ page }) => {
      const sent = await fakeBackend(page);
      const booking = await openBar(page);
      await booking.locator('.booking-bar-continue').click();
      const gate = page.getByRole('alertdialog', { name: 'יש לבחור תאריכים פנויים לפני שממשיכים' });
      await expect(gate, '"להזמנה" without dates must open the date notice').toBeVisible();
      await expect(page.locator('.booking-request-screen'), 'the details screen opened without dates').not.toBeVisible();
      await gate.getByRole('button', { name: 'לבחירת תאריכים' }).click();
      await expect(gate).not.toBeVisible();
      await expect(page.locator('.shorashim-calendar'), '"לבחירת תאריכים" must open the calendar').toBeVisible();
      await expect(page.locator('.shorashim-calendar :focus'), 'focus must move into the calendar').toHaveCount(1);
      // Half a range is not enough either.
      const checkIn = addDays(israelToday(), 40);
      await pickDates(page, [checkIn]);
      await booking.locator('.booking-bar-continue').click();
      await expect(gate.getByText('בחרו גם תאריך עזיבה.')).toBeVisible();
      await gate.getByRole('button', { name: 'סגירה' }).click();
      expect(sent.checks, 'incomplete dates must not be checked').toEqual([]);
    });

    test('free dates open the details, saying so, with the price wording', async ({ page }) => {
      const sent = await fakeBackend(page);
      const booking = await openBar(page);
      const checkIn = addDays(israelToday(), 40);
      await pickDates(page, [checkIn, addDays(checkIn, 2)]);
      await booking.locator('.booking-bar-continue').click();
      const details = page.locator('.booking-request-screen');
      await expect(details.getByText('התאריכים שבחרתם פנויים'), 'free dates must say so on the details screen').toBeVisible();
      await expect(details.getByText('השאירו פרטים ונחזור אליכם לאישור סופי ולתיאום האירוח.')).toBeVisible();
      await expect(details.getByText('המחיר הוא עבור האירוח שבחרתם, בהתאם לתאריכים ולמספר האורחים. ההזמנה כפופה לאישור זמינות.')).toBeVisible();
      await expect(details.getByText('המחיר משוער')).toHaveCount(0);
      expect(sent.checks).toEqual([`${checkIn}..${addDays(checkIn, 2)}`]);
    });

    test('taken holiday dates offer nearby ones; choosing one checks it again and opens the details', async ({ page }) => {
      const checkIn = addDays(israelToday(), 40);
      const sent = await fakeBackend(page, { taken: [checkIn, addDays(checkIn, 1)] });
      const booking = await openBar(page);
      await pickDates(page, [checkIn, addDays(checkIn, 2)]);
      await booking.locator('.booking-bar-continue').click();
      const gate = page.getByRole('alertdialog', { name: 'התאריכים שבחרתם תפוסים.' });
      await expect(gate.getByText('מצאנו לכם מועדים קרובים:')).toBeVisible();
      const options = gate.locator('[data-alternative]');
      await expect(options).toHaveCount(3);
      // Two nights, the closest free start: two days later.
      const first = addDays(checkIn, 2);
      await expect(options.first()).toHaveAttribute('data-alternative', first);
      // Each is priced for its own nights, weekend nights included.
      for (let i = 0; i < 3; i++) {
        const altIn = (await options.nth(i).getAttribute('data-alternative'))!;
        const price = estimatePrice('couple', 2, 2, testPrices, altIn)!;
        await expect(options.nth(i)).toContainText(price.toLocaleString('he-IL'));
      }
      await options.first().click();
      const details = page.locator('.booking-request-screen');
      await expect(details.getByText('התאריכים שבחרתם פנויים')).toBeVisible();
      expect(sent.checks).toEqual([`${checkIn}..${addDays(checkIn, 2)}`, `${first}..${addDays(first, 2)}`]);
      await expect(details.locator('.request-facts'), 'the summary must show the chosen alternative').toContainText(first.split('-').reverse().join('.'));
    });

    test('a failed check is never shown as free and offers WhatsApp', async ({ page }) => {
      await fakeBackend(page, { checkFails: true });
      const booking = await openBar(page);
      const checkIn = addDays(israelToday(), 40);
      await pickDates(page, [checkIn, addDays(checkIn, 1)]);
      await booking.locator('.booking-bar-continue').click();
      const gate = page.getByRole('alertdialog', { name: 'לא הצלחנו לבדוק זמינות כרגע' });
      await expect(gate).toBeVisible({ timeout: 40_000 });
      await expect(gate.getByRole('button', { name: /WhatsApp/ })).toBeVisible();
      await expect(page.locator('.booking-request-screen')).not.toBeVisible();
      await expect(page.getByText('התאריכים שבחרתם פנויים')).toHaveCount(0);
    });

    test('a taken wedding date is not moved for the bride', async ({ page }) => {
      const wedding = addDays(israelToday(), 50);
      await fakeBackend(page, { taken: [wedding] });
      // The bridal page, where the bar opens on the bride packages.
      await page.goto('/#bride-page');
      const booking = page.locator('#booking');
      await booking.evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
      await booking.locator('[data-stay-type="bride_day_wedding_night"]').click();
      await pickDates(page, [wedding]);
      await booking.locator('.booking-bar-continue').click();
      const gate = page.getByRole('alertdialog', { name: 'המועד שבחרת אינו פנוי.' });
      await expect(gate.getByText('פני אלינו לבדיקת אפשרויות נוספות.')).toBeVisible();
      await expect(gate.locator('[data-alternative]')).toHaveCount(0);
    });
  });
}

test('retry after a failed check runs it again, and opens the details when it answers', async ({ page }) => {
  const sent = await fakeBackend(page, { checkFails: 1 });
  const booking = await openBar(page);
  const checkIn = addDays(israelToday(), 40);
  await pickDates(page, [checkIn, addDays(checkIn, 1)]);
  await booking.locator('.booking-bar-continue').click();
  const gate = page.getByRole('alertdialog', { name: 'לא הצלחנו לבדוק זמינות כרגע' });
  await expect(gate).toBeVisible({ timeout: 40_000 });
  await gate.getByRole('button', { name: 'לנסות שוב' }).click();
  await expect(page.locator('.booking-request-screen').getByText('התאריכים שבחרתם פנויים')).toBeVisible();
  expect(sent.checks.length).toBeGreaterThan(1);
});

test('a check overtaken by new dates is dropped: nothing opens for the old dates', async ({ page }) => {
  await fakeBackend(page, { checkDelayMs: 2500 });
  const booking = await openBar(page);
  const checkIn = addDays(israelToday(), 40);
  await pickDates(page, [checkIn, addDays(checkIn, 1)]);
  await booking.locator('.booking-bar-continue').click();
  await expect(booking.locator('.booking-bar-continue')).toHaveAttribute('aria-busy', 'true');
  await pickDates(page, [addDays(checkIn, 5), addDays(checkIn, 7)]);
  await page.waitForTimeout(3500);
  await expect(page.locator('.booking-request-screen'), 'the old dates\' answer must not open the details').not.toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(booking.locator('.booking-bar-continue')).toHaveText('להזמנה');
});

test('the #booking direct link sends nothing until a check finds the dates free', async ({ page }) => {
  const checkIn = addDays(israelToday(), 40);
  const sent = await fakeBackend(page, { taken: [addDays(checkIn, 1)] });
  await openBooking(page);
  const booking = page.locator('#booking');
  await booking.locator('[data-stay-type="couple"]').click();
  await pickDates(page, [checkIn, addDays(checkIn, 2)]);
  await booking.locator('input[name="guest-name"]').fill('בדיקה אוטומטית');
  await booking.locator('input[name="phone"]').fill('0501234567');
  await page.locator('#submit-booking-request').click();
  const gate = page.getByRole('alertdialog', { name: 'התאריכים שבחרתם תפוסים.' });
  await expect(gate, 'taken dates must stop the request before it is sent').toBeVisible();
  expect(sent.body, 'a request was sent without a confirmed check').toBeNull();
  // A nearby stay is checked, and the guest sends it from the same form.
  await gate.locator('[data-alternative]').first().click();
  await expect(gate).not.toBeVisible();
  await page.locator('#submit-booking-request').click();
  await expect(booking.getByText('מספר הבקשה:')).toBeVisible();
  expect(sent.body).toMatchObject({ action: 'request', name: 'בדיקה אוטומטית' });
});

test('a request the server finds taken shows the taken dates at once, with nearby ones', async ({ page }) => {
  const checkIn = addDays(israelToday(), 40);
  // The check's copy has not caught up (free), but the server refuses the request.
  const sent = await fakeBackend(page, { postAnswer: { ok: false, error: 'unavailable', nights: [checkIn] } });
  const booking = await openBar(page);
  await pickDates(page, [checkIn, addDays(checkIn, 2)]);
  await booking.locator('.booking-bar-continue').click();
  const details = page.locator('.booking-request-screen');
  await details.locator('input[name="guest-name"]').fill('בדיקה אוטומטית');
  await details.locator('input[name="phone"]').fill('0501234567');
  await page.locator('#submit-booking-request').click();
  const gate = page.getByRole('alertdialog', { name: 'התאריכים שבחרתם תפוסים.' });
  await expect(gate, 'a refused request must say the dates are taken').toBeVisible();
  await expect(details).not.toBeVisible();
  await expect(gate.locator('[data-alternative]').first()).toBeVisible();
  expect(sent.body).toMatchObject({ action: 'request' });
  // The refused nights are never offered back.
  for (const alt of await gate.locator('[data-alternative]').all()) {
    const from = (await alt.getAttribute('data-alternative'))!;
    expect([from, addDays(from, 1)]).not.toContain(checkIn);
  }
});

for (const viewport of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 375, height: 800 }]) {
  test.describe(`the new package and the dialog's accessibility on ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });
  test('the prep day + wedding night package is bookable, with its dates and up to 3 overnight guests', async ({ page }) => {
  const sent = await fakeBackend(page);
  await openBooking(page);
  const wedding = addDays(israelToday(), 45);
  const booking = page.locator('#booking');
  await expect(booking.getByText('אינו זמין להזמנה דרך האתר'), 'the package is no longer inquiry-only').toHaveCount(0);
  const ref = await submitBooking(page, {
    stayType: 'bride_day_wedding_night',
    checkIn: wedding,
    adults: 3,
    participants: 5,
    name: 'בדיקה אוטומטית',
    phone: '0501234567',
  });
  expect(ref).toBe('SH-CI000');
  expect(sent.body).toMatchObject({ action: 'request', stayType: 'bride_day_wedding_night', checkIn: wedding, checkOut: '', adults: 3, participants: 5 });
  const facts = booking.locator('.request-facts');
  await expect(facts).toContainText(addDays(wedding, -1).split('-').reverse().join('.'));
  await expect(facts).toContainText(addDays(wedding, 1).split('-').reverse().join('.'));
  await expect(booking.getByText('יציאה עד 13:00 למחרת החתונה').first()).toBeVisible();
});

  test('the date notice and the nearby dates pass the accessibility scan', async ({ page }) => {
  const { AxeBuilder } = await import('@axe-core/playwright');
  const checkIn = addDays(israelToday(), 40);
  await fakeBackend(page, { taken: [checkIn] });
  const booking = await openBar(page);
  await booking.locator('.booking-bar-continue').click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  const scan = async () => (await new AxeBuilder({ page }).include('.booking-gate').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map((v) => `${v.help} (${v.id})`);
  expect(await scan(), 'the date notice breaks accessibility rules').toEqual([]);
  await page.getByRole('alertdialog').getByRole('button', { name: 'סגירה' }).click();
  await pickDates(page, [checkIn, addDays(checkIn, 1)]);
  await booking.locator('.booking-bar-continue').click();
  await expect(page.locator('[data-alternative]').first()).toBeVisible();
  expect(await scan(), 'the nearby dates break accessibility rules').toEqual([]);
});
  });
}
