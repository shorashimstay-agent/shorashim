/**
 * Shorashim booking web app. Google Calendar is the single record:
 * - bookings: confirmed stays and manual blocks (anything here blocks its nights)
 * - requests: website requests, holding their nights for HOLD_HOURS
 * - channels: bookings imported from OTAs
 * Two spreadsheets mirror the calendars. The admin sheet is private: tabs בקשות / הזמנות / ערוצים
 * with all details and approve/decline. The availability sheet is a separate file, viewable by
 * anyone with the link, holding blocked dates only; the website reads it because it answers fast.
 * Keeping them apart means guest details can never be exposed through the public file.
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
    if (p.action === 'diag' && validSig_('diag:' + p.t, p.sig) && Math.abs(Date.now() - Number(p.t)) < 300000) return json_(diagnose_());
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

/** Timings of the slow parts, for troubleshooting. Needs a fresh signed timestamp. */
function diagnose_() {
  var out = {};
  var t = Date.now();
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  out.lockWaitMs = Date.now() - t;
  try {
    t = Date.now();
    invalidateAvailability_();
    getAvailability_();
    out.availabilityMs = Date.now() - t;
    t = Date.now();
    refreshAvailabilitySnapshot_();
    out.snapshotWriteMs = Date.now() - t;
    t = Date.now();
    syncAdminSheet_();
    out.adminSheetSyncMs = Date.now() - t;
  } catch (err) {
    out.error = String(err);
  } finally {
    lock.releaseLock();
  }
  out.triggers = ScriptApp.getProjectTriggers().map(function (tr) {
    return tr.getHandlerFunction() + ':' + tr.getEventType();
  });
  return out;
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
// Availability snapshot: a separate spreadsheet, viewable by anyone with the link. The website
// reads it first because it answers in well under a second, while this web app often takes
// 10+ seconds to start. It holds dates only, never guest details.

var SNAPSHOT_COLUMNS = ['from', 'to', 'generatedAt', 'blocked'];

function refreshAvailabilitySnapshot_() {
  invalidateAvailability_();
  var data = getAvailability_();
  if (!CONFIG.availabilitySheetId) return data;
  var sheet = SpreadsheetApp.openById(CONFIG.availabilitySheetId).getSheets()[0];
  // Plain-text cells, so Sheets does not turn the ISO dates into its own date values.
  sheet
    .getRange(1, 1, 2, SNAPSHOT_COLUMNS.length)
    .setNumberFormat('@')
    .setValues([SNAPSHOT_COLUMNS, [data.from, data.to, data.generatedAt, data.blocked.join(',')]]);
  return data;
}

/** Rewrites the availability snapshot and the admin sheet. Failures are logged, never thrown. */
function refreshMirrors_() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (err) {
    console.error('mirror refresh skipped: lock busy');
    return;
  }
  try {
    try {
      refreshAvailabilitySnapshot_();
    } catch (err) {
      console.error('snapshot refresh failed', err);
    }
    try {
      syncAdminSheet_();
    } catch (err) {
      console.error('admin sheet sync failed', err);
    }
  } finally {
    lock.releaseLock();
  }
}

var MIRROR_TRIGGER = 'onMirrorsDue';

/**
 * Refreshing both spreadsheets takes about 6 seconds, too long to make a visitor wait. This queues it
 * as a one-off trigger that runs within about a minute; the 5-minute timer catches up if that fails.
 */
function scheduleMirrorRefresh_() {
  try {
    var queued = ScriptApp.getProjectTriggers().some(function (trigger) {
      return trigger.getHandlerFunction() === MIRROR_TRIGGER;
    });
    if (!queued) ScriptApp.newTrigger(MIRROR_TRIGGER).timeBased().after(1000).create();
  } catch (err) {
    console.error('could not queue the spreadsheet refresh; the timer will catch up', err);
  }
}

/** One-off trigger queued by scheduleMirrorRefresh_. */
function onMirrorsDue() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === MIRROR_TRIGGER) ScriptApp.deleteTrigger(trigger);
  });
  refreshMirrors_();
}

