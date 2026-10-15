// The booking form's behaviour: state, validation against the shared rules, availability, the
// request to the web app and the WhatsApp fallback. BookingSection.tsx only lays it out, so a
// redesign of that section (docs/front-sync.md) never has to touch this file.
import { useEffect, useId, useRef, useState } from 'react';
import { BRAND_DATA } from '../data/shorashimData';
import { bookingApiEnabled, checkDates, fetchAvailability, submitBookingRequest, type Availability } from '../lib/bookingApi';
import { preloadRecaptcha, recaptchaToken } from '../lib/recaptcha';
import {
  addDays,
  DAY_PARTICIPANT_TYPES,
  daysBetween,
  estimatePrice,
  findAlternatives,
  MAX_DAY_PARTICIPANTS,
  MAX_NIGHTS,
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

/** A stay the guest can switch to when the chosen dates are taken. */
export interface Alternative {
  checkIn: string;
  checkOut: string;
}

/**
 * Where the guest stands between choosing dates and the details screen ("להזמנה"). The details open
 * only on `free`; every other result is shown in the gate dialog. `key` names the stay type and
 * dates a result belongs to: changing any of them drops it.
 * - dates: no dates, half a range or an invalid one (`reason` says which)
 * - checking: the live check is running
 * - free: the web app says the nights are free now (`verified` false: no web app, WhatsApp only)
 * - taken: they are not; holidays get up to 3 nearby `alternatives`, bride packages none
 * - failed: no answer; never treated as free
 */
export type Gate =
  | { state: 'idle'; key?: undefined }
  | { state: 'dates'; key: string; reason: string }
  | { state: 'checking'; key: string }
  | { state: 'free'; key: string; verified: boolean }
  | { state: 'taken'; key: string; alternatives: Alternative[] }
  | { state: 'failed'; key: string };

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
  bride_day_wedding_night: 'חוויית כלה: יום התארגנות + ליל כלולות',
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

  const [gate, setGate] = useState<Gate>({ state: 'idle' });
  // Counts results to show, so the layout opens the details or the gate dialog once per result.
  const [gateShown, setGateShown] = useState(0);
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

  const gateKey = (type: StayType, from: string, to: string) => `${type}|${from}|${to}`;
  // A result belongs to the stay type and dates it was given for; any change drops it, and a check
  // still running for the old dates is ignored when it answers.
  const chosenKey = useRef('');
  chosenKey.current = gateKey(stayType, checkIn, checkOut);
  useEffect(() => {
    if (gate.key !== undefined && gate.key !== gateKey(stayType, checkIn, checkOut)) setGate({ state: 'idle' });
  }, [stayType, checkIn, checkOut, gate.key]);

  /** Why the dates cannot be checked yet, or '' when they can. Same rules as the server. */
  const datesReason = (from: string, to: string): string => {
    if (!from) return '';
    if (!wedding && !to) return 'בחרו גם תאריך עזיבה.';
    const check = validateRequest({ stayType, checkIn: from, checkOut: wedding ? '' : to, adults: 1, name: 'xx', phone: '0500000000' }, israelToday());
    if (check.ok) return '';
    const code = check.errors.checkIn || check.errors.checkOut;
    if (!code) return '';
    if (code === 'past') return wedding ? 'אפשר לבחור תאריך חתונה החל ממחר.' : 'התאריך שבחרתם כבר עבר.';
    if (code === 'too_far') return 'אפשר להזמין עד שנה מראש.';
    if (code === 'too_long') return `אפשר להזמין עד ${MAX_NIGHTS} לילות ברצף.`;
    return 'טווח התאריכים אינו תקין. בחרו תאריך כניסה ואחריו תאריך עזיבה.';
  };

  const showGate = (next: Gate) => {
    setGate(next);
    setGateShown((n) => n + 1);
  };

  /**
   * "להזמנה": checks the dates, then asks the web app whether they are free right now. The layout
   * opens the details on `free` and the gate dialog on anything else. Returns the result's state.
   * - `dates` overrides the chosen ones, for an alternative picked in the same click.
   * - `beforeSend`: run by submit when the dates have no `free` result yet (the #booking direct link
   *   shows the details without "להזמנה"); a free answer then changes nothing on screen.
   * - `takenNights`: the server refused the request because these nights were taken. The gate opens
   *   at once (checking), and the answer is "taken" whatever the check says.
   */
  const continueToDetails = async (dates?: Alternative, opts: { beforeSend?: boolean; takenNights?: string[] } = {}): Promise<Gate['state']> => {
    const from = dates?.checkIn ?? checkIn;
    const to = dates?.checkOut ?? checkOut;
    const key = gateKey(stayType, from, to);
    const missing = !from || (!wedding && !to);
    const reason = missing ? (from ? 'בחרו גם תאריך עזיבה.' : '') : datesReason(from, to);
    if (missing || reason) {
      showGate({ state: 'dates', key, reason });
      return 'dates';
    }
    if (!bookingApiEnabled) {
      if (!opts.beforeSend) showGate({ state: 'free', key, verified: false });
      return 'free';
    }
    if (opts.takenNights) showGate({ state: 'checking', key });
    else setGate({ state: 'checking', key });
    setAnnouncement('בודקים זמינות...');
    const range = stayRange(stayType, from, to);
    let result: Awaited<ReturnType<typeof checkDates>> | null = null;
    try {
      result = await checkDates(range.start, range.end);
    } catch {
      result = null;
    }
    setAnnouncement('');
    // A newer choice replaced these dates while the check ran.
    if (chosenKey.current !== key) return 'idle';
    if (!result) {
      showGate({ state: 'failed', key });
      return 'failed';
    }
    const fresh = result.availability;
    // What the server refused is taken, even if the check's copy has not caught up yet.
    const taken = opts.takenNights ?? [];
    taken.forEach((d) => fresh.blocked.add(d));
    // The calendar shows what the check found for its window.
    setAvailability((prev) => {
      if (!prev) return prev;
      const blocked = new Set([...prev.blocked].filter((d) => d < fresh.from || d >= fresh.to));
      fresh.blocked.forEach((d) => blocked.add(d));
      return { ...prev, blocked };
    });
    if (result.free && !taken.length) {
      if (opts.beforeSend) setGate({ state: 'free', key, verified: true });
      else showGate({ state: 'free', key, verified: true });
      return 'free';
    }
    // Holidays get nearby dates of the same length; a wedding date is never moved for the bride.
    const alternatives = stayType === 'couple' ? findAlternatives([...fresh.blocked], from, daysBetween(from, to), fresh.from, fresh.to, israelToday()) : [];
    showGate({ state: 'taken', key, alternatives });
    return 'taken';
  };

  /** Switches to a nearby stay offered for taken dates, and checks it afresh. */
  const chooseAlternative = (alternative: Alternative) => {
    changeDates(alternative.checkIn, alternative.checkOut);
    void continueToDetails(alternative);
  };

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
      checkIn && stayType === 'bride_day_wedding_night' ? `• הגעה: ${formatHebrewDate(addDays(checkIn, -1))} ב־15:00 · יציאה: ${formatHebrewDate(addDays(checkIn, 1))} עד 13:00` : '',
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
    // No request without a confirmed check: the #booking direct link reaches here without "להזמנה".
    const confirmed = gate.state === 'free' && gate.verified && gate.key === chosenKey.current;
    if (bookingApiEnabled && !confirmed && (await continueToDetails(undefined, { beforeSend: true })) !== 'free') {
      setSubmission({ state: 'idle' });
      return;
    }
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
      // Taken since the check: the gate dialog says so at once, with nearby dates for a holiday.
      setErrors({ dates: 'חלק מהתאריכים נתפסו בינתיים. בחרו תאריכים אחרים.' });
      setSubmission({ state: 'idle' });
      loadAvailability();
      const held = stayRange(stayType, checkIn, checkOut);
      void continueToDetails(undefined, { takenNights: result.nights?.length ? result.nights : nightsOf(held.start, held.end) });
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
    gate,
    gateShown,
    continueToDetails,
    chooseAlternative,
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
