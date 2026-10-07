// The prices the page shows. It starts with public/prices.json, the copy the site was built with, and
// switches to the live prices once the web app answers ?action=prices. The web app reads them from the
// owner's prices spreadsheet, so a price change reaches the page without a build (shared/rules.js).
import { useSyncExternalStore } from 'react';
import { checkPrices } from '../../shared/rules.js';
import pricesFile from '../../public/prices.json';
import { BOOKING_API_URL } from '../data/bookingConfig';

export type Prices = Record<string, number>;

const bundled = checkPrices(pricesFile);
// shared/rules.test.mjs checks the file, so a broken one never gets this far.
if (!bundled.ok) throw new Error(`public/prices.json: ${bundled.error}`);

let current: { version: string; prices: Prices } = { version: bundled.version, prices: bundled.prices };
const listeners = new Set<() => void>();

export const getPrices = () => current.prices;
/** Sent with each request; the web app re-reads its prices when its copy is a different version. */
export const getPricesVersion = () => current.version;

// The first component that shows a price starts the fetch.
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  void loadLivePrices();
  return () => listeners.delete(listener);
};

/** The prices in force; components that use it re-render when the live prices arrive. */
export const usePrices = () => useSyncExternalStore(subscribe, getPrices, getPrices);

let loading: Promise<void> | null = null;

/** Fetches the live prices once per page. Any failure keeps the built-in copy. */
export function loadLivePrices(): Promise<void> {
  if (!BOOKING_API_URL) return Promise.resolve();
  loading ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${BOOKING_API_URL}?action=prices&pv=${encodeURIComponent(current.version)}`, { signal: controller.signal });
      const checked = checkPrices(await res.json());
      if (!checked.ok || checked.version === current.version) return;
      current = { version: checked.version, prices: checked.prices };
      listeners.forEach((listener) => listener());
    } catch {
      // Keep the built-in prices; the web app still prices the request itself.
    } finally {
      clearTimeout(timer);
    }
  })();
  return loading;
}
