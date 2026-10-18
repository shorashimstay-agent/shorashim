// Code.js run in Node with stand-ins for the Google services it touches, for the parts that must
// hold without a live backend: what `setup` keeps in the admin sheet, and what a cancellation does
// with its log line when the calendar delete fails. deploy.py uploads only src/, so this file stays
// here. The staging suite (tests/e2e, O13) covers the same feature against real Google services.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Code.js and the rules in one global scope, as Apps Script loads them. */
function load(globals = {}) {
  const ctx = vm.createContext({ console: { log() {}, warn() {}, error() {} }, CONFIG: { adminSheetId: 'sheet' }, ...globals });
  vm.runInContext(fs.readFileSync(path.join(here, '../shared/rules.js'), 'utf8').replace(/^export /gm, ''), ctx);
  vm.runInContext(fs.readFileSync(path.join(here, 'src/Code.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(here, 'src/EventLog.js'), 'utf8'), ctx);
  return ctx;
}

/** Anything chainable: every method returns the same object, so builder calls just work. */
function chain(extra = {}) {
  const target = { ...extra };
  const proxy = new Proxy(target, {
    get(t, name) {
      if (name in t) return t[name];
      if (name === 'then') return undefined;
      return () => proxy;
    },
  });
  return proxy;
}

test('setup keeps the cancellations log, and deletes only tabs it does not know', () => {
  const tabs = ['בקשות', 'הזמנות', 'ערוצים', 'ביטולים', 'Sheet1'].map((name) => chain({ getName: () => name, getMaxRows: () => 100, getProtections: () => [] }));
  const deleted = [];
  const ss = chain({
    getSheetByName: (name) => tabs.find((t) => t.getName() === name) ?? null,
    insertSheet: () => assert.fail('every tab exists already'),
    getSheets: () => tabs,
    deleteSheet: (t) => deleted.push(t.getName()),
  });
  const ctx = load({ SpreadsheetApp: { openById: () => ss, ProtectionType: { SHEET: 'SHEET' } } });
  ctx.prepareAdminSheet_();
  assert.deepEqual(deleted, ['Sheet1']);
});

/**
 * A cancellation whose calendar delete throws. `afterwards` is what a fresh lookup of the event
 * finds: the event (it survived), null (it is gone), or 'throws' (the lookup fails too).
 */
function cancelWithFailedDelete(afterwards) {
  const rows = [];
  const log = chain({
    appendRow: (r) => rows.push([...r]),
    getLastRow: () => rows.length + 1,
    deleteRow: (n) => rows.splice(n - 2, 1),
    getRange: (row, col) => ({ setValue: (v) => (rows[row - 2][col - 1] = v) }),
  });
  const event = {
    id: 'ev1',
    iCalUID: 'uid1',
    summary: 'שורשים · דנה',
    created: '2026-10-01T10:00:00Z',
    start: { date: '2026-12-01' },
    end: { date: '2026-12-03' },
    attendees: [{ email: 'guest@example.com' }],
    extendedProperties: { shared: { source: 'website', request: JSON.stringify({ ref: 'SH-1', name: 'דנה', phone: '0501234567', email: 'guest@example.com', stayType: 'couple', estimate: 1900 }) } },
  };
  const ctx = load({ LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) } });
  let lookups = 0;
  ctx.findBooking_ = () => {
    if (lookups++ === 0) return event;
    if (afterwards === 'throws') throw new Error('calendar unavailable');
    return afterwards;
  };
  ctx.cancellationsLog_ = () => log;
  ctx.calendarRequest_ = () => ({});
  ctx.calendarCall_ = () => {
    throw new Error('Calendar API 503');
  };
  ctx.fmt_ = (d, pattern) => (pattern.includes("'T'") ? '2026-10-14T09:00' : '14.10.2026 09:00');
  ctx.heDate_ = (d) => d;
  ctx.invalidateAvailability_ = () => {};
  ctx.refreshSnapshotQuietly_ = () => true;
  ctx.scheduleMirrorRefresh_ = () => {};
  ctx.waLink_ = () => 'https://wa.me/x';
  let result, error;
  try {
    result = ctx.cancelBooking_('uid1', { by: 'guest', notify: true, reason: '' });
  } catch (err) {
    error = err;
  }
  return { rows, result, error };
}

test('a failed delete removes the log line only when the event is still there', () => {
  const survived = cancelWithFailedDelete({ id: 'ev1' });
  assert.match(String(survived.error), /503/);
  assert.equal(survived.rows.length, 0, 'nothing was cancelled, so nothing is logged');

  const gone = cancelWithFailedDelete(null);
  assert.equal(gone.error, undefined, 'the event is gone: the cancellation stands');
  assert.equal(gone.result.ok, true);
  assert.equal(gone.rows.length, 1);

  const unknown = cancelWithFailedDelete('throws');
  assert.match(String(unknown.error), /503/);
  assert.equal(unknown.rows.length, 1, 'when it cannot be told, the line stays');
  assert.match(unknown.rows[0][0], /לא ודאי/);
});

test('a cancellation needs an explicit email choice and refuses a stay that has started', () => {
  const ctx = load({ LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) } });
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.cancelBooking_('x', { by: 'guest' }))), { ok: false, error: 'invalid', fields: { notify: 'required' } });
  assert.equal(ctx.cancelBooking_('x', { by: 'someone', notify: false }).error, 'invalid');

  // Arrival today: cancellable until check-in at 15:00, then refused.
  ctx.findBooking_ = () => ({
    id: 'ev1',
    iCalUID: 'uid1',
    start: { date: '2026-10-14' },
    end: { date: '2026-10-15' },
    extendedProperties: { shared: { source: 'console', kind: 'phone', request: JSON.stringify({ stayType: 'couple', name: 'דנה' }) } },
  });
  ctx.cancellationsLog_ = () => assert.fail('a refused cancellation writes nothing');
  ctx.fmt_ = () => '2026-10-14T15:00';
  assert.equal(ctx.cancelBooking_('uid1', { by: 'guest', notify: false }).error, 'started');
  ctx.fmt_ = () => '2026-10-14T14:59';
  ctx.cancellationsLog_ = () => {
    throw new Error('reached the log');
  };
  assert.throws(() => ctx.cancelBooking_('uid1', { by: 'guest', notify: false }), /reached the log/, 'before check-in it goes ahead');
});

