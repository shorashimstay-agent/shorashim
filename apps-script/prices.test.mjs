// Prices.js run in Node against an in-memory spreadsheet, Script Properties and cache: the price
// section (read, write, re-read, validate, publish), hand-edit detection, the owner's email, the
// signed operator actions and the fallbacks. The staging suite covers the same against real Google.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

const here = path.dirname(fileURLToPath(import.meta.url));
const GID = 777001;
const TODAY = '2026-11-17';

/** A1 notation ("A1", "A1:B1", "'tab'!A23:I23") to { row, col, rows, cols }. */
function a1(ref) {
  const m = /^(?:'.*'!)?([A-Z])(\d+)(?::([A-Z])(\d+))?$/.exec(ref);
  const col = m[1].charCodeAt(0) - 64;
  const row = Number(m[2]);
  return { row, col, rows: m[4] ? Number(m[4]) - row + 1 : 1, cols: m[3] ? m[3].charCodeAt(0) - 64 - col + 1 : 1 };
}

function fakeSheet(name, id, cells = []) {
  const sheet = {
    name, id, cells, formats: {}, hidden: false, protections: [],
    getName: () => sheet.name,
    getSheetId: () => sheet.id,
    getLastRow: () => {
      for (let r = sheet.cells.length; r > 0; r--) if ((sheet.cells[r - 1] || []).some((v) => v !== '' && v != null)) return r;
      return 0;
    },
    getMaxRows: () => 1000,
    getLastColumn: () => Math.max(0, ...sheet.cells.map((r) => { for (let c = (r || []).length; c > 0; c--) if (r[c - 1] !== '' && r[c - 1] != null) return c; return 0; })),
    hideSheet: () => { sheet.hidden = true; return sheet; },
    protect: () => { const p = { setDescription: () => p, setWarningOnly: (w) => { p.warning = w; return p; } }; sheet.protections.push(p); return p; },
    getProtections: () => sheet.protections,
    getParent: () => null,
    getRange: (r, c, nr = 1, nc = 1) => {
      if (typeof r === 'string') ({ row: r, col: c, rows: nr, cols: nc } = a1(r));
      return fakeRange(sheet, r, c, nr, nc);
    },
  };
  return sheet;
}

function fakeRange(sheet, r, c, nr, nc) {
  const get = (i, j) => { const row = sheet.cells[r - 1 + i] || []; const v = row[c - 1 + j]; return v === undefined || v === null ? '' : v; };
  const grid = (fn) => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => fn(i, j)));
  const range = {
    getValues: () => grid(get),
    getDisplayValues: () => grid((i, j) => { const v = get(i, j); return v instanceof Date ? `${v.getMonth() + 1}/${v.getDate()}/${v.getFullYear()}` : String(v); }),
    getValue: () => get(0, 0),
    getDisplayValue: () => String(get(0, 0)),
    setValues: (values) => { values.forEach((row, i) => row.forEach((v, j) => { (sheet.cells[r - 1 + i] ||= [])[c - 1 + j] = v; })); return range; },
    setValue: (v) => range.setValues([[v]]),
    setNumberFormat: (f) => { sheet.formats[`${r}:${c}`] = f; return range; },
    getNumberFormat: () => sheet.formats[`${r}:${c}`] || '0',
    clearContent: () => { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (sheet.cells[r - 1 + i]) sheet.cells[r - 1 + i][c - 1 + j] = ''; return range; },
  };
  return range;
}

/** The prices tab as the owner keeps it: title row, base keys, and the updates table at row 22. */
function sourceCells(updates = [], { header = true } = {}) {
  const rows = [
    ['מפתח (לא לשנות)', 'מה המחיר', 'מחיר ב־₪'],
    ['perNight', 'א׳–ד׳', 850],
    ['weekendPerNight', 'ה׳–ש׳', 1050],
    ['thirdGuestPerNight', 'ישן', 150],
    ['thirdGuestPercent', 'אורח שלישי', 35],
    ['bride_day', '', 1850],
    ['bride_night_day', '', 2650],
    ['wedding_night', '', 1150],
    ['bride_day_wedding_night', '', 2750],
  ];
  if (header) {
    while (rows.length < 21) rows.push(['', '', '']);
    rows.push(['id', 'שם', 'מ־', 'עד (כולל)', 'א׳–ד׳', 'ה׳–ש׳', 'מינימום לילות', 'מחיר לשני לילות', 'עודכן']);
    rows.push(...updates);
  }
  return rows;
}