/** Installable trigger: any change in the booking calendars, including Saray's own edits. */
function onCalendarChange() {
  refreshMirrors_();
}

/** Installable trigger: every 10 minutes, so expired holds and the rolling date window stay current. */
function onSnapshotTimer() {
  refreshMirrors_();
}

/**
 * Run once from the Apps Script editor as the owner: formats the spreadsheet, writes every tab and
 * installs the triggers. Safe to re-run. Each step logs, so a failure in the editor log names its step.
 */
function setup() {
  if (Session.getActiveUser().getEmail() !== CONFIG.ownerEmail) {
    throw new Error('Run setup from the Apps Script editor, signed in as ' + CONFIG.ownerEmail);
  }
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    ScriptApp.deleteTrigger(trigger);
  });
  console.log('1/4 old triggers removed');

  if (CONFIG.adminSheetId) {
    prepareAdminSheet_();
    ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(CONFIG.adminSheetId).onEdit().create();
    console.log('2/4 spreadsheet formatted, edit trigger installed');
  }

  // Calendar change triggers make Saray's own calendar edits show up at once. Google does not allow
  // them on every calendar, so a failure only means waiting for the timer instead.
  var calendarTriggers = 0;
  ['bookings', 'requests', 'channels'].forEach(function (key) {
    try {
      ScriptApp.newTrigger('onCalendarChange').forUserCalendar(CONFIG.calendars[key]).onEventUpdated().create();
      calendarTriggers++;
    } catch (err) {
      console.warn('calendar trigger not available for ' + key + ': ' + err.message);
    }
  });
  var minutes = calendarTriggers === 3 ? 10 : 5;
  ScriptApp.newTrigger('onSnapshotTimer').timeBased().everyMinutes(minutes).create();
  console.log('3/4 calendar triggers: ' + calendarTriggers + ' of 3; timer every ' + minutes + ' minutes');

  refreshMirrors_();
  console.log('4/4 tabs written. Setup done.');
}

// ---------------------------------------------------------------------------
// Admin sheet: one tab per calendar. Pending requests are decided by choosing אישור/דחייה in
// the פעולה column and then ticking ביצוע (the tick is the confirmation, and works on phones).

var ADMIN_TABS = { requests: 'בקשות', bookings: 'הזמנות', channels: 'ערוצים' };
var REQUEST_COLUMNS = ['מספר בקשה', 'סטטוס', 'סוג אירוח', 'הגעה', 'עזיבה', 'לילות', 'אורחים', 'שם', 'טלפון', 'אימייל', 'הערות', 'הערכת מחיר', 'התקבלה', 'פעולה', 'ביצוע', 'WhatsApp', 'מזהה'];
var BOOKING_COLUMNS = ['כותרת', 'הגעה', 'עזיבה', 'לילות', 'מקור', 'סוג אירוח', 'אורחים', 'טלפון', 'אימייל', 'הערות', 'מספר', 'WhatsApp'];
var CHANNEL_COLUMNS = ['כותרת', 'הגעה', 'עזיבה', 'לילות'];
var ACTION_COL = 14;
var CONFIRM_COL = 15;
var ID_COL = 17;
var ACTION_APPROVE = 'אישור';
var ACTION_DECLINE = 'דחייה';
var DECISIONS_KEY = 'recentDecisions';
var DECISION_DAYS = 3;

function prepareAdminSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.adminSheetId);
  ss.setSpreadsheetLocale('iw_IL');
  ss.setSpreadsheetTimeZone(TZ);
  [
    [ADMIN_TABS.requests, REQUEST_COLUMNS],
    [ADMIN_TABS.bookings, BOOKING_COLUMNS],
    [ADMIN_TABS.channels, CHANNEL_COLUMNS],
  ].forEach(function (tab, index) {
    var sheet = adminTab_(ss, tab[0], tab[1]);
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(index + 1);
  });
  var keep = [ADMIN_TABS.requests, ADMIN_TABS.bookings, ADMIN_TABS.channels];
  ss.getSheets().forEach(function (sheet) {
    if (keep.indexOf(sheet.getName()) === -1) ss.deleteSheet(sheet);
  });
  var requests = ss.getSheetByName(ADMIN_TABS.requests);
  requests.hideColumns(ID_COL);
  requests.getRange(1, ACTION_COL).setNote('בחרי "אישור" או "דחייה", ואז סמני את תיבת הביצוע בעמודה הבאה.');
  requests.getRange(1, CONFIRM_COL).setNote('הסימון מבצע את הפעולה שנבחרה. זה שלב האישור.');
  ss.setActiveSheet(requests);
}

