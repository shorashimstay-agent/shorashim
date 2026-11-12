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
  if (initiated.has(key)) return;
  if (trackMeta('InitiateCheckout', { content_category: stayType })) initiated.add(key);
}

/**
 * Once per accepted booking request. The event id is random, never the request number, which the
 * owner could link to a named guest. No form field is sent.
 */
export function trackLead(ref: string, stayType: string): void {
  if (leads.has(ref)) return;
  leads.add(ref);
  trackMeta('Lead', { content_category: stayType }, crypto.randomUUID());
}