function env({ cells = sourceCells([], { header: false }), testHooks = false } = {}) {
  const store = new Map();
  // Apps Script refuses a property value over 9 KB.
  const limit = (k, v) => { if (Buffer.byteLength(k + String(v)) > 9 * 1024) throw new Error(`property ${k} is over 9 KB`); };
  const props = {
    getProperty: (k) => (store.has(k) ? store.get(k) : null),
    setProperty: (k, v) => { limit(k, v); store.set(k, String(v)); return props; },
    setProperties: (o) => { for (const [k, v] of Object.entries(o)) limit(k, v); for (const [k, v] of Object.entries(o)) store.set(k, String(v)); return props; },
    deleteProperty: (k) => { store.delete(k); return props; },
  };
  const lockState = { busy: false };
  const cacheStore = new Map();
  const cache = { get: (k) => cacheStore.get(k) ?? null, put: (k, v) => cacheStore.set(k, v), remove: (k) => cacheStore.delete(k) };
  const source = fakeSheet('מחירים', 0, cells);
  const ss = {
    sheets: [source],
    broken: false,
    getId: () => 'prices-sheet',
    getSheetByName: (n) => ss.sheets.find((s) => s.name === n) ?? null,
    getSheets: () => ss.sheets,
    insertSheet: (n) => { const s = fakeSheet(n, 99); ss.sheets.push(s); return s; },
    getSpreadsheetTimeZone: () => 'Asia/Jerusalem',
    setSpreadsheetLocale: () => {},
    setSpreadsheetTimeZone: () => {},
  };
  for (const s of ss.sheets) s.getParent = () => ss;
  const mails = [];
  const triggers = [];
  const logged = [];
  const sheetsApi = { added: [], valueWrites: [] };
  const builder = () => { const b = { timeBased: () => b, after: () => b, everyHours: () => b, forSpreadsheet: () => b, onChange: () => b, create: () => { triggers.push(b); return b; } }; return b; };
  const ctx = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    CONFIG: { pricesSheetId: 'prices-sheet', pricesPublishedGid: GID, ownerEmail: 'owner@example.com', testHooks, hmacSecret: 'k' },
    PropertiesService: { getScriptProperties: () => props },
    CacheService: { getScriptCache: () => cache },
    LockService: { getScriptLock: () => ({ tryLock: () => !lockState.busy, waitLock: () => {}, releaseLock: () => {} }), getUserLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    SpreadsheetApp: {
      openById: () => { if (ss.broken) throw new Error('Sheets is down'); return ss; },
      flush: () => {},
      ProtectionType: { SHEET: 'SHEET' },
    },
    Sheets: {
      Spreadsheets: {
        batchUpdate: (req) => {
          for (const r of req.requests) {
            const p = r.addSheet.properties;
            sheetsApi.added.push(p.sheetId);
            const s = fakeSheet(p.title, p.sheetId);
            s.getParent = () => ss;
            ss.sheets.push(s);
          }
        },
        Values: {
          batchUpdate: (req) => {
            for (const d of req.data) {
              sheetsApi.valueWrites.push(d.range);
              const { row, col } = a1(d.range);
              source.getRange(row, col, d.values.length, d.values[0].length).setValues(d.values);
            }
          },
        },
      },
    },
    Utilities: {
      newBlob: (data) => ({ getBytes: () => Buffer.from(typeof data === 'string' ? data : Buffer.from(data)), getDataAsString: () => Buffer.from(data).toString('utf8') }),
      gzip: (blob) => ({ getBytes: () => zlib.gzipSync(blob.getBytes()) }),
      ungzip: (blob) => ({ getDataAsString: () => zlib.gunzipSync(blob.getBytes()).toString('utf8') }),
      base64Encode: (bytes) => Buffer.from(bytes).toString('base64'),
      base64Decode: (text) => Buffer.from(text, 'base64'),
      formatDate: (d, tz, fmt) => (fmt === 'yyyy-MM-dd' ? d.toISOString().slice(0, 10) : '17.11.2026 10:00'),
      getUuid: () => crypto.randomUUID(),
      computeHmacSha256Signature: (value, key) => crypto.createHmac('sha256', key).update(value).digest(),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      Charset: { UTF_8: 'UTF-8' },
    },
    MailApp: { sendEmail: (m) => mails.push(m) },
    ScriptApp: { newTrigger: builder, getProjectTriggers: () => [], deleteTrigger: () => {} },
  });
  const load = (file) => vm.runInContext(fs.readFileSync(path.join(here, file), 'utf8').replace(/^export /gm, ''), ctx, { filename: file });
  load('../shared/rules.js');
  load('src/Code.js');
  load('src/Prices.js');
  ctx.today_ = () => TODAY;
  ctx.logEvent_ = (name, fields) => logged.push({ name, fields });
  ctx.countLogNoise_ = () => {};
  const published = () => {
    const tab = ss.sheets.find((s) => s.id === GID);
    return tab ? JSON.parse(String(tab.cells[0]?.[0] || 'null')) : null;
  };
  return { ctx, store, props, cache, ss, source, mails, triggers, logged, sheetsApi, published, lockState };
}

test('the first run writes the header, publishes, and drops the old fallback copy', () => {
  const e = env();
  e.store.set('pricesLastGood', '{"version":"sheet-1","prices":{}}');
  const res = e.ctx.priceRun_('first');
  assert.equal(res.ok, true);
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.equal(e.source.cells[21][0], 'id', 'the header at row 22');
  assert.equal(e.published().version, res.version);
  assert.equal(e.store.get('prices:version'), res.version);
  assert.equal(e.store.has('pricesLastGood'), false);
  assert.deepEqual([...e.sheetsApi.added], [GID], 'the published tab under the configured gid');
  assert.equal(e.mails.length, 0);
  assert.equal(e.store.has('prices:pending'), false, 'the first run records nothing');
});

test('the backend prices from its own copy, and keeps serving when Sheets is down', () => {
  const e = env({ cells: sourceCells([['udec2026', 'דצמבר', '2026-12-01', '2026-12-31', '850', '1050', '', '', '']]) });
  const first = e.ctx.priceRun_('setup', { sanctioned: true });
  e.ss.broken = true;
  e.cache.remove('prices:v2');
  const current = e.ctx.currentPrices_('');
  assert.equal(current.version, first.version);
  assert.equal(current.prices.updates.length, 1);
  assert.equal(e.ctx.estimatePrice('couple', 1, 2, current.prices, '2026-12-03'), 1050, 'a December Thursday');
});

test('a valid hand edit is published and recorded; an invalid one keeps the last valid list', () => {
  const e = env({ cells: sourceCells([]) });
  const v1 = e.ctx.priceRun_('setup', { sanctioned: true }).version;
  e.source.cells.push(['', 'סילבסטר', '31/12/2026', '31/12/2026', '', '1,250', '', '2100', '']);
  const r2 = e.ctx.priceRun_('handler');
  assert.notEqual(r2.version, v1);
  assert.match(String(e.source.cells[22][0]), /^u[0-9a-z]{8}$/, 'the new row got an id');
  assert.equal(e.published().updates[0].twoNight, 2100);
  assert.equal(JSON.parse(e.store.get('prices:pending')).items.length, 1);
  e.source.cells[22][3] = '30/12/2026';
  const r3 = e.ctx.priceRun_('handler');
  assert.equal(r3.valid, false);
  assert.equal(r3.version, r2.version, 'the published list did not change');
  assert.equal(e.published().version, r2.version);
  assert.equal(JSON.parse(e.store.get('prices:status')).valid, false);
});

test('the email: one per quiet period, the net change, and a daily cap', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup', { sanctioned: true });
  e.source.cells[1][2] = 900;
  e.ctx.priceRun_('handler');
  e.source.cells[1][2] = 950;
  e.ctx.priceRun_('handler');
  e.ctx.pricesEmailDue_();
  assert.equal(e.mails.length, 0, 'not while edits are recent');
  const pending = JSON.parse(e.store.get('prices:pending'));
  pending.lastAt = Date.now() - 10 * 60 * 1000;
  e.store.set('prices:pending', JSON.stringify(pending));
  e.ctx.pricesEmailDue_();
  assert.equal(e.mails.length, 1);
  assert.match(e.mails[0].body, /מחיר בסיס א׳–ד׳: 850 ← 950/, 'the net change, not each step');
  assert.match(e.mails[0].body, /הגיליון תקין/);
  e.ctx.pricesEmailDue_();
  assert.equal(e.mails.length, 1, 'nothing pending any more');
  e.store.set('prices:emailDay', new Date().toISOString().slice(0, 10) + ':5');
  e.source.cells[1][2] = 990;
  e.ctx.priceRun_('handler');
  const again = JSON.parse(e.store.get('prices:pending'));
  again.lastAt = 0;
  e.store.set('prices:pending', JSON.stringify(again));
  e.ctx.pricesEmailDue_();
  assert.equal(e.mails.length, 1, 'the daily cap');
});

