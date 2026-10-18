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
  nightsOf,
  stayRange,
  toISODate,
  type StayType,
} from '../lib/stay';

interface AvailabilityCalendarProps {
  stayType: StayType;
  /** Nights that are taken; empty while availability is unknown. */
  blocked: Set<string>;
  /** Exclusive end of the window the availability covers. */
  windowEnd?: string;
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}

/**
 * Date picker that only allows free nights. Regular stays pick check-in then check-out, and a
 * check-out may fall on a day whose night is taken. Wedding stays pick the wedding date, which
 * needs every night the package holds free (stayRange): the night before and the wedding night, or
 * the wedding night alone for the prep day + wedding night.
 */
export default function AvailabilityCalendar({ stayType, blocked, windowEnd, checkIn, checkOut, onChange }: AvailabilityCalendarProps) {
  const wedding = isWeddingStay(stayType);
  const today = israelToday();
  const firstDate = wedding ? addDays(today, 1) : today;
  const lastNight = windowEnd ? addDays(windowEnd, -1) : addDays(today, 365);
  const pickingCheckOut = !wedding && Boolean(checkIn) && !checkOut;

  const isDisabled = (date: Date) => {
    const d = toISODate(date);
    if (d < firstDate) return true;
    if (wedding) {
      const held = stayRange(stayType, d, '');
      return d > lastNight || nightsOf(held.start, held.end).some((n) => blocked.has(n));
    }
    if (pickingCheckOut && d > checkIn) {
      return d > addDays(lastNight, 1) || daysBetween(checkIn, d) > MAX_NIGHTS || nightsOf(checkIn, d).some((n) => blocked.has(n));
    }
    return d > lastNight || blocked.has(d);
  };

  const handleDayClick = (date: Date, modifiers: Modifiers) => {
    if (modifiers.disabled) return;
    const d = toISODate(date);
    if (wedding || !checkIn || checkOut || d <= checkIn) onChange(d, '');
    else onChange(checkIn, d);
  };

  // Day-only bridal preparation highlights the chosen day, rather than the surrounding hold nights.
  const range = checkIn ? (stayType === 'bride_day' ? { start: checkIn, end: checkIn } : stayType === 'bride_night_day' ? { start: addDays(checkIn, -1), end: checkIn } : stayRange(stayType, checkIn, checkOut || checkIn)) : null;
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
          if (blocked.has(d)) return `${text}, תפוס`;
          if (modifiers.disabled) return `${text}, לא זמין לבחירה`;
          return text;
        },
      }}
      modifiers={{
        booked: (date: Date) => blocked.has(toISODate(date)),
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
