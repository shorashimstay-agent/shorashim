// The cookie banner and the marketing pixel (src/consent/, src/lib/consent.ts, src/lib/metaPixel.ts).
// The CI build lets the pixel load on localhost with a dummy id (playwright.ci.config.ts), and every
// request to Meta is answered by a stub that records the calls, so nothing ever reaches Meta.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { FAKE_API } from '../../playwright.ci.config';
import { addDays } from '../../shared/rules.js';
import { CONSENT_KEY } from '../../shared/consentRules.js';
import { NO_CONSENT, consentState } from '../e2e/lib/consent';
import { openBooking, showMonthOf, submitBooking } from '../e2e/lib/site';

const israelToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
const ORIGIN = 'http://localhost:4174';

test.use({ storageState: NO_CONSENT });

// The stub replays the queued calls and records every later one, in this tab's sessionStorage so
// the record survives a reload. It sets the first-party cookies Meta would (host-only on localhost).
const STUB = `(function () {
  var f = window.fbq;
  var log = function (args) {
    var all = JSON.parse(sessionStorage.getItem('__fbq') || '[]');
    all.push(args);
    sessionStorage.setItem('__fbq', JSON.stringify(all));
  };
  sessionStorage.setItem('__fbqDisablePushState', String(!!(f && f.disablePushState === true)));
  var rec = function () { log(Array.prototype.slice.call(arguments).map(function (a) { return a === undefined ? null : a; })); };
  (f.queue || []).forEach(function (a) { rec.apply(null, a); });
  f.callMethod = rec;
  document.cookie = '_fbp=fb.1.1.1; path=/';
  document.cookie = '_fbc=fb.1.1.abc; path=/';
})();`;

interface Tracker {
  scripts: number;
  beacons: number;
}

async function stubMeta(context: BrowserContext): Promise<Tracker> {
  const seen: Tracker = { scripts: 0, beacons: 0 };
  await context.route('https://connect.facebook.net/**', (route) => {
    seen.scripts++;
    return route.fulfill({ contentType: 'text/javascript', body: STUB });
  });
  await context.route(/https:\/\/(www\.)?facebook\.com\/tr/, (route) => {
    seen.beacons++;
    return route.fulfill({ status: 204, body: '' });
  });
  return seen;
}

/** A minimal booking backend: everything is free; the request answers `post` (success by default). */
async function fakeBackend(context: BrowserContext, post: Record<string, unknown> = { ok: true, ref: 'SH-CI000', holdHours: 24 }) {
  await context.route('https://www.google.com/recaptcha/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: 'window.grecaptcha = { ready: (f) => f(), execute: () => Promise.resolve("ci-token") };' })
  );
  await context.route(`${FAKE_API}**`, (route) => {
    const req = route.request();
    const from = israelToday();
    if (req.method() === 'GET') {
      const check = new URL(req.url()).searchParams.get('action') === 'check';
      return route.fulfill({ json: { ok: true, ...(check ? { free: true, conflicts: [] } : {}), from, to: addDays(from, 366), blocked: [], busy: [] } });
    }
    return route.fulfill({ json: post });
  });
}

/** Fills in the form and sends it, without waiting for the success screen. */
async function sendBooking(page: Page, g: ReturnType<typeof guest>) {
  const booking = page.locator('#booking');
  const day = (d: string) => page.locator(`.shorashim-calendar [data-day="${d}"] button`);
  await showMonthOf(page, g.checkIn);
  await day(g.checkIn).click();
  await showMonthOf(page, g.checkOut);
  await day(g.checkOut).click();
  await booking.locator(`[data-adults="${g.adults}"]`).click();
  await booking.locator('input[name="guest-name"]').fill(g.name);
  await booking.locator('input[name="phone"]').fill(g.phone);
  await page.locator('#submit-booking-request').click();
}

async function fbqCalls(page: Page): Promise<unknown[][]> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem('__fbq') || '[]'));
}
const tracks = (calls: unknown[][], event: string) => calls.filter((c) => c[0] === 'track' && c[1] === event);
const cookieNames = async (context: BrowserContext) => (await context.cookies()).map((c) => c.name);
const banner = (page: Page) => page.getByRole('region', { name: 'עוגיות' });

