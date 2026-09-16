import { useEffect, useId, useState } from 'react';
import { Calendar, Users, Phone, MessageCircle, Sparkles, Check, Info, Send, Loader2 } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';
import { RECAPTCHA_SITE_KEY } from '../data/bookingConfig';
import AvailabilityCalendar from './AvailabilityCalendar';
import {
  bookingApiEnabled,
  fetchAvailability,
  submitBookingRequest,
  type Availability,
} from '../lib/bookingApi';
import { preloadRecaptcha, recaptchaToken } from '../lib/recaptcha';
import {
  daysBetween,
  estimatePrice,
  formatHebrewDate,
  isWeddingStay,
  israelToday,
  NOTES_MAX,
  nightsOf,
  stayRange,
  validateRequest,
  type StayType,
} from '../lib/stay';

interface BookingSectionProps {
  initialStayType?: StayType;
}

type Field = 'dates' | 'name' | 'phone' | 'email' | 'notes';
type FieldErrors = Partial<Record<Field, string>>;

type Submission =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'sent'; ref: string; holdHours: number }
  | { state: 'failed'; message: string };

const STAY_OPTIONS: { id: StayType; label: string }[] = [
  { id: 'couple', label: 'אירוח זוגי' },
  { id: 'bride_day', label: 'יום כלה (התארגנות)' },
  { id: 'bride_night_day', label: 'לילה לפני + יום כלה' },
  { id: 'wedding_night', label: 'ליל כלולות זוגי' },
];

const NO_BLOCKS = new Set<string>();

/** Maps the shared rules' error codes onto the form's fields and wording, for both validation passes. */
const SERVER_FIELD_ERRORS: Record<string, [Field, string]> = {
  stayType: ['dates', 'חלק מהפרטים אינם תקינים'],
  adults: ['dates', 'מספר האורחים אינו תקין'],
  checkIn: ['dates', 'התאריכים שנבחרו אינם תקינים'],
  checkOut: ['dates', 'התאריכים שנבחרו אינם תקינים'],
  name: ['name', 'נא למלא שם מלא'],
  phone: ['phone', 'נא למלא מספר טלפון תקין'],
  email: ['email', 'כתובת האימייל אינה תקינה'],
  notes: ['notes', `ההערות ארוכות מדי (עד ${NOTES_MAX} תווים)`],
};

const inputClass = (hasError?: string) =>
  `w-full px-4 py-2.5 rounded-xl border bg-[#FAF8F5] text-[#2C2926] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B6B48]/30 ${
    hasError ? 'border-[#D9776B]' : 'border-[#D9CFBF]'
  }`;

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-[#B3261E]">{message}</p> : null;
}

