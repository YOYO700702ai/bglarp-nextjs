import { taipeiDay } from './contract.mjs';

const ALLOWED_DAYS = new Set([1, 7, 30, 90]);

function shiftDay(day, delta) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

function numbers(row, keys) {
  return Object.fromEntries(keys.map((key) => [key, Number(row?.[key] || 0)]));
}

export async function readAnalyticsReport(db, { days = 7, now = new Date() } = {}) {
  if (!ALLOWED_DAYS.has(days)) throw new RangeError('Unsupported analytics range');
  if (!db) throw new Error('Analytics database unavailable');
  const to = taipeiDay(now);
  const from = shiftDay(to, 1 - days);
  const range = 'day >= ? AND day <= ?';
  const statement = (sql) => db.prepare(sql).bind(from, to);
  const results = await db.batch([
    db.prepare("SELECT value FROM analytics_metadata WHERE key = 'tracked_since'"),
    statement(`SELECT
      SUM(type = 'pageview') AS views,
      COUNT(DISTINCT day || ':' || visitor) AS visitorDays,
      SUM(type = 'click') AS clicks,
      SUM(type = 'click' AND target LIKE 'booking:%') AS bookingClicks
      FROM analytics_events WHERE ${range}`),
    statement(`SELECT day AS date, SUM(type = 'pageview') AS views,
      COUNT(DISTINCT visitor) AS visitors,
      SUM(type = 'click') AS clicks FROM analytics_events WHERE ${range}
      GROUP BY day ORDER BY day`),
    statement(`SELECT page AS path, COUNT(*) AS views,
      COUNT(DISTINCT day || ':' || visitor) AS visitors FROM analytics_events
      WHERE ${range} AND type = 'pageview' GROUP BY page ORDER BY views DESC, path LIMIT 100`),
    statement(`SELECT page AS path, COUNT(*) AS views,
      COUNT(DISTINCT day || ':' || visitor) AS visitors FROM analytics_events
      WHERE ${range} AND type = 'pageview' AND page LIKE '/scripts/%'
      GROUP BY page ORDER BY views DESC, path LIMIT 100`),
    statement(`SELECT target, page, COUNT(*) AS count FROM analytics_events
      WHERE ${range} AND type = 'click' GROUP BY target, page ORDER BY count DESC, target, page LIMIT 100`),
    statement(`SELECT source, COUNT(*) AS views FROM analytics_events
      WHERE ${range} AND type = 'pageview' GROUP BY source ORDER BY views DESC, source`),
    statement(`SELECT device, COUNT(*) AS views FROM analytics_events
      WHERE ${range} AND type = 'pageview' GROUP BY device ORDER BY views DESC, device`),
  ]);
  const rows = (index) => results[index]?.results || [];
  const trackedSince = rows(0)[0]?.value || null;
  const trackedDay = trackedSince ? taipeiDay(new Date(trackedSince)) : null;
  const byDay = new Map(rows(2).map((row) => [row.date, row]));
  const daily = Array.from({ length: days }, (_, index) => {
    const date = shiftDay(from, index);
    return {
      date,
      ...numbers(byDay.get(date), ['views', 'visitors', 'clicks']),
      unavailable: !trackedDay || date < trackedDay,
    };
  });
  return {
    timezone: 'Asia/Taipei', from, to, trackedSince,
    summary: numbers(rows(1)[0], ['views', 'visitorDays', 'clicks', 'bookingClicks']),
    daily,
    pages: rows(3).map((row) => ({ path: row.path, ...numbers(row, ['views', 'visitors']) })),
    scripts: rows(4).map((row) => ({ path: row.path, ...numbers(row, ['views', 'visitors']) })),
    clicks: rows(5).map((row) => ({ target: row.target, page: row.page, count: Number(row.count) })),
    sources: rows(6).map((row) => ({ source: row.source, views: Number(row.views) })),
    devices: rows(7).map((row) => ({ device: row.device, views: Number(row.views) })),
  };
}