/** checkDates_ with today fixed, the calendars stubbed and an in-memory script cache. */
function checker({ events = [] } = {}) {
  const store = {};
  const ctx = load({
    CacheService: {
      getScriptCache: () => ({
        get: (k) => store[k] ?? null,
        getAll: (keys) => Object.fromEntries(keys.filter((k) => k in store).map((k) => [k, store[k]])),
        put: (k, v) => (store[k] = v),
        remove: (k) => delete store[k],
        removeAll: (keys) => keys.forEach((k) => delete store[k]),
      }),
    },
  });
  ctx.today_ = () => '2026-10-15';
  const asked = [];
  ctx.blockingEvents_ = (from, to, opts) => {
    asked.push([from, to, JSON.stringify(opts)]);
    return events;
  };
  ctx.countLogNoise_ = () => {};
  ctx.logEvent_ = () => {};
  return { ctx, asked, store };
}

test('the live check reads the calendars read-only, and answers for the nights asked and the window around them', () => {
  const { ctx, asked } = checker({ events: [{ allDay: true, start: '2026-11-11', end: '2026-11-13' }, { allDay: true, start: '2027-03-01', end: '2027-03-02' }] });
  const taken = JSON.parse(JSON.stringify(ctx.checkDates_('2026-11-10', '2026-11-12')));
  assert.deepEqual(taken, { ok: true, free: false, conflicts: ['2026-11-11'], from: '2026-10-15', to: '2026-12-26', blocked: ['2026-11-11', '2026-11-12'], busy: [{ start: '2026-11-11T15:00', end: '2026-11-13T11:00' }] });
  assert.deepEqual(asked, [['2026-10-15', '2027-10-16', '{}']], 'the whole window, read-only: nothing is expired or deleted');
  assert.equal(ctx.checkDates_('2026-11-13', '2026-11-15').free, true);
});

