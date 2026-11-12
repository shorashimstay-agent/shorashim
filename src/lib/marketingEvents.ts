// The booking funnel's marketing events. Each is sent only if the visitor consented and the pixel
// is live (trackMeta checks both); nothing is queued for later.
import { trackMeta } from './metaPixel';

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

/**
 * Once per accepted booking request. The event id is random, never the request number, which the
 * owner could link to a named guest. No form field is sent.
 */
export function trackLead(ref: string, stayType: string): void {
  try {
    if (leads.has(ref)) return;
    leads.add(ref);
    trackMeta('Lead', { content_category: stayType }, randomId);
  } catch {
    // Marketing never breaks the booking flow.
  }
}
