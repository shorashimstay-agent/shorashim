/**
 * Shorashim booking web app. Google Calendar is the single record:
 * - bookings: confirmed stays and manual blocks (anything here blocks its nights), including the
 *   closings made in the owner console; a console hold stops blocking when it runs out
 * - requests: website requests, holding their nights for HOLD_HOURS
 * - channels: bookings imported from OTAs
 * Two spreadsheets mirror the calendars. The admin sheet is private: tabs בקשות / הזמנות / ערוצים
 * with all details and approve/decline, rebuilt from the calendars, and ביטולים, a log of cancelled
 * bookings that is only ever appended to (a cancelled booking's event is deleted, so the log is
 * its only record). The availability sheet is a separate file, viewable by
 * anyone with the link, holding blocked dates only; the website reads it because it answers fast.
 * Keeping them apart means guest details can never be exposed through the public file.
 * CONFIG comes from Config.js, which deploy.py generates and which is never committed.
 */

var TZ = 'Asia/Jerusalem';
var AVAILABILITY_CACHE_KEY = 'availability:v1';
var PRICES_TAB = 'מחירים';
var PRICES_CACHE_KEY = 'prices:v1';
var PRICES_REFETCH_KEY = 'prices:refetched';
var PRICES_LAST_GOOD_KEY = 'pricesLastGood';
var PRICES_OVERRIDE_KEY = 'pricesOverride';
var ADDRESS = 'משק פויזנר, המייסדים 71, זכרון יעקב';
var CONTACT_PHONE = '052-322-4220';
// The owner console. The owner email's button opens it on the request, not the web app's decision
// page: on Android the Drive app claims script.google.com links and fails to open them. Staging
// emails link here too; the suite opens the console against staging itself.
var CONSOLE_URL = 'https://shorashimstay.com/admin/';

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'availability') return json_(getAvailability_());
    // The signed decision page. Owner emails sent before they linked to the console still open it.
    if (p.action === 'decide') return decisionPage_(p.id, p.sig);
    if (p.action === 'diag' && validSig_('diag:' + p.t, p.sig) && Math.abs(Date.now() - Number(p.t)) < 300000) return json_(diagnose_(p.pv));
    return json_({ ok: true, service: 'shorashim-booking' });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    logEvent_('error', { where: 'doGet', action: p.action, message: logMessage_(err) });
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
    if (body.action === 'pruneDecisions' && validSig_('prune:' + body.t, body.sig) && Math.abs(Date.now() - Number(body.t)) < 300000) {
      return json_(pruneDecisions_(body.refs));
    }
    if (body.action === 'testFireSheetEdit' && CONFIG.testHooks === true && validSig_('test:' + body.t, body.sig) && Math.abs(Date.now() - Number(body.t)) < 300000) {
      return json_(testFireSheetEdit_(body.row));
    }
    if (body.action === 'console') return json_(consoleRequest_(body));
    if (body.action === 'testResetConsoleLock' && CONFIG.testHooks === true && validSig_('test:' + body.t, body.sig) && Math.abs(Date.now() - Number(body.t)) < 300000) {
      CacheService.getScriptCache().remove(CONSOLE_FAILS_KEY);
      return json_({ ok: true, reset: true });
    }
    if (body.action === 'testPruneCancellations' && CONFIG.testHooks === true && validSig_('test:' + body.t, body.sig) && Math.abs(Date.now() - Number(body.t)) < 300000) {
      return json_(testPruneCancellations_(body.tag));
    }
    if (body.action === 'testSetPrices' && CONFIG.testHooks === true && validSig_('test:' + body.t, body.sig) && Math.abs(Date.now() - Number(body.t)) < 300000) {
      return json_(testSetPrices_(body.file));
    }
    if (body.action === 'testEventLog' && CONFIG.testHooks === true && validSig_('test:' + body.t, body.sig) && Math.abs(Date.now() - Number(body.t)) < 300000) {
      return json_(testEventLog_(body.op, body.count));
    }
    return json_({ ok: false, error: 'bad_request' });
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    logEvent_('error', { where: 'doPost', action: body.action, message: logMessage_(err) });
    return json_({ ok: false, error: 'server_error' });
  }
}

/**
 * Timings of the slow parts, for troubleshooting. Needs a fresh signed timestamp. `pricesVersion`
 * (the ?pv= parameter) is the version the caller expects, as a request's would be.
 */
function diagnose_(pricesVersion) {
  var out = {};
  out.pricesVersion = currentPrices_(String(pricesVersion || '')).version;
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
  out.eventLog = eventLogStatus_();
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

/**
 * The prices in force: { version, prices }, from the owner's prices spreadsheet (CONFIG.pricesSheetId),
 * kept in the cache for 10 minutes. The site reads the same sheet as a public CSV; a request that
 * carries another version (the page saw a newer edit) triggers a re-read, at most once a minute. When
 * the sheet cannot be read or fails checkPrices, the last good copy is used; before any copy exists
 * there are no prices ({ version: 'none', prices: null }) and requests carry no estimate.
 * @param {string} wantedVersion the version the caller expects, or '' for any
 */
function currentPrices_(wantedVersion) {
  var props = PropertiesService.getScriptProperties();
  if (CONFIG.testHooks === true) {
    var override = props.getProperty(PRICES_OVERRIDE_KEY);
    if (override) return JSON.parse(override);
  }
  var cache = CacheService.getScriptCache();
  var cached = cache.get(PRICES_CACHE_KEY);
  if (cached) {
    var current = JSON.parse(cached);
    if (!wantedVersion || current.version === wantedVersion || cache.get(PRICES_REFETCH_KEY)) return current;
  }
  cache.put(PRICES_REFETCH_KEY, '1', 60);
  var fetched = readPricesSheet_();
  if (fetched) {
    var text = JSON.stringify(fetched);
    cache.put(PRICES_CACHE_KEY, text, 600);
    if (props.getProperty(PRICES_LAST_GOOD_KEY) !== text) props.setProperty(PRICES_LAST_GOOD_KEY, text);
    return fetched;
  }
  var lastGood = props.getProperty(PRICES_LAST_GOOD_KEY);
  if (lastGood) {
    cache.put(PRICES_CACHE_KEY, lastGood, 60);
    return JSON.parse(lastGood);
  }
  return { version: 'none', prices: null };
}

/** Reads and checks the prices tab of the prices spreadsheet; null on any failure. */
function readPricesSheet_() {
  if (!CONFIG.pricesSheetId) {
    console.warn('no pricesSheetId in the config');
    return null;
  }
  try {
    var sheet = SpreadsheetApp.openById(CONFIG.pricesSheetId).getSheetByName(PRICES_TAB);
    if (!sheet) {
      console.warn('prices sheet has no tab ' + PRICES_TAB);
      countLogNoise_('prices.no_tab');
      return null;
    }
    var checked = pricesFromRows(sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 3).getValues());
    if (!checked.ok) {
      console.warn('prices sheet rejected: ' + checked.error);
      countLogNoise_('prices.rejected');
      return null;
    }
    return { version: checked.version, prices: checked.prices };
  } catch (err) {
    console.warn('prices sheet unreadable', err);
    countLogNoise_('prices.unreadable');
    return null;
  }
}

// ---------------------------------------------------------------------------
// Calendar REST API. CalendarApp needs a round trip per event and per tag; the REST API creates an
// event together with its private properties in one call, and UrlFetchApp.fetchAll lists several
// calendars in parallel. CalendarApp's tags are the event's *shared* extended properties, and an
// event's iCalUID is what CalendarApp's getId() returns, so both APIs see the same events.

var CALENDAR_EVENTS_FIELDS = 'items(id,iCalUID,summary,created,start,end,extendedProperties,attendees(email),recurringEventId),nextPageToken';

function calendarRequest_(key, method, path, query, payload) {
  var url = 'https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(CONFIG.calendars[key]) + '/events' + (path || '');
  var params = Object.keys(query || {}).map(function (name) {
    return encodeURIComponent(name) + '=' + encodeURIComponent(query[name]);
  });
  var request = {
    url: params.length ? url + '?' + params.join('&') : url,
    method: method,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true,
  };
  if (payload) {
    request.contentType = 'application/json';
    request.payload = JSON.stringify(payload);
  }
  return request;
}

function calendarResponse_(res) {
  var code = res.getResponseCode();
  if (code === 204) return {};
  if (code >= 300) throw new Error('Calendar API ' + code + ': ' + res.getContentText().slice(0, 300));
  return JSON.parse(res.getContentText());
}

function calendarCall_(request) {
  var params = {};
  Object.keys(request).forEach(function (name) {
    if (name !== 'url') params[name] = request[name];
  });
  return calendarResponse_(UrlFetchApp.fetch(request.url, params));
}

