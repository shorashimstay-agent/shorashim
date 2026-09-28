// Minimal Google API client for the suite: refreshes an authorized-user token and calls REST.
import fs from 'node:fs';

interface TokenFile {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  token_uri?: string;
}

export class GoogleAccount {
  private access = '';
  private expires = 0;
  private email = '';

  constructor(
    readonly label: string,
    private readonly tokenFile: string
  ) {}

  private async token(): Promise<string> {
    if (this.access && Date.now() < this.expires - 60_000) return this.access;
    const t = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8')) as TokenFile;
    const res = await fetch(t.token_uri ?? 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: t.client_id,
        client_secret: t.client_secret,
        refresh_token: t.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const body = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
    if (!body.access_token) throw new Error(`${this.label}: token refresh failed (${body.error ?? res.status})`);
    this.access = body.access_token;
    this.expires = Date.now() + (body.expires_in ?? 3600) * 1000;
    return this.access;
  }

  async api<T = any>(method: string, url: string, opts: { query?: Record<string, string | number | boolean | undefined>; body?: unknown } = {}): Promise<T> {
    const u = new URL(url);
    for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) u.searchParams.set(k, String(v));
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(u, {
        method,
        headers: {
          Authorization: `Bearer ${await this.token()}`,
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
      if (res.status === 204) return {} as T;
      const text = await res.text();
      if ((res.status === 429 || res.status >= 500) && attempt < 4) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      if (!res.ok) throw new Error(`${this.label}: ${method} ${u.pathname} -> ${res.status} ${text.slice(0, 300)}`);
      return (text ? JSON.parse(text) : {}) as T;
    }
  }

  async whoami(): Promise<string> {
    if (!this.email) {
      const info = await this.api<{ email: string }>('GET', 'https://openidconnect.googleapis.com/v1/userinfo').catch(async () =>
        ({ email: (await this.api<{ emailAddress: string }>('GET', `${GMAIL}/profile`)).emailAddress })
      );
      this.email = info.email;
    }
    return this.email;
  }

  // ---- Calendar

  async events(calendarId: string, query: Record<string, string | number | boolean | undefined> = {}): Promise<CalendarEvent[]> {
    const out: CalendarEvent[] = [];
    let pageToken: string | undefined;
    do {
      const page = await this.api<{ items?: CalendarEvent[]; nextPageToken?: string }>('GET', `${CAL}/calendars/${encodeURIComponent(calendarId)}/events`, {
        query: { singleEvents: true, maxResults: 2500, ...query, pageToken },
      });
      out.push(...(page.items ?? []));
      pageToken = page.nextPageToken;
    } while (pageToken);
    return out;
  }

  insertEvent(calendarId: string, event: Partial<CalendarEvent>, sendUpdates = 'none'): Promise<CalendarEvent> {
    return this.api('POST', `${CAL}/calendars/${encodeURIComponent(calendarId)}/events`, { query: { sendUpdates }, body: event });
  }

  deleteEvent(calendarId: string, eventId: string, sendUpdates = 'none'): Promise<unknown> {
    return this.api('DELETE', `${CAL}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, { query: { sendUpdates } }).catch(
      (err: Error) => {
        if (!/-> (404|410)/.test(err.message)) throw err;
      }
    );
  }

  // ---- Gmail

  async messages(q: string): Promise<GmailMessage[]> {
    const list = await this.api<{ messages?: { id: string }[] }>('GET', `${GMAIL}/messages`, { query: { q, maxResults: 50, includeSpamTrash: false } });
    return Promise.all((list.messages ?? []).map((m) => this.message(m.id)));
  }

  async message(id: string): Promise<GmailMessage> {
    const raw = await this.api<any>('GET', `${GMAIL}/messages/${id}`, { query: { format: 'full' } });
    const headers: Record<string, string> = {};
    for (const h of raw.payload?.headers ?? []) headers[h.name.toLowerCase()] = h.value;
    const parts: Record<string, string> = {};
    const types: string[] = [];
    const walk = (p: any) => {
      if (p.mimeType) types.push(p.mimeType);
      if (p.body?.data && p.mimeType && !(p.mimeType in parts)) parts[p.mimeType] = Buffer.from(p.body.data, 'base64url').toString('utf8');
      (p.parts ?? []).forEach(walk);
    };
    walk(raw.payload ?? {});
    return { id, subject: headers.subject ?? '', from: headers.from ?? '', to: headers.to ?? '', text: parts['text/plain'] ?? '', html: parts['text/html'] ?? '', types };
  }

  trash(id: string): Promise<unknown> {
    return this.api('POST', `${GMAIL}/messages/${id}/trash`);
  }

  // ---- Sheets

  async values(sheetId: string, range: string): Promise<string[][]> {
    const r = await this.api<{ values?: string[][] }>('GET', `${SHEETS}/${sheetId}/values/${encodeURIComponent(range)}`, { query: { valueRenderOption: 'UNFORMATTED_VALUE' } });
    return r.values ?? [];
  }

  setValues(sheetId: string, range: string, values: unknown[][]): Promise<unknown> {
    return this.api('PUT', `${SHEETS}/${sheetId}/values/${encodeURIComponent(range)}`, { query: { valueInputOption: 'USER_ENTERED' }, body: { values } });
  }
}

export interface CalendarEvent {
  id: string;
  iCalUID: string;
  status?: string;
  summary?: string;
  description?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  attendees?: { email: string; responseStatus?: string }[];
  extendedProperties?: { shared?: Record<string, string>; private?: Record<string, string> };
}

export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  text: string;
  html: string;
  /** MIME types of every part, including attachments (a calendar invite carries text/calendar). */
  types: string[];
}

const CAL = 'https://www.googleapis.com/calendar/v3';
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';
const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';

/** Polls `fn` until it returns a truthy value, or fails with `what` after `timeoutMs`. */
export async function waitFor<T>(what: string, fn: () => Promise<T | undefined | null | false>, timeoutMs = 120_000, everyMs = 5_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  for (;;) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) {
      lastError = err;
    }
    if (Date.now() > deadline) throw new Error(`Timed out after ${timeoutMs / 1000}s waiting for: ${what}${lastError ? ` (last error: ${lastError})` : ''}`);
    await new Promise((r) => setTimeout(r, everyMs));
  }
}
