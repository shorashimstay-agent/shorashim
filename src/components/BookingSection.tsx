import { Calendar, Users, Phone, MessageCircle, Sparkles, Check, Info, Send, Loader2 } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';
import { useBookingForm } from '../booking/useBookingForm';
import { Announcer, DatePicker, FieldError, Honeypot, SendConsent, SentHeading, described } from '../booking/parts';
import { formatHebrewDate, NOTES_MAX, type StayType } from '../lib/stay';

// Layout only. The form's behaviour is in ../booking/ (docs/front-sync.md).

interface BookingSectionProps {
  initialStayType?: StayType;
}

const STAY_OPTIONS: { id: StayType; label: string }[] = [
  { id: 'couple', label: 'אירוח זוגי' },
  { id: 'bride_day', label: 'יום כלה (התארגנות)' },
  { id: 'bride_night_day', label: 'לילה לפני + יום כלה' },
  { id: 'wedding_night', label: 'ליל כלולות זוגי' },
];

const inputClass = (hasError?: string) =>
  `w-full px-4 py-2.5 rounded-xl border bg-[#FAF8F5] text-[#2C2926] text-sm focus:outline-none focus:ring-2 focus:ring-[#8B6B48]/30 ${
    hasError ? 'border-[#D9776B]' : 'border-[#D9CFBF]'
  }`;