test('a format-only change is no change', () => {
  const e = env({ cells: sourceCells([['udec2026', 'דצמבר', '2026-12-01', '2026-12-31', '850', '1050', '', '', '']]) });
  const v = e.ctx.priceRun_('setup', { sanctioned: true }).version;
  e.source.cells[22][4] = '₪850.00';
  e.source.cells[22][5] = '1,050';
  assert.equal(e.ctx.pricesNeedRun_(), false);
  assert.equal(e.ctx.priceRun_('handler').version, v);
  assert.equal(e.store.has('prices:pending'), false);
});

test('a pasted US-format date cell is read as its real date', () => {
  const e = env({ cells: sourceCells([['udec2026', 'x', new Date(Date.UTC(2027, 0, 12)), '2027-01-12', '900', '', '', '', '']]) });
  const res = e.ctx.priceRun_('setup', { sanctioned: true });
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.equal(e.published().updates[0].from, '2027-01-12', 'not 1 December from its "1/12/2027" display');
});

test('a percent typed into the percentage cell', () => {
  const e = env({ cells: sourceCells([]) });
  e.source.cells[4][2] = 0.35;
  e.source.formats['5:3'] = '0%';
  assert.equal(e.ctx.priceRun_('setup', { sanctioned: true }).valid, true);
  assert.equal(e.published().base.thirdGuestPercent, 35);
  const f = env({ cells: sourceCells([]) });
  f.source.cells[4][2] = 0.35;
  assert.equal(f.ctx.priceRun_('setup', { sanctioned: true }).valid, false, 'shown as "0" under a plain format: refused, not silently 0');
});

const DEC = { id: 'udec2026', name: 'דצמבר', from: '2026-12-01', to: '2026-12-31', weekday: 850, weekend: 1050 };
const NYE = { id: 'unye2026', name: 'סילבסטר', from: '2026-12-31', to: '2026-12-31', weekend: 1250, twoNight: 2100 };

test('applyPriceChanges: a dry run writes nothing; the real one writes only its rows, as an operator', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup', { sanctioned: true });
  const changes = { upserts: [DEC, NYE], base: { perNight: 1050, weekendPerNight: 1200 } };
  const before = JSON.stringify(e.source.cells);
  const dry = e.ctx.priceRun_('apply', { changes, dryRun: true, sanctioned: true });
  assert.equal(dry.dryRun, true);
  assert.equal(JSON.stringify(e.source.cells), before);
  const l = dry.list;
  assert.equal(e.ctx.quoteStay(l, 'couple', '2026-12-31', 2, 2).price, 2100);
  assert.equal(e.ctx.quoteStay(l, 'couple', '2027-01-07', 1, 2).price, 1200);
  e.source.cells[7][1] = 'תווית שנערכה ידנית';
  const res = e.ctx.priceRun_('apply', { changes, sanctioned: true });
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.equal(e.published().version, dry.list.version);
  assert.equal(e.source.cells[7][1], 'תווית שנערכה ידנית', 'an untouched row keeps its hand edit');
  assert.ok(e.sheetsApi.valueWrites.every((r) => /!A(2|3|23|24):[CI]\d+$/.test(r)), e.sheetsApi.valueWrites.join());
  assert.equal(e.store.has('prices:pending'), false, 'an operator change is not emailed');
  const again = e.ctx.priceRun_('apply', { changes, sanctioned: true });
  assert.equal(again.version, res.version, 'a repeat is a no-op');
  assert.equal(e.source.cells.filter((r) => r[0] === 'udec2026').length, 1);
});

test('applyPriceChanges refuses an invalid result without writing', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup', { sanctioned: true });
  const res = e.ctx.priceRun_('apply', { changes: { upserts: [DEC, { ...DEC, id: 'udec2027', from: '2026-12-20', to: '2027-01-05' }] }, sanctioned: true });
  assert.equal(res.ok, false);
  assert.equal(res.error, 'invalid');
});

test('the minimums flag republishes at once, and an off flag ignores minimums', () => {
  const e = env({ cells: sourceCells([['uhol0001', 'חג', '2027-04-21', '2027-04-22', '', '', '3', '', '']]) });
  const off = e.ctx.priceRun_('setup', { sanctioned: true });
  assert.equal(off.valid, true);
  assert.equal(e.published().updates.length, 0, 'a minimum-only row publishes nothing while off');
  e.store.set('pricesMinimumsEnabled', 'true');
  e.ctx.priceRun_('flag', { sanctioned: true });
  assert.equal(e.published().updates[0].minimum, 3);
  e.store.set('pricesMinimumsEnabled', 'false');
  e.ctx.priceRun_('flag', { sanctioned: true });
  assert.equal(e.published().updates.length, 0);
});

test('a deleted published tab comes back under the same gid', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup', { sanctioned: true });
  e.ss.sheets = e.ss.sheets.filter((s) => s.id !== GID);
  e.cache.remove('prices:recreate'); // the 60 s throttle since the tab was first created
  e.ctx.priceRun_('backstop');
  assert.deepEqual(e.sheetsApi.added, [GID, GID]);
  assert.ok(e.published());
  assert.ok(JSON.parse(e.store.get('prices:pending')).items.some((it) => it.system), 'the owner is told');
});

test('a hand edit of the published tab is repaired', () => {
  const e = env({ cells: sourceCells([]) });
  const v = e.ctx.priceRun_('setup', { sanctioned: true }).version;
  e.ss.sheets.find((s) => s.id === GID).cells[0][0] = 'oops';
  assert.equal(e.ctx.pricesNeedRun_(), true);
  e.ctx.priceRun_('backstop');
  assert.equal(e.published().version, v);
});

