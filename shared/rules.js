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
 * @typedef {'couple' | 'wedding_night' | 'bride_day' | 'bride_night_day'} StayType
 * @typedef {{ allDay: boolean, start: string, end: string }} CalendarEvent
 */

export var CHECK_IN_MINUTES = 15 * 60;
export var CHECK_OUT_MINUTES = 11 * 60;
export var MAX_NIGHTS = 14;
export var HORIZON_DAYS = 365;
export var HOLD_HOURS = 24;
export var MAX_ADULTS = 3;
export var NOTES_MAX = 450;

// Wedding-type stays are keyed by the wedding date and block the night before and the wedding night.
export var STAY_TYPES = {
  couple: { label: 'אירוח זוגי בוטיק', wedding: false },
  wedding_night: { label: 'ליל כלולות זוגי', wedding: false },
  bride_day: { label: 'יום כלה (התארגנות ביום החתונה)', wedding: true },
  bride_night_day: { label: 'לילה לפני + יום כלה', wedding: true },
};

export var PRICES = {
  perNight: 950,
  thirdGuestPerNight: 200,
  bride_day: 1800,
  bride_night_day: 2800,
  wedding_night: 1200,
};

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
  if (STAY_TYPES[stayType] && STAY_TYPES[stayType].wedding) {
    return { start: addDays(checkIn, -1), end: addDays(checkIn, 1) };
  }
  return { start: checkIn, end: checkOut };
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

/** @param {StayType} stayType @param {number} nights @param {number} adults @returns {number} */
export function estimatePrice(stayType, nights, adults) {
  if (stayType === 'bride_day' || stayType === 'bride_night_day' || stayType === 'wedding_night') {
    return PRICES[stayType];
  }
  return PRICES.perNight * nights + (adults === 3 ? PRICES.thirdGuestPerNight * nights : 0);
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
 * @returns {{ ok: true, value: Record<string, any> } | { ok: false, errors: Record<string, string> }}
 */
export function validateRequest(input, today) {
  var errors = {};
  var stayType = String(input.stayType || '');
  var type = STAY_TYPES[stayType];
  if (!type) errors.stayType = 'invalid';

  var checkIn = String(input.checkIn || '');
  var checkOut = String(input.checkOut || '');
  var todayN = toDayNumber(today);
  var inN = toDayNumber(checkIn);
  if (isNaN(inN)) errors.checkIn = 'invalid';
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
      name: name,
      phone: phone,
      email: email,
      notes: notes,
      estimate: estimatePrice(stayType, blockedCount, adults),
    },
  };
}
