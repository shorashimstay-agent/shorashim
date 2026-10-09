// The booking form's behaviour: state, validation against the shared rules, availability, the
// request to the web app and the WhatsApp fallback. BookingSection.tsx only lays it out, so a
// redesign of that section (docs/front-sync.md) never has to touch this file.
import { useEffect, useId, useRef, useState } from 'react';
import { BRAND_DATA } from '../data/shorashimData';
import { bookingApiEnabled, fetchAvailability, submitBookingRequest, type Availability } from '../lib/bookingApi';
import { preloadRecaptcha, recaptchaToken } from '../lib/recaptcha';
import {
  addDays,
  DAY_PARTICIPANT_TYPES,
  daysBetween,
  estimatePrice,
  MAX_DAY_PARTICIPANTS,
  usePrices,
  formatHebrewDate,
  isWeddingStay,
  israelToday,
  NOTES_MAX,
  nightsOf,
  stayRange,
  validateRequest,
  type StayType,
} from '../lib/stay';

export type Field = 'dates' | 'name' | 'phone' | 'email' | 'notes';
export type FieldErrors = Partial<Record<Field, string>>;

export type Submission =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent'; ref: string; holdHours: number }
  | { state: 'failed'; message: string };

const NO_BLOCKS = new Set<string>();

/** Maps the shared rules' error codes onto the form's fields and wording, for both validation passes. */
const SERVER_FIELD_ERRORS: Record<string, [Field, string]> = {
  stayType: ['dates', 'חלק מהפרטים אינם תקינים'],
  adults: ['dates', 'מספר האורחים אינו תקין'],
  participants: ['dates', 'מספר משתתפי היום אינו תקין'],
  checkIn: ['dates', 'התאריכים שנבחרו אינם תקינים'],
  checkOut: ['dates', 'התאריכים שנבחרו אינם תקינים'],
  name: ['name', 'נא למלא שם מלא'],
  phone: ['phone', 'נא למלא מספר טלפון תקין'],
  email: ['email', 'כתובת האימייל אינה תקינה'],
  notes: ['notes', `ההערות ארוכות מדי (עד ${NOTES_MAX} תווים)`],
};

const STAY_TYPE_NAMES: Record<StayType, string> = {
  couple: 'אירוח זוגי בוטיק',
  bride_day: 'חוויית כלה: יום כלה (התארגנות ביום החתונה)',
  bride_night_day: 'חוויית כלה: לילה לפני + יום כלה',
  wedding_night: 'ליל כלולות לאחר החתונה',
};

