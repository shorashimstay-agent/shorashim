// EventLog.js run in Node with stand-ins for Script Properties, the cache, UrlFetchApp and Utilities:
// what an event may carry, the buffer ceiling, the flush and its backoff, the daily prune, and the
// service-account token. The staging suite (tests/e2e/eventlog.spec.ts) covers the real Firestore.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const FIRESTORE = { projectId: 'log-test', clientEmail: 'writer@log-test.iam.gserviceaccount.com', privateKeyId: 'k1', privateKey: pem };

function store() {
  const map = new Map();
  return {
    map,
    getKeys: () => [...map.keys()],
    getProperty: (k) => (map.has(k) ? map.get(k) : null),
    setProperty: (k, v) => map.set(k, String(v)),
    deleteProperty: (k) => map.delete(k),
    getProperties: () => Object.fromEntries(map),
    setProperties: (o) => Object.entries(o).forEach(([k, v]) => map.set(k, String(v))),
  };
}

/**
 * Code.js, the rules and EventLog.js in one global scope, as Apps Script loads them. `respond`
 * answers each UrlFetchApp.fetch(url, params); every call is recorded in `calls`.
 */
function load({ firestore = FIRESTORE, respond, props = store() } = {}) {
  const cache = new Map();
  const calls = [];
  const ctx = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    CONFIG: { adminSheetId: 'sheet', firestore, commit: 'abc1234' },
    PropertiesService: { getScriptProperties: () => props },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      base64EncodeWebSafe: (x) => Buffer.from(typeof x === 'string' ? Buffer.from(x, 'utf8') : Buffer.from(x.map((b) => b & 255))).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
      computeRsaSha256Signature: (input, key) => [...crypto.sign('sha256', Buffer.from(input, 'utf8'), key)].map((b) => (b > 127 ? b - 256 : b)),
      formatDate: (d) => d.toISOString().slice(0, 10),
    },
    Session: { getScriptTimeZone: () => 'UTC' },
    UrlFetchApp: {
      fetch: (url, params) => {
        calls.push({ url, params });
        const [code, body] = respond ? respond(url, params) : defaultRespond(url, params);
        return { getResponseCode: () => code, getContentText: () => JSON.stringify(body) };
      },
    },
  });
  for (const file of ['../shared/rules.js', 'src/Code.js', 'src/EventLog.js']) {
    vm.runInContext(fs.readFileSync(path.join(here, file), 'utf8').replace(/^export /gm, ''), ctx);
  }
  return { ctx, props, cache, calls };
}

function defaultRespond(url) {
  if (url.includes('oauth2.googleapis.com/token')) return [200, { access_token: 'tok' }];
  if (url.endsWith(':runQuery')) return [200, [{ readTime: 'x' }]];
  return [200, {}];
}

const buffered = (props) => [...props.map.keys()].filter((k) => k.startsWith('log:'));
const commits = (calls) => calls.filter((c) => c.url.endsWith(':commit')).map((c) => JSON.parse(c.params.payload));

test('an event keeps only the allowed fields, so no guest details reach the log', () => {
  const { ctx, props } = load();
  ctx.logEvent_('console.cancelBooking', {
    ok: true, result: 'cancelled', ref: 'SH-ABCDE', id: 'uid1', start: '2026-12-01', end: '2026-12-03', nights: 2,
    name: 'דנה כהן', phone: '0501234567', email: 'dana@example.com', whatsapp: 'https://wa.me/972501234567', notes: 'x', reason: 'free text',
    nested: { phone: '0501234567' }, why: 'y'.repeat(300),
  }, 'console');
  const [key] = buffered(props);
  const event = JSON.parse(props.getProperty(key));
  assert.deepEqual(Object.keys(event).sort(), ['actor', 'end', 'id', 'nights', 'ok', 'ref', 'result', 'start', 'ts', 'type', 'why'].sort());
  assert.equal(event.why.length, 100);
  assert.ok(!/0501234567|dana|דנה|wa\.me/.test(props.getProperty(key)));
});

test('error messages lose anything that looks like an email address or a phone number', () => {
  const { ctx } = load();
  assert.equal(ctx.logMessage_(new Error('bad guest dana@example.com / 050-123-4567')), 'bad guest [email] / [number]');
});

