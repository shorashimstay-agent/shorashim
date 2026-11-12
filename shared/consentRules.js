// The marketing-consent rules shared by the site (src/lib/consent.ts, src/lib/metaPixel.ts) and the
// Playwright configs. Plain JavaScript with no imports, so node and the test configs can load it
// directly (src/ modules read import.meta.env, which the Playwright loader doesn't have).
// Not part of the Apps Script backend: apps-script/deploy.py uploads only shared/rules.js.

/** Where the visitor's choice is kept (localStorage), and its version. */
export const CONSENT_KEY = 'shorashim:consent';
/**
 * Bump when the banner's purposes or the site tools change: every stored choice with an older
 * version is ignored, so every visitor is asked again.
 */
export const CONSENT_VERSION = 1;
/** A choice is remembered for about 6 months, then the visitor is asked again. */
export const CONSENT_MAX_AGE_DAYS = 183;

/** Hosts the pixel may load on, unless the build sets VITE_META_PIXEL_HOSTS. */
export const DEFAULT_PIXEL_HOSTS = ['shorashimstay.com', 'www.shorashimstay.com'];

const DAY_MS = 24 * 60 * 60 * 1000;

/** A stored choice record for the given ISO date (yyyy-mm-dd). */
export function consentRecord(marketing, today) {
  return { v: CONSENT_VERSION, marketing, at: today };
}

/**
 * The visitor's valid choice ('granted' or 'denied') from the stored text, or null when there is
 * none, it doesn't parse, it has another version, or it is older than CONSENT_MAX_AGE_DAYS.
 * `today` is an ISO date (yyyy-mm-dd).
 */
export function parseConsent(raw, today) {
  if (typeof raw !== 'string' || !raw) return null;
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!record || typeof record !== 'object' || record.v !== CONSENT_VERSION) return null;
  if (record.marketing !== 'granted' && record.marketing !== 'denied') return null;
  if (typeof record.at !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.at)) return null;
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${record.at}T00:00:00Z`)) / DAY_MS;
  if (!Number.isFinite(age) || age < 0 || age > CONSENT_MAX_AGE_DAYS) return null;
  return record.marketing;
}

/** The host list from a comma-separated setting, or the default when it is empty. */
export function parseHosts(setting) {
  const hosts = String(setting || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length ? hosts : DEFAULT_PIXEL_HOSTS;
}

/** True only for an exact host match: no suffixes, no subdomains of a listed host. */
export function isPixelHost(hostname, hosts) {
  return hosts.includes(String(hostname || '').toLowerCase());
}

/**
 * The document.cookie strings that delete a first-party cookie set by a marketing tool: host-only,
 * and on the registrable domain (Meta sets _fbp on ".shorashimstay.com") when the host has one.
 */
export function cookieDeletions(name, hostname) {
  const expire = `${name}=; Max-Age=0; path=/`;
  const labels = String(hostname || '').toLowerCase().split('.').filter(Boolean);
  const isIp = /^\d+(\.\d+){3}$/.test(String(hostname || ''));
  if (labels.length < 2 || isIp) return [expire];
  const base = labels.slice(-2).join('.');
  const out = [expire, `${expire}; domain=.${base}`];
  if (labels.length > 2) out.push(`${expire}; domain=.${labels.join('.')}`);
  return out;
}
