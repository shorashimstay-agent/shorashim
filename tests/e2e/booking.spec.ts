// Booking regression suite against the staging backend. Scenario IDs match tests/e2e/PLAN.md.
import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
  addDays,
  bookingEvents,
  bookingRows,
  cleanup,
  guestA,
  guestB,
  heDate,
  israelToday,
  nights,
  owner,
  ownerNotification,
  randomPhone,
  requestEvents,
  requestRows,
  snapshot,
  waitFor,
  webApp,
} from './lib/backend';
import { e2e, runTag, staging as cfg } from './lib/env';
import { pricesFromRows, pricesVersionOf } from '../../shared/rules.js';
import { decisionFrame, isSelectable, openDecision, isShownBooked, openBooking, recaptchaToken, submitBooking } from './lib/site';

const api = webApp(cfg);

// Every scenario gets its own nights, 5 days apart, in a random window 250–310 days ahead.
const base = addDays(israelToday(), 250 + Math.floor(Math.random() * 60));
const slot = (i: number) => addDays(base, i * 5);

const guestName = (who: string) => `${runTag} ${who}`;

// The site under test is built from this tree's prices.json and, against staging, would show the
// staging prices sheet; the suite pins the web app to the tree's file so both agree (testSetPrices_).
const pricesFile = JSON.parse(fs.readFileSync('public/prices.json', 'utf8'));

async function blocked(date: string[]): Promise<boolean> {
  const a = await api.availability();
  return date.every((d) => a.blocked.includes(d));
}

async function free(date: string[]): Promise<boolean> {
  const a = await api.availability();
  return date.every((d) => !a.blocked.includes(d));
}

/** Waits until the public snapshot (what the site reads first) agrees about `dates`. */
function snapshotShows(dates: string[], shouldBlock: boolean) {
  return waitFor(`snapshot ${shouldBlock ? 'blocks' : 'frees'} ${dates.join(',')}`, async () => {
    const s = await snapshot(cfg);
    return dates.every((d) => s.blocked.includes(d) === shouldBlock);
  }, 240_000, 10_000);
}

async function postRequest(page: Page, fields: Record<string, unknown>) {
  const token = await recaptchaToken(page, cfg.recaptchaSiteKey);
  return api.post({ action: 'request', requestId: `e2e-${runTag}-${Math.random().toString(36).slice(2, 10)}`, recaptchaToken: token, ...fields });
}

async function onlyRequestEvent(name: string) {
  const events = await waitFor(`request event for ${name}`, async () => {
    const list = await requestEvents(cfg, name);
    return list.length ? list : null;
  }, 60_000);
  expect(events).toHaveLength(1);
  return events[0];
}

test.beforeAll(async () => {
  expect(await api.setPrices(pricesFile)).toMatchObject({ ok: true, version: pricesFile.version });
  const leftovers = await cleanup(cfg);
  if (leftovers.length) console.log(`[P3] removed leftovers from earlier runs:\n  ${leftovers.join('\n  ')}`);
});

test.afterAll(async () => {
  await api.setPrices(null);
  const log = await cleanup(cfg, runTag);
  console.log(`[C] cleanup for ${runTag}: ${log.length} item(s)`);
});

test('P: preflight — accounts, staging backend and triggers', async () => {
  expect(await owner.whoami()).toBe(cfg.ownerEmail);
  if (guestA) expect(await guestA.whoami()).toBe(e2e.guestA.email);
  // Guest B may be a +alias of another mailbox; the token belongs to the base address.
  if (guestB) expect(await guestB.whoami()).toBe(e2e.guestB.email.replace(/\+[^@]*@/, '@'));
  expect(cfg.testHooks, 'the suite must only run against a staging config').toBe(true);
  expect((await api.ping()).service).toBe('shorashim-booking');
  const diag = await api.diag();
  expect(diag.error).toBeUndefined();
  expect(diag.triggers).toEqual(expect.arrayContaining(['onSheetEdit:ON_EDIT', 'onSnapshotTimer:CLOCK']));
  console.log(`[P2] staging triggers: ${diag.triggers.join(', ')}; timings: availability ${diag.availabilityMs}ms, snapshot ${diag.snapshotWriteMs}ms, admin sheet ${diag.adminSheetSyncMs}ms`);
});