async function accept(page: Page) {
  await banner(page).getByRole('button', { name: 'מאשרים', exact: true }).click();
  await expect(banner(page)).toHaveCount(0);
  await expect.poll(async () => tracks(await fbqCalls(page), 'PageView').length, 'accepting must load the pixel and send one PageView').toBe(1);
}

const guest = (checkIn: string) => ({
  stayType: 'couple' as const,
  checkIn,
  checkOut: addDays(checkIn, 2),
  adults: 2 as const,
  name: 'בדיקה אוטומטית',
  phone: '0501234567',
  email: 'ci@example.com',
  notes: 'CI',
});

test('first visit: the banner shows two equal buttons, and nothing loads until a choice', async ({ page, context }) => {
  const seen = await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  await expect(banner(page), 'the cookie banner must show on a first visit').toBeVisible();
  await expect(banner(page)).toContainText('ובפרטי הקשר שתמסרו (מוצפנים) כדי שפלטפורמות פרסום (כיום Meta) ימדדו וישפרו את המודעות שלנו');
  await expect(banner(page).getByRole('link', { name: 'פרטים' })).toHaveAttribute('href', '/privacy/#marketing');
  const [yes, no] = [banner(page).locator('[data-consent="granted"]'), banner(page).locator('[data-consent="denied"]')];
  const style = (l: typeof yes) =>
    l.evaluate((el) => {
      const s = getComputedStyle(el);
      return [s.fontSize, s.fontWeight, s.color, s.backgroundColor, s.borderColor, s.paddingTop, s.paddingInlineStart, el.getBoundingClientRect().height];
    });
  expect(await style(no), 'declining must look exactly like accepting').toEqual(await style(yes));
  await page.waitForTimeout(500);
  expect(seen, 'nothing may reach Meta before the visitor accepts').toEqual({ scripts: 0, beacons: 0 });
  expect(await cookieNames(context)).not.toContain('_fbp');
  // A booking without a choice is not consent either.
  await openBooking(page);
  await submitBooking(page, guest(addDays(israelToday(), 40)));
  expect(seen, 'booking without a choice must not load the pixel').toEqual({ scripts: 0, beacons: 0 });
});

