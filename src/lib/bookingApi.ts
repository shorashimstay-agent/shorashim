import { AVAILABILITY_SNAPSHOT_URL, BOOKING_API_URL } from '../data/bookingConfig';
import { parseCsv } from './csv';
import { getPricesVersion, parseSpans, spansOfNights, stayRange, type Span, type StayType } from './stay';

export const bookingApiEnabled = Boolean(BOOKING_API_URL);

export interface Availability {
  /** First date covered (today in Israel). */
  from: string;
  /** Exclusive end of the covered window. */
  to: string;
  /** Nights a couple stay cannot take. */
  blocked: Set<string>;
  /** The time taken, sorted: which packages fit a date (shared/rules.js, "Spans"). */
  busy: Span[];
}

/** An answer's busy spans; from a backend that sends none, the taken nights as couple stays. */
function busyOf(spans: unknown, blocked: Set<string>): Span[] {
  if (Array.isArray(spans)) return spans.filter((sp) => sp && typeof sp.start === 'string' && typeof sp.end === 'string');
  if (typeof spans === 'string' && spans) return parseSpans(spans);
  return spansOfNights(blocked);
}

interface RetryPolicy {
  attempts: number;
  /** Give up on a single attempt after this long; Google sometimes never answers. */
  timeoutMs: number;
  /** Stop retrying once this much time has passed in total. */
  deadlineMs: number;
  delayMs: (attempt: number) => number;
}

// The script itself answers in about 2 seconds, but Google sometimes drops a reply without closing
// the connection. Short per-attempt timeouts recover quickly; retries are safe because the server
// answers in_progress or the stored result for a request it has already seen.
const READ_POLICY: RetryPolicy = { attempts: 5, timeoutMs: 10_000, deadlineMs: 45_000, delayMs: (a) => 500 * a };
// The live check runs while the guest waits on the button, so it gives up sooner; a failed check
// never reads as available (useBookingForm).
const CHECK_POLICY: RetryPolicy = { attempts: 4, timeoutMs: 10_000, deadlineMs: 25_000, delayMs: (a) => 500 * a };
const WRITE_POLICY: RetryPolicy = { attempts: 15, timeoutMs: 10_000, deadlineMs: 90_000, delayMs: (a) => Math.min(1000 * a, 3000) };

