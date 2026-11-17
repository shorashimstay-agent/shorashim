// The prices: the owner's prices tab (source), its validated copy (the published tab the site reads,
// and a copy in Script Properties the web app prices from), hand-edit detection and the owner's
// email. docs/private/pricing-dashboard-plan.md has the design; shared/rules.js has the rules
// (readPriceSource, buildPriceList, quoteStay).
//
// Every write to the prices spreadsheet, and every publish, runs in priceRun_: one critical
// section under the script lock. It reads the source, writes, re-reads, stores the new baseline,
// validates and publishes. A source that is not valid is never published; the last valid list stays.

var PRICES_PUBLISHED_TAB = 'מחירון פעיל';
var PRICES_CACHE_KEY_V2 = 'prices:v2';
var PRICES_COPY = 'prices:copy';
var PRICES_VERSION_KEY = 'prices:version';
var PRICES_BASELINE = 'prices:baseline';
var PRICES_LAST_VALID = 'prices:lastValid';
var PRICES_EMAIL_BASELINE = 'prices:emailBaseline';
var PRICES_HISTORY = 'prices:history';
var PRICES_STATUS_KEY = 'prices:status';
var PRICES_PENDING_KEY = 'prices:pending';
var PRICES_NOTICE_KEY = 'prices:notice';
var PRICES_INTENT_KEY = 'prices:writeIntent';
var PRICES_PUBLISH_PENDING_KEY = 'prices:publishPending';
var PRICES_PUBLISHED_TEXT_KEY = 'prices:publishedHash';
var PRICES_LAST_RUN_KEY = 'prices:lastRun';
var PRICES_RETRY_KEY = 'prices:retryQueued';
var PRICES_EMAIL_DAY_KEY = 'prices:emailDay';
var PRICES_MINIMUMS_KEY = 'pricesMinimumsEnabled';
var PRICES_PUBLISHED_DAY_KEY = 'prices:publishedDay';
var PRICES_RETRY_TRIGGER = 'onPricesRetry';
var PRICES_CHANGE_TRIGGER = 'onPricesSheetChange';
var PRICES_BACKSTOP_TRIGGER = 'onPricesBackstop';
var PRICES_BUDGET_MS = 10000;
var PRICES_EMAILS_PER_DAY = 5;
var PRICES_PENDING_MAX = 50;
var PRICES_HISTORY_MAX = 3;
var PRICES_HEADER_ROW = 22;
var PRICES_CHUNK = 8000;
var priceRunActive_ = false;

function pricesMinimumsEnabled_() {
  return PropertiesService.getScriptProperties().getProperty(PRICES_MINIMUMS_KEY) === 'true';
}

// ---------------------------------------------------------------------------
// Chunked, gzipped values in Script Properties: a value is capped at 9 KB. The chunks, a manifest
// (count and hash) and any extra properties are written in one setProperties call, so a crash never
// leaves a copy whose manifest does not match; leftover chunks of a larger earlier copy are deleted.

function chunkedEntries_(props, name, text, extra) {
  var packed = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(text, 'application/json')).getBytes());
  var entries = {};
  var count = Math.max(1, Math.ceil(packed.length / PRICES_CHUNK));
  for (var i = 0; i < count; i++) entries[name + ':' + i] = packed.slice(i * PRICES_CHUNK, (i + 1) * PRICES_CHUNK);
  entries[name + ':n'] = String(count);
  entries[name + ':h'] = fnv1a(text);
  for (var k in extra || {}) entries[k] = extra[k];
  var before = Number(props.getProperty(name + ':n') || 0);
  props.setProperties(entries, false);
  for (var j = count; j < before; j++) props.deleteProperty(name + ':' + j);
}

/** The text stored with chunkedEntries_, or null when it is missing or its manifest does not match. */
function chunkedRead_(props, name) {
  var count = Number(props.getProperty(name + ':n') || 0);
  if (!count) return null;
  var packed = '';
  for (var i = 0; i < count; i++) {
    var part = props.getProperty(name + ':' + i);
    if (part === null) return null;
    packed += part;
  }
  try {
    var text = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(packed), 'application/x-gzip')).getDataAsString();
    return fnv1a(text) === props.getProperty(name + ':h') ? text : null;
  } catch (err) {
    return null;
  }
}

function chunkedJson_(props, name) {
  var text = chunkedRead_(props, name);
  return text === null ? null : JSON.parse(text);
}

// ---------------------------------------------------------------------------
// Reading the prices tab.

function isDate_(v) {
  return Object.prototype.toString.call(v) === '[object Date]';
}

/**
 * The prices tab's cells, A to I, as readPriceSource takes them: display text, except a base key's
 * value (column C), read as its value so a cell's format can't hide it, and real dates, turned into
 * ISO in the spreadsheet's time zone. A thirdGuestPercent typed as "35%" in a percent-formatted
 * cell holds 0.35 and is read as 35.
 */
function readSourceRows_(ss, sheet) {
  var last = Math.max(sheet.getLastRow(), 1);
  var range = sheet.getRange(1, 1, last, 9);
  var shown = range.getDisplayValues();
  var values = range.getValues();
  var tz = ss.getSpreadsheetTimeZone();
  var baseKeys = PRICE_KEYS.concat(['thirdGuestPercent']);
  return shown.map(function (row, r) {
    return row.map(function (text, c) {
      var v = values[r][c];
      if (isDate_(v)) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      if (c === 2 && baseKeys.indexOf(String(values[r][0]).trim()) >= 0) {
        if (typeof v === 'number' && String(values[r][0]).trim() === 'thirdGuestPercent' && v > 0 && v < 1) {
          var format = String(sheet.getRange(r + 1, 3).getNumberFormat() || '');
          return format.indexOf('%') >= 0 ? Math.round(v * 100) : v;
        }
        return v === '' ? '' : v;
      }
      return text;
    });
  });
}

/**
 * The rows reduced to what they mean: trimmed text, dates as ISO, numbers as integers, without the
 * labels and the "updated" column. Every diff and hash uses this, so a format-only change is no
 * change.
 */
function normalizeRows_(rows) {
  return rows.map(function (row) {
    var key = String(row[0] === null || row[0] === undefined ? '' : row[0]).trim();
    var out = [key];
    for (var c = 1; c < 8; c++) {
      if (c === 1 && !UPDATE_ID_RE.test(key) && key !== 'id') continue;
      var v = row[c];
      var text = v === null || v === undefined ? '' : String(v).trim();
      var date = parseSheetDate(text);
      var n = parseSheetInt(v);
      out.push(date || (n !== null && !isNaN(n) ? String(n) : text));
    }
    while (out.length > 1 && out[out.length - 1] === '') out.pop();
    return out;
  });
}

function snapshotOf_(rows) {
  var norm = normalizeRows_(rows);
  while (norm.length && norm[norm.length - 1].length === 1 && norm[norm.length - 1][0] === '') norm.pop();
  var text = JSON.stringify(norm);
  return { hash: fnv1a(text), rows: norm };
}

/**
 * What changed between two snapshots, in the owner's words: base prices by key, updates by id, and
 * whether the layout moved. At most 20 lines.
 */
function describeChanges_(before, after) {
  var lines = [];
  function index(rows) {
    var out = { base: {}, updates: {}, header: -1 };
    rows.forEach(function (row, i) {
      var key = row[0];
      if (key === 'id') out.header = i;
      else if (UPDATE_ID_RE.test(key)) out.updates[key] = row.slice(1).join(' · ');
      else if (key) out.base[key] = row.slice(1).join(' · ');
    });
    return out;
  }
  var a = index((before && before.rows) || []);
  var b = index((after && after.rows) || []);
  var name = function (k) {
    return PRICE_KEY_NAMES_HE[k] || k;
  };
  Object.keys(b.base).forEach(function (k) {
    if (a.base[k] !== b.base[k]) lines.push(name(k) + ': ' + (a.base[k] || '—') + ' ← ' + (b.base[k] || '—'));
  });
  Object.keys(a.base).forEach(function (k) {
    if (!(k in b.base)) lines.push(name(k) + ': נמחק');
  });
  Object.keys(b.updates).forEach(function (id) {
    if (!(id in a.updates)) lines.push('עדכון חדש: ' + b.updates[id]);
    else if (a.updates[id] !== b.updates[id]) lines.push('עדכון השתנה: ' + a.updates[id] + ' ← ' + b.updates[id]);
  });
  Object.keys(a.updates).forEach(function (id) {
    if (!(id in b.updates)) lines.push('עדכון הוסר: ' + a.updates[id]);
  });
  if (a.header !== b.header && a.header >= 0 && b.header >= 0) lines.push('שורת הכותרת של העדכונים זזה משורה ' + (a.header + 1) + ' לשורה ' + (b.header + 1));
  if (!lines.length) lines.push('שינוי בשורות שאינן מחירים (תוויות או שורות ריקות)');
  return lines.slice(0, 20);
}

// The base keys as the owner knows them, for the email and the dashboard's notice.
var PRICE_KEY_NAMES_HE = {
  perNight: 'מחיר בסיס א׳–ד׳', weekendPerNight: 'מחיר בסיס ה׳–ש׳', thirdGuestPercent: 'אורח שלישי (%)',
  thirdGuestPerNight: 'אורח שלישי (ישן, לא בשימוש)', bride_day: 'יום כלה', bride_night_day: 'לילה לפני + יום כלה',
  wedding_night: 'ליל כלולות', bride_day_wedding_night: 'יום התארגנות + ליל כלולות',
};

