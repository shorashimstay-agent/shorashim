// Price lists: the prices tab with dated updates (docs/private/pricing-dashboard-plan.md). The
// acceptance figures are the owner's (ClickUp z8r3fe56mc, z8r3fe56md) and the user's decisions of
// 17.11.2026: base 1,050 Sun–Wed / 1,200 Thu–Sat, December 850 / 1,050, New Year's Eve 1,250 a night
// or 2,100 for two, third guest +35%.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  asPriceList,
  buildPriceList,
  checkPriceList,
  findAlternatives,
  parseSheetDate,
  parseSheetInt,
  priceForNight,
  pricesFromRows,
  quoteStay,
  readPriceSource,
  sourceIsValid,
  stayMinimum,
  updateConflicts,
  updateProblem,
} from './rules.js';

const BASE = { perNight: 1050, weekendPerNight: 1200, thirdGuestPercent: 35, bride_day: 1850, bride_night_day: 2650, wedding_night: 1150, bride_day_wedding_night: 2750 };
const DECEMBER = { id: 'udec2026', name: 'דצמבר', from: '2026-12-01', to: '2026-12-31', weekday: 850, weekend: 1050 };
const NYE = { id: 'unye2026', name: 'סילבסטר', from: '2026-12-31', to: '2026-12-31', weekend: 1250, twoNight: 2100 };
const list = (updates, base = BASE) => buildPriceList(base, updates, '2026-11-17', false);
const owner = list([DECEMBER, NYE]);
const price = (l, start, nights, adults = 2) => quoteStay(l, 'couple', start, nights, adults).price;

test("the owner's acceptance figures", () => {
  assert.equal(price(owner, '2026-12-31', 1), 1250, 'New Year\'s Eve alone');
  assert.equal(price(owner, '2026-12-31', 2), 2100, 'the two-night total, Friday 1.1 included');
  // A day earlier: Wednesday 30.12 at December's 850, then 1,250. It equals 2,100 by coincidence,
  // so the "a day earlier doesn't get the special" rule is proved with a different total below.
  assert.equal(price(owner, '2026-12-30', 2), 850 + 1250);
  assert.equal(price(owner, '2027-01-04', 1), 1050, 'January is back to the base: a Monday');
  assert.equal(price(owner, '2027-01-07', 1), 1200, 'a January Thursday');
  assert.equal(price(owner, '2026-12-31', 2, 3), 2100 + 735, '3 guests: +35% of the two-night total');
  assert.equal(price(owner, '2026-12-31', 1, 3), 1250 + 438, '35% of 1,250 is 437.5');
  assert.equal(price(owner, '2026-11-22', 1), 1050, 'November takes the new base: a Sunday');
  assert.equal(price(owner, '2026-11-26', 1), 1200, 'a November Thursday');
  assert.equal(price(owner, '2026-12-03', 1), 1050, 'a December Thursday is a weekend night');
});

test('the two-night total applies only to a stay arriving on its date for exactly two nights', () => {
  const l = list([DECEMBER, { ...NYE, twoNight: 2000 }]);
  assert.equal(price(l, '2026-12-31', 2), 2000);
  assert.equal(price(l, '2026-12-30', 2), 850 + 1250, 'arriving a day earlier');
  assert.equal(price(l, '2026-12-31', 3), 1250 + 1200 + 1200, 'three nights are priced per night');
  assert.equal(price(l, '2026-12-31', 1), 1250);
});

test('the third guest is a whole-shekel percentage, rounded half up', () => {
  const l = list([{ id: 'uround01', name: 'x', from: '2027-03-01', to: '2027-03-02', weekday: 1350 }]);
  assert.equal(price(l, '2027-03-01', 1, 3), 1350 + 473, '472.5 → 473, with no float drift');
  const m = list([{ id: 'uround02', name: 'x', from: '2027-03-01', to: '2027-03-02', weekday: 1450 }]);
  assert.equal(price(m, '2027-03-01', 1, 3), 1450 + 508);
});

