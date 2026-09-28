// Pieces of the booking form that carry behaviour, accessibility wiring or legal text. The layout in
// BookingSection.tsx styles them through className but should not rebuild them.
import type { ReactNode } from 'react';
import { RECAPTCHA_SITE_KEY } from '../data/bookingConfig';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import type { BookingForm } from './useBookingForm';

export function FieldError({ id, message, className = 'mt-1 text-xs text-[#B3261E]' }: { id: string; message?: string; className?: string }) {
  return message ? (
    <p id={id} className={className}>
      {message}
    </p>
  ) : null;
}

/** Props that tie an input to its error message for screen readers. */
export const described = (errorId: string, message?: string) => ({
  'aria-invalid': message ? true : undefined,
  'aria-describedby': message ? errorId : undefined,
});

/**
 * The availability date picker inside a group labelled by the element with id `form.ids.datesLabel`
 * (the layout renders that label). The tests and the error focus both find the picker through it.
 */
export function DatePicker({ form, className }: { form: BookingForm; className?: (hasError: boolean) => string }) {
  const hasError = Boolean(form.errors.dates);
  return (
    <div
      role="group"
      aria-labelledby={form.ids.datesLabel}
      aria-describedby={hasError ? `${form.ids.datesLabel}-error` : undefined}
      className={className?.(hasError)}
    >
      <AvailabilityCalendar
        stayType={form.stayType}
        blocked={form.blocked}
        windowEnd={form.windowEnd}
        checkIn={form.checkIn}
        checkOut={form.checkOut}
        onChange={form.changeDates}
      />
    </div>
  );
}

/** Hidden from people, filled in by bots; the web app quietly drops requests that fill it. */
export function Honeypot({ form }: { form: BookingForm }) {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      value={form.website}
      onChange={(e) => form.setWebsite(e.target.value)}
      className="sr-only"
    />
  );
}

/** Announces sending and validation results to screen readers. */
export function Announcer({ form }: { form: BookingForm }) {
  return (
    <p className="sr-only" aria-live="polite" role="status">
      {form.announcement}
    </p>
  );
}

/** The consent line under the send button: the booking terms, the privacy policy and reCAPTCHA's notice. */
export function SendConsent({ className = 'mt-3 text-xs text-[#5C5549] text-center', recaptchaClassName = 'mt-2 text-[11px] text-[#6E675E] text-center', linkClassName = 'underline' }: { className?: string; recaptchaClassName?: string; linkClassName?: string }) {
  return (
    <>
      <p className={className}>
        שליחת הבקשה היא הסכמה ל
        <a href="/terms/" className={linkClassName}>
          תנאי ההזמנה והשימוש
        </a>{' '}
        ול
        <a href="/privacy/" className={linkClassName}>
          מדיניות הפרטיות
        </a>
        .
      </p>
      {RECAPTCHA_SITE_KEY && (
        <p className={recaptchaClassName}>
          האתר מוגן באמצעות reCAPTCHA, ו
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={linkClassName}>
            מדיניות הפרטיות
          </a>{' '}
          ו
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className={linkClassName}>
            תנאי השימוש
          </a>{' '}
          של Google חלים.
        </p>
      )}
    </>
  );
}

/** The panel that replaces the send button once the request is in; focus moves to its heading. */
export function SentHeading({ form, className, children }: { form: BookingForm; className?: string; children: ReactNode }) {
  return (
    <h4 ref={form.successHeadingRef} tabIndex={-1} className={className}>
      {children}
    </h4>
  );
}