test('the banner passes the accessibility scan, before and after a choice', async ({ page, context }) => {
  const { AxeBuilder } = await import('@axe-core/playwright');
  await stubMeta(context);
  await fakeBackend(context);
  for (const path of ['/', '/bride/']) {
    await page.goto(path);
    await expect(banner(page)).toBeVisible();
    const scan = async () => (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    expect(await scan(), `${path} with the banner breaks accessibility rules`).toEqual([]);
    await page.evaluate(() => localStorage.clear());
  }
  await banner(page).getByRole('button', { name: 'לא מאשרים' }).click();
  const { AxeBuilder: Axe } = await import('@axe-core/playwright');
  const after = await new Axe({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(after.violations.map((v) => v.id), 'the page after a choice breaks accessibility rules').toEqual([]);
});

test('declining hides the banner for good and never loads the pixel', async ({ page, context }) => {
  const seen = await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  await banner(page).getByRole('button', { name: 'לא מאשרים' }).click();
  await expect(banner(page)).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#main')).toBeVisible();
  await expect(banner(page), 'a saved decline must not ask again').toHaveCount(0);
  expect(JSON.parse((await page.evaluate((k) => localStorage.getItem(k), CONSENT_KEY))!)).toMatchObject({ v: 1, marketing: 'denied' });
  expect(seen).toEqual({ scripts: 0, beacons: 0 });
});

test('accepting loads the pixel with no user data and no automatic events', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  await accept(page);
  const calls = await fbqCalls(page);
  expect(calls[0], 'automatic event collection must be off before init').toEqual(['set', 'autoConfig', false, '000000000000000']);
  expect(calls[1], 'init must carry no user data (no Advanced Matching)').toEqual(['init', '000000000000000']);
  expect(await page.evaluate(() => sessionStorage.getItem('__fbqDisablePushState')), 'pushState PageViews must be off before the script loads').toBe('true');
  // After a reload the stored accept loads the pixel at once, with one PageView.
  await page.evaluate(() => sessionStorage.removeItem('__fbq'));
  await page.reload();
  await expect.poll(async () => tracks(await fbqCalls(page), 'PageView').length).toBe(1);
  await expect(banner(page)).toHaveCount(0);
});

test('the #booking flow sends one InitiateCheckout, then one Lead with a random id and no form data', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await openBooking(page);
  await accept(page);
  await submitBooking(page, guest(addDays(israelToday(), 40)));
  const calls = await fbqCalls(page);
  const order = calls.filter((c) => c[0] === 'track').map((c) => c[1]);
  expect(order, 'one PageView, one InitiateCheckout, then one Lead').toEqual(['PageView', 'InitiateCheckout', 'Lead']);
  const lead = tracks(calls, 'Lead')[0];
  expect(lead[2]).toEqual({ content_category: 'couple' });
  expect((lead[3] as { eventID: string }).eventID).toMatch(/^[0-9a-f-]{36}$/);
  const text = JSON.stringify(calls);
  for (const secret of ['SH-CI000', '0501234567', 'ci@example.com', 'בדיקה אוטומטית']) expect(text, `${secret} must never reach Meta`).not.toContain(secret);
});

test('the booking bar flow sends InitiateCheckout once per date choice', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  await accept(page);
  const booking = page.locator('#booking');
  await booking.evaluate((el) => el.scrollIntoView({ behavior: 'instant' }));
  const checkIn = addDays(israelToday(), 40);
  const pick = async (dates: string[]) => {
    const panel = page.locator('#booking .booking-bar-dates');
    for (const date of dates) {
      if (!(await panel.evaluate((el) => (el as HTMLDetailsElement).open))) await panel.locator('summary').click();
      const cell = page.locator(`.shorashim-calendar [data-day="${date}"]`);
      for (let i = 0; i < 14 && !(await cell.isVisible()); i++) await page.locator('.shorashim-calendar .rdp-button_next').click();
      await cell.locator('button').click();
    }
  };
  await pick([checkIn, addDays(checkIn, 2)]);
  await booking.locator('.booking-bar-continue').click();
  const details = page.locator('.booking-request-screen');
  await expect(details.getByText('התאריכים שבחרתם פנויים')).toBeVisible();
  await expect.poll(async () => tracks(await fbqCalls(page), 'InitiateCheckout').length).toBe(1);
  await details.getByRole('button', { name: /חזרה לבחירת האירוח/ }).click();
  await booking.locator('.booking-bar-continue').click();
  await expect(details.getByText('התאריכים שבחרתם פנויים')).toBeVisible();
  expect(tracks(await fbqCalls(page), 'InitiateCheckout').length, 'the same dates must not count twice').toBe(1);
});

test('a failed request or a bot (the hidden field) sends no Lead', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context, { ok: false, error: 'invalid', fields: { phone: 'invalid' } });
  await openBooking(page);
  await accept(page);
  const booking = page.locator('#booking');
  const checkIn = addDays(israelToday(), 40);
  const posted = page.waitForRequest((r) => r.url().startsWith(FAKE_API) && r.method() === 'POST');
  await sendBooking(page, guest(checkIn));
  await posted;
  await page.waitForTimeout(1000);
  await expect(booking.getByText('מספר הבקשה:')).toHaveCount(0);
  expect(tracks(await fbqCalls(page), 'Lead'), 'a refused request is not a lead').toEqual([]);
  await context.unroute(`${FAKE_API}**`);
  await fakeBackend(context);
  await booking.locator('input[name="website"]').evaluate((el: HTMLInputElement) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(el, 'https://spam.example');
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#submit-booking-request').click();
  await expect(booking.getByText('מספר הבקשה:')).toBeVisible();
  expect(tracks(await fbqCalls(page), 'Lead'), 'the honeypot\'s fake success is not a lead').toEqual([]);
});

