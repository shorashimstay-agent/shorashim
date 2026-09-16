// The browser's view of the booking rules. The rules themselves — date arithmetic, prices and
// validation — live in shared/rules.js, which the Apps Script backend runs too, so the form and the
// server can never disagree. Only presentation helpers are defined here.
import {
  MAX_NIGHTS,
  NOTES_MAX,
  PRICES,
  STAY_TYPES,
  addDays,
  daysBetween,
  estimatePrice,
  nightsOf,
  stayRange,
  validateRequest,
} from '../../shared/rules.js';

export type StayType = 'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night';

export { MAX_NIGHTS, NOTES_MAX, PRICES, STAY_TYPES, addDays, daysBetween, estimatePrice, nightsOf, stayRange, validateRequest };

/** Wedding-type stays are keyed by the wedding date; a wedding night is an ordinary one-night stay. */
export const isWeddingStay = (type: StayType) => STAY_TYPES[type].wedding;

/** Calendar cells are local Dates; convert by their displayed day, not by UTC. */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function fromISODate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

export const formatHebrewDate = (date: string) => date.split('-').reverse().join('.');
