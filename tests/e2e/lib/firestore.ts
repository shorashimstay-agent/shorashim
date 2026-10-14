// Reads and deletes event-log documents in a backend's Firestore, as its service account, the same
// way apps-script/src/EventLog.js writes them (a JWT exchanged for an access token).
import crypto from 'node:crypto';
import type { BackendConfig } from './env';

let cached: { key: string; token: string; until: number } | null = null;

async function token(fs: NonNullable<BackendConfig['firestore']>): Promise<string> {
  if (cached && cached.key === fs.clientEmail && Date.now() < cached.until) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const part = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${part({ alg: 'RS256', typ: 'JWT', kid: fs.privateKeyId })}.${part({
    iss: fs.clientEmail,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = crypto.sign('sha256', Buffer.from(unsigned), fs.privateKey).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`firestore token: ${res.status}`);
  cached = { key: fs.clientEmail, token: (await res.json()).access_token, until: Date.now() + 50 * 60_000 };
  return cached.token;
}

async function call(cfg: BackendConfig, method: string, body: unknown): Promise<any> {
  const fs = cfg.firestore;
  if (!fs) throw new Error('this backend config has no firestore key');
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${fs.projectId}/databases/(default)/documents:${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token(fs)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`firestore ${method}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export interface LogEvent {
  name: string;
  /**
   * The fields as plain values (timestamps as ISO strings, maps as objects), with the unindexed
   * `data` map's fields alongside the top-level ones, as the event was recorded.
   */
  fields: Record<string, any>;
}

function event(doc: any): LogEvent {
  const top = Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, plain(v)]));
  const { data, ...rest } = top;
  return { name: doc.name, fields: { ...rest, ...(data ?? {}) } };
}

function plain(v: any): any {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, plain(x)]));
  return null;
}

/** Events whose `field` equals `value` (a string), up to `limit`. */
export async function logEvents(cfg: BackendConfig, field: string, value: string, limit = 200): Promise<LogEvent[]> {
  const rows = await call(cfg, 'runQuery', {
    structuredQuery: {
      from: [{ collectionId: 'events' }],
      where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
      limit,
    },
  });
  return rows
    .filter((r: any) => r.document)
    .map((r: any) => event(r.document));
}

/** Events recorded at or after `sinceIso`, oldest first, up to `limit`. */
export async function logEventsSince(cfg: BackendConfig, sinceIso: string, limit = 500): Promise<LogEvent[]> {
  const rows = await call(cfg, 'runQuery', {
    structuredQuery: {
      from: [{ collectionId: 'events' }],
      where: { fieldFilter: { field: { fieldPath: 'ts' }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: sinceIso } } },
      orderBy: [{ field: { fieldPath: 'ts' } }],
      limit,
    },
  });
  return rows
    .filter((r: any) => r.document)
    .map((r: any) => event(r.document));
}

export async function deleteLogEvents(cfg: BackendConfig, events: LogEvent[]): Promise<void> {
  for (let i = 0; i < events.length; i += 400) {
    await call(cfg, 'commit', { writes: events.slice(i, i + 400).map((e) => ({ delete: e.name })) });
  }
}
