// The event log (apps-script/src/EventLog.js) against the staging backend and its Firestore project
// (shorashim-log-staging). Scenario IDs match tests/e2e/PLAN.md §4 (L).
import { expect, test } from '@playwright/test';
import { addDays, cleanup, israelToday, randomPhone, requestEvents, waitFor, webApp } from './lib/backend';
import { runTag, staging as cfg } from './lib/env';
import { deleteLogEvents, logEvents, logEventsSince } from './lib/firestore';
import { openBooking, recaptchaToken } from './lib/site';

const api = webApp(cfg);
// Nights 60–100 days ahead, clear of console.spec.ts (110+) and booking.spec.ts (250+).
const base = addDays(israelToday(), 60 + Math.floor(Math.random() * 40));

test.beforeAll(async () => {
  expect(cfg.firestore, 'booking-config.staging.json needs its firestore key').toBeTruthy();
  // A run that crashed mid-way may have left the key "broken".
  await api.eventLog('repair');
});

test.afterAll(async () => {
  await api.eventLog('repair');
  await deleteLogEvents(cfg, await logEvents(cfg, 'type', 'test.fill', 500));
  await cleanup(cfg, runTag);
});

test('L1: a request and its approval are logged by ref, with none of the guest’s details', async ({ page }) => {
  const name = `${runTag} יומן אירועים`;
  const phone = randomPhone();
  const notes = `${runTag} הערה פרטית`;
  const [checkIn, checkOut] = [base, addDays(base, 2)];
  await openBooking(page);
  const created = await api.post({
    action: 'request',
    requestId: `e2e-log-${runTag}`.replace(/[^\w-]/g, ''),
    recaptchaToken: await recaptchaToken(page, cfg.recaptchaSiteKey),
    stayType: 'couple',
    checkIn,
    checkOut,
    adults: 2,
    name,
    phone,
    notes,
  });
  expect(created).toMatchObject({ ok: true });
  const [request] = await waitFor('the request event', async () => {
    const list = await requestEvents(cfg, name);
    return list.length ? list : null;
  }, 60_000, 3_000);
  expect(await api.decide('approve', request.iCalUID)).toMatchObject({ ok: true, result: 'approved' });

  const flushed = await api.eventLog('flush');
  expect(flushed.flush.ok, JSON.stringify(flushed)).toBe(true);
  const events = await waitFor('both events in Firestore', async () => {
    const list = await logEvents(cfg, 'ref', created.ref);
    return list.length >= 2 ? list : null;
  }, 60_000, 5_000);
  const byType = Object.fromEntries(events.map((e) => [e.fields.type, e.fields]));
  expect(byType['request.created']).toMatchObject({ actor: 'guest', class: 'business', start: checkIn, end: checkOut, nights: 2, stayType: 'couple', adults: 2 });
  expect(byType['request.approved']).toMatchObject({ actor: 'email', class: 'business', id: request.iCalUID, start: checkIn, end: checkOut });
  expect(byType['request.created'].commit).toMatch(/^[0-9a-f]{7,}/);
  // Kept three years: business events.
  const days = (Date.parse(byType['request.created'].expireAt) - Date.parse(byType['request.created'].ts)) / 86400000;
  expect(days).toBe(3 * 365);

  const stored = JSON.stringify(events);
  for (const secret of [name, phone, phone.slice(1), notes, 'wa.me']) expect(stored).not.toContain(secret);
});

test('L2: when Firestore is unreachable the buffer stops at its ceiling, bookings still work, and it drains afterwards', async () => {
  const since = new Date(Date.now() - 60_000).toISOString();
  await api.eventLog('break');
  const filled = await api.eventLog('fill', 120);
  expect(filled.status.buffered).toBe(100);
  expect(filled.status.noise['log.dropped']).toBeGreaterThan(0);

  const failed = await api.eventLog('flush');
  expect(failed.flush.ok).toBe(false);
  expect(failed.status.buffered).toBeGreaterThanOrEqual(100);
  expect(failed.status.backoffUntil).not.toBe('');

  // The booking system does not notice: a closing is made and reopened as usual.
  const start = addDays(base, 10);
  const closed = await api.console('block', { args: { kind: 'block', start, end: addDays(start, 1), reason: 'אחר', note: `${runTag} יומן מלא` } });
  expect(closed).toMatchObject({ ok: true, result: 'blocked' });
  expect(await api.console('unblock', { id: closed.id })).toMatchObject({ ok: true, result: 'reopened' });

  await api.eventLog('repair');
  const drained = await api.eventLog('flush');
  expect(drained.flush.ok, JSON.stringify(drained)).toBe(true);
  expect(drained.flush.sent).toBeGreaterThanOrEqual(100);
  expect(drained.status.buffered).toBe(0);
  expect(drained.status.backoffUntil).toBe('');

  // What was dropped while full is on record, as one counts event.
  const recent = await logEventsSince(cfg, since);
  expect(recent.some((e) => e.fields.type === 'log.counts' && (e.fields.counts?.['log.dropped'] ?? 0) > 0)).toBe(true);
  // The closing made while the buffer was full was dropped, and counted above. Once the buffer has
  // drained, closings are logged as usual.
  const reopened = await api.console('block', { args: { kind: 'block', start, end: addDays(start, 1), reason: 'אחר', note: `${runTag} יומן ריק` } });
  expect(reopened).toMatchObject({ ok: true });
  expect(await api.console('unblock', { id: reopened.id })).toMatchObject({ ok: true });
  await api.eventLog('flush');
  const logged = await logEvents(cfg, 'id', reopened.id);
  expect(logged.map((e) => e.fields.type).sort()).toEqual(['console.block', 'console.unblock']);
});
