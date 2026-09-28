import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defineConfig } from '@playwright/test';
import { snapshotCsvUrl, staging } from './tests/e2e/lib/env';

// Two targets (tests/e2e/PLAN.md):
// - staging: the working tree, built against the staging backend and served on localhost;
// - smoke: read-only checks of the live site and production backend.
const smoke = process.env.E2E_TARGET === 'smoke';
const PORT = 4173;

// Playwright's bundled Chromium 153 never runs requestAnimationFrame or IntersectionObserver under
// this WSL setup (checked 2026-09-27), so the site never loads reCAPTCHA. Chrome 147 works. Use
// E2E_CHROME, else ~/.local/bin/google-chrome when present, else the bundled browser.
const localChrome = path.join(os.homedir(), '.local/bin/google-chrome');
const executablePath = process.env.E2E_CHROME || (fs.existsSync(localChrome) ? localChrome : undefined);

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  retries: 0,
  timeout: 10 * 60_000,
  expect: { timeout: 30_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'staging',
      testMatch: ['a11y.spec.ts', 'booking.spec.ts', 'console.spec.ts'],
      use: { baseURL: `http://localhost:${PORT}` },
    },
    {
      name: 'smoke',
      testMatch: 'smoke.spec.ts',
      use: { baseURL: 'https://shorashimstay.com' },
    },
  ],
  webServer: smoke
    ? undefined
    : {
        command: `npm run build -- --outDir .e2e-dist --emptyOutDir && npx vite preview --outDir .e2e-dist --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}`,
        reuseExistingServer: false,
        timeout: 5 * 60_000,
        env: {
          VITE_BOOKING_API_URL: staging.webAppUrl,
          VITE_AVAILABILITY_SNAPSHOT_URL: snapshotCsvUrl(staging),
          VITE_RECAPTCHA_SITE_KEY: staging.recaptchaSiteKey,
        },
      },
});
