// Owner console (/admin, public/admin/index.html) against the staging backend. Scenario IDs match
// tests/e2e/PLAN.md §4 (O). The page is served by the staging build of the site and pointed at the
// staging web app; it logs in with the staging console password, as the owner does in production.
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

/** Opens /admin against the staging web app and logs in, unless `login` is false. */
async function openConsole(page: Page, login = true) {
  await page.addInitScript((url) => {
    (window as any).CONSOLE_API = url;
  }, cfg.webAppUrl);
  await page.goto('/admin/');
  if (!login) return;
  await page.getByLabel('סיסמה').fill(cfg.consolePassword!);
  await page.getByRole('button', { name: 'כניסה' }).click();
  // The first overview reads three calendars through Google's front end, which on slow days has
  // taken well over a minute on staging.
  await expect(page.locator('#requests-sub')).not.toHaveText('טוען…', { timeout: 180_000 });
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

test.beforeAll(async () => {
  expect(cfg.consolePassword, 'set it with: deploy.py --set-console-password --env staging').toBeTruthy();
  await api.resetConsoleLock();
});

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
  expect(forged).toMatchObject({ ok: false, error: 'unauthorized' });
  expect(forged.requests).toBeUndefined();
  // A valid signature for "overview" does not authorize a decision.
  const t = String(Date.now());
  const { sign } = await import('./lib/backend');
  const overviewSig = sign(cfg, ['console', t, 'overview', '', ''].join(':'));
  expect(await api.post({ action: 'console', op: 'decide', t, id: 'x', decision: 'approve', sig: overviewSig })).toMatchObject({ ok: false, error: 'unauthorized' });
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

test('O8: the password login: wrong passwords, the lockout, forged tokens, and log out everywhere', async ({ page }) => {
  // The page without a session shows only the login.
  await openConsole(page, false);
  await expect(page.getByRole('heading', { name: 'כניסה למסוף' })).toBeVisible();
  await expect(page.locator('nav.tabs')).toBeHidden();
  await page.getByLabel('סיסמה').fill('not the password');
  await page.getByRole('button', { name: 'כניסה' }).click();
  await expect(page.getByRole('alert')).toContainText('הסיסמה שגויה', { timeout: 90_000 });

  // Five wrong passwords lock the login for everyone, even the right password, until the pause ends.
  // A retried call (Google sometimes loses an answer) can count twice, so count the answers instead.
  await api.resetConsoleLock();
  const answers: string[] = [];
  for (let i = 0; i < 6 && answers.at(-1) !== 'locked'; i++) answers.push((await api.consoleLogin(`wrong-${i}`)).error);
  expect(answers.at(-1)).toBe('locked');
  expect(answers.slice(0, -1).every((a) => a === 'wrong_password')).toBe(true);
  expect(await api.consoleLogin(cfg.consolePassword!)).toMatchObject({ ok: false, error: 'locked' });
  await api.resetConsoleLock();

  // A session token works; an altered one does not.
  const login = await api.consoleLogin(cfg.consolePassword!);
  expect(login.ok).toBe(true);
  expect((await api.consoleWithToken('overview', login.token)).ok).toBe(true);
  const parts = login.token.split('.');
  const altered = [parts[0], parts[1], 'deadbeef', parts[3]].join('.');
  expect(await api.consoleWithToken('overview', altered)).toMatchObject({ ok: false, error: 'unauthorized' });

  // Log out everywhere from the page: that device and every earlier token are logged out.
  await openConsole(page);
  page.once('dialog', (d) => d.accept());
  await page.locator('#health-btn').click();
  await page.getByRole('button', { name: 'ניתוק מכל המכשירים' }).click();
  await expect(page.getByRole('heading', { name: 'כניסה למסוף' })).toBeVisible({ timeout: 90_000 });
  expect(await api.consoleWithToken('overview', login.token)).toMatchObject({ ok: false, error: 'unauthorized' });
  const again = await api.consoleLogin(cfg.consolePassword!);
  expect((await api.consoleWithToken('overview', again.token)).ok).toBe(true);
});