async function fetchWithTimeout(url: string, init: RequestInit | undefined, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Google's redirects in front of Apps Script occasionally fail: the response is an HTML error
 * page, a POST arrives as a GET and returns the script's default reply, or nothing comes back at
 * all. Every call is retried until the response has the expected shape. Requests are safe to repeat
 * because they carry a requestId: the server runs the work once, answers in_progress while it is
 * still running, and returns the stored result afterwards.
 */
async function callApi(isExpected: (data: any) => boolean, policy: RetryPolicy, init?: RequestInit, query = ''): Promise<any> {
  const started = Date.now();
  let lastError: unknown = new Error('unexpected response');
  for (let attempt = 0; attempt < policy.attempts; attempt++) {
    if (attempt) {
      if (Date.now() - started > policy.deadlineMs) break;
      await new Promise((resolve) => setTimeout(resolve, policy.delayMs(attempt)));
    }
    try {
      const res = await fetchWithTimeout(`${BOOKING_API_URL}${query}`, init, policy.timeoutMs);
      const data = await res.json();
      if (isExpected(data)) return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SNAPSHOT_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * The published זמינות לאתר tab, which the backend rewrites on every calendar change:
 * a header row, then from, to, generatedAt, the comma-separated blocked nights and the busy spans.
 */
async function fetchSnapshot(): Promise<Availability> {
  const res = await fetchWithTimeout(AVAILABILITY_SNAPSHOT_URL, { cache: 'no-store' }, 8000);
  if (!res.ok) throw new Error(`snapshot ${res.status}`);
  const row = parseCsv(await res.text()).find((cells) => DATE_RE.test(cells[0] ?? ''));
  if (!row) throw new Error('snapshot unreadable');
  const [from, to, generatedAt, blockedText = '', busyText] = row;
  if (!DATE_RE.test(to)) throw new Error('snapshot unreadable');
  if (!(Date.now() - Date.parse(generatedAt) < SNAPSHOT_MAX_AGE_MS)) throw new Error('snapshot stale');
  const blocked = new Set(blockedText.split(',').filter((d) => DATE_RE.test(d)));
  // A snapshot written before the spans has no busy column; its nights stand in for them.
  return { from, to, blocked, busy: busyOf(busyText === undefined ? undefined : busyText, blocked) };
}

export async function fetchAvailability(): Promise<Availability> {
  if (AVAILABILITY_SNAPSHOT_URL) {
    try {
      return await fetchSnapshot();
    } catch {
      // Fall back to asking the backend directly.
    }
  }
  const data = await callApi((d) => (d?.ok === true && Array.isArray(d.blocked)) || d?.ok === false, READ_POLICY, undefined, '?action=availability');
  if (!data.ok) throw new Error(data.error);
  const blocked = new Set<string>(data.blocked);
  return { from: data.from, to: data.to, blocked, busy: busyOf(data.busy, blocked) };
}

export interface DatesCheck {
  free: boolean;
  /** Taken nights within the requested range. */
  conflicts: string[];
  /** The window the answer covers, with every taken night in it (for nearby alternatives). */
  availability: Availability;
}

/**
 * Asks the web app whether the stay fits right now, from the calendars rather than the snapshot.
 * Throws when there is no answer.
 */
export async function checkDates(stayType: StayType, checkIn: string, checkOut: string): Promise<DatesCheck> {
  const { start, end } = stayRange(stayType, checkIn, checkOut);
  const stay = `&stayType=${encodeURIComponent(stayType)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`;
  const data = await callApi(
    // A server_error (say, a calendar hiccup) is retried like a lost reply; 'invalid' is final.
    (d) => (d?.ok === true && typeof d.free === 'boolean' && Array.isArray(d.blocked)) || (d?.ok === false && typeof d.error === 'string' && d.error !== 'server_error'),
    CHECK_POLICY,
    undefined,
    `?action=check&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}${stay}`
  );
  if (!data.ok) throw new Error(data.error);
  const blocked = new Set<string>(data.blocked);
  return { free: data.free, conflicts: data.conflicts ?? [], availability: { from: data.from, to: data.to, blocked, busy: busyOf(data.busy, blocked) } };
}

export interface BookingRequest {
  stayType: StayType;
  checkIn: string;
  checkOut: string;
  adults: number;
  /** Bride-day packages: people present during the day, the bride included. */
  participants?: number;
  name: string;
  phone: string;
  email: string;
  notes: string;
  website: string;
  recaptchaToken: string;
}

export interface BookingRequestSuccess {
  ok: true;
  ref: string;
  holdHours: number;
}

export interface BookingRequestFailure {
  ok: false;
  error: 'invalid' | 'unavailable' | 'captcha' | 'rate_limited' | 'server_error' | 'bad_request' | 'network';
  fields?: Record<string, string>;
  nights?: string[];
}

export type BookingRequestResult = BookingRequestSuccess | BookingRequestFailure;

export async function submitBookingRequest(request: BookingRequest): Promise<BookingRequestResult> {
  const requestId = crypto.randomUUID();
  try {
    // No custom headers: a text/plain body keeps this a simple CORS request, which Apps Script can answer.
    return await callApi(
      (d) => (d?.ok === true && typeof d.ref === 'string') || (d?.ok === false && typeof d.error === 'string' && d.error !== 'in_progress'),
      WRITE_POLICY,
      // pricesVersion tells the web app which prices the page showed (see prices.ts).
      { method: 'POST', body: JSON.stringify({ action: 'request', requestId, pricesVersion: getPricesVersion(), ...request }) }
    );
  } catch {
    return { ok: false, error: 'network' };
  }
}
