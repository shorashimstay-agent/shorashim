/**
 * The event log: a record of what the booking backend did, kept in Firestore (projects
 * shorashim-log and shorashim-log-staging, on the free Spark plan). It is built so that it can never
 * cost the booking system anything that matters:
 * - logEvent_ writes one Script Property and nothing else: no lock, no network, and never a throw.
 * - The timer sends what is buffered in one Firestore commit (flushEventLog_), and backs off for
 *   hours after a failed or slow one, so an outage costs a few calls a day, not one per run.
 * - The buffer stops at LOG_BUFFER_MAX events, so it can never fill Script Properties, which hold
 *   the backup prices and the recent decisions too.
 * - Noise (rejected requests, logins during a lockout) only bumps a counter in the cache, and each
 *   flush writes the counters as one log.counts event, so a flood of bad requests is one entry.
 * No personal data: an event keeps only the LOG_FIELDS below, such as refs and calendar event IDs,
 * dates and outcomes. The guest's details stay on the calendar event the ref points to.
 * CONFIG.firestore is { projectId, clientEmail, privateKeyId, privateKey } for a service account
 * that may only read and write documents. Without it nothing is recorded.
 */

var LOG_KEY_PREFIX = 'log:';
var LOG_BUFFER_MAX = 100;
var LOG_EVENT_MAX_CHARS = 1000;
var LOG_STRING_MAX = 100;
// The only fields an event may carry; anything else a caller passes is dropped.
var LOG_FIELDS = [
  'ref', 'id', 'start', 'end', 'nights', 'stayType', 'adults', 'participants', 'kind', 'result', 'error',
  'by', 'fee', 'band', 'estimate', 'emailed', 'invited', 'hours', 'expiresAt', 'ok', 'ms', 'why', 'where', 'action',
  'message', 'counts',
];
// Top-level, indexed fields; the rest of an event goes in its unindexed `data` map.
var LOG_INDEXED = ['type', 'actor', 'ref', 'id'];
var LOG_NOISE_KEY = 'logNoise';
// The counts waiting to be sent: one property, merged on every flush, so a long outage cannot grow
// the buffer past LOG_BUFFER_MAX + 1. Not a log: key, so the ceiling check does not count it.
var LOG_COUNTS_KEY = 'logCountsPending';
var LOG_BACKOFF_KEY = 'logBackoff';
var LOG_PRUNED_KEY = 'logPrunedOn';
var LOG_TOKEN_KEY = 'logToken';
var LOG_TEST_BREAK_KEY = 'logTestBreak';
var LOG_SLOW_MS = 15000;
var LOG_BACKOFF_FIRST_MS = 3600 * 1000;
var LOG_BACKOFF_MAX_MS = 6 * 3600 * 1000;
var LOG_PRUNE_BATCH = 500;
// Requests and owner actions are kept 3 years; rebuilds, errors and counters 90 days.
var LOG_KEEP_DAYS = { business: 3 * 365, system: 90 };

function logConfigured_() {
  var fs = CONFIG.firestore;
  return !!(fs && fs.projectId && fs.clientEmail && fs.privateKey);
}

function isLogKey_(key) {
  return key.indexOf(LOG_KEY_PREFIX) === 0;
}

/** Requests and console actions are the business record; everything else is the system's. */
function logClass_(type) {
  return /^(request|console)\./.test(type) ? 'business' : 'system';
}

// Phrases from Google's own errors worth keeping; the rest of an error's text is never stored.
var LOG_ERROR_PHRASES = ['too many times', 'timed out', 'timeout', 'quota', 'unavailable', 'rate limit', 'Lock'];

/**
 * A classification of an error, never its text: error text is free text, and Calendar or JSON
 * errors can quote a guest's name or note. Keeps the error's name, the start of its message when
 * that is plain words with an optional HTTP status ("Calendar API 403"), and known phrases.
 */
function logMessage_(err) {
  var text = String(err && err.message ? err.message : err || '');
  var head = text.split(':')[0];
  var out = [err && err.name ? String(err.name) : 'Error'];
  if (/^[A-Za-z][A-Za-z ]{0,30}( \d{3})?$/.test(head)) out.push(head);
  LOG_ERROR_PHRASES.forEach(function (phrase) {
    if (text.toLowerCase().indexOf(phrase.toLowerCase()) >= 0) out.push(phrase);
  });
  return out.join(' · ');
}

/** Cut by code points, so a cut never splits a surrogate pair (Firestore refuses invalid UTF-8). */
function logValue_(value) {
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  return Array.from(String(value)).slice(0, LOG_STRING_MAX).join('');
}

