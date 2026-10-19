// Local settings for the regression suite. Everything account-specific lives outside this public
// repo: the project's git-ignored .env names the files and accounts (.env.example lists the keys).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
dotenv.config({ path: path.join(ROOT, '.env'), quiet: true });

export interface Guest {
  email: string;
  /** OAuth authorized-user token file, or null when the suite cannot read this guest's mail. */
  token: string | null;
  /** Whether the token can read the guest's calendar. */
  calendar: boolean;
}

export interface BackendConfig {
  calendars: { bookings: string; requests: string; channels: string };
  hmacSecret: string;
  ownerEmail: string;
  notifyEmail?: string;
  webAppUrl: string;
  recaptchaSiteKey: string;
  adminSheetId: string;
  availabilitySheetId: string;
  /** The owner's prices spreadsheet, which the web app reads (shared/rules.js pricesFromRows). */
  pricesSheetId?: string;
  testHooks?: boolean;
  /** Staging only: the /admin console password, so the suite can log in (production keeps only a hash). */
  consolePassword?: string;
  /** The event log's Firestore project and its writer service account (apps-script/src/EventLog.js). */
  firestore?: { projectId: string; clientEmail: string; privateKeyId: string; privateKey: string };
}

interface E2EConfig {
  owner: { token: string };
  guestA: Guest;
  guestB: Guest;
  stagingConfig: string;
  productionConfig: string;
}

function setting(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set. Add it to .env (see .env.example).`);
  return value;
}

function guest(prefix: string): Guest {
  return {
    email: setting(`${prefix}_EMAIL`),
    token: process.env[`${prefix}_TOKEN`] || null,
    calendar: process.env[`${prefix}_CALENDAR`] === 'true',
  };
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export const e2e: E2EConfig = {
  // The owner is the staging account, which the staging backend runs as.
  owner: { token: setting('SHORASHIM_STAGING_TOKEN') },
  guestA: guest('E2E_GUEST_A'),
  guestB: guest('E2E_GUEST_B'),
  stagingConfig: setting('SHORASHIM_STAGING_CONFIG'),
  productionConfig: setting('SHORASHIM_PROD_CONFIG'),
};
export const staging = readJson<BackendConfig>(e2e.stagingConfig);
export const production = readJson<BackendConfig>(e2e.productionConfig);

export function snapshotCsvUrl(cfg: BackendConfig): string {
  return `https://docs.google.com/spreadsheets/d/${cfg.availabilitySheetId}/gviz/tq?tqx=out:csv&range=A1:D2&headers=0`;
}

/** CSV export of the prices sheet, as the site reads it (src/data/bookingConfig.ts). */
export function pricesCsvUrl(cfg: BackendConfig): string {
  return `https://docs.google.com/spreadsheets/d/${cfg.pricesSheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('מחירים')}&range=A1:C20`;
}

/** Every run tags what it creates with this, so cleanup can find it even after a crash. */
export const RUN_PREFIX = 'E2E-';
export const runId = (process.env.E2E_RUN_ID ??= Date.now().toString(36).slice(-6).toUpperCase());
export const runTag = `${RUN_PREFIX}${runId}`;
