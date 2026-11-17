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
async function fakeConsole(page: Page, { stale = false, copiedId = false, badBase = false } = {}) {
  const state = { base: { ...BASE } as Record<string, number>, updates: [DECEMBER] as Update[], saves: [] as unknown[], token: 1 };
  const prices = () => ({
    ok: true, today: TODAY, minimumsEnabled: false, token: `t${state.token}`, updates: state.updates,
    // badBase: perNight typed as "1o50" in the sheet, so the base doesn't read until it is fixed.
    base: badBase && state.base.perNight === BASE.perNight ? null : state.base,
    rawBase: Object.fromEntries(Object.entries(state.base).map(([k, v]) => [k, badBase && k === 'perNight' && v === BASE.perNight ? '1o50' : String(v)])),
    // copiedId: a pasted row that kept the id of December's row.
    invalidRows: copiedId ? [{ row: 24, id: 'udec2026', code: 'id', reason: 'מזהה שורה חסר או כפול', cells: ['udec2026', 'ינואר', '2027-01-05', '2027-01-10', '900', '', '', ''] }] : [],
    problems: copiedId ? ['שורה 24: מזהה שורה חסר או כפול'] : [], warnings: [], valid: !copiedId, structure: '', status: { valid: true }, notice: null,
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
  // The form closes, and adding is offered again, with focus on it.
  await expect(page.locator('#price-form')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '＋ הוספת עדכון' })).toBeVisible();
  await expect(page.getByRole('button', { name: '＋ הוספת עדכון' })).toBeFocused();
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
  await expect(page.getByRole('button', { name: '3 אורחים' })).toBeFocused();
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

test('a double tap saves once, and typing in the form asks for availability only once per dates', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fakeConsole(page);
  let checks = 0;
  page.on('request', (r) => { if (r.method() === 'GET' && r.url().includes('action=check')) checks++; });
  await openPrices(page);
  await page.locator('#pc-from').fill('2027-02-01');
  await page.locator('#pc-from').blur();
  await expect(page.locator('#pc-out')).toContainText('התאריכים פנויים');
  const before = checks;
  await page.getByRole('button', { name: '＋ הוספת עדכון' }).click();
  await page.locator('#pf-name').pressSequentially('חורף');
  await page.locator('#pf-from').fill('2027-02-01');
  await page.locator('#pf-from').blur();
  await page.locator('#pf-night').pressSequentially('990');
  await expect(page.locator('#pc-out')).toContainText('כולל העדכון שבעריכה');
  expect(checks - before, 'no new availability checks while typing').toBe(0);
  await page.locator('#pb-perNight').fill('1060');
  await page.getByRole('button', { name: 'שמירת מחירי בסיס' }).dblclick();
  await expect(page.locator('#prices-msg')).toContainText('נשמר');
  expect(state.saves.filter((x: any) => x.op === 'saveBase')).toHaveLength(1);
});

test('switching between one night and a range keeps the price, and a refused save keeps focus on its message', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeConsole(page, { stale: true });
  await openPrices(page);
  await page.getByRole('button', { name: '＋ הוספת עדכון' }).click();
  await page.locator('#pf-name').fill('אביב');
  await page.locator('#pf-from').fill('2027-03-01');
  await page.locator('#pf-from').blur();
  await page.locator('#pf-night').fill('900');
  await page.locator('#pf-to').fill('2027-03-03');
  await page.locator('#pf-to').blur();
  await expect(page.locator('#pf-weekday'), '1.3.2027 is a Monday: its price moves to א׳–ד׳').toHaveValue('900');
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.locator('#prices-msg')).toContainText('המחירון השתנה');
  await expect(page.locator('#prices-msg')).toBeFocused();
  await expect(page.locator('#pf-weekday'), 'the form keeps the values').toHaveValue('900');
});

test('a row whose id was copied offers no buttons that would act on the original', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeConsole(page, { copiedId: true });
  await openPrices(page);
  const bad = page.locator('.ucard.bad');
  await expect(bad).toContainText('המזהה של השורה יתוקן אוטומטית');
  await expect(bad.getByRole('button')).toHaveCount(0);
});

test('an invalid base value is shown as typed in the sheet and can be fixed back', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fakeConsole(page, { badBase: true });
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'מחירים' }).click();
  await expect(page.locator('#pb-perNight')).toHaveValue('');
  await page.locator('#pb-perNight').fill('1050');
  await page.getByRole('button', { name: 'שמירת מחירי בסיס' }).click();
  await expect(page.locator('#prices-msg')).toContainText('נשמר');
  expect(state.saves.at(-1)).toMatchObject({ op: 'saveBase', args: { base: { perNight: 1050 } } });
});

test('a base save leaves an open update form as it was', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeConsole(page);
  await openPrices(page);
  await page.getByRole('button', { name: '＋ הוספת עדכון' }).click();
  await page.locator('#pf-name').fill('טיוטה');
  await page.locator('#pb-perNight').fill('1060');
  await page.getByRole('button', { name: 'שמירת מחירי בסיס' }).click();
  await expect(page.locator('#prices-msg')).toContainText('נשמר');
  await expect(page.locator('#pf-name')).toHaveValue('טיוטה');
});

test('conflicting updates are marked on their cards by name', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fakeConsole(page);
  state.updates.push({ id: 'uhol0001', name: 'חגים', from: '2026-12-20', to: '2027-01-05', weekday: 900 });
  await page.route('https://script.google.com/macros/s/ci-fake/exec**', async (route) => {
    const body = JSON.parse(route.request().postData() ?? '{}');
    if (body.op !== 'prices') return route.fallback();
    return route.fulfill({ json: {
      ok: true, today: TODAY, minimumsEnabled: false, token: 't1', base: BASE, updates: state.updates, invalidRows: [], warnings: [], structure: '',
      valid: false, problems: ['העדכונים ״דצמבר 2026״ ו־״חגים״ סותרים'], conflicts: [{ a: 'udec2026', b: 'uhol0001', field: 'weekday' }],
      status: { valid: false }, notice: null, published: buildPriceList(BASE, [DECEMBER], TODAY, false),
    } });
  });
  await openPrices(page);
  await expect(page.locator('.ucard.bad[data-update="udec2026"]')).toContainText('סותר את ״חגים״');
  await expect(page.locator('.ucard.bad[data-update="uhol0001"]')).toContainText('סותר את ״דצמבר 2026״');
});

test('an edit refused as stale reopens with the sheet\'s values, so the next save keeps the change it was refused for', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await fakeConsole(page);
  await openPrices(page);
  await page.locator('.ucard', { hasText: 'דצמבר 2026' }).getByRole('button', { name: 'עריכת דצמבר 2026' }).click();
  await page.locator('#pf-name').fill('דצמבר 2026 מעודכן');
  // Meanwhile, someone changes December's weekend price in the sheet.
  state.updates = state.updates.map((u) => (u.id === 'udec2026' ? { ...u, weekend: 1111 } : u));
  state.token++;
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.locator('#prices-msg')).toContainText('המחירון השתנה');
  await expect(page.locator('#pf-weekend'), 'the form shows the sheet as it is now').toHaveValue('1111');
  await page.getByRole('button', { name: 'שמירה' }).click();
  await expect(page.locator('#prices-msg')).toContainText('נשמר');
  expect(state.saves.at(-1)).toMatchObject({ op: 'editUpdate', args: { update: { id: 'udec2026', weekend: 1111 } } });
});
