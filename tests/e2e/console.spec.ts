// Owner console (console/) against the staging backend. Scenario IDs match tests/e2e/PLAN.md §4 (O).
//
// A test browser cannot sign in to Google, so the console's own deployment is only checked from the
// outside (O8: it is private). Everything else runs the real console/Console.html in the browser,
// with google.script.run replaced by a bridge that makes Server.js's signed call from this process;
// the signing secret never enters the page.
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  addDays,
  bookingEvents,
  bookingRows,
  cleanup,
  israelToday,
  owner,
  randomPhone,
  requestEvents,
  requestRows,
  waitFor,
  webApp,
} from './lib/backend';
import { e2e, runTag, staging as cfg } from './lib/env';

const api = webApp(cfg);
const CONSOLE_PAGE = pathToFileURL('console/Console.html').href;

// Scenario nights 150–240 days ahead, apart from booking.spec.ts's window (250–360).
const base = addDays(israelToday(), 150 + Math.floor(Math.random() * 80));
const slot = (i: number) => addDays(base, i * 5);
const guestName = (who: string) => `${runTag} ${who}`;
let refSeq = 0;

/** A pending website request, as createRequest_ stores it, without going through reCAPTCHA. */
async function fixtureRequest(who: string, start: string, nights: number, extra: Record<string, unknown> = {}) {
  const name = guestName(who);
  const end = addDays(start, nights);
  const ref = `SH-C${runTag.slice(-4)}${++refSeq}`;
  const req = { stayType: 'couple', checkIn: start, checkOut: end, start, end, nights, adults: 2, name, phone: randomPhone(), email: '', notes: `${runTag} בדיקת קונסולה`, estimate: 950 * nights, ref, ...extra };
  const ev = await owner.insertEvent(cfg.calendars.requests, {
    summary: `⏳ ${name} · אירוח זוגי בוטיק`,
    start: { date: start },
    end: { date: end },
    extendedProperties: { shared: { request: JSON.stringify(req), createdAt: new Date().toISOString(), status: 'pending' } },
  });
  return { id: ev.iCalUID as string, name, ref, start, end, req };
}

async function openConsole(page: Page) {
  await page.exposeFunction('__consoleApi', (op: string, args: { id?: string; decision?: string }) => api.console(op, args));
  await page.addInitScript(() => {
    type Handler = ((value: unknown) => void) | null;
    const runner = (ok: Handler, fail: Handler): unknown =>
      new Proxy(
        {},
        {
          get: (_target, name: string) => {
            if (name === 'withSuccessHandler') return (fn: Handler) => runner(fn, fail);
            if (name === 'withFailureHandler') return (fn: Handler) => runner(ok, fn);
            return (...args: unknown[]) => (window as any).__consoleApi(...args).then((r: unknown) => ok?.(r), (e: unknown) => fail?.(e));
          },
        }
      );
    (window as any).google = { script: { get run() { return runner(null, null); } } };
  });
  await page.goto(CONSOLE_PAGE);
  await expect(page.locator('#requests-sub')).not.toHaveText('טוען…', { timeout: 90_000 });
}

/** The calendar cell of `date`, moving month by month until it is shown. */
async function calendarDay(page: Page, date: string) {
  const cell = page.locator(`[data-date="${date}"]`);
  for (let i = 0; i < 14 && !(await cell.count()); i++) {
    const shown = (await page.locator('[data-date]').first().getAttribute('data-date')) ?? '';
    await page.getByRole('button', { name: shown.slice(0, 7) < date.slice(0, 7) ? 'החודש הבא' : 'החודש הקודם' }).click();
  }
  return cell;
}

const card = (page: Page, id: string) => page.locator(`[data-request-id="${id}"]`);

async function decideInConsole(page: Page, id: string, decision: 'approve' | 'decline') {
  await card(page, id).locator(`[data-action="${decision}"]`).click();
  await card(page, id).locator('[data-action="confirm"]').click();
  const result = page.locator(`[data-result-for="${id}"]`);
  await expect(result).toBeVisible({ timeout: 120_000 });
  return result;
}