test('A + G1: a manual block shows in the web app, the snapshot and the date picker; overlapping requests are refused', async ({ page }) => {
  const [start, end] = [slot(0), addDays(slot(0), 2)];
  const blockNights = nights(start, end);
  await test.step('A1/A3: owner adds a manual block to הזמנות', async () => {
    await owner.insertEvent(cfg.calendars.bookings, { summary: `${runTag} חסימה ידנית`, start: { date: start }, end: { date: end } });
    await waitFor('web app blocks the manual block', () => blocked(blockNights), 180_000);
    await snapshotShows(blockNights, true);
  });
  await test.step('A2: the snapshot is fresh', async () => {
    const s = await snapshot(cfg);
    expect(Date.now() - Date.parse(s.generatedAt)).toBeLessThan(15 * 60_000);
  });
  await test.step('A1: the date picker shows those nights as taken and refuses them', async () => {
    await openBooking(page);
    for (const d of blockNights) {
      expect(await isShownBooked(page, d)).toBe(true);
      expect(await isSelectable(page, d)).toBe(false);
    }
    expect(await isShownBooked(page, addDays(end, 1))).toBe(false);
  });
  await test.step('G1: a request over the blocked nights returns unavailable', async () => {
    const res = await postRequest(page, { stayType: 'couple', checkIn: addDays(start, 1), checkOut: addDays(end, 1), adults: 2, name: guestName('חפיפה'), phone: randomPhone() });
    expect(res).toMatchObject({ ok: false, error: 'unavailable' });
    expect(res.nights).toEqual([addDays(start, 1)]);
  });
});