/** Events per calendar key between two Dates, with the calendars fetched in parallel. */
function listEvents_(keys, from, to) {
  var query = { timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', maxResults: '2500', fields: CALENDAR_EVENTS_FIELDS };
  var responses = UrlFetchApp.fetchAll(
    keys.map(function (key) {
      return calendarRequest_(key, 'get', '', query);
    })
  );
  var out = {};
  keys.forEach(function (key, i) {
    var page = calendarResponse_(responses[i]);
    var items = page.items || [];
    while (page.nextPageToken) {
      page = calendarCall_(calendarRequest_(key, 'get', '', Object.assign({}, query, { pageToken: page.nextPageToken })));
      items = items.concat(page.items || []);
    }
    out[key] = items;
  });
  return out;
}

/** The event's tags: shared extended properties, which is where CalendarApp.setTag stores them. */
function eventProps_(item) {
  var ext = item.extendedProperties || {};
  var out = {};
  [ext.private || {}, ext.shared || {}].forEach(function (props) {
    Object.keys(props).forEach(function (name) {
      out[name] = props[name];
    });
  });
  return out;
}

/** All-day events carry dates (end exclusive); timed events are converted to local date-times. */
function itemRuleEvent_(item) {
  if (item.start.date) return { allDay: true, start: item.start.date, end: item.end.date };
  return {
    allDay: false,
    start: fmt_(new Date(item.start.dateTime), "yyyy-MM-dd'T'HH:mm"),
    end: fmt_(new Date(item.end.dateTime), "yyyy-MM-dd'T'HH:mm"),
  };
}

function itemRange_(item) {
  var d = itemRuleEvent_(item);
  var start = d.start.slice(0, 10);
  var end = d.end.slice(0, 10);
  return { start: start, end: end, nights: Math.max(daysBetween(start, end), 0) };
}

/**
 * Whether a bookings-calendar event blocks its nights now. Everything there does, except a console
 * hold whose expiresAt has passed. A hold with an unreadable expiresAt keeps blocking: a closing
 * must never vanish because of bad data.
 */
function bookingIsLive_(item, now) {
  var props = eventProps_(item);
  if (props.source !== 'console' || props.kind !== 'hold') return true;
  var expires = Date.parse(props.expiresAt);
  return isNaN(expires) || expires > now;
}

/**
 * Events that can block nights in [start, end): live bookings (console holds until they run out),
 * channel events, and active request holds. `excludeId` leaves one event out (the request being
 * approved, or the console hold being turned into a booking).
 */
function blockingEvents_(start, end, opts) {
  opts = opts || {};
  var lists = listEvents_(['bookings', 'channels', 'requests'], localDate_(addDays(start, -2)), localDate_(addDays(end, 2)));
  var now = Date.now();
  var bookings = lists.bookings.filter(function (item) {
    if (item.iCalUID === opts.excludeId) return false;
    if (bookingIsLive_(item, now)) {
      var props = eventProps_(item);
      var ends = props.source === 'console' && props.kind === 'hold' ? Date.parse(props.expiresAt) : NaN;
      // An unreadable expiresAt keeps the hold live but must not poison the next-expiry time.
      if (isFinite(ends) && opts.holdEnds) opts.holdEnds.push(ends);
      return true;
    }
    if (opts.expireStale) deleteExpiredHold_(item);
    return false;
  });
  var out = bookings.concat(lists.channels).map(itemRuleEvent_);
  lists.requests.forEach(function (item) {
    var props = eventProps_(item);
    if (item.iCalUID === opts.excludeId || props.status !== 'pending') return;
    if (isHoldActive(props.createdAt, now)) {
      out.push(itemRuleEvent_(item));
      if (opts.holdEnds) opts.holdEnds.push(Date.parse(props.createdAt) + HOLD_HOURS * 3600 * 1000);
    } else if (opts.expireStale) markExpired_(item);
  });
  return out;
}

/** A console hold that ran out is deleted, so other calendar readers stop seeing it too. */
function deleteExpiredHold_(item) {
  try {
    calendarCall_(calendarRequest_('bookings', 'delete', '/' + encodeURIComponent(item.id), { sendUpdates: 'none' }));
  } catch (err) {
    console.warn('could not delete an expired hold; it no longer blocks anyway', err);
    return;
  }
  try {
    var range = itemRange_(item);
    logEvent_('console.hold_expired', { id: item.iCalUID, start: range.start, end: range.end, nights: range.nights });
  } catch (ignored) {}
}

function markExpired_(item) {
  var props = eventProps_(item);
  props.status = 'expired';
  calendarCall_(
    calendarRequest_('requests', 'patch', '/' + encodeURIComponent(item.id), { fields: 'id' }, {
      summary: String(item.summary || '').replace(/^⏳\s*/, '⌛ פג תוקף · '),
      extendedProperties: { shared: props },
    })
  );
  try {
    var req = JSON.parse(props.request || '{}');
    logEvent_('request.expired', { ref: req.ref, id: item.iCalUID, start: req.start, end: req.end, nights: req.nights });
  } catch (ignored) {}
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
  var holdEnds = [];
  var result = {
    ok: true,
    from: from,
    to: to,
    blocked: blockedNights(blockingEvents_(from, to, { expireStale: true, holdEnds: holdEnds }), from, to),
    generatedAt: new Date().toISOString(),
  };
  // The timer rebuilds when the first of these holds runs out (mirrorsNeedRefresh_).
  PropertiesService.getScriptProperties().setProperty(NEXT_EXPIRY_KEY, holdEnds.length ? String(Math.min.apply(null, holdEnds)) : '');
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

/**
 * Rewrites the availability snapshot and the admin sheet. Failures are logged, never thrown.
 *
 * One rebuild at a time, but not under the script lock: a rebuild takes about 13 seconds, and guest
 * requests and owner decisions wait at most 20 for that lock, so a rebuild started by a calendar
 * change used to make them fail. A rebuild only reads the calendars and rewrites the sheets; a
 * decision made during one queues another rebuild, and the timer's change check catches anything
 * missed.
 */
function refreshMirrors_(why) {
  var mutex = acquireRefreshMutex_(30000);
  if (!mutex) {
    console.error('mirror refresh skipped: another one is still running');
    countLogNoise_('mirror.skipped');
    return;
  }
  try {
    // Taken before reading the calendars, so an edit made during the refresh is seen as new next time.
    var started = Date.now();
    var ok = true;
    var data = null;
    try {
      data = refreshAvailabilitySnapshot_();
    } catch (err) {
      ok = false;
      console.error('snapshot refresh failed', err);
    }
    try {
      syncAdminSheet_();
    } catch (err) {
      ok = false;
      console.error('admin sheet sync failed', err);
    }
    if (ok && data) {
      PropertiesService.getScriptProperties().setProperties({ [FULL_REFRESH_KEY]: String(started), [SNAPSHOT_FROM_KEY]: data.from });
    }
    logEvent_('mirror.rebuild', { ok: ok, ms: Date.now() - started, why: why || '' }, 'system');
  } finally {
    releaseRefreshMutex_(mutex);
  }
}

var REFRESH_MUTEX_KEY = 'mirrorRefreshRunning';
// Longer than any rebuild, so a crashed one cannot block the next for long.
var REFRESH_MUTEX_SECONDS = 120;

/** A best-effort "one rebuild at a time" flag in the script cache. Returns its token, or '' on timeout. */
function acquireRefreshMutex_(waitMs) {
  var cache = CacheService.getScriptCache();
  var token = Utilities.getUuid();
  var deadline = Date.now() + waitMs;
  while (true) {
    if (!cache.get(REFRESH_MUTEX_KEY)) {
      cache.put(REFRESH_MUTEX_KEY, token, REFRESH_MUTEX_SECONDS);
      // Two runs can both see it free; the one whose token stuck goes ahead.
      Utilities.sleep(200);
      if (cache.get(REFRESH_MUTEX_KEY) === token) return token;
    }
    if (Date.now() > deadline) return '';
    Utilities.sleep(1000);
  }
}

function releaseRefreshMutex_(token) {
  var cache = CacheService.getScriptCache();
  if (cache.get(REFRESH_MUTEX_KEY) === token) cache.remove(REFRESH_MUTEX_KEY);
}

var FULL_REFRESH_KEY = 'fullRefreshStartedAt';
var SNAPSHOT_FROM_KEY = 'snapshotFrom';
var NEXT_EXPIRY_KEY = 'nextHoldExpiry';
// A full rebuild at least this often, whatever the checks say.
var FULL_REFRESH_MAX_AGE_MS = 6 * 3600 * 1000;
// Calendar clocks and the "updated" stamp can disagree by a little; look back a minute further.
var CHANGE_SLACK_MS = 60 * 1000;

/**
 * Whether the spreadsheets may be out of date: never fully refreshed, the date rolled over (the
 * window moves), a hold has run out, the last full refresh is old, or any calendar event was added,
 * changed or deleted since it started. The calendar check asks each calendar for one event updated
 * since then, in parallel: about a second, against about 13 for a full rebuild.
 */
function mirrorsNeedRefresh_() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var last = Number(props[FULL_REFRESH_KEY] || 0);
  var now = Date.now();
  if (!last || now - last > FULL_REFRESH_MAX_AGE_MS) return 'stale';
  if (props[SNAPSHOT_FROM_KEY] !== today_()) return 'new day';
  if (props[NEXT_EXPIRY_KEY] && now >= Number(props[NEXT_EXPIRY_KEY])) return 'hold expired';
  var query = { updatedMin: new Date(last - CHANGE_SLACK_MS).toISOString(), showDeleted: 'true', maxResults: '1', fields: 'items(id)' };
  var keys = ['bookings', 'requests', 'channels'];
  var responses = UrlFetchApp.fetchAll(
    keys.map(function (key) {
      return calendarRequest_(key, 'get', '', query);
    })
  );
  for (var i = 0; i < keys.length; i++) {
    if ((calendarResponse_(responses[i]).items || []).length) return keys[i] + ' changed';
  }
  return '';
}

/** Nothing changed: the snapshot is still correct, so only its time is renewed (the site treats an old one as stale). */
function stampSnapshot_() {
  if (!CONFIG.availabilitySheetId) return;
  SpreadsheetApp.openById(CONFIG.availabilitySheetId)
    .getSheets()[0]
    .getRange(2, 3)
    .setNumberFormat('@')
    .setValue(new Date().toISOString());
}

var MIRROR_TRIGGER = 'onMirrorsDue';
var MIRROR_QUEUED_KEY = 'mirrorRefreshQueuedAt';

/**
 * Refreshing both spreadsheets takes about 6 seconds, too long to make a visitor wait. This queues it
 * as a one-off trigger that runs within about a minute; the timer catches up if that fails.
 */
function scheduleMirrorRefresh_() {
  try {
    // A property read is much faster than listing the project's triggers.
    var props = PropertiesService.getScriptProperties();
    if (Date.now() - Number(props.getProperty(MIRROR_QUEUED_KEY) || 0) < 3 * 60 * 1000) return;
    props.setProperty(MIRROR_QUEUED_KEY, String(Date.now()));
    ScriptApp.newTrigger(MIRROR_TRIGGER).timeBased().after(1000).create();
  } catch (err) {
    console.error('could not queue the spreadsheet refresh; the timer will catch up', err);
  }
}

/** One-off trigger queued by scheduleMirrorRefresh_. */
function onMirrorsDue() {
  PropertiesService.getScriptProperties().deleteProperty(MIRROR_QUEUED_KEY);
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === MIRROR_TRIGGER) ScriptApp.deleteTrigger(trigger);
  });
  refreshMirrors_('queued');
}

