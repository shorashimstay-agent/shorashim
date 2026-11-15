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

test('contact details are normalised for matching, empty ones left out', async () => {
  const { matchingKeys } = await import('./consentRules.js');
  assert.deepEqual(matchingKeys({ name: '  בדיקה  אוטומטית ', phone: '050-123 4567', email: ' CI@Example.COM ' }), {
    em: 'ci@example.com',
    ph: '972501234567',
    fn: 'בדיקה',
    ln: 'אוטומטית',
    country: 'il',
  });
  assert.equal(matchingKeys({ phone: '+972 50-123-4567' }).ph, '972501234567');
  assert.equal(matchingKeys({ phone: '00972501234567' }).ph, '972501234567');
  assert.equal(matchingKeys({ phone: '+972 050 1234567' }).ph, '972501234567');
  assert.deepEqual(matchingKeys({ name: 'Dana', phone: '', email: '' }), { fn: 'dana' });
  assert.deepEqual(matchingKeys({ name: "Anne-Marie O'Neil Cohen", phone: '0501234567' }), { fn: 'annemarie', ln: 'oneilcohen', ph: '972501234567', country: 'il' });
  assert.deepEqual(matchingKeys({ name: 'שרה בן-דוד', phone: '+44 7700 900123' }), { fn: 'שרה', ln: 'בןדוד', ph: '447700900123' });
  // Typographic apostrophes and Hebrew punctuation are stripped too.
  assert.deepEqual(matchingKeys({ name: 'O’Neil בן־דוד צ׳רלי' }), { fn: 'oneil', ln: 'בןדודצרלי' });
  // An Israeli number typed without its leading 0 still gets the country code.
  assert.deepEqual(matchingKeys({ phone: '501234567' }), { ph: '972501234567', country: 'il' });
  assert.deepEqual(matchingKeys({ phone: '72-2345678' }), { ph: '972722345678', country: 'il' });
  // Other 9-digit numbers are left alone.
  assert.equal(matchingKeys({ phone: '412345678' }).ph, '412345678');
  assert.equal(matchingKeys({ phone: '712345678' }).ph, '712345678');
});
