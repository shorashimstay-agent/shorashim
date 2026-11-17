/**
 * The booking rules, defined once for everything that needs them: the website form, the Apps
 * Script web app and the Node tests. Pure functions only. Dates are 'YYYY-MM-DD' strings in Israel
 * local time; timed events use local 'YYYY-MM-DDTHH:mm' strings. A "night" is named by the date it
 * starts.
 *
 * The site imports this as an ES module. Apps Script has no modules, so deploy.py strips the
 * `export ` keyword on upload and every declaration below becomes a global there — which is why
 * they are `var` and plain function declarations rather than `const` and arrow functions.
 *
 * @typedef {'couple' | 'wedding_night' | 'bride_day' | 'bride_night_day' | 'bride_day_wedding_night'} StayType
 * @typedef {{ allDay: boolean, start: string, end: string }} CalendarEvent
 * @typedef {{ id: string, name: string, from: string, to: string, weekday?: number, weekend?: number, minimum?: number, twoNight?: number }} PriceUpdate
 * @typedef {{ version: string, base: Record<string, number>, updates: PriceUpdate[] }} PriceList
 */

export var CHECK_IN_MINUTES = 15 * 60;
export var CHECK_OUT_MINUTES = 11 * 60;
export var MAX_NIGHTS = 14;
export var HORIZON_DAYS = 365;
export var HOLD_HOURS = 24;
export var MAX_ADULTS = 3;
// Bride-day packages: people present during the day, including the bride, her companions and the
// professionals. Optional on the server (requests from before it existed carry none).
export var MAX_DAY_PARTICIPANTS = 5;
export var DAY_PARTICIPANT_TYPES = ['bride_day', 'bride_night_day', 'bride_day_wedding_night'];
export var NOTES_MAX = 450;

// Wedding-type stays are keyed by the wedding date. What each one occupies, and so what it clashes
// with, is its span of time (staySpan), not a list of nights.
export var STAY_TYPES = {
  couple: { label: 'אירוח זוגי בוטיק', wedding: false },
  wedding_night: { label: 'ליל כלולות זוגי', wedding: false },
  bride_day: { label: 'יום כלה (התארגנות ביום החתונה)', wedding: true },
  bride_night_day: { label: 'לילה לפני + יום כלה', wedding: true },
  bride_day_wedding_night: { label: 'יום התארגנות + ליל כלולות', wedding: true },
};
export var WEDDING_NIGHT_CHECK_OUT = '13:00';
// The bride packages' hours, as the owner set them on 18.10.2026 (ClickUp z8r3fdvdp6):
// - preparation starts at PREP_START in every season; on a Friday it may start at PREP_FRIDAY_START,
//   by arrangement (nothing chooses that automatically);
// - a preparation day is kept free until PREP_END (the bride leaves between 15:30 and 16:00);
// - the night before + preparation package checks in at NIGHT_BEFORE_CHECK_IN the day before, so
//   another bride's preparation that day can end first.
export var PREP_START = '08:00';
export var PREP_FRIDAY_START = '06:00';
export var PREP_END = '16:00';
export var NIGHT_BEFORE_CHECK_IN = '17:30';

// Prices are not in the code. They live in the owner's prices spreadsheet (one row per key, see
// pricesFromRows), which the site reads as a public CSV and the web app reads directly, so a price
// change needs no build and no deploy. Without prices there is no estimate (null): the page and the
// request say the price will be set personally.
export var PRICE_KEYS = ['perNight', 'weekendPerNight', 'thirdGuestPerNight', 'bride_day', 'bride_night_day', 'wedding_night', 'bride_day_wedding_night'];
// Prices that may be missing (files from before they existed), and the price they fall back to.
export var PRICE_DEFAULTS = { weekendPerNight: 'perNight' };
// Prices that may be missing with no fallback: the package they price then has no estimate, and
// every other price still holds. A new package's row can reach the sheet after the code does.
// thirdGuestPerNight is no longer used (the third guest is a percentage since 17.11.2026); its row
// stays in the sheet only for older readers of A1:C20 and is cleared in step 4 of the plan.
export var OPTIONAL_PRICE_KEYS = ['bride_day_wedding_night', 'thirdGuestPerNight'];
export var PRICE_MIN = 100;
export var PRICE_MAX = 20000;

/**
 * Checks a prices file: { version, prices: { perNight, ... } }, every price a whole number of
 * shekels between PRICE_MIN and PRICE_MAX. Unknown keys are ignored; a missing key takes the price
 * PRICE_DEFAULTS names, or is left out when OPTIONAL_PRICE_KEYS lists it.
 * @param {unknown} file
 * @returns {{ ok: true, version: string, prices: Record<string, number> } | { ok: false, error: string }}
 */
export function checkPrices(file) {
  if (!file || typeof file !== 'object') return { ok: false, error: 'not an object' };
  var version = file.version;
  if (typeof version !== 'string' || !/^[\w.@:-]{1,64}$/.test(version)) return { ok: false, error: 'bad version' };
  var source = file.prices;
  if (!source || typeof source !== 'object') return { ok: false, error: 'no prices' };
  var prices = {};
  for (var i = 0; i < PRICE_KEYS.length; i++) {
    var key = PRICE_KEYS[i];
    var value = source[key];
    if (value === undefined && PRICE_DEFAULTS[key]) value = source[PRICE_DEFAULTS[key]];
    if (value === undefined && OPTIONAL_PRICE_KEYS.indexOf(key) >= 0) continue;
    if (typeof value !== 'number' || Math.floor(value) !== value || value < PRICE_MIN || value > PRICE_MAX) {
      return { ok: false, error: 'bad price ' + key };
    }
    prices[key] = value;
  }
  return { ok: true, version: version, prices: prices };
}

/**
 * A version that names the prices themselves, so the site and the web app agree on it without
 * sharing any state: the same prices always get the same version.
 * @param {Record<string, number>} prices
 * @returns {string}
 */
export function pricesVersionOf(prices) {
  return 'sheet-' + PRICE_KEYS.map(function (key) {
    return prices[key] === undefined ? '' : prices[key];
  }).join('-');
}

/**
 * The prices file for the rows of the prices spreadsheet: [key, label, price] per row, in any order.
 * Prices typed as text ("1,050 ₪") are read as numbers; checkPrices still judges the result.
 * @param {unknown[][]} rows
 * @returns {{ ok: true, version: string, prices: Record<string, number> } | { ok: false, error: string }}
 */
export function pricesFromRows(rows) {
  var prices = {};
  (rows || []).forEach(function (row) {
    var key = String((row && row[0]) || '').trim();
    if (PRICE_KEYS.indexOf(key) === -1) return;
    var raw = row[2];
    prices[key] = typeof raw === 'number' ? raw : raw === '' || raw == null ? undefined : Number(String(raw).replace(/[^\d.]/g, ''));
  });
  var checked = checkPrices({ version: 'sheet', prices: prices });
  return checked.ok ? { ok: true, version: pricesVersionOf(checked.prices), prices: checked.prices } : checked;
}