/** The event as it is buffered: the type, who acted, when, and the allowed fields only. */
function logRecord_(type, fields, actor) {
  var event = { type: String(type), actor: actor || 'system', ts: new Date().toISOString() };
  fields = fields || {};
  LOG_FIELDS.forEach(function (name) {
    var value = fields[name];
    if (value === undefined || value === null || value === '') return;
    if (name === 'counts' && typeof value === 'object') {
      var counts = {};
      Object.keys(value).slice(0, 30).forEach(function (k) {
        counts[Array.from(String(k)).slice(0, 40).join('')] = Number(value[k]) || 0;
      });
      event.counts = counts;
    } else if (typeof value !== 'object') {
      event[name] = logValue_(value);
    }
  });
  var text = JSON.stringify(event);
  if (text.length > LOG_EVENT_MAX_CHARS) {
    text = JSON.stringify({ type: event.type, actor: event.actor, ts: event.ts, ref: event.ref, id: event.id, error: 'event_too_large' });
  }
  return text;
}

/**
 * Records an event for the next flush. `fields` may hold anything: only LOG_FIELDS are kept.
 * `actor` is who acted: guest, email, console, sheet, timer or system.
 */
function logEvent_(type, fields, actor) {
  try {
    if (!logConfigured_()) return;
    var props = PropertiesService.getScriptProperties();
    if (props.getKeys().filter(isLogKey_).length >= LOG_BUFFER_MAX) {
      countLogNoise_('log.dropped');
      return;
    }
    props.setProperty(LOG_KEY_PREFIX + Date.now() + '-' + Utilities.getUuid().slice(0, 8), logRecord_(type, fields, actor));
  } catch (err) {
    console.warn('event log: could not record ' + type, err);
  }
}

/**
 * Counts an event that is not worth a record each time. Two calls at the same moment may lose a
 * count: these are statistics, and a lock would cost more than they are worth.
 */
function countLogNoise_(name) {
  try {
    if (!logConfigured_()) return;
    var cache = CacheService.getScriptCache();
    var counts = JSON.parse(cache.get(LOG_NOISE_KEY) || '{}');
    counts[name] = (counts[name] || 0) + 1;
    cache.put(LOG_NOISE_KEY, JSON.stringify(counts), 21600);
  } catch (err) {
    console.warn('event log: could not count ' + name, err);
  }
}

/**
 * Sends the buffered events to Firestore in one commit, then deletes them from the buffer; once a
 * day it also deletes expired events. Called at the end of every timer run. Never throws. `force`
 * ignores the backoff (the staging test hook). Returns what it did, for the hook and diag.
 */
function flushEventLog_(force) {
  try {
    if (!logConfigured_()) return { ok: true, skipped: 'not_configured' };
    var props = PropertiesService.getScriptProperties();
    var backoff = JSON.parse(props.getProperty(LOG_BACKOFF_KEY) || 'null');
    if (!force && backoff && Date.now() < backoff.until) return { ok: true, skipped: 'backoff', until: new Date(backoff.until).toISOString() };

    var cache = CacheService.getScriptCache();
    var noise = cache.get(LOG_NOISE_KEY);
    if (noise) {
      cache.remove(LOG_NOISE_KEY);
      addLogCounts_(props, JSON.parse(noise));
    }

    var all = props.getProperties();
    var keys = Object.keys(all).filter(isLogKey_).sort();
    var pending = JSON.parse(all[LOG_COUNTS_KEY] || 'null');
    var out = { ok: true, sent: 0 };
    if (keys.length || pending) {
      var writes = [];
      keys.forEach(function (key) {
        var event;
        try {
          event = JSON.parse(all[key]);
        } catch (err) {
          return;
        }
        writes.push({ update: { name: logDocName_(key.slice(LOG_KEY_PREFIX.length)), fields: logDocument_(event) } });
      });
      if (pending) writes.push({ update: { name: logDocName_(pending.id), fields: logDocument_(JSON.parse(logRecord_('log.counts', { counts: pending.counts }, 'system'))) } });
      var started = Date.now();
      var res = firestoreCall_('commit', { writes: writes });
      var ms = Date.now() - started;
      if (!res.ok && res.code === 400) {
        // Firestore refused the batch itself, so sending it again would fail the same way forever.
        // Drop it and count what was lost; the counts go out with the next flush.
        deleteLogKeys_(props, keys);
        props.deleteProperty(LOG_COUNTS_KEY);
        addLogCounts_(props, { 'log.rejected': writes.length });
        return { ok: false, error: res.error, rejected: writes.length };
      }
      if (!res.ok) {
        setLogBackoff_(props, backoff);
        return { ok: false, error: res.error, buffered: keys.length };
      }
      deleteLogKeys_(props, keys);
      if (pending) props.deleteProperty(LOG_COUNTS_KEY);
      out.sent = writes.length;
      out.ms = ms;
      if (ms > LOG_SLOW_MS) {
        setLogBackoff_(props, backoff);
        return out;
      }
    }
    if (backoff) props.deleteProperty(LOG_BACKOFF_KEY);
    if (props.getProperty(LOG_PRUNED_KEY) !== today_()) out.pruned = pruneEventLog_(props);
    return out;
  } catch (err) {
    console.warn('event log: flush failed', err);
    try {
      var p = PropertiesService.getScriptProperties();
      setLogBackoff_(p, JSON.parse(p.getProperty(LOG_BACKOFF_KEY) || 'null'));
    } catch (ignored) {}
    return { ok: false, error: logMessage_(err) };
  }
}