test('a mixed-up layout is not published, and restoreStructure repairs it', () => {
  const e = env({ cells: sourceCells([['udec2026', 'דצמבר', '2026-12-01', '2026-12-31', '850', '1050', '', '', '']]) });
  const v = e.ctx.priceRun_('setup', { sanctioned: true }).version;
  e.source.cells.push(['perNight', 'עותק', 999]);
  const broken = e.ctx.priceRun_('handler');
  assert.equal(broken.valid, false);
  assert.equal(e.published().version, v);
  e.source.cells.pop();
  e.source.cells.splice(3, 0, ['udec9999', 'לא במקום', '2027-02-01', '2027-02-02', '900', '', '', '', '']);
  assert.equal(e.ctx.priceRun_('handler').valid, false, 'an update above the header');
  const fixed = e.ctx.priceRun_('restore', { sanctioned: true });
  assert.equal(fixed.valid, true, JSON.stringify(fixed));
  assert.equal(e.published().updates.length, 2, 'both updates kept, by id');
});

test('the source tab renamed: recorded once, nothing published; Sheets down: no email', () => {
  const e = env({ cells: sourceCells([]) });
  const v = e.ctx.priceRun_('setup', { sanctioned: true }).version;
  e.source.name = 'מחירים ישן';
  assert.equal(e.ctx.priceRun_('handler').error, 'source_missing');
  e.ctx.priceRun_('handler');
  assert.equal(JSON.parse(e.store.get('prices:pending')).items.length, 1);
  assert.equal(e.store.get('prices:version'), v);
  const f = env({ cells: sourceCells([]) });
  f.ctx.priceRun_('setup', { sanctioned: true });
  f.ss.broken = true;
  assert.equal(f.ctx.priceRun_('handler').error, 'unreadable');
  assert.equal(f.store.has('prices:pending'), false);
});

/** A signed applyPriceChanges, as the operator sends it. */
function apply(e, changes, { requestId = 'req-' + Math.random().toString(36).slice(2, 12), dryRun = false } = {}) {
  const t = Date.now();
  const sig = e.ctx.sign_('applyPrices:' + t + ':' + requestId + ':' + (dryRun ? 1 : 0) + ':' + JSON.stringify(changes));
  return e.ctx.pricesSignedAction_({ action: 'applyPriceChanges', t, changes, requestId, dryRun, sig });
}

test('a hand edit not processed yet is still recorded when an operator write runs first', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells[2][2] = 1111;
  assert.equal(apply(e, { upserts: [DEC] }).valid, true);
  assert.ok(JSON.parse(e.store.get('prices:pending')).items[0].lines.some((l) => l.includes('מחיר בסיס ה׳–ש׳')));
});

test('a sort that moves a base row below the header: nothing overwritten, and restore repairs it', () => {
  const e = env({ cells: sourceCells([['udec2026', 'דצמבר', '2026-12-01', '2026-12-31', '850', '1050', '', '', '']]) });
  const v = e.ctx.priceRun_('setup').version;
  const [perNight] = e.source.cells.splice(1, 1);
  e.source.cells.push(perNight);
  e.source.cells.push(['id', 'שם', '', '', '', '', '', '', '']);
  const res = e.ctx.priceRun_('handler');
  assert.equal(res.valid, false);
  assert.ok(e.source.cells.some((r) => r[0] === 'perNight'), 'the key is still a key');
  assert.equal(e.source.cells.filter((r) => r[0] === 'id').length, 2, 'the second header is untouched');
  assert.equal(e.published().version, v);
  e.source.cells.pop();
  const fixed = e.ctx.priceRun_('restore');
  assert.equal(fixed.valid, true, JSON.stringify(fixed));
  assert.equal(e.published().base.perNight, 850);
});

test('dozens of hand edits never push a property past 9 KB, and publishing goes on', () => {
  const e = env({ cells: sourceCells([['udec2026', 'דצמבר', '2026-12-01', '2026-12-31', '850', '1050', '', '', '']]) });
  e.ctx.priceRun_('setup');
  for (let i = 0; i < 60; i++) {
    e.source.cells[22][1] = 'דצמבר '.repeat(9) + i;
    e.source.cells[22][4] = String(800 + i);
    assert.equal(e.ctx.priceRun_('handler').valid, true, `edit ${i}`);
  }
  assert.equal(e.published().updates[0].weekday, 859);
  const notice = JSON.parse(e.store.get('prices:notice'));
  assert.ok(notice.older > 0, 'older edits are counted, not kept');
  e.source.cells[22][2] = 'x'.repeat(20000);
  assert.equal(e.ctx.priceRun_('handler').valid, false, 'a huge invalid cell is recorded and refused, without throwing');
});

test('a write that finds its rows moved leaves no intent behind to hide the next hand edit', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  const original = e.ctx.writePlan_;
  e.ctx.writePlan_ = () => false;
  assert.throws(() => apply(e, { upserts: [DEC] }), /moved; retry/, 'thrown, so consoleOnce_ lets a retry run');
  e.ctx.writePlan_ = original;
  assert.equal(e.store.has('prices:writeIntent'), false);
  e.source.cells[1][2] = 900;
  e.ctx.priceRun_('handler');
  assert.ok(e.store.has('prices:pending'));
});

test('a hand edit landing during an operator write is recorded, not absorbed', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  const batch = e.ctx.Sheets.Spreadsheets.Values.batchUpdate;
  e.ctx.Sheets.Spreadsheets.Values.batchUpdate = (req, id) => {
    batch(req, id);
    e.source.cells[5][2] = 1999; // someone types in bride_day at the same moment
  };
  assert.equal(apply(e, { upserts: [DEC] }).valid, true);
  assert.ok(JSON.parse(e.store.get('prices:pending')).items.some((it) => it.lines.some((l) => l.includes('יום כלה'))));
});

test('the change handler never creates a missing published tab itself; the section does, and tells the owner', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.ss.sheets = e.ss.sheets.filter((s) => s.id !== GID);
  e.cache.remove('prices:recreate');
  assert.equal(e.ctx.pricesNeedRun_(), true);
  assert.equal(e.ss.sheets.some((s) => s.id === GID), false, 'the check only looks');
  e.store.delete('prices:lastRun');
  e.ctx.onPricesSheetChange({});
  assert.equal(e.ss.sheets.some((s) => s.id === GID), true);
  assert.ok(JSON.parse(e.store.get('prices:pending')).items.some((it) => it.system));
});