test('R + E: guest books on the site, owner is emailed and approves from the email', async ({ page }) => {
  const name = guestName('אורחת א');
  const [checkIn, checkOut] = [slot(1), addDays(slot(1), 2)];
  const stay = nights(checkIn, checkOut);
  let ref = '';
  let link = '';

  await test.step('R1: submit the booking form', async () => {
    await openBooking(page);
    ref = await submitBooking(page, { stayType: 'couple', checkIn, checkOut, adults: 2, name, phone: randomPhone(), email: e2e.guestA.email, notes: `${runTag} בדיקת אישור במייל` });
  });
  await test.step('R2: one pending ⏳ event in בקשות', async () => {
    const ev = await onlyRequestEvent(name);
    expect(ev.summary).toBe(`⏳ ${name} · אירוח זוגי בוטיק`);
    expect(ev.start.date).toBe(checkIn);
    expect(ev.end.date).toBe(checkOut);
    const props = ev.extendedProperties!.shared!;
    expect(props.status).toBe('pending');
    expect(JSON.parse(props.request)).toMatchObject({ ref, name, stayType: 'couple', checkIn, checkOut, adults: 2, email: e2e.guestA.email });
  });
  await test.step('R3: owner email with the details and a signed decision link', async () => {
    const n = await ownerNotification(cfg, ref);
    expect(n.mail.to).toContain(cfg.notifyEmail ?? cfg.ownerEmail);
    expect(n.mail.subject).toBe(`בקשת הזמנה ${ref}: ${heDate(checkIn)}–${heDate(checkOut)} · ${name}`);
    for (const line of [`שם: ${name}`, `הגעה: ${heDate(checkIn)}`, `עזיבה: ${heDate(checkOut)}`, `אימייל: ${e2e.guestA.email}`, `מספר בקשה: ${ref}`]) expect(n.mail.text).toContain(line);
    expect(n.link).toBeTruthy();
    link = n.link!;
  });
  await test.step('R4: the nights are held in the web app, the snapshot and the picker', async () => {
    expect(await blocked(stay)).toBe(true);
    await snapshotShows(stay, true);
    await openBooking(page);
    for (const d of stay) expect(await isShownBooked(page, d)).toBe(true);
  });
  await test.step('R5: the admin sheet lists the pending request', async () => {
    const row = await waitFor('admin sheet row', async () => (await requestRows(cfg)).find((r) => r.ref === ref), 180_000);
    expect(row.status).toBe('ממתינה – התאריכים שמורים');
    expect(row.name).toBe(name);
    expect(row.confirm).toBe(false);
  });
  await test.step('R6: the guest has had no email yet', async () => {
    test.skip(!guestA, 'no token for guest A');
    expect(await guestA!.messages(`"${runTag}" newer_than:1d`)).toHaveLength(0);
  });

  await test.step('E1/E2: owner opens the email link and approves', async () => {
    const frame = await openDecision(page, link, `בקשת הזמנה ${ref}`);
    await expect(frame.getByText(`שם: ${name}`)).toBeVisible();
    await frame.locator('#approve').click();
    await expect(frame.getByText('ההזמנה אושרה ונוספה ליומן ההזמנות.')).toBeVisible({ timeout: 90_000 });
    await expect(frame.getByText('קיבל/ה זימון ליומן במייל')).toBeVisible();
  });
  await test.step('E3: the request moved from בקשות to הזמנות with the guest invited', async () => {
    expect(await requestEvents(cfg, name)).toHaveLength(0);
    const [booking] = await bookingEvents(cfg, name);
    expect(booking.summary).toBe(`שורשים · ${name}`);
    expect(booking.start.date).toBe(checkIn);
    expect(booking.end.date).toBe(checkOut);
    expect(booking.extendedProperties?.shared?.source).toBe('website');
    expect(booking.attendees?.map((a) => a.email)).toEqual([e2e.guestA.email]);
    expect(booking.description).toContain(`מספר הזמנה: ${ref}`);
    expect(booking.description).not.toContain('טלפון:');
  });
  await test.step('E4: guest A receives a calendar invitation for the stay', async () => {
    test.skip(!guestA, 'no token for guest A');
    const invite = await waitFor('invite email to guest A', async () =>
      (await guestA!.messages(`"${name}" newer_than:1d`)).find((m) => /Invitation|הזמנה/.test(m.subject)), 180_000);
    expect(invite.from).toContain(cfg.ownerEmail);
    expect(invite.types).toContain('text/calendar');
    // Google adds invitations from unknown senders to the guest's calendar only after they respond to
    // the email (Gmail's anti-spam default), so the calendar copy is checked only when it is there.
    if (e2e.guestA.calendar) {
      const copies = await guestA!.events('primary', { q: name });
      if (copies.length) expect([copies[0].start.date, copies[0].end.date]).toEqual([checkIn, checkOut]);
      else test.info().annotations.push({ type: 'note', description: 'invite not auto-added to guest calendar (unknown sender)' });
    }
  });
  await test.step('E5: the admin sheet shows it approved and lists the booking', async () => {
    await waitFor('approved row', async () => (await requestRows(cfg)).find((r) => r.ref === ref && r.status === 'אושרה ✓'), 240_000);
    await waitFor('booking row', async () => (await bookingRows(cfg)).find((r) => r.ref === ref), 60_000);
  });
  await test.step('E6: the nights stay blocked', async () => {
    expect(await blocked(stay)).toBe(true);
  });
  await test.step('E7: the link now says handled; repeat approve is idempotent, decline is refused', async () => {
    await openDecision(page, link, 'הבקשה כבר טופלה');
    const id = new URL(link).searchParams.get('id')!;
    expect(await api.decide('approve', id)).toMatchObject({ ok: true, result: 'approved' });
    expect(await api.decide('decline', id)).toMatchObject({ ok: false, error: 'not_found' });
  });
});

test('D: owner declines from the email; the nights open again and the guest gets nothing', async ({ page }) => {
  const name = guestName('אורח ב');
  const [checkIn, checkOut] = [slot(2), addDays(slot(2), 1)];
  await openBooking(page);
  const ref = await submitBooking(page, { stayType: 'couple', checkIn, checkOut, adults: 1, name, phone: randomPhone(), email: e2e.guestB.email });
  const { link } = await ownerNotification(cfg, ref);
  expect(await blocked([checkIn])).toBe(true);

  await test.step('D1: decline on the decision page and confirm the dialog', async () => {
    const frame = await openDecision(page, link!, `בקשת הזמנה ${ref}`);
    page.once('dialog', (d) => d.accept());
    await frame.locator('#decline').click();
    await expect(frame.getByText('הבקשה נדחתה והתאריכים נפתחו שוב.')).toBeVisible({ timeout: 90_000 });
  });
  await test.step('D2: no event left, no booking, nights free, no guest email', async () => {
    expect(await requestEvents(cfg, name)).toHaveLength(0);
    expect(await bookingEvents(cfg, name)).toHaveLength(0);
    await waitFor('nights freed in the web app', () => free([checkIn]), 150_000);
    await snapshotShows([checkIn], false);
    if (guestB) expect(await guestB.messages(`to:${e2e.guestB.email} "${name}" newer_than:1d`)).toHaveLength(0);
  });
  await test.step('D3: the admin sheet shows it declined', async () => {
    await waitFor('declined row', async () => (await requestRows(cfg)).find((r) => r.ref === ref && r.status === 'נדחתה ✗'), 240_000);
  });
});