test('withdrawing from the footer stops the pixel, deletes its cookies and reloads', async ({ page, context }) => {
  const seen = await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  await accept(page);
  expect(await cookieNames(context)).toContain('_fbp');
  const settings = page.getByRole('button', { name: 'הגדרות עוגיות' });
  await settings.click();
  await expect(banner(page)).toContainText('כרגע: מאשרים');
  await expect(page.locator('#consent-heading'), 'focus moves into the reopened banner').toBeFocused();
  const scriptsBefore = seen.scripts;
  await Promise.all([page.waitForEvent('load'), banner(page).getByRole('button', { name: 'לא מאשרים' }).click()]);
  expect((await fbqCalls(page)).some((c) => c[0] === 'consent' && c[1] === 'revoke'), 'the pixel must be revoked at once').toBe(true);
  expect(await cookieNames(context)).not.toContain('_fbp');
  expect(await cookieNames(context)).not.toContain('_fbc');
  await page.waitForTimeout(500);
  expect(seen.scripts, 'after withdrawing, the pixel must not load again').toBe(scriptsBefore);
});

test('an expired accept asks again, and its old cookies are deleted', async ({ page, context }) => {
  const seen = await stubMeta(context);
  await fakeBackend(context);
  await context.addCookies([{ name: '_fbp', value: 'fb.1.old', url: ORIGIN }]);
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem(key, JSON.stringify({ v: 1, marketing: 'granted', at: '2020-01-01' }));
      sessionStorage.setItem('seeded', '1');
    }
  }, CONSENT_KEY);
  await page.goto('/');
  await expect(banner(page), 'an expired choice must ask again').toBeVisible();
  expect(await cookieNames(context)).not.toContain('_fbp');
  expect(seen.scripts).toBe(0);
});

test('when storage is blocked, the banner asks on every page and an accept lasts one page', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  await expect(banner(page)).toBeVisible();
  await accept(page);
  await page.evaluate(() => sessionStorage.removeItem('__fbq'));
  await page.reload();
  await expect(banner(page), 'nothing was saved, so it asks again').toBeVisible();
  await page.waitForTimeout(500);
  expect(tracks(await fbqCalls(page), 'PageView'), 'the accept lasted only that page').toEqual([]);
});

test('the privacy page shows the tools and its own controls, and never loads the pixel', async ({ page, context }) => {
  const seen = await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  await banner(page).getByRole('link', { name: 'פרטים' }).click();
  await expect(page).toHaveURL(/\/privacy\/#marketing$/);
  await expect(page.locator('#marketing'), 'the link must land on the marketing section').toBeInViewport();
  await expect(page.locator('[data-testid="marketing-tools"] [data-tool="meta"]')).toContainText('Meta');
  await expect(page.locator('[data-testid="marketing-tools"]')).toContainText('_fbp');
  const controls = page.getByRole('group', { name: 'הגדרות עוגיות' });
  await expect(controls).toContainText('עדיין לא בחרתם');
  await controls.getByRole('button', { name: 'מאשרים', exact: true }).click();
  await expect(controls).toContainText('הבחירה הנוכחית: מאשרים');
  expect(seen.scripts, 'the privacy page must never load the pixel').toBe(0);
  // Withdrawing here deletes the cookies without a reload.
  await context.addCookies([{ name: '_fbp', value: 'fb.1.x', url: ORIGIN }]);
  const url = page.url();
  await controls.getByRole('button', { name: 'לא מאשרים' }).click();
  await expect(controls).toContainText('הבחירה הנוכחית: לא מאשרים');
  expect(await cookieNames(context)).not.toContain('_fbp');
  expect(page.url()).toBe(url);
  // An accept made here applies on the next main-page visit.
  await controls.getByRole('button', { name: 'מאשרים', exact: true }).click();
  await page.goto('/');
  await expect.poll(async () => tracks(await fbqCalls(page), 'PageView').length).toBe(1);
  await expect(banner(page)).toHaveCount(0);
});

test('a withdrawal in another tab stops the pixel here too', async ({ context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  const a = await context.newPage();
  await a.goto('/');
  await accept(a);
  const b = await context.newPage();
  await b.goto('/privacy/');
  await Promise.all([a.waitForEvent('load'), b.getByRole('group', { name: 'הגדרות עוגיות' }).getByRole('button', { name: 'לא מאשרים' }).click()]);
  expect((await fbqCalls(a)).some((c) => c[0] === 'consent' && c[1] === 'revoke'), 'the other tab must revoke the pixel').toBe(true);
  await expect(banner(a)).toHaveCount(0);
});

test('a page restored from the back-forward cache honours a withdrawal made meanwhile', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  await accept(page);
  await Promise.all([
    page.waitForEvent('load'),
    page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({ v: 1, marketing: 'denied', at: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()) }));
      // Dispatched after evaluate returns, so the reload it causes can't cut the call short.
      setTimeout(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })), 0);
    }, CONSENT_KEY),
  ]);
  expect((await fbqCalls(page)).some((c) => c[0] === 'consent' && c[1] === 'revoke')).toBe(true);
  expect(await cookieNames(context)).not.toContain('_fbp');
  // After the reload nothing loads, and a booking sends no Lead.
  await page.evaluate(() => sessionStorage.removeItem('__fbq'));
  await openBooking(page);
  await submitBooking(page, guest(addDays(israelToday(), 40)));
  expect(tracks(await fbqCalls(page), 'Lead')).toEqual([]);
});

