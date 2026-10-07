// The prices the page shows, read from the owner's prices sheet as a public CSV when the page opens
// (docs/front-sync.md, "Prices"). There are no prices in the code: until the sheet answers, or if it
// cannot be read, prices are null and the page says the price will be set personally.
import { useSyncExternalStore } from 'react';
import { pricesFromRows } from '../../shared/rules.js';
import { PRICES_CSV_URL } from '../data/bookingConfig';
import { parseCsv } from './csv';

export type Prices = Record<string, number>;

let current: { version: string; prices: Prices } | null = null;
const listeners = new Set<() => void>();

export const getPrices = (): Prices | null => current?.prices ?? null;
/** Sent with each request; the web app re-reads the sheet when its copy is a different version. */
export const getPricesVersion = () => current?.version ?? '';

let loading: Promise<void> | null = null;

/** Reads the prices sheet once per page. Any failure leaves the prices null. */
export function loadLivePrices(): Promise<void> {
  if (!PRICES_CSV_URL) return Promise.resolve();
  loading ??= (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(PRICES_CSV_URL, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) return;
      const checked = pricesFromRows(parseCsv(await res.text()));
      if (!checked.ok) return;
      current = { version: checked.version, prices: checked.prices };
      listeners.forEach((listener) => listener());
    } catch {
      // No prices: the page shows none, and the web app prices the request itself.
    } finally {
      clearTimeout(timer);
    }
  })();
  return loading;
}

// The first component that shows a price starts the fetch.
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  void loadLivePrices();
  return () => {
    listeners.delete(listener);
  };
};

/** The prices in force, or null; components that use it re-render when they arrive. */
export const usePrices = () => useSyncExternalStore(subscribe, getPrices, getPrices);