/** Installable trigger: any change in the booking calendars, including Saray's own edits. */
function onCalendarChange() {
  refreshMirrors_('calendar change');
}

/**
 * Installable trigger, every 10 minutes (5 without calendar triggers): keeps the web app warm, and
 * rebuilds both spreadsheets only when something changed. Most runs find nothing and take a few
 * seconds instead of 13, which matters on a free account: all its triggers share 90 minutes a day.
 * Each run ends by sending the event log's buffer to Firestore (EventLog.js).
 */
function onSnapshotTimer() {
  try {
    keepWarm_();
    var reason;
    try {
      reason = mirrorsNeedRefresh_();
    } catch (err) {
      reason = 'check failed';
      console.warn('change check failed; rebuilding', err);
    }
    if (!reason) return stampSnapshot_();
    console.log('rebuilding: ' + reason);
    currentPrices_('');
    refreshMirrors_(reason);
  } finally {
    // Last, so a slow Firestore can never delay the rebuild; it never throws.
    flushEventLog_(false);
  }
}

/** Calls the web app so Google keeps it warm between visitors; a cold start adds several seconds. */
function keepWarm_() {
  try {
    UrlFetchApp.fetch(CONFIG.webAppUrl + '?action=ping', { muteHttpExceptions: true });
  } catch (err) {
    console.warn('keep-warm ping failed', err);
  }
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

  refreshMirrors_('setup');
  console.log('4/4 tabs written. Setup done.');
}

// ---------------------------------------------------------------------------
// Admin sheet: one tab per calendar. Pending requests are decided by choosing אישור/דחייה in
// the פעולה column and then ticking ביצוע (the tick is the confirmation, and works on phones).

var ADMIN_TABS = { requests: 'בקשות', bookings: 'הזמנות', channels: 'ערוצים', cancellations: 'ביטולים' };
var REQUEST_COLUMNS = ['מספר בקשה', 'סטטוס', 'סוג אירוח', 'הגעה', 'עזיבה', 'לילות', 'אורחים', 'שם', 'טלפון', 'אימייל', 'הערות', 'הערכת מחיר', 'התקבלה', 'פעולה', 'ביצוע', 'WhatsApp', 'מזהה'];
var BOOKING_COLUMNS = ['כותרת', 'הגעה', 'עזיבה', 'לילות', 'מקור', 'סוג אירוח', 'אורחים', 'טלפון', 'אימייל', 'הערות', 'מספר', 'WhatsApp'];
var CHANNEL_COLUMNS = ['כותרת', 'הגעה', 'עזיבה', 'לילות'];
var CANCEL_COLUMNS = ['בוטלה', 'מספר', 'שם', 'טלפון', 'אימייל', 'סוג אירוח', 'הגעה', 'עזיבה', 'לילות', 'מחיר (באתר: הערכה)', 'אושרה', 'ביוזמת', 'דמי ביטול לפי התנאים', 'סיבה', 'מייל ביטול לאורח', 'מזהה'];
var ACTION_COL = 14;
var CONFIRM_COL = 15;
var ID_COL = 17;
var ACTION_APPROVE = 'אישור';
var ACTION_DECLINE = 'דחייה';
var DECISIONS_KEY = 'recentDecisions';
var BOOKING_SOURCE_LABELS = { website: 'אתר', manual: 'ידני', phone: 'טלפון', block: 'סגור', hold: 'שמירה זמנית' };
var DECISION_DAYS = 3;

function prepareAdminSheet_() {
  var ss = SpreadsheetApp.openById(CONFIG.adminSheetId);
  ss.setSpreadsheetLocale('iw_IL');
  ss.setSpreadsheetTimeZone(TZ);
  [
    [ADMIN_TABS.requests, REQUEST_COLUMNS],
    [ADMIN_TABS.bookings, BOOKING_COLUMNS],
    [ADMIN_TABS.channels, CHANNEL_COLUMNS],
    // The cancellations log is never rewritten, only appended to, so it must survive every setup.
    [ADMIN_TABS.cancellations, CANCEL_COLUMNS],
  ].forEach(function (tab, index) {
    var sheet = adminTab_(ss, tab[0], tab[1]);
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(index + 1);
  });
  var keep = [ADMIN_TABS.requests, ADMIN_TABS.bookings, ADMIN_TABS.channels, ADMIN_TABS.cancellations];
  ss.getSheets().forEach(function (sheet) {
    if (keep.indexOf(sheet.getName()) === -1) ss.deleteSheet(sheet);
  });
  var requests = ss.getSheetByName(ADMIN_TABS.requests);
  requests.hideColumns(ID_COL);
  requests.getRange(1, ACTION_COL).setNote('בחרי "אישור" או "דחייה", ואז סמני את תיבת הביצוע בעמודה הבאה.');
  requests.getRange(1, CONFIRM_COL).setNote('הסימון מבצע את הפעולה שנבחרה. זה שלב האישור.');
  protectAdminTabs_(ss);
  ss.setActiveSheet(requests);
}

/**
 * Only פעולה and ביצוע in בקשות are editable by others; everything else is rewritten from the
 * calendars, or (ביטולים) is a log only the web app writes.
 */
function protectAdminTabs_(ss) {
  [ADMIN_TABS.requests, ADMIN_TABS.bookings, ADMIN_TABS.channels, ADMIN_TABS.cancellations].forEach(function (name) {
    var sheet = ss.getSheetByName(name);
    sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).forEach(function (protection) {
      protection.remove();
    });
    var protection = sheet.protect().setDescription(name === ADMIN_TABS.cancellations ? CANCEL_LOG_PROTECTION : 'נכתב אוטומטית מהיומנים. אפשר לערוך רק פעולה וביצוע בלשונית בקשות.');
    if (name === ADMIN_TABS.requests) {
      protection.setUnprotectedRanges([sheet.getRange(2, ACTION_COL, sheet.getMaxRows() - 1, CONFIRM_COL - ACTION_COL + 1)]);
    }
    protection.removeEditors(protection.getEditors());
    if (protection.canDomainEdit()) protection.setDomainEdit(false);
  });
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

/** Removes the given request numbers from the recent-decisions list (e.g. test requests) and rewrites the sheets. */
function pruneDecisions_(refs) {
  var remove = {};
  (refs || []).forEach(function (ref) {
    remove[String(ref)] = true;
  });
  var props = PropertiesService.getScriptProperties();
  var list = JSON.parse(props.getProperty(DECISIONS_KEY) || '[]');
  var kept = list.filter(function (d) {
    return !remove[d.ref];
  });
  props.setProperty(DECISIONS_KEY, JSON.stringify(kept));
  refreshMirrors_('decisions pruned');
  return {
    ok: true,
    removed: list.length - kept.length,
    kept: kept.map(function (d) {
      return d.ref + ' ' + d.name + ' ' + d.result;
    }),
  };
}

/** The admin sheet's אורחים cell: overnight guests, plus day participants for the bride-day packages. */
function guestsCell_(r) {
  return r.participants ? text_(r.adults + ' · ' + r.participants + ' ביום') : r.adults;
}

function writeTab_(sheet, width, rows) {
  var old = sheet.getMaxRows() - 1;
  if (old > 0) sheet.getRange(2, 1, old, width).clearDataValidations().clearContent().setBackground(null);
  if (rows.length) sheet.getRange(2, 1, rows.length, width).setValues(rows);
}

var MIRRORS_REFRESHED_KEY = 'mirrorsRefreshedAt';