test.afterAll(async () => {
  const log = await cleanup(cfg, runTag);
  console.log(`[O] console cleanup for ${runTag}: ${log.length} item(s)`);
});

test('O1: the overview shows requests, bookings and channel bookings, as the admin sheet does', async ({ page }) => {
  const r = await fixtureRequest('קונסולה סקירה', slot(0), 2);
  const blockTitle = `${runTag} חסימה ידנית קונסולה`;
  const channelTitle = `${runTag} Booking.com`;
  await owner.insertEvent(cfg.calendars.bookings, { summary: blockTitle, start: { date: slot(1) }, end: { date: addDays(slot(1), 2) } });
  await owner.insertEvent(cfg.calendars.channels, { summary: channelTitle, start: { date: slot(2) }, end: { date: addDays(slot(2), 3) } });

  const o = await api.console('overview');
  expect(o.ok).toBe(true);
  expect(o.requests.find((x: any) => x.id === r.id)).toMatchObject({ ref: r.ref, name: r.name, holding: true, start: r.start, end: r.end, conflicts: [] });
  expect(o.bookings.find((b: any) => b.title === blockTitle)).toMatchObject({ source: 'manual', start: slot(1), nights: 2 });
  expect(o.channels.find((c: any) => c.title === channelTitle)).toMatchObject({ start: slot(2), nights: 3 });
  expect(o.health.staging).toBe(true);
  expect(o.health.triggers).toEqual(expect.arrayContaining(['onSheetEdit', 'onSnapshotTimer']));

  // The sheet is built from the same data: the request shows there too once the mirrors refresh.
  await waitFor('request in the admin sheet', async () => (await requestRows(cfg)).some((row) => row.ref === r.ref), 240_000, 10_000);

  await openConsole(page);
  await expect(card(page, r.id)).toContainText(r.name);
  await expect(card(page, r.id)).toContainText('התאריכים שמורים');
  await page.getByRole('button', { name: 'הזמנות' }).click();
  await expect(page.locator('#bookings-upcoming')).toContainText(blockTitle);
  await page.getByRole('button', { name: 'ערוצים' }).click();
  await expect(page.locator('#channels')).toContainText(channelTitle);
  await page.getByRole('button', { name: 'יומן' }).click();
  await expect(await calendarDay(page, slot(1))).toHaveClass(/block/);
  await expect(await calendarDay(page, slot(0))).toHaveClass(/hold/);
  await expect(await calendarDay(page, slot(2))).toHaveClass(/ota/);
});