var PRICE_PROBLEMS_HE = {
  two_headers: 'יש בגיליון שתי שורות כותרת לעדכונים',
  no_header: 'שורת הכותרת של העדכונים (id) נמחקה',
  base_below_header: 'שורת מחיר קבוע נמצאת מתחת לטבלת העדכונים',
  base_outside_rows: 'שורת מחיר קבוע ירדה מתחת לשורה 20',
  duplicate_key: 'מחיר קבוע מופיע פעמיים',
  update_above_header: 'שורת עדכון נמצאת מעל שורת הכותרת',
  source_missing: 'לשונית המחירים חסרה או ששמה שונה',
  too_large: 'המחירון גדול מדי לפרסום',
  order: 'תאריך הסיום לפני תאריך ההתחלה',
  from: 'תאריך התחלה לא תקין',
  to: 'תאריך סיום לא תקין',
  empty: 'אין בשורה מחיר או מינימום',
  weekday: 'מחיר א׳–ד׳ לא תקין',
  weekend: 'מחיר ה׳–ש׳ לא תקין',
  minimum: 'מינימום לילות לא תקין',
  twoNight: 'מחיר לשני לילות לא תקין',
  twoNight_range: 'מחיר לשני לילות מותר רק בתאריך יחיד',
  twoNight_minimum: 'מחיר לשני לילות לא יחול עם מינימום מעל 2',
  too_far: 'התאריך רחוק מדי (יותר משנה)',
  id: 'מזהה שורה חסר או כפול',
  name_long: 'השם ארוך מדי',
};

var HE_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/**
 * What the owner should know although the sheet is valid, in Hebrew: a price in the column that
 * doesn't apply to its date, an unknown key, a minimum that isn't active yet, a two-night total
 * that can't apply.
 */
function sourceWarnings_(read) {
  var byId = {};
  read.updates.forEach(function (u) {
    byId[u.id] = u;
  });
  return clipLines_(read.warnings.map(function (w) {
    var where = 'שורה ' + w.row + ': ';
    if (w.reason === 'unknown_key') return where + 'המפתח "' + w.key + '" לא מוכר, והמחיר בשורה לא נקרא';
    if (w.reason === 'minimum_off') return where + 'מינימום הלילות עוד לא פעיל באתר, ולכן לא חל';
    if (w.reason === 'twoNight_unreachable') return where + 'המחיר לשני לילות לא יחול, כי באחד הלילות נדרשים יותר משני לילות';
    if (w.reason === 'price_unused') {
      var u = byId[w.id] || {};
      var day = u.from ? HE_DAYS[new Date(toDayNumber(u.from) * 86400000).getUTCDay()] : '';
      var weekend = u.from && isWeekendNight(u.from);
      return where + 'המחיר לא חל: ' + (u.from ? u.from.split('-').reverse().join('.') + ' הוא יום ' + day + ', ' : '') + 'ולכן המחיר צריך להיות בעמודת ' + (weekend ? 'ה׳–ש׳' : 'א׳–ד׳');
    }
    return where + w.reason;
  }), 20);
}

/** The reasons a read source can't be published, in Hebrew. */
function sourceProblems_(read) {
  var out = [];
  if (read.structure) out.push(PRICE_PROBLEMS_HE[read.structure] || read.structure);
  if (read.baseError) {
    var key = String(read.baseError).replace(/^bad (price )?/, '');
    out.push(key === 'percent' ? 'אחוז האורח השלישי לא תקין (מספר שלם 0–100)' : 'מחיר קבוע לא תקין: ' + (PRICE_KEY_NAMES_HE[key] || key));
  }
  read.rowErrors.forEach(function (e) {
    out.push('שורה ' + e.row + ': ' + (PRICE_PROBLEMS_HE[e.reason] || e.reason));
  });
  var names = {};
  read.updates.forEach(function (u) {
    names[u.id] = '״' + (u.name || '(ללא שם)') + '״ (שורה ' + (read.idRows[u.id] || '?') + ')';
  });
  read.conflicts.forEach(function (c) {
    var pair = (names[c.a] || c.a) + ' ו־' + (names[c.b] || c.b);
    out.push(c.field === 'date' ? 'שתי שורות לאותו תאריך: ' + pair : 'העדכונים ' + pair + ' סותרים: טווחים חופפים עם אותו מחיר או מינימום');
  });
  return out;
}

// ---------------------------------------------------------------------------
// The published tab (מחירון פעיל): cell A1 holds the price list as JSON, B1 when it was published.
// The site reads it by gid (CONFIG.pricesPublishedGid); if it is deleted, it is recreated under the
// same gid through the Sheets API, so the site's URL keeps working.

/** The published tab, or null when it is missing. Never creates it (see publishedTab_). */
function findPublishedTab_(ss) {
  var gid = Number(CONFIG.pricesPublishedGid || 0);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if ((gid && sheets[i].getSheetId() === gid) || (!gid && sheets[i].getName() === PRICES_PUBLISHED_TAB)) return sheets[i];
  }
  return null;
}

/**
 * The published tab, recreated (under the same gid) when it is missing. Called only inside the
 * price section and setup, under the lock; the owner is told when a tab that held a list was lost.
 */
function publishedTab_(ss, alert) {
  var found = findPublishedTab_(ss);
  if (found) return found;
  var gid = Number(CONFIG.pricesPublishedGid || 0);
  var cache = CacheService.getScriptCache();
  if (cache.get('prices:recreate')) return null;
  cache.put('prices:recreate', '1', 60);
  var props = PropertiesService.getScriptProperties();
  var existed = !!props.getProperty(PRICES_PUBLISHED_TEXT_KEY);
  var created;
  if (gid) {
    Sheets.Spreadsheets.batchUpdate({ requests: [{ addSheet: { properties: { sheetId: gid, title: PRICES_PUBLISHED_TAB, hidden: true } } }] }, ss.getId());
    SpreadsheetApp.flush();
    created = ss.getSheets().filter(function (s) {
      return s.getSheetId() === gid;
    })[0];
  } else {
    created = ss.insertSheet(PRICES_PUBLISHED_TAB);
    created.hideSheet();
  }
  created.getRange('A1:B1').setNumberFormat('@');
  if (existed && alert !== false) {
    logEvent_('prices.published_tab_recreated', { gid: gid }, 'system');
    pricesRecordEdit_(['לשונית "' + PRICES_PUBLISHED_TAB + '" נמחקה ונוצרה מחדש'], true);
  }
  return created;
}

// ---------------------------------------------------------------------------
// Hand edits: pending items for the owner's email, and the dashboard's notice.

/**
 * Records a change worth telling the owner, for the email and the dashboard's notice. Hand edits are
 * summarised in the email as the net change since the last email; `system` lines (a tab recreated,
 * the source missing) are listed as they are. Deduplicated by content, capped at the last 50.
 */
function pricesRecordEdit_(lines, system) {
  try {
    var props = PropertiesService.getScriptProperties();
    lines = clipLines_(lines, 20);
    var key = fnv1a(JSON.stringify(lines));
    [PRICES_PENDING_KEY, PRICES_NOTICE_KEY].forEach(function (name) {
      var data = JSON.parse(props.getProperty(name) || '{"items":[],"older":0}');
      if (data.items.some(function (it) {
        return it.key === key;
      })) return;
      data.items.push({ key: key, at: new Date().toISOString(), lines: lines, system: !!system });
      // A Script Properties value is capped at 9 KB: keep the newest items within PRICES_RECORD_BYTES.
      while (data.items.length > 1 && (data.items.length > PRICES_PENDING_MAX || utf8Length_(JSON.stringify(data)) > PRICES_RECORD_BYTES)) {
        data.items.shift();
        data.older++;
      }
      data.lastAt = Date.now();
      props.setProperty(name, JSON.stringify(data));
    });
  } catch (err) {
    // Recording must never block publishing.
    console.error('could not record a price change', err);
  }
}

var PRICES_RECORD_BYTES = 7000;
var PRICES_LINE_CHARS = 200;

function utf8Length_(text) {
  return unescape(encodeURIComponent(text)).length;
}

/** At most `max` lines of at most PRICES_LINE_CHARS characters each. */
function clipLines_(lines, max) {
  return (lines || []).slice(0, max).map(function (l) {
    l = String(l);
    return l.length > PRICES_LINE_CHARS ? l.slice(0, PRICES_LINE_CHARS - 1) + '…' : l;
  });
}

/**
 * Called by the 10-minute timer before its early return; one property read when nothing is pending.
 * Sends one email once a full timer run has passed with no new edit: the net change since the last
 * email (not each half-typed state), the system notices, and whether the sheet is valid. At most
 * PRICES_EMAILS_PER_DAY a day; the dashboard notice still shows the rest.
 */