/**
 * What the admin sheet and the owner console show, read from the calendars: pending and expired
 * requests, decisions of the last DECISION_DAYS days, bookings (website and manual) and channel
 * bookings, from 30 days back to the end of the booking window. Both views are built from this, so
 * they cannot disagree. `lists` keeps the raw calendar items for callers that need more.
 */
function adminData_() {
  var today = today_();
  var now = Date.now();
  var nowLocal = fmt_(new Date(now), "yyyy-MM-dd'T'HH:mm");
  var lists = listEvents_(['requests', 'bookings', 'channels'], localDate_(addDays(today, -30)), localDate_(addDays(today, HORIZON_DAYS + 1)));
  // A console hold that ran out no longer exists for anyone; the next availability rebuild deletes it.
  lists.bookings = lists.bookings.filter(function (item) {
    return bookingIsLive_(item, now);
  });
  var stayLabel = function (type) {
    return STAY_TYPES[type] ? STAY_TYPES[type].label : '';
  };
  var requests = lists.requests.map(function (item) {
    var props = eventProps_(item);
    var req = JSON.parse(props.request || '{}');
    var range = itemRange_(item);
    var createdAt = props.createdAt || '';
    return {
      id: item.iCalUID,
      ref: req.ref || '',
      holding: props.status === 'pending' && isHoldActive(createdAt, now),
      holdUntil: createdAt ? new Date(Date.parse(createdAt) + HOLD_HOURS * 3600000).toISOString() : '',
      stayType: req.stayType || '',
      stayLabel: stayLabel(req.stayType),
      checkIn: req.checkIn || range.start,
      start: range.start,
      end: range.end,
      nights: range.nights,
      adults: req.adults || '',
      participants: req.participants || 0,
      name: req.name || item.summary || '',
      phone: req.phone || '',
      email: req.email || '',
      notes: req.notes || '',
      estimate: req.estimate || 0,
      createdAt: createdAt,
      whatsapp: req.phone ? waLink_(req.phone, 'שלום ' + req.name + ', קיבלנו את בקשת ההזמנה שלך בשורשים') : '',
    };
  });
  var cutoff = now - DECISION_DAYS * 86400000;
  var decisions = JSON.parse(PropertiesService.getScriptProperties().getProperty(DECISIONS_KEY) || '[]')
    .filter(function (d) {
      return Date.parse(d.at) > cutoff;
    })
    .map(function (d) {
      return {
        at: d.at,
        result: d.result,
        ref: d.ref || '',
        name: d.name || '',
        phone: d.phone || '',
        stayType: d.stayType || '',
        stayLabel: stayLabel(d.stayType),
        start: d.start,
        end: d.end,
        nights: daysBetween(d.start, d.end),
        whatsapp: d.whatsapp || '',
      };
    });
  var bookings = lists.bookings.map(function (item) {
    var props = eventProps_(item);
    var req = JSON.parse(props.request || '{}');
    var range = itemRange_(item);
    var startsAt = stayStartsAt(req.stayType, range.start);
    var cancellable = isCancellable_(item, props) && nowLocal < startsAt;
    var confirmed = bookingConfirmed_(item, props);
    return {
      id: item.iCalUID,
      title: item.summary || '',
      start: range.start,
      end: range.end,
      nights: range.nights,
      source: props.source === 'website' ? 'website' : props.source === 'console' ? 'console' : 'manual',
      // website, manual (made in Google Calendar), or a console closing: block, phone, hold.
      kind: props.source === 'website' ? 'website' : props.source === 'console' ? props.kind : 'manual',
      reason: props.reason || '',
      holder: props.holder || '',
      blockNote: props.kind === 'phone' ? '' : props.note || '',
      expiresAt: props.expiresAt || '',
      createdAt: props.createdAt || '',
      // Only console closings and holds can be reopened from the console. Bookings, and manual events
      // made in Google Calendar (which may be a guest's stay), are changed in the calendar itself.
      reopenable: isReopenable_(item, props),
      // Website and phone bookings can be cancelled from the console until the stay starts.
      // cancelFees is what the terms set if the guest cancels now, and if we do.
      cancellable: cancellable,
      confirmedAt: confirmed,
      cancelFees: cancellable ? cancelFees_(startsAt, confirmed, nowLocal, req.estimate) : null,
      stayType: req.stayType || '',
      stayLabel: stayLabel(req.stayType),
      adults: req.adults || '',
      participants: req.participants || 0,
      name: req.name || '',
      phone: req.phone || '',
      email: req.email || '',
      // A phone booking's internal note is a private property (the guest's copy never has it).
      notes: req.notes || (props.kind === 'phone' ? props.note || '' : ''),
      estimate: req.estimate || 0,
      ref: req.ref || '',
      whatsapp: req.phone ? waLink_(req.phone, 'שלום ' + req.name + ', ') : '',
    };
  });
  var channels = lists.channels.map(function (item) {
    var range = itemRange_(item);
    return { id: item.iCalUID, title: item.summary || '', start: range.start, end: range.end, nights: range.nights };
  });
  return { today: today, lists: lists, requests: requests, decisions: decisions, bookings: bookings, channels: channels };
}

function syncAdminSheet_() {
  if (!CONFIG.adminSheetId) return;
  var ss = SpreadsheetApp.openById(CONFIG.adminSheetId);
  var data = adminData_();
  var money = function (n) {
    return n ? text_('₪' + Number(n).toLocaleString('en-US')) : '';
  };

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
  var pending = data.requests.map(function (r) {
    return [
      text_(r.ref),
      r.holding ? 'ממתינה – התאריכים שמורים' : 'ממתינה – פג תוקף השמירה',
      r.stayLabel,
      text_(heDate_(r.start)),
      text_(heDate_(r.end)),
      r.nights,
      guestsCell_(r),
      text_(r.name),
      text_(r.phone),
      text_(r.email),
      text_(r.notes),
      money(r.estimate),
      r.createdAt ? text_(fmt_(new Date(r.createdAt), 'dd.MM.yyyy HH:mm')) : '',
      chosen[r.id] || '',
      false,
      sheetLink_(r.whatsapp, 'WhatsApp'),
      r.id,
    ];
  });
  var decided = data.decisions.map(function (d) {
    var approved = d.result === 'approved';
    return [
      text_(d.ref),
      approved ? 'אושרה ✓' : 'נדחתה ✗',
      d.stayLabel,
      text_(heDate_(d.start)),
      text_(heDate_(d.end)),
      d.nights,
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
    data.bookings.map(function (b) {
      return [
        text_(b.title),
        text_(heDate_(b.start)),
        text_(heDate_(b.end)),
        b.nights,
        BOOKING_SOURCE_LABELS[b.kind] || 'ידני',
        b.stayLabel,
        guestsCell_(b),
        text_(b.phone),
        text_(b.email),
        text_([b.reason, b.holder, b.notes || b.blockNote, b.expiresAt ? 'נפתח לבד ' + fmt_(new Date(b.expiresAt), 'dd.MM.yyyy HH:mm') : ''].filter(Boolean).join(' · ')),
        text_(b.ref),
        sheetLink_(b.whatsapp, 'WhatsApp'),
      ];
    })
  );

  var channels = adminTab_(ss, ADMIN_TABS.channels, CHANNEL_COLUMNS);
  writeTab_(
    channels,
    CHANNEL_COLUMNS.length,
    data.channels.map(function (c) {
      return [text_(c.title), text_(heDate_(c.start)), text_(heDate_(c.end)), c.nights];
    })
  );
  PropertiesService.getScriptProperties().setProperty(MIRRORS_REFRESHED_KEY, new Date().toISOString());
}

// ---------------------------------------------------------------------------
// Owner console: the page at shorashimstay.com/admin (public/admin/index.html). The page is public
// and holds no secrets. The owner logs in with a password checked here against a salted hash in
// CONFIG (from booking-config.json, never in the repo), and gets a session token signed with the
// HMAC secret. Sessions do not expire; "log out everywhere" bumps a version that every token names.
// Every console decision goes through decideAndRecord_, like the email link and the sheet.

var CONSOLE_FAILS_KEY = 'console:fails';
var CONSOLE_MAX_FAILS = 5;
var CONSOLE_LOCK_SECONDS = 15 * 60;
var CONSOLE_SESSION_VERSION_KEY = 'consoleSessionVersion';

/**
 * A console call is allowed with a session token from the login, or with an HMAC signature over the
 * operation and its arguments (the test suite and tools, which hold the secret).
 */
function consoleRequest_(body) {
  if (body.op === 'login') return consoleLogin_(body.password);
  var signed = body.sig && validSig_(consoleSigned_(body), body.sig) && Math.abs(Date.now() - Number(body.t)) < 300000;
  if (!signed && !validSession_(body.token)) return { ok: false, error: 'unauthorized' };
  return consoleCall_(body);
}

/**
 * What a console call's signature covers: the operation and its arguments, not only the time. Calls
 * with structured arguments (closing dates) have them appended as JSON, so they are covered too.
 */
function consoleSigned_(body) {
  var signed = ['console', body.t, body.op, body.id || '', body.decision || ''].join(':');
  return body.args ? signed + ':' + JSON.stringify(body.args) : signed;
}

function consoleCall_(body) {
  if (body.op === 'overview') return consoleOverview_();
  if (body.op === 'decide') return decideAndRecord_(body.decision, String(body.id || ''), false, 'console');
  // Logged inside consoleOnce_, so a retry that only replays the stored result is not logged again.
  if (body.op === 'block') return consoleOnce_('block', body.args && body.args.requestId, function () {
    return logConsole_('block', '', closeDates_(body.args || {}));
  });
  // Both run once per requestId too: a retried "extend" must not add the hours twice.
  if (body.op === 'unblock') return consoleOnce_('unblock', body.args && body.args.requestId, function () {
    return logConsole_('unblock', body.id, reopenDates_(String(body.id || '')));
  });
  if (body.op === 'extendHold') return consoleOnce_('extendHold', body.args && body.args.requestId, function () {
    return logConsole_('extendHold', body.id, extendHold_(String(body.id || ''), body.args || {}));
  });
  if (body.op === 'cancelBooking') return consoleOnce_('cancelBooking', body.args && body.args.requestId, function () {
    return logConsole_('cancelBooking', body.id, cancelBooking_(String(body.id || ''), body.args || {}));
  });
  if (body.op === 'logoutAll') {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(CONSOLE_SESSION_VERSION_KEY, String(Number(props.getProperty(CONSOLE_SESSION_VERSION_KEY) || 1) + 1));
    logEvent_('console.logout_all', {}, 'console');
    return { ok: true, loggedOut: true };
  }
  return { ok: false, error: 'bad_request' };
}

/**
 * Logs a console write's outcome and returns the result unchanged. The log keeps only its
 * allowlisted fields (EventLog.js), so the guest's name and the WhatsApp link stay out.
 */
function logConsole_(op, id, result) {
  var fields = {};
  Object.keys(result || {}).forEach(function (k) {
    fields[k] = result[k];
  });
  if (!fields.id && id) fields.id = String(id);
  if (result && result.fee && typeof result.fee === 'object') {
    fields.fee = result.fee.fee;
    fields.band = result.fee.band;
  }
  logEvent_('console.' + op, fields, 'console');
  return result;
}

/**
 * CONFIG.consolePasswordHash is "salt$hash": web-safe base64 of HMAC-SHA256 over the password, keyed
 * with the salt and the HMAC secret (deploy.py --set-console-password makes it). After
 * CONSOLE_MAX_FAILS wrong passwords, logins pause for CONSOLE_LOCK_SECONDS. Apps Script cannot see
 * who is calling, so the pause applies to everyone; the sheet and the email links still work.
 */
function consoleLogin_(password) {
  var stored = String(CONFIG.consolePasswordHash || '');
  var salt = stored.split('$')[0];
  if (!salt || stored.indexOf('$') < 0) return { ok: false, error: 'not_configured' };
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get(CONSOLE_FAILS_KEY) || 0);
  if (fails >= CONSOLE_MAX_FAILS) {
    countLogNoise_('console.login_locked');
    return { ok: false, error: 'locked', minutes: CONSOLE_LOCK_SECONDS / 60 };
  }
  var hash = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(password || ''), salt + CONFIG.hmacSecret)).replace(/=+$/, '');
  if (salt + '$' + hash !== stored) {
    cache.put(CONSOLE_FAILS_KEY, String(fails + 1), CONSOLE_LOCK_SECONDS);
    logEvent_('console.login_failed', { result: fails + 1 >= CONSOLE_MAX_FAILS ? 'locked' : '' }, 'console');
    return { ok: false, error: 'wrong_password', attemptsLeft: CONSOLE_MAX_FAILS - fails - 1 };
  }
  cache.remove(CONSOLE_FAILS_KEY);
  logEvent_('console.login', {}, 'console');
  var payload = sessionVersion_() + '.' + Date.now().toString(36) + '.' + Utilities.getUuid().slice(0, 8);
  return { ok: true, token: payload + '.' + sign_('session:' + payload) };
}