function adminTab_(ss, name, columns) {
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.setRightToLeft(true);
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]).setFontWeight('bold').setBackground('#F3ECE0');
  sheet.setFrozenRows(1);
  return sheet;
}

/** Guest-supplied text is written as literal text, so nothing can turn into a formula or a number. */
function text_(value) {
  return value === '' || value == null ? '' : "'" + String(value);
}

function sheetLink_(url, label) {
  return url ? '=HYPERLINK("' + url + '","' + label + '")' : '';
}

function eventRange_(ev) {
  var d = toRuleEvent_(ev);
  var start = d.start.slice(0, 10);
  var end = d.end.slice(0, 10);
  return { start: start, end: end, nights: Math.max(daysBetween(start, end), 0) };
}

function recordDecision_(result, req, whatsapp) {
  var props = PropertiesService.getScriptProperties();
  var cutoff = Date.now() - DECISION_DAYS * 86400000;
  var list = JSON.parse(props.getProperty(DECISIONS_KEY) || '[]').filter(function (d) {
    return Date.parse(d.at) > cutoff;
  });
  list.unshift({
    at: new Date().toISOString(),
    result: result,
    ref: req.ref,
    name: req.name,
    phone: req.phone,
    stayType: req.stayType,
    start: req.start,
    end: req.end,
    whatsapp: whatsapp,
  });
  props.setProperty(DECISIONS_KEY, JSON.stringify(list.slice(0, 25)));
}

function writeTab_(sheet, width, rows) {
  var old = sheet.getMaxRows() - 1;
  if (old > 0) sheet.getRange(2, 1, old, width).clearDataValidations().clearContent().setBackground(null);
  if (rows.length) sheet.getRange(2, 1, rows.length, width).setValues(rows);
}