function pricesEmailDue_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty(PRICES_PENDING_KEY);
  if (!raw) return;
  var pending = JSON.parse(raw);
  if (!pending.items.length || Date.now() - Number(pending.lastAt || 0) < 9 * 60 * 1000) return;
  // Under the lock, so an operator run can't move the baselines while this reads and moves them.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    raw = props.getProperty(PRICES_PENDING_KEY);
    if (!raw) return;
    pending = JSON.parse(raw);
    var day = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
    var sent = String(props.getProperty(PRICES_EMAIL_DAY_KEY) || '').split(':');
    var count = sent[0] === day ? Number(sent[1] || 0) : 0;
    if (count >= PRICES_EMAILS_PER_DAY) {
      // Over the daily cap: the dashboard's notice still shows these.
      props.deleteProperty(PRICES_PENDING_KEY);
      return;
    }
    var baseline = chunkedJson_(props, PRICES_BASELINE);
    var before = chunkedJson_(props, PRICES_EMAIL_BASELINE);
    var lines = [];
    var handEdits = pending.items.some(function (it) {
      return !it.system;
    });
    if (handEdits) lines = before && baseline ? describeChanges_(before, baseline) : pending.items.reduce(function (all, it) {
      return it.system ? all : all.concat(it.lines);
    }, []);
    var system = [];
    pending.items.forEach(function (it) {
      if (it.system) system = system.concat(it.lines);
    });
    // Edits that net to nothing (typed and undone) and no system notice: nothing to tell.
    var netNothing = before && baseline && before.hash === baseline.hash;
    if (netNothing && !system.length) {
      props.deleteProperty(PRICES_PENDING_KEY);
      return;
    }
    if (netNothing) lines = [];
    lines = clipLines_(lines.concat(system), 30);
    var status = JSON.parse(props.getProperty(PRICES_STATUS_KEY) || '{"valid":true}');
    var body = ['שינוי בגיליון המחירים:', ''];
    lines.forEach(function (l) {
      body.push('• ' + l);
    });
    body.push('');
    if (status.valid) body.push('הגיליון תקין, והמחירים באתר מעודכנים לפיו.');
    else {
      body.push('הגיליון לא תקין, ולכן האתר ממשיך לעבוד עם המחירון התקין האחרון' + (status.since ? ' (מ־' + status.since.slice(0, 16).replace('T', ' ') + ')' : '') + '. מה צריך לתקן:');
      (status.problems || []).forEach(function (p) {
        body.push('• ' + p);
      });
    }
    if ((status.warnings || []).length) {
      body.push('', 'שימו לב:');
      status.warnings.forEach(function (w) {
        body.push('• ' + w);
      });
    }
    body.push('', 'הגיליון: https://docs.google.com/spreadsheets/d/' + CONFIG.pricesSheetId + '/edit');
    body.push('את המחירים מנהלים מהדשבורד; עדיף לא לערוך את הגיליון ידנית.');
    // Sent first: if it throws (the mail quota), the pending items stay for the next run.
    MailApp.sendEmail({ to: CONFIG.ownerEmail, subject: 'שורשים: שינוי בגיליון המחירים', body: body.join('\n'), name: 'שורשים – מחירים' });
    props.deleteProperty(PRICES_PENDING_KEY);
    props.setProperty(PRICES_EMAIL_DAY_KEY, day + ':' + (count + 1));
    if (baseline) chunkedEntries_(props, PRICES_EMAIL_BASELINE, JSON.stringify(baseline));
    logEvent_('prices.email', { lines: lines.length, valid: !!status.valid }, 'system');
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// The critical section.

/**
 * One run of the price section. kind: 'handler' (the change trigger), 'backstop' (hourly and
 * retries), 'first' (no copy yet, from a price read), 'setup', 'publish' (signed, operator),
 * 'apply' (signed, operator: opts.changes), 'restore' (signed: rebuild the layout), 'flag'.
 * opts.sanctioned records what it finds as an operator change rather than a hand edit.
 * @returns {object} { ok, version?, valid?, problems?, error? }
 */