/**
 * What every current token must name: the "log out everywhere" counter and the password's salt. A
 * new password (deploy.py --set-console-password, which makes a new salt) therefore logs out every
 * device, as does bumping the counter.
 */
function sessionVersion_() {
  var counter = PropertiesService.getScriptProperties().getProperty(CONSOLE_SESSION_VERSION_KEY) || '1';
  return 'v' + counter + '-' + String(CONFIG.consolePasswordHash || '').split('$')[0].replace(/[^\w]/g, '');
}

/** A token is "<version>.<issued>.<nonce>.<signature>" and is valid while its version is current. */
function validSession_(token) {
  var parts = String(token || '').split('.');
  if (parts.length !== 4) return false;
  var payload = parts.slice(0, 3).join('.');
  if (!validSig_('session:' + payload, parts[3])) return false;
  return parts[0] === sessionVersion_();
}

/**
 * Everything the console shows. Each pending request carries the nights that now block it (other
 * bookings, channel bookings and active holds), so the console can refuse approval the way the
 * decision page does.
 */
function consoleOverview_() {
  var data = adminData_();
  var now = Date.now();
  var fixed = data.lists.bookings.concat(data.lists.channels).map(itemRuleEvent_);
  var holds = data.lists.requests.filter(function (item) {
    var props = eventProps_(item);
    return props.status === 'pending' && isHoldActive(props.createdAt, now);
  });
  data.requests.forEach(function (r) {
    var others = fixed.concat(
      holds
        .filter(function (item) {
          return item.iCalUID !== r.id;
        })
        .map(itemRuleEvent_)
    );
    r.conflicts = conflictingNights(blockedNights(others, r.start, r.end), r.start, r.end);
  });
  var props = PropertiesService.getScriptProperties();
  return {
    ok: true,
    today: data.today,
    generatedAt: new Date().toISOString(),
    holdHours: HOLD_HOURS,
    // For the console's closing form: the reasons and hold lengths it offers, and the prices it
    // uses to suggest a phone booking's price (the backend stores whatever price is entered).
    blockReasons: BLOCK_REASONS,
    holdChoices: HOLD_CHOICES,
    prices: currentPrices_('').prices,
    requests: data.requests,
    decisions: data.decisions,
    bookings: data.bookings,
    channels: data.channels,
    health: {
      staging: CONFIG.testHooks === true,
      mirrorsRefreshedAt: props.getProperty(MIRRORS_REFRESHED_KEY) || '',
      pricesVersion: currentPrices_('').version,
      triggers: ScriptApp.getProjectTriggers().map(function (tr) {
        return tr.getHandlerFunction();
      }),
    },
  };
}

/**
 * Staging only (CONFIG.testHooks): pins the web app to the suite's test prices, the same ones its
 * site is built with, instead of the staging prices sheet; null clears it.
 */
function testSetPrices_(file) {
  var props = PropertiesService.getScriptProperties();
  if (file === null) {
    props.deleteProperty(PRICES_OVERRIDE_KEY);
    return { ok: true, cleared: true };
  }
  var checked = checkPrices(file);
  if (!checked.ok) return { ok: false, error: checked.error };
  props.setProperty(PRICES_OVERRIDE_KEY, JSON.stringify({ version: checked.version, prices: checked.prices }));
  return { ok: true, version: checked.version };
}

/**
 * Staging only (CONFIG.testHooks): Google fires onEdit only for edits typed in the Sheets UI, never for
 * API edits, so the regression suite makes its edit through the Sheets API and then hands that cell
 * to the real handler here.
 */
function testFireSheetEdit_(row) {
  var sheet = SpreadsheetApp.openById(CONFIG.adminSheetId).getSheetByName(ADMIN_TABS.requests);
  onSheetEdit({ range: sheet.getRange(Number(row), CONFIRM_COL) });
  return { ok: true, confirmTicked: sheet.getRange(Number(row), CONFIRM_COL).getValue() === true };
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
  var result = decideAndRecord_(choice === ACTION_APPROVE ? 'approve' : 'decline', id, true, 'sheet');
  if (!result.ok) {
    e.range.setValue(false);
    var messages = { not_found: 'הבקשה כבר טופלה.', unavailable: 'חלק מהלילות כבר תפוסים, אי אפשר לאשר.' };
    ss.toast(messages[result.error] || 'משהו השתבש, נסי שוב.', 'שורשים', 10);
    refreshMirrors_('sheet decision refused');
    return;
  }
  ss.toast(
    result.result === 'approved' ? 'ההזמנה אושרה ועברה ללשונית הזמנות.' : 'הבקשה נדחתה והתאריכים נפתחו.',
    'שורשים',
    8
  );
}

// ---------------------------------------------------------------------------
// Closing dates from the console (shared/rules.js validateBlock). A closing is an all-day event in
// the bookings calendar, the calendar every reader already treats as taken, so the website, the
// console, the admin sheet and any channel feed built from that calendar see it with no extra wiring.
// Its details are shared extended properties: source "console", kind, reason or guest, note, and
// for a hold its expiresAt.

/**
 * Runs a console write once per requestId, like createRequest_: the page retries when Google loses
 * an answer, and a retry must not close the dates twice. Without a requestId it just runs.
 */
