// Firestore over plain HTTPS, for the three things the game keeps there:
// the admin's settings (playSettings/main), the emails players leave
// (playLeads) and a record of each finished game (playGames). Using the REST
// API keeps the Firestore SDK out of the page.
import { firebaseConfig as cfg } from './config.js';

const DOCS = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents`;

const enc = (v) => {
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } };
  return { mapValue: { fields: toFields(v) } };
};
export const toFields = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [k, enc(v)]));
const dec = (v) => {
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return fromFields(v.mapValue.fields);
  return null;
};
export const fromFields = (fields = {}) => Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, dec(v)]));

async function call(method, url, token, body) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 9000);
  try {
    const res = await fetch(url, {
      method, signal: ctl.signal,
      headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404) return null;
    if (!res.ok) throw Object.assign(new Error(`Firestore answered ${res.status}`), { status: res.status });
    return await res.json();
  } finally { clearTimeout(timer); }
}
const keyed = (url) => `${url}${url.includes('?') ? '&' : '?'}key=${cfg.apiKey}`;

/** Reads one document as a plain object, or null if there is none. */
export async function docGet(path, token) {
  const doc = await call('GET', keyed(`${DOCS}/${path}`), token);
  return doc ? fromFields(doc.fields) : null;
}
/** Creates or replaces a document. */
export const docSet = (path, obj, token) => call('PATCH', keyed(`${DOCS}/${path}`), token, { fields: toFields(obj) });
/** Creates a document with a chosen id; fails if it already exists. */
export const docCreate = (collection, id, obj, token) => call('POST', keyed(`${DOCS}/${collection}?documentId=${encodeURIComponent(id)}`), token, { fields: toFields(obj) });
/** Lists a collection, newest first when `orderBy` says so. */
export async function docList(collection, token, { pageSize = 100, orderBy = '' } = {}) {
  const out = await call('GET', keyed(`${DOCS}/${collection}?pageSize=${pageSize}${orderBy ? `&orderBy=${encodeURIComponent(orderBy)}` : ''}`), token);
  return (out?.documents || []).map((doc) => ({ id: doc.name.split('/').pop(), ...fromFields(doc.fields) }));
}