export function useBookingForm(initialStayType: StayType = 'couple') {
  const ids = {
    stayType: useId(),
    fullName: useId(),
    phone: useId(),
    email: useId(),
    notes: useId(),
    datesLabel: useId(),
    adultsLabel: useId(),
    participants: useId(),
  };
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState('');

  const [stayType, setStayType] = useState<StayType>(initialStayType);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adultsCount, setAdultsCount] = useState<number>(2);
  // Bride-day packages only: everyone present during the day, the bride included (up to 5).
  const [participants, setParticipants] = useState<number>(2);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState(''); // Honeypot: hidden from people, filled in by bots.
  const [errors, setErrors] = useState<FieldErrors>({});
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityState, setAvailabilityState] = useState<'loading' | 'ready' | 'error'>(bookingApiEnabled ? 'loading' : 'error');
  const [submission, setSubmission] = useState<Submission>({ state: 'idle' });
  const [whatsAppOpened, setWhatsAppOpened] = useState(false);

  const wedding = isWeddingStay(stayType);
  const hasDayParticipants = DAY_PARTICIPANT_TYPES.includes(stayType);
  const nights = !wedding && checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;

  // Package buttons elsewhere on the page change the selected stay type.
  useEffect(() => setStayType(initialStayType), [initialStayType]);

  // Regular and wedding stays pick dates differently, so switching between them starts over.
  useEffect(() => {
    setCheckIn('');
    setCheckOut('');
  }, [wedding]);

  const loadAvailability = () => {
    if (!bookingApiEnabled) return;
    fetchAvailability()
      .then((result) => {
        setAvailability(result);
        setAvailabilityState('ready');
      })
      .catch(() => setAvailabilityState('error'));
  };

  useEffect(loadAvailability, []);

  // Load reCAPTCHA as the booking section comes into view, so submitting does not wait for it.
  useEffect(() => {
    const section = document.getElementById('booking');
    if (!section || !('IntersectionObserver' in window)) {
      preloadRecaptcha();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          preloadRecaptcha();
          observer.disconnect();
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Shown before check-out is picked too, so quote at least one night. usePrices re-renders the
  // form when the live prices arrive; the first night decides which nights are weekend nights.
  usePrices();
  const estimate = estimatePrice(stayType, Math.max(nights, 1), adultsCount, checkIn || undefined);
  const stayTypeName = STAY_TYPE_NAMES[stayType];

  const datesText = (() => {
    if (!checkIn) return '';
    if (wedding) return `תאריך החתונה: ${formatHebrewDate(checkIn)}`;
    if (!checkOut) return `הגעה ${formatHebrewDate(checkIn)} · בחרו תאריך עזיבה`;
    return `הגעה ${formatHebrewDate(checkIn)} · עזיבה ${formatHebrewDate(checkOut)} (${nights === 1 ? 'לילה אחד' : `${nights} לילות`})`;
  })();

  const clearDates = () => {
    setCheckIn('');
    setCheckOut('');
  };

  const changeDates = (nextCheckIn: string, nextCheckOut: string) => {
    setCheckIn(nextCheckIn);
    setCheckOut(nextCheckOut);
    setErrors(({ dates: _dates, ...rest }) => rest);
  };

  /**
   * Checks the form against the same rules the server will apply, so the guest is told here rather
   * than after a round trip. Empty dates get their own message: the shared rules only know the
   * value is invalid, not that the guest has yet to choose.
   */
  const validate = (): FieldErrors => {
    // Report every problem at once. Without dates, the other fields are checked against placeholder
    // dates, and the dates get their own message.
    const missingDates = !checkIn || (!wedding && !checkOut);
    const placeholderIn = addDays(israelToday(), 2);
    const check = validateRequest(
      {
        stayType,
        checkIn: missingDates ? placeholderIn : checkIn,
        checkOut: wedding ? '' : missingDates ? addDays(placeholderIn, 1) : checkOut,
        adults: adultsCount,
        participants: hasDayParticipants ? participants : undefined,
        name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
      },
      israelToday()
    );
    const found: FieldErrors = {};
    if (!check.ok) {
      Object.keys(check.errors).forEach((key) => {
        const [field, message] = SERVER_FIELD_ERRORS[key] ?? ['dates', 'חלק מהפרטים אינם תקינים'];
        found[field] = message;
      });
    }
    if (missingDates) found.dates = wedding ? 'בחרו את תאריך החתונה' : 'בחרו תאריכי הגעה ועזיבה';
    return found;
  };

  /** Opens WhatsApp with the form's details filled in; `ref` when a request was already sent. */
  const openWhatsApp = (ref?: string) => {
    const messageLines = [
      ref ? `שלום שורשים, שלחתי בקשת הזמנה באתר (מספר ${ref}):` : `שלום שורשים, אשמח לבדוק זמינות ולהזמין:`,
      `• סוג האירוח: ${stayTypeName}`,
      checkIn ? (wedding ? `• תאריך החתונה: ${formatHebrewDate(checkIn)}` : `• תאריך הגעה: ${formatHebrewDate(checkIn)}`) : '',
      checkOut && !wedding ? `• תאריך עזיבה: ${formatHebrewDate(checkOut)} (${nights} לילות)` : '',
      `• מספר אורחים (מבוגרים): ${adultsCount}`,
      hasDayParticipants ? `• משתתפי יום (כולל הכלה, מלוות ואנשי מקצוע): ${participants}` : '',
      fullName ? `• שם: ${fullName}` : '',
      phone ? `• טלפון: ${phone}` : '',
      notes ? `• הערות/בקשות מיוחדות: ${notes}` : '',
    ].filter(Boolean);

    const message = encodeURIComponent(messageLines.join('\n'));
    window.open(`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${message}`, '_blank');
    setWhatsAppOpened(true);
  };

  // Moves focus to the first field with an error and says how many there are.
  const focusFirstError = (found: FieldErrors) => {
    const order: [Field, string][] = [
      ['dates', ids.datesLabel],
      ['name', ids.fullName],
      ['phone', ids.phone],
      ['email', ids.email],
      ['notes', ids.notes],
    ];
    const first = order.find(([field]) => found[field]);
    const count = Object.keys(found).length;
    setAnnouncement(count === 1 ? 'יש שדה אחד שצריך לתקן.' : `יש ${count} שדות שצריך לתקן.`);
    if (!first) return;
    if (first[0] === 'dates') {
      // The date picker's focusable day (it keeps one day in the tab order), else its first free day.
      const calendar = document.querySelector(`[aria-labelledby="${ids.datesLabel}"]`);
      calendar?.querySelector<HTMLElement>('button[tabindex="0"], .rdp-day_button:not([disabled])')?.focus();
      return;
    }
    document.getElementById(first[1])?.focus();
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }

    setSubmission({ state: 'sending' });
    setAnnouncement('שולחים את הבקשה...');
    let token = '';
    try {
      token = await recaptchaToken('booking_request');
    } catch {
      // The server decides whether a missing token is acceptable.
    }
    const result = await submitBookingRequest({
      stayType,
      checkIn,
      checkOut: wedding ? '' : checkOut,
      adults: adultsCount,
      participants: hasDayParticipants ? participants : undefined,
      name: fullName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      notes: notes.trim(),
      website,
      recaptchaToken: token,
    });

    if (result.ok) {
      const { ref, holdHours } = result;
      setSubmission({ state: 'sent', ref, holdHours });
      setAnnouncement('');
      // The success panel replaces the form; move focus to it so nobody is left on a vanished button.
      setTimeout(() => successHeadingRef.current?.focus(), 0);
      // The public availability sheet catches up within about a minute; grey out the held nights now.
      const held = stayRange(stayType, checkIn, checkOut);
      setAvailability((current) => current && { ...current, blocked: new Set([...current.blocked, ...nightsOf(held.start, held.end)]) });
      return;
    }
    if (result.error === 'unavailable') {
      clearDates();
      loadAvailability();
      setErrors({ dates: 'חלק מהתאריכים נתפסו בינתיים. בחרו תאריכים אחרים.' });
      setSubmission({ state: 'idle' });
      focusFirstError({ dates: 'x' });
      return;
    }
    if (result.error === 'invalid' && result.fields) {
      const mapped: FieldErrors = {};
      Object.keys(result.fields).forEach((key) => {
        const [field, message] = SERVER_FIELD_ERRORS[key] ?? ['dates', 'חלק מהפרטים אינם תקינים'];
        mapped[field] = message;
      });
      setErrors(mapped);
      setSubmission({ state: 'idle' });
      focusFirstError(mapped);
      return;
    }
    setAnnouncement('');
    setSubmission({
      state: 'failed',
      message:
        result.error === 'rate_limited'
          ? 'נשלחו מכם כבר כמה בקשות. נשמח להמשיך את השיחה ב-WhatsApp.'
          : result.error === 'network'
            ? 'לא הצלחנו לוודא שהבקשה נקלטה. אם לא נחזור אליכם בקרוב, כתבו לנו ב-WhatsApp.'
            : 'לא הצלחנו לשלוח את הבקשה כרגע. אפשר לשלוח אותה אלינו ב-WhatsApp.',
    });
  };

  const startNewRequest = () => {
    clearDates();
    setNotes('');
    setSubmission({ state: 'idle' });
  };

  const sending = submission.state === 'sending';

  // A request takes a few seconds; say what is happening while the button waits.
  const [sendingSeconds, setSendingSeconds] = useState(0);
  useEffect(() => {
    if (!sending) {
      setSendingSeconds(0);
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => setSendingSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [sending]);
  const sendingLabel =
    sendingSeconds < 3 ? 'שולחים את הבקשה...' : sendingSeconds < 8 ? 'בודקים זמינות ושומרים ביומן...' : 'עוד רגע, מסיימים...';

  return {
    apiEnabled: bookingApiEnabled,
    ids,
    successHeadingRef,
    announcement,
    stayType,
    setStayType,
    stayTypeName,
    wedding,
    checkIn,
    checkOut,
    nights,
    datesText,
    changeDates,
    clearDates,
    blocked: availability?.blocked ?? NO_BLOCKS,
    windowEnd: availability?.to,
    availabilityState,
    adultsCount,
    hasDayParticipants,
    participants,
    setParticipants,
    maxDayParticipants: MAX_DAY_PARTICIPANTS,
    setAdultsCount,
    fullName,
    setFullName,
    phone,
    setPhone,
    email,
    setEmail,
    notes,
    setNotes,
    website,
    setWebsite,
    errors,
    estimate,
    submission,
    sending,
    sendingLabel,
    submit,
    startNewRequest,
    openWhatsApp,
    whatsAppOpened,
  };
}

export type BookingForm = ReturnType<typeof useBookingForm>;