// ---------------------------------------------------------------------------
// Price lists (docs/private/pricing-dashboard-plan.md). The owner's prices tab holds a base area
// (key / label / value rows, as above, plus thirdGuestPercent) and, under a header row whose first
// cell is "id", a table of dated updates. The web app validates it and publishes the result as a
// price list, { version, base, updates }, which the site, the web app and the console all price
// from with quoteStay.

export var THIRD_GUEST_PERCENT_DEFAULT = 35;
export var MINIMUM_NIGHTS_MAX = MAX_NIGHTS;
// An update that ended more than this many days ago is left out of the published list.
export var UPDATE_KEEP_DAYS = 30;
export var PUBLISHED_MAX_CHARS = 45000;
export var UPDATE_NAME_MAX = 60;
export var UPDATE_ID_RE = /^u[a-z0-9]{6,12}$/;
// The updates table's columns, A to I.
export var UPDATE_COLUMNS = ['id', 'name', 'from', 'to', 'weekday', 'weekend', 'minimum', 'twoNight', 'updated'];
export var UPDATE_HEADER = ['id', 'שם', 'מ־', 'עד (כולל)', 'א׳–ד׳', 'ה׳–ש׳', 'מינימום לילות', 'מחיר לשני לילות', 'עודכן'];
// The base area must stay in rows 1–20: older readers of the sheet read A1:C20.
export var BASE_AREA_ROWS = 20;
var UPDATE_FIELDS = ['weekday', 'weekend', 'minimum', 'twoNight'];

/** 32-bit FNV-1a of a string, as 8 hex digits. */
export function fnv1a(text) {
  var hash = 0x811c9dc5;
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return ('0000000' + hash.toString(16)).slice(-8);
}

/**
 * A date typed in the sheet: ISO (2026-12-31) or Israeli day-first order (31/12/2026, 31.12.2026,
 * with or without leading zeros). Month-first is never assumed. Anything else, a date that does not
 * exist, or a non-string (a date cell's serial number) gives ''.
 * @param {unknown} value @returns {string}
 */
export function parseSheetDate(value) {
  if (typeof value !== 'string') return '';
  var text = value.trim();
  if (DATE_RE.test(text)) return isNaN(toDayNumber(text)) ? '' : text;
  var m = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/.exec(text);
  if (!m) return '';
  var iso = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return isNaN(toDayNumber(iso)) ? '' : iso;
}

/**
 * A whole number typed in the sheet: "1,250", "₪1,250", "₪1,050.00" and 1250 are 1250. Empty gives
 * null; anything else (a fraction, text) gives NaN.
 * @param {unknown} value @returns {number | null}
 */
export function parseSheetInt(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Math.floor(value) === value ? value : NaN;
  var text = String(value).replace(/[₪\s,]/g, '').replace(/\.0+$/, '');
  if (text === '') return null;
  return /^\d+$/.test(text) ? Number(text) : NaN;
}

function cellText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

/** An update's name: trimmed, without a leading = + - @ that a spreadsheet could read as a formula. */
export function cleanName(value) {
  return cellText(value).replace(/^[=+\-@\s]+/, '');
}

/** A price is a whole number of shekels in [PRICE_MIN, max]. */
function isPrice(n, max) {
  return typeof n === 'number' && Math.floor(n) === n && n >= PRICE_MIN && n <= (max || PRICE_MAX);
}

/**
 * Checks the base prices: the flat key → price map (checkPrices) plus thirdGuestPercent, a whole
 * number 0–100 (THIRD_GUEST_PERCENT_DEFAULT when missing).
 * @returns {{ ok: true, base: Record<string, number> } | { ok: false, error: string }}
 */
export function checkBase(source) {
  if (!source || typeof source !== 'object') return { ok: false, error: 'no prices' };
  var checked = checkPrices({ version: 'base', prices: source });
  if (!checked.ok) return checked;
  var base = checked.prices;
  var percent = source.thirdGuestPercent === undefined || source.thirdGuestPercent === null ? THIRD_GUEST_PERCENT_DEFAULT : source.thirdGuestPercent;
  if (typeof percent !== 'number' || Math.floor(percent) !== percent || percent < 0 || percent > 100) return { ok: false, error: 'bad percent' };
  base.thirdGuestPercent = percent;
  return { ok: true, base: base };
}

/**
 * Why an update can't stand, or '' when it can. `u` has id, name, from, to (ISO) and optional
 * weekday, weekend, minimum and twoNight. opts: today (ISO), forSave (a dashboard save: the name is
 * required and the update must not have ended), minimumsEnabled (off: a minimum is refused on save;
 * on read it is ignored, see readPriceSource).
 * @returns {string}
 */
export function updateProblem(u, opts) {
  opts = opts || {};
  if (opts.forSave && !cellText(u.name)) return 'name';
  if (cellText(u.name).length > UPDATE_NAME_MAX) return 'name_long';
  if (!u.from || isNaN(toDayNumber(u.from))) return 'from';
  if (!u.to || isNaN(toDayNumber(u.to))) return 'to';
  if (u.from > u.to) return 'order';
  var has = false;
  for (var i = 0; i < UPDATE_FIELDS.length; i++) if (u[UPDATE_FIELDS[i]] !== undefined && u[UPDATE_FIELDS[i]] !== null) has = true;
  if (!has) return 'empty';
  if (u.weekday != null && !isPrice(u.weekday)) return 'weekday';
  if (u.weekend != null && !isPrice(u.weekend)) return 'weekend';
  if (u.minimum != null) {
    if (typeof u.minimum !== 'number' || Math.floor(u.minimum) !== u.minimum || u.minimum < 1 || u.minimum > MINIMUM_NIGHTS_MAX) return 'minimum';
    if (opts.forSave && !opts.minimumsEnabled) return 'minimum_off';
  }
  if (u.twoNight != null) {
    if (!isPrice(u.twoNight, 2 * PRICE_MAX)) return 'twoNight';
    if (u.from !== u.to) return 'twoNight_range';
    if (u.minimum != null && u.minimum > 2 && (opts.minimumsEnabled || opts.forSave)) return 'twoNight_minimum';
  }
  if (opts.today && toDayNumber(u.from) > toDayNumber(opts.today) + HORIZON_DAYS) return 'too_far';
  if (opts.forSave && opts.today && u.to < opts.today) return 'past';
  return '';
}

/**
 * Pairs of updates that contradict each other: two single-date updates on the same date (whatever
 * they set), or two ranges that overlap without one containing the other (or of equal length) when
 * both set the same field. A range nested inside a longer one is fine: the shorter one wins (priceForNight).
 * @param {object[]} updates @returns {{ a: string, b: string, field: string }[]}
 */
