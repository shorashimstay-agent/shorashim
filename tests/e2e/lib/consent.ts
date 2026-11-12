// Playwright storage states with a saved cookie choice, so suites that don't test the banner never
// see it and never load a marketing tool. Built at run time with today's date and the current
// consent version, so they never expire or go stale on a version bump.
import { CONSENT_KEY, consentRecord } from '../../../shared/consentRules.js';

const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

export function consentState(origins: string[], choice: 'granted' | 'denied' = 'denied') {
  return {
    cookies: [],
    origins: origins.map((origin) => ({
      origin,
      localStorage: [{ name: CONSENT_KEY, value: JSON.stringify(consentRecord(choice, israelToday())) }],
    })),
  };
}

/** No saved choice: the banner shows. */
export const NO_CONSENT = { cookies: [], origins: [] };
