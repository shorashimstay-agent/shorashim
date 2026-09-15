// Loads rules.js the way Apps Script does (plain globals in one scope) and tests it with node:test.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const r = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/rules.js'), 'utf8'), r);

// Values created inside the vm context have that realm's prototypes; compare them as plain JSON.
const eq = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);

const allDay = (start, end) => ({ allDay: true, start, end });
const timed = (start, end) => ({ allDay: false, start, end });
const WINDOW = ['2026-09-01', '2026-12-01'];

test('all-day events block their nights, not the check-out day', () => {
  eq(r.blockedNights([allDay('2026-10-01', '2026-10-03')], ...WINDOW), ['2026-10-01', '2026-10-02']);
});

test('results are clipped to the requested window', () => {
  eq(r.blockedNights([allDay('2026-09-28', '2026-10-03')], '2026-10-01', '2026-10-02'), ['2026-10-01']);
});

test('timed events block only nights whose 15:00-11:00 window they overlap', () => {
  // A morning until 10:00 overlaps the previous night, which ends at 11:00.
  eq(r.blockedNights([timed('2026-10-05T08:00', '2026-10-05T10:00')], ...WINDOW), ['2026-10-04']);
  // Between check-out and check-in: blocks nothing.
  eq(r.blockedNights([timed('2026-10-05T11:00', '2026-10-05T15:00')], ...WINDOW), []);
  eq(r.blockedNights([timed('2026-10-05T18:00', '2026-10-05T20:00')], ...WINDOW), ['2026-10-05']);
  eq(r.blockedNights([timed('2026-10-05T09:00', '2026-10-05T17:00')], ...WINDOW), ['2026-10-04', '2026-10-05']);
});

test('wedding-type stays block the night before and the wedding night', () => {
  eq(r.stayRange('bride_day', '2026-10-10', ''), { start: '2026-10-09', end: '2026-10-11' });
  eq(r.stayRange('bride_night_day', '2026-10-10', ''), { start: '2026-10-09', end: '2026-10-11' });
  eq(r.stayRange('couple', '2026-10-10', '2026-10-12'), { start: '2026-10-10', end: '2026-10-12' });
});

test('back-to-back stays do not conflict', () => {
  const blocked = r.blockedNights([allDay('2026-10-01', '2026-10-03')], ...WINDOW);
  eq(r.conflictingNights(blocked, '2026-10-03', '2026-10-05'), []);
  eq(r.conflictingNights(blocked, '2026-09-29', '2026-10-01'), []);
  eq(r.conflictingNights(blocked, '2026-09-30', '2026-10-02'), ['2026-10-01']);
});

test('price estimate matches the site', () => {
  assert.equal(r.estimatePrice('couple', 2, 2), 1900);
  assert.equal(r.estimatePrice('couple', 2, 3), 2300);
  assert.equal(r.estimatePrice('bride_day', 2, 3), 1800);
  assert.equal(r.estimatePrice('wedding_night', 1, 2), 1200);
});

test('holds expire after 24 hours', () => {
  const created = '2026-10-01T10:00:00.000Z';
  assert.equal(r.isHoldActive(created, Date.parse('2026-10-02T09:59:00Z')), true);
  assert.equal(r.isHoldActive(created, Date.parse('2026-10-02T10:00:00Z')), false);
  assert.equal(r.isHoldActive(undefined, Date.now()), false);
});

test('whatsapp numbers use the Israeli country code', () => {
  assert.equal(r.whatsappNumber('052-322-4220'), '972523224220');
  assert.equal(r.whatsappNumber('+972 52 322 4220'), '972523224220');
});

const valid = { stayType: 'couple', checkIn: '2026-10-01', checkOut: '2026-10-03', adults: 2, name: 'ישראל ישראלי', phone: '050-0000000' };

test('a valid request is normalized', () => {
  const res = r.validateRequest({ ...valid, email: '', notes: '  ' }, '2026-09-15');
  assert.equal(res.ok, true);
  assert.equal(res.value.nights, 2);
  assert.equal(res.value.estimate, 1900);
  assert.equal(res.value.notes, '');
});

test('wedding requests derive their range from the wedding date', () => {
  const res = r.validateRequest({ ...valid, stayType: 'bride_day', checkIn: '2026-10-10', checkOut: '' }, '2026-09-15');
  assert.equal(res.ok, true);
  eq([res.value.start, res.value.end, res.value.checkOut], ['2026-10-09', '2026-10-11', '2026-10-11']);
  // The wedding must be tomorrow at the earliest, since the night before is held too.
  assert.equal(r.validateRequest({ ...valid, stayType: 'bride_day', checkIn: '2026-09-15' }, '2026-09-15').errors.checkIn, 'past');
});

test('invalid requests report each field', () => {
  const res = r.validateRequest(
    { stayType: 'couple', checkIn: '2026-09-14', checkOut: '2026-09-20', adults: 4, name: 'א', phone: 'abc', email: 'nope', notes: 'x'.repeat(500) },
    '2026-09-15'
  );
  assert.equal(res.ok, false);
  eq(Object.keys(res.errors).sort(), ['adults', 'checkIn', 'email', 'name', 'notes', 'phone']);
  assert.equal(r.validateRequest({ ...valid, checkOut: '2026-10-01' }, '2026-09-15').errors.checkOut, 'invalid');
  assert.equal(r.validateRequest({ ...valid, checkOut: '2026-10-30' }, '2026-09-15').errors.checkOut, 'too_long');
  assert.equal(r.validateRequest({ ...valid, checkIn: '2026-02-30' }, '2026-01-15').errors.checkIn, 'invalid');
});
