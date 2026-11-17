// The owner console's prices screen (admin/index.html, "מחירים") against a fake backend: the layout on
// phones (320 and 390 px), tap targets, the one update form for a single date with its two-night
// total, the preview, conflicts before saving, a stale save, and the form with the keyboard open.
// The staging suite (tests/e2e/console.spec.ts, O14) covers the same against the real backend.
import { expect, test, type Page } from '@playwright/test';
import { buildPriceList } from '../../shared/rules.js';

// The console's CSP only lets it call script.google.com, so the fake backend lives at such a URL.
const FAKE = 'https://script.google.com/macros/s/ci-fake/exec';
const TODAY = '2026-11-17';
const BASE = { perNight: 1050, weekendPerNight: 1200, thirdGuestPercent: 35, bride_day: 1850, bride_night_day: 2650, wedding_night: 1150, bride_day_wedding_night: 2750 };
const DECEMBER = { id: 'udec2026', name: 'דצמבר 2026', from: '2026-12-01', to: '2026-12-31', weekday: 850, weekend: 1050 };

type Update = { id: string; name: string; from: string; to: string; weekday?: number; weekend?: number; minimum?: number; twoNight?: number };

/** A fake backend for the console: the overview and the price operations, kept in memory. */
async function fakeConsole(page: Page, { stale = false } = {}) {
  const state = { base: { ...BASE } as Record<string, number>, updates: [DECEMBER] as Update[], saves: [] as unknown[], token: 1 };
  const prices = () => ({
    ok: true, today: TODAY, minimumsEnabled: false, token: `t${state.token}`, base: state.base, updates: state.updates, invalidRows: [],
    problems: [], warnings: [], valid: true, structure: '', status: { valid: true }, notice: null,
    published: buildPriceList(state.base, state.updates, TODAY, false),
  });
  await page.addInitScript((url) => {
    (window as any).CONSOLE_API = url;
    localStorage.setItem('shorashim-console-token', 'ci-session');
  }, FAKE);
  await page.route(`${FAKE}**`, async (route) => {
    const req = route.request();
    if (req.method() === 'GET') return route.fulfill({ json: { ok: true, free: true, conflicts: [] } });
    const body = JSON.parse(req.postData() ?? '{}');
    const args = body.args ?? {};
    if (body.op === 'overview') {
      return route.fulfill({ json: {
        ok: true, today: TODAY, generatedAt: new Date().toISOString(), holdHours: 24, blockReasons: ['אחר'], holdChoices: [24],
        prices: state.base, priceList: prices().published, requests: [], decisions: [], bookings: [], channels: [],
        health: { staging: true, mirrorsRefreshedAt: '', pricesVersion: prices().published.version, triggers: [] },
      } });
    }
    if (body.op === 'prices') return route.fulfill({ json: prices() });
    state.saves.push({ op: body.op, args });
    if (stale || args.token !== `t${state.token}`) return route.fulfill({ json: { ok: false, error: 'stale', token: `t${state.token}` } });
    if (body.op === 'addUpdate') state.updates.push({ ...args.update, id: `unew${state.updates.length}abc` });
    if (body.op === 'editUpdate') state.updates = state.updates.map((u) => (u.id === args.update.id ? args.update : u));
    if (body.op === 'removeUpdate') state.updates = state.updates.filter((u) => u.id !== args.id);
    if (body.op === 'saveBase') Object.assign(state.base, args.base);
    state.token++;
    return route.fulfill({ json: { ok: true, valid: true, version: prices().published.version, token: `t${state.token}` } });
  });
  return state;
}

async function openPrices(page: Page) {
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'מחירים' }).click();
  await expect(page.locator('#pb-perNight')).toHaveValue('1050');
}