test('precedence per field: single date, then ranges shortest first, then base', () => {
  const peak = { id: 'upeak001', name: 'סופ"ש חזק', from: '2026-12-10', to: '2026-12-13', weekend: 1400 };
  const l = list([DECEMBER, peak]);
  assert.equal(priceForNight(l, '2026-12-11').price, 1400, 'the nested range wins on its field');
  // The nested range sets only ה׳–ש׳: its Sunday night inherits December's 850, not the base.
  assert.equal(priceForNight(l, '2026-12-13').price, 850);
  assert.equal(priceForNight(l, '2026-12-14').price, 850);
  assert.equal(priceForNight(owner, '2026-12-31').price, 1250, 'the single date beats December');
  assert.equal(priceForNight(owner, '2027-01-01').price, 1200);
});

test('packages keep their flat price; a missing package has none', () => {
  assert.equal(quoteStay(owner, 'bride_day', '2026-12-31', 0, 3).price, 1850);
  const { bride_day_wedding_night, ...rest } = BASE;
  assert.equal(quoteStay(list([], rest), 'bride_day_wedding_night', '2026-12-31', 1, 2).price, null);
});

test('minimums: the stay must reach the highest minimum of any night, off unless enabled', () => {
  const hol = { id: 'uholy001', name: 'חג', from: '2027-04-21', to: '2027-04-22', minimum: 3 };
  const on = buildPriceList(BASE, [hol], '2026-11-17', true);
  assert.equal(stayMinimum(on, '2027-04-20', '2027-04-22'), 3);
  assert.equal(stayMinimum(on, '2027-04-18', '2027-04-21'), 1, 'checking out on the first holiday night');
  assert.equal(quoteStay(on, 'couple', '2027-04-22', 2, 2).minimum, 3);
  const off = buildPriceList(BASE, [hol], '2026-11-17', false);
  assert.equal(stayMinimum(off, '2027-04-20', '2027-04-22'), 1, 'stripped from the published list while off');
  assert.equal(off.updates.length, 0, 'a minimum-only update publishes nothing while off');
});

test('alternatives meet the minimum of the nights they cover', () => {
  const hol = { id: 'uholy001', name: 'חג', from: '2027-04-21', to: '2027-04-21', minimum: 2 };
  const on = buildPriceList(BASE, [hol], '2026-11-17', true);
  const alts = findAlternatives([], '2027-04-19', 1, '2027-04-01', '2027-05-01', '2027-04-01', 5, on);
  assert.ok(alts.length > 0);
  for (const a of alts) assert.notEqual(a.checkIn, '2027-04-21', 'one night on the holiday is too short');
  assert.ok(findAlternatives([], '2027-04-19', 1, '2027-04-01', '2027-05-01', '2027-04-01', 5).some((a) => a.checkIn === '2027-04-21'));
});

test('sheet dates: ISO and Israeli day-first, never month-first', () => {
  assert.equal(parseSheetDate('2026-12-31'), '2026-12-31');
  assert.equal(parseSheetDate('31/12/2026'), '2026-12-31');
  assert.equal(parseSheetDate('1.12.2026'), '2026-12-01');
  assert.equal(parseSheetDate(' 01/12/2026 '), '2026-12-01');
  assert.equal(parseSheetDate('31/11/2026'), '', 'no such date');
  assert.equal(parseSheetDate('12/31/2026'), '', 'month-first is not assumed');
  assert.equal(parseSheetDate(46387), '', 'a serial number in a date column');
  assert.equal(parseSheetDate('מחר'), '');
});

test('sheet numbers: separators, ₪ and a zero fraction are fine', () => {
  for (const v of ['1,250', '₪1,250', '₪1,050.00', ' 1250 ', 1250]) assert.ok([1250, 1050].includes(parseSheetInt(v)), String(v));
  assert.equal(parseSheetInt(''), null);
  assert.equal(parseSheetInt(null), null);
  assert.ok(Number.isNaN(parseSheetInt('1250.50')));
  assert.ok(Number.isNaN(parseSheetInt('abc')));
  assert.ok(Number.isNaN(parseSheetInt(12.5)));
});