/** Deleted one by one: deleteAllProperties would take the prices and the decisions with them. */
function deleteLogKeys_(props, keys) {
  keys.forEach(function (key) {
    props.deleteProperty(key);
  });
}

/**
 * Adds counts to the one pending counts record. Its document ID is fixed when the record is made,
 * so a commit that is retried overwrites the same document.
 */
function addLogCounts_(props, counts) {
  var pending = JSON.parse(props.getProperty(LOG_COUNTS_KEY) || 'null') || { id: Date.now() + '-counts', counts: {} };
  Object.keys(counts).forEach(function (name) {
    if (Object.keys(pending.counts).length >= 30 && !(name in pending.counts)) return;
    pending.counts[name] = (pending.counts[name] || 0) + (Number(counts[name]) || 0);
  });
  props.setProperty(LOG_COUNTS_KEY, JSON.stringify(pending));
}

/** Waits an hour after the first failure, doubling each time up to six hours. */
function setLogBackoff_(props, previous) {
  var delay = previous && previous.delayMs ? Math.min(previous.delayMs * 2, LOG_BACKOFF_MAX_MS) : LOG_BACKOFF_FIRST_MS;
  props.setProperty(LOG_BACKOFF_KEY, JSON.stringify({ until: Date.now() + delay, delayMs: delay }));
}

/** Deletes up to LOG_PRUNE_BATCH events past their expireAt; the rest go on later days. */
function pruneEventLog_(props) {
  var res = firestoreCall_('runQuery', {
    structuredQuery: {
      from: [{ collectionId: 'events' }],
      where: { fieldFilter: { field: { fieldPath: 'expireAt' }, op: 'LESS_THAN', value: { timestampValue: new Date().toISOString() } } },
      select: { fields: [{ fieldPath: '__name__' }] },
      limit: LOG_PRUNE_BATCH,
    },
  });
  // A failure waits for tomorrow too: retrying every run could read 500 documents 144 times a day.
  props.setProperty(LOG_PRUNED_KEY, today_());
  if (!res.ok) return -1;
  var names = (res.body || [])
    .filter(function (row) {
      return row.document;
    })
    .map(function (row) {
      return row.document.name;
    });
  if (names.length) {
    var del = firestoreCall_('commit', {
      writes: names.map(function (name) {
        return { delete: name };
      }),
    });
    if (!del.ok) return -1;
  }
  return names.length;
}

function logDocName_(docId) {
  return 'projects/' + CONFIG.firestore.projectId + '/databases/(default)/documents/events/' + docId;
}

/**
 * The Firestore fields of a buffered event. Only what queries filter on is top-level: type, actor,
 * ref, id, class, ts and expireAt. Everything else, with the deployed commit, goes in the `data`
 * map, which is exempt from indexing (set on both databases): Firestore indexes every field by
 * default, and those index entries made an event about 3.4 KB instead of about 1.
 */
function logDocument_(event) {
  var cls = logClass_(event.type);
  var ts = new Date(event.ts);
  if (isNaN(ts.getTime())) ts = new Date();
  var fields = {};
  var data = {};
  Object.keys(event).forEach(function (name) {
    if (name === 'ts') return;
    if (LOG_INDEXED.indexOf(name) >= 0) fields[name] = firestoreValue_(event[name]);
    else data[name] = event[name];
  });
  if (CONFIG.commit) data.commit = String(CONFIG.commit);
  fields.data = firestoreValue_(data);
  fields.ts = { timestampValue: ts.toISOString() };
  fields['class'] = { stringValue: cls };
  fields.expireAt = { timestampValue: new Date(ts.getTime() + LOG_KEEP_DAYS[cls] * 86400000).toISOString() };
  return fields;
}

function firestoreValue_(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Math.floor(value) === value ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'object') {
    var fields = {};
    Object.keys(value).forEach(function (k) {
      fields[k] = firestoreValue_(value[k]);
    });
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(value) };
}

