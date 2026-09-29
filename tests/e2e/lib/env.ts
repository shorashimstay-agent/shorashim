// Local settings for the regression suite. Everything account-specific lives outside this public
// repo, in ~/.config/gcloud/shorashim/e2e-config.json (see tests/e2e/PLAN.md).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
  testHooks?: boolean;
  /** Staging only: the /admin console password, so the suite can log in (production keeps only a hash). */
  consolePassword?: string;
}

interface E2EConfig {
  owner: { token: string };
  guestA: Guest;
  guestB: Guest;
  stagingConfig: string;
  productionConfig: string;
}

const CONFIG_FILE = path.join(os.homedir(), '.config/gcloud/shorashim/e2e-config.json');

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

export const e2e = readJson<E2EConfig>(CONFIG_FILE);
export const staging = readJson<BackendConfig>(e2e.stagingConfig);
export const production = readJson<BackendConfig>(e2e.productionConfig);

export function snapshotCsvUrl(cfg: BackendConfig): string {
  return `https://docs.google.com/spreadsheets/d/${cfg.availabilitySheetId}/gviz/tq?tqx=out:csv&range=A1:D2&headers=0`;
}

/** Every run tags what it creates with this, so cleanup can find it even after a crash. */
export const RUN_PREFIX = 'E2E-';
export const runId = (process.env.E2E_RUN_ID ??= Date.now().toString(36).slice(-6).toUpperCase());
export const runTag = `${RUN_PREFIX}${runId}`;