test('O2: approving in the console books the stay, invites the guest and updates the sheet', async ({ page }) => {
  const r = await fixtureRequest('קונסולה אישור', slot(3), 2, { email: e2e.guestA.email });
  await openConsole(page);
  const result = await decideInConsole(page, r.id, 'approve');
  await expect(result).toContainText('אושרה ונוספה ליומן');
  await expect(result).toContainText(`נשלח זימון ליומן אל ${e2e.guestA.email}`);
  await expect(result.getByRole('link', { name: 'שליחת אישור ב-WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\//);

  expect(await requestEvents(cfg, r.name)).toHaveLength(0);
  const booked = await bookingEvents(cfg, r.name);
  expect(booked).toHaveLength(1);
  expect(booked[0].attendees?.map((a) => a.email)).toEqual([e2e.guestA.email]);
  await waitFor('booking in the admin sheet', async () => (await bookingRows(cfg)).some((row) => row.ref === r.ref), 240_000, 10_000);
  const o = await api.console('overview');
  expect(o.decisions.find((d: any) => d.ref === r.ref)).toMatchObject({ result: 'approved' });
});

test('O3: declining in the console frees the nights and leaves no booking', async ({ page }) => {
  const r = await fixtureRequest('קונסולה דחייה', slot(4), 1);
  await openConsole(page);
  const result = await decideInConsole(page, r.id, 'decline');
  await expect(result).toContainText('נדחתה והתאריכים נפתחו שוב');
  expect(await requestEvents(cfg, r.name)).toHaveLength(0);
  expect(await bookingEvents(cfg, r.name)).toHaveLength(0);
  const a = await api.availability();
  expect(a.blocked).not.toContain(r.start);
});

test('O4: a request decided elsewhere shows as handled, and cannot be decided again', async ({ page }) => {
  const r = await fixtureRequest('קונסולה כפול', slot(5), 1);
  await openConsole(page);
  await expect(card(page, r.id)).toBeVisible();
  // Declined from the email link while the console still shows it.
  expect(await api.decide('decline', r.id)).toMatchObject({ ok: true, result: 'declined' });
  const result = await decideInConsole(page, r.id, 'approve');
  await expect(result).toContainText('כבר טופלה');
  expect(await bookingEvents(cfg, r.name)).toHaveLength(0);
  await page.locator('#refresh-btn').click();
  await expect(card(page, r.id)).toHaveCount(0);
  await expect(page.locator(`[data-decision-ref="${r.ref}"]`)).toContainText('נדחתה');
});

test('O5: when its nights are taken, approval is refused in the console and by the backend', async ({ page }) => {
  const start = slot(6);
  await owner.insertEvent(cfg.calendars.bookings, { summary: `${runTag} תפוס`, start: { date: addDays(start, 1) }, end: { date: addDays(start, 2) } });
  const r = await fixtureRequest('קונסולה חפיפה', start, 2);
  const o = await api.console('overview');
  expect(o.requests.find((x: any) => x.id === r.id).conflicts).toEqual([addDays(start, 1)]);
  await openConsole(page);
  await expect(card(page, r.id).locator('[data-action="approve"]')).toBeDisabled();
  await expect(card(page, r.id)).toContainText('כבר תפוסים');
  expect(await api.console('decide', { id: r.id, decision: 'approve' })).toMatchObject({ ok: false, error: 'unavailable' });
  expect(await api.console('decide', { id: r.id, decision: 'decline' })).toMatchObject({ ok: true, result: 'declined' });
});

test('O6: console calls need a signature that covers the operation', async () => {
  const forged = await api.console('overview', {}, 'forged');
  expect(forged).toMatchObject({ ok: false, error: 'bad_request' });
  expect(forged.requests).toBeUndefined();
  // A valid signature for "overview" does not authorize a decision.
  const t = String(Date.now());
  const { sign } = await import('./lib/backend');
  const overviewSig = sign(cfg, ['console', t, 'overview', '', ''].join(':'));
  expect(await api.post({ action: 'console', op: 'decide', t, id: 'x', decision: 'approve', sig: overviewSig })).toMatchObject({ ok: false, error: 'bad_request' });
});

test('O7: the console passes axe at phone and desktop width, and its tabs work from the keyboard', async ({ page }) => {
  const { AxeBuilder } = await import('@axe-core/playwright');
  await fixtureRequest('קונסולה נגישות', slot(7), 1);
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await page.setViewportSize(viewport);
    if (viewport.width === 390) await openConsole(page);
    for (const tab of ['בקשות', 'יומן', 'הזמנות', 'ערוצים']) {
      await page.locator('nav.tabs').getByRole('button', { name: tab }).click();
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
      expect(result.violations.map((v) => `${tab} ${viewport.width}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
    }
  }
  const tab = page.locator('nav.tabs').getByRole('button', { name: 'יומן' });
  await tab.focus();
  await page.keyboard.press('Enter');
  await expect(tab).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#screen-calendar h2')).toBeFocused();
});

test('O8: the staging console deployment exists and only opens after a Google sign-in', async () => {
  expect(cfg.consoleUrl, 'deploy it with: deploy.py --app console --env staging').toBeTruthy();
  const res = await fetch(cfg.consoleUrl!, { redirect: 'manual' });
  expect(res.status).toBe(302);
  expect(res.headers.get('location') ?? '').toMatch(/^https:\/\/accounts\.google\.com\//);
});
