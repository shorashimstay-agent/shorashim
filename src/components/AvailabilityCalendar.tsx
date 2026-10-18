import { DayPicker, type Modifiers } from 'react-day-picker';
import { he } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import {
  MAX_NIGHTS,
  addDays,
  daysBetween,
  fromISODate,
  isWeddingStay,
  israelToday,
  stayFits,
  stayRange,
  toISODate,
  type Span,
  type StayType,
} from '../lib/stay';

interface AvailabilityCalendarProps {
  stayType: StayType;
  /** Nights that are taken; empty while availability is unknown. */
  blocked: Set<string>;
  /** The time taken (shared/rules.js, "Spans"), which tells whether a package fits a date. */
  busy: Span[];
  /** Exclusive end of the window the availability covers. */
  windowEnd?: string;
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}

/**
 * Date picker that only allows stays that fit. Regular stays pick check-in then check-out, and a
 * check-out may fall on a day whose night is taken. Wedding stays pick the wedding date. A choice
 * fits when the stay's span (staySpan: its hours, not just its nights) overlaps no busy time.
 */
export default function AvailabilityCalendar({ stayType, blocked, busy, windowEnd, checkIn, checkOut, onChange }: AvailabilityCalendarProps) {
  const wedding = isWeddingStay(stayType);
  const today = israelToday();
  const firstDate = wedding ? addDays(today, 1) : today;
  const lastNight = windowEnd ? addDays(windowEnd, -1) : addDays(today, 365);
  const pickingCheckOut = !wedding && Boolean(checkIn) && !checkOut;

  const isDisabled = (date: Date) => {
    const d = toISODate(date);
    if (d < firstDate) return true;
    if (wedding) return d > lastNight || !stayFits(busy, stayType, d, '');
    if (pickingCheckOut && d > checkIn) {
      return d > addDays(lastNight, 1) || daysBetween(checkIn, d) > MAX_NIGHTS || !stayFits(busy, stayType, checkIn, d);
    }
    return d > lastNight || !stayFits(busy, stayType, d, addDays(d, 1));
  };
  // Taken for this package: a wedding date it does not fit, or a night a stay cannot start on.
  const taken = (d: string) => (wedding ? d <= lastNight && d >= firstDate && !stayFits(busy, stayType, d, '') : blocked.has(d));

  const handleDayClick = (date: Date, modifiers: Modifiers) => {
    if (modifiers.disabled) return;
    const d = toISODate(date);
    if (wedding || !checkIn || checkOut || d <= checkIn) onChange(d, '');
    else onChange(checkIn, d);
  };

  // Bride packages highlight the guest's own days, rather than every night their event keeps free.
  const range = checkIn
    ? stayType === 'bride_day'
      ? { start: checkIn, end: checkIn }
      : stayType === 'bride_night_day'
        ? { start: addDays(checkIn, -1), end: checkIn }
        : stayType === 'bride_day_wedding_night'
          ? { start: checkIn, end: addDays(checkIn, 1) }
          : stayRange(stayType, checkIn, checkOut || checkIn)
    : null;
  const inRange = (date: Date, part: 'start' | 'middle' | 'end') => {
    if (!range) return false;
    const d = toISODate(date);
    if (part === 'start') return d === range.start;
    if (part === 'end') return range.end !== range.start && d === range.end;
    return d > range.start && d < range.end;
  };

  return (
    <DayPicker
      dir="rtl"
      locale={he}
      className="shorashim-calendar"
      defaultMonth={fromISODate(checkIn || firstDate)}
      startMonth={fromISODate(today)}
      endMonth={fromISODate(lastNight)}
      showOutsideDays={false}
      disabled={isDisabled}
      onDayClick={handleDayClick}
      labels={{
        // Screen readers hear the full date and whether it can be chosen, not just the day number.
        labelDayButton: (date: Date, modifiers: Modifiers) => {
          const d = toISODate(date);
          const text = date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          if (wedding && d === checkIn) return `${text}, תאריך החתונה שנבחר`;
          if (range && d === range.start) return `${text}, תאריך ההגעה שנבחר`;
          if (range && d === range.end) return `${text}, תאריך העזיבה שנבחר`;
          if (taken(d)) return `${text}, תפוס`;
          if (modifiers.disabled) return `${text}, לא זמין לבחירה`;
          return text;
        },
      }}
      modifiers={{
        booked: (date: Date) => taken(toISODate(date)),
        stayStart: (date: Date) => inRange(date, 'start'),
        stayMiddle: (date: Date) => inRange(date, 'middle'),
        stayEnd: (date: Date) => inRange(date, 'end'),
      }}
      modifiersClassNames={{
        booked: 'stay-booked',
        stayStart: 'stay-edge',
        stayEnd: 'stay-edge',
        stayMiddle: 'stay-middle',
      }}
    />
  );
}