test('without a Firestore config nothing is recorded, counted or sent', () => {
  const { ctx, props, cache, calls } = load({ firestore: null });
  ctx.logEvent_('request.created', { ref: 'SH-1' });
  ctx.countLogNoise_('request.captcha');
  assert.deepEqual(JSON.parse(JSON.stringify(ctx.flushEventLog_(false))), { ok: true, skipped: 'not_configured' });
  assert.equal(props.map.size, 0);
  assert.equal(cache.size, 0);
  assert.equal(calls.length, 0);
});

test('the buffer stops at its ceiling, and what it drops is counted', () => {
  const { ctx, props, cache } = load();
  for (let i = 0; i < ctx.LOG_BUFFER_MAX + 7; i++) ctx.logEvent_('mirror.rebuild', { ok: true });
  assert.equal(buffered(props).length, ctx.LOG_BUFFER_MAX);
  assert.deepEqual(JSON.parse(cache.get('logNoise')), { 'log.dropped': 7 });
});

test('logging never throws, even when Script Properties fail', () => {
  const broken = store();
  broken.getKeys = () => {
    throw new Error('quota');
  };
  const { ctx } = load({ props: broken });
  assert.doesNotThrow(() => ctx.logEvent_('request.created', { ref: 'SH-1' }));
});

test('a flush sends everything in one commit, with the noise counts as one event, then empties the buffer', () => {
  const { ctx, props, calls } = load();
  ctx.logEvent_('request.created', { ref: 'SH-1' }, 'guest');
  ctx.logEvent_('mirror.rebuild', { ok: true, ms: 1200, why: 'queued' });
  for (let i = 0; i < 3; i++) ctx.countLogNoise_('request.captcha');
  const out = ctx.flushEventLog_(false);
  assert.equal(out.ok, true);
  assert.equal(out.sent, 3);
  const [commit] = commits(calls);
  assert.equal(commit.writes.length, 3);
  const docs = Object.fromEntries(commit.writes.map((w) => [w.update.fields.type.stringValue, w.update]));
  assert.match(docs['request.created'].name, /^projects\/log-test\/databases\/\(default\)\/documents\/events\/\d+-[\w-]+$/);
  assert.equal(docs['request.created'].fields.class.stringValue, 'business');
  assert.equal(docs['mirror.rebuild'].fields.class.stringValue, 'system');
  const data = (doc) => doc.fields.data.mapValue.fields;
  assert.equal(docs['request.created'].fields.ref.stringValue, 'SH-1');
  assert.equal(docs['request.created'].fields.actor.stringValue, 'guest');
  assert.equal(data(docs['mirror.rebuild']).ms.integerValue, '1200');
  assert.equal(docs['mirror.rebuild'].fields.ms, undefined, 'details are not top-level, so not indexed');
  assert.equal(data(docs['request.created']).commit.stringValue, 'abc1234');
  assert.equal(data(docs['log.counts']).counts.mapValue.fields['request.captcha'].integerValue, '3');
  const days = (doc) => (Date.parse(doc.fields.expireAt.timestampValue) - Date.parse(doc.fields.ts.timestampValue)) / 86400000;
  assert.equal(days(docs['request.created']), 3 * 365);
  assert.equal(days(docs['mirror.rebuild']), 90);
  assert.equal(buffered(props).length, 0);
});

test('an empty buffer costs no commit', () => {
  const { ctx, props, calls } = load();
  props.setProperty('logPrunedOn', ctx.today_());
  ctx.flushEventLog_(false);
  assert.equal(calls.length, 0);
});

test('a failed flush keeps the events and backs off for an hour, then two, up to six', () => {
  let fail = true;
  const { ctx, props, calls } = load({ respond: (url, p) => (url.endsWith(':commit') && fail ? [503, {}] : defaultRespond(url, p)) });
  ctx.logEvent_('request.created', { ref: 'SH-1' });
  assert.equal(ctx.flushEventLog_(false).ok, false);
  assert.equal(buffered(props).length, 1);
  const first = JSON.parse(props.getProperty('logBackoff'));
  assert.equal(first.delayMs, 3600_000);

  const before = calls.length;
  assert.equal(ctx.flushEventLog_(false).skipped, 'backoff');
  assert.equal(calls.length, before, 'no call while backing off');

  ctx.flushEventLog_(true);
  assert.equal(JSON.parse(props.getProperty('logBackoff')).delayMs, 2 * 3600_000);
  for (let i = 0; i < 5; i++) ctx.flushEventLog_(true);
  assert.equal(JSON.parse(props.getProperty('logBackoff')).delayMs, 6 * 3600_000);

  fail = false;
  assert.equal(ctx.flushEventLog_(true).sent, 1);
  assert.equal(props.getProperty('logBackoff'), null);
  assert.equal(buffered(props).length, 0);
});