test('base changes: unknown keys and a full base area are refused, never dropped', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  assert.equal(apply(e, { base: { perNigth: 900 } }).error, 'unknown_key');
  for (let r = 9; r < 20; r++) e.source.cells[r] = ['note', 'x', ''];
  e.source.cells[4] = ['note', 'x', ''];
  e.ctx.priceRun_('handler');
  assert.equal(apply(e, { base: { thirdGuestPercent: 40 } }).error, 'no_room');
});

test('a busy section puts the minimums flag back', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  const t = Date.now();
  e.lockState.busy = true;
  const res = e.ctx.pricesSignedAction_({ action: 'setPricesFlag', t, value: true, sig: e.ctx.sign_('pricesFlag:' + t + ':1') });
  assert.equal(res.error, 'busy');
  assert.equal(res.minimumsEnabled, false);
  assert.equal(e.store.has('pricesMinimumsEnabled'), false);
});

test('edits that net to nothing send no email', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells[1][2] = 900;
  e.ctx.priceRun_('handler');
  e.source.cells[1][2] = 850;
  e.ctx.priceRun_('handler');
  const pending = JSON.parse(e.store.get('prices:pending'));
  pending.lastAt = 0;
  e.store.set('prices:pending', JSON.stringify(pending));
  e.ctx.pricesEmailDue_();
  assert.equal(e.mails.length, 0);
});

test('the section refuses to run nested', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRunActive_ = true;
  vm.runInContext('priceRunActive_ = true', e.ctx);
  assert.throws(() => e.ctx.priceRun_('backstop'), /already running/);
});

test('chunked copies over 9 KB read back intact; a broken manifest is ignored', () => {
  const e = env();
  const text = JSON.stringify({ blob: crypto.randomBytes(20000).toString('hex') });
  e.ctx.chunkedEntries_(e.props, 'big', text);
  assert.ok(Number(e.store.get('big:n')) > 1);
  assert.equal(e.ctx.chunkedRead_(e.props, 'big'), text);
  e.ctx.chunkedEntries_(e.props, 'big', '{"small":1}');
  assert.equal(e.store.has('big:1'), false, 'leftover chunks deleted');
  e.store.set('big:h', 'deadbeef');
  assert.equal(e.ctx.chunkedRead_(e.props, 'big'), null);
});

test('signed actions cover their arguments', () => {
  const e = env({ cells: sourceCells([]) });
  const t = Date.now();
  const sig = e.ctx.sign_('pricesFlag:' + t + ':1');
  assert.equal(e.ctx.pricesSignedAction_({ action: 'setPricesFlag', t, value: false, sig }), null, 'a signature for "on" is refused for "off"');
  assert.equal(e.ctx.pricesSignedAction_({ action: 'setPricesFlag', t, value: true, sig }).minimumsEnabled, true);
  const changes = { upserts: [DEC] };
  const applySig = e.ctx.sign_('applyPrices:' + t + ':req-12345678:0:' + JSON.stringify(changes));
  assert.equal(e.ctx.pricesSignedAction_({ action: 'applyPriceChanges', t, changes: { upserts: [NYE] }, requestId: 'req-12345678', sig: applySig }), null, 'other changes');
  assert.equal(e.ctx.pricesSignedAction_({ action: 'publishPrices', t: t - 600000, sanctioned: false, sig: e.ctx.sign_('publishPrices:' + (t - 600000) + ':0') }), null, 'stale');
});

test('test overrides accept a price list or an old flat file', () => {
  const e = env({ testHooks: true });
  const flat = e.ctx.testSetPrices_({ version: 'sheet-1', prices: { perNight: 900, weekendPerNight: 1100, thirdGuestPerNight: 175, bride_day: 1900, bride_night_day: 2700, wedding_night: 1250, bride_day_wedding_night: 2800 } });
  assert.equal(flat.ok, true);
  assert.equal(e.ctx.currentPrices_('').prices.base.perNight, 900);
  const list = e.ctx.buildPriceList({ perNight: 1000, weekendPerNight: 1200, thirdGuestPercent: 35, bride_day: 1900, bride_night_day: 2700, wedding_night: 1250 }, [DEC], TODAY, false);
  assert.equal(e.ctx.testSetPrices_(list).version, list.version);
});

test('restore keeps a row typed while the layout was broken, the last copy of a duplicate key, and notes', () => {
  const e = env({ cells: sourceCells([['udec2026', 'דצמבר', '2026-12-01', '2026-12-31', '850', '1050', '', '', '']]) });
  e.ctx.priceRun_('setup');
  e.source.cells.push(['perNight', 'עותק שנערך', 900]); // breaks the layout: a key below the header
  e.source.cells.push(['', 'פסח', '2027-04-20', '2027-04-27', '1300', '1500', '', '', '']); // typed meanwhile, no id
  e.source.cells[12] = ['הערה של שרי', 'לבדוק מחירי קיץ', ''];
  assert.equal(e.ctx.priceRun_('handler').valid, false);
  const before = JSON.stringify(e.source.cells);
  const dry = e.ctx.priceRun_('restore', { dryRun: true });
  assert.equal(JSON.stringify(e.source.cells), before, 'a dry run writes nothing');
  assert.deepEqual([...dry.summary.duplicateKeys], ['perNight']);
  assert.equal(dry.summary.updates, 2);
  assert.equal(dry.summary.newIds, 1);
  assert.equal(dry.summary.notes, 1);
  assert.equal(dry.summary.dropped.length, 1, 'the earlier perNight copy, listed');
  const res = e.ctx.priceRun_('restore');
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.equal(e.published().base.perNight, 900, 'the last copy, as the email described');
  assert.ok(e.published().updates.some((u) => u.name === 'פסח'), 'the row typed meanwhile is kept');
  assert.ok(e.source.cells.some((r) => r[0] === 'הערה של שרי'), 'the note stays');
});

test('restore refuses a tab with columns beyond I, and recreates a deleted source tab from the snapshot', () => {
  const e = env({ cells: sourceCells([['udec2026', 'דצמבר', '2026-12-01', '2026-12-31', '850', '1050', '', '', '']]) });
  const v = e.ctx.priceRun_('setup').version;
  e.source.cells[3][10] = 'טור נוסף';
  assert.equal(e.ctx.priceRun_('restore').error, 'extra_columns');
  e.source.cells[3][10] = '';
  e.ss.sheets = e.ss.sheets.filter((s) => s !== e.source);
  assert.equal(e.ctx.priceRun_('handler').error, 'source_missing');
  const res = e.ctx.priceRun_('restore');
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.equal(res.version, v, 'the same prices, rebuilt');
  assert.ok(e.ss.getSheetByName('מחירים'));
});

