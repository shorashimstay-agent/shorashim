// The booking funnel's marketing events. Each is sent only if the visitor consented and the pixel
// is live (trackMeta checks both); nothing is queued for later.
import { matchingKeys } from '../../shared/consentRules.js';
import { setMetaMatching, trackMeta } from './metaPixel';

const initiated = new Set<string>();
const leads = new Set<string>();

/**
 * The first verified-free availability result for a date choice. A check made before the visitor
 * accepted doesn't use up those dates: the key is marked only once the event was actually sent.
 */
export function trackInitiateCheckout(key: string, stayType: string): void {
  try {
    if (initiated.has(key)) return;
    if (trackMeta('InitiateCheckout', { content_category: stayType })) initiated.add(key);
  } catch {
    // Marketing never breaks the booking flow.
  }
}

/** A random id; crypto.randomUUID is missing on older Safari and outside secure contexts. */
function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** SHA-256 of each value, as lower-case hex; values that can't be hashed are left out. */
async function hashAll(values: Record<string, string>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (!crypto?.subtle) return out;
  for (const [key, value] of Object.entries(values)) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    out[key] = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return out;
}

export interface LeadContact {
  name: string;
  phone: string;
  email: string;
}

/**
 * Once per accepted booking request. The event id is random, never the request number, which the
 * owner could link to a named guest. The guest's name, phone and email go with it only as SHA-256
 * hashes (advanced matching, which the privacy policy allows); notes and other fields never do.
 */
export async function trackLead(ref: string, stayType: string, contact?: LeadContact): Promise<void> {
  try {
    if (leads.has(ref)) return;
    leads.add(ref);
    if (contact) setMetaMatching(await hashAll(matchingKeys(contact)));
    trackMeta('Lead', { content_category: stayType }, randomId);
  } catch {
    // Marketing never breaks the booking flow; the Lead still goes without matching if hashing fails.
    try {
      trackMeta('Lead', { content_category: stayType }, randomId);
    } catch {
      // nothing more to do
    }
  }
}
