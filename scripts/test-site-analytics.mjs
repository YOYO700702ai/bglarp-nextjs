import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { handleAnalyticsCollect } from '../src/lib/analytics/ingest.mjs';
import { readAnalyticsReport } from '../src/lib/analytics/report.mjs';
import { normalizePage, normalizeTarget, sourceFromLocation, targetFromHref, taipeiDay } from '../src/lib/analytics/contract.mjs';

const schema = await readFile(new URL('../cloudflare/analytics/schema.sql', import.meta.url), 'utf8');
const ORIGIN = 'https://www.bglarp.com';
const BOOKING = ['booking_messenger', 'booking', 'booking:messenger', 'booking.messenger']
  .find((key) => normalizeTarget(key) === key);
assert.ok(BOOKING, 'The contract exposes a canonical booking target');
const SCRIPT = normalizePage('/scripts/' + encodeURIComponent('塑料溫室'));
assert.ok(SCRIPT);
let passed = 0;

function createDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(schema);
  let cleanupRuns = 0;
  function prepared(sql, values = []) {
    return {
      sql,
      bind(...args) { return prepared(sql, args); },
      async first(column) {
        const row = sqlite.prepare(sql).get(...values);
        return column ? row?.[column] ?? null : row ? { ...row } : null;
      },
      execute() {
        if (/^DELETE FROM analytics_events/.test(sql)) cleanupRuns += 1;
        const rows = sqlite.prepare(sql).all(...values).map((row) => ({ ...row }));
        const changes = Number(sqlite.prepare('SELECT changes() AS count').get().count);
        return { results: rows, success: true, meta: { changes } };
      },
    };
  }
  return {
    sqlite,
    prepare: prepared,
    get cleanupRuns() { return cleanupRuns; },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const result = statements.map((statement) => statement.execute());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    count() { return Number(sqlite.prepare('SELECT COUNT(*) AS n FROM analytics_events').get().n); },
  };
}