test("operator changes don't reach the owner's email as hand edits", () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  assert.equal(apply(e, { upserts: [DEC], base: { perNight: 1050, weekendPerNight: 1200 } }).valid, true);
  e.source.cells[5][2] = 1999;
  e.ctx.priceRun_('handler');
  const pending = JSON.parse(e.store.get('prices:pending'));
  pending.lastAt = 0;
  e.store.set('prices:pending', JSON.stringify(pending));
  e.ctx.pricesEmailDue_();
  assert.equal(e.mails.length, 1);
  assert.match(e.mails[0].body, /יום כלה: 1850 ← 1999/);
  assert.doesNotMatch(e.mails[0].body, /מחיר בסיס|דצמבר/);
});

test('base values must be whole numbers, never text', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  assert.equal(apply(e, { base: { perNight: '1,050' } }).error, 'base_not_number');
  assert.equal(typeof e.source.cells[1][2], 'number');
});

test('while the source is invalid, a deleted published tab comes back with the last valid list', () => {
  const e = env({ cells: sourceCells([]) });
  const v = e.ctx.priceRun_('setup').version;
  e.source.cells[1][2] = 'לא מספר';
  e.ss.sheets = e.ss.sheets.filter((s) => s.id !== GID);
  e.cache.remove('prices:recreate');
  const res = e.ctx.priceRun_('backstop');
  assert.equal(res.valid, false);
  assert.equal(e.published().version, v);
});

test('setup keeps a percentage typed as 35%', () => {
  const e = env({ cells: sourceCells([]) });
  e.source.cells[4][2] = 0.35;
  e.source.formats['5:3'] = '0%';
  e.ctx.pricesSetup_();
  assert.equal(e.source.cells[4][2], 35);
  assert.equal(e.published().base.thirdGuestPercent, 35);
  assert.equal(e.triggers.length, 2, 'the change and hourly triggers');
});

test('a new day republishes; `since` marks the publish, not every run', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  const since = JSON.parse(e.store.get('prices:status')).since;
  assert.equal(e.ctx.pricesNeedRun_(), false);
  e.store.set('prices:publishedDay', '2026-11-16');
  assert.equal(e.ctx.pricesNeedRun_(), true);
  e.ctx.priceRun_('backstop');
  assert.equal(JSON.parse(e.store.get('prices:status')).since, since);
});

test('the request checks: minimum, changed price, a page with no price, and the owner note', () => {
  const e = env({ cells: sourceCells([]) });
  const on = e.ctx.buildPriceList({ perNight: 1050, weekendPerNight: 1200, thirdGuestPercent: 35, bride_day: 1850, bride_night_day: 2650, wedding_night: 1150 }, [{ id: 'uhol0001', name: 'חג', from: '2027-04-21', to: '2027-04-21', minimum: 2 }], TODAY, true);
  const priced = { version: on.version, prices: on };
  const req = (start, nights, estimate) => ({ stayType: 'couple', start, nights, adults: 2, estimate });
  const short = req('2027-04-21', 1, 1050);
  const plain = (o) => JSON.parse(JSON.stringify(o));
  assert.deepEqual(plain(e.ctx.requestPriceCheck_({ pricingV2: true }, short, priced).response), { ok: false, error: 'price_changed', price: 1050, minimum: 2, version: on.version });
  assert.deepEqual(plain(e.ctx.requestPriceCheck_({}, short, priced).response.fields), { checkOut: 'minimum' });
  const fine = req('2027-04-19', 1, 1050);
  assert.equal(e.ctx.requestPriceCheck_({ pricingV2: true, shownPrice: 1050 }, fine, priced).response, undefined);
  assert.equal(e.ctx.requestPriceCheck_({ pricingV2: true, shownPrice: 900 }, fine, priced).response.error, 'price_changed');
  assert.equal(e.ctx.requestPriceCheck_({ pricingV2: true, shownPrice: null }, fine, priced).response, undefined, 'a page that showed no price');
  assert.match(e.ctx.requestPriceCheck_({ pricesVersion: 'sheet-850-1050' }, fine, priced).note, /המחירון השתנה/);
  assert.equal(e.ctx.requestPriceCheck_({ pricesVersion: on.version }, fine, priced).note, '');
  assert.equal(e.ctx.requestPriceCheck_({}, fine, { version: 'none', prices: null }).note, '');
});

test('turning minimums off holds even while the source is invalid; turning them on then reverts', () => {
  const e = env({ cells: sourceCells([['uhol0001', 'חג', '2027-04-21', '2027-04-22', '', '', '3', '', '']]) });
  e.store.set('pricesMinimumsEnabled', 'true');
  e.ctx.priceRun_('setup');
  assert.equal(e.published().updates[0].minimum, 3);
  e.source.cells[1][2] = 'לא מספר';
  const t = Date.now();
  const off = e.ctx.pricesSignedAction_({ action: 'setPricesFlag', t, value: false, sig: e.ctx.sign_('pricesFlag:' + t + ':0') });
  assert.equal(off.minimumsEnabled, false);
  assert.equal(e.published().updates.length, 0, 'the published tab lost its minimum');
  assert.equal(e.ctx.currentPrices_('').prices.updates.length, 0, 'and so did the copy the web app prices from');
  const on = e.ctx.pricesSignedAction_({ action: 'setPricesFlag', t, value: true, sig: e.ctx.sign_('pricesFlag:' + t + ':1') });
  assert.equal(on.minimumsEnabled, false, 'not republished, so put back');
  assert.equal(e.store.get('pricesMinimumsEnabled'), 'false');
});

test('restore keeps comments beside the prices and lists an earlier duplicate as dropped', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells[0][3] = 'הערות';
  e.source.cells[1][3] = 'הועלה בנובמבר';
  e.source.cells.push(['perNight', 'עותק', 900]);
  const dry = e.ctx.priceRun_('restore', { dryRun: true });
  assert.ok(dry.summary.dropped.some((d) => d.includes('perNight') && d.includes('הועלה בנובמבר')), JSON.stringify(dry.summary));
  e.source.cells[1][3] = '';
  e.source.cells[e.source.cells.length - 1][3] = 'המחיר החדש';
  e.ctx.priceRun_('restore');
  assert.equal(e.source.cells[0][3], 'הערות');
  assert.ok(e.source.cells.some((r) => r[0] === 'perNight' && r[3] === 'המחיר החדש'));
});

