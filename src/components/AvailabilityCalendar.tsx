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
 * needs both the night before and the wedding night free.
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
    if (wedding) return d > lastNight || blocked.has(addDays(d, -1)) || blocked.has(d);
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

  const range = checkIn ? stayRange(stayType, checkIn, checkOut || checkIn) : null;
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