export default function BookingSection({ initialStayType = 'couple' }: BookingSectionProps) {
  const stayTypeInputId = useId();
  const fullNameInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const notesInputId = useId();

  const [stayType, setStayType] = useState<StayType>(initialStayType);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adultsCount, setAdultsCount] = useState<number>(2);
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

  // Shown before check-out is picked too, so quote at least one night.
  const estimate = estimatePrice(stayType, Math.max(nights, 1), adultsCount);

  const getStayTypeName = () => {
    switch (stayType) {
      case 'bride_day':
        return 'חוויית כלה: יום כלה (התארגנות ביום החתונה)';
      case 'bride_night_day':
        return 'חוויית כלה: לילה לפני + יום כלה';
      case 'wedding_night':
        return 'ליל כלולות לאחר החתונה';
      case 'couple':
      default:
        return 'אירוח זוגי בוטיק';
    }
  };

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

  const handleDatesChange = (nextCheckIn: string, nextCheckOut: string) => {
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
    if (!checkIn || (!wedding && !checkOut)) {
      return { dates: wedding ? 'בחרו את תאריך החתונה' : 'בחרו תאריכי הגעה ועזיבה' };
    }
    const check = validateRequest(
      {
        stayType,
        checkIn,
        checkOut: wedding ? '' : checkOut,
        adults: adultsCount,
        name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: notes.trim(),
      },
      israelToday()
    );
    if (check.ok) return {};
    const found: FieldErrors = {};
    Object.keys(check.errors).forEach((key) => {
      const [field, message] = SERVER_FIELD_ERRORS[key] ?? ['dates', 'חלק מהפרטים אינם תקינים'];
      found[field] = message;
    });
    return found;
  };

  // Generate WhatsApp link with prefilled details
  const handleWhatsAppBooking = (ref?: string) => {
    const messageLines = [
      ref ? `שלום שורשים, שלחתי בקשת הזמנה באתר (מספר ${ref}):` : `שלום שורשים, אשמח לבדוק זמינות ולהזמין:`,
      `• סוג האירוח: ${getStayTypeName()}`,
      checkIn ? (wedding ? `• תאריך החתונה: ${formatHebrewDate(checkIn)}` : `• תאריך הגעה: ${formatHebrewDate(checkIn)}`) : '',
      checkOut && !wedding ? `• תאריך עזיבה: ${formatHebrewDate(checkOut)} (${nights} לילות)` : '',
      `• מספר אורחים (מבוגרים): ${adultsCount}`,
      fullName ? `• שם: ${fullName}` : '',
      phone ? `• טלפון: ${phone}` : '',
      notes ? `• הערות/בקשות מיוחדות: ${notes}` : '',
    ].filter(Boolean);

    const message = encodeURIComponent(messageLines.join('\n'));
    window.open(`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${message}`, '_blank');
    setWhatsAppOpened(true);
  };

  const handleSubmit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setSubmission({ state: 'sending' });
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
      return;
    }
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

  return (
    <section id="booking" className="py-24 bg-[#FAF7F2] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold tracking-wider text-[#A07044] uppercase block mb-2">
            07 | הזמנה ובדיקת זמינות
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-[#241E1A] font-normal tracking-tight mb-4">
            באים לשורשים?
          </h2>
          <p className="text-base sm:text-lg text-[#6D6457]">
            בחרו תאריכים ובדקו זמינות. אנו זמינים תמיד גם ב-WhatsApp ובטלפון להתאמה מדויקת.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Booking Engine Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-[#E5DCD0] shadow-sm">
            <h3 className="font-serif text-xl sm:text-2xl text-[#241E1A] font-medium mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#8B6B48]" />
              <span>בחירת פרטי שהות</span>
            </h3>

            {/* Stay Category Selector */}
            <div className="mb-6">
              <label htmlFor={stayTypeInputId} className="block text-xs font-semibold text-[#736B5E] mb-2">
                סוג האירוח
              </label>
              <div id={stayTypeInputId} className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                {STAY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setStayType(option.id)}
                    className={`py-3 px-3 rounded-2xl text-xs sm:text-sm font-medium border text-center transition-all cursor-pointer ${
                      stayType === option.id
                        ? 'bg-[#8B6B48] text-white border-[#8B6B48] shadow-xs'
                        : 'bg-[#FAF8F5] text-[#453E33] border-[#E8E0D5] hover:bg-[#F3ECE0]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="block text-xs font-semibold text-[#736B5E]">
                  {wedding ? 'תאריך החתונה' : "תאריכי הגעה ועזיבה (צ'ק-אין 15:00 · צ'ק-אאוט 11:00)"}
                </span>
                {checkIn && (
                  <button type="button" onClick={clearDates} className="text-xs text-[#8B6B48] underline cursor-pointer">
                    ניקוי תאריכים
                  </button>
                )}
              </div>

              <div
                className={`rounded-2xl border bg-[#FAF8F5] p-2 sm:p-4 flex justify-center ${
                  errors.dates ? 'border-[#D9776B]' : 'border-[#E8E0D5]'
                }`}
              >
                <AvailabilityCalendar
                  stayType={stayType}
                  blocked={availability?.blocked ?? NO_BLOCKS}
                  windowEnd={availability?.to}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onChange={handleDatesChange}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7A7163]">
                {bookingApiEnabled && availabilityState === 'loading' && (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    בודקים זמינות...
                  </span>
                )}
                {bookingApiEnabled && availabilityState === 'error' && (
                  <span>לא הצלחנו לבדוק זמינות כרגע. אפשר לבחור תאריכים, ונאשר מולכם.</span>
                )}
                {availabilityState === 'ready' && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#8B6B48]" />
                      הבחירה שלכם
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="line-through text-[#B3A899]">12</span>
                      תפוס
                    </span>
                  </>
                )}
              </div>

              {datesText && <p className="mt-2 text-sm font-medium text-[#241E1A]">{datesText}</p>}
              {wedding && (
                <p className="mt-1 text-xs text-[#7A7163]">
                  כדי שהבית יהיה פנוי ושקט עבורך, אנחנו שומרים את הלילה שלפני החתונה ואת ליל החתונה.
                </p>
              )}
              <FieldError message={errors.dates} />
            </div>

            {/* Adults Guests Counter */}
            <div className="mb-6 p-4 rounded-2xl bg-[#F8F4ED] border border-[#E8E0D4]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#8B6B48]" />
                    <span className="text-sm font-semibold text-[#2C2926]">מספר אורחים מבוגרים</span>
                  </div>
                  <span className="text-xs text-[#7A7163]">
                    למבוגרים בלבד • עד 3 מבוגרים (אורח שלישי על ספה נפתחת)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAdultsCount(num)}
                      className={`w-9 h-9 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                        adultsCount === num
                          ? 'bg-[#8B6B48] text-white shadow-xs'
                          : 'bg-white border border-[#D9CFBF] text-[#423A30] hover:bg-[#F0EAE1]'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Details Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor={fullNameInputId} className="block text-xs font-semibold text-[#736B5E] mb-1.5">
                  שם מלא *
                </label>
                <input
                  id={fullNameInputId}
                  type="text"
                  autoComplete="name"
                  placeholder="ישראל ישראלי"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={inputClass(errors.name)}
                />
                <FieldError message={errors.name} />
              </div>

              <div>
                <label htmlFor={phoneInputId} className="block text-xs font-semibold text-[#736B5E] mb-1.5">
                  טלפון לחזרה *
                </label>
                <input
                  id={phoneInputId}
                  type="tel"
                  autoComplete="tel"
                  placeholder="050-0000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass(errors.phone)}
                />
                <FieldError message={errors.phone} />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor={emailInputId} className="block text-xs font-semibold text-[#736B5E] mb-1.5">
                אימייל (לא חובה) – לקבלת זימון ליומן לאחר אישור ההזמנה
              </label>
              <input
                id={emailInputId}
                type="email"
                dir="ltr"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${inputClass(errors.email)} text-right`}
              />
              <FieldError message={errors.email} />
            </div>

            <div className="mb-6">
              <label htmlFor={notesInputId} className="block text-xs font-semibold text-[#736B5E] mb-1.5">
                הערות או בקשות מיוחדות (שעות הגעה, צוות איפור, צילומים וכו')
              </label>
              <textarea
                id={notesInputId}
                rows={2}
                maxLength={NOTES_MAX}
                placeholder="ספרו לנו קצת על השהות המתוכננת שלכם..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass(errors.notes)}
              />
              <FieldError message={errors.notes} />
            </div>

            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="sr-only"
            />

            {/* Action Buttons */}
            {submission.state === 'sent' ? (
              <div className="p-5 rounded-2xl bg-[#E8F8EE] border border-[#A7E8BD] text-[#1E6B37]">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Check className="w-5 h-5" />
                  <span>הבקשה נשלחה!</span>
                </div>
                <p className="text-sm">
                  מספר הבקשה: <span dir="ltr" className="font-semibold">{submission.ref}</span>. התאריכים שמורים עבורכם ל-
                  {submission.holdHours} שעות, ונחזור אליכם לאישור בהקדם.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => handleWhatsAppBooking(submission.ref)}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5A] text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>להמשך שיחה ב-WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={startNewRequest}
                    className="flex-1 py-3 px-4 rounded-xl border border-[#1E6B37]/40 text-[#1E6B37] hover:bg-white text-sm font-medium cursor-pointer"
                  >
                    שליחת בקשה נוספת
                  </button>
                </div>
              </div>
            ) : bookingApiEnabled ? (
              <>
                <button
                  type="button"
                  id="submit-booking-request"
                  onClick={handleSubmit}
                  disabled={sending}
                  className="w-full py-4 px-6 rounded-2xl bg-[#8B6B48] hover:bg-[#765A3C] disabled:opacity-70 text-white font-medium text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:cursor-wait"
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  <span>{sending ? sendingLabel : 'שליחת בקשת הזמנה'}</span>
                </button>

                {submission.state === 'failed' && (
                  <div className="mt-3 p-3 rounded-xl bg-[#FCE8E6] border border-[#E6A39A] text-[#8C1D18] text-xs text-center">
                    {submission.message}
                  </div>
                )}

                <button
                  type="button"
                  id="submit-booking-whatsapp"
                  onClick={() => handleWhatsAppBooking()}
                  className="mt-3 w-full py-3 px-6 rounded-2xl border border-[#25D366] text-[#1E6B37] hover:bg-[#E8F8EE] text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>מעדיפים WhatsApp? שלחו לנו את הפרטים ישירות</span>
                </button>

                {RECAPTCHA_SITE_KEY && (
                  <p className="mt-3 text-[11px] text-[#9A9083] text-center">
                    האתר מוגן באמצעות reCAPTCHA, ו
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline">
                      מדיניות הפרטיות
                    </a>{' '}
                    ו
                    <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline">
                      תנאי השימוש
                    </a>{' '}
                    של Google חלים.
                  </p>
                )}
              </>
            ) : (
              <button
                type="button"
                id="submit-booking-whatsapp"
                onClick={() => handleWhatsAppBooking()}
                className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#1EBE5A] text-white font-medium text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span>שליחת בקשת זמינות ישירה ב-WhatsApp</span>
              </button>
            )}

            {whatsAppOpened && submission.state !== 'sent' && (
              <div className="mt-4 p-3 bg-[#E8F8EE] border border-[#A7E8BD] text-[#1E6B37] rounded-xl text-xs text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>פנייתכם נפתחה ב-WhatsApp! שרי ויואב יחזרו אליכם בהקדם האפשרי.</span>
              </div>
            )}
          </div>

          {/* Booking Summary & Direct Contact Card */}
          <div className="lg:col-span-5 space-y-6">

            {/* Price Estimation Box */}
            <div className="bg-[#FAF8F5] rounded-3xl p-6 sm:p-8 border border-[#E5DCD0]">
              <h4 className="font-serif text-lg sm:text-xl text-[#241E1A] font-medium mb-4">
                סיכום משוער
              </h4>

              <div className="space-y-3 text-sm text-[#4E473D] mb-6">
                <div className="flex justify-between pb-2 border-b border-[#EAE3D7]">
                  <span>סוג שהות:</span>
                  <span className="font-medium text-[#241E1A]">{getStayTypeName()}</span>
                </div>
                {wedding ? (
                  checkIn && (
                    <div className="flex justify-between pb-2 border-b border-[#EAE3D7]">
                      <span>תאריך החתונה:</span>
                      <span className="font-medium text-[#241E1A]">{formatHebrewDate(checkIn)}</span>
                    </div>
                  )
                ) : (
                  <div className="flex justify-between pb-2 border-b border-[#EAE3D7]">
                    <span>משך השהות:</span>
                    <span className="font-medium text-[#241E1A]">{nights ? `${nights} לילות` : 'טרם נבחרו תאריכים'}</span>
                  </div>
                )}
                <div className="flex justify-between pb-2 border-b border-[#EAE3D7]">
                  <span>אורחים מבוגרים:</span>
                  <span className="font-medium text-[#241E1A]">{adultsCount} מבוגרים</span>
                </div>
                <div className="flex justify-between pt-2 text-base font-semibold text-[#241E1A]">
                  <span>הערכת מחיר:</span>
                  <span className="text-[#8B6B48] font-serif text-xl">
                    ₪{estimate.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-[#7A7163] bg-white p-3 rounded-xl border border-[#E8E0D4] mb-4">
                <Info className="w-4 h-4 text-[#8B6B48] shrink-0 mt-0.5" />
                <span>
                  המחיר המוצג הינו הערכה בהתאם לתעריפי תקופת ההרצה. מחיר סופי ומדויק יימסר בהתאמה אישית עם קבלת הפנייה.
                </span>
              </div>

              <div className="space-y-2 text-xs text-[#61594D]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8B6B48]" />
                  <span>בתקופת ההרצה: ללא מינימום לילות</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8B6B48]" />
                  <span>חניה פרטית צמודה כלולה</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#8B6B48]" />
                  <span>קפה איכותי, מוצרי רחצה וחלוקים כלולים</span>
                </div>
              </div>
            </div>

            {/* Direct Phone & WhatsApp box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5DCD0] shadow-xs text-center">
              <h4 className="font-serif text-lg sm:text-xl text-[#241E1A] font-medium mb-2">
                מעדיפים לדבר איתנו ישירות?
              </h4>
              <p className="text-xs sm:text-sm text-[#6E6557] mb-6">
                שרי ויואב פויזנר זמינים לכל שאלה, תיאום שעות או בקשה מיוחדת
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`tel:${BRAND_DATA.phone}`}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#8B6B48] text-[#8B6B48] hover:bg-[#F7F2EA] text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span dir="ltr">{BRAND_DATA.phoneFormatted}</span>
                </a>

                <a
                  href={`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${encodeURIComponent('היי שורשים, אשמח לפרטים על אירוח אצלכם')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1EBE5A] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp ישיר</span>
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
