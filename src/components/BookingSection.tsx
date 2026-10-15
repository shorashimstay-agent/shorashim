import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Check, Phone, Send, Loader2 } from 'lucide-react';
import { BRAND_DATA } from '../data/shorashimData';
import { STAY_PACKAGES, PRICE_NOTE } from '../data/booking';
import { useBookingForm } from '../booking/useBookingForm';
import { Announcer, DatePicker, FieldError, Honeypot, SendConsent, SentHeading, described } from '../booking/parts';
import { NOTES_MAX, addDays, formatHebrewDate, type StayType } from '../lib/stay';
import PolicyDetails from './PolicyDetails';
import PriceStatus from './PriceStatus';

// Layout only. The form's behaviour is in ../booking/ (docs/front-sync.md).

interface BookingSectionProps {
  stayType: StayType;
  onStayTypeChange: (type: StayType) => void;
}

const errorClass = 'field-error';

export default function BookingSection({ stayType, onStayTypeChange }: BookingSectionProps) {
  const contactPanel = useRef<HTMLDialogElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const datesPanel = useRef<HTMLDetailsElement>(null);
  const [expanded, setExpanded] = useState(() => window.location.hash === '#booking');
  useEffect(() => {
    const open = () => setExpanded(true);
    window.addEventListener('shorashim:open-booking', open);
    return () => window.removeEventListener('shorashim:open-booking', open);
  }, []);
  useEffect(() => { if (expanded) contactPanel.current?.show(); }, [expanded]);
  const form = useBookingForm(stayType);
  const { ids, errors, submission, wedding, nights, adultsCount } = form;
  const pkg = STAY_PACKAGES[form.stayType];

  const closeField = (element: HTMLElement) => {
    if (expanded) return;
    const panel = element.closest('details');
    if (panel?.classList.contains('booking-bride-entry') && form.stayType !== 'couple') return;
    if (panel) {
      panel.open = false;
      panel.querySelector('summary')?.focus();
    }
  };

  useEffect(() => {
    if (expanded || !form.checkIn) return;
    if (datesPanel.current?.open) {
      datesPanel.current.open = false;
      datesPanel.current.querySelector('summary')?.focus();
    }
  }, [form.checkIn, form.checkOut, wedding, expanded]);

  useEffect(() => {
    if (expanded) return;
    const closeOutside = (event: PointerEvent) => {
      if (!bar.current?.contains(event.target as Node)) {
        bar.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(panel => { if (!panel.classList.contains('booking-bride-entry')) panel.open = false; });
      }
    };
    const closeOthers = (event: Event) => {
      const opened = event.target as HTMLDetailsElement;
      if (opened.open) bar.current?.querySelectorAll<HTMLDetailsElement>('details[open]').forEach(panel => { if (panel !== opened && !panel.classList.contains('booking-bride-entry')) panel.open = false; });
    };
    const currentBar = bar.current;
    currentBar?.addEventListener('toggle', closeOthers, true);
    document.addEventListener('pointerdown', closeOutside);
    return () => { document.removeEventListener('pointerdown', closeOutside); currentBar?.removeEventListener('toggle', closeOthers, true); };
  }, [expanded]);

  const chooseStayType = (type: StayType) => {
    form.setStayType(type);
    onStayTypeChange(type);
  };

  return (
    <section id="booking" tabIndex={-1} className="py-12 sm:py-24 bg-[#F4F0E8]" dir="rtl" lang="he">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">
        
        <h2 className="sr-only">בקשת אירוח בשורשים</h2>
        <p className="sr-only">
          בחרו מסלול ותאריכים ושלחו לנו בקשה. נבדוק את הזמינות ונחזור אליכם; זו עדיין אינה הזמנה מאושרת.
        </p>

        <div className={`booking-form compact-booking ${expanded ? 'booking-expanded' : ''}`}>
          <div ref={bar} className="booking-bar">
          <details className="booking-bar-field booking-bride-entry" open={expanded || form.stayType !== 'couple' || undefined}><summary><strong>כלה בשורשים</strong><span>לחצי כאן לבחירת מסלול</span></summary><div className="booking-bar-popover">
          <fieldset>
            <legend id={ids.stayType}>{form.stayType === 'couple' ? 'סוג האירוח' : '1. בחרי את המסלול שמתאים לך'}</legend>
            <div className="grid sm:grid-cols-2 gap-2">
              {Object.values(STAY_PACKAGES).filter(p => form.stayType === 'couple' || p.id === 'bride_day' || p.id === 'bride_night_day').map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-stay-type={p.id}
                  aria-pressed={form.stayType === p.id}
                  onClick={event => { chooseStayType(p.id); closeField(event.currentTarget); }}
                  className={`choice text-right ${form.stayType === p.id ? 'selected' : ''}`}
                >
                  <span>
                    <span className="block">{p.title}</span>
                    {p.id === 'bride_day' && <span className="block text-sm mt-1">ללא לינה · עד 5 משתתפים בסך הכול, כולל הכלה, המלוות ואנשי המקצוע</span>}
                    {p.id === 'bride_night_day' && <span className="block text-sm mt-1">עד 3 מבוגרים ללינה · עד 5 משתתפים בסך הכול ביום ההתארגנות, כולל הכלה, המלוות ואנשי המקצוע</span>}
                    {p.id === 'wedding_night' && <span className="block text-sm mt-1 leading-relaxed">הגעה אחרי האירוע בתיאום · יציאה ב־13:00 · שובר לארוחת בוקר זכרונית</span>}
                  </span>
                </button>
              ))}
              {form.stayType !== 'couple' && <div className="choice text-right border-dashed"><span><span className="block">יום התארגנות + ליל כלולות</span><span className="block text-sm mt-1">עד 5 משתתפים בסך הכול בהתארגנות, כולל הכלה, המלוות ואנשי המקצוע. חזרה ללינה אחרי החתונה.</span><span className="block text-sm mt-2 font-medium">לבירור אישי עם המארחים · אינו זמין להזמנה דרך האתר</span></span></div>}
            </div>
          </fieldset></div></details>

          <details ref={datesPanel} className="booking-bar-field booking-bar-dates" open={expanded || errors.dates ? true : undefined}><summary className="booking-date-pair">{wedding ? <span className="date-pair-cell"><span>תאריך החתונה</span><strong>{form.checkIn ? new Date(form.checkIn + 'T12:00').toLocaleDateString('he-IL') : 'בחירת יום'}</strong></span> : <><span className="date-pair-cell"><span>כניסה</span><strong>{form.checkIn ? new Date(form.checkIn + 'T12:00').toLocaleDateString('he-IL') : 'בחירת תאריך'}</strong></span><span className="date-pair-cell"><span>יציאה</span><strong>{form.checkOut ? new Date(form.checkOut + 'T12:00').toLocaleDateString('he-IL') : 'בחירת תאריך'}</strong></span></>}</summary><div className="booking-bar-popover">
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
            {wedding && form.stayType !== 'bride_day' && (
              <p className="mt-1 text-sm text-[#5E574D]">
                כדי שהבית יהיה פנוי ושקט עבורך, אנחנו שומרים את הלילה שלפני החתונה ואת ליל החתונה.
              </p>
            )}
            <FieldError id={`${ids.datesLabel}-error`} message={errors.dates} className={errorClass} />
          </div></details>

          <div className="booking-guests-inline">
          {form.stayType !== 'bride_day' && (<fieldset>
            <legend id={ids.adultsLabel}>אורחים</legend>
            <div className="flex flex-wrap gap-3 items-center">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  data-adults={num}
                  aria-pressed={adultsCount === num}
                  aria-label={num === 1 ? 'מבוגר אחד' : `${num} מבוגרים`}
                  onClick={event => { form.setAdultsCount(num); if (!form.hasDayParticipants) closeField(event.currentTarget); }}
                  className={`choice min-w-12 justify-center ${adultsCount === num ? 'selected' : ''}`}
                >
                  <bdi>{num}</bdi>
                </button>
              ))}
              <span className="text-sm text-[#5E574D]">
                לזוגות ועד <bdi>3</bdi> אורחים (אורח שלישי על ספה נפתחת)
              </span>
            </div>
          </fieldset>)}

          {form.hasDayParticipants && (
            <div>
              <label htmlFor={ids.participants}>משתתפי יום — כולל הכלה, מלוות ואנשי מקצוע (עד {form.maxDayParticipants})</label>
              <select
                id={ids.participants}
                name="participants"
                value={form.participants}
                onChange={(e) => { form.setParticipants(Number(e.target.value)); closeField(e.currentTarget); }}
              >
                {Array.from({ length: form.maxDayParticipants }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}

          </div>
          <button type="button" className="primary-action booking-bar-continue" onClick={() => { if (contactPanel.current) { contactPanel.current.showModal(); } }}>להזמנה</button>
          </div>
          
          
          <dialog ref={contactPanel} className="booking-request-screen" aria-labelledby="request-screen-heading"><div className="request-screen-top"><span>שורשים · בקשת אירוח</span><button type="button" className="text-action" onClick={() => contactPanel.current?.close()} autoFocus>חזרה לבחירת האירוח ←</button></div><div className="contact-editorial space-y-6 mt-5"><div className="contact-editorial-heading"><h3 id="request-screen-heading" className="font-serif">רגע לפני שנפגשים</h3><p>השאירו פרטים ונחזור אליכם לאישור המועד ולתיאום האירוח.</p></div>
          <div className="booking-summary" role="group" aria-label="סיכום הבקשה">
            <h3 className="font-serif text-2xl mb-3">פרטי האירוח שבחרתם</h3>
            <p className="font-medium">{pkg.title}</p>
            <dl className="request-facts">
              <div>
                <dt>תאריכים</dt>
                <dd>{form.stayType === 'bride_night_day' && form.checkIn
                  ? <>{formatHebrewDate(addDays(form.checkIn, -1))} – {formatHebrewDate(form.checkIn)}</>
                  : form.datesText || 'טרם נבחרו'}</dd>
              </div>
              <div>
                <dt>{form.stayType === 'bride_day' ? 'לינה' : 'אורחי לינה'}</dt>
                <dd>{form.stayType === 'bride_day' ? 'ללא לינה' : adultsCount}</dd>
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
            </dl>
            {form.stayType === 'bride_night_day' && form.checkIn && <p className="text-sm mt-3 text-[#665548]">לילה אחד ויום התארגנות. הגעה ב־15:00 ביום שלפני החתונה ויציאה ב־15:30 ביום החתונה.</p>}
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
          </div></dialog>
        </div>
      </div>
    </section>
  );
}
