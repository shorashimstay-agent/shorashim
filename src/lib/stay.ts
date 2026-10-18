// The browser's view of the booking rules. The rules themselves — date arithmetic, prices and
// validation — live in shared/rules.js, which the Apps Script backend runs too, so the form and the
// server can never disagree. Only presentation helpers are defined here.
import {
  DAY_PARTICIPANT_TYPES,
  MAX_DAY_PARTICIPANTS,
  MAX_NIGHTS,
  NIGHT_BEFORE_CHECK_IN,
  NOTES_MAX,
  PREP_FRIDAY_START,
  PREP_START,
  STAY_TYPES,
  addDays,
  daysBetween,
  estimatePrice as estimateWith,
  findAlternatives,
  nightsOf,
  nightsSpan,
  parseSpans,
  spanIsFree,
  stayRange,
  staySpan,
  validateRequest,
} from '../../shared/rules.js';
import { getPrices } from './prices';

export type StayType = 'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night' | 'bride_day_wedding_night';

export { DAY_PARTICIPANT_TYPES, MAX_DAY_PARTICIPANTS, MAX_NIGHTS, NIGHT_BEFORE_CHECK_IN, NOTES_MAX, PREP_FRIDAY_START, PREP_START, STAY_TYPES, addDays, daysBetween, findAlternatives, nightsOf, nightsSpan, parseSpans, spanIsFree, stayRange, staySpan, validateRequest };

/** Local 'YYYY-MM-DDTHH:mm' times, end exclusive (shared/rules.js, "Spans"). */
export interface Span {
  start: string;
  end: string;
}

/** Whether a stay fits around the busy time (its span overlaps none of it). */
export const stayFits = (busy: Span[], type: StayType, checkIn: string, checkOut: string) => spanIsFree(busy, staySpan(type, checkIn, checkOut));

/** Busy time from taken nights alone, for an answer from a backend that sends no spans. */
export const spansOfNights = (nights: Iterable<string>): Span[] => [...nights].sort().map((n) => nightsSpan(n, addDays(n, 1)));

/** Friday, when preparation may also start at PREP_FRIDAY_START by arrangement. */
export const isFriday = (date: string) => fromISODate(date).getDay() === 5;

export { getPrices, getPricesVersion, usePrices } from './prices';

/** With `start`, Friday and Saturday nights take the weekend price. Null until the prices arrive. */
export const estimatePrice = (type: StayType, nights: number, adults: number, start?: string) =>
  estimateWith(type, nights, adults, getPrices(), start);

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
