import { MessageCircle, Check, Phone, Send, Loader2 } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';
import { useBookingForm } from '../booking/useBookingForm';
import { Announcer, DatePicker, FieldError, Honeypot, SendConsent, SentHeading, described } from '../booking/parts';
import { formatHebrewDate, NOTES_MAX, type StayType } from '../lib/stay';
import { EditorialTag } from './RootLine';

// Layout only. The form's behaviour is in ../booking/ (docs/front-sync.md).

interface BookingSectionProps {
  initialStayType?: StayType;
}

const STAY_OPTIONS: { id: StayType; title: string }[] = [
  { id: 'couple', title: 'חופשה זוגית' },
  { id: 'bride_day', title: 'יום כלה - התארגנות' },
  { id: 'bride_night_day', title: 'לילה לפני + יום כלה' },
  { id: 'wedding_night', title: 'ליל כלולות' },
];

const labelClass = 'block text-xs font-mono uppercase tracking-widest text-[#7B6045] mb-2';

const inputClass = (hasError?: string) =>
  `w-full p-3 border bg-transparent text-[#1E1D1A] text-sm focus:outline-hidden focus:border-[#1E1D1A] focus-visible:ring-2 focus-visible:ring-[#7B6045]/40 transition-colors ${
    hasError ? 'border-[#B3261E]' : 'border-[#CFC4B4]'
  }`;

const toggleClass = (active: boolean) =>
  `border text-sm font-sans transition-all cursor-pointer ${
    active ? 'border-[#1E1D1A] bg-[#1E1D1A] text-white' : 'border-[#CFC4B4] text-[#292824] hover:border-[#7B6045] bg-transparent'
  }`;