function syncAdminSheet_() {
  if (!CONFIG.adminSheetId) return;
  var ss = SpreadsheetApp.openById(CONFIG.adminSheetId);
  var today = today_();
  var from = localDate_(addDays(today, -30));
  var to = localDate_(addDays(today, HORIZON_DAYS + 1));
  var now = Date.now();

  // Requests: keep a choice made in פעולה that has not been confirmed yet.
  var requests = adminTab_(ss, ADMIN_TABS.requests, REQUEST_COLUMNS);
  var chosen = {};
  if (requests.getLastRow() > 1) {
    requests
      .getRange(2, 1, requests.getLastRow() - 1, ID_COL)
      .getValues()
      .forEach(function (row) {
        if (row[ID_COL - 1] && row[ACTION_COL - 1]) chosen[row[ID_COL - 1]] = row[ACTION_COL - 1];
      });
  }
  var pending = calendar_('requests')
    .getEvents(from, to)
    .map(function (ev) {
      var req = JSON.parse(ev.getTag('request') || '{}');
      var range = eventRange_(ev);
      var holding = ev.getTag('status') === 'pending' && isHoldActive(ev.getTag('createdAt'), now);
      var createdAt = ev.getTag('createdAt');
      return [
        text_(req.ref),
        holding ? 'ממתינה – התאריכים שמורים' : 'ממתינה – פג תוקף השמירה',
        STAY_TYPES[req.stayType] ? STAY_TYPES[req.stayType].label : '',
        text_(heDate_(range.start)),
        text_(heDate_(range.end)),
        range.nights,
        req.adults || '',
        text_(req.name || ev.getTitle()),
        text_(req.phone),
        text_(req.email),
        text_(req.notes),
        req.estimate ? text_('₪' + Number(req.estimate).toLocaleString('en-US')) : '',
        createdAt ? text_(fmt_(new Date(createdAt), 'dd.MM.yyyy HH:mm')) : '',
        chosen[ev.getId()] || '',
        false,
        req.phone ? sheetLink_(waLink_(req.phone, 'שלום ' + req.name + ', קיבלנו את בקשת ההזמנה שלך בשורשים'), 'WhatsApp') : '',
        ev.getId(),
      ];
    });
  var cutoff = now - DECISION_DAYS * 86400000;
  var decided = JSON.parse(PropertiesService.getScriptProperties().getProperty(DECISIONS_KEY) || '[]')
    .filter(function (d) {
      return Date.parse(d.at) > cutoff;
    })
    .map(function (d) {
      var approved = d.result === 'approved';
      return [
        text_(d.ref),
        approved ? 'אושרה ✓' : 'נדחתה ✗',
        STAY_TYPES[d.stayType] ? STAY_TYPES[d.stayType].label : '',
        text_(heDate_(d.start)),
        text_(heDate_(d.end)),
        daysBetween(d.start, d.end),
        '',
        text_(d.name),
        text_(d.phone),
        '',
        '',
        '',
        text_('טופלה ' + fmt_(new Date(d.at), 'dd.MM.yyyy HH:mm')),
        '',
        '',
        sheetLink_(d.whatsapp, approved ? 'שליחת אישור ב-WhatsApp' : 'שליחת דחייה ב-WhatsApp'),
        '',
      ];
    });
  writeTab_(requests, REQUEST_COLUMNS.length, pending.concat(decided));
  if (pending.length) {
    requests
      .getRange(2, ACTION_COL, pending.length, 1)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([ACTION_APPROVE, ACTION_DECLINE], true).setAllowInvalid(false).build());
    requests.getRange(2, CONFIRM_COL, pending.length, 1).insertCheckboxes();
  }
  if (decided.length) requests.getRange(pending.length + 2, 1, decided.length, REQUEST_COLUMNS.length).setBackground('#F4F1EC');

  // Bookings: website bookings carry the request details; manual events only have a title.
  var bookings = adminTab_(ss, ADMIN_TABS.bookings, BOOKING_COLUMNS);
  writeTab_(
    bookings,
    BOOKING_COLUMNS.length,
    calendar_('bookings')
      .getEvents(from, to)
      .map(function (ev) {
        var req = JSON.parse(ev.getTag('request') || '{}');
        var range = eventRange_(ev);
        return [
          text_(ev.getTitle()),
          text_(heDate_(range.start)),
          text_(heDate_(range.end)),
          range.nights,
          ev.getTag('source') === 'website' ? 'אתר' : 'ידני',
          STAY_TYPES[req.stayType] ? STAY_TYPES[req.stayType].label : '',
          req.adults || '',
          text_(req.phone),
          text_(req.email),
          text_(req.notes),
          text_(req.ref),
          req.phone ? sheetLink_(waLink_(req.phone, 'שלום ' + req.name + ', '), 'WhatsApp') : '',
        ];
      })
  );

  var channels = adminTab_(ss, ADMIN_TABS.channels, CHANNEL_COLUMNS);
  writeTab_(
    channels,
    CHANNEL_COLUMNS.length,
    calendar_('channels')
      .getEvents(from, to)
      .map(function (ev) {
        var range = eventRange_(ev);
        return [text_(ev.getTitle()), text_(heDate_(range.start)), text_(heDate_(range.end)), range.nights];
      })
  );
}