function priceRun_(kind, opts) {
  opts = opts || {};
  if (priceRunActive_) throw new Error('price section entered while already running');
  if (!CONFIG.pricesSheetId) return { ok: false, error: 'no_sheet' };
  var lock = LockService.getScriptLock();
  if (kind === 'handler') {
    if (!lock.tryLock(5000)) {
      schedulePriceRetry_();
      return { ok: false, error: 'busy' };
    }
  } else if (!lock.tryLock(kind === 'setup' ? 30000 : kind === 'save' ? 8000 : 15000)) {
    if (kind === 'first' || kind === 'backstop') schedulePriceRetry_();
    return { ok: false, error: 'busy' };
  }
  priceRunActive_ = true;
  var started = Date.now();
  var props = PropertiesService.getScriptProperties();
  try {
    props.setProperty(PRICES_LAST_RUN_KEY, String(Date.now()));
    var ss;
    try {
      ss = SpreadsheetApp.openById(CONFIG.pricesSheetId);
    } catch (err) {
      countLogNoise_('prices.unreadable');
      return { ok: false, error: 'unreadable' };
    }
    var sheet = ss.getSheetByName(PRICES_TAB);
    var baseline = chunkedJson_(props, PRICES_BASELINE);
    if (!sheet && kind === 'restore') {
      if (opts.dryRun) {
        // Planned from the last valid snapshot, without creating anything yet.
        var missingPlan = restorePlan_({ getLastColumn: function () { return 0; } }, [], props);
        return missingPlan.error ? { ok: false, error: missingPlan.error } : { ok: true, dryRun: true, summary: missingPlan.summary, token: 'missing' };
      }
      if (opts.token && opts.token !== 'missing') return { ok: false, error: 'stale', token: 'missing' };
      opts.token = '';
      sheet = ss.insertSheet(PRICES_TAB);
      logEvent_('prices.source_recreated', {}, 'system');
    }
    if (!sheet) {
      if (props.getProperty(PRICES_STATUS_KEY) !== JSON.stringify({ valid: false, problems: [PRICE_PROBLEMS_HE.source_missing] })) {
        pricesRecordEdit_([PRICE_PROBLEMS_HE.source_missing], true);
        props.setProperty(PRICES_STATUS_KEY, JSON.stringify({ valid: false, problems: [PRICE_PROBLEMS_HE.source_missing] }));
      }
      return { ok: false, error: 'source_missing' };
    }

    // 1. Read, and record a hand edit not processed yet, before writing anything.
    var rows = readSourceRows_(ss, sheet);
    var snap = snapshotOf_(rows);
    // A write intent left by a run that crashed between its write and its baseline names the content
    // it expected: only that exact result is its own write, anything else is a hand edit.
    var intent = JSON.parse(props.getProperty(PRICES_INTENT_KEY) || 'null');
    if (baseline && snap.hash !== baseline.hash && !(intent && intent.expected === snap.hash)) {
      var lines = describeChanges_(baseline, snap);
      // Only an operator's sanctioned publish adopts what it finds; every other run tells the owner.
      if (kind === 'publish' && opts.sanctioned) logEvent_('prices.operator_change', { kind: kind, lines: lines.length }, 'system');
      else pricesRecordEdit_(lines);
    }

    // 2. Write: the header on the first run, ids for rows without one, or the operator's changes.
    var minimumsEnabled = pricesMinimumsEnabled_();
    var today = today_();
    var read = readPriceSource(rows, { today: today, minimumsEnabled: minimumsEnabled, hasBaseline: !!baseline });
    var wrote = false;
    var expected = null;
    var restored = null;
    if (kind === 'restore') {
      // From the dashboard, the run carries the token of the sheet its dry run showed the owner.
      if (opts.token && opts.token !== snap.hash) return { ok: false, error: 'stale', token: snap.hash };
      var plan = restorePlan_(sheet, rows, props);
      if (plan.error) return { ok: false, error: plan.error };
      if (opts.dryRun) return { ok: true, dryRun: true, summary: plan.summary, token: snap.hash };
      expected = snapshotOf_(plan.rows);
      props.setProperty(PRICES_INTENT_KEY, JSON.stringify({ kind: kind, expected: expected.hash }));
      writeRestore_(sheet, rows, plan.rows);
      restored = plan.summary;
      wrote = true;
    } else if (kind === 'apply' || kind === 'save') {
      // A dashboard save carries the token of the sheet its screen showed: any change since refuses it.
      if (kind === 'save' && opts.token !== snap.hash) return { ok: false, error: 'stale', token: snap.hash };
      // While the layout is broken, ids can't be told apart (a pasted block keeps them): only
      // "שחזור מבנה" may write.
      if (kind === 'save' && read.structure) return { ok: false, error: 'structure', problems: sourceProblems_(read) };
      var planned = applyPlan_(rows, read, opts.changes || {}, today, minimumsEnabled, kind === 'save' && !sourceIsValid(read));
      if (planned.error) return { ok: false, error: planned.error, problems: planned.problems };
      if (opts.dryRun) {
        // Chosen stays priced with the resulting list, for the operator to check before the real run.
        var quotes = (opts.quotes || []).filter(function (q) {
          return q && DATE_RE.test(String(q.start)) && STAY_TYPES[q.stayType || 'couple'];
        }).map(function (q) {
          var nights = Math.min(Math.max(Math.floor(Number(q.nights)) || 1, 1), MAX_NIGHTS);
          var adults = Number(q.adults) === 3 ? 3 : 2;
          var quote = planned.list ? quoteStay(planned.list, q.stayType || 'couple', q.start, nights, adults) : { price: null, minimum: 1 };
          return { start: q.start, nights: nights, adults: adults, stayType: q.stayType || 'couple', price: quote.price, minimum: quote.minimum };
        });
        return { ok: true, dryRun: true, list: planned.list, quotes: quotes };
      }
      expected = snapshotOf_(planned.rows);
      props.setProperty(PRICES_INTENT_KEY, JSON.stringify({ kind: kind, expected: expected.hash }));
      if (!writePlan_(sheet, rows, planned)) {
        props.deleteProperty(PRICES_INTENT_KEY);
        return { ok: false, error: 'moved' };
      }
      wrote = true;
    } else {
      if (!read.headerRow && !baseline) wrote = writeHeader_(sheet, rows, kind === 'setup') || wrote;
      // Ids only on a sound layout, and only for rows with no id or a copied one (readPriceSource).
      if (read.blankIds.length && !read.structure) {
        var ids = {};
        var next = rows.map(function (r) {
          return r.slice();
        });
        read.blankIds.forEach(function (n) {
          ids[n] = newUpdateId_();
          next[n - 1][0] = ids[n];
        });
        expected = snapshotOf_(next);
        props.setProperty(PRICES_INTENT_KEY, JSON.stringify({ kind: 'ids', expected: expected.hash }));
        wrote = assignIds_(sheet, rows, ids) || wrote;
      }
    }

    // 3. Re-read and store the baseline before publishing. Anything the re-read holds beyond what this
    // run wrote is a hand edit that landed in between: it is recorded, not absorbed.
    if (wrote) {
      SpreadsheetApp.flush();
      rows = readSourceRows_(ss, sheet);
      snap = snapshotOf_(rows);
      read = readPriceSource(rows, { today: today, minimumsEnabled: minimumsEnabled, hasBaseline: true });
      if (expected && snap.hash !== expected.hash) pricesRecordEdit_(describeChanges_(expected, snap));
    }
    chunkedEntries_(props, PRICES_BASELINE, JSON.stringify(snap), (function () {
      var e = {};
      e[PRICES_PUBLISH_PENDING_KEY] = '1';
      return e;
    })());
    props.deleteProperty(PRICES_INTENT_KEY);
    // The email describes the net change since the last email. While no hand edit awaits its email,
    // that point moves with every run, so operator changes never reach the owner as hand edits.
    // (An operator change made while hand edits await their email is included in that email.)
    if (!props.getProperty(PRICES_PENDING_KEY) || !props.getProperty(PRICES_EMAIL_BASELINE + ':n')) chunkedEntries_(props, PRICES_EMAIL_BASELINE, JSON.stringify(snap));
    if (Date.now() - started > PRICES_BUDGET_MS) {
      schedulePriceRetry_();
      return { ok: true, saved: wrote, published: false, error: 'budget' };
    }

    // 5. Validate and publish.
    var valid = sourceIsValid(read);
    var list = null;
    var problems = valid ? [] : sourceProblems_(read);
    if (valid) {
      list = buildPriceList(read.base, read.updates, today, minimumsEnabled);
      if (JSON.stringify(list).length > PUBLISHED_MAX_CHARS) {
        valid = false;
        problems = [PRICE_PROBLEMS_HE.too_large];
      }
    }
    var previous = JSON.parse(props.getProperty(PRICES_STATUS_KEY) || '{}');
    if (!valid) {
      var since = props.getProperty(PRICES_VERSION_KEY) ? previous.since || '' : '';
      props.setProperty(PRICES_STATUS_KEY, JSON.stringify({ valid: false, problems: clipLines_(problems, 20), warnings: sourceWarnings_(read), since: since }));
      props.deleteProperty(PRICES_PUBLISH_PENDING_KEY);
      props.setProperty(PRICES_PUBLISHED_DAY_KEY, today);
      // The site keeps the last valid list: the published tab is still checked against it. With
      // minimums off, that list loses its minimums at once (the first step of a step-4 rollback).
      var lastText = minimumsEnabled ? chunkedRead_(props, PRICES_COPY) : stripMinimums_(props, today);
      if (lastText) syncPublishedTab_(ss, props, lastText, false, since || new Date().toISOString());
      return { ok: true, valid: false, problems: problems, version: props.getProperty(PRICES_VERSION_KEY) || '', restored: restored || undefined, token: snap.hash };
    }
    if (Date.now() - started > PRICES_BUDGET_MS) {
      schedulePriceRetry_();
      return { ok: true, saved: wrote, published: false, error: 'budget' };
    }
    var text = JSON.stringify(list);
    var changed = props.getProperty(PRICES_VERSION_KEY) !== list.version;
    if (changed) pushHistory_(props, list);
    var extra = {};
    extra[PRICES_VERSION_KEY] = list.version;
    chunkedEntries_(props, PRICES_COPY, text, extra);
    CacheService.getScriptCache().remove(PRICES_CACHE_KEY_V2);
    // The old backend's fallback copy: deleted so a rolled-back pre-step-2 backend fails closed.
    props.deleteProperty(PRICES_LAST_GOOD_KEY);
    // `since` is when this version was first published, for "the site keeps the list from …".
    var stamp = changed || !previous.valid || !previous.since ? new Date().toISOString() : previous.since;
    var warnings = sourceWarnings_(read);
    props.setProperty(PRICES_STATUS_KEY, JSON.stringify({ valid: true, since: stamp, version: list.version, warnings: warnings }));
    props.setProperty(PRICES_PUBLISHED_DAY_KEY, today);
    chunkedEntries_(props, PRICES_LAST_VALID, JSON.stringify(snap));

    // 6. The published tab.
    var published = syncPublishedTab_(ss, props, text, changed, stamp);
    if (changed) logEvent_('prices.published', { version: list.version, kind: kind, updates: list.updates.length }, 'system');
    return { ok: true, valid: true, version: list.version, published: published, warnings: warnings, list: kind === 'apply' ? list : undefined, restored: restored || undefined, token: snap.hash };
  } finally {
    priceRunActive_ = false;
    lock.releaseLock();
  }
}

/** Keeps the last few published lists, so the owner's email can say what an older page showed. */
function pushHistory_(props, list) {
  var history = (chunkedJson_(props, PRICES_HISTORY) || []).filter(function (h) {
    return h.version !== list.version;
  });
  history.push(list);
  while (history.length > PRICES_HISTORY_MAX) history.shift();
  chunkedEntries_(props, PRICES_HISTORY, JSON.stringify(history));
}

/**
 * The last published list without its minimums, stored as the new copy when it had any (Script
 * Properties only, so it works when the sheet can't be read). Returns the list's text, or null.
 */
function stripMinimums_(props, today) {
  var text = chunkedRead_(props, PRICES_COPY);
  if (!text) return null;
  var checked = checkPriceList(JSON.parse(text));
  if (!checked.ok) return text;
  var had = checked.list.updates.some(function (u) {
    return u.minimum != null;
  });
  if (!had) return text;
  var list = buildPriceList(checked.list.base, checked.list.updates, today, false);
  var stripped = JSON.stringify(list);
  var extra = {};
  extra[PRICES_VERSION_KEY] = list.version;
  chunkedEntries_(props, PRICES_COPY, stripped, extra);
  pushHistory_(props, list);
  var status = JSON.parse(props.getProperty(PRICES_STATUS_KEY) || '{}');
  status.version = list.version;
  props.setProperty(PRICES_STATUS_KEY, JSON.stringify(status));
  CacheService.getScriptCache().remove(PRICES_CACHE_KEY_V2);
  logEvent_('prices.minimums_stripped', { version: list.version }, 'system');
  return stripped;
}

/**
 * Step 6: the published tab must hold `text`. It is rewritten when it differs (a new list, or a hand
 * edit of the hidden tab) and recreated when it is missing. Inside the section only.
 */
function syncPublishedTab_(ss, props, text, changed, stamp) {
  var tab = publishedTab_(ss);
  if (!tab) {
    schedulePriceRetry_();
    return false;
  }
  var current = String(tab.getRange('A1').getValue() || '');
  if (current !== text) {
    if (current && !changed) logEvent_('prices.published_tab_repaired', {}, 'system');
    tab.getRange('A1:B1').setValues([[text, stamp]]);
    SpreadsheetApp.flush();
  }
  props.setProperty(PRICES_PUBLISHED_TEXT_KEY, fnv1a(text));
  props.deleteProperty(PRICES_PUBLISH_PENDING_KEY);
  return true;
}

/** Grows the tab to at least `rows` rows and `cols` columns, so writes never fall off the grid. */
function ensureGrid_(sheet, rows, cols) {
  if (typeof sheet.getMaxRows === 'function' && sheet.getMaxRows() < rows) sheet.insertRowsAfter(sheet.getMaxRows(), rows - sheet.getMaxRows());
  if (typeof sheet.getMaxColumns === 'function' && sheet.getMaxColumns() < cols) sheet.insertColumnsAfter(sheet.getMaxColumns(), cols - sheet.getMaxColumns());
}

