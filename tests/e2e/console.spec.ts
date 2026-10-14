// Owner console (/admin, public/admin/index.html) against the staging backend. Scenario IDs match
// tests/e2e/PLAN.md §4 (O). The page is served by the staging build of the site and pointed at the
// staging web app; it logs in with the staging console password, as the owner does in production.
import { expect, test, type Page } from '@playwright/test';
import {
  addDays,
  bookingEvents,
  bookingRows,
  cancellationRows,
  cleanup,
  guestA,
  israelToday,
  nights,
  owner,
  randomPhone,
  requestEvents,
  requestRows,
  snapshot,
  waitFor,
  webApp,
} from './lib/backend';
import { e2e, runTag, staging as cfg } from './lib/env';

const api = webApp(cfg);

// Scenario nights 150–240 days ahead, apart from booking.spec.ts's window (250–360).
const base = addDays(israelToday(), 150 + Math.floor(Math.random() * 80));
const slot = (i: number) => addDays(base, i * 5);
// The closing scenarios (O10–O12) use the weeks just before, so they stay clear of booking.spec.ts too.
const early = (i: number) => addDays(base, -40 + i * 10);
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

/** Opens /admin (or `path`) against the staging web app and logs in, unless `login` is false. */
async function openConsole(page: Page, login = true, path = '/admin/') {
  await page.addInitScript((url) => {
    (window as any).CONSOLE_API = url;
  }, cfg.webAppUrl);
  await page.goto(path);
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
  const left = log.filter((l) => l.startsWith('LEFT OVER'));
  if (left.length) console.warn(`[O] not cleaned (the next run's preflight removes them):\n  ${left.join('\n  ')}`);
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

test('O9: the owner email link opens the console on its request, or says it was handled', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const r = await fixtureRequest('קונסולה קישור', slot(8), 1);
  // Another pending request, so the linked one has to be picked out.
  await fixtureRequest('קונסולה קישור אחר', slot(9), 1);
  const link = (x: { id: string; ref: string }) => `/admin/?request=${encodeURIComponent(x.id)}&ref=${x.ref}`;

  await openConsole(page, true, link(r));
  await expect(card(page, r.id)).toHaveClass(/linked/);
  await expect(card(page, r.id).locator('.name')).toBeFocused();
  await expect(card(page, r.id)).toBeInViewport();
  expect(new URL(page.url()).search).toBe('');
  await expect(await decideInConsole(page, r.id, 'decline')).toContainText('נדחתה');

  // The same link once the request is decided: the session is kept, so no login this time.
  await page.goto(link(r));
  await expect(page.locator('#linked-note')).toContainText(`הבקשה של ${r.name} (${r.ref}) כבר נדחתה`, { timeout: 180_000 });
  await expect(page.locator('.card.linked')).toHaveCount(0);
});

