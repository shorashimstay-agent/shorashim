// Talks to a deployed booking web app and to the owner's copies of its calendars and sheets.
import crypto from 'node:crypto';
import { type BackendConfig, e2e, RUN_PREFIX, snapshotCsvUrl } from './env';
import { type CalendarEvent, GoogleAccount, waitFor } from './google';

export const owner = new GoogleAccount('owner', e2e.owner.token);
export const guestA = e2e.guestA.token ? new GoogleAccount('guestA', e2e.guestA.token) : null;
export const guestB = e2e.guestB.token ? new GoogleAccount('guestB', e2e.guestB.token) : null;

/** Same as the script's sign_: HMAC-SHA256, web-safe base64 without padding. */
export function sign(cfg: BackendConfig, id: string): string {
  return crypto.createHmac('sha256', cfg.hmacSecret).update(id).digest('base64url');
}

/**
 * Google's redirect in front of Apps Script sometimes returns an HTML error page or turns a POST into
 * a GET (which answers with doGet's default). Retry until the answer has the shape the caller expects.
 */
async function call(cfg: BackendConfig, init: { query?: string; body?: unknown }, accept: (json: any) => boolean): Promise<any> {
  let last = '';
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      // Google sometimes never answers; give up on an attempt after a minute and retry.
      const res = await fetch(cfg.webAppUrl + (init.query ?? ''), init.body === undefined ? { signal: AbortSignal.timeout(60_000) } : {
        signal: AbortSignal.timeout(60_000),
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(init.body),
      });
      const text = await res.text();
      last = `${res.status} ${text.slice(0, 200)}`;
      const json = JSON.parse(text);
      if (accept(json)) return json;
    } catch (err) {
      last = String(err);
    }
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  throw new Error(`web app gave no usable answer: ${last}`);
}

const notDefault = (j: any) => !(j.ok === true && j.service);

export const webApp = (cfg: BackendConfig) => ({
  ping: () => call(cfg, { query: '?action=ping' }, (j) => j.service === 'shorashim-booking'),
  availability: () => call(cfg, { query: '?action=availability' }, (j) => Array.isArray(j.blocked)),
  /** `pricesVersion` is the prices version the caller expects, as a page would send it. */
  diag: (pricesVersion = '') => {
    const t = String(Date.now());
    const pv = pricesVersion ? `&pv=${encodeURIComponent(pricesVersion)}` : '';
    return call(cfg, { query: `?action=diag&t=${t}&sig=${sign(cfg, 'diag:' + t)}${pv}` }, (j) => Array.isArray(j.triggers));
  },
  post: (body: Record<string, unknown>) => call(cfg, { body }, notDefault),
  decide: (action: 'approve' | 'decline', id: string, sig = sign(cfg, id)) => call(cfg, { body: { action, id, sig } }, notDefault),
  fireSheetEdit: (row: number) => {
    const t = String(Date.now());
    return call(cfg, { body: { action: 'testFireSheetEdit', row, t, sig: sign(cfg, 'test:' + t) } }, (j) => 'confirmTicked' in j);
  },
  /** Staging only: the prices the web app uses instead of reading its prices sheet; null clears them. */
  setPrices: (file: unknown) => {
    const t = String(Date.now());
    return call(cfg, { body: { action: 'testSetPrices', file, t, sig: sign(cfg, 'test:' + t) } }, (j) => j.ok === false || 'version' in j || 'cleared' in j);
  },
  pruneDecisions: (refs: string[]) => {
    const t = String(Date.now());
    return call(cfg, { body: { action: 'pruneDecisions', refs, t, sig: sign(cfg, 'prune:' + t) } }, (j) => 'removed' in j);
  },
  /**
   * A console call signed with the HMAC secret, as tools and this suite may make it. The page itself
   * uses a session token from `consoleLogin` instead. The signature covers the operation and its
   * arguments; `sig` overrides it to test refusals.
   */
  console: (op: string, args: { id?: string; decision?: string } = {}, sig?: string) => {
    const t = String(Date.now());
    const body = { action: 'console', op, t, id: args.id ?? '', decision: args.decision ?? '' };
    return call(cfg, { body: { ...body, sig: sig ?? sign(cfg, ['console', t, op, body.id, body.decision].join(':')) } }, notDefault);
  },
  consoleLogin: (password: string) => call(cfg, { body: { action: 'console', op: 'login', password } }, notDefault),
  consoleWithToken: (op: string, token: string) => call(cfg, { body: { action: 'console', op, token } }, notDefault),
  /** Staging only: clears the console's wrong-password lockout. */
  resetConsoleLock: () => {
    const t = String(Date.now());
    return call(cfg, { body: { action: 'testResetConsoleLock', t, sig: sign(cfg, 'test:' + t) } }, (j) => 'reset' in j);
  },
  decideUrl: (id: string, sig = sign(cfg, id)) => `${cfg.webAppUrl}?action=decide&id=${encodeURIComponent(id)}&sig=${sig}`,
});