function consoleOnce_(op, requestId, fn) {
  var key = /^[\w-]{8,64}$/.test(String(requestId || '')) ? 'console:' + op + ':' + requestId : '';
  if (!key) return fn();
  var cache = CacheService.getScriptCache();
  var claim = LockService.getUserLock();
  claim.waitLock(10000);
  try {
    var previous = cache.get(key);
    if (previous) return previous === IN_PROGRESS ? { ok: false, error: IN_PROGRESS } : JSON.parse(previous);
    cache.put(key, IN_PROGRESS, 300);
  } finally {
    claim.releaseLock();
  }
  var result;
  try {
    result = fn();
  } catch (err) {
    cache.remove(key);
    throw err;
  }
  cache.put(key, JSON.stringify(result), 3600);
  return result;
}

/** The event that stores a validated closing. */
function closingEvent_(c, ref) {
  var props = { source: 'console', kind: c.kind, createdAt: new Date().toISOString() };
  // The note is a private property: Google copies shared properties to invited guests' events.
  var priv = c.note ? { note: c.note } : {};
  if (c.kind === 'block') {
    props.reason = c.reason;
    return { summary: '🔒 סגור · ' + c.reason, description: [c.note, 'נסגר מהמסוף'].filter(Boolean).join('\n'), start: { date: c.start }, end: { date: c.end }, transparency: 'opaque', extendedProperties: { shared: props, private: priv } };
  }
  if (c.kind === 'hold') {
    props.expiresAt = new Date(Date.now() + c.hours * 3600 * 1000).toISOString();
    if (c.name) props.holder = c.name;
    return {
      summary: '⏳ שמירה זמנית' + (c.name ? ' · ' + c.name : ''),
      description: [c.note, 'נפתח לבד ב-' + fmt_(new Date(props.expiresAt), 'dd.MM.yyyy HH:mm')].filter(Boolean).join('\n'),
      start: { date: c.start },
      end: { date: c.end },
      extendedProperties: { shared: props, private: priv },
    };
  }
  // A phone booking is stored like an approved website booking, so every view treats it as one. The
  // guest may be invited, so the title and description are guest-safe; the note stays in the properties.
  var wedding = STAY_TYPES[c.stayType].wedding;
  var req = {
    stayType: c.stayType,
    checkIn: wedding ? addDays(c.end, -1) : c.start,
    checkOut: c.end,
    start: c.start,
    end: c.end,
    nights: c.nights,
    adults: c.adults,
    participants: 0,
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: '',
    estimate: c.price,
    ref: ref,
  };
  props.request = JSON.stringify(req);
  var booking = {
    summary: 'שורשים · ' + c.name,
    description: guestDescription_(req),
    location: ADDRESS,
    start: { date: c.start },
    end: { date: c.end },
    extendedProperties: { shared: props, private: priv },
  };
  if (c.email) booking.attendees = [{ email: c.email }];
  return booking;
}

/**
 * The console's "close dates": validates, refuses nights already taken (bookings, channel bookings,
 * active request holds and console holds), creates the event under the script lock, and rewrites
 * the website's availability snapshot before answering, so the site shows the nights as taken
 * within about a minute. args.replaceId turns that console hold into this closing.
 */
function closeDates_(args) {
  var check = validateBlock(args, today_());
  if (!check.ok) return { ok: false, error: 'invalid', fields: check.errors };
  var c = check.value;
  var replace = String(args.replaceId || '');
  var replaced = null;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var created;
  try {
    if (replace) {
      replaced = findBooking_(replace);
      var rp = replaced ? eventProps_(replaced) : {};
      if (!replaced || rp.source !== 'console' || rp.kind !== 'hold') return { ok: false, error: 'not_found' };
    }
    var conflicts = conflictsFor_(c.start, c.end, { expireStale: true, excludeId: replace || undefined });
    if (conflicts.length) return { ok: false, error: 'unavailable', nights: conflicts };
    var ref = c.kind === 'phone' ? newRef_() : '';
    var event = closingEvent_(c, ref);
    var query = { fields: 'id,iCalUID', sendUpdates: c.kind === 'phone' && c.email ? 'all' : 'none' };
    created = calendarCall_(calendarRequest_('bookings', 'post', '', query, event));
    if (replaced) calendarCall_(calendarRequest_('bookings', 'delete', '/' + encodeURIComponent(replaced.id), { sendUpdates: 'none' }));
    invalidateAvailability_();
  } finally {
    lock.releaseLock();
  }
  var snapshot = refreshSnapshotQuietly_();
  scheduleMirrorRefresh_();
  var result = { ok: true, result: c.kind === 'phone' ? 'booked' : c.kind === 'hold' ? 'held' : 'blocked', id: created.iCalUID, kind: c.kind, start: c.start, end: c.end, nights: c.nights, snapshot: snapshot };
  if (c.kind === 'hold') result.expiresAt = event.extendedProperties.shared.expiresAt;
  if (c.kind === 'phone') {
    result.ref = ref;
    result.invited = !!c.email;
    result.whatsapp = waLink_(c.phone, 'שלום ' + c.name + ', ההזמנה שלך בשורשים נקבעה (' + heDate_(c.start) + '–' + heDate_(c.end) + '). מחכים לכם!');
  }
  return result;
}

/** Rewrites the availability snapshot now; a failure only means waiting for the queued refresh. */
function refreshSnapshotQuietly_() {
  try {
    refreshAvailabilitySnapshot_();
    return true;
  } catch (err) {
    console.error('snapshot refresh after a console change failed; the queued refresh will retry', err);
    return false;
  }
}

/** The bookings-calendar event with this iCalUID, or null. */
function findBooking_(id) {
  if (!id) return null;
  var page = calendarCall_(calendarRequest_('bookings', 'get', '', { iCalUID: id, showDeleted: 'false', fields: 'items(id,iCalUID,status,summary,created,start,end,extendedProperties,attendees(email),recurrence,recurringEventId)' }));
  return (page.items || []).filter(function (item) {
    return item.status !== 'cancelled';
  })[0] || null;
}

/**
 * Console closings and holds can be reopened from the console. Everything else is refused: website
 * and phone bookings are cancelled instead (cancelBooking_), which logs them and lets the owner
 * choose whether Google tells the guest; a manual event made in Google Calendar may be a guest's
 * stay; and a recurring event would go as a whole series.
 */
function isReopenable_(item, props) {
  if (item.recurrence || item.recurringEventId) return false;
  return props.source === 'console' && (props.kind === 'block' || props.kind === 'hold');
}

/**
 * Website and phone bookings can be cancelled from the console. Closings and holds are reopened
 * instead; a manual event made in Google Calendar is changed there (it may not be a stay at all), and
 * a recurring event would go as a whole series. Channel bookings are not in this calendar: they are
 * cancelled on the booking site, or the next import would bring them back.
 */
function isCancellable_(item, props) {
  if (item.recurrence || item.recurringEventId) return false;
  return props.source === 'website' || (props.source === 'console' && props.kind === 'phone');
}

/** The local date a booking was confirmed: when its event was made (approval, or the phone booking). */
function bookingConfirmed_(item, props) {
  var at = Date.parse(props.createdAt || item.created || '');
  return isNaN(at) ? '' : fmt_(new Date(at), 'yyyy-MM-dd');
}

/** The fee the terms set for cancelling now, by the guest and by us (shared/rules.js cancellationFee). */
function cancelFees_(startsAt, confirmed, nowLocal, price) {
  var fee = function (by) {
    return cancellationFee({ startsAt: startsAt, confirmed: confirmed, now: nowLocal, price: Number(price) || 0, by: by });
  };
  return { guest: fee('guest'), us: fee('us') };
}

var CANCEL_BY = { guest: 'האורח', us: 'אנחנו' };
var CANCEL_LOG_PROTECTION = 'יומן ביטולים: נכתב רק מהמסוף, ואינו נכתב מחדש מהיומנים.';
var FEE_BAND_LABELS = { ours: 'ללא (ביטול שלנו)', free: 'ללא חיוב', half: '50%', full: '100%', statutory: 'לפי החוק: 5% או 100 ₪, הנמוך' };

/** The fee as the log and the owner read it: the band, and the amount when the price is known. */
function feeText_(fee) {
  return FEE_BAND_LABELS[fee.band] + (fee.fee === null ? '' : ' · ₪' + Number(fee.fee).toLocaleString('en-US'));
}

/**
 * Cancels a website or phone booking: logs it in ביטולים, then deletes its event. args.by is 'guest'
 * or 'us'; args.notify must be given as true or false, because the owner decides each time whether
 * Google emails the guest a cancellation (it only can when the booking has an email). The log line
 * is written first, so a cancelled booking always has its record (see the delete's error handling).
 * A stay that has started (check-in time on its first night, stayStartsAt) is refused; shortening
 * one is a separate feature. For a website booking the price is the site's estimate, which the
 * console and the log say.
 */
