// The Meta Pixel, loaded only after the visitor accepts (src/lib/consent.ts) and only on the hosts in
// VITE_META_PIXEL_HOSTS (default: the production domain), so staging, CI and local builds never send
// anything to Meta. No <noscript> image, no Advanced Matching, no automatic event collection.
import { isPixelHost, parseHosts } from '../../shared/consentRules.js';
import { getMarketingConsent } from './consent';

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '2571142213394523';
const HOSTS = parseHosts(import.meta.env.VITE_META_PIXEL_HOSTS);
const SCRIPT_URL = 'https://connect.facebook.net/en_US/fbevents.js';

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let loaded = false;
let revoked = false;

export const metaPixelAllowedHere = () => isPixelHost(location.hostname, HOSTS);
export const isMetaPixelLoaded = () => loaded;
export const isMetaPixelRevoked = () => revoked;

/** Loads the pixel and sends this page's PageView. Does nothing twice, or off the allowed hosts. */
export function loadMetaPixel(): void {
  if (loaded || !metaPixelAllowedHere() || getMarketingConsent() !== 'granted') return;
  loaded = true;
  // Meta's standard loader stub, without the <noscript> image.
  const fbq = function (this: unknown, ...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  // The site calls history.pushState on every in-page link (navigate.ts); without this, Meta's
  // script sends an extra PageView on each one, outside our consent check.
  fbq.disablePushState = true;
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  fbq('set', 'autoConfig', false, PIXEL_ID);
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');
  const script = document.createElement('script');
  script.async = true;
  script.src = SCRIPT_URL;
  document.head.appendChild(script);
}

/** Stops the loaded pixel at once (Meta's consent API). It stays stopped until the page reloads. */
export function revokeMetaPixel(): void {
  if (!loaded || revoked) return;
  revoked = true;
  window.fbq?.('consent', 'revoke');
}

/** Sends a standard event if the pixel is loaded, live and still consented to; true when sent. */
export function trackMeta(event: string, params: Record<string, unknown>, eventID?: string): boolean {
  if (!loaded || revoked || !window.fbq || getMarketingConsent() !== 'granted') return false;
  if (eventID) window.fbq('track', event, params, { eventID });
  else window.fbq('track', event, params);
  return true;
}
