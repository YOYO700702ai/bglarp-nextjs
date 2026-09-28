import {
  DEVICE_KEYS,
  SOURCE_KEYS,
  normalizePage,
  normalizeTarget,
  taipeiDay,
} from './contract.mjs';

const MAX_BODY_BYTES = 8 * 1024;
const MAX_BATCH_EVENTS = 10;
const MAX_VISITOR_EVENTS = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCES = new Set(SOURCE_KEYS);
const DEVICES = new Set(DEVICE_KEYS);
const BOT = /bot\b|crawler|spider|headless|lighthouse|facebookexternalhit|slurp|bingpreview|previewbot/i;
const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
};

function reply(status, code, extraHeaders = {}) {
  return new Response(code ? JSON.stringify({ error: code }) : null, {
    status,
    headers: {
      ...HEADERS,
      ...(code ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
      ...extraHeaders,
    },
  });
}

function allowedOrigin(url) {
  return url.origin === 'https://www.bglarp.com'
    || (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      && ['http:', 'https:'].includes(url.protocol));
}

function validObject(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every((key) => keys.includes(key));
}

async function readLimitedBody(request) {
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength)
    || Number(declaredLength) > MAX_BODY_BYTES)) throw new Error('invalid_body');
  if (!request.body) throw new Error('invalid_body');
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error('invalid_body');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function validateBody(body) {
  if (!validObject(body, ['visitorId', 'events']) || !UUID.test(body.visitorId || '')
    || !Array.isArray(body.events) || body.events.length < 1
    || body.events.length > MAX_BATCH_EVENTS) throw new Error('invalid_body');

  const events = body.events.map((event) => {
    if (!validObject(event, ['id', 'type', 'page', 'target', 'source', 'device'])
      || !UUID.test(event.id || '') || !['pageview', 'click'].includes(event.type)
      || !SOURCES.has(event.source) || !DEVICES.has(event.device)
      || typeof event.page !== 'string') throw new Error('invalid_event');
    const page = normalizePage(event.page);
    // The collector accepts canonical paths only, never raw URLs/query strings.
    if (!page || page !== event.page) throw new Error('invalid_event');
    let target = '';
    if (event.type === 'click') {
      target = typeof event.target === 'string' ? normalizeTarget(event.target) : null;
      if (!target || target !== event.target) throw new Error('invalid_event');
    } else if (event.target !== undefined) throw new Error('invalid_event');
    return { ...event, id: event.id.toLowerCase(), page, target };
  });
  return { visitorId: body.visitorId.toLowerCase(), events };
}

function offsetDay(day, delta) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

async function dailyVisitorKey(day, visitorId) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${day}:${visitorId}`));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

/** Called by the public Worker's exact /api/analytics/collect route. */
export async function handleAnalyticsCollect(request, env, { now = new Date() } = {}) {
  if (request.method !== 'POST') return reply(405, 'method_not_allowed', { Allow: 'POST' });
  const url = new URL(request.url);
  if (!allowedOrigin(url) || request.headers.get('origin') !== url.origin) return reply(403, 'forbidden');
  if (BOT.test(request.headers.get('user-agent') || '')) return reply(204);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
    return reply(415, 'unsupported_media_type');
  }

  let body;
  try {
    body = validateBody(await readLimitedBody(request));
  } catch {
    return reply(400, 'invalid_request');
  }
  if (!env?.ANALYTICS_DB) return reply(503, 'analytics_unavailable');

  try {
    const db = env.ANALYTICS_DB;
    const day = taipeiDay(now);
    const createdAt = now.toISOString();
    const visitor = await dailyVisitorKey(day, body.visitorId);
    const cleanup = await db.prepare('SELECT value FROM analytics_metadata WHERE key = ?')
      .bind('cleanup_day').first();
    const statements = body.events.map((event) => db.prepare(`
      INSERT INTO analytics_events (id, day, visitor, type, page, target, source, device, created_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?
      WHERE (SELECT COUNT(*) FROM analytics_events WHERE day = ? AND visitor = ?) < ?
      ON CONFLICT(id) DO NOTHING
    `).bind(event.id, day, visitor, event.type, event.page, event.target,
      event.source, event.device, createdAt, day, visitor, MAX_VISITOR_EVENTS));
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO analytics_metadata (key, value)
      SELECT 'tracked_since', ?
      WHERE NOT EXISTS (SELECT 1 FROM analytics_metadata WHERE key = 'tracked_since')
        AND EXISTS (SELECT 1 FROM analytics_events LIMIT 1)
    `).bind(createdAt));
    if (!cleanup || cleanup.value < day) {
      statements.push(db.prepare('DELETE FROM analytics_events WHERE day < ?').bind(offsetDay(day, -89)));
      statements.push(db.prepare(`
        INSERT INTO analytics_metadata (key, value) VALUES ('cleanup_day', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value WHERE value < excluded.value
      `).bind(day));
    }
    await db.batch(statements);
    return reply(204);
  } catch {
    // Never expose SQL, payloads, database identifiers, or infrastructure details.
    return reply(503, 'analytics_unavailable');
  }
}
