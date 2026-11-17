// The booking form with minimum nights and a changed price (the pricing plan's step 4), against a fake
// backend. The CI site's price list has a minimum of 2 nights on MIN_DATE (playwright.ci.config.ts).
import { expect, test, type Page } from '@playwright/test';
import { CI_PRICE_LIST, FAKE_API, MIN_DATE } from '../../playwright.ci.config';
import { addDays, estimatePrice } from '../../shared/rules.js';
import { openBooking, showMonthOf } from '../e2e/lib/site';

const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

/** Availability and the live check say free; requests answer `answers` in turn, then success. */
async function fakeBackend(page: Page, answers: Record<string, unknown>[] = []) {
  const posts: Record<string, any>[] = [];
  const checks: string[] = [];
  await page.route('https://www.google.com/recaptcha/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: 'window.grecaptcha = { ready: (f) => f(), execute: () => Promise.resolve("ci-token") };' })
  );
  await page.route(`${FAKE_API}**`, async (route) => {
    const req = route.request();
    const from = israelToday();
    if (req.method() === 'GET') {
      const url = new URL(req.url());
      if (url.searchParams.get('action') === 'check') checks.push(`${url.searchParams.get('checkIn')}..${url.searchParams.get('checkOut')}`);
      return route.fulfill({ json: { ok: true, free: true, conflicts: [], from, to: addDays(from, 366), blocked: [], busy: [] } });
    }
    posts.push(JSON.parse(req.postData() ?? 'null'));
    return route.fulfill({ json: answers[posts.length - 1] ?? { ok: true, ref: 'SH-CI000', holdHours: 24 } });
  });
  return { posts, checks };
}

const day = (page: Page, date: string) => page.locator(`.shorashim-calendar [data-day="${date}"]`);

async function pick(page: Page, date: string) {
  await showMonthOf(page, date);
  await day(page, date).locator('button').click();
}

async function fillGuest(page: Page) {
  const booking = page.locator('#booking');
  await booking.locator('input[name="guest-name"]').fill('בדיקת מינימום');
  await booking.locator('input[name="phone"]').fill('0501234567');
}

test('a check-out below the minimum is not offered, and a line says the minimum from that arrival', async ({ page }) => {
  await fakeBackend(page);
  await openBooking(page);
  await page.locator('#booking [data-stay-type="couple"]').click();
  await pick(page, MIN_DATE);
  await expect(page.locator('#booking .booking-minimum-note')).toContainText('אפשר להזמין לפחות 2 לילות');
  await expect(day(page, addDays(MIN_DATE, 1)).locator('button')).toBeDisabled();
  await expect(day(page, addDays(MIN_DATE, 2)).locator('button')).toBeEnabled();
  // The night before: a one-night stay ends on MIN_DATE and is fine.
  await pick(page, addDays(MIN_DATE, -3));
  await expect(page.locator('#booking .booking-minimum-note')).toHaveCount(0);
});

test('a minimum the server knows of offers to extend the stay, and checks the longer stay', async ({ page }) => {
  const checkIn = addDays(israelToday(), 60);
  const { posts, checks } = await fakeBackend(page, [{ ok: false, error: 'price_changed', price: 1800, minimum: 3 }]);
  await openBooking(page);
  await page.locator('#booking [data-stay-type="couple"]').click();
  await pick(page, checkIn);
  await pick(page, addDays(checkIn, 2));
  await fillGuest(page);
  await page.locator('#submit-booking-request').click();
  const gate = page.locator('.booking-gate');
  await expect(gate).toContainText('אפשר להזמין לפחות 3 לילות');
  expect(posts[0]).toMatchObject({ pricingV2: true });
  await gate.getByRole('button', { name: 'להאריך ל־3 לילות' }).click();
  await expect.poll(() => checks).toContain(`${checkIn}..${addDays(checkIn, 3)}`);
});

test('a changed price is shown, and the guest sends again at the new price', async ({ page }) => {
  const checkIn = addDays(israelToday(), 70);
  const shown = estimatePrice('couple', 2, 2, CI_PRICE_LIST, checkIn)!;
  const { posts } = await fakeBackend(page, [{ ok: false, error: 'price_changed', price: shown + 200, minimum: 1 }]);
  await openBooking(page);
  await page.locator('#booking [data-stay-type="couple"]').click();
  await pick(page, checkIn);
  await pick(page, addDays(checkIn, 2));
  await fillGuest(page);
  await page.locator('#submit-booking-request').click();
  const prompt = page.locator('.booking-price-change');
  await expect(prompt).toContainText(`₪${(shown + 200).toLocaleString('he-IL')}`);
  await expect(prompt).toContainText(`₪${shown.toLocaleString('he-IL')}`);
  expect(posts[0]).toMatchObject({ pricingV2: true, shownPrice: shown });
  await prompt.getByRole('button', { name: 'שליחה במחיר המעודכן' }).click();
  await expect(page.locator('#booking').getByText('מספר הבקשה:')).toBeVisible();
  expect(posts[1]).toMatchObject({ pricingV2: true, shownPrice: shown + 200 });
  expect(posts[1].requestId, 'a new request, not the cached refusal').not.toBe(posts[0].requestId);
});