test('on a 320 px screen the banner covers nothing and the page does not scroll sideways', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  await expect(banner(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll at 320 px').toBe(true);
  for (const sel of ['#floating-whatsapp-btn', '#accessibility-menu-btn']) {
    const covered = await page.locator(sel).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !(hit && (hit === el || el.contains(hit)));
    });
    expect(covered, `${sel} must not be covered by the cookie banner`).toBe(false);
  }
  for (const consent of ['granted', 'denied']) {
    const hits = await banner(page).locator(`[data-consent="${consent}"]`).evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === el || el.contains(hit);
    });
    expect(hits, `the ${consent} button must be clickable`).toBe(true);
  }
});

test('keyboard: the banner comes first, and the settings button gets focus back', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(banner(page).getByRole('link', { name: 'פרטים' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(banner(page).getByRole('button', { name: 'מאשרים', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(banner(page).getByRole('button', { name: 'לא מאשרים' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(banner(page)).toHaveCount(0);
  await expect(page.locator('#main'), 'focus must not be lost on the vanished button').toBeFocused();
  const settings = page.getByRole('button', { name: 'הגדרות עוגיות' });
  await settings.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#consent-heading')).toBeFocused();
  await banner(page).getByRole('button', { name: 'לא מאשרים' }).focus();
  await page.keyboard.press('Enter');
  await expect(settings, 'focus returns to the button that opened the banner').toBeFocused();
});

test('existing suites start with a saved decline and never see the banner', async ({ browser }) => {
  const context = await browser.newContext({ storageState: consentState([ORIGIN]) });
  const seen = await stubMeta(context);
  await fakeBackend(context);
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/`);
  await expect(page.locator('#main')).toBeVisible();
  await expect(banner(page)).toHaveCount(0);
  expect(seen.scripts).toBe(0);
  await context.close();
});

test('the bride page has the banner, and accepting there loads the pixel', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/bride/');
  await accept(page);
});

test('new dates count as a new InitiateCheckout; the WhatsApp buttons send no Lead', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await openBooking(page);
  await accept(page);
  const booking = page.locator('#booking');
  const checkIn = addDays(israelToday(), 40);
  await submitBooking(page, guest(checkIn));
  await page.evaluate(() => sessionStorage.removeItem('__fbq'));
  await context.route('https://wa.me/**', (route) => route.fulfill({ body: 'whatsapp' }));
  await page.locator('#floating-whatsapp-btn').click();
  await page.waitForTimeout(500);
  expect(tracks(await fbqCalls(page), 'Lead'), 'a WhatsApp click is not a lead').toEqual([]);
  // A second request for other dates is a new funnel: one more InitiateCheckout and one more Lead.
  await context.unroute(`${FAKE_API}**`);
  await fakeBackend(context, { ok: true, ref: 'SH-CI001', holdHours: 24 });
  await openBooking(page);
  await submitBooking(page, guest(addDays(checkIn, 7)));
  const order = (await fbqCalls(page)).filter((c) => c[0] === 'track').map((c) => c[1]);
  expect(order).toEqual(['PageView', 'InitiateCheckout', 'Lead']);
  await expect(booking).toBeVisible();
});

test('withdrawing with text in the booking form asks before reloading; "later" sends nothing more', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await openBooking(page);
  await accept(page);
  await page.locator('#booking input[name="guest-name"]').fill('בדיקה');
  let asked = '';
  page.once('dialog', (d) => {
    asked = d.message();
    void d.dismiss();
  });
  await page.getByRole('button', { name: 'הגדרות עוגיות' }).click();
  await banner(page).getByRole('button', { name: 'לא מאשרים' }).click();
  await expect.poll(() => asked, 'the visitor must be asked before losing typed text').toContain('לרענן עכשיו?');
  await expect(page.locator('#booking input[name="guest-name"]'), 'saying "later" keeps the page and the text').toHaveValue('בדיקה');
  expect((await fbqCalls(page)).some((c) => c[0] === 'consent' && c[1] === 'revoke'), 'the pixel stops at once anyway').toBe(true);
  const before = (await fbqCalls(page)).length;
  await submitBooking(page, guest(addDays(israelToday(), 40)));
  expect((await fbqCalls(page)).length, 'after a withdrawal nothing more is sent').toBe(before);
});

test('declining on a page where nothing loaded does not reload it', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.goto('/');
  let reloaded = false;
  page.on('framenavigated', (f) => f === page.mainFrame() && (reloaded = true));
  await banner(page).getByRole('button', { name: 'לא מאשרים' }).click();
  await page.waitForTimeout(800);
  expect(reloaded).toBe(false);
});

test('short screens and the largest text: the banner joins the page, and the drawer and buttons stay usable', async ({ page, context }) => {
  const { AxeBuilder } = await import('@axe-core/playwright');
  await stubMeta(context);
  await fakeBackend(context);
  await page.addInitScript(() => localStorage.setItem('shorashim:a11y', JSON.stringify(['textLarger', 'contrast'])));
  await page.setViewportSize({ width: 320, height: 256 });
  await page.goto('/');
  const bar = banner(page).locator('xpath=.');
  await expect(bar).toBeVisible();
  expect(await bar.evaluate((el) => getComputedStyle(el).position), 'below 420 px of height the banner is in the page flow').toBe('static');
  for (const consent of ['granted', 'denied']) {
    const button = banner(page).locator(`[data-consent="${consent}"]`);
    await button.scrollIntoViewIfNeeded();
    expect(await button.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return hit === el || el.contains(hit);
    }), `the ${consent} button must be clickable at 400% zoom`).toBe(true);
  }
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => v.id), 'large text + high contrast with the banner').toEqual([]);
  // A normal phone: the open menu drawer is above the banner, and back-to-top clears it.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('#mobile-menu-toggle-btn').click();
  const drawerLink = page.locator('#mobile-nav-drawer a').last();
  await expect(drawerLink).toBeVisible();
  await page.locator('#mobile-menu-toggle-btn').click();
  await page.evaluate(() => window.scrollTo(0, 2000));
  const top = page.locator('.back-to-top');
  await expect(top).toBeVisible();
  expect(await top.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit === el || el.contains(hit);
  }), 'back-to-top must not be covered by the banner').toBe(true);
});

test('in the #booking form the send button can be scrolled clear of the banner', async ({ page, context }) => {
  await stubMeta(context);
  await fakeBackend(context);
  await page.setViewportSize({ width: 375, height: 700 });
  await openBooking(page);
  await expect(banner(page)).toBeVisible();
  const send = page.locator('#submit-booking-request');
  await send.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 400));
  await send.evaluate((el) => el.scrollIntoView({ block: 'end' }));
  expect(await send.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit === el || el.contains(hit);
  }), 'the send button must not hide under the banner').toBe(true);
});

test('the privacy page controls pass the accessibility scan', async ({ page, context }) => {
  const { AxeBuilder } = await import('@axe-core/playwright');
  await stubMeta(context);
  await page.goto('/privacy/#marketing');
  await expect(page.getByRole('group', { name: 'הגדרות עוגיות' })).toBeVisible();
  const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(scan.violations.map((v) => v.id)).toEqual([]);
  await page.goto('/en/privacy/#marketing');
  await expect(page.getByRole('group', { name: 'Cookie settings' })).toBeVisible();
});
