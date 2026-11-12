// The visitor's marketing-consent choice (the cookie banner, src/consent/). Nothing marketing runs
// unless this says 'granted'. The choice is re-read from storage on every call, so a withdrawal in
// another tab, or on the privacy page before Back restores this page from the cache, takes effect.
// This module never loads a tool: marketingLoaders.ts subscribes with onConsentChange.
import { CONSENT_KEY, consentRecord, cookieDeletions, parseConsent } from '../../shared/consentRules.js';
import { SITE_TOOL_COOKIES } from '../consent/tools';

export type Choice = 'granted' | 'denied';
/** Where a change came from: this page, or another tab / the back-forward cache. */
export type ChangeSource = 'local' | 'external';

const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

/** The choice made on this page when storage is blocked; never treated as stored. */
let memoryChoice: Choice | null = null;

function readStored(): { ok: true; choice: Choice | null } | { ok: false } {
  try {
    return { ok: true, choice: parseConsent(localStorage.getItem(CONSENT_KEY), israelToday()) };
  } catch {
    return { ok: false };
  }
}

/** True when the browser lets the site save the choice. */
export function canStoreChoice(): boolean {
  try {
    const probe = `${CONSENT_KEY}:probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** The valid choice, or null when the visitor hasn't chosen (or the choice expired). */
export function getMarketingConsent(): Choice | null {
  // The in-memory choice stands in only when storage is blocked: a cleared or expired record means
  // no choice, even if this page accepted earlier.
  const stored = readStored();
  return stored.ok ? stored.choice : memoryChoice;
}

/** Deletes the first-party cookies every site tool may have set. */
export function deleteToolCookies(): void {
  for (const name of SITE_TOOL_COOKIES) {
    for (const deletion of cookieDeletions(name, location.hostname)) document.cookie = deletion;
  }
}

type Listener = (choice: Choice | null, source: ChangeSource) => void;
const listeners = new Set<Listener>();

export function onConsentChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(choice: Choice | null, source: ChangeSource) {
  listeners.forEach((l) => l(choice, source));
}

/** Saves the visitor's choice. Every saved 'denied' deletes the tools' cookies. */
export function setMarketingConsent(choice: Choice): { saved: boolean } {
  memoryChoice = choice;
  let saved = false;
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consentRecord(choice, israelToday())));
    saved = true;
  } catch {
    // Storage blocked: the choice applies to this page only.
  }
  if (choice === 'denied') deleteToolCookies();
  notify(choice, 'local');
  return { saved };
}

let started = false;

/**
 * Call once per page. Without a valid accept, the tools' cookies are deleted (an expired accept
 * must not leave them behind). Changes made in another tab, or on a page restored from the
 * back-forward cache, are passed on to the listeners.
 */
export function initConsent(): void {
  if (started) return;
  started = true;
  if (getMarketingConsent() !== 'granted') deleteToolCookies();
  window.addEventListener('storage', (e) => {
    if (e.key !== CONSENT_KEY && e.key !== null) return;
    const choice = getMarketingConsent();
    if (choice !== 'granted') deleteToolCookies();
    notify(choice, 'external');
  });
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    const choice = getMarketingConsent();
    if (choice !== 'granted') deleteToolCookies();
    notify(choice, 'external');
  });
}

/** Opens the cookie banner (the footer's "הגדרות עוגיות"); focus returns to `opener` after a choice. */
export const OPEN_SETTINGS_EVENT = 'shorashim:consent-settings';
export function openConsentSettings(opener?: HTMLElement | null): void {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT, { detail: { opener: opener ?? null } }));
}
