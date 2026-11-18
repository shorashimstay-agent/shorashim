// The prices the page shows: the price list the web app publishes (shared/rules.js buildPriceList)
// in one cell of a hidden tab of the owner's prices sheet, read as a public CSV when the page opens.
// The web app validates the owner's edits before publishing, so a bad edit never reaches the page.
// There are no prices in the code: until the sheet answers, or if what it holds fails the checks,
// prices are null and the page says the price will be set personally.
import { useSyncExternalStore } from 'react';
import { checkPriceList } from '../../shared/rules.js';
import { PRICES_CSV_URL } from '../data/bookingConfig';
import { parseCsv } from './csv';

export type PriceList = {
  version: string;
  base: Record<string, number>;
  updates: { id: string; name: string; from: string; to: string; weekday?: number; weekend?: number; minimum?: number; twoNight?: number }[];
};

let current: PriceList | null = null;
const listeners = new Set<() => void>();

export const getPrices = (): PriceList | null => current;
/** Sent with each request, so the web app can tell the owner when a page showed older prices. */
export const getPricesVersion = () => current?.version ?? '';

/** The price list in a published CSV: its first cell holds the list as JSON. Null if it fails the checks. */
export function priceListFromCsv(text: string): PriceList | null {
  try {
    const cell = parseCsv(text)[0]?.[0];
    if (!cell) return null;
    const checked = checkPriceList(JSON.parse(cell));
    return checked.ok ? (checked.list as PriceList) : null;
  } catch {
    return null;
  }
}

let loading: Promise<void> | null = null;
// Each load's number: a slower, older fetch never replaces the list a newer one brought.
let generation = 0;

/** Reads the price list once per page. Any failure leaves the prices null. */
export function loadLivePrices(): Promise<void> {
  if (!PRICES_CSV_URL) return Promise.resolve();
  loading ??= (async () => {
    const mine = ++generation;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(PRICES_CSV_URL, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) return;
      const list = priceListFromCsv(await res.text());
      if (!list || mine !== generation) return;
      current = list;
      listeners.forEach((listener) => listener());
    } catch {
      // No prices: the page shows none, and the web app prices the request itself.
    } finally {
      clearTimeout(timer);
    }
  })();
  return loading;
}

/** Reads the price list again: the web app answered `price_changed`, so the page's copy is old. */
export function reloadPrices(): Promise<void> {
  loading = null;
  return loadLivePrices();
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
