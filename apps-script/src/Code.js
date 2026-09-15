/**
 * Shorashim booking web app. Google Calendar is the single record:
 * - bookings: confirmed stays and manual blocks (anything here blocks its nights)
 * - requests: website requests, holding their nights for HOLD_HOURS
 * - channels: bookings imported from OTAs
 * CONFIG comes from Config.js, which deploy.py generates and which is never committed.
 */

var TZ = 'Asia/Jerusalem';
var AVAILABILITY_CACHE_KEY = 'availability:v1';
var ADDRESS = 'משק פויזנר, המייסדים 71, זכרון יעקב';
var CONTACT_PHONE = '052-322-4220';

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'availability') return json_(getAvailability_());
    if (p.action === 'decide') return decisionPage_(p.id, p.sig);
    return json_({ ok: true, service: 'shorashim-booking' });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return json_({ ok: false, error: 'server_error' });
  }
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'bad_request' });
  }
  try {
    if (body.action === 'request') return json_(createRequest_(body));
    if (body.action === 'approve' || body.action === 'decline') return json_(decide(body.action, body.id, body.sig));
    return json_({ ok: false, error: 'bad_request' });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return json_({ ok: false, error: 'server_error' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function today_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function fmt_(date, pattern) {
  return Utilities.formatDate(date, TZ, pattern);
}

/** Midnight of a 'YYYY-MM-DD' date in the script time zone (Asia/Jerusalem, set in the manifest). */
function localDate_(dateStr) {
  var parts = dateStr.split('-').map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function heDate_(dateStr) {
  return dateStr.split('-').reverse().join('.');
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function calendar_(key) {
  return CalendarApp.getCalendarById(CONFIG.calendars[key]);
}

function invalidateAvailability_() {
  CacheService.getScriptCache().remove(AVAILABILITY_CACHE_KEY);
}

function toRuleEvent_(ev) {
  if (ev.isAllDayEvent()) {
    // getAllDayEndDate() is midnight after the last day, i.e. already exclusive.
    return { allDay: true, start: fmt_(ev.getAllDayStartDate(), 'yyyy-MM-dd'), end: fmt_(ev.getAllDayEndDate(), 'yyyy-MM-dd') };
  }
  return { allDay: false, start: fmt_(ev.getStartTime(), "yyyy-MM-dd'T'HH:mm"), end: fmt_(ev.getEndTime(), "yyyy-MM-dd'T'HH:mm") };
}

/** Events that can block nights in [start, end): all bookings and channel events, plus active request holds. */
function blockingEvents_(start, end, opts) {
  opts = opts || {};
  var from = localDate_(addDays(start, -2));
  var to = localDate_(addDays(end, 2));
  var out = [];
  ['bookings', 'channels'].forEach(function (key) {
    calendar_(key)
      .getEvents(from, to)
      .forEach(function (ev) {
        out.push(toRuleEvent_(ev));
      });
  });
  var now = Date.now();
  calendar_('requests')
    .getEvents(from, to)
    .forEach(function (ev) {
      if (ev.getId() === opts.excludeId || ev.getTag('status') !== 'pending') return;
      if (isHoldActive(ev.getTag('createdAt'), now)) out.push(toRuleEvent_(ev));
      else if (opts.expireStale) markExpired_(ev);
    });
  return out;
}

function markExpired_(ev) {
  ev.setTag('status', 'expired');
  ev.setTitle(ev.getTitle().replace(/^⏳\s*/, '⌛ פג תוקף · '));
}

function conflictsFor_(start, end, opts) {
  return conflictingNights(blockedNights(blockingEvents_(start, end, opts), start, end), start, end);
}

function getAvailability_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(AVAILABILITY_CACHE_KEY);
  if (hit) return JSON.parse(hit);
  var from = today_();
  var to = addDays(from, HORIZON_DAYS + 1);
  var result = {
    ok: true,
    from: from,
    to: to,
    blocked: blockedNights(blockingEvents_(from, to, { expireStale: true }), from, to),
    generatedAt: new Date().toISOString(),
  };
  cache.put(AVAILABILITY_CACHE_KEY, JSON.stringify(result), 120);
  return result;
}

// ---------------------------------------------------------------------------
// Requests

/**
 * Google sometimes fails the redirect that delivers a web app's response, after the script
 * has already run. Clients therefore retry with the same requestId, and get the stored result
 * instead of a second request (which would conflict with its own hold).
 */
function createRequest_(body) {
  var requestId = /^[\w-]{8,64}$/.test(String(body.requestId || '')) ? 'req:' + body.requestId : '';
  var cache = CacheService.getScriptCache();
  var previous = requestId && cache.get(requestId);
  if (previous) return JSON.parse(previous);
  var result = createRequestOnce_(body);
  if (requestId && (result.ok || result.error === 'unavailable')) cache.put(requestId, JSON.stringify(result), 3600);
  return result;
}

function createRequestOnce_(body) {
  // Honeypot field: bots get a plausible success and nothing is stored.
  if (body.website) return { ok: true, ref: newRef_(), holdHours: HOLD_HOURS };

  var check = validateRequest(body, today_());
  if (!check.ok) return { ok: false, error: 'invalid', fields: check.errors };
  var req = check.value;

  if (CONFIG.recaptchaSecret && !verifyRecaptcha_(body.recaptchaToken)) return { ok: false, error: 'captcha' };
  if (!withinRateLimit_(req.phone)) return { ok: false, error: 'rate_limited' };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var ev;
  try {
    var conflicts = conflictsFor_(req.start, req.end, { expireStale: true });
    if (conflicts.length) return { ok: false, error: 'unavailable', nights: conflicts };
    req.ref = newRef_();
    ev = calendar_('requests').createAllDayEvent(
      '⏳ ' + req.name + ' · ' + STAY_TYPES[req.stayType].label,
      localDate_(req.start),
      localDate_(req.end),
      { description: ownerLines_(req).join('\n') }
    );
    ev.setTag('request', JSON.stringify(req));
    ev.setTag('createdAt', new Date().toISOString());
    ev.setTag('status', 'pending');
    invalidateAvailability_();
  } finally {
    lock.releaseLock();
  }

  try {
    notifyOwner_(ev, req);
  } catch (err) {
    console.error('owner notification failed', err);
  }
  return { ok: true, ref: req.ref, holdHours: HOLD_HOURS, start: req.start, end: req.end };
}

function newRef_() {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var ref = 'SH-';
  for (var i = 0; i < 5; i++) ref += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return ref;
}

function verifyRecaptcha_(token) {
  if (!token) return false;
  var res = UrlFetchApp.fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'post',
    payload: { secret: CONFIG.recaptchaSecret, response: token },
    muteHttpExceptions: true,
  });
  var data = JSON.parse(res.getContentText());
  return data.success === true && (data.score == null || data.score >= 0.5) && (!data.action || data.action === 'booking_request');
}

function withinRateLimit_(phone) {
  var cache = CacheService.getScriptCache();
  var hourKey = 'rl:all:' + fmt_(new Date(), 'yyyyMMddHH');
  var phoneKey = 'rl:phone:' + whatsappNumber(phone);
  var all = Number(cache.get(hourKey) || 0);
  var perPhone = Number(cache.get(phoneKey) || 0);
  if (all >= 30 || perPhone >= 5) return false;
  cache.put(hourKey, String(all + 1), 3600);
  cache.put(phoneKey, String(perPhone + 1), 21600);
  return true;
}

// ---------------------------------------------------------------------------
// Text

function stayLines_(req) {
  var lines = ['סוג האירוח: ' + STAY_TYPES[req.stayType].label];
  if (STAY_TYPES[req.stayType].wedding) {
    lines.push('תאריך החתונה: ' + heDate_(req.checkIn));
  } else {
    var nights = daysBetween(req.checkIn, req.checkOut);
    lines.push('הגעה: ' + heDate_(req.checkIn) + ' מ-15:00');
    lines.push('עזיבה: ' + heDate_(req.checkOut) + ' עד 11:00 (' + (nights === 1 ? 'לילה אחד' : nights + ' לילות') + ')');
  }
  lines.push('מספר אורחים: ' + req.adults);
  return lines;
}

function ownerLines_(req) {
  var lines = stayLines_(req);
  if (STAY_TYPES[req.stayType].wedding) {
    lines.push('שמור ביומן: הלילה שלפני (' + heDate_(req.start) + ') וליל החתונה');
  }
  lines.push('הערכת מחיר: ₪' + Number(req.estimate).toLocaleString('en-US'));
  lines.push('שם: ' + req.name);
  lines.push('טלפון: ' + req.phone);
  if (req.email) lines.push('אימייל: ' + req.email);
  if (req.notes) lines.push('הערות: ' + req.notes);
  lines.push('מספר בקשה: ' + req.ref);
  return lines;
}

function guestDescription_(req) {
  var lines = stayLines_(req);
  if (req.notes) lines.push('הערות: ' + req.notes);
  lines.push('', 'כתובת: ' + ADDRESS, 'לכל שאלה: ' + CONTACT_PHONE + ' (טלפון ו-WhatsApp)', 'מספר הזמנה: ' + req.ref);
  return lines.join('\n');
}

function waLink_(phone, text) {
  return 'https://wa.me/' + whatsappNumber(phone) + '?text=' + encodeURIComponent(text);
}

function stayDatesShort_(req) {
  if (STAY_TYPES[req.stayType].wedding) return 'חתונה ' + heDate_(req.checkIn);
  return heDate_(req.checkIn) + '–' + heDate_(req.checkOut);
}

// ---------------------------------------------------------------------------
// Owner decisions

function sign_(id) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(id), CONFIG.hmacSecret)).replace(/=+$/, '');
}