/** Waits for the request's pending row, then makes the owner's edit and fires the real onSheetEdit. */
async function decideInSheet(ref: string, choice: 'אישור' | 'דחייה' | '') {
  // A mirror refresh landing between the edit and the handler rewrites the row and unticks the box,
  // just as it would for a person; the owner would tick again, and so does this.
  for (let attempt = 1; ; attempt++) {
    const row = await waitFor(`admin sheet row for ${ref}`, async () => (await requestRows(cfg)).find((r) => r.ref === ref && r.status.startsWith('ממתינה')), 180_000);
    await owner.setValues(cfg.adminSheetId, `בקשות!N${row.row}:O${row.row}`, [[choice, true]]);
    const fired = await api.fireSheetEdit(row.row);
    const handled = !choice || !(await requestRows(cfg)).some((r) => r.ref === ref && r.status.startsWith('ממתינה'));
    if (handled || attempt === 3) return { row, fired };
  }
}

test('S1: owner approves from the admin sheet', async ({ page }) => {
  const name = guestName('אורחת א גיליון');
  const [checkIn, checkOut] = [slot(3), addDays(slot(3), 3)];
  await openBooking(page);
  const ref = await submitBooking(page, { stayType: 'wedding_night', checkIn, checkOut, adults: 2, name, phone: randomPhone(), email: e2e.guestA.email });
  const { fired } = await decideInSheet(ref, 'אישור');
  expect(fired.ok).toBe(true);

  expect(await requestEvents(cfg, name)).toHaveLength(0);
  const [booking] = await bookingEvents(cfg, name);
  expect(booking.start.date).toBe(checkIn);
  expect(booking.attendees?.map((a) => a.email)).toEqual([e2e.guestA.email]);
  // The checkbox path refreshes the sheet before returning.
  expect((await requestRows(cfg)).find((r) => r.ref === ref)?.status).toBe('אושרה ✓');
  expect((await bookingRows(cfg)).some((r) => r.ref === ref)).toBe(true);
  if (guestA) await waitFor('invite email to guest A', async () => (await guestA!.messages(`"${name}" newer_than:1d`))[0], 180_000);
});

test('S3 + S2: ticking ביצוע without an action does nothing; then the owner declines from the sheet', async ({ page }) => {
  const name = guestName('אורח ב גיליון');
  const [checkIn, checkOut] = [slot(4), addDays(slot(4), 2)];
  await openBooking(page);
  const ref = await submitBooking(page, { stayType: 'couple', checkIn, checkOut, adults: 3, name, phone: randomPhone(), email: e2e.guestB.email });

  await test.step('S3: ביצוע with no פעולה is unticked and nothing changes', async () => {
    const { row, fired } = await decideInSheet(ref, '');
    expect(fired.confirmTicked).toBe(false);
    expect(await requestEvents(cfg, name)).toHaveLength(1);
    expect((await requestRows(cfg)).find((r) => r.row === row.row)?.ref).toBe(ref);
  });
  await test.step('S2: דחייה + ביצוע declines it', async () => {
    await decideInSheet(ref, 'דחייה');
    expect(await requestEvents(cfg, name)).toHaveLength(0);
    expect(await bookingEvents(cfg, name)).toHaveLength(0);
    expect((await requestRows(cfg)).find((r) => r.ref === ref)?.status).toBe('נדחתה ✗');
    await waitFor('nights freed', () => free(nights(checkIn, checkOut)), 150_000);
  });
});