for (const width of [320, 390]) {
  test(`the prices screen fits a ${width}px phone: no sideways scroll, tap targets of 44px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await fakeConsole(page);
    await openPrices(page);
    await page.getByRole('button', { name: '＋ הוספת עדכון' }).click();
    await page.locator('#pf-from').fill('2026-12-31');
    await page.locator('#pf-from').blur();
    await expect(page.locator('#pf-night')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll').toBe(true);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('#screen-prices button, #screen-prices input:not([type=checkbox]), nav.tabs button')]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({ el: (el as HTMLElement).id || el.textContent?.trim(), h: el.getBoundingClientRect().height }))
        .filter((x) => x.h < 44)
    );
    expect(small, 'tap targets under 44px').toEqual([]);
  });
}

test('New Year\'s Eve as one update: the night price in its weekday column, the two-night total, the preview and an edit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fakeConsole(page);
  await openPrices(page);
  await page.getByRole('button', { name: '＋ הוספת עדכון' }).click();
  await page.locator('#pf-name').fill('סילבסטר');
  await page.locator('#pf-from').fill('2026-12-31');
  await page.locator('#pf-from').blur();
  await expect(page.locator('#pf-to')).toHaveValue('2026-12-31');
  await expect(page.locator('#price-form')).toContainText('31.12.2026 הוא יום חמישי: המחיר נשמר בעמודת ה׳–ש׳');
  await page.locator('#pf-night').fill('1250');
  await page.locator('#pf-two').fill('2100');
  await expect(page.locator('#price-form')).toContainText('עזיבה ב־02.01.2027');
  await expect(page.locator('#pf-preview')).toContainText('₪1,250');
  await expect(page.locator('#pf-preview')).toContainText('₪2,100');
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.locator('#prices-msg')).toContainText('נשמר, והמחירים באתר עודכנו');
  expect(state.saves[0]).toMatchObject({ op: 'addUpdate', args: { update: { name: 'סילבסטר', from: '2026-12-31', to: '2026-12-31', weekend: 1250, twoNight: 2100 } } });
  const card = page.locator('.ucard', { hasText: 'סילבסטר' });
  await expect(card).toContainText('₪1,250');
  await expect(card).toContainText('₪2,100');
  // Reopened for editing, with both prices.
  await card.getByRole('button', { name: 'עריכת סילבסטר' }).click();
  await expect(page.locator('#pf-night')).toHaveValue('1250');
  await expect(page.locator('#pf-two')).toHaveValue('2100');
  await page.locator('#pf-night').fill('1300');
  await expect(page.locator('#pf-preview')).toContainText('₪1,300');
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.locator('#prices-msg')).toContainText('נשמר');
  // The price check, from the published list: 3 guests over New Year's.
  await page.locator('#pc-from').fill('2026-12-31');
  await page.locator('#pc-from').blur();
  await page.locator('#pc-to').fill('2027-01-02');
  await page.locator('#pc-to').blur();
  await page.getByRole('button', { name: '3 אורחים' }).click();
  await expect(page.locator('#pc-out')).toContainText('₪2,835');
  await expect(page.locator('#pc-out')).toContainText('התאריכים פנויים');
});

test('a conflicting range is shown before saving, and a stale screen is refused', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fakeConsole(page, { stale: true });
  await openPrices(page);
  await page.getByRole('button', { name: '＋ הוספת עדכון' }).click();
  await page.locator('#pf-name').fill('חגים');
  await page.locator('#pf-from').fill('2026-12-20');
  await page.locator('#pf-from').blur();
  await page.locator('#pf-to').fill('2027-01-05');
  await page.locator('#pf-to').blur();
  await page.locator('#pf-weekday').fill('900');
  await expect(page.locator('#pf-error')).toContainText('העדכון סותר את "דצמבר 2026"');
  await page.getByRole('button', { name: 'שמירה' }).click();
  expect(state.saves, 'nothing sent').toHaveLength(0);
  // Nested inside December: fine. The fake backend then answers that the sheet changed meanwhile.
  await page.locator('#pf-to').fill('2026-12-27');
  await page.locator('#pf-to').blur();
  await expect(page.locator('#pf-error')).toHaveText('');
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.locator('#prices-msg')).toContainText('המחירון השתנה מאז שנפתח המסך');
});

test('with the keyboard open (half the height), the error and the save button stay reachable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 420 });
  await fakeConsole(page);
  await openPrices(page);
  await page.getByRole('button', { name: '＋ הוספת עדכון' }).click();
  await page.locator('#pf-from').fill('2027-03-01');
  await page.locator('#pf-from').blur();
  await page.locator('#pf-night').fill('900');
  const save = page.getByRole('button', { name: 'שמירה' });
  await save.scrollIntoViewIfNeeded();
  await expect(save).toBeInViewport();
  await save.click();
  await expect(page.locator('#pf-error')).toContainText('צריך שם לעדכון');
  await page.locator('#pf-error').scrollIntoViewIfNeeded();
  await expect(page.locator('#pf-error')).toBeInViewport();
});