function validSig_(id, sig) {
  return !!id && !!sig && sign_(id) === String(sig);
}

function decideUrl_(ev) {
  return CONFIG.webAppUrl + '?action=decide&id=' + encodeURIComponent(ev.getId()) + '&sig=' + sign_(ev.getId());
}

function notifyOwner_(ev, req) {
  var rows = ownerLines_(req)
    .map(function (line) {
      return '<div>' + esc_(line) + '</div>';
    })
    .join('');
  var button = 'display:inline-block;padding:12px 22px;border-radius:12px;text-decoration:none;font-weight:bold;';
  var html =
    '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#2C2926">' +
    '<h2 style="color:#8B6B48;margin:0 0 8px">בקשת הזמנה חדשה מהאתר</h2>' +
    '<p style="margin:0 0 12px">התאריכים שמורים ל-' + HOLD_HOURS + ' שעות. אם הבקשה לא תאושר עד אז, הם ייפתחו שוב.</p>' +
    rows +
    '<p style="margin:20px 0"><a href="' + esc_(decideUrl_(ev)) + '" style="' + button + 'background:#8B6B48;color:#fff">לאישור או דחייה</a></p>' +
    '<p><a href="' + esc_(waLink_(req.phone, 'שלום ' + req.name + ', קיבלנו את בקשת ההזמנה שלך בשורשים')) + '" style="color:#1E6B37">WhatsApp ל' + esc_(req.name) + '</a>' +
    ' · <a href="tel:' + esc_(req.phone.replace(/[^\d+]/g, '')) + '" style="color:#8B6B48">התקשרות</a></p>' +
    '</div>';
  MailApp.sendEmail({
    to: CONFIG.ownerEmail,
    subject: 'בקשת הזמנה ' + req.ref + ': ' + stayDatesShort_(req) + ' · ' + req.name,
    body: ownerLines_(req).join('\n') + '\n\nלאישור או דחייה: ' + decideUrl_(ev),
    htmlBody: html,
    name: 'שורשים – הזמנות',
  });
}