test('a flush that cannot get a token backs off too, and never throws', () => {
  const { ctx, props } = load({ respond: (url) => (url.includes('/token') ? [400, {}] : [200, {}]) });
  ctx.logEvent_('request.created', { ref: 'SH-1' });
  let out;
  assert.doesNotThrow(() => (out = ctx.flushEventLog_(false)));
  assert.equal(out.ok, false);
  assert.ok(props.getProperty('logBackoff'));
  assert.equal(buffered(props).length, 1);
});

test('a slow commit succeeds but still backs off', () => {
  const { ctx, props } = load();
  ctx.logEvent_('request.created', { ref: 'SH-1' });
  // The script's own Date: the clock jumps 20 s while the commit is under way.
  const ScriptDate = vm.runInContext('Date', ctx);
  const realNow = ScriptDate.now;
  let commitStarted = false;
  ctx.UrlFetchApp.fetch = ((fetch) => (url, params) => {
    if (url.endsWith(':commit')) commitStarted = true;
    return fetch(url, params);
  })(ctx.UrlFetchApp.fetch);
  ScriptDate.now = () => realNow() + (commitStarted ? 20_000 : 0);
  const out = ctx.flushEventLog_(false);
  ScriptDate.now = realNow;
  assert.equal(out.sent, 1);
  assert.ok(props.getProperty('logBackoff'));
});

test('once a day the flush deletes expired events', () => {
  const expired = ['projects/log-test/databases/(default)/documents/events/1-a', 'projects/log-test/databases/(default)/documents/events/2-b'];
  const { ctx, props, calls } = load({
    respond: (url, p) => (url.endsWith(':runQuery') ? [200, [...expired.map((name) => ({ document: { name } })), { readTime: 'x' }]] : defaultRespond(url, p)),
  });
  assert.equal(ctx.flushEventLog_(false).pruned, 2);
  const query = JSON.parse(calls.find((c) => c.url.endsWith(':runQuery')).params.payload).structuredQuery;
  assert.equal(query.where.fieldFilter.field.fieldPath, 'expireAt');
  assert.equal(query.limit, 500);
  assert.deepEqual(commits(calls)[0].writes, expired.map((name) => ({ delete: name })));
  assert.equal(props.getProperty('logPrunedOn'), ctx.today_());
  const before = calls.length;
  ctx.flushEventLog_(false);
  assert.equal(calls.length, before, 'pruned once per day');
});

test('the token request is a JWT signed with the service account key, and the token is reused', () => {
  const { ctx, calls } = load();
  assert.equal(ctx.firestoreToken_(), 'tok');
  assert.equal(ctx.firestoreToken_(), 'tok');
  const tokenCalls = calls.filter((c) => c.url.includes('/token'));
  assert.equal(tokenCalls.length, 1);
  const [head, claims, sig] = tokenCalls[0].params.payload.assertion.split('.');
  const decode = (s) => JSON.parse(Buffer.from(s, 'base64url').toString());
  assert.deepEqual(decode(head), { alg: 'RS256', typ: 'JWT', kid: 'k1' });
  assert.equal(decode(claims).iss, FIRESTORE.clientEmail);
  assert.equal(decode(claims).scope, 'https://www.googleapis.com/auth/datastore');
  assert.ok(crypto.verify('sha256', Buffer.from(head + '.' + claims), publicKey, Buffer.from(sig, 'base64url')));
});

test('a console cancellation is logged with its fee, but not the guest name or WhatsApp link', () => {
  const { ctx, props } = load();
  const result = { ok: true, result: 'cancelled', id: 'uid1', ref: 'SH-2', name: 'דנה', whatsapp: 'https://wa.me/9725', fee: { band: 'free', fee: 0 }, by: 'guest', emailed: false };
  assert.equal(ctx.logConsole_('cancelBooking', 'uid1', result), result);
  const event = JSON.parse(props.getProperty(buffered(props)[0]));
  assert.equal(event.type, 'console.cancelBooking');
  assert.equal(event.fee, 0);
  assert.equal(event.band, 'free');
  assert.equal(event.name, undefined);
  assert.equal(event.whatsapp, undefined);
});
