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
