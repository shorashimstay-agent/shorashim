// Starts the site's marketing tools (src/consent/tools.ts) after consent, and stops them when it is
// withdrawn. Imported only by src/main.tsx (the main and bride pages), so the legal pages never
// bundle a tool's loader.
//
// Meta documents fbq('consent','revoke') only as a pause, and may send queued events on 'grant', so
// a loaded tool is never re-granted: withdrawing stops it at once and reloads the page (asking first
// when the booking form has typed text), and re-accepting on such a page reloads it too.
import { getMarketingConsent, initConsent, onConsentChange, type Choice, type ChangeSource } from './consent';
import { isMetaPixelLoaded, isMetaPixelRevoked, loadMetaPixel, revokeMetaPixel } from './metaPixel';
import { SITE_TOOLS } from '../consent/tools';

interface Loader {
  load: () => void;
  revoke: () => void;
  isLoaded: () => boolean;
  isRevoked: () => boolean;
}

const LOADERS: Record<string, Loader> = {
  meta: { load: loadMetaPixel, revoke: revokeMetaPixel, isLoaded: isMetaPixelLoaded, isRevoked: isMetaPixelRevoked },
};

const siteLoaders = () => SITE_TOOLS.map((t) => LOADERS[t.id]).filter((l): l is Loader => Boolean(l));
const anyLoaded = () => siteLoaders().some((l) => l.isLoaded());
const anyRevoked = () => siteLoaders().some((l) => l.isRevoked());

const RELOAD_QUESTION = 'ההעדפה תיכנס לתוקף אחרי רענון הדף. לרענן עכשיו?';

function bookingFormHasText(): boolean {
  return [...document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    '#booking input[type="text"], #booking input[type="tel"], #booking input[type="email"], #booking textarea'
  )].some((el) => el.name !== 'website' && el.value.trim() !== '');
}

/** Reloads now, or, when the visitor is mid-form and says "later", leaves it to the next page load. */
function reloadSoon() {
  if (bookingFormHasText() && !window.confirm(RELOAD_QUESTION)) return;
  window.location.reload();
}

function onChange(choice: Choice | null, source: ChangeSource) {
  if (choice === 'granted') {
    // A page whose tool was stopped earlier is reloaded instead of re-granted.
    if (anyRevoked()) reloadSoon();
    // An accept made in another tab applies from this tab's next page load.
    else if (source === 'local') siteLoaders().forEach((l) => l.load());
    return;
  }
  if (!anyLoaded()) return;
  siteLoaders().forEach((l) => l.revoke());
  reloadSoon();
}

let started = false;

/** Call once, on the main and bride pages. */
export function startMarketing(): void {
  if (started) return;
  started = true;
  initConsent();
  onConsentChange(onChange);
  if (getMarketingConsent() === 'granted') siteLoaders().forEach((l) => l.load());
}
