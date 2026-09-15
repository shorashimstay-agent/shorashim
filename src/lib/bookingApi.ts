import { AVAILABILITY_SNAPSHOT_URL, BOOKING_API_URL } from '../data/bookingConfig';
import type { StayType } from './stay';

export const bookingApiEnabled = Boolean(BOOKING_API_URL);

export interface Availability {
  /** First date covered (today in Israel). */
  from: string;
  /** Exclusive end of the covered window. */
  to: string;
  /** Nights that are taken. */
  blocked: Set<string>;
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

/** Minimal CSV parser: quoted fields may contain commas and doubled quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

/**
 * The published זמינות לאתר tab, which the backend rewrites on every calendar change:
 * a header row, then from, to, generatedAt and the comma-separated blocked nights.
 */
async function fetchSnapshot(): Promise<Availability> {
  const res = await fetchWithTimeout(AVAILABILITY_SNAPSHOT_URL, { cache: 'no-store' }, 8000);
  if (!res.ok) throw new Error(`snapshot ${res.status}`);
  const row = parseCsv(await res.text()).find((cells) => DATE_RE.test(cells[0] ?? ''));
  if (!row) throw new Error('snapshot unreadable');
  const [from, to, generatedAt, blocked = ''] = row;
  if (!DATE_RE.test(to)) throw new Error('snapshot unreadable');
  if (!(Date.now() - Date.parse(generatedAt) < SNAPSHOT_MAX_AGE_MS)) throw new Error('snapshot stale');
  return { from, to, blocked: new Set(blocked.split(',').filter((d) => DATE_RE.test(d))) };
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
  return { from: data.from, to: data.to, blocked: new Set<string>(data.blocked) };
}

export interface BookingRequest {
  stayType: StayType;
  checkIn: string;
  checkOut: string;
  adults: number;
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
      { method: 'POST', body: JSON.stringify({ action: 'request', requestId, ...request }) }
    );
  } catch {
    return { ok: false, error: 'network' };
  }
}