/** Writes the updates header at PRICES_HEADER_ROW. setup refuses if rows 21 and below hold anything. */
function writeHeader_(sheet, rows, strict) {
  for (var r = PRICES_HEADER_ROW - 2; r < rows.length; r++) {
    if ((rows[r] || []).some(function (v) {
      return String(v === null || v === undefined ? '' : v).trim() !== '';
    })) {
      if (strict) throw new Error('Rows 21 and below of the prices tab must be empty before setup adds the updates table.');
      pricesRecordEdit_(['לא נוצרה טבלת עדכונים: שורות 21 ומטה בגיליון אינן ריקות'], true);
      return false;
    }
  }
  ensureGrid_(sheet, PRICES_HEADER_ROW + 20, 9);
  sheet.getRange(PRICES_HEADER_ROW, 1, 1, 9).setValues([UPDATE_HEADER]);
  sheet.getRange(PRICES_HEADER_ROW + 1, 1, Math.max(sheet.getMaxRows() - PRICES_HEADER_ROW, 1), 9).setNumberFormat('@');
  return true;
}

function newUpdateId_() {
  return 'u' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

/** Writes `ids` ({ row (1-based): id }), re-checking column A of each row right before writing. */
function assignIds_(sheet, rows, ids) {
  var wrote = false;
  Object.keys(ids).forEach(function (key) {
    var n = Number(key);
    var expected = String(rows[n - 1][0] === null || rows[n - 1][0] === undefined ? '' : rows[n - 1][0]);
    var cell = sheet.getRange(n, 1);
    if (String(cell.getDisplayValue()) !== expected) return;
    cell.setNumberFormat('@').setValue(ids[key]);
    wrote = true;
  });
  return wrote;
}

/**
 * The operator's changes (applyPriceChanges) as a plan: the resulting source is built in memory and
 * must be valid. changes: { base: { key: value }, upserts: [update], removes: [id] }. Upserts carry
 * their ids, so a retry is a no-op.
 */
function applyPlan_(rows, read, changes, today, minimumsEnabled, fixOnly) {
  var next = rows.map(function (r) {
    return r.slice();
  });
  var touched = [];
  var header = read.headerRow ? read.headerRow - 1 : -1;
  if (header < 0) return { error: 'no_header' };
  var baseError = '';
  Object.keys(changes.base || {}).forEach(function (key) {
    if (PRICE_KEYS.concat(['thirdGuestPercent']).indexOf(key) < 0) {
      baseError = baseError || 'unknown_key';
      return;
    }
    var at = -1;
    for (var r = 0; r < header; r++) if (String(next[r][0]).trim() === key) at = r;
    if (at < 0) {
      for (r = 1; r < Math.min(header, BASE_AREA_ROWS); r++) if (!next[r].some(function (v) {
        return String(v).trim();
      })) {
        at = r;
        break;
      }
      if (at < 0) {
        baseError = baseError || 'no_room';
        return;
      }
      next[at][0] = key;
    }
    var value = changes.base[key];
    if (value !== null && (typeof value !== 'number' || Math.floor(value) !== value)) {
      baseError = baseError || 'base_not_number';
      return;
    }
    next[at][2] = value === null ? '' : value;
    touched.push({ row: at, key: key, base: true });
  });
  if (baseError) return { error: baseError };
  // Rows typed without an id (or with a copied one) get theirs in the same write.
  if (!read.structure) read.blankIds.forEach(function (n) {
    next[n - 1][0] = newUpdateId_();
    touched.push({ row: n - 1, id: next[n - 1][0] });
  });
  var unknown = [];
  (changes.removes || []).forEach(function (id) {
    var found = false;
    for (var r = header + 1; r < next.length; r++) if (String(next[r][0]).trim() === id) {
      // The whole row, id included: no orphan id is left behind, and the row is reused.
      for (var c = 0; c < 9; c++) next[r][c] = '';
      touched.push({ row: r, id: id });
      found = true;
    }
    if (!found) unknown.push(id);
  });
  if (unknown.length) return { error: 'unknown_id', problems: unknown };
  var gone = (changes.upserts || []).filter(function (u) {
    if (!changes.mustExist) return false;
    for (var r = header + 1; r < rows.length; r++) {
      var row = rows[r] || [];
      if (String(row[0]).trim() === u.id && row.slice(1, 8).some(function (v) {
        return String(v === null || v === undefined ? '' : v).trim() !== '';
      })) return false;
    }
    return true;
  });
  // An edit of an update that was removed meanwhile (by hand) doesn't bring it back.
  if (gone.length) return { error: 'unknown_id', problems: gone.map(function (u) {
    return u.id;
  }) };
  (changes.upserts || []).forEach(function (u) {
    var problem = updateProblem(u, { today: today, forSave: true, minimumsEnabled: minimumsEnabled });
    if (problem) touched.push({ error: problem, id: u.id });
    var cells = [u.id, cleanName(u.name), u.from, u.to, u.weekday == null ? '' : String(u.weekday), u.weekend == null ? '' : String(u.weekend), u.minimum == null ? '' : String(u.minimum), u.twoNight == null ? '' : String(u.twoNight), Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm')];
    var at = -1;
    for (var r = header + 1; r < next.length; r++) if (String(next[r][0]).trim() === u.id) at = r;
    if (at < 0) {
      at = next.length;
      for (r = next.length - 1; r > header; r--) {
        if (next[r].some(function (v) {
          return String(v).trim();
        })) break;
        at = r;
      }
      next[at] = next[at] || [];
    }
    next[at] = cells;
    touched.push({ row: at, id: u.id });
  });
  var errors = touched.filter(function (t) {
    return t.error;
  });
  if (errors.length) return { error: 'invalid', problems: errors.map(function (e) {
    return (e.id || '') + ': ' + (PRICE_PROBLEMS_HE[e.error] || e.error);
  }) };
  var result = readPriceSource(next, { today: today, minimumsEnabled: minimumsEnabled, hasBaseline: true });
  if (!sourceIsValid(result)) {
    // While the source is invalid, a save that fixes or removes a problem is written even if others
    // remain ("נשמר, עדיין לא באתר"); any other save is refused until the problems are fixed.
    if (fixOnly && sourceProblems_(result).length < sourceProblems_(read).length) {
      return { rows: next, touched: touched, list: null, remaining: sourceProblems_(result), expected: rows };
    }
    return { error: fixOnly ? 'fix_first' : 'invalid', problems: sourceProblems_(fixOnly ? read : result) };
  }
  return { rows: next, touched: touched, list: buildPriceList(result.base, result.updates, today, minimumsEnabled), expected: rows };
}

/**
 * Writes only the touched cells of a plan, in one Sheets API batchUpdate, after re-checking that
 * every target row still holds what was read. False (nothing written) when a row moved.
 */
function writePlan_(sheet, rows, plan) {
  var ids = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), 1).getDisplayValues();
  for (var i = 0; i < plan.touched.length; i++) {
    var t = plan.touched[i];
    var was = String((rows[t.row] || [''])[0] === undefined ? '' : (rows[t.row] || [''])[0]).trim();
    var now = String((ids[t.row] || [''])[0] || '').trim();
    if (was !== now) return false;
  }
  var lastRow = 0;
  plan.touched.forEach(function (t) {
    lastRow = Math.max(lastRow, t.row + 1);
  });
  ensureGrid_(sheet, lastRow + 20, 9);
  var data = [];
  var title = "'" + sheet.getName().replace(/'/g, "''") + "'!";
  plan.touched.forEach(function (t) {
    var n = t.row + 1;
    if (t.base) data.push({ range: title + 'A' + n + ':C' + n, values: [[plan.rows[t.row][0], plan.rows[t.row][1] || '', plan.rows[t.row][2]]] });
    else {
      sheet.getRange(n, 1, 1, 9).setNumberFormat('@');
      data.push({ range: title + 'A' + n + ':I' + n, values: [plan.rows[t.row].slice(0, 9)] });
    }
  });
  // Grid growth and formats are buffered SpreadsheetApp operations: applied before the API write.
  SpreadsheetApp.flush();
  Sheets.Spreadsheets.Values.batchUpdate({ valueInputOption: 'RAW', data: data }, sheet.getParent().getId());
  return true;
}

/**
 * "שחזור מבנה": a new layout for the prices tab, built from what it holds now. The base keys go to
 * rows 2 on (the last copy of a duplicate key, the one the owner's email described), notes typed in
 * the base area stay there, and every row with content in B–H that looks like an update goes under
 * the header, with a new id where it has none or a copied one. Only keys missing from the tab, or the
 * whole tab when it was deleted, come from the last valid snapshot. Nothing is dropped silently: the
 * summary lists what moved, what was restored and what didn't fit.
 * @returns {{ rows: any[][], summary: object } | { error: string }}
 */
function restorePlan_(sheet, rows, props) {
  if (typeof sheet.getLastColumn === 'function' && sheet.getLastColumn() > 9) return { error: 'extra_columns' };
  var formulas = [];
  if (rows.length && typeof sheet.getRange(1, 1, rows.length, 9).getFormulas === 'function') {
    sheet.getRange(1, 1, rows.length, 9).getFormulas().forEach(function (row, r) {
      row.forEach(function (f, c) {
        if (f) formulas.push(String.fromCharCode(65 + c) + (r + 1));
      });
    });
  }
  var lastValid = chunkedJson_(props, PRICES_LAST_VALID);
  var baseKeys = PRICE_KEYS.concat(['thirdGuestPercent']);
  var summary = { keys: 0, updates: 0, newIds: 0, duplicateKeys: [], notes: 0, restoredFromSnapshot: [], dropped: [] };
  var labels = {};
  var values = {};
  var extras = {};
  var notes = [];
  var updates = [];
  var seenIds = {};
  var title = ['מפתח (לא לשנות)', 'מה המחיר', 'מחיר ב־₪'];
  var text = function (v) {
    return v === null || v === undefined ? '' : String(v).trim();
  };
  rows.forEach(function (row, r) {
    var key = text(row[0]);
    var content = false;
    for (var c = 1; c <= 7; c++) if (text(row[c])) content = true;
    if (r === 0 && baseKeys.indexOf(key) < 0 && key !== 'id' && !UPDATE_ID_RE.test(key)) {
      title = row.slice(0, 9);
      return;
    }
    if (baseKeys.indexOf(key) >= 0) {
      if (key in values) {
        summary.duplicateKeys.push(key);
        var lost = [text(values[key])].concat(extras[key] || []).filter(Boolean).join(' · ');
        if (lost) summary.dropped.push(key + ' (עותק קודם): ' + lost);
      }
      labels[key] = row[1];
      values[key] = row[2];
      extras[key] = row.slice(3, 9).map(text);
      return;
    }
    if (key === 'id' || (!content && (!key || UPDATE_ID_RE.test(key)))) return;
    var looksLikeUpdate = UPDATE_ID_RE.test(key) || !!parseSheetDate(row[2]) || !!parseSheetDate(row[3]);
    if (looksLikeUpdate) {
      var id = UPDATE_ID_RE.test(key) && !seenIds[key] ? key : newUpdateId_();
      if (id !== key) summary.newIds++;
      seenIds[id] = true;
      var cells = row.slice(0, 9).map(text);
      cells[0] = id;
      // Text the owner typed in column A isn't lost: it becomes the name, or is listed.
      if (key && !UPDATE_ID_RE.test(key)) {
        if (!cells[1]) cells[1] = cleanName(key);
        else summary.dropped.push('עמודה A בשורה ' + (r + 1) + ': ' + key);
      }
      updates.push(cells);
    } else {
      notes.push(row.slice(0, 9).map(function (v) {
        return v === null || v === undefined ? '' : v;
      }));
    }
  });
  // From the last valid snapshot: keys the tab no longer has, and every update when it has none.
  var snapRows = (lastValid && lastValid.rows) || [];
  snapRows.forEach(function (row) {
    if (baseKeys.indexOf(row[0]) >= 0 && !(row[0] in values)) {
      values[row[0]] = row[1];
      summary.restoredFromSnapshot.push(row[0]);
    }
  });
  var emptyTab = rows.every(function (row) {
    return row.every(function (v) {
      return text(v) === '';
    });
  });
  if (emptyTab) {
    snapRows.forEach(function (row) {
      if (UPDATE_ID_RE.test(row[0])) {
        var cells = row.slice(0, 8).map(text);
        while (cells.length < 9) cells.push('');
        updates.push(cells);
        summary.restoredFromSnapshot.push(row[0]);
      }
    });
  }
  var blank = ['', '', '', '', '', '', '', '', ''];
  var pad = function (cells) {
    cells = cells.map(function (v) {
      return v === null || v === undefined ? '' : v;
    });
    while (cells.length < 9) cells.push('');
    return cells.slice(0, 9);
  };
  var out = [pad(title)];
  baseKeys.forEach(function (key) {
    if (!(key in values)) return;
    var n = typeof values[key] === 'number' ? values[key] : parseSheetInt(values[key]);
    out.push(pad([key, labels[key] || '', n === null || isNaN(n) ? text(values[key]) : n].concat(extras[key] || [])));
    summary.keys++;
  });
  notes.forEach(function (note) {
    if (out.length < PRICES_HEADER_ROW - 2) {
      out.push(note);
      summary.notes++;
    } else summary.dropped.push(note.map(text).filter(Boolean).join(' · '));
  });
  while (out.length < PRICES_HEADER_ROW - 1) out.push(blank.slice());
  out.push(UPDATE_HEADER.slice());
  updates.sort(function (a, b) {
    var x = parseSheetDate(a[2]) || a[2];
    var y = parseSheetDate(b[2]) || b[2];
    return x < y ? -1 : x > y ? 1 : 0;
  });
  updates.forEach(function (u) {
    out.push(u);
  });
  summary.updates = updates.length;
  // Formulas can't be moved as formulas: their current values are kept, and the cells are listed.
  formulas.forEach(function (cell) {
    summary.dropped.push('נוסחה בתא ' + cell + ' (נשמר הערך שלה)');
  });
  return { rows: out, summary: summary };
}

/** Writes a restore plan over columns A–I (columns J on are refused by restorePlan_). */
function writeRestore_(sheet, rows, out) {
  ensureGrid_(sheet, out.length + 20, 9);
  // Text everywhere except the base prices (column C of rows 1–21), so labels and comments ("10%")
  // are kept as typed rather than re-read as numbers.
  sheet.getRange(1, 1, PRICES_HEADER_ROW - 1, 2).setNumberFormat('@');
  sheet.getRange(1, 4, PRICES_HEADER_ROW - 1, 6).setNumberFormat('@');
  // Column C: a number format only for the base keys' rows; note rows keep their text ("10%").
  var baseKeys = PRICE_KEYS.concat(['thirdGuestPercent']);
  for (var r = 0; r < PRICES_HEADER_ROW - 1; r++) {
    var isKey = out[r] && baseKeys.indexOf(String(out[r][0])) >= 0;
    sheet.getRange(r + 1, 3).setNumberFormat(isKey ? '0' : '@');
  }
  sheet.getRange(PRICES_HEADER_ROW, 1, Math.max(sheet.getMaxRows() - PRICES_HEADER_ROW + 1, 1), 9).setNumberFormat('@');
  // One write over the whole height (blank rows below the new layout): never a cleared, empty tab.
  var height = Math.max(sheet.getLastRow(), out.length, 1);
  var full = out.slice();
  while (full.length < height) full.push(['', '', '', '', '', '', '', '', '']);
  sheet.getRange(1, 1, height, 9).setValues(full);
}

// ---------------------------------------------------------------------------
// Triggers.

/** Queues one backstop run about a minute from now; a burst of calls gives one run. */
function schedulePriceRetry_() {
  try {
    var props = PropertiesService.getScriptProperties();
    if (Date.now() - Number(props.getProperty(PRICES_RETRY_KEY) || 0) < 3 * 60 * 1000) return;
    props.setProperty(PRICES_RETRY_KEY, String(Date.now()));
    ScriptApp.newTrigger(PRICES_RETRY_TRIGGER).timeBased().after(60 * 1000).create();
  } catch (err) {
    console.error('could not queue the price retry; the hourly backstop will catch up', err);
  }
}

/** One-off trigger queued by schedulePriceRetry_. */
function onPricesRetry() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === PRICES_RETRY_TRIGGER) ScriptApp.deleteTrigger(trigger);
  });
  PropertiesService.getScriptProperties().deleteProperty(PRICES_RETRY_KEY);
  priceRun_('backstop');
}