test('applyPriceChanges gives hand-typed rows their ids, refuses unknown removes, and cleans names', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells.push(['', 'נכתב ידנית', '2027-02-01', '2027-02-02', '900', '', '', '', '']);
  e.ctx.priceRun_('handler');
  e.source.cells.push(['', 'עוד אחד', '2027-03-01', '2027-03-02', '950', '', '', '', '']);
  assert.equal(apply(e, { removes: ['unot00000'] }).error, 'unknown_id');
  const res = apply(e, { upserts: [{ ...DEC, name: '=HYPERLINK("x")' }] });
  assert.equal(res.valid, true, JSON.stringify(res));
  assert.ok(e.source.cells.every((r, i) => i < 22 || !r.some((c) => c !== '') || /^u[0-9a-z]{8}$/.test(r[0]) || r[0] === 'udec2026'), 'every update row has an id');
  assert.equal(e.published().updates.find((u) => u.id === 'udec2026').name, 'HYPERLINK("x")');
});

test('the owner note names the price the guest saw in a known older list', () => {
  const e = env({ cells: sourceCells([]) });
  const old = e.ctx.priceRun_('setup').version;
  assert.equal(apply(e, { base: { perNight: 1050 } }).valid, true);
  const current = e.ctx.currentPrices_('');
  const req = { stayType: 'couple', start: '2027-02-01', nights: 1, adults: 2, estimate: 1050 };
  assert.match(e.ctx.requestPriceCheck_({ pricesVersion: old }, req, current).note, /האורח ראה מחירון קודם \(₪850\)/);
});

test('minimums off while Sheets is down: the copy at once, the published tab by the queued run', () => {
  const e = env({ cells: sourceCells([['uhol0001', 'חג', '2027-04-21', '2027-04-22', '', '', '3', '', '']]) });
  e.store.set('pricesMinimumsEnabled', 'true');
  const before = e.ctx.priceRun_('setup').version;
  e.ss.broken = true;
  const t = Date.now();
  const off = e.ctx.pricesSignedAction_({ action: 'setPricesFlag', t, value: false, sig: e.ctx.sign_('pricesFlag:' + t + ':0') });
  assert.equal(off.retryQueued, true);
  assert.equal(e.ctx.currentPrices_('').prices.updates.length, 0);
  assert.equal(e.ctx.priceListByVersion_(e.store.get('prices:version')).updates.length, 0, 'the stripped list is in the history');
  assert.notEqual(e.store.get('prices:version'), before);
  e.ss.broken = false;
  assert.equal(e.ctx.pricesNeedRun_(), true, 'a publish is pending');
  e.ctx.onPricesBackstop();
  assert.equal(e.published().updates.length, 0, 'the published tab follows');
});

test('restore keeps text typed in column A of an update row', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells.push(['פסח - לבדוק', '', '2027-04-20', '2027-04-27', '1300', '', '', '', '']);
  e.source.cells.push(['טיוטה', 'קיץ', '2027-07-01', '2027-07-31', '1100', '', '', '', '']);
  const dry = e.ctx.priceRun_('restore', { dryRun: true });
  assert.ok(dry.summary.dropped.some((d) => d.includes('טיוטה')), 'listed when the row has a name');
  e.ctx.priceRun_('restore');
  assert.ok(e.published().updates.some((u) => u.name === 'פסח - לבדוק'), 'kept as the name when it has none');
});

test('a failed send keeps the pending edits for the next run', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells[1][2] = 900;
  e.ctx.priceRun_('handler');
  const pending = JSON.parse(e.store.get('prices:pending'));
  pending.lastAt = 0;
  e.store.set('prices:pending', JSON.stringify(pending));
  e.ctx.MailApp.sendEmail = () => { throw new Error('Service invoked too many times: email'); };
  assert.throws(() => e.ctx.pricesEmailDue_());
  assert.ok(e.store.has('prices:pending'));
});

test("the sheet's warnings reach the status and the owner's email", () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells.push(['', 'סילבסטר', '2026-12-31', '2026-12-31', '1250', '', '2', '', '']);
  const res = e.ctx.priceRun_('handler');
  assert.equal(res.valid, true);
  const status = JSON.parse(e.store.get('prices:status'));
  assert.ok(status.warnings.some((w) => w.includes('31.12.2026 הוא יום חמישי') && w.includes('ה׳–ש׳')), JSON.stringify(status.warnings));
  assert.ok(status.warnings.some((w) => w.includes('מינימום הלילות עוד לא פעיל')));
  const pending = JSON.parse(e.store.get('prices:pending'));
  pending.lastAt = 0;
  e.store.set('prices:pending', JSON.stringify(pending));
  e.ctx.pricesEmailDue_();
  assert.match(e.mails[0].body, /שימו לב:[\s\S]*יום חמישי/);
});

test('restore keeps comments as typed, and the dry run prices chosen stays', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells[2][4] = '10%';
  e.ctx.priceRun_('restore');
  assert.equal(e.source.formats['1:4'], '@', 'comments kept as text');
  const t = Date.now();
  const changes = { upserts: [DEC, NYE] };
  const rid = 'req-dry-12345';
  const quotes = [{ start: '2026-12-31', nights: 2, adults: 3 }, { start: 'x', nights: 9 }, { start: '2027-01-04', nights: 1e8 }];
  const sig = e.ctx.sign_('applyPrices:' + t + ':' + rid + ':1:' + JSON.stringify(changes) + ':' + JSON.stringify(quotes));
  assert.equal(e.ctx.pricesSignedAction_({ action: 'applyPriceChanges', t, changes, requestId: rid, dryRun: true, sig, quotes: [] }), null, 'the quotes are signed');
  const dry = e.ctx.pricesSignedAction_({ action: 'applyPriceChanges', t, changes, requestId: rid, dryRun: true, sig, quotes });
  assert.equal(dry.quotes.length, 2, 'a bad date is dropped');
  assert.equal(dry.quotes[1].nights, 14, 'nights are capped');
  assert.equal(dry.quotes[0].price, 2100 + 735);
});

/** A dashboard call, as consoleCall_ hands it to the price operations. */
function consoleOp(e, op, args = {}) {
  return e.ctx.pricesConsoleCall_({ op, args: { requestId: 'req-' + Math.random().toString(36).slice(2, 12), ...args } });
}