function decisionPage_(id, sig) {
  var t = HtmlService.createTemplateFromFile('Decide');
  t.state = decisionState_(id, sig);
  // Safe to inline in a <script>: JSON with '<' escaped.
  t.argsJson = JSON.stringify({ id: id || '', sig: sig || '' }).replace(/</g, '\\u003c');
  return t
    .evaluate()
    .setTitle('שורשים · בקשת הזמנה')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function decisionState_(id, sig) {
  if (!validSig_(id, sig)) return { status: 'forbidden' };
  var ev = calendar_('requests').getEventById(id);
  if (!ev) return { status: 'not_found' };
  var req = JSON.parse(ev.getTag('request') || '{}');
  if (!req.stayType) return { status: 'not_found' };
  return {
    status: 'open',
    ref: req.ref,
    lines: ownerLines_(req),
    expired: ev.getTag('status') !== 'pending' || !isHoldActive(ev.getTag('createdAt'), Date.now()),
    conflicts: conflictsFor_(req.start, req.end, { excludeId: id }).map(heDate_),
  };
}

/**
 * Called from the decision page (google.script.run) and from doPost. The signature authorizes it.
 * Repeating the same action returns the first result for an hour, so retried requests are safe.
 * The other action on an already-decided request reports it as handled.
 */
function decide(action, id, sig) {
  if (!validSig_(id, sig)) return { ok: false, error: 'forbidden' };
  if (action !== 'approve' && action !== 'decline') return { ok: false, error: 'bad_request' };
  var cache = CacheService.getScriptCache();
  var key = 'decided:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(id)));
  var previous = cache.get(key);
  if (previous) {
    var stored = JSON.parse(previous);
    return stored.action === action ? stored.result : { ok: false, error: 'not_found' };
  }
  var result = decideOnce_(action, id);
  if (result.ok) cache.put(key, JSON.stringify({ action: action, result: result }), 3600);
  return result;
}

function decideOnce_(action, id) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ev = calendar_('requests').getEventById(id);
    if (!ev) return { ok: false, error: 'not_found' };
    var req = JSON.parse(ev.getTag('request') || '{}');
    if (!req.stayType) return { ok: false, error: 'not_found' };

    if (action === 'decline') {
      ev.deleteEvent();
      invalidateAvailability_();
      return {
        ok: true,
        result: 'declined',
        whatsapp: waLink_(req.phone, 'שלום ' + req.name + ', תודה על הפנייה לשורשים. לצערנו התאריכים שביקשת אינם פנויים. נשמח לעזור למצוא מועד אחר.'),
      };
    }

    var conflicts = conflictsFor_(req.start, req.end, { excludeId: id });
    if (conflicts.length) return { ok: false, error: 'unavailable', nights: conflicts.map(heDate_) };

    var options = { description: guestDescription_(req), location: ADDRESS };
    if (req.email) {
      options.guests = req.email;
      options.sendInvites = true;
    }
    var booking = calendar_('bookings').createAllDayEvent('שורשים · ' + req.name, localDate_(req.start), localDate_(req.end), options);
    booking.setTag('request', ev.getTag('request'));
    booking.setTag('source', 'website');
    ev.deleteEvent();
    invalidateAvailability_();
    return {
      ok: true,
      result: 'approved',
      invited: !!req.email,
      whatsapp: waLink_(req.phone, 'שלום ' + req.name + ', ההזמנה שלך בשורשים אושרה (' + stayDatesShort_(req) + '). מחכים לכם!'),
    };
  } finally {
    lock.releaseLock();
  }
}
