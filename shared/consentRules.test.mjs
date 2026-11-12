import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_MAX_AGE_DAYS,
  CONSENT_VERSION,
  DEFAULT_PIXEL_HOSTS,
  consentRecord,
  cookieDeletions,
  isPixelHost,
  parseConsent,
  parseHosts,
} from './consentRules.js';

const store = (r) => JSON.stringify(r);

test('a fresh choice is valid in both directions', () => {
  assert.equal(parseConsent(store(consentRecord('granted', '2026-11-12')), '2026-11-12'), 'granted');
  assert.equal(parseConsent(store(consentRecord('denied', '2026-11-12')), '2026-11-12'), 'denied');
});

test('a choice expires after about six months', () => {
  const at = '2026-01-01';
  const last = new Date(Date.parse(`${at}T00:00:00Z`) + CONSENT_MAX_AGE_DAYS * 86400000).toISOString().slice(0, 10);
  const after = new Date(Date.parse(`${at}T00:00:00Z`) + (CONSENT_MAX_AGE_DAYS + 1) * 86400000).toISOString().slice(0, 10);
  assert.equal(parseConsent(store(consentRecord('granted', at)), last), 'granted');
  assert.equal(parseConsent(store(consentRecord('granted', at)), after), null);
});

test('an old version, a future date or junk is no choice at all', () => {
  assert.equal(parseConsent(store({ v: CONSENT_VERSION - 1, marketing: 'granted', at: '2026-11-12' }), '2026-11-12'), null);
  assert.equal(parseConsent(store(consentRecord('granted', '2026-12-01')), '2026-11-12'), null);
  assert.equal(parseConsent(store({ v: CONSENT_VERSION, marketing: 'yes', at: '2026-11-12' }), '2026-11-12'), null);
  assert.equal(parseConsent('{not json', '2026-11-12'), null);
  assert.equal(parseConsent('', '2026-11-12'), null);
  assert.equal(parseConsent(null, '2026-11-12'), null);
});

test('the pixel host gate matches exact hosts only', () => {
  assert.deepEqual(parseHosts(''), DEFAULT_PIXEL_HOSTS);
  assert.deepEqual(parseHosts(' localhost , Example.test '), ['localhost', 'example.test']);
  assert.ok(isPixelHost('shorashimstay.com', DEFAULT_PIXEL_HOSTS));
  assert.ok(isPixelHost('www.shorashimstay.com', DEFAULT_PIXEL_HOSTS));
  assert.ok(!isPixelHost('localhost', DEFAULT_PIXEL_HOSTS));
  assert.ok(!isPixelHost('127.0.0.1', DEFAULT_PIXEL_HOSTS));
  assert.ok(!isPixelHost('shorashimstay.com.evil.test', DEFAULT_PIXEL_HOSTS));
  assert.ok(!isPixelHost('evil.shorashimstay.com', DEFAULT_PIXEL_HOSTS));
});

test('cookie deletion covers host-only and the registrable domain', () => {
  assert.deepEqual(cookieDeletions('_fbp', 'localhost'), ['_fbp=; Max-Age=0; path=/']);
  assert.deepEqual(cookieDeletions('_fbp', '127.0.0.1'), ['_fbp=; Max-Age=0; path=/']);
  assert.deepEqual(cookieDeletions('_fbp', 'shorashimstay.com'), [
    '_fbp=; Max-Age=0; path=/',
    '_fbp=; Max-Age=0; path=/; domain=.shorashimstay.com',
  ]);
  assert.deepEqual(cookieDeletions('_fbc', 'www.shorashimstay.com'), [
    '_fbc=; Max-Age=0; path=/',
    '_fbc=; Max-Age=0; path=/; domain=.shorashimstay.com',
    '_fbc=; Max-Age=0; path=/; domain=.www.shorashimstay.com',
  ]);
});