function cancelBooking_(id, args) {
  args = args || {};
  if (args.by !== 'guest' && args.by !== 'us') return { ok: false, error: 'invalid', fields: { by: 'invalid' } };
  if (typeof args.notify !== 'boolean') return { ok: false, error: 'invalid', fields: { notify: 'required' } };
  var reason = String(args.reason || '').trim();
  if (reason.length > NOTES_MAX) return { ok: false, error: 'invalid', fields: { reason: 'too_long' } };
  if (!CONFIG.adminSheetId) return { ok: false, error: 'not_configured' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var item, props, req, range, fee, emailed;
  try {
    item = findBooking_(id);
    if (!item) return { ok: false, error: 'not_found' };
    props = eventProps_(item);
    if (!isCancellable_(item, props)) return { ok: false, error: 'not_cancellable' };
    range = itemRange_(item);
    req = JSON.parse(props.request || '{}');
    var nowLocal = fmt_(new Date(), "yyyy-MM-dd'T'HH:mm");
    var startsAt = stayStartsAt(req.stayType, range.start);
    if (nowLocal >= startsAt) return { ok: false, error: 'started' };
    var confirmed = bookingConfirmed_(item, props);
    fee = cancellationFee({ startsAt: startsAt, confirmed: confirmed, now: nowLocal, price: Number(req.estimate) || 0, by: args.by });
    emailed = args.notify && (item.attendees || []).length > 0;
    var log = cancellationsLog_();
    log.appendRow([
      text_(fmt_(new Date(), 'dd.MM.yyyy HH:mm')),
      text_(req.ref),
      text_(req.name || item.summary),
      text_(req.phone),
      text_(req.email),
      STAY_TYPES[req.stayType] ? STAY_TYPES[req.stayType].label : '',
      text_(heDate_(range.start)),
      text_(heDate_(range.end)),
      range.nights,
      req.estimate ? text_('₪' + Number(req.estimate).toLocaleString('en-US') + (props.source === 'website' ? ' (הערכה)' : '')) : '',
      confirmed ? text_(heDate_(confirmed)) : '',
      CANCEL_BY[args.by],
      text_(feeText_(fee)),
      text_(reason),
      emailed ? 'נשלח' : (item.attendees || []).length ? 'לא נשלח' : 'אין מייל',
      text_(item.iCalUID),
    ]);
    var row = log.getLastRow();
    try {
      calendarCall_(calendarRequest_('bookings', 'delete', '/' + encodeURIComponent(item.id), { sendUpdates: emailed ? 'all' : 'none' }));
    } catch (err) {
      // An error does not prove the event survived: Google may have deleted it and then answered
      // 5xx, timed out, or said 404/410 to a delete that already happened. Only an event that is
      // still there undoes the line; one that is gone was cancelled, so its line stays. When neither
      // is known, the line stays marked for checking: a line too many beats a cancellation without one.
      var survived;
      try {
        survived = !!findBooking_(id);
      } catch (checkErr) {
        survived = null;
      }
      if (survived === true) {
        log.deleteRow(row);
        throw err;
      }
      if (survived === null) {
        log.getRange(row, 1).setValue(text_(fmt_(new Date(), 'dd.MM.yyyy HH:mm') + ' · לא ודאי: לבדוק ביומן'));
        throw err;
      }
      console.warn('the delete reported an error but the event is gone; the cancellation stands', err);
    }
    invalidateAvailability_();
  } finally {
    lock.releaseLock();
  }
  var snapshot = refreshSnapshotQuietly_();
  scheduleMirrorRefresh_();
  var name = req.name || item.summary || '';
  // Wedding packages are named by the wedding date, as in the approval message.
  var dates = STAY_TYPES[req.stayType] && STAY_TYPES[req.stayType].wedding ? stayDatesShort_(req) : heDate_(range.start) + '–' + heDate_(range.end);
  var text = args.by === 'us'
    ? 'שלום ' + name + ', לצערנו נאלצנו לבטל את ההזמנה שלך בשורשים (' + dates + '). נשמח לתאם מועד אחר, או להחזיר את מלוא התשלום.'
    : 'שלום ' + name + ', ההזמנה שלך בשורשים (' + dates + ') בוטלה לבקשתך.';
  return {
    ok: true,
    result: 'cancelled',
    id: id,
    ref: req.ref || '',
    name: name,
    start: range.start,
    end: range.end,
    nights: range.nights,
    by: args.by,
    emailed: emailed,
    fee: fee,
    feeText: feeText_(fee),
    estimated: props.source === 'website',
    snapshot: snapshot,
    whatsapp: req.phone ? waLink_(req.phone, text) : '',
  };
}

/** The ביטולים tab, made with its header the first time it is needed (setup also makes it). */
function cancellationsLog_() {
  var ss = SpreadsheetApp.openById(CONFIG.adminSheetId);
  var sheet = ss.getSheetByName(ADMIN_TABS.cancellations);
  if (sheet) return sheet;
  sheet = adminTab_(ss, ADMIN_TABS.cancellations, CANCEL_COLUMNS);
  var protection = sheet.protect().setDescription(CANCEL_LOG_PROTECTION);
  protection.removeEditors(protection.getEditors());
  if (protection.canDomainEdit()) protection.setDomainEdit(false);
  return sheet;
}

/** Staging only (CONFIG.testHooks): removes the suite's lines (names carrying `tag`) from ביטולים. */
function testPruneCancellations_(tag) {
  tag = String(tag || '');
  if (tag.length < 4 || !CONFIG.adminSheetId) return { ok: true, removed: 0 };
  var sheet = SpreadsheetApp.openById(CONFIG.adminSheetId).getSheetByName(ADMIN_TABS.cancellations);
  if (!sheet || sheet.getLastRow() < 2) return { ok: true, removed: 0 };
  var names = sheet.getRange(2, 3, sheet.getLastRow() - 1, 1).getValues();
  var removed = 0;
  // Bottom up, so the rows still to check keep their numbers.
  for (var i = names.length - 1; i >= 0; i--) {
    if (String(names[i][0]).indexOf(tag) !== -1) {
      sheet.deleteRow(i + 2);
      removed++;
    }
  }
  return { ok: true, removed: removed };
}

/** Reopens a console closing or hold by deleting its event. */
function reopenDates_(id) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var item = findBooking_(id);
    if (!item) return { ok: false, error: 'not_found' };
    if (!isReopenable_(item, eventProps_(item))) return { ok: false, error: 'is_booking' };
    calendarCall_(calendarRequest_('bookings', 'delete', '/' + encodeURIComponent(item.id), { sendUpdates: 'none' }));
    invalidateAvailability_();
  } finally {
    lock.releaseLock();
  }
  var range = itemRange_(item);
  var snapshot = refreshSnapshotQuietly_();
  scheduleMirrorRefresh_();
  return { ok: true, result: 'reopened', id: id, start: range.start, end: range.end, nights: range.nights, snapshot: snapshot };
}

/**
 * Gives a live console hold args.hours more, from its current end, up to HOLD_MAX_HOURS after it was
 * made. A hold that already ran out is not revived: its nights may have been requested since.
 */