test('update rules, on save and when read', () => {
  const ok = { id: 'uabcdef1', name: 'x', from: '2026-12-01', to: '2026-12-03', weekday: 900 };
  assert.equal(updateProblem(ok, { today: '2026-11-17', forSave: true }), '');
  assert.equal(updateProblem({ ...ok, to: '2026-11-30' }, {}), 'order');
  assert.equal(updateProblem({ ...ok, weekday: undefined }, {}), 'empty');
  assert.equal(updateProblem({ ...ok, weekday: 50 }, {}), 'weekday');
  assert.equal(updateProblem({ ...ok, twoNight: 2000 }, {}), 'twoNight_range');
  assert.equal(updateProblem({ ...ok, name: '' }, { forSave: true }), 'name');
  assert.equal(updateProblem({ ...ok, name: '' }, {}), '', 'a hand-typed row may lack a name');
  assert.equal(updateProblem({ ...ok, minimum: 2 }, { forSave: true }), 'minimum_off');
  assert.equal(updateProblem({ ...ok, minimum: 15 }, {}), 'minimum');
  assert.equal(updateProblem({ ...ok, from: '2028-01-01', to: '2028-01-02' }, { today: '2026-11-17' }), 'too_far');
  assert.equal(updateProblem({ ...ok, from: '2026-10-01', to: '2026-10-02' }, { today: '2026-11-17', forSave: true }), 'past');
  assert.equal(updateProblem({ ...ok, from: '2026-10-01', to: '2026-10-02' }, { today: '2026-11-17' }), '', 'past rows in the sheet are fine');
  const single = { id: 'uabcdef2', name: 'x', from: '2026-12-31', to: '2026-12-31', twoNight: 2100 };
  assert.equal(updateProblem(single, {}), '', 'a single date with only a two-night total');
  assert.equal(updateProblem({ ...single, minimum: 3 }, { minimumsEnabled: true }), 'twoNight_minimum');
});

test('conflicts: partial or equal overlaps on the same field; nested ranges are fine', () => {
  const r = (id, from, to, f = { weekday: 900 }) => ({ id, name: id, from, to, ...f });
  assert.deepEqual(updateConflicts([r('a', '2026-12-01', '2026-12-31'), r('b', '2026-12-10', '2026-12-13')]), []);
  assert.equal(updateConflicts([r('a', '2026-12-01', '2026-12-31'), r('b', '2026-12-20', '2027-01-05')]).length, 1);
  assert.equal(updateConflicts([r('a', '2026-12-01', '2026-12-05'), r('b', '2026-12-03', '2026-12-07')]).length, 1);
  assert.deepEqual(updateConflicts([r('a', '2026-12-01', '2026-12-31'), r('b', '2026-12-20', '2027-01-05', { weekend: 1300 })]), [], 'different fields');
  assert.equal(updateConflicts([r('a', '2026-12-31', '2026-12-31'), r('b', '2026-12-31', '2026-12-31')]).length, 1);
  assert.equal(updateConflicts([r('a', '2026-12-31', '2026-12-31'), r('b', '2026-12-31', '2026-12-31', { twoNight: 2100 })]).length, 1, 'one date, one row, whatever the fields');
  assert.deepEqual(updateConflicts([r('a', '2026-12-31', '2026-12-31'), r('b', '2026-12-01', '2026-12-31')]), [], 'a single date over a range');
});

/** The prices tab as the web app hands it to readPriceSource. */
function sheet(updates = [], extra = {}) {
  const rows = [
    ['מפתח (לא לשנות)', 'מה המחיר', 'מחיר ב־₪'],
    ['perNight', 'א׳–ד׳', 1050],
    ['weekendPerNight', 'ה׳–ש׳', 1200],
    ['thirdGuestPerNight', 'ישן', 150],
    ['thirdGuestPercent', 'אורח שלישי', 35],
    ['bride_day', '', 1850],
    ['bride_night_day', '', 2650],
    ['wedding_night', '', 1150],
    ['bride_day_wedding_night', '', 2750],
  ];
  while (rows.length < 21) rows.push(['', '', '']);
  rows.push(['id', 'שם', 'מ־', 'עד (כולל)', 'א׳–ד׳', 'ה׳–ש׳', 'מינימום לילות', 'מחיר לשני לילות', 'עודכן']);
  for (const u of updates) rows.push(u);
  return Object.assign(rows, extra);
}
const opts = { today: '2026-11-17', minimumsEnabled: false, hasBaseline: true };