/**
 * Whether the section has anything to do, checked without the lock: the source differs from the
 * baseline, a publish is pending, or the published tab differs from what was published.
 */
function pricesNeedRun_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PRICES_PUBLISH_PENDING_KEY)) return true;
  // Once a day the list is rebuilt: updates that ended long ago drop out of it.
  if (props.getProperty(PRICES_PUBLISHED_DAY_KEY) !== today_()) return true;
  var baseline = chunkedJson_(props, PRICES_BASELINE);
  if (!baseline) return true;
  var ss = SpreadsheetApp.openById(CONFIG.pricesSheetId);
  var sheet = ss.getSheetByName(PRICES_TAB);
  if (!sheet) return true;
  if (snapshotOf_(readSourceRows_(ss, sheet)).hash !== baseline.hash) return true;
  var tab = findPublishedTab_(ss);
  return !tab || fnv1a(String(tab.getRange('A1').getValue() || '')) !== props.getProperty(PRICES_PUBLISHED_TEXT_KEY);
}

/** Installable onChange trigger on the prices spreadsheet: typed edits, rows, sorting, tabs. */
function onPricesSheetChange(e) {
  var props = PropertiesService.getScriptProperties();
  // Every committed cell fires this. Runs closer than 10 s apart leave the rest to one retry.
  if (Date.now() - Number(props.getProperty(PRICES_LAST_RUN_KEY) || 0) < 10000 && !(e && e.force)) {
    schedulePriceRetry_();
    return;
  }
  try {
    if (!pricesNeedRun_()) return;
  } catch (err) {
    console.warn('price check failed; running the section', err);
  }
  priceRun_('handler');
}

/** Installable hourly trigger: the backstop for anything the change trigger missed. */
function onPricesBackstop() {
  try {
    if (!pricesNeedRun_()) return;
  } catch (err) {
    console.warn('price check failed; running the section', err);
  }
  priceRun_('backstop');
}

// ---------------------------------------------------------------------------
// Reading the prices.

/**
 * The prices in force: { version, prices }, `prices` being the price list (shared/rules.js), or
 * null before anything was published. The web app's own copy (Script Properties) is the primary
 * source: it must match its manifest and the published-version property. The published tab is read
 * only when that copy is missing or broken. `wantedVersion` is unused (kept for its callers): the
 * copy is always current.
 */
