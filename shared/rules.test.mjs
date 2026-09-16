// The booking rules are imported here the same way the website imports them. The last test covers
// the other consumer: the plain-globals form deploy.py uploads to Apps Script.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import {
  blockedNights,
  conflictingNights,
  estimatePrice,
  isHoldActive,
  stayRange,
  validateRequest,
  whatsappNumber,
} from './rules.js';

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
  assert.equal(estimatePrice('couple', 2, 2), 1900);
  assert.equal(estimatePrice('couple', 2, 3), 2300);
  assert.equal(estimatePrice('bride_day', 2, 3), 1800);
  assert.equal(estimatePrice('wedding_night', 1, 2), 1200);
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
  const res = validateRequest({ ...valid, email: '', notes: '  ' }, '2026-09-15');
  assert.equal(res.ok, true);
  assert.equal(res.value.nights, 2);
  assert.equal(res.value.estimate, 1900);
  assert.equal(res.value.notes, '');
});

test('wedding requests derive their range from the wedding date', () => {
  const res = validateRequest({ ...valid, stayType: 'bride_day', checkIn: '2026-10-10', checkOut: '' }, '2026-09-15');
  assert.equal(res.ok, true);
  assert.deepEqual([res.value.start, res.value.end, res.value.checkOut], ['2026-10-09', '2026-10-11', '2026-10-11']);
  // The wedding must be tomorrow at the earliest, since the night before is held too.
  assert.equal(validateRequest({ ...valid, stayType: 'bride_day', checkIn: '2026-09-15' }, '2026-09-15').errors.checkIn, 'past');
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

test('the Apps Script form of the module is plain globals that behave the same', () => {
  const source = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'rules.js'), 'utf8');
  // The same transform deploy.py applies on upload.
  const stripped = source.replace(/^export /gm, '');

  assert.ok(!/^export /m.test(stripped), 'no export keyword may survive; Apps Script cannot parse it');
  assert.ok(!/\bimport\b/.test(stripped), 'rules.js must not import anything; Apps Script has no module loader');

  // Apps Script evaluates every file into one shared global scope.
  const globals = vm.createContext({});
  vm.runInContext(stripped, globals);
  for (const name of ['STAY_TYPES', 'PRICES', 'HOLD_HOURS', 'MAX_NIGHTS', 'HORIZON_DAYS', 'blockedNights', 'validateRequest', 'stayRange', 'isHoldActive', 'whatsappNumber']) {
    assert.ok(globals[name] !== undefined, `Code.js calls ${name}, so it must be a global`);
  }
  assert.equal(globals.estimatePrice('couple', 2, 3), estimatePrice('couple', 2, 3));
  // Objects built inside the vm carry that realm's prototypes, so compare them as plain JSON.
  const plain = (v) => JSON.parse(JSON.stringify(v));
  assert.deepEqual(plain(globals.stayRange('bride_day', '2026-10-10', '')), stayRange('bride_day', '2026-10-10', ''));
  assert.equal(globals.validateRequest({ ...valid }, '2026-09-15').value.estimate, validateRequest({ ...valid }, '2026-09-15').value.estimate);
});