test('the prices tab reads into base and updates', () => {
  const read = readPriceSource(sheet([['udec2026', 'דצמבר', '01/12/2026', '31.12.2026', '850', '₪1,050', '', '', 'x'], ['unye2026', 'סילבסטר', '2026-12-31', '2026-12-31', '', '1250', '', '2,100', '']]), opts);
  assert.equal(sourceIsValid(read), true, JSON.stringify(read));
  assert.equal(read.headerRow, 22);
  // thirdGuestPerNight is kept while the row exists: the console live before the merge still reads it.
  assert.deepEqual(read.base, { ...BASE, thirdGuestPerNight: 150 });
  assert.deepEqual(read.updates.map((u) => [u.from, u.to, u.weekday, u.weekend, u.twoNight]), [['2026-12-01', '2026-12-31', 850, 1050, undefined], ['2026-12-31', '2026-12-31', undefined, 1250, 2100]]);
  const { thirdGuestPerNight, ...base } = read.base;
  assert.equal(buildPriceList(base, read.updates, '2026-11-17', false).version, owner.version, 'the same prices give the same version');
});

test('the header may move; a mixed-up layout is a structural problem', () => {
  const s = sheet([['udec2026', 'x', '2026-12-01', '2026-12-31', '850', '', '', '', '']]);
  s.splice(15, 1);
  assert.equal(sourceIsValid(readPriceSource(s, opts)), true, 'a row deleted above the header');
  const sorted = sheet([['udec2026', 'x', '2026-12-01', '2026-12-31', '850', '', '', '', '']]);
  sorted.push(['perNight', '', 900]);
  assert.equal(readPriceSource(sorted, opts).structure, 'base_below_header');
  const two = sheet([]);
  two.push(['id', '', '']);
  assert.equal(readPriceSource(two, opts).structure, 'two_headers');
  const noHeader = sheet([]).slice(0, 21);
  assert.equal(readPriceSource(noHeader, opts).structure, 'no_header');
  assert.equal(sourceIsValid(readPriceSource(noHeader, { ...opts, hasBaseline: false })), true, 'before the first publish');
  const high = sheet([]);
  high.splice(1, 0, ...Array(20).fill(['', '', '']));
  assert.equal(readPriceSource(high, opts).structure, 'base_outside_rows');
});

test('blank and cleared rows, ids, unknown keys and wrong-column prices', () => {
  const read = readPriceSource(sheet([
    ['', '', '', '', '', '', '', '', ''],
    ['ugone001', '', '', '', '', '', '', '', '17.11.2026 10:00'],
    ['', 'ללא מזהה', '2026-12-05', '2026-12-06', '900', '', '', '', ''],
    ['uthu0001', 'חמישי', '2026-12-31', '2026-12-31', '1250', '', '', '', ''],
  ]), opts);
  assert.deepEqual(read.removedIds, ['ugone001'], 'an id with B–H empty is a removed row, timestamp or not');
  assert.deepEqual(read.blankIds, [25], 'a row with content but no id needs one');
  assert.ok(read.warnings.some((w) => w.reason === 'price_unused' && w.id === 'uthu0001'), '31.12 is a Thursday');
  const unknown = sheet([]);
  unknown[12] = ['perNigth', 'typo', 999];
  assert.ok(readPriceSource(unknown, opts).warnings.some((w) => w.reason === 'unknown_key'));
});

