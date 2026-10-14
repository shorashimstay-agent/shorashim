// The booking rules are imported here the same way the website imports them. The last test covers
// the other consumer: the plain-globals form deploy.py uploads to Apps Script.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import {
  PRICE_KEYS,
  blockedNights,
  cancellationFee,
  checkPrices,
  conflictingNights,
  estimatePrice,
  isHoldActive,
  isWeekendNight,
  pricesFromRows,
  pricesVersionOf,
  stayRange,
  workingDaysBetween,
  validateBlock,
  validateRequest,
  whatsappNumber,
} from './rules.js';

// Test prices only; the site's prices are in the owner's prices sheet.
const PRICES = { perNight: 850, weekendPerNight: 1050, thirdGuestPerNight: 150, bride_day: 1850, bride_night_day: 2650, wedding_night: 1150 };

const allDay = (start, end) => ({ allDay: true, start, end });
const timed = (start, end) => ({ allDay: false, start, end });
const WINDOW = ['2026-09-01', '2026-12-01'];

test('all-day events block their nights, not the check-out day', () => {
  assert.deepEqual(blockedNights([allDay('2026-10-01', '2026-10-03')], ...WINDOW), ['2026-10-01', '2026-10-02']);
});

test('results are clipped to the requested window', () => {
  assert.deepEqual(blockedNights([allDay('2026-09-28', '2026-10-03')], '2026-10-01', '2026-10-02'), ['2026-10-01']);
});

test('timed events block only nights whose 15:00-11:00 window they overlap', () => {
  // A morning until 10:00 overlaps the previous night, which ends at 11:00.
  assert.deepEqual(blockedNights([timed('2026-10-05T08:00', '2026-10-05T10:00')], ...WINDOW), ['2026-10-04']);
  // Between check-out and check-in: blocks nothing.
  assert.deepEqual(blockedNights([timed('2026-10-05T11:00', '2026-10-05T15:00')], ...WINDOW), []);
  assert.deepEqual(blockedNights([timed('2026-10-05T18:00', '2026-10-05T20:00')], ...WINDOW), ['2026-10-05']);
  assert.deepEqual(blockedNights([timed('2026-10-05T09:00', '2026-10-05T17:00')], ...WINDOW), ['2026-10-04', '2026-10-05']);
});

test('wedding-type stays block the night before and the wedding night', () => {
  assert.deepEqual(stayRange('bride_day', '2026-10-10', ''), { start: '2026-10-09', end: '2026-10-11' });
  assert.deepEqual(stayRange('bride_night_day', '2026-10-10', ''), { start: '2026-10-09', end: '2026-10-11' });
  assert.deepEqual(stayRange('couple', '2026-10-10', '2026-10-12'), { start: '2026-10-10', end: '2026-10-12' });
});

test('back-to-back stays do not conflict', () => {
  const blocked = blockedNights([allDay('2026-10-01', '2026-10-03')], ...WINDOW);
  assert.deepEqual(conflictingNights(blocked, '2026-10-03', '2026-10-05'), []);
  assert.deepEqual(conflictingNights(blocked, '2026-09-29', '2026-10-01'), []);
  assert.deepEqual(conflictingNights(blocked, '2026-09-30', '2026-10-02'), ['2026-10-01']);
});

test('price estimate matches the site', () => {
  assert.equal(estimatePrice('couple', 2, 2, PRICES), 1700);
  assert.equal(estimatePrice('couple', 2, 3, PRICES), 2000);
  assert.equal(estimatePrice('bride_day', 2, 3, PRICES), 1850);
  assert.equal(estimatePrice('wedding_night', 1, 2, PRICES), 1150);
});

test('without prices there is no estimate, and the request is still valid', () => {
  assert.equal(estimatePrice('couple', 2, 2, null), null);
  assert.equal(estimatePrice('bride_day', 0, 2, null), null);
  const res = validateRequest({ ...valid }, '2026-09-15');
  assert.equal(res.ok, true);
  assert.equal(res.value.estimate, null);
});

