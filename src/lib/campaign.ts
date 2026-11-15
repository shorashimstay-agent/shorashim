// The ad campaign that brought the visitor, from the link's utm_* parameters: campaign labels we
// wrote into our own ad links, not identifiers of the visitor or the device, and nothing is stored on
// the device, so no cookie consent is needed. Kept in memory; sent only with a booking request and
// kept by Shorashim (the privacy policy says so); nothing goes to an ad platform.
// fbclid and other parameters are ignored.

export interface Campaign {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

function read(): Campaign | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const out: Campaign = {};
    for (const key of ['source', 'medium', 'campaign', 'content'] as const) {
      const value = params.get(`utm_${key}`)?.trim();
      if (value) out[key] = value.slice(0, 200);
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** Read once, when the page loads; a visitor who moves to another page loses it (accepted). */
const CAMPAIGN = typeof window === 'undefined' ? null : read();

export const landingCampaign = (): Campaign | null => CAMPAIGN;
