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
export var OPTIONAL_PRICE_KEYS = ['bride_day_wedding_night'];
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
 * The nights a stay occupies, as [start, end) dates.
 * @param {StayType} stayType @param {string} checkIn @param {string} checkOut
 * @returns {{ start: string, end: string }}
 */
export function stayRange(stayType, checkIn, checkOut) {
  if (stayType === 'bride_day_wedding_night') return { start: checkIn, end: addDays(checkIn, 1) };
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
  if (type && DATE_RE.test(String(req.checkIn || '')) && (type.wedding || DATE_RE.test(String(req.checkOut || '')))) {
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

/** Friday and Saturday nights are weekend nights. A night is named by the date it starts. */
/** @param {string} date @returns {boolean} */
export function isWeekendNight(date) {
  var day = new Date(toDayNumber(date) * 86400000).getUTCDay();
  return day === 5 || day === 6;
}

/**
 * @param {StayType} stayType @param {number} nights @param {number} adults
 * @param {Record<string, number> | null} prices checked prices; without them there is no estimate
 * @param {string} [start] the first night; without it every night is priced as a weeknight
 * @returns {number | null}
 */
export function estimatePrice(stayType, nights, adults, prices, start) {
  var p = prices;
  if (!p) return null;
  if (stayType === 'bride_day' || stayType === 'bride_night_day' || stayType === 'wedding_night' || stayType === 'bride_day_wedding_night') {
    return typeof p[stayType] === 'number' ? p[stayType] : null;
  }
  var weekend = p.weekendPerNight || p.perNight;
  var total = 0;
  for (var i = 0; i < nights; i++) {
    total += start && isWeekendNight(addDays(start, i)) ? weekend : p.perNight;
  }
  return total + (adults === 3 ? p.thirdGuestPerNight * nights : 0);
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
 * @returns {{ checkIn: string, checkOut: string }[]}
 */
export function findAlternatives(busy, checkIn, nights, from, to, firstNight, limit) {
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

  var blockedCount = daysBetween(range.start, range.end);
  return {
    ok: true,
    value: {
      stayType: stayType,
      checkIn: checkIn,
      checkOut: type.wedding ? range.end : checkOut,
      start: range.start,
      end: range.end,
      nights: blockedCount,
      adults: adults,
      participants: participants,
      name: name,
      phone: phone,
      email: email,
      notes: notes,
      estimate: estimatePrice(stayType, blockedCount, adults, prices || null, range.start),
    },
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
 * before, at NIGHT_BEFORE_CHECK_IN. A bride day's event starts the night before (it is kept free for
 * her); the day itself starts at PREP_START on the wedding day. A prep day + wedding night starts on
 * the wedding day, its first and only night, at PREP_START.
 * A wedding night's arrival is "after the event, by arrangement", so its check-in hour, the earliest
 * it can be, stands in for it.
 * @param {StayType} stayType @param {string} start @returns {string}
 */
export function stayStartsAt(stayType, start) {
  if (stayType === 'bride_day') return addDays(start, 1) + 'T' + PREP_START;
  if (stayType === 'bride_day_wedding_night') return start + 'T' + PREP_START;
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