test('Friday and Saturday nights are priced as weekend nights', () => {
  assert.deepEqual(['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'].map(isWeekendNight), [false, true, true, false]);
  // Thursday to Sunday: one weeknight and two weekend nights; check-out day is not a night.
  assert.equal(estimatePrice('couple', 3, 2, PRICES, '2026-10-08'), 850 + 1050 + 1050);
  assert.equal(estimatePrice('couple', 1, 3, PRICES, '2026-10-09'), 1050 + 150);
  // A month and a year boundary.
  assert.equal(estimatePrice('couple', 2, 2, PRICES, '2026-12-31'), 850 + 1050);
  // Package prices do not depend on the day.
  assert.equal(estimatePrice('wedding_night', 1, 2, PRICES, '2026-10-09'), 1150);
  // Prices from before weekendPerNight existed price every night as a weeknight.
  const { weekendPerNight, ...old } = PRICES;
  assert.equal(estimatePrice('couple', 2, 2, old, '2026-10-09'), 1700);
});

test('estimates use the prices they are given', () => {
  const prices = { ...PRICES, perNight: 1000, weekendPerNight: 1200, thirdGuestPerNight: 300, bride_day: 2000 };
  assert.equal(estimatePrice('couple', 2, 3, prices), 2600);
  assert.equal(estimatePrice('bride_day', 2, 2, prices), 2000);
  // valid is Thursday and Friday night.
  assert.equal(validateRequest({ ...valid }, '2026-09-15', prices).value.estimate, 1000 + 1200);
});

test('the prices spreadsheet rows become a checked prices file', () => {
  const rows = [
    ['מפתח (לא לשנות)', 'מה המחיר', 'מחיר ב־₪'],
    ['perNight', 'לילה', 850],
    ['weekendPerNight', 'סוף שבוע', '1,050 ₪'],
    ['thirdGuestPerNight', 'אורח שלישי', 150],
    ['bride_day', 'יום כלה', 1850],
    ['bride_night_day', 'לילה לפני', 2650],
    ['wedding_night', 'ליל כלולות', 1150],
    ['', '', ''],
  ];
  const res = pricesFromRows(rows);
  assert.deepEqual(res, { ok: true, version: 'sheet-850-1050-150-1850-2650-1150', prices: PRICES });
  assert.equal(pricesFromRows(rows.slice().reverse()).version, res.version, 'row order does not matter');
  assert.equal(pricesFromRows(rows.map((r) => (r[0] === 'bride_day' ? [r[0], r[1], ''] : r))).ok, false, 'an empty price is refused');
  assert.equal(pricesFromRows(rows.map((r) => (r[0] === 'bride_day' ? [r[0], r[1], 18.5] : r))).ok, false, 'not whole shekels');
  assert.equal(pricesFromRows(rows.filter((r) => r[0] !== 'perNight')).ok, false, 'a missing row is refused');
  assert.equal(pricesFromRows(rows.filter((r) => r[0] !== 'weekendPerNight')).prices.weekendPerNight, 850, 'weekend falls back to the weeknight price');
  assert.equal(pricesFromRows([]).ok, false);
  assert.equal(pricesVersionOf(PRICES), res.version);
  assert.ok(checkPrices({ version: res.version, prices: PRICES }).ok, 'the version passes the version check');
  assert.equal(PRICE_KEYS.length, Object.keys(PRICES).length);
});

test('checkPrices refuses anything but whole shekels in range, with a version', () => {
  const good = { version: 'front-2@6695fc4', prices: { ...PRICES } };
  const { weekendPerNight, ...old } = PRICES;
  assert.equal(checkPrices({ ...good, prices: old }).prices.weekendPerNight, PRICES.perNight, 'an older file without weekendPerNight still passes');
  assert.deepEqual(checkPrices(good), { ok: true, version: good.version, prices: PRICES });
  assert.equal(checkPrices({ ...good, prices: { ...PRICES, extra: 5 } }).ok, true);
  for (const bad of [
    null,
    'x',
    { prices: PRICES },
    { version: '', prices: PRICES },
    { version: 'has space', prices: PRICES },
    { version: 'v1' },
    { version: 'v1', prices: { ...PRICES, perNight: '950' } },
    { version: 'v1', prices: { ...PRICES, perNight: 950.5 } },
    { version: 'v1', prices: { ...PRICES, perNight: 95 } },
    { version: 'v1', prices: { ...PRICES, bride_day: 20001 } },
    { version: 'v1', prices: { ...PRICES, wedding_night: undefined } },
  ]) {
    assert.equal(checkPrices(bad).ok, false, JSON.stringify(bad));
  }
});

