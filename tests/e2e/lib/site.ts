// Drives the real website (the booking form) and the Apps Script decision page in a browser.
import { expect, type FrameLocator, type Page } from '@playwright/test';

export type StayType = 'couple' | 'bride_day' | 'bride_night_day' | 'wedding_night';

export interface GuestForm {
  stayType: StayType;
  /** Check-in, or the wedding date for wedding stays. */
  checkIn: string;
  checkOut?: string;
  adults: 1 | 2 | 3;
  /** Bride-day packages: people present during the day (1–5). */
  participants?: number;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

/** Opens the booking section and waits until availability has loaded. */
export async function openBooking(page: Page): Promise<void> {
  // A fresh query string forces a real reload, so the page re-reads availability.
  await page.goto(`/?t=${Date.now()}#booking`);
  await page.locator('#booking').evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
  // The legend appears once availability has loaded.
  await expect(page.locator('#booking').getByText('הבחירה שלכם', { exact: true })).toBeVisible({ timeout: 60_000 });
}

function dayCell(page: Page, date: string) {
  return page.locator(`.shorashim-calendar [data-day="${date}"]`);
}

/** Pages the date picker forward until `date` is on screen. */
export async function showMonthOf(page: Page, date: string): Promise<void> {
  for (let i = 0; i < 14 && !(await dayCell(page, date).isVisible()); i++) {
    await page.locator('.shorashim-calendar .rdp-button_next').click();
  }
  await expect(dayCell(page, date)).toBeVisible();
}

/** True when the picker marks the night of `date` as taken. */
export async function isShownBooked(page: Page, date: string): Promise<boolean> {
  await showMonthOf(page, date);
  return (await dayCell(page, date).getAttribute('class'))?.includes('stay-booked') ?? false;
}

export async function isSelectable(page: Page, date: string): Promise<boolean> {
  await showMonthOf(page, date);
  return (await dayCell(page, date).locator('button').isEnabled()) && !(await dayCell(page, date).getAttribute('class'))?.includes('rdp-disabled');
}

async function pickDay(page: Page, date: string): Promise<void> {
  await showMonthOf(page, date);
  await dayCell(page, date).locator('button').click();
}

/** Fills in and submits the booking form; returns the request reference from the success screen. */
export async function submitBooking(page: Page, g: GuestForm): Promise<string> {
  const booking = page.locator('#booking');
  // Controls are found by stable hooks (data-stay-type, data-adults, input names), not by their
  // wording: the section's design and text come from front-2 and change (docs/front-sync.md).
  // tests/e2e/a11y.spec.ts checks separately that each control has an accessible name.
  await booking.locator(`[data-stay-type="${g.stayType}"]`).click();
  await pickDay(page, g.checkIn);
  if (g.checkOut) await pickDay(page, g.checkOut);
  await booking.locator(`[data-adults="${g.adults}"]`).click();
  if (g.participants) await booking.locator('select[name="participants"]').selectOption(String(g.participants));
  await booking.locator('input[name="guest-name"]').fill(g.name);
  await booking.locator('input[name="phone"]').fill(g.phone);
  if (g.email) await booking.locator('input[name="email"]').fill(g.email);
  if (g.notes) await booking.locator('textarea[name="notes"]').fill(g.notes);
  await page.locator('#submit-booking-request').click();
  const success = booking.getByText('מספר הבקשה:');
  await expect(success).toBeVisible({ timeout: 150_000 });
  const ref = (await success.textContent())?.match(/SH-[A-Z0-9]{5}/)?.[0];
  if (!ref) throw new Error('no request reference on the success screen');
  return ref;
}

/** A fresh reCAPTCHA token from the page, for direct web-app calls. */
export async function recaptchaToken(page: Page, siteKey: string): Promise<string> {
  await page.waitForFunction(() => typeof (window as any).grecaptcha?.execute === 'function', undefined, { timeout: 30_000 });
  return page.evaluate(
    (key) => new Promise<string>((resolve) => (window as any).grecaptcha.ready(() => (window as any).grecaptcha.execute(key, { action: 'booking_request' }).then(resolve))),
    siteKey
  );
}

/** The decision page's own document, inside Apps Script's two sandbox iframes. */
export function decisionFrame(page: Page): FrameLocator {
  return page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
}

/**
 * Opens a decision link and waits for `heading`. Google's front end for Apps Script now and then
 * serves an error page or an empty frame, so this reloads up to three times, as a person would.
 */
export async function openDecision(page: Page, url: string, heading: string): Promise<FrameLocator> {
  for (let attempt = 1; ; attempt++) {
    await page.goto(url);
    const frame = decisionFrame(page);
    try {
      await expect(frame.getByRole('heading', { name: heading })).toBeVisible({ timeout: 30_000 });
      return frame;
    } catch (err) {
      if (attempt === 3) throw err;
    }
  }
}