test('G2: when the nights are taken meanwhile, the decision page blocks approval', async ({ page }) => {
  const name = guestName('התנגשות');
  const [checkIn, checkOut] = [slot(5), addDays(slot(5), 2)];
  await openBooking(page);
  const res = await postRequest(page, { stayType: 'couple', checkIn, checkOut, adults: 2, name, phone: randomPhone() });
  expect(res.ok).toBe(true);
  const ev = await onlyRequestEvent(name);
  await owner.insertEvent(cfg.calendars.bookings, { summary: `${runTag} חסימה על בקשה`, start: { date: addDays(checkIn, 1) }, end: { date: checkOut } });

  const request = JSON.parse(ev.extendedProperties!.shared!.request);
  const frame = await openDecision(page, api.decideUrl(ev.iCalUID), `בקשת הזמנה ${request.ref}`);
  await expect(frame.getByText(`הלילות האלה כבר תפוסים ביומן: ${heDate(addDays(checkIn, 1))}`)).toBeVisible({ timeout: 60_000 });
  await expect(frame.locator('#approve')).toBeDisabled();
  expect(await api.decide('approve', ev.iCalUID)).toMatchObject({ ok: false, error: 'unavailable', nights: [heDate(addDays(checkIn, 1))] });
  expect(await api.decide('decline', ev.iCalUID)).toMatchObject({ ok: true, result: 'declined' });
});

test('G3: tampered signatures are refused', async ({ page }) => {
  await openDecision(page, api.decideUrl('someone-else@google.com', 'forged'), 'הקישור אינו תקין');
  expect(await api.decide('approve', 'someone-else@google.com', 'forged')).toMatchObject({ ok: false, error: 'forbidden' });
  const t = String(Date.now());
  expect(await api.post({ action: 'testFireSheetEdit', row: 2, t, sig: 'forged' })).toMatchObject({ ok: false, error: 'bad_request' });
});

test('G4 + G5: invalid input is rejected field by field; the honeypot stores nothing', async () => {
  const bad = await api.post({ action: 'request', stayType: 'couple', checkIn: addDays(israelToday(), -3), checkOut: israelToday(), adults: 4, name: 'x', phone: '' });
  expect(bad).toMatchObject({ ok: false, error: 'invalid' });
  expect(Object.keys(bad.fields).sort()).toEqual(['adults', 'checkIn', 'name', 'phone']);

  const name = guestName('בוט');
  const trap = await api.post({ action: 'request', website: 'http://spam.example', stayType: 'couple', checkIn: slot(9), checkOut: addDays(slot(9), 1), adults: 1, name, phone: randomPhone() });
  expect(trap.ok).toBe(true);
  expect(trap.ref).toMatch(/^SH-/);
  expect(await requestEvents(cfg, name)).toHaveLength(0);
});

test('G6: two simultaneous submissions with the same requestId create one request', async ({ page }) => {
  const name = guestName('כפול');
  const [checkIn, checkOut] = [slot(6), addDays(slot(6), 1)];
  await openBooking(page);
  const body = { action: 'request', requestId: `e2e-dup-${runTag}`, recaptchaToken: await recaptchaToken(page, cfg.recaptchaSiteKey), stayType: 'couple', checkIn, checkOut, adults: 2, name, phone: randomPhone() };
  const results = await Promise.all([api.post(body), api.post(body)]);
  const settled = await Promise.all(
    results.map((r) => (r.error === 'in_progress' ? waitFor('stored result', async () => {
      const again = await api.post(body);
      return again.error === 'in_progress' ? null : again;
    }, 90_000) : r))
  );
  expect(settled[0].ok).toBe(true);
  expect(settled[1].ref).toBe(settled[0].ref);
  const events = await requestEvents(cfg, name);
  expect(events).toHaveLength(1);
  expect(await api.decide('decline', events[0].iCalUID)).toMatchObject({ ok: true });
});