test('holds expire after 24 hours', () => {
  const created = '2026-10-01T10:00:00.000Z';
  assert.equal(isHoldActive(created, Date.parse('2026-10-02T09:59:00Z')), true);
  assert.equal(isHoldActive(created, Date.parse('2026-10-02T10:00:00Z')), false);
  assert.equal(isHoldActive(undefined, Date.now()), false);
});

test('whatsapp numbers use the Israeli country code', () => {
  assert.equal(whatsappNumber('052-322-4220'), '972523224220');
  assert.equal(whatsappNumber('+972 52 322 4220'), '972523224220');
});

const valid = { stayType: 'couple', checkIn: '2026-10-01', checkOut: '2026-10-03', adults: 2, name: 'ישראל ישראלי', phone: '050-0000000' };

test('a valid request is normalized', () => {
  const res = validateRequest({ ...valid, email: '', notes: '  ' }, '2026-09-15', PRICES);
  assert.equal(res.ok, true);
  assert.equal(res.value.nights, 2);
  assert.equal(res.value.estimate, 850 + 1050, 'Thursday and Friday night');
  assert.equal(res.value.notes, '');
});

test('wedding requests derive their range from the wedding date', () => {
  const res = validateRequest({ ...valid, stayType: 'bride_day', checkIn: '2026-10-10', checkOut: '' }, '2026-09-15');
  assert.equal(res.ok, true);
  assert.deepEqual([res.value.start, res.value.end, res.value.checkOut], ['2026-10-09', '2026-10-11', '2026-10-11']);
  // The wedding must be tomorrow at the earliest, since the night before is held too.
  assert.equal(validateRequest({ ...valid, stayType: 'bride_day', checkIn: '2026-09-15' }, '2026-09-15').errors.checkIn, 'past');
});

test('bride-day packages carry an optional count of day participants, 1 to 5', () => {
  const bride = { ...valid, stayType: 'bride_day', checkIn: '2026-10-10', checkOut: '' };
  assert.equal(validateRequest({ ...bride, participants: 4 }, '2026-09-15').value.participants, 4);
  assert.equal(validateRequest({ ...bride, stayType: 'bride_night_day', participants: 5 }, '2026-09-15').value.participants, 5);
  // Requests from before the field existed carry none.
  assert.equal(validateRequest(bride, '2026-09-15').value.participants, 0);
  for (const bad of [0, 6, 2.5, 'x']) {
    assert.equal(validateRequest({ ...bride, participants: bad }, '2026-09-15').errors.participants, 'invalid', String(bad));
  }
  // Other stays ignore it.
  assert.equal(validateRequest({ ...valid, participants: 9 }, '2026-09-15').value.participants, 0);
});

test('invalid requests report each field', () => {
  const res = validateRequest(
    { stayType: 'couple', checkIn: '2026-09-14', checkOut: '2026-09-20', adults: 4, name: 'א', phone: 'abc', email: 'nope', notes: 'x'.repeat(500) },
    '2026-09-15'
  );
  assert.equal(res.ok, false);
  assert.deepEqual(Object.keys(res.errors).sort(), ['adults', 'checkIn', 'email', 'name', 'notes', 'phone']);
  assert.equal(validateRequest({ ...valid, checkOut: '2026-10-01' }, '2026-09-15').errors.checkOut, 'invalid');
  assert.equal(validateRequest({ ...valid, checkOut: '2026-10-30' }, '2026-09-15').errors.checkOut, 'too_long');
  assert.equal(validateRequest({ ...valid, checkIn: '2026-02-30' }, '2026-01-15').errors.checkIn, 'invalid');
});

const closing = { kind: 'block', start: '2026-10-01', end: '2026-10-04', reason: 'תחזוקה', note: '  צבע  ' };

