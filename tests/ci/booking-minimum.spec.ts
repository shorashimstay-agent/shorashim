// The booking form with minimum nights and a changed price (the pricing plan's step 4), against a fake
// backend. The CI site's price list has a minimum of 2 nights on MIN_DATE (playwright.ci.config.ts).
import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import { FAKE_API } from '../../playwright.ci.config';
import { addDays, buildPriceList, daysBetween, estimatePrice } from '../../shared/rules.js';
import { openBooking, showMonthOf } from '../e2e/lib/site';

const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

// This spec's own price list: the CI fixture plus a minimum of 2 nights on MIN_DATE and on the coming
// New Year's Eve. Only this spec's pages get it (fakeBackend), so the other specs' dates never meet a
// minimum. MIN_DATE keeps clear of New Year's Eve, so its neighbours never carry that minimum.
const today = israelToday();
const thisNye = `${today.slice(0, 4)}-12-31`;
const NYE_DATE = thisNye > addDays(today, 2) ? thisNye : `${Number(today.slice(0, 4)) + 1}-12-31`;
const nearNye = (d: string) => Math.abs(daysBetween(d, NYE_DATE)) < 10 || Math.abs(daysBetween(d, addDays(NYE_DATE, -365))) < 10;
const MIN_DATE = nearNye(addDays(today, 320)) ? addDays(today, 345) : addDays(today, 320);
const fixture = JSON.parse(fs.readFileSync('tests/e2e/fixtures/prices.json', 'utf8'));
const CI_PRICE_LIST = buildPriceList(fixture.base, [
  ...fixture.updates,
  { id: 'umin00001', name: 'מינימום', from: MIN_DATE, to: MIN_DATE, minimum: 2 },
  { id: 'umin00002', name: 'סילבסטר', from: NYE_DATE, to: NYE_DATE, minimum: 2 },
], '', true);
const PRICES_CSV = `"${JSON.stringify(CI_PRICE_LIST).replace(/"/g, '""')}",""`;

/** Availability and the live check say free; requests answer `answers` in turn, then success. */
async function fakeBackend(page: Page, answers: Record<string, unknown>[] = [], { delayMs = 0 } = {}) {
  const posts: Record<string, any>[] = [];
  const checks: string[] = [];
  // The CI site reads its prices from a data: URL, which routes can't intercept: this page's fetch
  // answers it with this spec's list instead.
  await page.addInitScript((csv) => {
    const real = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) =>
      String(input instanceof Request ? input.url : input).startsWith('data:text/csv') ? Promise.resolve(new Response(csv, { status: 200 })) : real(input, init);
  }, PRICES_CSV);
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
    if (delayMs && posts.length > 1) await new Promise((r) => setTimeout(r, delayMs));
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
  // A new arrival three nights earlier: its first night has no minimum, so the note goes.
  await pick(page, addDays(MIN_DATE, -3));
  await expect(page.locator('#booking .booking-minimum-note')).toHaveText('');
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

test('a double tap on "שליחה במחיר המעודכן" sends once, and the guest sees the request was received', async ({ page }) => {
  const checkIn = addDays(israelToday(), 75);
  const { posts } = await fakeBackend(page, [{ ok: false, error: 'price_changed', price: 2000, minimum: 1 }, { ok: true, ref: 'SH-CI001', holdHours: 24 }, { ok: false, error: 'unavailable', nights: [checkIn] }], { delayMs: 1500 });
  await openBooking(page);
  await page.locator('#booking [data-stay-type="couple"]').click();
  await pick(page, checkIn);
  await pick(page, addDays(checkIn, 2));
  await fillGuest(page);
  await page.locator('#submit-booking-request').click();
  await page.locator('.booking-price-change').getByRole('button', { name: 'שליחה במחיר המעודכן' }).dblclick();
  await expect(page.locator('#booking').getByText('מספר הבקשה:')).toBeVisible();
  expect(posts, 'the second tap sent nothing').toHaveLength(2);
  await expect(page.locator('.booking-gate')).not.toBeVisible();
});

test('on a phone, through the booking bar: a minimum on New Year\'s Eve, picked across the year boundary', async ({ page }) => {
  // Around the turn of the year (late December, early January) the coming New Year's Eve stay ends
  // too close to, or beyond, the end of the bookable year.
  test.skip(daysBetween(israelToday(), NYE_DATE) + 2 > 360, 'the coming year boundary is outside the bookable window today');
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeBackend(page);
  await page.goto('/');
  const booking = page.locator('#booking');
  await booking.evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
  const panel = booking.locator('.booking-bar-dates');
  if (!(await panel.evaluate((el) => (el as HTMLDetailsElement).open))) await panel.locator('summary').click();
  // The bar's own calendar (the page has another, inside the details panel).
  const barDay = (d: string) => panel.locator(`.shorashim-calendar [data-day="${d}"]`);
  const showInBar = async (d: string) => {
    for (let i = 0; i < 14 && !(await barDay(d).isVisible()); i++) await panel.locator('.rdp-button_next').click();
    await expect(barDay(d)).toBeVisible();
  };
  const pickInBarDay = async (d: string) => {
    if (!(await panel.evaluate((el) => (el as HTMLDetailsElement).open))) await panel.locator('summary').click();
    await showInBar(d);
    await barDay(d).locator('button').click();
  };
  await pickInBarDay(NYE_DATE);
  await expect(panel.locator('.booking-minimum-note')).toContainText('אפשר להזמין לפחות 2 לילות');
  // 1 January is in the next month and year: shown, and not offered as a check-out.
  if (!(await panel.evaluate((el) => (el as HTMLDetailsElement).open))) await panel.locator('summary').click();
  await showInBar(addDays(NYE_DATE, 1));
  await expect(barDay(addDays(NYE_DATE, 1)).locator('button')).toBeDisabled();
  await pickInBarDay(addDays(NYE_DATE, 2));
  await booking.locator('.booking-bar-continue').click();
  const details = page.locator('.booking-request-screen');
  await expect(details.getByText('התאריכים שבחרתם פנויים')).toBeVisible();
  const price = estimatePrice('couple', 2, 2, CI_PRICE_LIST, NYE_DATE)!;
  await expect(details).toContainText(price.toLocaleString('he-IL'));
});

test('the price-change banner goes when the stay changes, and "שינוי תאריכים" returns to a calendar day', async ({ page }) => {
  const checkIn = addDays(israelToday(), 80);
  await fakeBackend(page, [{ ok: false, error: 'price_changed', price: 2222, minimum: 1 }, { ok: false, error: 'price_changed', price: 2222, minimum: 1 }]);
  await openBooking(page);
  await page.locator('#booking [data-stay-type="couple"]').click();
  await pick(page, checkIn);
  await pick(page, addDays(checkIn, 2));
  await fillGuest(page);
  await page.locator('#submit-booking-request').click();
  await expect(page.locator('.booking-price-change')).toBeVisible();
  await page.locator('#booking [data-adults="3"]').click();
  await expect(page.locator('.booking-price-change'), 'another stay: the old figures go').toHaveCount(0);
  await page.locator('#submit-booking-request').click();
  await page.locator('.booking-price-change').getByRole('button', { name: 'שינוי תאריכים' }).click();
  await expect(page.locator('.shorashim-calendar button:focus')).toHaveCount(1);
});