/** Installable trigger on the admin sheet: ticking ביצוע runs the action chosen in פעולה. */
function onSheetEdit(e) {
  if (!e || !e.range || typeof e.range.getSheet !== 'function') return;
  var sheet = e.range.getSheet();
  var ss = sheet.getParent();
  if (ss.getId() !== CONFIG.adminSheetId || sheet.getName() !== ADMIN_TABS.requests) return;
  if (e.range.getColumn() !== CONFIRM_COL || e.range.getNumRows() !== 1 || e.range.getRow() < 2) return;
  if (e.range.getValue() !== true) return;

  var row = sheet.getRange(e.range.getRow(), 1, 1, ID_COL).getValues()[0];
  var id = row[ID_COL - 1];
  var choice = row[ACTION_COL - 1];
  if (!id) {
    e.range.setValue(false);
    return;
  }
  if (choice !== ACTION_APPROVE && choice !== ACTION_DECLINE) {
    e.range.setValue(false);
    ss.toast('קודם בחרי "אישור" או "דחייה" בעמודת פעולה, ואז סמני ביצוע.', 'שורשים', 8);
    return;
  }
  var result = decideAndRecord_(choice === ACTION_APPROVE ? 'approve' : 'decline', id, true);
  if (!result.ok) {
    e.range.setValue(false);
    var messages = { not_found: 'הבקשה כבר טופלה.', unavailable: 'חלק מהלילות כבר תפוסים, אי אפשר לאשר.' };
    ss.toast(messages[result.error] || 'משהו השתבש, נסי שוב.', 'שורשים', 10);
    refreshMirrors_();
    return;
  }
  ss.toast(
    result.result === 'approved' ? 'ההזמנה אושרה ועברה ללשונית הזמנות.' : 'הבקשה נדחתה והתאריכים נפתחו.',
    'שורשים',
    8
  );
}

// ---------------------------------------------------------------------------
// Requests

var IN_PROGRESS = 'in_progress';

/**
 * Google sometimes loses a web app's response, even after the script has finished, so clients retry
 * with the same requestId. A retry that arrives while the first attempt is still running gets
 * in_progress; a later one gets the stored result. The work, including the one-time reCAPTCHA
 * check, runs only once.
 */
function createRequest_(body) {
  var requestId = /^[\w-]{8,64}$/.test(String(body.requestId || '')) ? 'req:' + body.requestId : '';
  if (!requestId) return createRequestOnce_(body);
  var cache = CacheService.getScriptCache();
  // The user lock only guards this check-and-claim; the booking lock stays free for real work.
  var claim = LockService.getUserLock();
  claim.waitLock(10000);
  try {
    var previous = cache.get(requestId);
    if (previous) return previous === IN_PROGRESS ? { ok: false, error: IN_PROGRESS } : JSON.parse(previous);
    cache.put(requestId, IN_PROGRESS, 300);
  } finally {
    claim.releaseLock();
  }
  var result;
  try {
    result = createRequestOnce_(body);
  } catch (err) {
    cache.remove(requestId);
    throw err;
  }
  cache.put(requestId, JSON.stringify(result), 3600);
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

  scheduleMirrorRefresh_();
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
  return decideAndRecord_(action, id, false);
}

/** syncMirrors: refresh the spreadsheets before returning (the sheet's own checkbox) or shortly after. */
function decideAndRecord_(action, id, syncMirrors) {
  if (action !== 'approve' && action !== 'decline') return { ok: false, error: 'bad_request' };
  var cache = CacheService.getScriptCache();
  var key = 'decided:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(id)));
  var previous = cache.get(key);
  if (previous) {
    var stored = JSON.parse(previous);
    return stored.action === action ? stored.result : { ok: false, error: 'not_found' };
  }
  var result = decideOnce_(action, id);
  if (result.ok) {
    cache.put(key, JSON.stringify({ action: action, result: result }), 3600);
    if (syncMirrors) refreshMirrors_();
    else scheduleMirrorRefresh_();
  }
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
      var declineLink = waLink_(req.phone, 'שלום ' + req.name + ', תודה על הפנייה לשורשים. לצערנו התאריכים שביקשת אינם פנויים. נשמח לעזור למצוא מועד אחר.');
      recordDecision_('declined', req, declineLink);
      return { ok: true, result: 'declined', whatsapp: declineLink };
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
    var approveLink = waLink_(req.phone, 'שלום ' + req.name + ', ההזמנה שלך בשורשים אושרה (' + stayDatesShort_(req) + '). מחכים לכם!');
    recordDecision_('approved', req, approveLink);
    return { ok: true, result: 'approved', invited: !!req.email, whatsapp: approveLink };
  } finally {
    lock.releaseLock();
  }
}