function currentPrices_(wantedVersion) {
  var props = PropertiesService.getScriptProperties();
  if (CONFIG.testHooks === true) {
    var override = props.getProperty(PRICES_OVERRIDE_KEY);
    if (override) return JSON.parse(override);
  }
  var version = props.getProperty(PRICES_VERSION_KEY);
  var cache = CacheService.getScriptCache();
  var cached = cache.get(PRICES_CACHE_KEY_V2);
  if (cached && version) {
    var hit = JSON.parse(cached);
    if (hit.version === version) return hit;
  }
  var copy = version ? chunkedJson_(props, PRICES_COPY) : null;
  var checked = copy ? checkPriceList(copy) : null;
  if (checked && checked.ok && checked.list.version === version) {
    var out = { version: version, prices: checked.list };
    cache.put(PRICES_CACHE_KEY_V2, JSON.stringify(out), 600);
    return out;
  }
  // No copy yet (first run after the deploy) or a broken one: publish once, at most every 60 s.
  if (!cache.get('prices:firstRun') && !priceRunActive_) {
    cache.put('prices:firstRun', '1', 60);
    try {
      priceRun_(version ? 'backstop' : 'first');
      var again = chunkedJson_(props, PRICES_COPY);
      var ok = again ? checkPriceList(again) : null;
      if (ok && ok.ok) return { version: ok.list.version, prices: ok.list };
    } catch (err) {
      console.warn('first price run failed', err);
    }
  }
  var fallback = cache.get('prices:tabFallback');
  if (fallback) return JSON.parse(fallback);
  var found = { version: 'none', prices: null };
  try {
    var tab = findPublishedTab_(SpreadsheetApp.openById(CONFIG.pricesSheetId));
    var cell = tab ? JSON.parse(String(tab.getRange('A1').getValue() || 'null')) : null;
    var fromTab = cell ? checkPriceList(cell) : null;
    if (fromTab && fromTab.ok) found = { version: fromTab.list.version, prices: fromTab.list };
  } catch (err) {
    countLogNoise_('prices.unreadable');
  }
  // Guest calls reach this before reCAPTCHA: one sheet read a minute at most.
  cache.put('prices:tabFallback', JSON.stringify(found), 60);
  return found;
}

/** A recently published list by version (the last few are kept), or null. */
function priceListByVersion_(version) {
  var history = chunkedJson_(PropertiesService.getScriptProperties(), PRICES_HISTORY) || [];
  for (var i = 0; i < history.length; i++) if (history[i].version === version) return history[i];
  return null;
}

/**
 * Staging only (CONFIG.testHooks): pins the web app to the suite's test prices (a price list, or a
 * flat { version, prices } file from before price lists) instead of the staging prices sheet; null
 * clears it.
 */
function testSetPrices_(file) {
  var props = PropertiesService.getScriptProperties();
  if (file === null) {
    props.deleteProperty(PRICES_OVERRIDE_KEY);
    return { ok: true, cleared: true };
  }
  var list = file && file.base ? checkPriceList(file) : null;
  if (list && !list.ok) return { ok: false, error: list.error };
  var value = list ? list.list : asPriceList(file && file.prices);
  if (!value) return { ok: false, error: 'bad prices' };
  props.setProperty(PRICES_OVERRIDE_KEY, JSON.stringify({ version: value.version, prices: value }));
  return { ok: true, version: value.version };
}

/**
 * The price checks of a booking request, run after reCAPTCHA and the rate limit. A page that sends
 * pricingV2 gets `price_changed` (the server's own price and minimum) when the price it showed
 * differs or the stay is below the minimum; an older page gets `invalid` on checkOut for a stay below
 * the minimum. A page that showed no price never gets `price_changed`. For older pages that showed
 * an older list, the owner's email notes it when the stay's price differs.
 * @returns {{ response?: object, note: string }}
 */
function requestPriceCheck_(body, req, priced) {
  if (!priced || !priced.prices) return { note: '' };
  var quote = quoteStay(priced.prices, req.stayType, req.start, req.nights, req.adults);
  if (req.stayType === 'couple' && quote.minimum > req.nights) {
    countLogNoise_('request.minimum');
    if (body.pricingV2) return { response: { ok: false, error: 'price_changed', price: req.estimate, minimum: quote.minimum, version: priced.version }, note: '' };
    return { response: { ok: false, error: 'invalid', fields: { checkOut: 'minimum' }, minimum: quote.minimum }, note: '' };
  }
  var shown = body.shownPrice;
  if (body.pricingV2 && shown !== undefined && shown !== null && shown !== '' && Number(shown) !== Number(req.estimate)) {
    return { response: { ok: false, error: 'price_changed', price: req.estimate, minimum: quote.minimum, version: priced.version }, note: '' };
  }
  if (body.pricingV2 || !body.pricesVersion || body.pricesVersion === priced.version) return { note: '' };
  var seen = priceListByVersion_(String(body.pricesVersion));
  if (!seen) return { note: 'המחירון השתנה מאז שהאורח פתח את הדף; המחיר לפי המחירון הנוכחי' };
  var seenPrice = estimatePrice(req.stayType, req.nights, req.adults, seen, req.start);
  if (seenPrice === req.estimate) return { note: '' };
  return { note: 'האורח ראה מחירון קודם (' + (seenPrice ? '₪' + Number(seenPrice).toLocaleString('en-US') : 'ללא מחיר') + '); המחיר לפי המחירון הנוכחי' };
}

// ---------------------------------------------------------------------------
// The dashboard (admin/index.html, "מחירים"): read the sheet as it is now, save one change, clear
// the hand-edit notice, rebuild the layout. Called from consoleCall_ with a valid session.

/**
 * The prices screen's data, read fresh (no lock): the source's base and updates with their problems
 * and warnings, the published list the site and the backend price from, the hand-edit notice, and the
 * token a save must carry.
 */
function pricesForConsole_() {
  var props = PropertiesService.getScriptProperties();
  var minimumsEnabled = pricesMinimumsEnabled_();
  var today = today_();
  var out = { ok: true, today: today, minimumsEnabled: minimumsEnabled };
  var published = chunkedRead_(props, PRICES_COPY);
  var checked = published ? checkPriceList(JSON.parse(published)) : null;
  out.published = checked && checked.ok ? checked.list : null;
  out.status = JSON.parse(props.getProperty(PRICES_STATUS_KEY) || 'null');
  out.notice = JSON.parse(props.getProperty(PRICES_NOTICE_KEY) || 'null');
  var ss = SpreadsheetApp.openById(CONFIG.pricesSheetId);
  var sheet = ss.getSheetByName(PRICES_TAB);
  if (!sheet) {
    out.structure = 'source_missing';
    out.problems = [PRICE_PROBLEMS_HE.source_missing];
    out.valid = false;
    return out;
  }
  var rows = readSourceRows_(ss, sheet);
  var read = readPriceSource(rows, { today: today, minimumsEnabled: minimumsEnabled, hasBaseline: true });
  out.token = snapshotOf_(rows).hash;
  out.base = read.base;
  // The base cells as they are in the sheet, so an invalid one can be fixed from the form.
  out.rawBase = {};
  var baseKeys = PRICE_KEYS.concat(['thirdGuestPercent']);
  rows.forEach(function (row, r) {
    var key = String(row[0] === null || row[0] === undefined ? '' : row[0]).trim();
    if (baseKeys.indexOf(key) < 0 || (read.headerRow && r >= read.headerRow - 1)) return;
    var value = row[2];
    var n = typeof value === 'number' ? value : parseSheetInt(value);
    if (n !== null && isNaN(n)) out.rawBase[key] = String(value);
  });
  out.structure = read.structure;
  out.updates = read.updates;
  out.invalidRows = read.rowErrors.map(function (e) {
    var row = rows[e.row - 1] || [];
    return {
      row: e.row,
      id: e.id,
      code: e.reason,
      reason: PRICE_PROBLEMS_HE[e.reason] || e.reason,
      cells: row.slice(0, 8).map(function (v) {
        return v === null || v === undefined ? '' : String(v);
      }),
    };
  });
  out.problems = sourceProblems_(read);
  out.conflicts = read.conflicts;
  out.warnings = sourceWarnings_(read);
  out.valid = sourceIsValid(read);
  return out;
}

/**
 * One dashboard save: { token, base }, { token, update } (an upsert by id; a new update gets its id
 * here) or { token, id } for a removal. A busy section throws, so consoleOnce_ lets a retry with the
 * same requestId run again.
 */
function pricesConsoleSave_(op, args) {
  var changes = {};
  if (op === 'saveBase') changes.base = args.base || {};
  else if (op === 'addUpdate' || op === 'editUpdate') {
    var u = args.update || {};
    var id = op === 'addUpdate' ? newUpdateId_() : String(u.id || '');
    if (!UPDATE_ID_RE.test(id)) return { ok: false, error: 'bad_request' };
    var clean = { id: id, name: cleanName(u.name), from: String(u.from || ''), to: String(u.to || '') };
    ['weekday', 'weekend', 'minimum', 'twoNight'].forEach(function (f) {
      if (u[f] !== null && u[f] !== undefined && u[f] !== '') clean[f] = Number(u[f]);
    });
    changes.upserts = [clean];
    if (op === 'editUpdate') changes.mustExist = true;
  } else changes.removes = [String(args.id || '')];
  var res = priceRun_('save', { changes: changes, token: String(args.token || '') });
  if (!res.ok && ['busy', 'moved', 'unreadable'].indexOf(res.error) >= 0) throw new Error('price section ' + res.error + '; retry');
  if (res.ok && changes.upserts) res.id = changes.upserts[0].id;
  return res;
}