test('O10: closing dates in the console blocks them on the site at once, and reopening frees them', async ({ page }) => {
  const { AxeBuilder } = await import('@axe-core/playwright');
  await page.setViewportSize({ width: 390, height: 844 });
  const start = early(0);
  const end = addDays(start, 3);
  const note = `${runTag} סגירה מהקונסולה`;
  await openConsole(page);
  await page.locator('nav.tabs').getByRole('button', { name: 'יומן' }).click();
  await page.getByRole('button', { name: /סגירת תאריכים/ }).click();
  await (await calendarDay(page, start)).click();
  await (await calendarDay(page, end)).click();
  await page.getByRole('button', { name: 'המשך' }).click();

  // The form passes axe in each of its three forms.
  for (const kind of ['הזמנה טלפונית', 'שמירה זמנית', 'סגירה']) {
    await page.locator('#block-panel [data-choice="kind"]', { hasText: kind }).click();
    const result = await new AxeBuilder({ page }).include('#screen-calendar').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
    expect(result.violations.map((v) => `${kind}: ${v.id} ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)).toEqual([]);
  }

  await page.getByRole('button', { name: 'תחזוקה' }).click();
  await page.locator('#bf-note').fill(note);
  await page.getByRole('button', { name: 'סגירת 3 לילות' }).click();
  await page.getByRole('button', { name: 'כן, לשמור' }).click();
  const result = page.locator('#block-result');
  await expect(result).toContainText('התאריכים נסגרו', { timeout: 120_000 });
  await expect(result).toContainText('מעודכן');

  // Calendar's search index can lag a write by a few seconds.
  const events = await waitFor('the closing in the bookings calendar', async () => {
    const found = await bookingEvents(cfg, note);
    return found.length ? found : undefined;
  }, 60_000, 3_000);
  expect(events).toHaveLength(1);
  expect(events[0].extendedProperties?.shared).toMatchObject({ source: 'console', kind: 'block', reason: 'תחזוקה' });
  expect([events[0].start?.date, events[0].end?.date]).toEqual([start, end]);
  // The availability snapshot the website reads was rewritten before the console answered.
  await waitFor('closed nights in the snapshot', async () => {
    const blocked = (await snapshot(cfg)).blocked;
    return nights(start, end).every((n) => blocked.includes(n));
  }, 60_000, 5_000);
  expect((await api.availability()).blocked).toEqual(expect.arrayContaining(nights(start, end)));

  // Reopen from the calendar's day panel.
  await page.getByRole('button', { name: 'סיום' }).click();
  await (await calendarDay(page, start)).click();
  await expect(page.locator('#day-panel')).toContainText('סגור · תחזוקה', { timeout: 60_000 });
  await page.locator('#day-panel').getByRole('button', { name: 'פתיחת התאריכים' }).click();
  await page.locator('#day-panel').getByRole('button', { name: 'כן, לפתוח' }).click();
  await waitFor('closing deleted', async () => (await bookingEvents(cfg, note)).length === 0, 120_000, 5_000);
  await waitFor('nights free in the snapshot', async () => !(await snapshot(cfg)).blocked.includes(start), 120_000, 5_000);
});

test('O11: closings that overlap taken nights are refused, a retry closes once, and the signature covers the dates', async () => {
  const start = early(1);
  const r = await fixtureRequest('קונסולה סגירה חופפת', addDays(start, 2), 1);
  const overlap = `${runTag} סגירה חופפת`;
  expect(await api.console('block', { args: { kind: 'block', start, end: addDays(start, 4), reason: 'אחר', note: overlap } })).toMatchObject({ ok: false, error: 'unavailable', nights: [r.start] });
  expect(await bookingEvents(cfg, overlap)).toHaveLength(0);
  expect(await api.console('block', { args: { kind: 'block', start: addDays(israelToday(), -1), end: start, reason: 'אחר' } })).toMatchObject({ ok: false, error: 'invalid' });

  // The page retries when Google loses an answer; the same requestId closes the dates once.
  const once = { requestId: `${runTag}-once`.replace(/[^\w-]/g, ''), kind: 'block', start: addDays(start, 3), end: addDays(start, 4), reason: 'אחר', note: `${runTag} פעם אחת` };
  const first = await api.console('block', { args: once });
  expect(first).toMatchObject({ ok: true, result: 'blocked', nights: 1 });
  expect((await api.console('block', { args: once })).id).toBe(first.id);
  await waitFor('the closing in the bookings calendar', async () => (await bookingEvents(cfg, once.note)).length > 0, 60_000, 3_000);
  expect(await bookingEvents(cfg, once.note)).toHaveLength(1);

  // A signature made for one set of dates does not authorize others.
  const t = String(Date.now());
  const { sign } = await import('./lib/backend');
  const other = { ...once, requestId: 'tampered-0001', end: addDays(start, 9) };
  const sig = sign(cfg, ['console', t, 'block', '', ''].join(':') + ':' + JSON.stringify(once));
  expect(await api.post({ action: 'console', op: 'block', t, id: '', decision: '', args: other, sig })).toMatchObject({ ok: false, error: 'unauthorized' });

  // A website booking cannot be "reopened" from the console; cancelling a stay is done in the calendar.
  const booked = await owner.insertEvent(cfg.calendars.bookings, { summary: `${runTag} אורח מהאתר`, start: { date: addDays(start, 6) }, end: { date: addDays(start, 7) }, extendedProperties: { shared: { source: 'website' } } });
  expect(await api.console('unblock', { id: booked.iCalUID })).toMatchObject({ ok: false, error: 'is_booking' });
  // Nor can a manual event made in Google Calendar: it may be a guest's stay.
  const manual = await owner.insertEvent(cfg.calendars.bookings, { summary: `${runTag} ידני ביומן`, start: { date: addDays(start, 8) }, end: { date: addDays(start, 9) } });
  expect(await api.console('unblock', { id: manual.iCalUID })).toMatchObject({ ok: false, error: 'is_booking' });
  expect(await api.console('unblock', { id: first.id })).toMatchObject({ ok: true, result: 'reopened' });
});

test('O12: a phone booking invites the guest; a temporary hold blocks, extends, turns into a booking, and runs out', async () => {
  const start = early(2);
  const name = guestName('קונסולה טלפון');
  const phone = await api.console('block', { args: { kind: 'phone', start, end: addDays(start, 2), stayType: 'couple', name, phone: randomPhone(), email: e2e.guestA.email, adults: 2, price: 1900, note: 'הערה פנימית' } });
  expect(phone).toMatchObject({ ok: true, result: 'booked', invited: true });
  expect(phone.whatsapp).toMatch(/^https:\/\/wa\.me\//);
  const ev = await waitFor('the phone booking in the calendar', async () => (await bookingEvents(cfg, name))[0], 60_000, 3_000);
  expect(ev.attendees?.map((a) => a.email)).toEqual([e2e.guestA.email]);
  // The internal note stays private: not in the description, nor in the shared properties guests' copies get.
  expect(ev.description ?? '').not.toContain('הערה פנימית');
  expect(JSON.stringify(ev.extendedProperties?.shared ?? {})).not.toContain('הערה פנימית');
  // The console still has it: the backend reads the private property as the calendar's owner.
  const o = await api.console('overview');
  expect(o.bookings.find((b: any) => b.id === phone.id)).toMatchObject({ kind: 'phone', name, estimate: 1900, reopenable: false, notes: 'הערה פנימית' });
  expect(await api.console('unblock', { id: phone.id })).toMatchObject({ ok: false, error: 'is_booking' });

  const holder = guestName('קונסולה שמירה');
  const held = nights(addDays(start, 3), addDays(start, 5));
  const hold = await api.console('block', { args: { kind: 'hold', start: held[0], end: addDays(start, 5), hours: 24, name: holder } });
  expect(hold).toMatchObject({ ok: true, result: 'held' });
  expect((await api.availability()).blocked).toEqual(expect.arrayContaining(held));
  const extended = await api.console('extendHold', { id: hold.id, args: { hours: 24 } });
  expect(Date.parse(extended.expiresAt) - Date.parse(hold.expiresAt)).toBeGreaterThan(23 * 3600_000);
  // A retry of the same extension (same requestId) does not add the hours twice.
  const again = { requestId: `${runTag}-ext`.replace(/[^\w-]/g, ''), hours: 24 };
  const once = await api.console('extendHold', { id: hold.id, args: again });
  expect((await api.console('extendHold', { id: hold.id, args: again })).expiresAt).toBe(once.expiresAt);
  const converted = await api.console('block', { args: { kind: 'phone', start: held[0], end: addDays(start, 5), stayType: 'couple', name: holder, phone: randomPhone(), email: '', adults: 2, price: 0, replaceId: hold.id } });
  expect(converted).toMatchObject({ ok: true, result: 'booked', invited: false });
  const after = await waitFor('the hold replaced by the booking', async () => {
    const found = await bookingEvents(cfg, holder);
    return found.length === 1 && found[0].extendedProperties?.shared?.kind === 'phone' ? found : undefined;
  }, 60_000, 3_000);
  expect(after).toHaveLength(1);
  expect(after[0].extendedProperties?.shared?.kind).toBe('phone');

  // A hold that ran out stops blocking, and the next availability rebuild deletes it.
  const stale = guestName('קונסולה שמירה שפגה');
  const staleNight = addDays(start, 7);
  await owner.insertEvent(cfg.calendars.bookings, {
    summary: `⏳ שמירה זמנית · ${stale}`,
    start: { date: staleNight },
    end: { date: addDays(staleNight, 1) },
    extendedProperties: { shared: { source: 'console', kind: 'hold', holder: stale, createdAt: new Date(Date.now() - 86400_000).toISOString(), expiresAt: new Date(Date.now() - 60_000).toISOString() } },
  });
  // An expired hold cannot be extended back to life.
  const staleEvent = await waitFor('the stale hold in the calendar', async () => (await bookingEvents(cfg, stale))[0], 60_000, 3_000);
  expect(await api.console('extendHold', { id: staleEvent.iCalUID, args: { hours: 24 } })).toMatchObject({ ok: false, error: 'expired' });
  await api.diag();
  expect((await api.availability()).blocked).not.toContain(staleNight);
  await waitFor('expired hold deleted', async () => (await bookingEvents(cfg, stale)).length === 0, 90_000, 5_000);
  expect((await api.console('overview')).bookings.some((b: any) => b.holder === stale)).toBe(false);
});

test('O13: cancelling bookings logs them, frees the nights, and emails the guest only when chosen', async ({ page }) => {
  const start = early(3);
  // A website booking with the guest's email, approved the usual way.
  const r = await fixtureRequest('קונסולה ביטול', start, 2, { email: e2e.guestA.email });
  expect(await api.decide('approve', r.id)).toMatchObject({ ok: true, result: 'approved', invited: true });
  const booked = await waitFor('the approved booking', async () => (await bookingEvents(cfg, r.name))[0], 60_000, 3_000);
  const o = await api.console('overview');
  const b = o.bookings.find((x: any) => x.id === booked.iCalUID);
  expect(b).toMatchObject({ kind: 'website', cancellable: true, confirmedAt: israelToday() });
  // More than 14 days ahead: free when the guest cancels, and nothing when we do.
  expect(b.cancelFees.guest).toMatchObject({ band: 'free', fee: 0 });
  expect(b.cancelFees.us).toMatchObject({ band: 'ours', fee: 0 });
  // Whether Google emails the guest is the owner's choice every time: leaving it out is refused.
  expect(await api.console('cancelBooking', { id: booked.iCalUID, args: { by: 'guest' } })).toMatchObject({ ok: false, error: 'invalid' });

  await openConsole(page);
  await page.getByRole('button', { name: 'הזמנות', exact: true }).click();
  await page.getByRole('button', { name: `ביטול ההזמנה של ${r.name}` }).click();
  const form = page.locator('#cancel-form');
  const confirm = form.getByRole('button', { name: 'כן, לבטל את ההזמנה' });
  await expect(confirm).toBeDisabled();
  await form.getByRole('button', { name: 'האורח' }).click();
  await expect(form.locator('#cf-fee')).toContainText('ללא חיוב');
  // Who asked is chosen, but not yet whether to email: still disabled.
  await expect(confirm).toBeDisabled();
  await form.getByRole('button', { name: 'כן, לשלוח' }).click();
  await form.getByLabel(/סיבה/).fill(`${runTag} שינוי תוכניות`);
  await confirm.click();
  const result = page.locator('#cancel-result');
  await expect(result).toContainText(`ההזמנה של ${r.name} בוטלה`, { timeout: 120_000 });
  await expect(result.getByRole('link', { name: 'שליחת הודעת ביטול ב-WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\//);

  expect(await bookingEvents(cfg, r.name)).toHaveLength(0);
  expect((await api.availability()).blocked).not.toContain(start);
  const line = (await cancellationRows(cfg)).find((x) => x.id === booked.iCalUID);
  expect(line).toMatchObject({ ref: r.ref, name: r.name, by: 'האורח', emailed: 'נשלח', reason: `${runTag} שינוי תוכניות` });
  expect(line!.fee).toContain('ללא חיוב');
  const guest = guestA;
  if (guest) {
    await waitFor('Google\'s cancellation in the guest\'s mailbox', async () =>
      (await guest.messages(`"${r.name}" newer_than:1d`)).find((m) => /cancel|בוטל/i.test(m.subject)), 180_000, 10_000);
  }

  // A phone booking with no email, cancelled as ours through the signed API: no email, no fee.
  const name = guestName('קונסולה ביטול טלפון');
  const phoneStart = addDays(start, 4);
  const phone = await api.console('block', { args: { kind: 'phone', start: phoneStart, end: addDays(phoneStart, 1), stayType: 'couple', name, phone: randomPhone(), email: '', adults: 2, price: 1200 } });
  expect(phone).toMatchObject({ ok: true, result: 'booked', invited: false });
  const args = { requestId: `${runTag}-cancel`.replace(/[^\w-]/g, ''), by: 'us', notify: false, reason: '' };
  const cancelled = await api.console('cancelBooking', { id: phone.id, args });
  expect(cancelled).toMatchObject({ ok: true, result: 'cancelled', emailed: false, fee: { band: 'ours', fee: 0 }, start: phoneStart, nights: 1 });
  // The same requestId returns the first answer; a new attempt finds nothing left to cancel.
  expect(await api.console('cancelBooking', { id: phone.id, args })).toEqual(cancelled);
  expect(await api.console('cancelBooking', { id: phone.id, args: { ...args, requestId: undefined } })).toMatchObject({ ok: false, error: 'not_found' });
  expect((await cancellationRows(cfg)).find((x) => x.id === phone.id)).toMatchObject({ name, by: 'אנחנו', emailed: 'אין מייל' });

  // Refused: closings, holds, manual events, a stay that already started, and unknown ids.
  const refuse = { by: 'guest', notify: false };
  const closing = await api.console('block', { args: { kind: 'block', start: addDays(start, 6), end: addDays(start, 7), reason: 'תחזוקה', note: `${runTag} ביטול` } });
  expect(await api.console('cancelBooking', { id: closing.id, args: refuse })).toMatchObject({ ok: false, error: 'not_cancellable' });
  const hold = await api.console('block', { args: { kind: 'hold', start: addDays(start, 7), end: addDays(start, 8), hours: 24, name: guestName('קונסולה ביטול שמירה') } });
  expect(await api.console('cancelBooking', { id: hold.id, args: refuse })).toMatchObject({ ok: false, error: 'not_cancellable' });
  const manual = await owner.insertEvent(cfg.calendars.bookings, { summary: `${runTag} ידני ביטול`, start: { date: addDays(start, 8) }, end: { date: addDays(start, 9) } });
  expect(await api.console('cancelBooking', { id: manual.iCalUID, args: refuse })).toMatchObject({ ok: false, error: 'not_cancellable' });
  const today = israelToday();
  const started = guestName('קונסולה ביטול התחיל');
  const startedReq = { stayType: 'couple', checkIn: addDays(today, -1), checkOut: addDays(today, 1), start: addDays(today, -1), end: addDays(today, 1), nights: 2, adults: 2, name: started, phone: randomPhone(), email: '', notes: '', estimate: 1900, ref: `SH-C${runTag.slice(-4)}S` };
  const inProgress = await owner.insertEvent(cfg.calendars.bookings, {
    summary: `שורשים · ${started}`,
    start: { date: startedReq.start },
    end: { date: startedReq.end },
    extendedProperties: { shared: { request: JSON.stringify(startedReq), source: 'website' } },
  });
  expect((await api.console('overview')).bookings.find((x: any) => x.id === inProgress.iCalUID)).toMatchObject({ cancellable: false, cancelFees: null });
  expect(await api.console('cancelBooking', { id: inProgress.iCalUID, args: refuse })).toMatchObject({ ok: false, error: 'started' });
  expect(await api.console('cancelBooking', { id: `${runTag}-missing@google.com`, args: refuse })).toMatchObject({ ok: false, error: 'not_found' });
});