test('a console closing is normalized, with its nights', () => {
  const res = validateBlock(closing, '2026-09-15');
  assert.equal(res.ok, true);
  assert.deepEqual(res.value, { kind: 'block', start: '2026-10-01', end: '2026-10-04', nights: 3, note: 'צבע', reason: 'תחזוקה' });
  // Today itself may be closed; a closing may run to the end of the booking window.
  assert.equal(validateBlock({ ...closing, start: '2026-09-15', end: '2026-09-16' }, '2026-09-15').ok, true);
  assert.equal(validateBlock({ ...closing, start: '2026-09-15', end: '2027-09-16' }, '2026-09-15').ok, true);
});

test('a console closing refuses bad dates, kinds and reasons', () => {
  const errors = (input) => validateBlock({ ...closing, ...input }, '2026-09-15').errors || {};
  assert.equal(errors({ start: '2026-09-14' }).start, 'past');
  assert.equal(errors({ start: '2026-02-30' }).start, 'invalid');
  assert.equal(errors({ end: '2026-10-01' }).end, 'invalid', 'no nights');
  assert.equal(errors({ end: '2027-09-17' }).end, 'too_far');
  assert.equal(errors({ kind: 'party' }).kind, 'invalid');
  assert.equal(errors({ reason: 'סתם' }).reason, 'invalid');
  assert.equal(errors({ note: 'x'.repeat(451) }).note, 'too_long');
});

test('a temporary hold needs whole hours up to a week', () => {
  const hold = { kind: 'hold', start: '2026-10-01', end: '2026-10-02', hours: 48, name: ' רונית ' };
  assert.deepEqual(validateBlock(hold, '2026-09-15').value, { kind: 'hold', start: '2026-10-01', end: '2026-10-02', nights: 1, note: '', hours: 48, name: 'רונית' });
  for (const bad of [0, 1.5, 169, 'x', undefined]) {
    assert.equal(validateBlock({ ...hold, hours: bad }, '2026-09-15').errors.hours, 'invalid', String(bad));
  }
});

test('a phone booking needs the guest details a website request needs', () => {
  const phone = { kind: 'phone', start: '2026-10-01', end: '2026-10-03', stayType: 'couple', name: 'דנה לוי', phone: '050-1234567', email: '', adults: 2, price: 1900 };
  const res = validateBlock(phone, '2026-09-15');
  assert.equal(res.ok, true);
  assert.equal(res.value.price, 1900);
  assert.equal(validateBlock({ ...phone, price: '' }, '2026-09-15').value.price, 0, 'the price may be left out');
  const bad = validateBlock({ ...phone, stayType: 'x', name: 'א', phone: 'abc', email: 'nope', adults: 4, price: -1 }, '2026-09-15');
  assert.deepEqual(Object.keys(bad.errors).sort(), ['adults', 'email', 'name', 'phone', 'price', 'stayType']);
});

test('working days between two dates leave out both ends and Saturdays', () => {
  // 2026-10-17 is a Saturday.
  assert.equal(workingDaysBetween('2026-10-14', '2026-10-15'), 0);
  assert.equal(workingDaysBetween('2026-10-14', '2026-10-21'), 5, '15, 16, 18, 19, 20');
  assert.equal(workingDaysBetween('2026-10-14', '2026-10-14'), 0);
});

test('the cancellation fee follows the bands in the terms', () => {
  // Confirmed long ago, so the statutory right does not apply.
  const fee = (today, by = 'guest', price = 2000) => cancellationFee({ arrival: '2026-11-20', confirmed: '2026-09-01', today, price, by });
  assert.deepEqual(fee('2026-11-06'), { band: 'free', percent: 0, fee: 0, daysBefore: 14, statutory: false }, 'exactly 14 days is free');
  assert.deepEqual(fee('2026-11-07'), { band: 'half', percent: 50, fee: 1000, daysBefore: 13, statutory: false });
  assert.deepEqual(fee('2026-11-13'), { band: 'half', percent: 50, fee: 1000, daysBefore: 7, statutory: false }, 'exactly 7 days is half');
  assert.deepEqual(fee('2026-11-14'), { band: 'full', percent: 100, fee: 2000, daysBefore: 6, statutory: false });
  assert.deepEqual(fee('2026-11-20'), { band: 'full', percent: 100, fee: 2000, daysBefore: 0, statutory: false });
  assert.equal(fee('2026-11-14', 'guest', 0).fee, null, 'no price, no amount');
  assert.deepEqual(fee('2026-11-19', 'us'), { band: 'ours', percent: 0, fee: 0, daysBefore: 1, statutory: false }, 'no fee when we cancel');
});