test('the live check answers for a stay by its span, so a bride package fits around another', () => {
  // A prep day on the 20th (08:00-16:00), as a stored booking's span.
  const { ctx } = checker({ events: [{ allDay: false, start: '2026-11-20T08:00', end: '2026-11-20T16:00' }] });
  const ask = (stayType, checkIn, checkOut = '') => {
    const { start, end } = ctx.stayRange(stayType, checkIn, checkOut);
    return JSON.parse(JSON.stringify(ctx.checkDates_(start, end, { stayType, checkIn, checkOut })));
  };
  assert.equal(ask('bride_night_day', '2026-11-21').free, true, 'the next bride checks in at 17:30, after the prep day ends');
  assert.equal(ask('bride_day', '2026-11-21').free, true, 'another prep day the next morning');
  assert.deepEqual(ask('couple', '2026-11-20', '2026-11-21').conflicts, ['2026-11-20'], 'no couple stay on the evening of a prep day');
  assert.deepEqual(ask('couple', '2026-11-19', '2026-11-20').conflicts, ['2026-11-19'], 'nor the night before it');
  assert.equal(ask('bride_day_wedding_night', '2026-11-20').free, false);
  assert.equal(ctx.checkDates_('2026-11-20', '2026-11-21', { stayType: 'bride_day_wedding_night', checkIn: '2026-11-21' }).error, 'invalid', 'the nights must be the stay\'s own');
  assert.equal(ctx.checkDates_('2026-11-20', '2026-11-21', { stayType: 'nope', checkIn: '2026-11-20' }).error, 'invalid');
  // Asked by nights only (a page from before the spans), the same prep day takes both nights.
  assert.deepEqual([...ctx.checkDates_('2026-11-19', '2026-11-21').conflicts], ['2026-11-19', '2026-11-20']);
});

test('checks share one calendar read per 30 seconds, and a booking change clears it', () => {
  const { ctx, asked } = checker();
  for (let i = 0; i < 50; i++) ctx.checkDates_('2026-11-10', '2026-11-12');
  assert.equal(asked.length, 1, 'a flood of checks costs one read');
  ctx.invalidateAvailability_();
  ctx.checkDates_('2026-11-10', '2026-11-12');
  assert.equal(asked.length, 2, 'after a new request, the next check reads afresh');
});

test('a check that read before a booking change does not store its copy', () => {
  const { ctx, asked, store } = checker();
  ctx.blockingEvents_ = (from, to, opts) => {
    asked.push([from, to]);
    // A request is created while this check reads the calendars.
    if (asked.length === 1) ctx.invalidateAvailability_();
    return [];
  };
  ctx.checkDates_('2026-11-10', '2026-11-12');
  assert.equal(store['check:v1'], undefined, 'the pre-change copy is not cached');
  ctx.checkDates_('2026-11-10', '2026-11-12');
  ctx.checkDates_('2026-11-10', '2026-11-12');
  assert.equal(asked.length, 2, 'the next read is cached as usual');
});

test('a check that misses the cache while another reads answers from the last copy, unless a booking changed since', () => {
  const { ctx, asked, store } = checker({ events: [{ allDay: true, start: '2026-11-11', end: '2026-11-12' }] });
  ctx.checkDates_('2026-11-10', '2026-11-12');
  assert.equal(asked.length, 1);
  // The 30-second copy has expired and another execution is reading right now.
  delete store['check:v1'];
  store['check:reading'] = '1';
  assert.deepEqual([...ctx.checkDates_('2026-11-10', '2026-11-12').conflicts], ['2026-11-11'], 'answered from the last copy');
  assert.equal(asked.length, 1, 'without a second read');
  // After a booking change the last copy is not good enough: read again.
  ctx.invalidateAvailability_();
  store['check:reading'] = '1';
  ctx.checkDates_('2026-11-10', '2026-11-12');
  assert.equal(asked.length, 2);
  assert.equal(store['check:reading'], undefined, 'the reader clears its marker');
});

test('a failing calendar read answers server_error and is not retried for a few seconds', () => {
  const { ctx, asked } = checker();
  ctx.blockingEvents_ = () => {
    asked.push(1);
    throw new Error('Calendar API 503');
  };
  for (let i = 0; i < 5; i++) assert.deepEqual(JSON.parse(JSON.stringify(ctx.checkDates_('2026-11-10', '2026-11-12'))), { ok: false, error: 'server_error' });
  assert.equal(asked.length, 1);
});

