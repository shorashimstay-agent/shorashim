import { BOOKING_API_URL } from '../data/bookingConfig';
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

/**
 * Google's redirects in front of Apps Script occasionally fail: the response is an HTML error
 * page, or a POST arrives as a GET and returns the script's default reply. Every call is
 * retried until the response has the expected shape. Requests are safe to repeat because they
 * carry a requestId the server deduplicates on.
 */
async function callApi(isExpected: (data: any) => boolean, init?: RequestInit, query = ''): Promise<any> {
  let lastError: unknown = new Error('unexpected response');
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
    try {
      const res = await fetch(`${BOOKING_API_URL}${query}`, init);
      const data = await res.json();
      if (isExpected(data)) return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function fetchAvailability(): Promise<Availability> {
  const data = await callApi((d) => (d?.ok === true && Array.isArray(d.blocked)) || d?.ok === false, undefined, '?action=availability');
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
      (d) => (d?.ok === true && typeof d.ref === 'string') || (d?.ok === false && typeof d.error === 'string'),
      { method: 'POST', body: JSON.stringify({ action: 'request', requestId, ...request }) }
    );
  } catch {
    return { ok: false, error: 'network' };
  }
}