test('the statutory right caps the fee at 5% or ₪100 within 14 days of the confirmation', () => {
  const fee = (today, confirmed, price = 2000) => cancellationFee({ arrival: '2026-11-20', confirmed, today, price, by: 'guest' });
  // 10 days before arrival, 50% band; confirmed 14 days earlier (the last day of the window).
  assert.deepEqual(fee('2026-11-10', '2026-10-27'), { band: 'statutory', percent: null, fee: 100, daysBefore: 10, statutory: true });
  assert.equal(fee('2026-11-10', '2026-10-27', 1000).fee, 50, '5% when it is below ₪100');
  assert.equal(fee('2026-11-10', '2026-10-27', 0).fee, null);
  assert.equal(fee('2026-11-10', '2026-10-26').band, 'half', 'day 15 after the confirmation is outside the window');
  assert.equal(fee('2026-11-10', '').band, 'half', 'an unknown confirmation date does not assume the right');
  // Free stays free even inside the window.
  assert.deepEqual(fee('2026-11-01', '2026-10-30'), { band: 'free', percent: 0, fee: 0, daysBefore: 19, statutory: true });
  // 2026-11-12 → 2026-11-20 (8 days, the 50% band) leaves 13–19 between them: 7 days, one a Saturday (14th), so 6.
  assert.equal(fee('2026-11-12', '2026-11-10').band, 'half', 'fewer than 7 non-rest days left');
  // 2026-11-11 leaves 12–19: 8 days, 7 of them not Saturdays; 9 days before arrival is the 50% band.
  assert.equal(fee('2026-11-11', '2026-11-10').band, 'statutory');
});

test('the Apps Script form of the module is plain globals that behave the same', () => {
  const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'rules.js'), 'utf8');
  // The same transform deploy.py applies on upload.
  const stripped = source.replace(/^export /gm, '');

  assert.ok(!/^export /m.test(stripped), 'no export keyword may survive; Apps Script cannot parse it');
  assert.ok(!/\bimport\b/.test(stripped), 'rules.js must not import anything; Apps Script has no module loader');

  // Apps Script evaluates every file into one shared global scope.
  const globals = vm.createContext({});
  vm.runInContext(stripped, globals);
  assert.equal(globals.PRICES, undefined, 'no prices in the code');
  for (const name of ['STAY_TYPES', 'HOLD_HOURS', 'MAX_NIGHTS', 'HORIZON_DAYS', 'blockedNights', 'validateRequest', 'stayRange', 'isHoldActive', 'whatsappNumber', 'checkPrices', 'pricesFromRows', 'pricesVersionOf', 'validateBlock', 'BLOCK_REASONS', 'HOLD_MAX_HOURS', 'cancellationFee']) {
    assert.ok(globals[name] !== undefined, `Code.js calls ${name}, so it must be a global`);
  }
  assert.equal(globals.estimatePrice('couple', 2, 3, PRICES, '2026-10-09'), estimatePrice('couple', 2, 3, PRICES, '2026-10-09'));
  // Objects built inside the vm carry that realm's prototypes, so compare them as plain JSON.
  const plain = (v) => JSON.parse(JSON.stringify(v));
  assert.deepEqual(plain(globals.stayRange('bride_day', '2026-10-10', '')), stayRange('bride_day', '2026-10-10', ''));
  assert.equal(globals.validateRequest({ ...valid }, '2026-09-15', PRICES).value.estimate, validateRequest({ ...valid }, '2026-09-15', PRICES).value.estimate);
});