test('cancelling a prep day + wedding night booking counts from the arrival on the wedding day', () => {
  const ctx = load({ LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) } });
  // Wedding on 2026-10-15: the stay holds the 15th only and starts that day at 08:00.
  ctx.findBooking_ = () => ({
    id: 'ev1',
    iCalUID: 'uid1',
    start: { date: '2026-10-15' },
    end: { date: '2026-10-16' },
    extendedProperties: { shared: { source: 'console', kind: 'phone', request: JSON.stringify({ stayType: 'bride_day_wedding_night', name: 'דנה', checkIn: '2026-10-15' }) } },
  });
  ctx.cancellationsLog_ = () => assert.fail('a refused cancellation writes nothing');
  ctx.fmt_ = () => '2026-10-15T08:00';
  assert.equal(ctx.cancelBooking_('uid1', { by: 'guest', notify: false }).error, 'started');
  ctx.fmt_ = () => '2026-10-15T07:59';
  ctx.cancellationsLog_ = () => {
    throw new Error('reached the log');
  };
  assert.throws(() => ctx.cancelBooking_('uid1', { by: 'guest', notify: false }), /reached the log/, 'before arrival it goes ahead');
});

test('the live check refuses bad ranges', () => {
  const { ctx, asked } = checker();
  for (const [start, end] of [['', ''], ['2026-10-14', '2026-10-16'], ['2026-11-10', '2026-11-10'], ['2026-11-10', '2026-11-30'], ['2027-10-16', '2027-10-18'], ['x', '2026-11-12']]) {
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.checkDates_(start, end))), { ok: false, error: 'invalid' }, `${start}..${end}`);
  }
  assert.equal(asked.length, 0);
});

test('the short dates for the prep day + wedding night package carry the wedding-day arrival and the 13:00 departure', () => {
  const ctx = load();
  ctx.heDate_ = (d) => d;
  assert.equal(ctx.stayDatesShort_({ stayType: 'bride_day_wedding_night', checkIn: '2026-11-20' }), 'חתונה 2026-11-20 · הגעה 2026-11-20 08:00 · יציאה 2026-11-21 עד 13:00');
  assert.equal(ctx.stayDatesShort_({ stayType: 'bride_night_day', checkIn: '2026-11-20' }), 'חתונה 2026-11-20 · הגעה 2026-11-19 17:30');
  assert.equal(ctx.stayDatesShort_({ stayType: 'bride_day', checkIn: '2026-11-20' }), 'חתונה 2026-11-20', 'the other packages are unchanged');
});

test('messages for the prep day + wedding night package give the wedding-day arrival and the 13:00 departure', () => {
  const ctx = load();
  ctx.heDate_ = (d) => d;
  const lines = ctx.stayLines_({ stayType: 'bride_day_wedding_night', checkIn: '2026-11-20', checkOut: '2026-11-21', start: '2026-11-20', end: '2026-11-21', adults: 3, participants: 5 });
  assert.deepEqual([...lines], [
    'סוג האירוח: יום התארגנות + ליל כלולות',
    'תאריך החתונה: 2026-11-20',
    'הגעה: 2026-11-20 מ-08:00 (יום החתונה; בשישי אפשר גם מ-06:00 בתיאום)',
    'עזיבה: 2026-11-21 עד 13:00 (למחרת החתונה, לילה אחד)',
    'מספר אורחים: 3',
    'משתתפי יום (כולל הכלה, מלוות ואנשי מקצוע): 5',
  ]);
});

test('the owner text gives the hours a bride package holds, and the night before it keeps free', () => {
  const ctx = load();
  ctx.heDate_ = (d) => d;
  const lines = [...ctx.ownerLines_({ stayType: 'bride_day_wedding_night', checkIn: '2026-11-20', checkOut: '2026-11-21', start: '2026-11-20', end: '2026-11-21', adults: 3, participants: 5, estimate: 2800, name: 'דנה', phone: '0501234567', ref: 'SH-T1' })];
  assert.ok(lines.includes('שמור ביומן: 2026-11-20 08:00 עד 2026-11-21 13:00 · הלילה שלפני חסום ללינה (לא נספר כלילה)'));
  const bride = [...ctx.ownerLines_({ stayType: 'bride_night_day', checkIn: '2026-11-20', start: '2026-11-19', end: '2026-11-21', adults: 2, name: 'דנה', phone: '0501234567', ref: 'SH-T2' })];
  assert.ok(bride.includes('שמור ביומן: 2026-11-19 17:30 עד 2026-11-20 16:00'), 'the night before + prep day is its own night, from 17:30');
  assert.ok(bride.includes('הגעה: 2026-11-19 מ-17:30 (יום לפני החתונה)'));
});