function extendHold_(id, args) {
  var hours = Number(args.hours);
  if (!(hours >= 1 && hours <= HOLD_MAX_HOURS && Math.floor(hours) === hours)) return { ok: false, error: 'invalid' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var until;
  try {
    var item = findBooking_(id);
    var props = item ? eventProps_(item) : {};
    if (!item || props.source !== 'console' || props.kind !== 'hold') return { ok: false, error: 'not_found' };
    var now = Date.now();
    var current = Date.parse(props.expiresAt);
    if (!(current > now)) return { ok: false, error: 'expired' };
    var created = Date.parse(props.createdAt);
    var cap = (isNaN(created) ? now : created) + HOLD_MAX_HOURS * 3600 * 1000;
    until = Math.min(current + hours * 3600 * 1000, cap);
    if (until <= current) return { ok: false, error: 'max_reached', expiresAt: props.expiresAt };
    var shared = (item.extendedProperties || {}).shared || {};
    shared.expiresAt = new Date(until).toISOString();
    calendarCall_(
      calendarRequest_('bookings', 'patch', '/' + encodeURIComponent(item.id), { fields: 'id', sendUpdates: 'none' }, {
        description: [props.note, 'נפתח לבד ב-' + fmt_(new Date(until), 'dd.MM.yyyy HH:mm')].filter(Boolean).join('\n'),
        extendedProperties: { shared: shared },
      })
    );
    invalidateAvailability_();
  } finally {
    lock.releaseLock();
  }
  scheduleMirrorRefresh_();
  return { ok: true, result: 'extended', id: id, expiresAt: new Date(until).toISOString() };
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
  if (body.website) {
    countLogNoise_('request.honeypot');
    return { ok: true, ref: newRef_(), holdHours: HOLD_HOURS };
  }

  // Milliseconds per step, returned with the result so slow requests can be diagnosed.
  var timings = {};
  var started = Date.now();
  var last = started;
  function mark(step) {
    var now = Date.now();
    timings[step] = now - last;
    last = now;
  }

  var check = validateRequest(body, today_(), currentPrices_(String(body.pricesVersion || '')).prices);
  if (!check.ok) {
    countLogNoise_('request.invalid');
    return { ok: false, error: 'invalid', fields: check.errors };
  }
  var req = check.value;
  mark('validate');

  if (CONFIG.recaptchaSecret && !verifyRecaptcha_(body.recaptchaToken)) {
    countLogNoise_('request.captcha');
    return { ok: false, error: 'captcha' };
  }
  mark('recaptcha');
  if (!withinRateLimit_(req.phone)) {
    countLogNoise_('request.rate_limited');
    return { ok: false, error: 'rate_limited' };
  }
  mark('rateLimit');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  mark('lockWait');
  var eventId;
  try {
    var conflicts = conflictsFor_(req.start, req.end, { expireStale: true });
    mark('conflictCheck');
    if (conflicts.length) {
      logEvent_('request.unavailable', { start: req.start, end: req.end, nights: req.nights, stayType: req.stayType }, 'guest');
      return { ok: false, error: 'unavailable', nights: conflicts };
    }
    req.ref = newRef_();
    eventId = calendarCall_(
      calendarRequest_('requests', 'post', '', { fields: 'iCalUID' }, {
        summary: '⏳ ' + req.name + ' · ' + STAY_TYPES[req.stayType].label,
        description: ownerLines_(req).join('\n'),
        start: { date: req.start },
        end: { date: req.end },
        extendedProperties: { shared: { request: JSON.stringify(req), createdAt: new Date().toISOString(), status: 'pending' } },
      })
    ).iCalUID;
    mark('createEvent');
    invalidateAvailability_();
  } finally {
    lock.releaseLock();
  }

  scheduleMirrorRefresh_();
  mark('scheduleRefresh');
  try {
    notifyOwner_(eventId, req);
  } catch (err) {
    console.error('owner notification failed', err);
  }
  mark('email');
  timings.total = Date.now() - started;
  console.log('request timings ' + JSON.stringify(timings));
  logEvent_('request.created', {
    ref: req.ref, id: eventId, start: req.start, end: req.end, nights: req.nights, stayType: req.stayType,
    adults: req.adults, participants: req.participants, estimate: req.estimate, ms: timings.total,
  }, 'guest');
  return { ok: true, ref: req.ref, holdHours: HOLD_HOURS, start: req.start, end: req.end, timings: timings };
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
  // CONFIG.recaptchaMinScore defaults to 0.5. Staging sets 0: Google scores the test suite's
  // automated browser as a bot after a few runs, so there the token is still checked (genuine, this
  // site, this action) but the score is not. The production smoke test checks real scores.
  var minScore = CONFIG.recaptchaMinScore === '' || CONFIG.recaptchaMinScore == null ? 0.5 : Number(CONFIG.recaptchaMinScore);
  return data.success === true && (data.score == null || data.score >= minScore) && (!data.action || data.action === 'booking_request');
}

function withinRateLimit_(phone) {
  var cache = CacheService.getScriptCache();
  var hourKey = 'rl:all:' + fmt_(new Date(), 'yyyyMMddHH');
  var phoneKey = 'rl:phone:' + whatsappNumber(phone);
  var counts = cache.getAll([hourKey, phoneKey]);
  var all = Number(counts[hourKey] || 0);
  var perPhone = Number(counts[phoneKey] || 0);
  if (all >= 30 || perPhone >= 5) return false;
  var updated = {};
  updated[hourKey] = String(all + 1);
  updated[phoneKey] = String(perPhone + 1);
  // The hour key is unique per hour, so the longer lifetime does not stretch its window.
  cache.putAll(updated, 21600);
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
  if (req.participants) lines.push('משתתפי יום (כולל הכלה, מלוות ואנשי מקצוע): ' + req.participants);
  return lines;
}

function ownerLines_(req) {
  var lines = stayLines_(req);
  if (STAY_TYPES[req.stayType].wedding) {
    lines.push('שמור ביומן: הלילה שלפני (' + heDate_(req.start) + ') וליל החתונה');
  }
  lines.push('הערכת מחיר: ' + (req.estimate ? '₪' + Number(req.estimate).toLocaleString('en-US') : 'לא חושבה (אין מחירים זמינים) — לתמחר ידנית'));
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

/**
 * HMAC over the UTF-8 bytes. Without the explicit charset Apps Script encodes strings with another
 * default, so signatures over Hebrew text (a closing's reason or note) would not match a tool's.
 * ASCII values sign the same either way, so earlier links and tokens stay valid.
 */
function sign_(id) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(id), CONFIG.hmacSecret, Utilities.Charset.UTF_8)).replace(/=+$/, '');
}

function validSig_(id, sig) {
  return !!id && !!sig && sign_(id) === String(sig);
}

/** The owner console, opened on one request. It needs the console login, so the link carries no signature. */
function consoleRequestUrl_(eventId, ref) {
  return CONSOLE_URL + '?request=' + encodeURIComponent(eventId) + '&ref=' + encodeURIComponent(ref);
}

function notifyOwner_(eventId, req) {
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
    '<p style="margin:20px 0"><a href="' + esc_(consoleRequestUrl_(eventId, req.ref)) + '" style="' + button + 'background:#8B6B48;color:#fff">לאישור או דחייה</a></p>' +
    '<p><a href="' + esc_(waLink_(req.phone, 'שלום ' + req.name + ', קיבלנו את בקשת ההזמנה שלך בשורשים')) + '" style="color:#1E6B37">WhatsApp ל' + esc_(req.name) + '</a>' +
    ' · <a href="tel:' + esc_(req.phone.replace(/[^\d+]/g, '')) + '" style="color:#8B6B48">התקשרות</a></p>' +
    '</div>';
  MailApp.sendEmail({
    to: CONFIG.notifyEmail || CONFIG.ownerEmail,
    subject: 'בקשת הזמנה ' + req.ref + ': ' + stayDatesShort_(req) + ' · ' + req.name,
    body: ownerLines_(req).join('\n') + '\n\nלאישור או דחייה: ' + consoleRequestUrl_(eventId, req.ref),
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

/**
 * Whether the request event still exists. CalendarApp.getEventById keeps returning an event after it
 * is deleted (approving or declining deletes it), so it cannot answer this; the REST API, which leaves
 * deleted events out, can. Found by the regression suite (tests/e2e, scenario E7).
 */
function requestIsLive_(id) {
  var page = calendarCall_(calendarRequest_('requests', 'get', '', { iCalUID: id, showDeleted: 'false', fields: 'items(status)' }));
  return (page.items || []).some(function (item) {
    return item.status !== 'cancelled';
  });
}

function decisionState_(id, sig) {
  if (!validSig_(id, sig)) return { status: 'forbidden' };
  if (!requestIsLive_(id)) return { status: 'not_found' };
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
  if (!validSig_(id, sig)) {
    countLogNoise_('request.forbidden');
    return { ok: false, error: 'forbidden' };
  }
  return decideAndRecord_(action, id, false, 'email');
}

/**
 * syncMirrors: refresh the spreadsheets before returning (the sheet's own checkbox) or shortly after.
 * actor (email, console or sheet) is where the owner decided, for the event log.
 */
function decideAndRecord_(action, id, syncMirrors, actor) {
  if (action !== 'approve' && action !== 'decline') return { ok: false, error: 'bad_request' };
  var cache = CacheService.getScriptCache();
  var key = 'decided:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(id)));
  var previous = cache.get(key);
  if (previous) {
    var stored = JSON.parse(previous);
    return stored.action === action ? stored.result : { ok: false, error: 'not_found' };
  }
  var result = decideOnce_(action, id);
  if (result.ok) logEvent_('request.' + result.result, { ref: result.ref, id: id, start: result.start, end: result.end, nights: result.nights, invited: result.invited }, actor);
  else logEvent_('request.decision_failed', { id: id, action: action, error: result.error }, actor);
  if (result.ok) {
    cache.put(key, JSON.stringify({ action: action, result: result }), 3600);
    if (syncMirrors) refreshMirrors_('sheet decision');
    else scheduleMirrorRefresh_();
  }
  return result;
}

function decideOnce_(action, id) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (!requestIsLive_(id)) return { ok: false, error: 'not_found' };
    var ev = calendar_('requests').getEventById(id);
    if (!ev) return { ok: false, error: 'not_found' };
    var req = JSON.parse(ev.getTag('request') || '{}');
    if (!req.stayType) return { ok: false, error: 'not_found' };

    if (action === 'decline') {
      ev.deleteEvent();
      invalidateAvailability_();
      var declineLink = waLink_(req.phone, 'שלום ' + req.name + ', תודה על הפנייה לשורשים. לצערנו התאריכים שביקשת אינם פנויים. נשמח לעזור למצוא מועד אחר.');
      recordDecision_('declined', req, declineLink);
      return { ok: true, result: 'declined', whatsapp: declineLink, ref: req.ref, start: req.start, end: req.end, nights: req.nights };
    }

    var conflicts = conflictsFor_(req.start, req.end, { excludeId: id });
    if (conflicts.length) return { ok: false, error: 'unavailable', nights: conflicts.map(heDate_) };

    var booking = {
      summary: 'שורשים · ' + req.name,
      description: guestDescription_(req),
      location: ADDRESS,
      start: { date: req.start },
      end: { date: req.end },
      extendedProperties: { shared: { request: ev.getTag('request'), source: 'website' } },
    };
    if (req.email) booking.attendees = [{ email: req.email }];
    calendarCall_(calendarRequest_('bookings', 'post', '', { sendUpdates: req.email ? 'all' : 'none', fields: 'id' }, booking));
    ev.deleteEvent();
    invalidateAvailability_();
    var approveLink = waLink_(req.phone, 'שלום ' + req.name + ', ההזמנה שלך בשורשים אושרה (' + stayDatesShort_(req) + '). מחכים לכם!');
    recordDecision_('approved', req, approveLink);
    return { ok: true, result: 'approved', invited: !!req.email, whatsapp: approveLink, ref: req.ref, start: req.start, end: req.end, nights: req.nights };
  } finally {
    lock.releaseLock();
  }
}