export async function snapshot(cfg: BackendConfig): Promise<{ from: string; to: string; generatedAt: string; blocked: string[] }> {
  const csv = await (await fetch(snapshotCsvUrl(cfg))).text();
  const cells = csv.split('\n')[1].split('","').map((c) => c.replace(/^"|"$/g, ''));
  return { from: cells[0], to: cells[1], generatedAt: cells[2], blocked: cells[3] ? cells[3].split(',') : [] };
}

// ---- Dates (Israel-local calendar dates as YYYY-MM-DD)

export function israelToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date());
}

export function addDays(date: string, n: number): string {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function nights(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) out.push(d);
  return out;
}

export const heDate = (d: string) => d.split('-').reverse().join('.');

export function randomPhone(): string {
  return '05' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
}

// ---- Owner-side lookups

export async function requestEvents(cfg: BackendConfig, text: string): Promise<CalendarEvent[]> {
  return owner.events(cfg.calendars.requests, { q: text, showDeleted: false });
}

export async function bookingEvents(cfg: BackendConfig, text: string): Promise<CalendarEvent[]> {
  return owner.events(cfg.calendars.bookings, { q: text, showDeleted: false });
}

/** The admin sheet's בקשות tab as objects, with the 1-based sheet row of each. */
export async function requestRows(cfg: BackendConfig): Promise<{ row: number; ref: string; status: string; name: string; action: string; confirm: boolean; id: string }[]> {
  const values = await owner.values(cfg.adminSheetId, 'בקשות!A2:Q200');
  return values.map((v, i) => ({
    row: i + 2,
    ref: String(v[0] ?? ''),
    status: String(v[1] ?? ''),
    name: String(v[7] ?? ''),
    action: String(v[13] ?? ''),
    confirm: v[14] === (true as unknown as string),
    id: String(v[16] ?? ''),
  }));
}

export async function bookingRows(cfg: BackendConfig): Promise<{ title: string; start: string; end: string; ref: string }[]> {
  const values = await owner.values(cfg.adminSheetId, 'הזמנות!A2:L200');
  return values.map((v) => ({ title: String(v[0] ?? ''), start: String(v[1] ?? ''), end: String(v[2] ?? ''), ref: String(v[10] ?? '') }));
}

/** The owner's notification email for a request reference, and the decision link inside it. */
export async function ownerNotification(cfg: BackendConfig, ref: string, timeoutMs = 120_000) {
  const to = cfg.notifyEmail ?? cfg.ownerEmail;
  const mail = await waitFor(`owner email for ${ref}`, async () => (await owner.messages(`to:${to} subject:${ref} newer_than:1d`))[0], timeoutMs);
  const link = mail.text.match(/https:\/\/script\.google\.com\/macros\/s\/[^\s]+action=decide[^\s]+/)?.[0];
  return { mail, link };
}

// ---- Cleanup

/**
 * Removes everything test runs created: staging events tagged E2E- (bookings deleted with
 * sendUpdates=all so guest copies go too), matching mails in the owner's and guests' inboxes, the
 * invites in guest calendars, and the references in the recent-decisions list.
 */
export async function cleanup(cfg: BackendConfig, tag = RUN_PREFIX): Promise<string[]> {
  const log: string[] = [];
  const from = new Date(Date.now() - 400 * 86400000).toISOString();
  const refs = new Set<string>();
  for (const key of ['requests', 'bookings', 'channels'] as const) {
    for (const ev of await owner.events(cfg.calendars[key], { q: tag, timeMin: from })) {
      const req = ev.extendedProperties?.shared?.request;
      if (req) refs.add(JSON.parse(req).ref);
      await owner.deleteEvent(cfg.calendars[key], ev.id, key === 'bookings' && ev.attendees?.length ? 'all' : 'none');
      log.push(`deleted ${key} event "${ev.summary}"`);
    }
  }
  if (refs.size) {
    const pruned = await webApp(cfg).pruneDecisions([...refs]);
    log.push(`pruned ${pruned.removed} decision(s)`);
  }
  const to = cfg.notifyEmail ?? cfg.ownerEmail;
  for (const m of await owner.messages(`to:${to} newer_than:30d`)) {
    if (m.text.includes(tag) || m.subject.includes(tag)) {
      await owner.trash(m.id);
      log.push(`trashed owner mail "${m.subject}"`);
    }
  }
  // Replies and bounces about test invites also land in the owner's own inbox.
  for (const m of await owner.messages(`"${tag}" newer_than:30d`)) {
    await owner.trash(m.id);
    log.push(`trashed owner mail "${m.subject}"`);
  }
  for (const [label, guest, conf] of [['guestA', guestA, e2e.guestA], ['guestB', guestB, e2e.guestB]] as const) {
    if (!guest) continue;
    for (const m of await guest.messages(`"${tag}" newer_than:30d`)) {
      await guest.trash(m.id);
      log.push(`trashed ${label} mail "${m.subject}"`);
    }
    if (conf.calendar) {
      for (const ev of await guest.events('primary', { q: tag, timeMin: from })) {
        await guest.deleteEvent('primary', ev.id);
        log.push(`deleted ${label} calendar copy "${ev.summary}"`);
      }
    }
  }
  return log;
}

export { waitFor };