test('only an empty or copied id gets a new id; keys and headers sorted down are never touched', () => {
  const read = readPriceSource(sheet([
    ['udup0001', 'x', '2026-12-05', '2026-12-06', '900', '', '', '', ''],
    ['udup0001', 'copy', '2026-12-08', '2026-12-09', '900', '', '', '', ''],
    ['perNight', '', '', '', '', '', '', '', ''],
    ['טקסט', 'y', '2026-12-10', '2026-12-11', '900', '', '', '', ''],
  ]), opts);
  assert.deepEqual(read.blankIds, [24], 'the copied id only');
  assert.equal(read.structure, 'base_below_header');
  assert.ok(read.rowErrors.some((e) => e.id === 'טקסט' && e.reason === 'id'), 'other text is an invalid row, not overwritten');
});

test('a two-night total under an inherited minimum above 2 is flagged', () => {
  const read = readPriceSource(sheet([
    ['uhol0001', 'חג', '2027-04-20', '2027-04-25', '', '', '3', '', ''],
    ['utwo0001', 'זוג', '2027-04-21', '2027-04-21', '', '1300', '', '2400', ''],
  ]), { ...opts, minimumsEnabled: true });
  assert.ok(read.warnings.some((w) => w.reason === 'twoNight_unreachable' && w.id === 'utwo0001'));
});

test('a minimum typed by hand while minimums are off is ignored, not invalid', () => {
  const read = readPriceSource(sheet([['uhol0001', 'חג', '2027-04-21', '2027-04-22', '', '', '3', '', '']]), opts);
  assert.equal(sourceIsValid(read), true);
  assert.ok(read.warnings.some((w) => w.reason === 'minimum_off'));
  assert.equal(read.updates[0].inactiveMinimum, 3);
  assert.equal(read.updates[0].minimum, undefined);
});

test('a cleared thirdGuestPerNight row and a missing percentage are fine', () => {
  const s = sheet([]);
  s[3] = ['thirdGuestPerNight', '', ''];
  s[4] = ['', '', ''];
  const read = readPriceSource(s, opts);
  assert.equal(sourceIsValid(read), true, JSON.stringify(read.baseError));
  assert.equal(read.base.thirdGuestPercent, 35);
});

test('the base area still reads as before for older readers of A1:C20', () => {
  const s = sheet([['udec2026', 'x', '2026-12-01', '2026-12-31', '850', '', '', '', '']]);
  const old = pricesFromRows(s.slice(0, 20).map((r) => r.slice(0, 3)));
  assert.equal(old.ok, true);
  assert.equal(old.prices.perNight, 1050);
  assert.deepEqual(pricesFromRows(s.map((r) => r.slice(0, 3))), old, 'the old backend reads every row of A–C');
});

test('published lists: stable versions, old rows dropped, unknown fields ignored', () => {
  assert.equal(list([DECEMBER, NYE]).version, list([NYE, DECEMBER]).version, 'order does not matter');
  assert.notEqual(list([DECEMBER]).version, list([{ ...DECEMBER, weekday: 851 }]).version);
  assert.match(owner.version, /^p-[0-9a-f]{8}$/);
  const old = { id: 'uold0001', name: 'x', from: '2026-09-01', to: '2026-10-10', weekday: 900 };
  assert.equal(list([old]).updates.length, 0, 'ended more than 30 days before 17.11');
  assert.equal(checkPriceList({ ...owner, extra: 1, updates: owner.updates.map((u) => ({ ...u, colour: 'red' })) }).ok, true);
  assert.equal(checkPriceList(null).ok, false);
  assert.equal(checkPriceList({ ...owner, version: undefined }).ok, false);
  assert.equal(checkPriceList({ ...owner, updates: [{ id: 'x', from: '2026-12-02', to: '2026-12-01', weekday: 900 }] }).ok, false);
});

test('a flat price map still prices, as a list with no updates', () => {
  const l = asPriceList({ perNight: 900, weekendPerNight: 1100, thirdGuestPerNight: 175, bride_day: 1900, bride_night_day: 2700, wedding_night: 1250, bride_day_wedding_night: 2800 });
  assert.equal(l.base.thirdGuestPercent, 35);
  assert.equal(quoteStay(l, 'couple', '2026-12-31', 2, 2).price, 2200);
  assert.equal(asPriceList(null), null);
});