/** The dashboard's price operations, or null for other ops. */
function pricesConsoleCall_(body) {
  var args = body.args || {};
  if (body.op === 'prices') return pricesForConsole_();
  if (['saveBase', 'addUpdate', 'editUpdate', 'removeUpdate'].indexOf(body.op) >= 0) {
    if (!/^[\w-]{8,64}$/.test(String(args.requestId || ''))) return { ok: false, error: 'bad_request' };
    return consoleOnce_(body.op, args.requestId, function () {
      var res = pricesConsoleSave_(body.op, args);
      logEvent_('console.' + body.op, { ok: res.ok, error: res.error, version: res.version, valid: res.valid }, 'console');
      return res;
    });
  }
  if (body.op === 'ackPriceEdit') {
    // Clears only what the owner's screen showed: an edit recorded after it stays in the notice.
    // Under the lock, as pricesRecordEdit_ writes the same property.
    var ackLock = LockService.getScriptLock();
    if (!ackLock.tryLock(8000)) throw new Error('price section busy; retry');
    try {
      return ackNotice_(args);
    } finally {
      ackLock.releaseLock();
    }
  }
  if (body.op === 'restorePrices') {
    var restored = priceRun_('restore', { dryRun: !!args.dryRun, token: args.token ? String(args.token) : '' });
    if (!args.dryRun) logEvent_('console.restorePrices', { ok: restored.ok, error: restored.error, valid: restored.valid }, 'console');
    return restored;
  }
  return null;
}

/** The dashboard's "ראיתי": the notice keeps only what was recorded after the screen loaded. */
function ackNotice_(args) {
  var props = PropertiesService.getScriptProperties();
  var notice = JSON.parse(props.getProperty(PRICES_NOTICE_KEY) || 'null');
  var seenAt = Number(args.seenAt || 0);
  if (notice && Number(notice.lastAt || 0) > seenAt) {
    notice.items = notice.items.filter(function (it) {
      return Date.parse(it.at) > seenAt;
    });
    notice.older = 0;
    props.setProperty(PRICES_NOTICE_KEY, JSON.stringify(notice));
  } else props.deleteProperty(PRICES_NOTICE_KEY);
  logEvent_('console.ackPriceEdit', {}, 'console');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Signed operator actions (doPost). Each has its own signing prefix covering its arguments.

function pricesSignedAction_(body) {
  var fresh = Math.abs(Date.now() - Number(body.t)) < 300000;
  if (!fresh) return null;
  if (body.action === 'publishPrices' && validSig_('publishPrices:' + body.t + ':' + (body.sanctioned ? 1 : 0), body.sig)) {
    return priceRun_('publish', { sanctioned: !!body.sanctioned });
  }
  if (body.action === 'applyPriceChanges') {
    // The signature covers the changes themselves, not a hash of them.
    var payload = JSON.stringify(body.changes || {});
    // The quotes (dry run) are signed too.
    var signed = 'applyPrices:' + body.t + ':' + String(body.requestId || '') + ':' + (body.dryRun ? 1 : 0) + ':' + payload + (body.quotes ? ':' + JSON.stringify(body.quotes) : '');
    if (!validSig_(signed, body.sig)) return null;
    if (body.dryRun) return priceRun_('apply', { changes: body.changes, dryRun: true, quotes: Array.isArray(body.quotes) ? body.quotes.slice(0, 20) : [] });
    if (!/^[\w-]{8,64}$/.test(String(body.requestId || ''))) return { ok: false, error: 'bad_request' };
    return consoleOnce_('applyPrices', body.requestId, function () {
      var res = priceRun_('apply', { changes: body.changes });
      // Throwing clears consoleOnce_'s key, so a retry with the same requestId runs again.
      if (!res.ok && ['busy', 'moved', 'unreadable', 'source_missing'].indexOf(res.error) >= 0) throw new Error('price section ' + res.error + '; retry');
      return res;
    });
  }
  if (body.action === 'restoreStructure' && validSig_('restorePrices:' + body.t + ':' + (body.dryRun ? 1 : 0), body.sig)) {
    return priceRun_('restore', { dryRun: !!body.dryRun });
  }
  if (body.action === 'setPricesFlag' && validSig_('pricesFlag:' + body.t + ':' + (body.value ? 1 : 0), body.sig)) {
    var flagProps = PropertiesService.getScriptProperties();
    var before = flagProps.getProperty(PRICES_MINIMUMS_KEY);
    flagProps.setProperty(PRICES_MINIMUMS_KEY, body.value ? 'true' : 'false');
    var flagged;
    try {
      flagged = priceRun_('flag');
    } catch (err) {
      flagged = { ok: false, error: 'server_error' };
    }
    var published = flagged.ok && flagged.valid !== false && flagged.error !== 'budget';
    if (!body.value && !published) {
      // Off must hold even when nothing could be republished: the minimums leave the copy the web
      // app prices from now, and a queued run (publish pending) rebuilds the published tab without
      // them, even if a run holding the lock wrote them back meanwhile.
      stripMinimums_(flagProps, today_());
      flagProps.setProperty(PRICES_PUBLISH_PENDING_KEY, '1');
      schedulePriceRetry_();
      flagged.minimumsEnabled = false;
      flagged.retryQueued = true;
      return flagged;
    }
    if (body.value && !published) {
      // On, but the list could not be rebuilt with minimums: put the flag back, so it never
      // disagrees with the published list.
      if (before === null) flagProps.deleteProperty(PRICES_MINIMUMS_KEY);
      else flagProps.setProperty(PRICES_MINIMUMS_KEY, before);
      flagged.minimumsEnabled = before === 'true';
      return flagged;
    }
    flagged.minimumsEnabled = !!body.value;
    return flagged;
  }
  if (CONFIG.testHooks === true && validSig_('test:' + body.t, body.sig)) {
    if (body.action === 'testFirePriceEdit') {
      PropertiesService.getScriptProperties().deleteProperty(PRICES_LAST_RUN_KEY);
      onPricesSheetChange({ force: true });
      return { ok: true, version: PropertiesService.getScriptProperties().getProperty(PRICES_VERSION_KEY) || '' };
    }
    if (body.action === 'testResetPrices') {
      var p = PropertiesService.getScriptProperties();
      [PRICES_PENDING_KEY, PRICES_NOTICE_KEY, PRICES_INTENT_KEY].forEach(function (k) {
        p.deleteProperty(k);
      });
      return priceRun_('publish', { sanctioned: true });
    }
    if (body.action === 'testPriceState') {
      var q = PropertiesService.getScriptProperties();
      return { ok: true, version: q.getProperty(PRICES_VERSION_KEY) || '', status: JSON.parse(q.getProperty(PRICES_STATUS_KEY) || 'null'), pending: JSON.parse(q.getProperty(PRICES_PENDING_KEY) || 'null'), notice: JSON.parse(q.getProperty(PRICES_NOTICE_KEY) || 'null') };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// setup: the spreadsheet's locale and time zone, the updates table, formats, the published tab,
// warning-only protections and the triggers. Called from setup() after its triggers are reset.

function pricesSetup_() {
  if (!CONFIG.pricesSheetId) return;
  var ss = SpreadsheetApp.openById(CONFIG.pricesSheetId);
  ss.setSpreadsheetLocale('iw_IL');
  ss.setSpreadsheetTimeZone('Asia/Jerusalem');
  var sheet = ss.getSheetByName(PRICES_TAB);
  if (!sheet) throw new Error('The prices spreadsheet has no tab ' + PRICES_TAB);
  // A percentage typed as "35%" holds 0.35: written as 35 before the plain number format would hide it.
  var keys = sheet.getRange(1, 1, PRICES_HEADER_ROW - 1, 3).getValues();
  keys.forEach(function (row, r) {
    if (String(row[0]).trim() === 'thirdGuestPercent' && typeof row[2] === 'number' && row[2] > 0 && row[2] < 1) {
      var cell = sheet.getRange(r + 1, 3);
      if (String(cell.getNumberFormat() || '').indexOf('%') >= 0) cell.setValue(Math.round(row[2] * 100));
    }
  });
  sheet.getRange(1, 3, PRICES_HEADER_ROW - 1, 1).setNumberFormat('0');
  // The first run (under the lock) writes the header, creates the published tab and publishes.
  var result = priceRun_('setup');
  console.log('prices: ' + JSON.stringify({ version: result.version, valid: result.valid, problems: result.problems }));
  var tab = findPublishedTab_(ss);
  if (tab) {
    tab.hideSheet();
    tab.getRange('A1:B1').setNumberFormat('@');
  }
  [sheet, tab].forEach(function (s) {
    if (!s) return;
    var existing = s.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    var protection = existing.length ? existing[0] : s.protect();
    protection.setDescription('המחירים מנוהלים מהדשבורד').setWarningOnly(true);
  });
  ScriptApp.newTrigger(PRICES_CHANGE_TRIGGER).forSpreadsheet(CONFIG.pricesSheetId).onChange().create();
  ScriptApp.newTrigger(PRICES_BACKSTOP_TRIGGER).timeBased().everyHours(1).create();
}
