// Date rules for the booking form. They mirror apps-script/src/rules.js, which is authoritative.
// Dates are 'YYYY-MM-DD' strings in Israel local time; a night is named by the date it starts.

export type StayType = 'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night';

export const MAX_NIGHTS = 14;

export const isWeddingStay = (type: StayType) => type === 'bride_day' || type === 'bride_night_day';

const DAY_MS = 86_400_000;
const toDayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS;
const fromDayNumber = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);

export const addDays = (date: string, n: number) => fromDayNumber(toDayNumber(date) + n);

export const daysBetween = (a: string, b: string) => toDayNumber(b) - toDayNumber(a);

export function nightsOf(start: string, end: string): string[] {
  const nights: string[] = [];
  for (let n = toDayNumber(start); n < toDayNumber(end); n++) nights.push(fromDayNumber(n));
  return nights;
}

/** Wedding-type stays are keyed by the wedding date and hold the night before and the wedding night. */
export function stayRange(type: StayType, checkIn: string, checkOut: string) {
  return isWeddingStay(type) ? { start: addDays(checkIn, -1), end: addDays(checkIn, 1) } : { start: checkIn, end: checkOut };
}

/** Calendar cells are local Dates; convert by their displayed day, not by UTC. */
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function fromISODate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());

export const formatHebrewDate = (date: string) => date.split('-').reverse().join('.');