export default function BookingSection({ initialStayType = 'couple' }: BookingSectionProps) {
  const form = useBookingForm(initialStayType);
  const { ids, errors, submission, wedding, checkIn, nights, adultsCount } = form;
  return (
    <section id="booking" className="py-24 bg-[#FAF7F2] relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold tracking-wider text-[#89603A] uppercase block mb-2">
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
              <Calendar className="w-5 h-5 text-[#816342]" />
              <span>בחירת פרטי שהות</span>
            </h3>

            {/* Stay Category Selector */}
            <div className="mb-6">
              <span id={ids.stayType} className="block text-xs font-semibold text-[#736B5E] mb-2">
                סוג האירוח
              </span>
              <div role="group" aria-labelledby={ids.stayType} className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                {STAY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={form.stayType === option.id}
                    onClick={() => form.setStayType(option.id)}
                    className={`py-3 px-3 rounded-2xl text-xs sm:text-sm font-medium border text-center transition-all cursor-pointer ${
                      form.stayType === option.id
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
                <span id={ids.datesLabel} className="block text-xs font-semibold text-[#736B5E]">
                  {wedding ? 'תאריך החתונה' : "תאריכי הגעה ועזיבה (צ'ק-אין 15:00 · צ'ק-אאוט 11:00)"}
                </span>
                {checkIn && (
                  <button type="button" onClick={form.clearDates} className="text-xs text-[#816342] underline cursor-pointer">
                    ניקוי תאריכים
                  </button>
                )}
              </div>

              <DatePicker
                form={form}
                className={(hasError) =>
                  `rounded-2xl border bg-[#FAF8F5] p-2 sm:p-4 flex justify-center ${hasError ? 'border-[#D9776B]' : 'border-[#E8E0D5]'}`
                }
              />

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#70675B]">
                {form.apiEnabled && form.availabilityState === 'loading' && (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    בודקים זמינות...
                  </span>
                )}
                {form.apiEnabled && form.availabilityState === 'error' && (
                  <span>לא הצלחנו לבדוק זמינות כרגע. אפשר לבחור תאריכים, ונאשר מולכם.</span>
                )}
                {form.availabilityState === 'ready' && (
                  <>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-[#8B6B48]" />
                      הבחירה שלכם
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="line-through text-[#777066]">12</span>
                      תפוס
                    </span>
                  </>
                )}
              </div>

              <p className="mt-2 text-sm font-medium text-[#241E1A] empty:hidden" aria-live="polite">
                {form.datesText}
              </p>
              {wedding && (
                <p className="mt-1 text-xs text-[#70675B]">
                  כדי שהבית יהיה פנוי ושקט עבורך, אנחנו שומרים את הלילה שלפני החתונה ואת ליל החתונה.
                </p>
              )}
              <FieldError id={`${ids.datesLabel}-error`} message={errors.dates} />
            </div>

            {/* Adults Guests Counter */}
            <div className="mb-6 p-4 rounded-2xl bg-[#F8F4ED] border border-[#E8E0D4]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#816342]" />
                    <span id={ids.adultsLabel} className="text-sm font-semibold text-[#2C2926]">מספר אורחים מבוגרים</span>
                  </div>
                  <span className="text-xs text-[#70675B]">
                    למבוגרים בלבד • עד 3 מבוגרים (אורח שלישי על ספה נפתחת)
                  </span>
                </div>

                <div role="group" aria-labelledby={ids.adultsLabel} className="flex items-center gap-2">
                  {[1, 2, 3].map((num) => (
                    <button
                      key={num}
                      type="button"
                      aria-pressed={adultsCount === num}
                      aria-label={num === 1 ? 'מבוגר אחד' : `${num} מבוגרים`}
                      onClick={() => form.setAdultsCount(num)}
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
                <label htmlFor={ids.fullName} className="block text-xs font-semibold text-[#736B5E] mb-1.5">
                  שם מלא *
                </label>
                <input
                  id={ids.fullName}
                  type="text"
                  autoComplete="name"
                  placeholder="ישראל ישראלי"
                  value={form.fullName}
                  onChange={(e) => form.setFullName(e.target.value)}
                  aria-required="true"
                  {...described(`${ids.fullName}-error`, errors.name)}
                  className={inputClass(errors.name)}
                />
                <FieldError id={`${ids.fullName}-error`} message={errors.name} />
              </div>

              <div>
                <label htmlFor={ids.phone} className="block text-xs font-semibold text-[#736B5E] mb-1.5">
                  טלפון לחזרה *
                </label>
                <input
                  id={ids.phone}
                  type="tel"
                  autoComplete="tel"
                  placeholder="050-0000000"
                  value={form.phone}
                  onChange={(e) => form.setPhone(e.target.value)}
                  aria-required="true"
                  {...described(`${ids.phone}-error`, errors.phone)}
                  className={inputClass(errors.phone)}
                />
                <FieldError id={`${ids.phone}-error`} message={errors.phone} />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor={ids.email} className="block text-xs font-semibold text-[#736B5E] mb-1.5">
                אימייל (לא חובה) – לקבלת זימון ליומן לאחר אישור ההזמנה
              </label>
              <input
                id={ids.email}
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

            <div className="mb-6">
              <label htmlFor={ids.notes} className="block text-xs font-semibold text-[#736B5E] mb-1.5">
                הערות או בקשות מיוחדות (שעות הגעה, צוות איפור, צילומים וכו')
              </label>
              <textarea
                id={ids.notes}
                rows={2}
                maxLength={NOTES_MAX}
                placeholder="ספרו לנו קצת על השהות המתוכננת שלכם..."
                value={form.notes}
                onChange={(e) => form.setNotes(e.target.value)}
                {...described(`${ids.notes}-error`, errors.notes)}
                className={inputClass(errors.notes)}
              />
              <FieldError id={`${ids.notes}-error`} message={errors.notes} />
            </div>

            <Honeypot form={form} />

            <Announcer form={form} />

            {/* Action Buttons */}
            {submission.state === 'sent' ? (
              <div role="status" className="p-5 rounded-2xl bg-[#E8F8EE] border border-[#A7E8BD] text-[#1E6B37]">
                <SentHeading form={form} className="flex items-center gap-2 font-semibold mb-1 outline-none">
                  <Check className="w-5 h-5" />
                  <span>הבקשה נשלחה!</span>
                </SentHeading>
                <p className="text-sm">
                  מספר הבקשה: <span dir="ltr" className="font-semibold">{submission.ref}</span>. התאריכים שמורים עבורכם ל-
                  {submission.holdHours} שעות, ונחזור אליכם לאישור בהקדם.
                </p>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => form.openWhatsApp(submission.ref)}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#178440] hover:bg-[#136E35] text-white text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>להמשך שיחה ב-WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    onClick={form.startNewRequest}
                    className="flex-1 py-3 px-4 rounded-xl border border-[#1E6B37]/40 text-[#1E6B37] hover:bg-white text-sm font-medium cursor-pointer"
                  >
                    שליחת בקשה נוספת
                  </button>
                </div>
              </div>
            ) : form.apiEnabled ? (
              <>
                <button
                  type="button"
                  id="submit-booking-request"
                  onClick={form.submit}
                  disabled={form.sending}
                  className="w-full py-4 px-6 rounded-2xl bg-[#8B6B48] hover:bg-[#765A3C] disabled:opacity-70 text-white font-medium text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:cursor-wait"
                >
                  {form.sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  <span>{form.sending ? form.sendingLabel : 'שליחת בקשת הזמנה'}</span>
                </button>

                {submission.state === 'failed' && (
                  <div role="alert" className="mt-3 p-3 rounded-xl bg-[#FCE8E6] border border-[#E6A39A] text-[#8C1D18] text-xs text-center">
                    {submission.message}
                  </div>
                )}

                <button
                  type="button"
                  id="submit-booking-whatsapp"
                  onClick={() => form.openWhatsApp()}
                  className="mt-3 w-full py-3 px-6 rounded-2xl border border-[#178440] text-[#1E6B37] hover:bg-[#E8F8EE] text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>מעדיפים WhatsApp? שלחו לנו את הפרטים ישירות</span>
                </button>

                <SendConsent />
              </>
            ) : (
              <button
                type="button"
                id="submit-booking-whatsapp"
                onClick={() => form.openWhatsApp()}
                className="w-full py-4 px-6 rounded-2xl bg-[#178440] hover:bg-[#136E35] text-white font-medium text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span>שליחת בקשת זמינות ישירה ב-WhatsApp</span>
              </button>
            )}

            {form.whatsAppOpened && submission.state !== 'sent' && (
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
                  <span className="font-medium text-[#241E1A]">{form.stayTypeName}</span>
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
                  <span className="text-[#816342] font-serif text-xl">
                    ₪{form.estimate.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-xs text-[#70675B] bg-white p-3 rounded-xl border border-[#E8E0D4] mb-4">
                <Info className="w-4 h-4 text-[#816342] shrink-0 mt-0.5" />
                <span>
                  המחיר המוצג הינו הערכה בהתאם לתעריפי תקופת ההרצה. מחיר סופי ומדויק יימסר בהתאמה אישית עם קבלת הפנייה.
                </span>
              </div>

              <div className="space-y-2 text-xs text-[#61594D]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#816342]" />
                  <span>בתקופת ההרצה: ללא מינימום לילות</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#816342]" />
                  <span>חניה פרטית צמודה כלולה</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#816342]" />
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
                  className="flex-1 py-3 px-4 rounded-xl border border-[#8B6B48] text-[#816342] hover:bg-[#F7F2EA] text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span dir="ltr">{BRAND_DATA.phoneFormatted}</span>
                </a>

                <a
                  href={`https://wa.me/${BRAND_DATA.whatsappNumber}?text=${encodeURIComponent('היי שורשים, אשמח לפרטים על אירוח אצלכם')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#178440] hover:bg-[#136E35] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
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
