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
  Object.keys(b.base).forEach(function (k) {
    if (a.base[k] !== b.base[k]) lines.push(k + ': ' + (a.base[k] || '—') + ' ← ' + (b.base[k] || '—'));
  });
  Object.keys(a.base).forEach(function (k) {
    if (!(k in b.base)) lines.push(k + ': נמחק');
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

/** The reasons a read source can't be published, in Hebrew. */
function sourceProblems_(read) {
  var out = [];
  if (read.structure) out.push(PRICE_PROBLEMS_HE[read.structure] || read.structure);
  if (read.baseError) out.push('מחיר קבוע לא תקין (' + read.baseError + ')');
  read.rowErrors.forEach(function (e) {
    out.push('שורה ' + e.row + ': ' + (PRICE_PROBLEMS_HE[e.reason] || e.reason));
  });
  read.conflicts.forEach(function (c) {
    out.push('שני עדכונים סותרים באותו שדה (' + c.a + ', ' + c.b + ')');
  });
  return out;
}

// ---------------------------------------------------------------------------
// The published tab (מחירון פעיל): cell A1 holds the price list as JSON, B1 when it was published.
// The site reads it by gid (CONFIG.pricesPublishedGid); if it is deleted, it is recreated under the
// same gid through the Sheets API, so the site's URL keeps working.

function publishedTab_(ss, alert) {
  var gid = Number(CONFIG.pricesPublishedGid || 0);
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if ((gid && sheets[i].getSheetId() === gid) || (!gid && sheets[i].getName() === PRICES_PUBLISHED_TAB)) return sheets[i];
  }
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

function publishText_(ss, text) {
  var tab = publishedTab_(ss);
  if (!tab) return false;
  tab.getRange('A1:B1').setValues([[text, new Date().toISOString()]]);
  return true;
}

// ---------------------------------------------------------------------------
// Hand edits: pending items for the owner's email, and the dashboard's notice.

/**
 * Records a change worth telling the owner, for the email and the dashboard's notice. Hand edits are
 * summarised in the email as the net change since the last email; `system` lines (a tab recreated,
 * the source missing) are listed as they are. Deduplicated by content, capped at the last 50.
 */
function pricesRecordEdit_(lines, system) {
  var props = PropertiesService.getScriptProperties();
  var key = fnv1a(JSON.stringify(lines));
  [PRICES_PENDING_KEY, PRICES_NOTICE_KEY].forEach(function (name) {
    var data = JSON.parse(props.getProperty(name) || '{"items":[],"older":0}');
    if (data.items.some(function (it) {
      return it.key === key;
    })) return;
    data.items.push({ key: key, at: new Date().toISOString(), lines: lines, system: !!system });
    while (data.items.length > PRICES_PENDING_MAX) {
      data.items.shift();
      data.older++;
    }
    data.lastAt = Date.now();
    props.setProperty(name, JSON.stringify(data));
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
  props.deleteProperty(PRICES_PENDING_KEY);
  var day = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
  var sent = String(props.getProperty(PRICES_EMAIL_DAY_KEY) || '').split(':');
  var count = sent[0] === day ? Number(sent[1] || 0) : 0;
  if (count >= PRICES_EMAILS_PER_DAY) return;
  var baseline = chunkedJson_(props, PRICES_BASELINE);
  var before = chunkedJson_(props, PRICES_EMAIL_BASELINE);
  var lines = [];
  var handEdits = pending.items.some(function (it) {
    return !it.system;
  });
  if (handEdits) lines = before && baseline ? describeChanges_(before, baseline) : pending.items.reduce(function (all, it) {
    return it.system ? all : all.concat(it.lines);
  }, []);
  pending.items.forEach(function (it) {
    if (it.system) lines = lines.concat(it.lines);
  });
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
  body.push('', 'הגיליון: https://docs.google.com/spreadsheets/d/' + CONFIG.pricesSheetId + '/edit');
  body.push('את המחירים מנהלים מהדשבורד; עדיף לא לערוך את הגיליון ידנית.');
  MailApp.sendEmail({ to: CONFIG.ownerEmail, subject: 'שורשים: שינוי בגיליון המחירים', body: body.join('\n'), name: 'שורשים – מחירים' });
  props.setProperty(PRICES_EMAIL_DAY_KEY, day + ':' + (count + 1));
  if (baseline) chunkedEntries_(props, PRICES_EMAIL_BASELINE, JSON.stringify(baseline));
  logEvent_('prices.email', { lines: lines.length, valid: !!status.valid }, 'system');
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
  } else if (!lock.tryLock(kind === 'setup' ? 30000 : 15000)) {
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
    var intent = props.getProperty(PRICES_INTENT_KEY);
    if (baseline && snap.hash !== baseline.hash) {
      var lines = describeChanges_(baseline, snap);
      if (intent) props.deleteProperty(PRICES_INTENT_KEY);
      else if (opts.sanctioned) logEvent_('prices.operator_change', { kind: kind, lines: lines.length }, 'system');
      else pricesRecordEdit_(lines);
    }

    // 2. Write: the header on the first run, ids for rows without one, or the operator's changes.
    var minimumsEnabled = pricesMinimumsEnabled_();
    var today = today_();
    var read = readPriceSource(rows, { today: today, minimumsEnabled: minimumsEnabled, hasBaseline: !!baseline });
    var wrote = false;
    if (kind === 'restore') {
      wrote = restoreLayout_(sheet, rows, props) || wrote;
    } else if (kind === 'apply') {
      var planned = applyPlan_(rows, read, opts.changes || {}, today, minimumsEnabled);
      if (planned.error) return { ok: false, error: planned.error, problems: planned.problems };
      if (opts.dryRun) return { ok: true, dryRun: true, list: planned.list };
      props.setProperty(PRICES_INTENT_KEY, JSON.stringify({ kind: kind, at: Date.now() }));
      if (!writePlan_(sheet, rows, planned)) return { ok: false, error: 'moved' };
      wrote = true;
    } else {
      if (!read.headerRow && !baseline) wrote = writeHeader_(sheet, rows, kind === 'setup') || wrote;
      if (read.blankIds.length) {
        props.setProperty(PRICES_INTENT_KEY, JSON.stringify({ kind: 'ids', at: Date.now() }));
        wrote = assignIds_(sheet, rows, read.blankIds) || wrote;
      }
    }

    // 3. Re-read and store the baseline before publishing.
    if (wrote) {
      SpreadsheetApp.flush();
      rows = readSourceRows_(ss, sheet);
      snap = snapshotOf_(rows);
      read = readPriceSource(rows, { today: today, minimumsEnabled: minimumsEnabled, hasBaseline: true });
    }
    chunkedEntries_(props, PRICES_BASELINE, JSON.stringify(snap), (function () {
      var e = {};
      e[PRICES_PUBLISH_PENDING_KEY] = '1';
      return e;
    })());
    props.deleteProperty(PRICES_INTENT_KEY);
    if (!props.getProperty(PRICES_EMAIL_BASELINE + ':n')) chunkedEntries_(props, PRICES_EMAIL_BASELINE, JSON.stringify(snap));
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
    if (!valid) {
      var since = props.getProperty(PRICES_VERSION_KEY) ? JSON.parse(props.getProperty(PRICES_STATUS_KEY) || '{}').since || '' : '';
      props.setProperty(PRICES_STATUS_KEY, JSON.stringify({ valid: false, problems: problems, since: since }));
      props.deleteProperty(PRICES_PUBLISH_PENDING_KEY);
      return { ok: true, valid: false, problems: problems, version: props.getProperty(PRICES_VERSION_KEY) || '' };
    }
    var text = JSON.stringify(list);
    var changed = props.getProperty(PRICES_VERSION_KEY) !== list.version;
    if (changed) {
      var history = chunkedJson_(props, PRICES_HISTORY) || [];
      history = history.filter(function (h) {
        return h.version !== list.version;
      });
      history.push(list);
      while (history.length > PRICES_HISTORY_MAX) history.shift();
      chunkedEntries_(props, PRICES_HISTORY, JSON.stringify(history));
    }
    var extra = {};
    extra[PRICES_VERSION_KEY] = list.version;
    chunkedEntries_(props, PRICES_COPY, text, extra);
    CacheService.getScriptCache().remove(PRICES_CACHE_KEY_V2);
    // The old backend's fallback copy: deleted so a rolled-back pre-step-2 backend fails closed.
    props.deleteProperty(PRICES_LAST_GOOD_KEY);
    var stamp = new Date().toISOString();
    props.setProperty(PRICES_STATUS_KEY, JSON.stringify({ valid: true, since: stamp, version: list.version }));
    chunkedEntries_(props, PRICES_LAST_VALID, JSON.stringify(snap));

    // 6. The published tab: rewritten when its text differs from the list (a new list, or a hand
    // edit of the hidden tab).
    var tab = publishedTab_(ss);
    var published = false;
    if (tab) {
      var current = String(tab.getRange('A1').getValue() || '');
      if (current !== text) {
        if (current && !changed && fnv1a(current) !== props.getProperty(PRICES_PUBLISHED_TEXT_KEY)) {
          logEvent_('prices.published_tab_repaired', {}, 'system');
        }
        tab.getRange('A1:B1').setValues([[text, stamp]]);
        SpreadsheetApp.flush();
      }
      props.setProperty(PRICES_PUBLISHED_TEXT_KEY, fnv1a(text));
      props.deleteProperty(PRICES_PUBLISH_PENDING_KEY);
      published = true;
    } else {
      schedulePriceRetry_();
    }
    if (changed) logEvent_('prices.published', { version: list.version, kind: kind, updates: list.updates.length }, 'system');
    return { ok: true, valid: true, version: list.version, published: published, list: kind === 'apply' ? list : undefined };
  } finally {
    priceRunActive_ = false;
    lock.releaseLock();
  }
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
  sheet.getRange(PRICES_HEADER_ROW, 1, 1, 9).setValues([UPDATE_HEADER]);
  sheet.getRange(PRICES_HEADER_ROW + 1, 1, Math.max(sheet.getMaxRows() - PRICES_HEADER_ROW, 1), 9).setNumberFormat('@');
  return true;
}

function newUpdateId_() {
  return 'u' + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
}

/** Gives a fresh id to each row in `rowNumbers` (1-based), re-checking column A right before writing. */
function assignIds_(sheet, rows, rowNumbers) {
  var wrote = false;
  rowNumbers.forEach(function (n) {
    var expected = String(rows[n - 1][0] === null || rows[n - 1][0] === undefined ? '' : rows[n - 1][0]);
    var cell = sheet.getRange(n, 1);
    if (String(cell.getDisplayValue()) !== expected) return;
    cell.setNumberFormat('@').setValue(newUpdateId_());
    wrote = true;
  });
  return wrote;
}

/**
 * The operator's changes (applyPriceChanges) as a plan: the resulting source is built in memory and
 * must be valid. changes: { base: { key: value }, upserts: [update], removes: [id] }. Upserts carry
 * their ids, so a retry is a no-op.
 */
function applyPlan_(rows, read, changes, today, minimumsEnabled) {
  var next = rows.map(function (r) {
    return r.slice();
  });
  var touched = [];
  var header = read.headerRow ? read.headerRow - 1 : -1;
  if (header < 0) return { error: 'no_header' };
  Object.keys(changes.base || {}).forEach(function (key) {
    var at = -1;
    for (var r = 0; r < header; r++) if (String(next[r][0]).trim() === key) at = r;
    if (at < 0) {
      for (r = 1; r < Math.min(header, BASE_AREA_ROWS); r++) if (!next[r].some(function (v) {
        return String(v).trim();
      })) {
        at = r;
        break;
      }
      if (at < 0) return;
      next[at][0] = key;
    }
    next[at][2] = changes.base[key] === null ? '' : changes.base[key];
    touched.push({ row: at, key: key, base: true });
  });
  (changes.removes || []).forEach(function (id) {
    for (var r = header + 1; r < next.length; r++) if (String(next[r][0]).trim() === id) {
      for (var c = 1; c < 9; c++) next[r][c] = '';
      touched.push({ row: r, id: id });
    }
  });
  (changes.upserts || []).forEach(function (u) {
    var problem = updateProblem(u, { today: today, forSave: true, minimumsEnabled: minimumsEnabled });
    if (problem) touched.push({ error: problem, id: u.id });
    var cells = [u.id, u.name || '', u.from, u.to, u.weekday == null ? '' : String(u.weekday), u.weekend == null ? '' : String(u.weekend), u.minimum == null ? '' : String(u.minimum), u.twoNight == null ? '' : String(u.twoNight), Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm')];
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
  if (!sourceIsValid(result)) return { error: 'invalid', problems: sourceProblems_(result) };
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
  Sheets.Spreadsheets.Values.batchUpdate({ valueInputOption: 'RAW', data: data }, sheet.getParent().getId());
  return true;
}

/**
 * Rebuilds the prices tab's layout from what it holds now: the base keys back in rows 2 on, every
 * update row that has an id under the header at PRICES_HEADER_ROW. What can't be found in the tab
 * comes from the last valid snapshot.
 */
function restoreLayout_(sheet, rows, props) {
  var lastValid = chunkedJson_(props, PRICES_LAST_VALID);
  var baseKeys = PRICE_KEYS.concat(['thirdGuestPercent']);
  var labels = {};
  var values = {};
  var updates = [];
  var seenIds = {};
  rows.forEach(function (row) {
    var key = String(row[0] === null || row[0] === undefined ? '' : row[0]).trim();
    if (baseKeys.indexOf(key) >= 0 && !(key in values)) {
      labels[key] = row[1];
      values[key] = row[2];
    } else if (UPDATE_ID_RE.test(key) && !seenIds[key]) {
      seenIds[key] = true;
      updates.push(row.slice(0, 9));
    }
  });
  ((lastValid && lastValid.rows) || []).forEach(function (row) {
    var key = row[0];
    if (baseKeys.indexOf(key) >= 0 && !(key in values)) values[key] = row[1];
  });
  var title = rows[0] && baseKeys.indexOf(String(rows[0][0]).trim()) < 0 && !UPDATE_ID_RE.test(String(rows[0][0]).trim()) && String(rows[0][0]).trim() !== 'id' ? rows[0].slice(0, 3) : ['מפתח (לא לשנות)', 'מה המחיר', 'מחיר ב־₪'];
  var out = [title.concat(['', '', '', '', '', ''])];
  baseKeys.forEach(function (key) {
    if (key in values) out.push([key, labels[key] || '', values[key], '', '', '', '', '', '']);
  });
  while (out.length < PRICES_HEADER_ROW - 1) out.push(['', '', '', '', '', '', '', '', '']);
  out.push(UPDATE_HEADER.slice());
  updates.sort(function (a, b) {
    return String(a[2]) < String(b[2]) ? -1 : 1;
  });
  updates.forEach(function (u) {
    out.push(u.map(function (v) {
      return v === null || v === undefined ? '' : String(v);
    }));
  });
  var height = Math.max(sheet.getLastRow(), out.length);
  sheet.getRange(1, 1, height, 9).clearContent();
  sheet.getRange(PRICES_HEADER_ROW, 1, Math.max(sheet.getMaxRows() - PRICES_HEADER_ROW + 1, 1), 9).setNumberFormat('@');
  sheet.getRange(1, 3, PRICES_HEADER_ROW - 1, 1).setNumberFormat('0');
  sheet.getRange(1, 1, out.length, 9).setValues(out);
  return true;
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
  PropertiesService.getScriptProperties().deleteProperty(PRICES_RETRY_KEY);
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === PRICES_RETRY_TRIGGER) ScriptApp.deleteTrigger(trigger);
  });
  priceRun_('backstop');
}

/**
 * Whether the section has anything to do, checked without the lock: the source differs from the
 * baseline, a publish is pending, or the published tab differs from what was published.
 */
function pricesNeedRun_() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PRICES_PUBLISH_PENDING_KEY)) return true;
  var baseline = chunkedJson_(props, PRICES_BASELINE);
  if (!baseline) return true;
  var ss = SpreadsheetApp.openById(CONFIG.pricesSheetId);
  var sheet = ss.getSheetByName(PRICES_TAB);
  if (!sheet) return true;
  if (snapshotOf_(readSourceRows_(ss, sheet)).hash !== baseline.hash) return true;
  var tab = publishedTab_(ss, false);
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
  try {
    var tab = publishedTab_(SpreadsheetApp.openById(CONFIG.pricesSheetId), false);
    var cell = tab ? JSON.parse(String(tab.getRange('A1').getValue() || 'null')) : null;
    var fromTab = cell ? checkPriceList(cell) : null;
    if (fromTab && fromTab.ok) return { version: fromTab.list.version, prices: fromTab.list };
  } catch (err) {
    countLogNoise_('prices.unreadable');
  }
  return { version: 'none', prices: null };
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

// ---------------------------------------------------------------------------
// Signed operator actions (doPost). Each has its own signing prefix covering its arguments.

function pricesSignedAction_(body) {
  var fresh = Math.abs(Date.now() - Number(body.t)) < 300000;
  if (!fresh) return null;
  if (body.action === 'publishPrices' && validSig_('publishPrices:' + body.t + ':' + (body.sanctioned ? 1 : 0), body.sig)) {
    return priceRun_('publish', { sanctioned: !!body.sanctioned });
  }
  if (body.action === 'applyPriceChanges') {
    var payload = JSON.stringify(body.changes || {});
    var signed = 'applyPrices:' + body.t + ':' + fnv1a(payload) + ':' + String(body.requestId || '') + ':' + (body.dryRun ? 1 : 0);
    if (!validSig_(signed, body.sig)) return null;
    if (body.dryRun) return priceRun_('apply', { changes: body.changes, dryRun: true, sanctioned: true });
    if (!/^[\w-]{8,64}$/.test(String(body.requestId || ''))) return { ok: false, error: 'bad_request' };
    return consoleOnce_('applyPrices', body.requestId, function () {
      return priceRun_('apply', { changes: body.changes, sanctioned: true });
    });
  }
  if (body.action === 'restoreStructure' && validSig_('restorePrices:' + body.t, body.sig)) {
    return priceRun_('restore', { sanctioned: true });
  }
  if (body.action === 'setPricesFlag' && validSig_('pricesFlag:' + body.t + ':' + (body.value ? 1 : 0), body.sig)) {
    PropertiesService.getScriptProperties().setProperty(PRICES_MINIMUMS_KEY, body.value ? 'true' : 'false');
    var res = priceRun_('flag', { sanctioned: true });
    res.minimumsEnabled = !!body.value;
    return res;
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
  sheet.getRange(1, 3, PRICES_HEADER_ROW - 1, 1).setNumberFormat('0');
  var tab = publishedTab_(ss, false);
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
  var result = priceRun_('setup', { sanctioned: true });
  console.log('prices: ' + JSON.stringify({ version: result.version, valid: result.valid, problems: result.problems }));
}