test('the dashboard reads the sheet with its token, and saves an update, an edit and a removal', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  let screen = consoleOp(e, 'prices');
  assert.equal(screen.valid, true);
  assert.equal(screen.base.perNight, 850);
  assert.ok(screen.token);
  const added = consoleOp(e, 'addUpdate', { token: screen.token, update: { name: 'סילבסטר', from: '2026-12-31', to: '2026-12-31', weekend: 1250, twoNight: 2100 } });
  assert.equal(added.valid, true, JSON.stringify(added));
  assert.match(added.id, /^u[0-9a-z]{8}$/);
  assert.equal(e.published().updates[0].twoNight, 2100);
  const edited = consoleOp(e, 'editUpdate', { token: added.token, update: { id: added.id, name: 'סילבסטר', from: '2026-12-31', to: '2026-12-31', weekend: 1300, twoNight: 2100 } });
  assert.equal(edited.valid, true);
  assert.equal(e.published().updates[0].weekend, 1300);
  const removed = consoleOp(e, 'removeUpdate', { token: edited.token, id: added.id });
  assert.equal(removed.valid, true);
  assert.equal(e.published().updates.length, 0);
  const base = consoleOp(e, 'saveBase', { token: removed.token, base: { perNight: 1050, weekendPerNight: 1200 } });
  assert.equal(base.valid, true);
  assert.equal(e.published().base.weekendPerNight, 1200);
  assert.equal(e.store.has('prices:pending'), false, 'dashboard saves are not hand edits');
});

test('a save from a screen that is out of date is refused', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  const screen = consoleOp(e, 'prices');
  e.source.cells[1][2] = 900; // a hand edit after the screen loaded
  const res = consoleOp(e, 'saveBase', { token: screen.token, base: { perNight: 1000 } });
  assert.equal(res.error, 'stale');
  assert.equal(e.source.cells[1][2], 900);
});

test('while the sheet is invalid only a fix is saved; other rows still invalid keep it off the site', () => {
  const e = env({ cells: sourceCells([['ubad0001', 'שבור', '2026-12-05', '2026-12-01', '900', '', '', '', ''], ['ubad0002', 'שבור 2', '2027-01-09', '2027-01-02', '900', '', '', '', '']]) });
  e.ctx.priceRun_('setup');
  const v = e.store.get('prices:version');
  let screen = consoleOp(e, 'prices');
  assert.equal(screen.valid, false);
  assert.equal(screen.invalidRows.length, 2);
  const other = consoleOp(e, 'addUpdate', { token: screen.token, update: { name: 'חדש', from: '2027-02-01', to: '2027-02-02', weekday: 900 } });
  assert.equal(other.error, 'fix_first');
  const fix = consoleOp(e, 'editUpdate', { token: screen.token, update: { id: 'ubad0001', name: 'תוקן', from: '2026-12-01', to: '2026-12-05', weekday: 900 } });
  assert.equal(fix.ok, true);
  assert.equal(fix.valid, false, 'saved, but one row is still invalid');
  assert.equal(e.store.get('prices:version'), v, 'nothing reached the site');
  const last = consoleOp(e, 'removeUpdate', { token: fix.token, id: 'ubad0002' });
  assert.equal(last.valid, true);
  assert.equal(e.published().updates[0].name, 'תוקן');
});

test('the notice is cleared by "ראיתי", and restore runs from the dashboard with a dry run first', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells[1][2] = 900;
  e.ctx.priceRun_('handler');
  const shown = consoleOp(e, 'prices').notice;
  assert.ok(shown.items.length);
  assert.equal(consoleOp(e, 'ackPriceEdit', { seenAt: shown.lastAt }).ok, true);
  assert.equal(consoleOp(e, 'prices').notice, null);
  e.source.cells.push(['perNight', '', 950]);
  assert.equal(consoleOp(e, 'prices').structure, 'base_below_header');
  const dry = consoleOp(e, 'restorePrices', { dryRun: true });
  assert.deepEqual([...dry.summary.duplicateKeys], ['perNight']);
  assert.equal(consoleOp(e, 'restorePrices', {}).valid, true);
});

test('a save while the section is busy throws, so the retry runs', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  const screen = consoleOp(e, 'prices');
  e.lockState.busy = true;
  assert.throws(() => consoleOp(e, 'saveBase', { token: screen.token, base: { perNight: 1000 }, requestId: 'req-busy-0001' }), /busy; retry/);
  e.lockState.busy = false;
  assert.equal(consoleOp(e, 'saveBase', { token: screen.token, base: { perNight: 1000 }, requestId: 'req-busy-0001' }).valid, true);
});

test('"ראיתי" clears only what the screen showed; restore runs only on the sheet its dry run saw', () => {
  const e = env({ cells: sourceCells([]) });
  e.ctx.priceRun_('setup');
  e.source.cells[1][2] = 900;
  e.ctx.priceRun_('handler');
  const seen = consoleOp(e, 'prices').notice.lastAt;
  const notice = JSON.parse(e.store.get('prices:notice'));
  notice.items.push({ key: 'later', at: new Date(seen + 60000).toISOString(), lines: ['אחר כך'] });
  notice.lastAt = seen + 60000;
  e.store.set('prices:notice', JSON.stringify(notice));
  consoleOp(e, 'ackPriceEdit', { seenAt: seen });
  assert.deepEqual(JSON.parse(e.store.get('prices:notice')).items.map((it) => it.key), ['later']);
  e.source.cells.push(['perNight', '', 950]);
  const dry = consoleOp(e, 'restorePrices', { dryRun: true });
  e.source.cells[3][2] = 160; // changed after the dry run
  assert.equal(consoleOp(e, 'restorePrices', { token: dry.token }).error, 'stale');
});

test('a pasted row with a copied id is reported with the code the screen uses to offer no buttons', () => {
  const e = env({ cells: sourceCells([['udec2026', 'דצמבר', '2026-12-01', '2026-12-31', '850', '1050', '', '', '']]) });
  e.ctx.priceRun_('setup');
  e.source.cells.push(['udec2026', 'ינואר', '2027-01-05', '2027-01-10', '900', '', '', '', '']);
  const screen = consoleOp(e, 'prices');
  const row = screen.invalidRows.find((r) => r.cells[1] === 'ינואר');
  assert.equal(row.code, 'id');
  assert.ok(screen.updates.some((u) => u.id === 'udec2026' && u.name === 'דצמבר'), 'the original stays a normal card');
});