test('G7: a hold older than 24h stops blocking, is marked expired, and can still be approved', async () => {
  const name = guestName('פג תוקף');
  const [checkIn, checkOut] = [slot(7), addDays(slot(7), 2)];
  const req = { stayType: 'couple', checkIn, checkOut, start: checkIn, end: checkOut, nights: 2, adults: 2, name, phone: randomPhone(), email: '', notes: '', estimate: 1000, ref: `SH-${runTag.slice(-5)}` };
  const ev = await owner.insertEvent(cfg.calendars.requests, {
    summary: `⏳ ${name} · אירוח זוגי בוטיק`,
    start: { date: checkIn },
    end: { date: checkOut },
    extendedProperties: { shared: { request: JSON.stringify(req), createdAt: new Date(Date.now() - 25 * 3600_000).toISOString(), status: 'pending' } },
  });
  await waitFor('expired hold is not blocking', () => free(nights(checkIn, checkOut)), 180_000);
  await waitFor('hold marked expired', async () => (await requestEvents(cfg, name))[0]?.summary?.startsWith('⌛ פג תוקף'), 180_000);
  expect((await requestEvents(cfg, name))[0].extendedProperties?.shared?.status).toBe('expired');
  expect(await api.decide('approve', ev.iCalUID)).toMatchObject({ ok: true, result: 'approved', invited: false });
  expect(await bookingEvents(cfg, name)).toHaveLength(1);
});

test('G8: a bride-day request holds the night before and the wedding night', async ({ page }) => {
  const name = guestName('יום כלה');
  const wedding = addDays(slot(8), 1);
  await openBooking(page);
  const ref = await submitBooking(page, { stayType: 'bride_day', checkIn: wedding, adults: 2, name, phone: randomPhone() });
  const ev = await onlyRequestEvent(name);
  expect([ev.start.date, ev.end.date]).toEqual([addDays(wedding, -1), addDays(wedding, 1)]);
  expect(JSON.parse(ev.extendedProperties!.shared!.request)).toMatchObject({ ref, stayType: 'bride_day', checkIn: wedding });
  expect(await blocked([addDays(wedding, -1), wedding])).toBe(true);
  expect(await api.decide('decline', ev.iCalUID)).toMatchObject({ ok: true });
});

test('G10: the web app reads its prices from the prices sheet, and picks up an edit', async () => {
  test.skip(!cfg.pricesSheetId, 'staging has no pricesSheetId');
  const range = 'מחירים!A1:C20';
  const rows = await owner.values(cfg.pricesSheetId!, range);
  const original = pricesFromRows(rows);
  if (!original.ok) throw new Error(`the staging prices sheet fails the checks: ${original.error}`);
  await api.setPrices(null);
  const row = rows.findIndex((r) => r[0] === 'perNight') + 1;
  try {
    expect(await api.prices(original.version)).toMatchObject({ version: original.version, prices: original.prices });
    // The owner (or the front agent) edits the sheet; a page that asks for the new version gets it
    // once the one-a-minute re-read allows, with no deploy.
    await owner.setValues(cfg.pricesSheetId!, `מחירים!C${row}`, [[original.prices.perNight + 7]]);
    const wanted = pricesVersionOf({ ...original.prices, perNight: original.prices.perNight + 7 });
    const seen = await waitFor('web app sees the edited price', async () => {
      const r = await api.prices(wanted);
      return r.version === wanted ? r : null;
    }, 150_000, 10_000);
    expect(seen.prices.perNight).toBe(original.prices.perNight + 7);
  } finally {
    await owner.setValues(cfg.pricesSheetId!, `מחירים!C${row}`, [[original.prices.perNight]]);
    await api.setPrices(pricesFile);
  }
});

test('G9: the web app prices requests from prices.json, not from its own code', async ({ page }) => {
  const changed = { version: `e2e-${runTag}`, prices: { ...pricesFile.prices, perNight: pricesFile.prices.perNight + 111 } };
  expect(await api.setPrices(changed)).toMatchObject({ ok: true, version: changed.version });
  try {
    expect((await api.diag(changed.version)).pricesVersion).toBe(changed.version);
    expect(await api.setPrices({ ...changed, prices: { ...changed.prices, bride_day: 5 } })).toMatchObject({ ok: false });
    const name = guestName('מחיר');
    const [checkIn, checkOut] = [slot(10), addDays(slot(10), 2)];
    await openBooking(page);
    expect(await postRequest(page, { stayType: 'couple', checkIn, checkOut, adults: 2, name, phone: randomPhone(), pricesVersion: changed.version })).toMatchObject({ ok: true });
    const ev = await onlyRequestEvent(name);
    expect(JSON.parse(ev.extendedProperties!.shared!.request).estimate).toBe(2 * changed.prices.perNight);
    expect(await api.decide('decline', ev.iCalUID)).toMatchObject({ ok: true });
  } finally {
    await api.setPrices(pricesFile);
  }
});