export function updateConflicts(updates) {
  var out = [];
  for (var i = 0; i < updates.length; i++) {
    for (var j = i + 1; j < updates.length; j++) {
      var a = updates[i];
      var b = updates[j];
      if (a.from > b.to || b.from > a.to) continue;
      var singleA = a.from === a.to;
      var singleB = b.from === b.to;
      if (singleA !== singleB) continue;
      // Two single-date rows for one date always conflict, whatever fields they set: one date, one row.
      if (singleA) {
        out.push({ a: a.id, b: b.id, field: 'date' });
        continue;
      }
      if (!singleA) {
        var lenA = daysBetween(a.from, a.to);
        var lenB = daysBetween(b.from, b.to);
        var aInB = a.from >= b.from && a.to <= b.to;
        var bInA = b.from >= a.from && b.to <= a.to;
        if ((aInB || bInA) && lenA !== lenB) continue;
      }
      for (var f = 0; f < UPDATE_FIELDS.length; f++) {
        var key = UPDATE_FIELDS[f];
        if (a[key] != null && b[key] != null) {
          out.push({ a: a.id, b: b.id, field: key });
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Reads the prices tab. `rows` are its cells, top to bottom, A to I: strings as displayed, numbers
 * for the base area's values, dates already turned into ISO strings by the caller. opts: today,
 * minimumsEnabled, hasBaseline (before the first publish a missing header is an empty updates table).
 *
 * Returns the base prices, the updates, and what is wrong: `structure` ('' or why the layout is
 * broken), `baseError`, per-row `rowErrors` ({ row, id, reason }), `conflicts`, and `warnings`. The
 * source is publishable only when all of those are empty (sourceIsValid). Row numbers are 1-based.
 */
export function readPriceSource(rows, opts) {
  opts = opts || {};
  rows = rows || [];
  var out = { base: null, baseError: '', updates: [], rowErrors: [], conflicts: [], warnings: [], structure: '', headerRow: 0, removedIds: [], blankIds: [], idRows: {} };
  var headers = [];
  for (var r = 0; r < rows.length; r++) if (cellText(rows[r] && rows[r][0]) === 'id') headers.push(r);
  if (headers.length > 1) out.structure = 'two_headers';
  else if (headers.length === 0 && opts.hasBaseline) out.structure = 'no_header';
  var headerIndex = headers.length ? headers[0] : rows.length;
  out.headerRow = headers.length ? headerIndex + 1 : 0;

  var source = {};
  var seen = {};
  var baseKeys = PRICE_KEYS.concat(['thirdGuestPercent']);
  for (r = 0; r < rows.length; r++) {
    var key = cellText(rows[r] && rows[r][0]);
    if (baseKeys.indexOf(key) >= 0) {
      if (r > headerIndex) out.structure = out.structure || 'base_below_header';
      else if (r >= BASE_AREA_ROWS) out.structure = out.structure || 'base_outside_rows';
      if (seen[key]) out.structure = out.structure || 'duplicate_key';
      seen[key] = true;
      var value = rows[r][2];
      var n = typeof value === 'number' ? value : parseSheetInt(value);
      if (n === null) continue;
      if (isNaN(n)) out.baseError = out.baseError || 'bad ' + key;
      else source[key] = n;
    } else if (r < headerIndex && UPDATE_ID_RE.test(key)) {
      out.structure = out.structure || 'update_above_header';
    } else if (r < headerIndex && /^[A-Za-z_]\w*$/.test(key) && cellText(rows[r][2])) {
      out.warnings.push({ row: r + 1, reason: 'unknown_key', key: key });
    }
  }
  if (!out.baseError) {
    var base = checkBase(source);
    if (base.ok) out.base = base.base;
    else out.baseError = base.error;
  }

  var ids = {};
  for (r = headerIndex + 1; r < rows.length; r++) {
    var row = rows[r] || [];
    var id = cellText(row[0]);
    var empty = true;
    for (var c = 1; c <= 7; c++) if (cellText(row[c])) empty = false;
    if (empty) {
      if (id) out.removedIds.push(id);
      continue;
    }
    // Only a row with no id, or a copy of a valid one (a pasted row), may be given a new id. Any
    // other text in column A (a key or header sorted down, a typo) is never overwritten: it's an
    // invalid row the owner sees, or a structure problem.
    if (!id || (UPDATE_ID_RE.test(id) && ids[id])) {
      out.blankIds.push(r + 1);
      out.rowErrors.push({ row: r + 1, id: id, reason: 'id' });
      continue;
    }
    if (!UPDATE_ID_RE.test(id)) {
      out.rowErrors.push({ row: r + 1, id: id, reason: 'id' });
      continue;
    }
    ids[id] = true;
    out.idRows[id] = r + 1;
    var u = { id: id, name: cleanName(row[1]), from: parseSheetDate(row[2]), to: parseSheetDate(row[3]) };
    var bad = '';
    var fields = { weekday: row[4], weekend: row[5], minimum: row[6], twoNight: row[7] };
    for (var f in fields) {
      var v = parseSheetInt(fields[f]);
      if (v !== null && isNaN(v)) bad = bad || f;
      else if (v !== null) u[f] = v;
    }
    var problem = bad || updateProblem(u, { today: opts.today, minimumsEnabled: opts.minimumsEnabled });
    if (problem) {
      out.rowErrors.push({ row: r + 1, id: id, reason: problem });
      continue;
    }
    // Minimums are off until the booking form can show them: one in the sheet is kept aside as
    // inactiveMinimum (the console shows it), never priced, published or counted as a conflict.
    if (u.minimum != null && !opts.minimumsEnabled) {
      out.warnings.push({ row: r + 1, id: id, reason: 'minimum_off' });
      u.inactiveMinimum = u.minimum;
      delete u.minimum;
    }
    if (u.from === u.to) {
      var weekend = isWeekendNight(u.from);
      if ((weekend && u.weekend == null && u.weekday != null) || (!weekend && u.weekday == null && u.weekend != null)) {
        out.warnings.push({ row: r + 1, id: id, reason: 'price_unused' });
      }
    }
    out.updates.push(u);
  }
  out.conflicts = updateConflicts(out.updates);
  // A two-night total can't apply when either of its nights needs more than two nights.
  if (opts.minimumsEnabled && out.base) {
    var probe = { base: out.base, updates: out.updates };
    out.updates.forEach(function (u) {
      if (u.twoNight == null || u.from !== u.to) return;
      if (priceForNight(probe, u.from).minimum > 2 || priceForNight(probe, addDays(u.from, 1)).minimum > 2) {
        out.warnings.push({ row: out.idRows[u.id], id: u.id, reason: 'twoNight_unreachable' });
      }
    });
  }
  return out;
}

/** Whether a read source (readPriceSource) can be published. */
export function sourceIsValid(read) {
  return !!read.base && !read.structure && !read.baseError && !read.rowErrors.length && !read.conflicts.length;
}

/** An update as published: only its set fields, in a fixed order. */
function publishedUpdate(u, minimumsEnabled) {
  var p = { id: u.id, name: cellText(u.name), from: u.from, to: u.to };
  if (u.weekday != null) p.weekday = u.weekday;
  if (u.weekend != null) p.weekend = u.weekend;
  if (u.minimum != null && minimumsEnabled) p.minimum = u.minimum;
  if (u.twoNight != null) p.twoNight = u.twoNight;
  return p;
}

/**
 * The price list to publish: the base and the updates that ended at most UPDATE_KEEP_DAYS ago, with
 * minimums left out while they are off. Its version is a hash of the content, so the same prices
 * always get the same version wherever they are computed.
 * @returns {{ version: string, base: Record<string, number>, updates: object[] }}
 */
export function buildPriceList(base, updates, today, minimumsEnabled) {
  var keys = Object.keys(base).sort();
  var b = {};
  keys.forEach(function (k) {
    b[k] = base[k];
  });
  var cutoff = today ? addDays(today, -UPDATE_KEEP_DAYS) : '';
  var list = (updates || [])
    .filter(function (u) {
      return !cutoff || u.to >= cutoff;
    })
    .map(function (u) {
      return publishedUpdate(u, minimumsEnabled);
    })
    .filter(function (u) {
      return u.weekday != null || u.weekend != null || u.minimum != null || u.twoNight != null;
    })
    .sort(function (x, y) {
      return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
    });
  return { version: 'p-' + fnv1a(JSON.stringify({ base: b, updates: list })), base: b, updates: list };
}

/**
 * Checks a published price list, as the site and the web app read it. Unknown fields are ignored,
 * so a newer web app can add one without failing an older page.
 * @param {unknown} value
 * @returns {{ ok: true, list: PriceList } | { ok: false, error: string }}
 */
export function checkPriceList(value) {
  if (!value || typeof value !== 'object') return { ok: false, error: 'not an object' };
  if (typeof value.version !== 'string' || !/^[\w.@:-]{1,64}$/.test(value.version)) return { ok: false, error: 'bad version' };
  var base = checkBase(value.base);
  if (!base.ok) return base;
  if (!Array.isArray(value.updates)) return { ok: false, error: 'no updates' };
  var updates = [];
  for (var i = 0; i < value.updates.length; i++) {
    var raw = value.updates[i] || {};
    var u = { id: String(raw.id || ''), name: cellText(raw.name), from: String(raw.from || ''), to: String(raw.to || '') };
    for (var f = 0; f < UPDATE_FIELDS.length; f++) if (raw[UPDATE_FIELDS[f]] != null) u[UPDATE_FIELDS[f]] = raw[UPDATE_FIELDS[f]];
    if (updateProblem(u, { minimumsEnabled: true })) return { ok: false, error: 'bad update ' + u.id };
    updates.push(u);
  }
  return { ok: true, list: { version: value.version, base: base.base, updates: updates } };
}

/**
 * A price list from what a caller holds: a price list is returned as is, a flat key → price map
 * (older callers, test fixtures) becomes a list with no updates. Null when there are no prices.
 */
export function asPriceList(prices) {
  if (!prices || typeof prices !== 'object') return null;
  if (prices.base && Array.isArray(prices.updates)) return prices;
  var base = checkBase(prices);
  if (!base.ok) return null;
  return buildPriceList(base.base, [], '', false);
}

/**
 * The price and minimum of one night, by precedence for each field: the single-date update for that
 * night, then every range containing it from the shortest to the longest, then the base. The first
 * that sets the field wins; the base has no minimum, so the default is 1.
 * @returns {{ price: number, minimum: number }}
 */
export function priceForNight(list, date) {
  var weekend = isWeekendNight(date);
  var key = weekend ? 'weekend' : 'weekday';
  var matches = list.updates
    .filter(function (u) {
      return u.from <= date && date <= u.to;
    })
    .sort(function (a, b) {
      return daysBetween(a.from, a.to) - daysBetween(b.from, b.to);
    });
  var price = null;
  var minimum = null;
  for (var i = 0; i < matches.length; i++) {
    if (price === null && matches[i][key] != null) price = matches[i][key];
    if (minimum === null && matches[i].minimum != null) minimum = matches[i].minimum;
  }
  if (price === null) price = weekend ? list.base.weekendPerNight : list.base.perNight;
  return { price: price, minimum: minimum === null ? 1 : minimum };
}

/**
 * A stay's price and minimum. Packages take their flat price (null when the sheet has none) and
 * have no minimum. A couple stay sums its nights; a two-night stay that arrives on a single-date
 * update with a two-night total costs that total instead. A third guest adds thirdGuestPercent of
 * the lodging, rounded to the shekel. Without a start date every night takes the base midweek price.
 * @returns {{ price: number | null, minimum: number }}
 */
export function quoteStay(list, stayType, start, nights, adults) {
  if (stayType !== 'couple') {
    return { price: typeof list.base[stayType] === 'number' ? list.base[stayType] : null, minimum: 1 };
  }
  var total = 0;
  var minimum = 1;
  for (var i = 0; i < nights; i++) {
    if (!start) {
      total += list.base.perNight;
      continue;
    }
    var night = priceForNight(list, addDays(start, i));
    total += night.price;
    if (night.minimum > minimum) minimum = night.minimum;
  }
  if (start && nights === 2) {
    for (var j = 0; j < list.updates.length; j++) {
      var u = list.updates[j];
      if (u.twoNight != null && u.from === start && u.to === start) total = u.twoNight;
    }
  }
  if (adults === 3) total += Math.round((total * list.base.thirdGuestPercent) / 100);
  return { price: total, minimum: minimum };
}

/** The longest minimum among the nights [checkIn, checkOut), 1 when none is set. */
export function stayMinimum(list, checkIn, checkOut) {
  return quoteStay(list, 'couple', checkIn, daysBetween(checkIn, checkOut), 2).minimum;
}

export var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDayNumber(date) {
  var m = DATE_RE.exec(String(date));
  if (!m) return NaN;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return NaN;
  return d.getTime() / 86400000;
}

export function fromDayNumber(n) {
  return new Date(n * 86400000).toISOString().slice(0, 10);
}

/** @param {string} date @param {number} n @returns {string} */
export function addDays(date, n) {
  return fromDayNumber(toDayNumber(date) + n);
}

/** @param {string} a @param {string} b @returns {number} */
export function daysBetween(a, b) {
  return toDayNumber(b) - toDayNumber(a);
}

/**
 * The nights a stay keeps from couple stays, as [start, end) dates: its calendar event. A wedding-type
 * stay keeps the night before and the wedding night (a morning preparation leaves no room for a guest
 * the night before; the night before + prep day sleeps there). How many of them the guest stays and
 * pays for is stayNights.
 * @param {StayType} stayType @param {string} checkIn @param {string} checkOut
 * @returns {{ start: string, end: string }}
 */
export function stayRange(stayType, checkIn, checkOut) {
  if (STAY_TYPES[stayType] && STAY_TYPES[stayType].wedding) {
    return { start: addDays(checkIn, -1), end: addDays(checkIn, 1) };
  }
  return { start: checkIn, end: checkOut };
}

// ---------------------------------------------------------------------------
// Spans: availability in time, not in nights. A span is { start, end } in local 'YYYY-MM-DDTHH:mm',
// end exclusive. Two stays clash exactly when their spans overlap, which gives every rule in the
// owner's list in both booking orders:
// - a couple stay (15:00 to 11:00) or a wedding night (15:00 to 13:00) on the night before a
//   preparation day runs past its 08:00 start, and one on the evening of a preparation day starts
//   before its 16:00 end;
// - a night before + preparation package (17:30 the day before to 16:00) fits right after another
//   bride's preparation day, which ends at 16:00, and a preparation day fits the morning after one;
// - a prep day + wedding night (08:00 to 13:00 the next day) keeps the night before free of guests
//   without counting it as a night, and no other bride can prepare the morning after.
// Owner closings, holds, channel events and anything else without a stay type occupy their nights
// as a couple stay would (15:00 on the first to 11:00 after the last), as before.

/**
 * The span a stay occupies. Wedding-type stays are keyed by checkIn, the wedding date.
 * @param {StayType} stayType @param {string} checkIn @param {string} checkOut
 * @returns {{ start: string, end: string }}
 */
export function staySpan(stayType, checkIn, checkOut) {
  if (stayType === 'bride_day') return { start: checkIn + 'T' + PREP_START, end: checkIn + 'T' + PREP_END };
  if (stayType === 'bride_night_day') return { start: addDays(checkIn, -1) + 'T' + NIGHT_BEFORE_CHECK_IN, end: checkIn + 'T' + PREP_END };
  if (stayType === 'bride_day_wedding_night') return { start: checkIn + 'T' + PREP_START, end: addDays(checkIn, 1) + 'T' + WEDDING_NIGHT_CHECK_OUT };
  if (stayType === 'wedding_night') return { start: checkIn + 'T' + hhmm(CHECK_IN_MINUTES), end: checkOut + 'T' + WEDDING_NIGHT_CHECK_OUT };
  return nightsSpan(checkIn, checkOut);
}

/** The span of the nights [start, end) held as a couple stay: 15:00 on the first, 11:00 after the last. */
export function nightsSpan(start, end) {
  return { start: start + 'T' + hhmm(CHECK_IN_MINUTES), end: end + 'T' + hhmm(CHECK_OUT_MINUTES) };
}

/**
 * The span a stored request (validateRequest's value, as kept on calendar events) occupies; its nights
 * as a couple stay when it carries no usable stay type or date.
 * @param {{ stayType?: string, checkIn?: string, checkOut?: string, start: string, end: string }} req
 */
export function requestSpan(req) {
  var type = req && STAY_TYPES[req.stayType];
  if (type && isRealDate(req.checkIn) && (type.wedding || isRealDate(req.checkOut))) {
    return staySpan(req.stayType, req.checkIn, req.checkOut);
  }
  return nightsSpan(req.start, req.end);
}

/** A span as a timed CalendarEvent, the form blockedNights and spanConflicts read. */
export function spanEvent(span) {
  return { allDay: false, start: span.start, end: span.end };
}

/** @param {CalendarEvent} ev @returns {{ start: string, end: string }} */
function eventSpan(ev) {
  return ev.allDay ? nightsSpan(ev.start, ev.end) : { start: ev.start, end: ev.end };
}

/**
 * The nights a span clashes with events in, for messages ("these dates are taken"). Each night owns
 * 11:00 on its date to 11:00 the next day, so an overlap in the morning is the night before's.
 * @param {CalendarEvent[]} events @param {{ start: string, end: string }} span @returns {string[]}
 */
export function spanConflicts(events, span) {
  var s = toMinutes(span.start);
  var e = toMinutes(span.end);
  var set = {};
  events.forEach(function (ev) {
    var o = eventSpan(ev);
    var a = Math.max(s, toMinutes(o.start));
    var b = Math.min(e, toMinutes(o.end));
    if (!(a < b)) return;
    for (var n = Math.floor((a - CHECK_OUT_MINUTES) / 1440); n <= Math.floor((b - 1 - CHECK_OUT_MINUTES) / 1440); n++) set[fromDayNumber(n)] = true;
  });
  return Object.keys(set).sort();
}

/**
 * The time events occupy within [from, to), merged into sorted, separate spans: what the site needs
 * to tell which packages fit a date.
 * @param {CalendarEvent[]} events @param {string} from @param {string} to
 * @returns {{ start: string, end: string }[]}
 */
export function busySpans(events, from, to) {
  var lo = from + 'T00:00';
  var hi = to + 'T00:00';
  var spans = events
    .map(eventSpan)
    .filter(function (sp) {
      return sp.start < sp.end && sp.end > lo && sp.start < hi;
    })
    .sort(function (a, b) {
      return a.start < b.start ? -1 : a.start > b.start ? 1 : 0;
    });
  var out = [];
  spans.forEach(function (sp) {
    var last = out[out.length - 1];
    if (last && sp.start <= last.end) {
      if (sp.end > last.end) last.end = sp.end;
    } else out.push({ start: sp.start, end: sp.end });
  });
  return out;
}

/**
 * Whether a span is clear of every busy span.
 * @param {{ start: string, end: string }[]} busy @param {{ start: string, end: string }} span
 */
export function spanIsFree(busy, span) {
  return !(busy || []).some(function (b) {
    return span.start < b.end && span.end > b.start;
  });
}

/** Spans as text, for the snapshot cell: 'start/end' joined by commas. */
export function formatSpans(spans) {
  return spans
    .map(function (sp) {
      return sp.start + '/' + sp.end;
    })
    .join(',');
}

var SPAN_TEXT_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})\/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/;

/** @param {string} text @returns {{ start: string, end: string }[]} */
export function parseSpans(text) {
  var out = [];
  String(text || '')
    .split(',')
    .forEach(function (part) {
      var m = SPAN_TEXT_RE.exec(part.trim());
      if (m && m[1] < m[2]) out.push({ start: m[1], end: m[2] });
    });
  return out;
}

/**
 * The nights the guest stays, as shown and priced: a preparation day alone has none, the night before
 * + prep day and the prep day + wedding night one each. The calendar event may keep more (stayRange).
 * @param {StayType} stayType @param {string} checkIn @param {string} checkOut @returns {number}
 */
export function stayNights(stayType, checkIn, checkOut) {
  if (stayType === 'bride_day') return 0;
  if (stayType === 'bride_night_day' || stayType === 'bride_day_wedding_night') return 1;
  return daysBetween(checkIn, checkOut);
}

/**
 * The span a stored stay occupies, given the dates its calendar event has now: normally its
 * stayRange, but the owner may have moved, stretched or shortened the event in Google Calendar.
 * - A couple stay or a wedding night takes the event's dates as its own.
 * - A bride package keeps its wedding date while the event still covers that day, and moves with
 *   the event when it no longer does. Stretched, it also keeps every night of the event; shortened
 *   to one night, it keeps only its own hours (or that night, when it is not the package's own).
 * @param {{ stayType?: string, checkIn?: string, checkOut?: string }} req @param {string} start @param {string} end
 */
export function storedSpan(req, start, end) {
  var type = req && STAY_TYPES[req.stayType];
  if (!type || !isRealDate(req.checkIn) || !isRealDate(start) || !isRealDate(end)) return nightsSpan(start, end);
  if (!type.wedding) return staySpan(req.stayType, start, end);
  var wedding = req.checkIn;
  var covers = start < wedding && wedding < end;
  var nights = daysBetween(start, end);
  if (nights === 2) return staySpan(req.stayType, covers ? wedding : addDays(start, 1), '');
  if (nights > 2) return hull(staySpan(req.stayType, covers ? wedding : addDays(start, 1), ''), nightsSpan(start, end));
  // One night left: the package's own hours if that is its own night (the wedding day, or for the
  // night before + prep day the night before it), else that night.
  var own = start === wedding || (req.stayType === 'bride_night_day' && start === addDays(wedding, -1));
  return own ? staySpan(req.stayType, wedding, '') : nightsSpan(start, end);
}

/** The smallest span covering both. */
function hull(a, b) {
  return { start: a.start < b.start ? a.start : b.start, end: a.end > b.end ? a.end : b.end };
}

/** A 'YYYY-MM-DD' string that names a real date (not 2026-02-31). */
export function isRealDate(date) {
  var s = String(date || '');
  var n = DATE_RE.test(s) ? toDayNumber(s) : NaN;
  return !isNaN(n) && fromDayNumber(n) === s;
}

/** @param {string} start @param {string} end @returns {string[]} */
export function nightsOf(start, end) {
  var out = [];
  for (var n = toDayNumber(start); n < toDayNumber(end); n++) out.push(fromDayNumber(n));
  return out;
}

export function toMinutes(localDateTime) {
  var s = String(localDateTime);
  var hm = /T(\d{2}):(\d{2})/.exec(s);
  return toDayNumber(s.slice(0, 10)) * 1440 + (hm ? +hm[1] * 60 + +hm[2] : 0);
}

/**
 * Nights in [from, to) blocked by any event.
 * All-day events block from their start date up to, not including, their end date.
 * Timed events block every night whose stay window (15:00 to 11:00 next day) they overlap.
 */
/** @param {CalendarEvent[]} events @param {string} from @param {string} to @returns {string[]} */
export function blockedNights(events, from, to) {
  var lo = toDayNumber(from);
  var hi = toDayNumber(to);
  var set = {};
  events.forEach(function (ev) {
    var n;
    if (ev.allDay) {
      var a = Math.max(toDayNumber(ev.start), lo);
      var b = Math.min(toDayNumber(ev.end), hi);
      for (n = a; n < b; n++) set[fromDayNumber(n)] = true;
      return;
    }
    var s = toMinutes(ev.start);
    var e = toMinutes(ev.end);
    if (isNaN(s) || isNaN(e)) return;
    var last = Math.min(Math.floor(e / 1440), hi - 1);
    for (n = Math.max(Math.floor(s / 1440) - 1, lo); n <= last; n++) {
      if (s < (n + 1) * 1440 + CHECK_OUT_MINUTES && e > n * 1440 + CHECK_IN_MINUTES) set[fromDayNumber(n)] = true;
    }
  });
  return Object.keys(set).sort();
}

/** @param {string[]} blocked @param {string} start @param {string} end @returns {string[]} */
export function conflictingNights(blocked, start, end) {
  var set = {};
  blocked.forEach(function (d) {
    set[d] = true;
  });
  return nightsOf(start, end).filter(function (d) {
    return set[d];
  });
}

/**
 * Thursday, Friday and Saturday nights are weekend nights (the owner's prices of 17.11.2026: Sun–Wed
 * midweek, Thu–Sat weekend). A night is named by the date it starts.
 * @param {string} date @returns {boolean}
 */
export function isWeekendNight(date) {
  var day = new Date(toDayNumber(date) * 86400000).getUTCDay();
  return day === 4 || day === 5 || day === 6;
}

/**
 * The price for a stay, or null without prices. `prices` is a price list (priceListOf) or, from
 * callers that hold only the flat key → price map, that map. A couple stay without `start` is priced
 * from the base midweek price.
 * @param {StayType} stayType @param {number} nights @param {number} adults
 * @param {Record<string, any> | null} prices
 * @param {string} [start] the first night
 * @returns {number | null}
 */
export function estimatePrice(stayType, nights, adults, prices, start) {
  var list = asPriceList(prices);
  if (!list) return null;
  return quoteStay(list, stayType, start || '', nights, adults).price;
}

// Nearby dates offered when a holiday's dates are taken.
export var MAX_ALTERNATIVES = 3;
export var ALTERNATIVE_SEARCH_DAYS = 30;

/**
 * Up to `limit` free stays of the same length near a taken one, closest first (a day later, a day
 * earlier, two days later, ...), as couple stays. Only nights inside the window the busy list covers,
 * [from, to), are considered, and none before `firstNight`; a stay never runs past `to`.
 * @param {{ start: string, end: string }[]} busy the time taken within [from, to) (busySpans)
 * @param {string} checkIn the requested check-in @param {number} nights
 * @param {string} from @param {string} to the covered window (to exclusive)
 * @param {string} firstNight the earliest night a stay may start (today)
 * @param {number} [limit] at most this many, MAX_ALTERNATIVES by default
 * @param {PriceList} [list] a price list: alternatives must then meet its minimums
 * @returns {{ checkIn: string, checkOut: string }[]}
 */
export function findAlternatives(busy, checkIn, nights, from, to, firstNight, limit, list) {
  limit = limit || MAX_ALTERNATIVES;
  var out = [];
  if (!(nights >= 1) || isNaN(toDayNumber(checkIn)) || isNaN(toDayNumber(from)) || isNaN(toDayNumber(to))) return out;
  var lo = Math.max(toDayNumber(from), toDayNumber(firstNight));
  var hi = toDayNumber(to);
  var base = toDayNumber(checkIn);
  for (var step = 1; step <= ALTERNATIVE_SEARCH_DAYS && out.length < limit; step++) {
    var starts = [base + step, base - step];
    for (var i = 0; i < starts.length && out.length < limit; i++) {
      var s = starts[i];
      if (s < lo || s + nights > hi) continue;
      // With a price list, an alternative must also meet the minimum of the nights it covers.
      if (list && stayMinimum(list, fromDayNumber(s), fromDayNumber(s + nights)) > nights) continue;
      if (spanIsFree(busy, staySpan('couple', fromDayNumber(s), fromDayNumber(s + nights)))) out.push({ checkIn: fromDayNumber(s), checkOut: fromDayNumber(s + nights) });
    }
  }
  return out;
}

/** @param {string | undefined} createdAtIso @param {number} nowMs @returns {boolean} */
export function isHoldActive(createdAtIso, nowMs) {
  var created = Date.parse(createdAtIso);
  return !isNaN(created) && nowMs - created < HOLD_HOURS * 3600 * 1000;
}

/** Israeli local numbers (05x...) become 9725x... for wa.me links. */
/** @param {string} phone @returns {string} */
export function whatsappNumber(phone) {
  var digits = String(phone || '').replace(/\D/g, '');
  if (digits.indexOf('972') === 0) return digits;
  if (digits.charAt(0) === '0') return '972' + digits.slice(1);
  return digits;
}

/**
 * Validates a booking request. `today` is the Israel-local date. The website calls this before
 * submitting and the web app calls it again on arrival; the server's answer is the authoritative one.
 * @param {Record<string, unknown>} input
 * @param {string} today
 * @param {Record<string, number> | null} [prices] passed on to estimatePrice; none gives estimate null
 * @returns {{ ok: true, value: Record<string, any> } | { ok: false, errors: Record<string, string> }}
 */
export function validateRequest(input, today, prices) {
  var errors = {};
  var stayType = String(input.stayType || '');
  var type = STAY_TYPES[stayType];
  if (!type) errors.stayType = 'invalid';

  var checkIn = String(input.checkIn || '');
  var checkOut = String(input.checkOut || '');
  var todayN = toDayNumber(today);
  var inN = toDayNumber(checkIn);
  if (isNaN(inN)) errors.checkIn = 'invalid';
  // A wedding date is tomorrow at the earliest, the prep day + wedding night included: the house is
  // prepared for the bride, so it is not booked on the day.
  else if (inN < todayN + (type && type.wedding ? 1 : 0)) errors.checkIn = 'past';
  else if (inN > todayN + HORIZON_DAYS) errors.checkIn = 'too_far';

  var range = null;
  if (type && !errors.checkIn) {
    if (!type.wedding) {
      var nights = daysBetween(checkIn, checkOut);
      if (isNaN(nights) || nights < 1) errors.checkOut = 'invalid';
      else if (nights > MAX_NIGHTS) errors.checkOut = 'too_long';
    }
    if (!errors.checkOut) range = stayRange(stayType, checkIn, checkOut);
  }

  var adults = Number(input.adults);
  if (!(adults >= 1 && adults <= MAX_ADULTS && Math.floor(adults) === adults)) errors.adults = 'invalid';

  var participants = 0;
  if (DAY_PARTICIPANT_TYPES.indexOf(stayType) >= 0 && input.participants !== undefined && input.participants !== null && input.participants !== '') {
    participants = Number(input.participants);
    if (!(participants >= 1 && participants <= MAX_DAY_PARTICIPANTS && Math.floor(participants) === participants)) errors.participants = 'invalid';
  }

  var name = String(input.name || '').trim();
  if (name.length < 2 || name.length > 80) errors.name = 'required';

  var phone = String(input.phone || '').trim();
  var digits = phone.replace(/\D/g, '');
  if (!/^[+\d\s\-()]+$/.test(phone) || digits.length < 9 || digits.length > 15) errors.phone = 'invalid';

  var email = String(input.email || '').trim();
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.email = 'invalid';

  var notes = String(input.notes || '').trim();
  if (notes.length > NOTES_MAX) errors.notes = 'too_long';

  if (Object.keys(errors).length) return { ok: false, errors: errors };

  var stayed = stayNights(stayType, checkIn, type.wedding ? range.end : checkOut);
  return {
    ok: true,
    value: {
      stayType: stayType,
      checkIn: checkIn,
      checkOut: type.wedding ? range.end : checkOut,
      start: range.start,
      end: range.end,
      nights: stayed,
      adults: adults,
      participants: participants,
      name: name,
      phone: phone,
      email: email,
      notes: notes,
      estimate: estimatePrice(stayType, stayed, adults, prices || null, range.start),
    },
    // The ad campaign's tag stays outside `value`: it is stored as its own calendar property.
    campaign: cleanCampaign(input.campaign),
  };
}

// ---------------------------------------------------------------------------
// Dates closed from the owner console. Each is an all-day event in the bookings calendar, so it
// blocks the website, the console and anything else that reads that calendar (channel feeds).
// - block: closed until reopened, with a reason
// - phone: a booking made by phone or WhatsApp, with the guest's details
// - hold: held for someone deciding; it stops blocking after its hours and is then deleted

export var BLOCK_KINDS = ['block', 'phone', 'hold'];
export var BLOCK_REASONS = ['שימוש משפחתי', 'תחזוקה', 'שיפוץ', 'חופשה', 'אחר'];
export var HOLD_CHOICES = [24, 48, 72];
// Longest a hold may run, counting extensions: measured from when it was made.
export var HOLD_MAX_HOURS = 7 * 24;
export var PHONE_PRICE_MAX = 100000;

/**
 * Validates a console closing. `today` is the Israel-local date. Nights are [start, end), as for
 * requests; a closing may run to the end of the booking window. Returns the normalized closing.
 * @param {Record<string, unknown>} input
 * @param {string} today
 * @returns {{ ok: true, value: Record<string, any> } | { ok: false, errors: Record<string, string> }}
 */
export function validateBlock(input, today) {
  input = input || {};
  var errors = {};
  var kind = String(input.kind || '');
  if (BLOCK_KINDS.indexOf(kind) === -1) errors.kind = 'invalid';

  var start = String(input.start || '');
  var end = String(input.end || '');
  var todayN = toDayNumber(today);
  var startN = toDayNumber(start);
  var endN = toDayNumber(end);
  if (isNaN(startN)) errors.start = 'invalid';
  else if (startN < todayN) errors.start = 'past';
  else if (startN > todayN + HORIZON_DAYS) errors.start = 'too_far';
  if (isNaN(endN) || (!isNaN(startN) && endN <= startN)) errors.end = 'invalid';
  else if (endN > todayN + HORIZON_DAYS + 1) errors.end = 'too_far';

  var note = String(input.note || '').trim();
  if (note.length > NOTES_MAX) errors.note = 'too_long';

  var value = { kind: kind, start: start, end: end, nights: endN - startN, note: note };

  if (kind === 'block') {
    var reason = String(input.reason || '');
    if (BLOCK_REASONS.indexOf(reason) === -1) errors.reason = 'invalid';
    value.reason = reason;
  }

  if (kind === 'hold') {
    var hours = Number(input.hours);
    if (!(hours >= 1 && hours <= HOLD_MAX_HOURS && Math.floor(hours) === hours)) errors.hours = 'invalid';
    var holder = String(input.name || '').trim();
    if (holder.length > 80) errors.name = 'too_long';
    value.hours = hours;
    value.name = holder;
  }

  if (kind === 'phone') {
    var stayType = String(input.stayType || 'couple');
    if (!STAY_TYPES[stayType]) errors.stayType = 'invalid';
    var name = String(input.name || '').trim();
    if (name.length < 2 || name.length > 80) errors.name = 'required';
    var phone = String(input.phone || '').trim();
    var digits = phone.replace(/\D/g, '');
    if (!/^[+\d\s\-()]+$/.test(phone) || digits.length < 9 || digits.length > 15) errors.phone = 'invalid';
    var email = String(input.email || '').trim();
    if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.email = 'invalid';
    var adults = Number(input.adults);
    if (!(adults >= 1 && adults <= MAX_ADULTS && Math.floor(adults) === adults)) errors.adults = 'invalid';
    var price = input.price === '' || input.price == null ? 0 : Number(input.price);
    if (!(price >= 0 && price <= PHONE_PRICE_MAX && Math.floor(price) === price)) errors.price = 'invalid';
    // A bride package is booked over the night before and the wedding night, as on the website
    // (stayRange): its wedding date is the second night.
    if (STAY_TYPES[stayType] && STAY_TYPES[stayType].wedding && value.nights !== 2) errors.end = 'wedding_range';
    value.stayType = stayType;
    value.name = name;
    value.phone = phone;
    value.email = email;
    value.adults = adults;
    value.price = price;
  }

  if (Object.keys(errors).length) return { ok: false, errors: errors };
  return { ok: true, value: value };
}

/** The campaign tag's fields, in the order they are kept when the whole tag is too long. */
export var CAMPAIGN_FIELDS = ['source', 'medium', 'campaign', 'content'];

/**
 * The ad link's campaign tag (utm_source, utm_medium, utm_campaign, utm_content), cleaned rather than
 * refused: control characters, line breaks, < > " ' ` are dropped, spaces collapsed, each value cut
 * to 40 characters, and the whole tag to 120 (from the last field). Hebrew, emoji and other
 * punctuation stay. Null when nothing is left; never an error.
 * @param {unknown} input @returns {Record<string, string> | null}
 */
export function cleanCampaign(input) {
  if (!input || typeof input !== 'object') return null;
  /** @type {Record<string, string>} */
  var out = {};
  var total = 0;
  CAMPAIGN_FIELDS.forEach(function (field) {
    var raw = /** @type {Record<string, unknown>} */ (input)[field];
    if (typeof raw !== 'string') return;
    var value = Array.from(raw.replace(/[\u0000-\u001f\u007f<>"'`]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 40).join('').trim();
    if (!value) return;
    var room = 120 - total;
    if (room <= 0) return;
    value = Array.from(value).slice(0, room).join('').trim();
    if (!value) return;
    out[field] = value;
    total += Array.from(value).length;
  });
  return Object.keys(out).length ? out : null;
}

/** A campaign tag as one short line, for the owner: "meta / כלות אוקטובר / וידאו". */
export function campaignLabel(campaign) {
  if (!campaign) return '';
  return [campaign.source, campaign.campaign, campaign.content].filter(Boolean).join(' / ') || campaign.medium || '';
}

// Cancelling a booking from the owner console. The terms (src/legal/content.ts, "ביטול ושינוי
// הזמנה") set the fee as a share of the booking price, by how long is left before the agreed start
// of the stay, in Israel time:
// - 14 days or more: free; 7 to 14 days: 50%; under 7 days (or not arriving): 100%
// - the statutory right: cancelled within 14 days of the confirmation, with at least 7 days that are
//   not rest days left before the arrival day, the fee is 5% or ₪100, whichever is lower, and it
//   prevails
// - when we cancel, there is no fee: the guest chooses a full refund or new dates
// Nothing is charged by the system (payment is at the start of the stay); the console only shows it.

export var CANCEL_FREE_DAYS = 14;
export var CANCEL_HALF_DAYS = 7;
export var STATUTORY_WINDOW_DAYS = 14;
export var STATUTORY_MIN_DAYS = 7;
export var STATUTORY_RATE = 5;
export var STATUTORY_CAP = 100;


/**
 * When a stay starts, as a local 'YYYY-MM-DDTHH:mm', from its first blocked night, by the house
 * rules: check-in at 15:00 on the first night; for bride_night_day, whose guests arrive the day
 * before, at NIGHT_BEFORE_CHECK_IN. A bride day's and a prep day + wedding night's events start the
 * night before (kept free of guests for them); the stay itself starts at PREP_START on the wedding
 * day. It is staySpan's start.
 * A wedding night's arrival is "after the event, by arrangement", so its check-in hour, the earliest
 * it can be, stands in for it.
 * @param {StayType} stayType @param {string} start @returns {string}
 */
export function stayStartsAt(stayType, start) {
  if (stayType === 'bride_day' || stayType === 'bride_day_wedding_night') return addDays(start, 1) + 'T' + PREP_START;
  if (stayType === 'bride_night_day') return start + 'T' + NIGHT_BEFORE_CHECK_IN;
  return start + 'T' + hhmm(CHECK_IN_MINUTES);
}

/** Minutes after midnight as 'HH:mm'. */
function hhmm(minutes) {
  var h = Math.floor(minutes / 60), m = minutes % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}

/**
 * Days strictly between `from` and `to` that are not rest days. Only Saturdays are counted as rest
 * days; holidays are not known here, so near a holiday this may count a day too many.
 * @param {string} from @param {string} to @returns {number}
 */
export function workingDaysBetween(from, to) {
  var count = 0;
  for (var n = toDayNumber(from) + 1; n < toDayNumber(to); n++) {
    if (new Date(n * 86400000).getUTCDay() !== 6) count++;
  }
  return count;
}

/**
 * The fee the terms set for cancelling at `now` (local 'YYYY-MM-DDTHH:mm'). `startsAt` is when the
 * stay starts (stayStartsAt), `confirmed` the date the booking was confirmed ('' when unknown: the
 * statutory right is then not assumed), `price` the booking price in shekels (0 when unknown: the fee
 * has no amount), and `by` 'guest' or 'us'. Returns the band (ours, free, half, full or statutory),
 * the percentage the band names (null for the statutory fee, which is capped), the fee in shekels
 * (null without a price), and the whole days left.
 * @param {{ startsAt: string, now: string, confirmed: string, price: number, by: 'guest' | 'us' }} o
 * @returns {{ band: string, percent: number | null, fee: number | null, daysBefore: number, statutory: boolean }}
 */
export function cancellationFee(o) {
  var price = Number(o.price) > 0 ? Number(o.price) : 0;
  var minutesLeft = toMinutes(o.startsAt) - toMinutes(o.now);
  var daysBefore = Math.floor(minutesLeft / 1440);
  if (o.by === 'us') return { band: 'ours', percent: 0, fee: price ? 0 : null, daysBefore: daysBefore, statutory: false };
  var percent = minutesLeft >= CANCEL_FREE_DAYS * 1440 ? 0 : minutesLeft >= CANCEL_HALF_DAYS * 1440 ? 50 : 100;
  var band = percent === 0 ? 'free' : percent === 50 ? 'half' : 'full';
  var today = String(o.now).slice(0, 10);
  var sinceConfirmed = o.confirmed ? daysBetween(o.confirmed, today) : NaN;
  var statutory = sinceConfirmed >= 0 && sinceConfirmed <= STATUTORY_WINDOW_DAYS && workingDaysBetween(today, String(o.startsAt).slice(0, 10)) >= STATUTORY_MIN_DAYS;
  // The statutory fee (at most 5%) is always below the 50% and 100% bands, so where it applies it wins.
  if (statutory && percent > 0) {
    var legal = price ? Math.min(Math.round((price * STATUTORY_RATE) / 100), STATUTORY_CAP) : null;
    return { band: 'statutory', percent: null, fee: legal, daysBefore: daysBefore, statutory: true };
  }
  return { band: band, percent: percent, fee: price ? Math.round((price * percent) / 100) : null, daysBefore: daysBefore, statutory: statutory };
}
