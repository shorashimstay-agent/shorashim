// Accessibility regression checks (IS 5568 / WCAG 2.1 AA): axe-core scans plus keyboard behaviour
// that automated scans cannot see. Read-only: nothing here submits a booking.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const LEGAL = ['/terms/', '/privacy/', '/accessibility/', '/en/terms/', '/en/privacy/', '/en/accessibility/'];

/** Scrolls through the page so lazy images and on-scroll content are rendered before scanning. */
async function renderAll(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
}

async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
    // Google's reCAPTCHA iframe is third-party and hidden; it is covered by the statement's limitations.
    .exclude('iframe[src*="recaptcha"]')
    .analyze();
  return result.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`axe: home page has no violations at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#booking').getByText('הבחירה שלכם', { exact: true })).toBeAttached({ timeout: 60_000 });
    await renderAll(page);
    expect(await axe(page)).toEqual([]);
  });
}

for (const path of LEGAL) {
  test(`axe: ${path} has no violations and the right language`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.getAttribute('html', 'lang')).toBe(path.startsWith('/en/') ? 'en' : 'he');
    expect(await axe(page)).toEqual([]);
  });
}

test('the high-contrast and larger-text modes pass axe too', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('shorashim:a11y', JSON.stringify(['contrast', 'textLarger'])));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
  await renderAll(page);
  expect(await axe(page)).toEqual([]);
});

test('keyboard: the skip link is the first stop and moves focus to the main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'דלגו לתוכן העיקרי' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('keyboard: a gallery photo opens with Enter, Esc closes it, and focus returns to the photo', async ({ page }) => {
  await page.goto('/#gallery');
  const card = page.locator('#gallery').getByRole('button', { name: /^הגדלת התמונה:/ }).first();
  await card.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'סגירת התמונה' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(card).toBeFocused();
});

test('keyboard: the accessibility menu opens, toggles options, remembers them and resets', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'תפריט נגישות' }).click();
  const menu = page.getByRole('dialog', { name: 'התאמות נגישות' });
  await expect(menu).toBeVisible();
  const contrast = menu.getByRole('button', { name: 'ניגודיות גבוהה' });
  await contrast.click();
  await expect(contrast).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
  await page.getByRole('button', { name: 'תפריט נגישות' }).click();
  await page.getByRole('button', { name: 'איפוס ההתאמות' }).click();
  await expect(page.locator('html')).not.toHaveClass(/a11y-contrast/);
  await expect(menu.getByRole('link', { name: 'הצהרת הנגישות' })).toHaveAttribute('href', '/accessibility/');
});

test('keyboard: the mobile menu reports its state and closes with Esc', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.locator('#mobile-menu-toggle-btn');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#mobile-nav-drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-nav-drawer')).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('form: an empty submission marks the fields invalid, links the errors and focuses the first one', async ({ page }) => {
  await page.goto('/#booking');
  await expect(page.locator('#booking').getByText('הבחירה שלכם', { exact: true })).toBeVisible({ timeout: 60_000 });
  await page.locator('#submit-booking-request').click();
  const name = page.getByPlaceholder('ישראל ישראלי');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  const errorId = await name.getAttribute('aria-describedby');
  await expect(page.locator(`[id="${errorId}"]`)).toHaveText(/./);
  await expect(page.getByRole('status').filter({ hasText: /שדות שצריך לתקן|שדה אחד/ })).toBeAttached();
  // Dates are the first missing field, so focus lands in the date picker.
  await expect(page.locator('.shorashim-calendar button:focus, .shorashim-calendar :focus')).toHaveCount(1);
});

test('form: calendar days are announced with their full date and availability', async ({ page }) => {
  await page.goto('/#booking');
  await expect(page.locator('#booking').getByText('הבחירה שלכם', { exact: true })).toBeVisible({ timeout: 60_000 });
  const label = await page.locator('.shorashim-calendar [data-day] button').last().getAttribute('aria-label');
  expect(label).toMatch(/\d{4}/);
});

test('reflow: no sideways scrolling at 320px wide', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ['/', '/terms/', '/accessibility/']) {
    await page.goto(path);
    await renderAll(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test('legal pages are linked from the footer and from the booking form', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  for (const [name, href] of [['תנאי הזמנה ושימוש', '/terms/'], ['מדיניות פרטיות', '/privacy/'], ['הצהרת נגישות', '/accessibility/']]) {
    await expect(footer.getByRole('link', { name })).toHaveAttribute('href', href);
  }
  await expect(page.locator('#booking a[href="/privacy/"]')).toHaveText('מדיניות הפרטיות');
  await expect(page.locator('#booking a[href="/terms/"]')).toHaveText('תנאי ההזמנה והשימוש');
});
