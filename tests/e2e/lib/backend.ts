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
  let polls = 0;
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
      // A retry that reaches a call still running (Google lost the first reply) gets in_progress; the
      // answer comes once it finishes, as the owner console polls for it. Not an attempt of its own.
      if (json?.ok === false && json.error === 'in_progress' && polls++ < 12) {
        attempt--;
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
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
  /** The live check the site runs before the details: nights [start, end), straight from the calendars. */
  check: (start: string, end: string) => call(cfg, { query: `?action=check&start=${start}&end=${end}` }, (j) => typeof j.free === 'boolean' || j.ok === false),
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
  /** Staging only: removes the ביטולים lines whose guest name carries `tag`. */
  pruneCancellations: (tag: string) => {
    const t = String(Date.now());
    // A backend without the hook answers bad_request: accept it, so the rest of the cleanup still runs.
    return call(cfg, { body: { action: 'testPruneCancellations', tag, t, sig: sign(cfg, 'test:' + t) } }, (j) => 'removed' in j || j.ok === false);
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
  console: (op: string, args: { id?: string; decision?: string; args?: Record<string, unknown> } = {}, sig?: string) => {
    const t = String(Date.now());
    const body: Record<string, unknown> = { action: 'console', op, t, id: args.id ?? '', decision: args.decision ?? '' };
    // Structured arguments (closing dates) are covered by the signature as JSON, as consoleSigned_ does.
    let signed = ['console', t, op, body.id, body.decision].join(':');
    if (args.args) {
      body.args = args.args;
      signed += ':' + JSON.stringify(args.args);
    }
    return call(cfg, { body: { ...body, sig: sig ?? sign(cfg, signed) } }, notDefault);
  },
  consoleLogin: (password: string) => call(cfg, { body: { action: 'console', op: 'login', password } }, notDefault),
  consoleWithToken: (op: string, token: string) => call(cfg, { body: { action: 'console', op, token } }, notDefault),
  /** Staging only: the event log's test hook (flush, break, repair, fill, status; EventLog.js testEventLog_). */
  eventLog: (op: 'flush' | 'break' | 'repair' | 'fill' | 'status', count?: number) => {
    const t = String(Date.now());
    return call(cfg, { body: { action: 'testEventLog', op, count, t, sig: sign(cfg, 'test:' + t) } }, (j) => 'status' in j || j.ok === false);
  },
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

/** The admin sheet's ביטולים tab (the cancellations log) as objects. */
export async function cancellationRows(cfg: BackendConfig): Promise<{ ref: string; name: string; start: string; by: string; fee: string; reason: string; emailed: string; id: string }[]> {
  const values = await owner.values(cfg.adminSheetId, 'ביטולים!A2:P500');
  return values.map((v) => ({
    ref: String(v[1] ?? ''),
    name: String(v[2] ?? ''),
    start: String(v[6] ?? ''),
    by: String(v[11] ?? ''),
    fee: String(v[12] ?? ''),
    reason: String(v[13] ?? ''),
    emailed: String(v[14] ?? ''),
    id: String(v[15] ?? ''),
  }));
}

export async function bookingRows(cfg: BackendConfig): Promise<{ title: string; start: string; end: string; ref: string }[]> {
  const values = await owner.values(cfg.adminSheetId, 'הזמנות!A2:L200');
  return values.map((v) => ({ title: String(v[0] ?? ''), start: String(v[1] ?? ''), end: String(v[2] ?? ''), ref: String(v[10] ?? '') }));
}

/**
 * The owner's notification email for a request reference, the console link inside it, and the
 * request's event id from that link.
 */
export async function ownerNotification(cfg: BackendConfig, ref: string, timeoutMs = 120_000) {
  const to = cfg.notifyEmail ?? cfg.ownerEmail;
  const mail = await waitFor(`owner email for ${ref}`, async () => (await owner.messages(`to:${to} subject:${ref} newer_than:1d`))[0], timeoutMs);
  const link = mail.text.match(/https:\/\/shorashimstay\.com\/admin\/\?request=[^\s]+/)?.[0];
  const id = link ? new URL(link).searchParams.get('request') ?? undefined : undefined;
  return { mail, link, id };
}

// ---- Cleanup

const CANCELLATION = /cancel|בוטל/i;

/**
 * Removes everything test runs created: staging events tagged E2E- (bookings deleted with
 * sendUpdates=all so guest copies go too), matching mails in the owner's and guests' mailboxes
 * (inbox, sent and spam; they go to the trash, which Gmail empties after 30 days), the invites in
 * guest calendars, and the references in the recent-decisions list.
 *
 * Deleting a booking with a guest makes Google send that guest a cancellation, which arrives after
 * the deletion. The cleanup waits for those (up to `waitMs`) and trashes them too, then checks that
 * nothing tagged is left; anything still there is logged as LEFT OVER, and the next run's preflight
 * cleanup removes it.
 */
export async function cleanup(cfg: BackendConfig, tag = RUN_PREFIX, waitMs = 180_000): Promise<string[]> {
  const log: string[] = [];
  const from = new Date(Date.now() - 400 * 86400000).toISOString();
  const refs = new Set<string>();
  const guests = [
    ['guestA', guestA, e2e.guestA],
    ['guestB', guestB, e2e.guestB],
  ] as const;
  // Cancellations still to arrive, per guest address (both guests can share one mailbox).
  const expected: Record<string, number> = {};
  for (const key of ['requests', 'bookings', 'channels'] as const) {
    for (const ev of await owner.events(cfg.calendars[key], { q: tag, timeMin: from })) {
      const req = ev.extendedProperties?.shared?.request;
      if (req) refs.add(JSON.parse(req).ref);
      const notify = key === 'bookings' && !!ev.attendees?.length;
      await owner.deleteEvent(cfg.calendars[key], ev.id, notify ? 'all' : 'none');
      log.push(`deleted ${key} event "${ev.summary}"`);
      if (!notify) continue;
      for (const a of ev.attendees ?? []) {
        const email = (a.email ?? '').toLowerCase();
        if (guests.some(([, account, conf]) => account && conf.email.toLowerCase() === email)) expected[email] = (expected[email] ?? 0) + 1;
      }
    }
  }
  if (refs.size) {
    const pruned = await webApp(cfg).pruneDecisions([...refs]);
    log.push(`pruned ${pruned.removed} decision(s)`);
  }
  // Cancelled test bookings have no event left; their only trace is a ביטולים line.
  const cancelled = await webApp(cfg).pruneCancellations(tag);
  if (cancelled.ok === false) log.push(`LEFT OVER: ביטולים lines (the backend answered ${cancelled.error})`);
  else if (cancelled.removed) log.push(`removed ${cancelled.removed} cancellation line(s)`);
  for (const [label, guest, conf] of guests) {
    if (!guest || !conf.calendar) continue;
    for (const ev of await guest.events('primary', { q: tag, timeMin: from })) {
      await guest.deleteEvent('primary', ev.id);
      log.push(`deleted ${label} calendar copy "${ev.summary}"`);
    }
  }

  const to = cfg.notifyEmail ?? cfg.ownerEmail;
  const seen = new Set<string>();
  const got: Record<string, number> = {};
  /** Trashes every tagged mail in every mailbox, counting the guests' cancellations by recipient. */
  const sweep = async () => {
    const mailboxes: [string, GoogleAccount, string][] = [
      ['owner', owner, `to:${to} newer_than:30d`],
      // Replies and bounces about test invites, and the sent copies, are in the owner's mailbox too.
      ['owner', owner, `"${tag}" newer_than:30d`],
      ...guests.filter(([, g]) => g).map(([label, g]) => [label, g!, `"${tag}" newer_than:30d`] as [string, GoogleAccount, string]),
    ];
    for (const [label, account, q] of mailboxes) {
      for (const m of await account.messages(q, { spam: true })) {
        if (!(m.text.includes(tag) || m.subject.includes(tag))) continue;
        const key = `${label}:${m.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (CANCELLATION.test(m.subject)) {
          for (const email of Object.keys(expected)) if (m.to.toLowerCase().includes(email)) got[email] = (got[email] ?? 0) + 1;
        }
        await account.trash(m.id);
        log.push(`trashed ${label} mail "${m.subject}"`);
      }
    }
  };
  const deadline = Date.now() + waitMs;
  for (;;) {
    await sweep();
    const waiting = Object.keys(expected).filter((k) => (got[k] ?? 0) < expected[k]);
    if (!waiting.length || Date.now() > deadline) {
      for (const k of waiting) log.push(`LEFT OVER: ${k} got ${got[k] ?? 0} of ${expected[k]} cancellation mail(s) within ${waitMs / 1000}s`);
      break;
    }
    await new Promise((r) => setTimeout(r, 10_000));
  }
  // A late duplicate (a second shared mailbox, a reply) is caught by one more look.
  await sweep();
  for (const [label, account] of [['owner', owner], ...guests.filter(([, g]) => g).map(([l, g]) => [l, g!])] as [string, GoogleAccount][]) {
    const left = (await account.messages(`"${tag}" newer_than:30d`, { spam: true })).filter((m) => m.text.includes(tag) || m.subject.includes(tag));
    for (const m of left) log.push(`LEFT OVER: ${label} mail "${m.subject}"`);
  }
  return log;
}

export { waitFor };