/** A documents-level Firestore call (commit, runQuery). Returns { ok, body } or { ok: false, error }. */
function firestoreCall_(method, payload) {
  var res = UrlFetchApp.fetch(
    'https://firestore.googleapis.com/v1/projects/' + CONFIG.firestore.projectId + '/databases/(default)/documents:' + method,
    {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + firestoreToken_() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    }
  );
  var code = res.getResponseCode();
  if (code === 401) CacheService.getScriptCache().remove(LOG_TOKEN_KEY);
  if (code !== 200) return { ok: false, code: code, error: 'firestore ' + code };
  return { ok: true, body: JSON.parse(res.getContentText() || '{}') };
}

/**
 * An access token for the service account: a JWT signed with its key, exchanged at Google's token
 * endpoint, and kept in the cache for 55 of its 60 minutes.
 */
function firestoreToken_() {
  if (CONFIG.testHooks === true && PropertiesService.getScriptProperties().getProperty(LOG_TEST_BREAK_KEY)) {
    throw new Error('event log key disabled by the staging test hook');
  }
  var cache = CacheService.getScriptCache();
  var cached = cache.get(LOG_TOKEN_KEY);
  if (cached) return cached;
  var fs = CONFIG.firestore;
  var now = Math.floor(Date.now() / 1000);
  function part(obj) {
    return Utilities.base64EncodeWebSafe(JSON.stringify(obj)).replace(/=+$/, '');
  }
  var unsigned = part({ alg: 'RS256', typ: 'JWT', kid: fs.privateKeyId }) + '.' + part({
    iss: fs.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  var signature = Utilities.base64EncodeWebSafe(Utilities.computeRsaSha256Signature(unsigned, fs.privateKey)).replace(/=+$/, '');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: unsigned + '.' + signature },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) throw new Error('event log token: HTTP ' + res.getResponseCode());
  var token = JSON.parse(res.getContentText()).access_token;
  cache.put(LOG_TOKEN_KEY, token, 3300);
  return token;
}

/**
 * For diag and the smoke test: whether logging is set up, what is waiting (by type), any backoff
 * and its current step, and the pending counts. Never throws.
 */
function eventLogStatus_() {
  try {
    if (!logConfigured_()) return { configured: false };
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    var types = {};
    Object.keys(all).filter(isLogKey_).forEach(function (key) {
      var type = 'unreadable';
      try {
        type = JSON.parse(all[key]).type;
      } catch (ignored) {}
      types[type] = (types[type] || 0) + 1;
    });
    var backoff = JSON.parse(all[LOG_BACKOFF_KEY] || 'null');
    var active = backoff && Date.now() < backoff.until;
    var pending = JSON.parse(all[LOG_COUNTS_KEY] || 'null');
    return {
      configured: true,
      buffered: Object.keys(all).filter(isLogKey_).length,
      bufferedTypes: types,
      backoffUntil: active ? new Date(backoff.until).toISOString() : '',
      backoffMs: active ? backoff.delayMs : 0,
      noise: JSON.parse(CacheService.getScriptCache().get(LOG_NOISE_KEY) || '{}'),
      pendingCounts: pending ? pending.counts : {},
      prunedOn: all[LOG_PRUNED_KEY] || '',
    };
  } catch (err) {
    return { configured: logConfigured_(), error: logMessage_(err) };
  }
}

/**
 * Staging only (CONFIG.testHooks): 'flush' sends the buffer now, ignoring any backoff; 'break' and
 * 'repair' make the token step fail and work again; 'fill' records `count` test events; 'status'
 * reports. Signed like the other test hooks.
 */
function testEventLog_(op, count) {
  var props = PropertiesService.getScriptProperties();
  if (op === 'flush') return { ok: true, flush: flushEventLog_(true), status: eventLogStatus_() };
  if (op === 'break') {
    props.setProperty(LOG_TEST_BREAK_KEY, '1');
    CacheService.getScriptCache().remove(LOG_TOKEN_KEY);
    return { ok: true, status: eventLogStatus_() };
  }
  if (op === 'repair') {
    props.deleteProperty(LOG_TEST_BREAK_KEY);
    props.deleteProperty(LOG_BACKOFF_KEY);
    CacheService.getScriptCache().remove(LOG_TOKEN_KEY);
    return { ok: true, status: eventLogStatus_() };
  }
  if (op === 'fill') {
    var n = Math.min(Math.max(Number(count) || 0, 0), LOG_BUFFER_MAX + 20);
    for (var i = 0; i < n; i++) logEvent_('test.fill', { why: 'buffer ceiling test' }, 'system');
    return { ok: true, status: eventLogStatus_() };
  }
  if (op === 'status') return { ok: true, status: eventLogStatus_() };
  return { ok: false, error: 'bad_request' };
}
