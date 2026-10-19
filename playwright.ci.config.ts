import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Checks that run in GitHub Actions on every design push (tests/ci), before it can go live. They need
// no accounts or backend: the site is built against a fake booking API that the tests answer
// themselves, so they check only that the page still works and that the form still sends what the
// backend expects.
const PORT = 4174;
export const FAKE_API = 'https://booking-api.test/exec';
export const FAKE_SITE_KEY = 'ci-recaptcha-site-key';

const testPrices = JSON.parse(fs.readFileSync('tests/e2e/fixtures/prices.json', 'utf8')).prices as Record<string, number>;
const testPricesCsv = Object.entries(testPrices).map(([key, price]) => `"${key}","","${price}"`).join('\n');

// Locally (WSL) the bundled Chromium never runs IntersectionObserver; see playwright.config.ts.
// CI always uses the bundled browser.
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'), quiet: true });
const executablePath = (!process.env.CI && process.env.E2E_CHROME) || undefined;

export default defineConfig({
  testDir: 'tests/ci',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 2 * 60_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    launchOptions: { executablePath },
  },
  webServer: {
    command: `npm run build -- --outDir .ci-dist --emptyOutDir && npx vite preview --outDir .ci-dist --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 5 * 60_000,
    env: {
      VITE_BOOKING_API_URL: FAKE_API,
      VITE_AVAILABILITY_SNAPSHOT_URL: '',
      VITE_RECAPTCHA_SITE_KEY: FAKE_SITE_KEY,
      VITE_PRICES_CSV_URL: `data:text/csv;charset=utf-8,${encodeURIComponent(testPricesCsv)}`,
    },
  },
});
