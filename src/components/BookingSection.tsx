import { MessageCircle, Check, Phone, Send, Loader2 } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';
import { STAY_PACKAGES, PRICE_NOTE } from '../data/booking';
import { useBookingForm } from '../booking/useBookingForm';
import { Announcer, DatePicker, FieldError, Honeypot, SendConsent, SentHeading, described } from '../booking/parts';
import { NOTES_MAX, type StayType } from '../lib/stay';
import PolicyDetails from './PolicyDetails';
import PriceStatus from './PriceStatus';

// Layout only. The form's behaviour is in ../booking/ (docs/front-sync.md).

interface BookingSectionProps {
  stayType: StayType;
  onStayTypeChange: (type: StayType) => void;
}

const errorClass = 'field-error';

export default function BookingSection({ stayType, onStayTypeChange }: BookingSectionProps) {
  const form = useBookingForm(stayType);
  const { ids, errors, submission, wedding, nights, adultsCount } = form;
  const pkg = STAY_PACKAGES[form.stayType];

  const chooseStayType = (type: StayType) => {
    form.setStayType(type);
    onStayTypeChange(type);
  };

  return (
    <section id="booking" tabIndex={-1} className="py-12 sm:py-24 bg-[#F4F0E8]" dir="rtl" lang="he">
      <div className="max-w-5xl mx-auto px-6 sm:px-10">
        <p className="section-eyebrow">הצעד הבא — בירור אישי עם המארחים</p>
        <h2 className="font-serif text-3xl sm:text-5xl mb-4">בקשת אירוח בשורשים</h2>
        <p className="mb-8 max-w-2xl">
          בחרו מסלול ותאריכים ושלחו לנו בקשה. נבדוק את הזמינות ונחזור אליכם; זו עדיין אינה הזמנה מאושרת.
        </p>

        <div className="booking-form space-y-6">
          <fieldset>
            <legend id={ids.stayType}>סוג האירוח</legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.values(STAY_PACKAGES).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-stay-type={p.id}
                  aria-pressed={form.stayType === p.id}
                  onClick={() => chooseStayType(p.id)}
                  className={`choice text-right ${form.stayType === p.id ? 'selected' : ''}`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <div className="flex items-center justify-between gap-4">
              <span id={ids.datesLabel} className="block font-medium mb-2">
                {wedding ? 'תאריך החתונה' : 'תאריכי כניסה ויציאה'}
              </span>
              {form.checkIn && (
                <button type="button" onClick={form.clearDates} className="text-action text-sm">
                  ניקוי תאריכים
                </button>
              )}
            </div>

            <DatePicker
              form={form}
              className={(hasError) =>
                `border bg-[#FBF9F5] p-2 sm:p-4 flex justify-center rounded-[6px] ${hasError ? 'border-[#9b2525] border-2' : 'border-[#DED5C8]'}`
              }
            />

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#5E574D]">
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

            <p className="mt-2 text-[#1E1D1A] empty:hidden" aria-live="polite">
              {form.datesText}
            </p>
            <p className="mt-1 text-[#665548]">
              {pkg.hours}
              {form.stayType === 'wedding_night' && ' · נא לציין שעת הגעה משוערת בהערות; הגעה אחרי חצות תתואם אישית.'}
            </p>
            {wedding && (
              <p className="mt-1 text-sm text-[#5E574D]">
                כדי שהבית יהיה פנוי ושקט עבורך, אנחנו שומרים את הלילה שלפני החתונה ואת ליל החתונה.
              </p>
            )}
            <FieldError id={`${ids.datesLabel}-error`} message={errors.dates} className={errorClass} />
          </div>

          <fieldset>
            <legend id={ids.adultsLabel}>אורחי לינה — מבוגרים בלבד</legend>
            <div className="flex flex-wrap gap-3 items-center">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-adults={num}
                  aria-pressed={adultsCount === num}
                  aria-label={num === 1 ? 'מבוגר אחד' : `${num} מבוגרים`}
                  onClick={() => form.setAdultsCount(num)}
                  className={`choice min-w-12 justify-center ${adultsCount === num ? 'selected' : ''}`}
                >
                  <bdi>{num}</bdi>
                </button>
              ))}
              <span className="text-sm text-[#5E574D]">
                לזוגות ועד <bdi>3</bdi> אורחים (אורח שלישי על ספה נפתחת)
              </span>
            </div>
          </fieldset>

          {form.hasDayParticipants && (
            <div>
              <label htmlFor={ids.participants}>משתתפי יום — כולל הכלה, מלוות ואנשי מקצוע (עד {form.maxDayParticipants})</label>
              <select
                id={ids.participants}
                name="participants"
                value={form.participants}
                onChange={(e) => form.setParticipants(Number(e.target.value))}
              >
                {Array.from({ length: form.maxDayParticipants }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="booking-summary" role="group" aria-label="סיכום הבקשה">
            <h3 className="font-serif text-2xl mb-3">הבקשה שלכם במבט אחד</h3>
            <p className="font-medium">{pkg.title}</p>
            <dl className="request-facts">
              <div>
                <dt>תאריכים</dt>
                <dd>{form.datesText || 'טרם נבחרו'}</dd>
              </div>
              <div>
                <dt>אורחי לינה</dt>
                <dd>{adultsCount}</dd>
              </div>
              {form.hasDayParticipants && (
                <div>
                  <dt>משתתפי יום</dt>
                  <dd>{form.participants}</dd>
                </div>
              )}
              {!wedding && nights > 0 && (
                <div>
                  <dt>לילות</dt>
                  <dd>{nights}</dd>
                </div>
              )}
              <div className="quote-total">
                <dt>הערכת עלות</dt>
                <dd>{form.estimate === null ? 'מחיר בתיאום אישי' : <span dir="ltr">₪{form.estimate.toLocaleString('he-IL')}</span>}</dd>
              </div>
            </dl>
            <p className="text-sm mt-3">{PRICE_NOTE}</p>
            <PriceStatus />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor={ids.fullName}>שם מלא *</label>
              <input
                id={ids.fullName}
                name="guest-name"
                type="text"
                autoComplete="name"
                value={form.fullName}
                onChange={(e) => form.setFullName(e.target.value)}
                aria-required="true"
                {...described(`${ids.fullName}-error`, errors.name)}
              />
              <FieldError id={`${ids.fullName}-error`} message={errors.name} className={errorClass} />
            </div>
            <div>
              <label htmlFor={ids.phone}>טלפון *</label>
              <input
                id={ids.phone}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                className="text-right"
                value={form.phone}
                onChange={(e) => form.setPhone(e.target.value)}
                aria-required="true"
                {...described(`${ids.phone}-error`, errors.phone)}
              />
              <FieldError id={`${ids.phone}-error`} message={errors.phone} className={errorClass} />
            </div>
          </div>

          <div>
            <label htmlFor={ids.email}>אימייל (לא חובה) · לזימון ליומן לאחר האישור</label>
            <input
              id={ids.email}
              name="email"
              type="email"
              dir="ltr"
              className="text-right"
              autoComplete="email"
              value={form.email}
              onChange={(e) => form.setEmail(e.target.value)}
              {...described(`${ids.email}-error`, errors.email)}
            />
            <FieldError id={`${ids.email}-error`} message={errors.email} className={errorClass} />
          </div>

          <div>
            <label htmlFor={ids.notes}>הערות או בקשות (לא חובה)</label>
            <textarea
              id={ids.notes}
              name="notes"
              rows={3}
              maxLength={NOTES_MAX}
              placeholder="שעת הגעה משוערת או צרכים מיוחדים"
              value={form.notes}
              onChange={(e) => form.setNotes(e.target.value)}
              {...described(`${ids.notes}-error`, errors.notes)}
            />
            <FieldError id={`${ids.notes}-error`} message={errors.notes} className={errorClass} />
          </div>

          <Honeypot form={form} />
          <Announcer form={form} />

          <PolicyDetails />

          {submission.state === 'sent' ? (
            <div role="status" className="booking-summary">
              <SentHeading form={form} className="flex items-center gap-2 font-serif text-2xl font-normal mb-2 outline-none">
                <Check className="w-5 h-5 text-[#7B6045]" />
                <span>הבקשה נשלחה!</span>
              </SentHeading>
              <p>
                מספר הבקשה: <span dir="ltr" className="font-medium">{submission.ref}</span>. התאריכים שמורים עבורכם ל-
                {submission.holdHours} שעות, ונחזור אליכם לאישור בהקדם.
              </p>
              <div className="flex flex-wrap gap-4 mt-3">
                <button type="button" className="secondary-action gap-2" onClick={() => form.openWhatsApp(submission.ref)}>
                  <MessageCircle className="w-4 h-4" />
                  <span>להמשך שיחה ב-WhatsApp</span>
                </button>
                <button type="button" className="text-action" onClick={form.startNewRequest}>
                  שליחת בקשה נוספת
                </button>
                <a className="text-action gap-2" href={`tel:${BRAND_DATA.phone}`}>
                  <Phone className="w-4 h-4" />
                  <span>שיחה טלפונית</span>
                </a>
              </div>
            </div>
          ) : form.apiEnabled ? (
            <div>
              <button
                type="button"
                id="submit-booking-request"
                onClick={form.submit}
                disabled={form.sending}
                className="primary-action w-full gap-2.5 disabled:opacity-70 disabled:cursor-wait"
              >
                {form.sending ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{form.sending ? form.sendingLabel : 'שליחת בקשה למארחים'}</span>
              </button>

              {submission.state === 'failed' && (
                <div role="alert" className="mt-3 p-3 border border-[#9b2525]/50 bg-[#FCE8E6] text-[#8C1D18] text-sm text-center rounded-[6px]">
                  {submission.message}
                </div>
              )}

              <button
                type="button"
                id="submit-booking-whatsapp"
                onClick={() => form.openWhatsApp()}
                className="secondary-action mt-3 w-full gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>מעדיפים WhatsApp? שלחו לנו את הפרטים ישירות</span>
              </button>

              <SendConsent
                className="mt-4 text-sm text-[#5E574D] text-center"
                recaptchaClassName="mt-2 text-xs text-[#5E574D] text-center"
              />
            </div>
          ) : (
            <button
              type="button"
              id="submit-booking-whatsapp"
              onClick={() => form.openWhatsApp()}
              className="primary-action w-full gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>המשך ל־WhatsApp עם הבקשה</span>
            </button>
          )}

          {form.whatsAppOpened && submission.state !== 'sent' && (
            <p role="status" className="booking-summary flex items-center gap-2">
              <Check className="w-4 h-4 text-[#7B6045] shrink-0" />
              <span>ניסינו לפתוח WhatsApp עם פרטי הבקשה. ההודעה עדיין דורשת שליחה שם.</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