function pageview(page = '/') {
  return { id: randomUUID(), type: 'pageview', page, source: 'direct', device: 'desktop' };
}
function click(page = '/', target = BOOKING) {
  return { ...pageview(page), type: 'click', target };
}
function request(body, { origin = ORIGIN, url = `${ORIGIN}/api/analytics/collect`, headers = {} } = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
async function send(db, visitorId, events, now, options) {
  return handleAnalyticsCollect(request({ visitorId, events }, options), { ANALYTICS_DB: db }, { now: new Date(now) });
}
function pass(label) { passed += 1; console.log(`PASS ${label}`); }

assert.equal(taipeiDay(new Date('2026-09-28T15:59:59Z')), '2026-09-28');
assert.equal(taipeiDay(new Date('2026-09-28T16:00:00Z')), '2026-09-29');
pass('Taipei midnight boundary');

{
  const db = createDb();
  const visitor = randomUUID();
  const event = pageview();
  assert.equal((await send(db, visitor, [event, event], '2026-09-28T08:00:00Z')).status, 204);
  assert.equal((await send(db, visitor, [event], '2026-09-28T08:01:00Z')).status, 204);
  assert.equal(db.count(), 1, 'Repeated event IDs count once within/across batches');
  await send(db, visitor, [pageview()], '2026-09-28T09:00:00Z');
  await send(db, randomUUID(), [{ ...pageview(SCRIPT), source: 'google', device: 'mobile' }, click(SCRIPT)], '2026-09-28T10:00:00Z');
  await send(db, visitor, [pageview(SCRIPT)], '2026-09-28T16:00:00Z');
  const stored = db.sqlite.prepare('SELECT DISTINCT day, visitor FROM analytics_events ORDER BY day, visitor').all();
  assert.equal(stored.length, 3);
  assert.ok(stored.every((row) => row.visitor.length === 64 && row.visitor !== visitor));
  assert.equal(new Set(stored.map((row) => row.visitor)).size, 3, 'Daily hash changes at midnight');
  const report = await readAnalyticsReport(db, { days: 7, now: new Date('2026-09-29T03:00:00Z') });
  assert.deepEqual(report.summary, { views: 4, visitorDays: 3, clicks: 1, bookingClicks: 1 });
  assert.equal(report.trackedSince, '2026-09-28T08:00:00.000Z');
  assert.equal(report.daily.length, 7);
  assert.deepEqual(report.daily.slice(-2).map(({ date, views, visitors, clicks, unavailable }) => ({ date, views, visitors, clicks, unavailable })), [
    { date: '2026-09-28', views: 3, visitors: 2, clicks: 1, unavailable: false },
    { date: '2026-09-29', views: 1, visitors: 1, clicks: 0, unavailable: false },
  ]);
  assert.ok(report.daily.slice(0, -2).every((row) => row.unavailable && row.views === 0));
  assert.equal(report.scripts[0].path, SCRIPT);
  assert.equal(report.scripts[0].views, 2);
  assert.equal(report.clicks[0].target, BOOKING);
  assert.ok(report.sources.some((row) => row.source === 'google' && row.views === 1));
  assert.ok(report.devices.some((row) => row.device === 'mobile' && row.views === 1));
  assert.equal(db.cleanupRuns, 2, 'Retention cleanup runs once per receiving Taipei day');
  pass('Actual SQL deduplicates IDs, hashes daily visitors, groups rankings and excludes clicks from view counts');
  const later = await readAnalyticsReport(db, { days: 7, now: new Date('2026-10-01T03:00:00Z') });
  assert.deepEqual(later.daily.at(-1), { date: '2026-10-01', views: 0, visitors: 0, clicks: 0, unavailable: false });
  pass('Report distinguishes untracked dates from tracked dates with zero traffic');
  db.sqlite.close();
}

{
  const db = createDb();
  const visitor = randomUUID();
  await send(db, visitor, [click()], '2026-09-28T15:59:59Z');
  await send(db, visitor, [click()], '2026-09-28T16:00:00Z');
  const report = await readAnalyticsReport(db, { days: 7, now: new Date('2026-09-29T03:00:00Z') });
  assert.deepEqual(report.summary, { views: 0, visitorDays: 2, clicks: 2, bookingClicks: 2 });
  assert.deepEqual(report.daily.slice(-2).map(({ date, views, visitors, clicks }) => ({ date, views, visitors, clicks })), [
    { date: '2026-09-28', views: 0, visitors: 1, clicks: 1 },
    { date: '2026-09-29', views: 0, visitors: 1, clicks: 1 },
  ]);
  assert.deepEqual(report.pages, [], 'Click-only visitors do not become pageviews');
  assert.deepEqual(report.scripts, []);
  await send(db, visitor, [pageview()], '2026-09-29T03:01:00Z');
  const withView = await readAnalyticsReport(db, { days: 7, now: new Date('2026-09-29T03:02:00Z') });
  assert.equal(withView.summary.visitorDays, 2, 'A pageview and click by the same daily visitor remain one visitor');
  assert.equal(withView.pages[0].visitors, 1);
  pass('Click-only visitors count once per Taipei day while page/script rankings remain pageview-only');
  db.sqlite.close();
}

{
  const db = createDb();
  const visitor = randomUUID();
  const badBodies = [
    {}, { visitorId: 'not-a-uuid', events: [pageview()] },
    { visitorId: visitor, events: [] },
    { visitorId: visitor, events: Array.from({ length: 11 }, () => pageview()) },
    { visitorId: visitor, events: [pageview('/admin/scripts')] },
    { visitorId: visitor, events: [pageview('/auth/callback')] },
    { visitorId: visitor, events: [pageview('/api/scripts')] },
    { visitorId: visitor, events: [pageview('/?email=private@example.com')] },
    { visitorId: visitor, events: [pageview('https://www.bglarp.com/')] },
    { visitorId: visitor, events: [pageview('/unapproved-path')] },
    { visitorId: visitor, events: [pageview(), pageview('/api/scripts')] },
    { visitorId: visitor, events: [click('/', 'private@example.com')] },
    { visitorId: visitor, events: [{ ...pageview(), target: BOOKING }] },
    { visitorId: visitor, events: [{ ...pageview(), source: 'unapproved' }] },
    { visitorId: visitor, events: [{ ...pageview(), device: 'watch' }] },
    { visitorId: visitor, events: [{ ...pageview(), email: 'private@example.com' }] },
    { visitorId: visitor, events: [pageview()], ip: '127.0.0.1' },
    'malformed JSON', 'x'.repeat(8193),
  ];
  for (const body of badBodies) {
    const response = await handleAnalyticsCollect(request(body), { ANALYTICS_DB: db });
    assert.equal(response.status, 400, JSON.stringify(body).slice(0, 160));
    assert.match(response.headers.get('cache-control'), /no-store/);
  }
  assert.equal(db.count(), 0);
  assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM analytics_metadata').get().n, 0);
  pass('Rejects invalid batches, identifiers, paths, query strings, targets, personal-data fields and oversized bodies');

  const body = { visitorId: visitor, events: [pageview()] };
  assert.equal((await handleAnalyticsCollect(request(body, { origin: 'https://evil.example' }), { ANALYTICS_DB: db })).status, 403);
  assert.equal((await handleAnalyticsCollect(request(body, { origin: '' }), { ANALYTICS_DB: db })).status, 403);
  assert.equal((await handleAnalyticsCollect(request(body, { origin: 'https://preview.example', url: 'https://preview.example/api/analytics/collect' }), { ANALYTICS_DB: db })).status, 403);
  assert.equal((await handleAnalyticsCollect(new Request(`${ORIGIN}/api/analytics/collect`), { ANALYTICS_DB: db })).status, 405);
  assert.equal((await handleAnalyticsCollect(request(body, { headers: { 'Content-Type': 'text/plain' } }), { ANALYTICS_DB: db })).status, 415);
  assert.equal((await handleAnalyticsCollect(request(body, { headers: { 'Content-Length': '99999' } }), { ANALYTICS_DB: db })).status, 400);
  assert.equal((await handleAnalyticsCollect(request(body, { headers: { 'User-Agent': 'Googlebot/2.1' } }), { ANALYTICS_DB: db })).status, 204);
  assert.equal(db.count(), 0);
  assert.equal((await handleAnalyticsCollect(request(body, { origin: 'http://localhost:3000', url: 'http://localhost:3000/api/analytics/collect' }), { ANALYTICS_DB: db })).status, 204);
  assert.equal(db.count(), 1);
  pass('Enforces same-origin production/local requests, HTTP method/content type, and excludes obvious bots');
  db.sqlite.close();
}

{
  const visitor = randomUUID();
  const body = { visitorId: visitor, events: [pageview()] };
  const unavailable = await handleAnalyticsCollect(request(body), {});
  assert.equal(unavailable.status, 503);
  const broken = await handleAnalyticsCollect(request(body), { ANALYTICS_DB: { prepare() { throw new Error('secret SQL database error'); } } });
  assert.equal(broken.status, 503);
  assert.equal(await broken.text(), '{"error":"analytics_unavailable"}');
  assert.match(broken.headers.get('cache-control'), /no-store/);
  pass('Collector failures disclose no storage internals and never return a cached success');
  const atomic = createDb();
  atomic.sqlite.exec(`CREATE TRIGGER simulate_failed_storage BEFORE INSERT ON analytics_metadata
    BEGIN SELECT RAISE(ABORT, 'internal storage failure'); END;`);
  assert.equal((await handleAnalyticsCollect(request(body), { ANALYTICS_DB: atomic })).status, 503);
  assert.equal(atomic.count(), 0, 'The failed D1 batch must roll back earlier event inserts');
  atomic.sqlite.close();
  pass('A failed storage batch rolls back event writes atomically');
}

{
  const db = createDb();
  const visitor = randomUUID();
  for (let index = 0; index < 51; index += 1) {
    assert.equal((await send(db, visitor, Array.from({ length: 10 }, () => pageview()), '2026-09-29T08:00:00Z')).status, 204);
  }
  assert.equal(db.count(), 500);
  await send(db, randomUUID(), [pageview()], '2026-09-29T08:00:00Z');
  await send(db, visitor, [pageview()], '2026-09-30T08:00:00Z');
  assert.equal(db.count(), 502);
  assert.equal(db.cleanupRuns, 2);
  pass('SQL daily cap stops at 500 while permitting other visitors and the next Taipei day');
  db.sqlite.close();
}

{
  const db = createDb();
  const visitor = randomUUID();
  await send(db, visitor, [pageview()], '2026-06-30T08:00:00Z');
  await send(db, visitor, [pageview()], '2026-07-01T08:00:00Z');
  await send(db, visitor, [pageview()], '2026-09-28T08:00:00Z');
  const report = await readAnalyticsReport(db, { days: 90, now: new Date('2026-09-28T08:00:00Z') });
  assert.equal(report.from, '2026-07-01');
  assert.equal(report.to, '2026-09-28');
  assert.equal(report.daily.length, 90);
  assert.equal(report.summary.views, 2);
  assert.equal(db.count(), 2, 'Oldest allowed day remains, older event expires');
  assert.equal(report.trackedSince, '2026-06-30T08:00:00.000Z', 'Retention does not reset original tracking start');
  for (const days of [0, 2, 31, 91, '7', NaN]) {
    await assert.rejects(readAnalyticsReport(db, { days }), RangeError);
  }
  const empty = createDb();
  const emptyReport = await readAnalyticsReport(empty, { days: 1, now: new Date('2026-09-28T08:00:00Z') });
  assert.equal(emptyReport.trackedSince, null);
  assert.equal(emptyReport.daily[0].unavailable, true);
  assert.deepEqual(emptyReport.summary, { views: 0, visitorDays: 0, clicks: 0, bookingClicks: 0 });
  pass('90-day inclusive retention/range, tracking-start preservation and empty collection state');
  empty.sqlite.prepare('INSERT INTO analytics_metadata (key,value) VALUES (?,?)')
    .run('tracked_since', '2026-09-27T16:00:00.000Z');
  const enabledReport = await readAnalyticsReport(empty, { days: 7, now: new Date('2026-09-28T08:00:00Z') });
  assert.equal(enabledReport.daily.at(-1).unavailable, false, 'An initialized zero-traffic day is available');
  assert.equal(enabledReport.daily.at(-2).unavailable, true);
  await send(empty, visitor, [pageview()], '2026-09-29T08:00:00Z');
  const initialized = await readAnalyticsReport(empty, { days: 7, now: new Date('2026-09-29T08:00:00Z') });
  assert.equal(initialized.trackedSince, '2026-09-27T16:00:00.000Z', 'Fallback initialization preserves the deployment start');
  pass('Deployment initialization records available zero traffic before the first visitor');
  empty.sqlite.close();
  db.sqlite.close();
}

{
  const source = await readFile(new URL('../src/app/api/admin/analytics/route.js', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('export async function GET'));
  assert.ok(handler.indexOf('await requireScriptAdmin()') < handler.indexOf('getCloudflareContext()'));
  assert.ok(handler.indexOf('await requireScriptAdmin()') < handler.indexOf('readAnalyticsReport('));
  assert.match(handler, /adminJson\(await readAnalyticsReport/);
  assert.match(handler, /scriptAdminErrorResponse\(error\)/);
  assert.match(source, /dynamic = 'force-dynamic'/);
  pass('Report API authenticates staff before accessing D1 and retains private/no-store response helpers');
}

{
  assert.equal(sourceFromLocation(`${ORIGIN}/?utm_source=google&email=private`, '', ORIGIN), 'google');
  assert.equal(sourceFromLocation(`${ORIGIN}/`, 'https://l.facebook.com/path?private=secret', ORIGIN), 'facebook');
  assert.equal(sourceFromLocation(`${ORIGIN}/`, 'https://www.google.com/search?q=private', ORIGIN), 'google');
  assert.equal(sourceFromLocation(`${ORIGIN}/`, `${ORIGIN}/guide`, ORIGIN), 'direct');
  assert.equal(sourceFromLocation(`${ORIGIN}/?utm_source=private@example.com`, '', ORIGIN), 'other');
  assert.equal(targetFromHref('tel:0422250020', ORIGIN), 'booking:phone');
  assert.equal(targetFromHref('https://m.me/bglarp.studio', ORIGIN), 'booking:messenger');
  assert.equal(targetFromHref('https://lin.ee/S61LL0m', ORIGIN), 'line:friend');
  assert.equal(targetFromHref('/#scripts-limited', ORIGIN), 'tab:activity');
  assert.equal(targetFromHref(`${ORIGIN}/team-building#inquiry`, ORIGIN), null);
  assert.equal(normalizeTarget('booking:facebook'), 'booking:facebook');
  assert.equal(targetFromHref('/admin/scripts', ORIGIN), null);
  assert.equal(targetFromHref(`${ORIGIN}/scripts/${encodeURIComponent('塑料溫室')}`, ORIGIN), `script:${SCRIPT}`);
  assert.equal(targetFromHref('https://unrelated.example/private', ORIGIN), null);
  assert.equal(normalizePage('/scripts/%2E%2E'), null);
  assert.equal(normalizePage('/scripts/name%3Fsecret=value'), null);
  pass('Source/target classification exposes only enumerated labels and approved public content');
}

console.log(`PASS ${passed} analytics checks using the actual D1 schema on SQLite`);