export default function BookingSection({ initialStayType = 'couple' }: BookingSectionProps) {
  const form = useBookingForm(initialStayType);
  const { ids, errors, submission, wedding, checkIn, nights, adultsCount } = form;

  const estimateLabel = wedding
    ? form.stayTypeName
    : `${nights ? (nights === 1 ? 'לילה אחד' : `${nights} לילות`) : 'לילה אחד'}, ${adultsCount === 1 ? 'מבוגר אחד' : `${adultsCount} מבוגרים`}`;

  return (
    <section id="booking" className="py-28 sm:py-36 bg-[#F4F0E8] relative">
      <div className="max-w-5xl mx-auto px-6 sm:px-12">

        {/* Section Header */}
        <div className="max-w-2xl mb-16 pb-8 border-b border-[#DED5C8]">
          <EditorialTag className="mb-4 block">
            10 · בדיקת זמינות והזמנה
          </EditorialTag>

          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl text-[#1E1D1A] font-normal tracking-tight mb-4">
            לבקש תאריכים
          </h2>

          <p className="text-base sm:text-lg text-[#292824]/80 font-light leading-relaxed">
            בחרו את מועדי השהייה המבוקשים. אנחנו בודקים זמינות באופן אישי וחוזרים אליכם ישירות עם אישור והתאמה מדויקת.
          </p>
        </div>

        {/* 10 — BOOKING: Architectural, unboxed form layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

          {/* Booking Form */}
          <div className="lg:col-span-7 space-y-8">

            {/* Stay Type Selection */}
            <div>
              <span id={ids.stayType} className={labelClass}>
                סוג האירוח
              </span>
              <div role="group" aria-labelledby={ids.stayType} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STAY_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    data-stay-type={t.id}
                    aria-pressed={form.stayType === t.id}
                    onClick={() => form.setStayType(t.id)}
                    className={`text-right p-3.5 text-xs tracking-wide ${toggleClass(form.stayType === t.id)}`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates: the availability calendar */}
            <div>
              <div className="flex items-center justify-between">
                <span id={ids.datesLabel} className={labelClass}>
                  {wedding ? 'תאריך החתונה' : 'צ׳ק-אין 15:00 · צ׳ק-אאוט 11:00'}
                </span>
                {checkIn && (
                  <button type="button" onClick={form.clearDates} className="text-xs text-[#7B6045] underline cursor-pointer mb-2">
                    ניקוי תאריכים
                  </button>
                )}
              </div>

              <DatePicker
                form={form}
                className={(hasError) =>
                  `border bg-[#FBF9F5] p-2 sm:p-4 flex justify-center ${hasError ? 'border-[#B3261E]' : 'border-[#DED5C8]'}`
                }
              />

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5E574D]">
                {form.apiEnabled && form.availabilityState === 'loading' && (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" />
                    בודקים זמינות...
                  </span>
                )}
                {form.apiEnabled && form.availabilityState === 'error' && (
                  <span>לא הצלחנו לבדוק זמינות כרגע. אפשר לבחור תאריכים, ונאשר מולכם.</span>
                )}
                {form.availabilityState === 'ready' && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#1E1D1A]" />
                      הבחירה שלכם
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="line-through text-[#6B6459]">12</span>
                      תפוס
                    </span>
                  </>
                )}
              </div>

              <p className="mt-2 text-sm text-[#1E1D1A] empty:hidden" aria-live="polite">
                {form.datesText}
              </p>
              {wedding && (
                <p className="mt-1 text-xs text-[#5E574D] font-light">
                  כדי שהבית יהיה פנוי ושקט עבורך, אנחנו שומרים את הלילה שלפני החתונה ואת ליל החתונה.
                </p>
              )}
              <FieldError id={`${ids.datesLabel}-error`} message={errors.dates} />
            </div>

            {/* Guests Count */}
            <div>
              <span id={ids.adultsLabel} className={labelClass}>
                מספר אורחים מבוגרים
              </span>
              <div className="flex flex-wrap gap-3 items-center">
                <div role="group" aria-labelledby={ids.adultsLabel} className="flex gap-3">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      data-adults={num}
                      aria-pressed={adultsCount === num}
                      aria-label={num === 1 ? 'מבוגר אחד' : `${num} מבוגרים`}
                      onClick={() => form.setAdultsCount(num)}
                      className={`w-12 h-11 flex items-center justify-center ${toggleClass(adultsCount === num)}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-[#5E574D] font-light">
                  אירוח למבוגרים בלבד · לזוגות ועד 3 אורחים (אורח שלישי על ספה נפתחת)
                </span>
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-[#DED5C8]">
              <div>
                <label htmlFor={ids.fullName} className={labelClass}>
                  שם מלא *
                </label>
                <input
                  id={ids.fullName}
                  name="guest-name"
                  type="text"
                  autoComplete="name"
                  placeholder="שם ומשפחה"
                  value={form.fullName}
                  onChange={(e) => form.setFullName(e.target.value)}
                  aria-required="true"
                  {...described(`${ids.fullName}-error`, errors.name)}
                  className={inputClass(errors.name)}
                />
                <FieldError id={`${ids.fullName}-error`} message={errors.name} />
              </div>

              <div>
                <label htmlFor={ids.phone} className={labelClass}>
                  טלפון *
                </label>
                <input
                  id={ids.phone}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="05X-XXXXXXX"
                  dir="ltr"
                  value={form.phone}
                  onChange={(e) => form.setPhone(e.target.value)}
                  aria-required="true"
                  {...described(`${ids.phone}-error`, errors.phone)}
                  className={`${inputClass(errors.phone)} text-right`}
                />
                <FieldError id={`${ids.phone}-error`} message={errors.phone} />
              </div>
            </div>

            <div>
              <label htmlFor={ids.email} className={labelClass}>
                אימייל (לא חובה) · לזימון ליומן לאחר האישור
              </label>
              <input
                id={ids.email}
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => form.setEmail(e.target.value)}
                {...described(`${ids.email}-error`, errors.email)}
                className={`${inputClass(errors.email)} text-right`}
              />
              <FieldError id={`${ids.email}-error`} message={errors.email} />
            </div>

            <div>
              <label htmlFor={ids.notes} className={labelClass}>
                הערות או בקשות
              </label>
              <textarea
                id={ids.notes}
                name="notes"
                rows={3}
                maxLength={NOTES_MAX}
                placeholder="שעת הגעה משוערת, אירוע מיוחד, צרכים מיוחדים..."
                value={form.notes}
                onChange={(e) => form.setNotes(e.target.value)}
                {...described(`${ids.notes}-error`, errors.notes)}
                className={`${inputClass(errors.notes)} resize-none`}
              />
              <FieldError id={`${ids.notes}-error`} message={errors.notes} />
            </div>

            <Honeypot form={form} />
            <Announcer form={form} />

            {/* Actions */}
            {submission.state === 'sent' ? (
              <div role="status" className="p-6 border border-[#1E1D1A] bg-[#FBF9F5] text-[#1E1D1A]">
                <SentHeading form={form} className="flex items-center gap-2 font-serif text-2xl font-normal mb-2 outline-none">
                  <Check className="w-5 h-5 text-[#7B6045]" />
                  <span>הבקשה נשלחה!</span>
                </SentHeading>
                <p className="text-sm font-light">
                  מספר הבקשה: <span dir="ltr" className="font-medium">{submission.ref}</span>. התאריכים שמורים עבורכם ל-
                  {submission.holdHours} שעות, ונחזור אליכם לאישור בהקדם.
                </p>
                <div className="mt-5 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => form.openWhatsApp(submission.ref)}
                    className="flex-1 py-3 px-4 bg-[#1E1D1A] text-white hover:bg-[#7B6045] text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>להמשך שיחה ב-WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={form.startNewRequest}
                    className="flex-1 py-3 px-4 border border-[#1E1D1A]/40 text-[#1E1D1A] hover:bg-white text-sm tracking-wide cursor-pointer transition-colors"
                  >
                    שליחת בקשה נוספת
                  </button>
                </div>
              </div>
            ) : form.apiEnabled ? (
              <div>
                <button
                  type="button"
                  id="submit-booking-request"
                  onClick={form.submit}
                  disabled={form.sending}
                  className="w-full py-4 bg-[#1E1D1A] text-white hover:bg-[#7B6045] disabled:opacity-70 transition-colors duration-300 text-sm font-medium tracking-wide flex items-center justify-center gap-3 cursor-pointer disabled:cursor-wait"
                >
                  {form.sending ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{form.sending ? form.sendingLabel : 'שליחת בקשת הזמנה'}</span>
                </button>

                {submission.state === 'failed' && (
                  <div role="alert" className="mt-3 p-3 border border-[#B3261E]/50 bg-[#FCE8E6] text-[#8C1D18] text-xs text-center">
                    {submission.message}
                  </div>
                )}

                <button
                  type="button"
                  id="submit-booking-whatsapp"
                  onClick={() => form.openWhatsApp()}
                  className="mt-3 w-full py-3 border border-[#1E1D1A]/40 text-[#1E1D1A] hover:border-[#1E1D1A] text-sm tracking-wide transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>מעדיפים WhatsApp? שלחו לנו את הפרטים ישירות</span>
                </button>

                <SendConsent
                  className="mt-4 text-xs text-[#5E574D] text-center font-light"
                  recaptchaClassName="mt-2 text-[11px] text-[#5E574D] text-center font-light"
                />
              </div>
            ) : (
              <button
                type="button"
                id="submit-booking-whatsapp"
                onClick={() => form.openWhatsApp()}
                className="w-full py-4 bg-[#1E1D1A] text-white hover:bg-[#7B6045] transition-colors duration-300 text-sm font-medium tracking-wide flex items-center justify-center gap-3 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>שליחת בקשת זמינות ב-WhatsApp</span>
              </button>
            )}

            {form.whatsAppOpened && submission.state !== 'sent' && (
              <div className="p-3 border border-[#DED5C8] text-[#1E1D1A] text-xs text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4 text-[#7B6045]" />
                <span>פנייתכם נפתחה ב-WhatsApp! שרי ויואב יחזרו אליכם בהקדם האפשרי.</span>
              </div>
            )}
          </div>

          {/* Pricing & Policy Summary Column */}
          <div className="lg:col-span-5 space-y-8">
            <div className="p-8 bg-[#DED5C8]/40 border border-[#DED5C8]">
              <EditorialTag className="mb-4 block">
                הערכת עלות משוערת
              </EditorialTag>

              <div className="font-serif text-3xl sm:text-4xl text-[#1E1D1A] mb-2 font-normal">
                ₪{form.estimate.toLocaleString()}
              </div>

              <div className="text-xs text-[#6B5037] font-mono mb-2">
                {estimateLabel}
              </div>
              {wedding && checkIn && (
                <div className="text-xs text-[#6B5037] font-mono mb-2">תאריך החתונה: {formatHebrewDate(checkIn)}</div>
              )}
              <p className="text-xs text-[#5E574D] font-light mb-6">
                הערכה בלבד. המחיר הסופי יימסר באישור ההזמנה.
              </p>

              <div className="space-y-2.5 text-xs text-[#4A463F] font-light pt-6 border-t border-[#DED5C8]">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#7B6045]" />
                  <span>אירוח אינטימי למבוגרים בלבד</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#7B6045]" />
                  <span>שימוש בלעדי בכל הבית, הגג והחצר</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#7B6045]" />
                  <span>מטבח שלם מאובזר ומכונת קפה איכותית</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-[#7B6045]" />
                  <span>חניה פרטית צמודה בתוך המשק</span>
                </div>
              </div>
            </div>

            <div className="p-6 border border-[#DED5C8] text-xs text-[#4A463F] font-light space-y-2">
              <h3 className="font-serif text-sm font-normal text-[#1E1D1A] mb-1">
                נהלי צ׳ק-אין וביטול
              </h3>
              <p>כניסה: 15:00 | יציאה: 11:00 (גמישות בתיאום מראש).</p>
              <p>ביטול ללא עלות עד 7 ימים מראש.</p>
              <a
                href={`tel:${BRAND_DATA.phone}`}
                className="pt-2 inline-flex items-center gap-2 text-[#6B5037] hover:text-[#1E1D1A]"
              >
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">{BRAND_DATA.phoneFormatted}</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
