-- Dedicated website analytics database. No member or account records belong here.
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  day TEXT NOT NULL,
  visitor TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pageview', 'click')),
  page TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL CHECK (source IN ('direct', 'google', 'facebook', 'instagram', 'line', 'other')),
  device TEXT NOT NULL CHECK (device IN ('mobile', 'tablet', 'desktop')),
  created_at TEXT NOT NULL,
  CHECK ((type = 'pageview' AND target = '') OR (type = 'click' AND target <> ''))
);

CREATE INDEX IF NOT EXISTS analytics_events_day_visitor
  ON analytics_events (day, visitor);
CREATE INDEX IF NOT EXISTS analytics_events_day_type_page
  ON analytics_events (day, type, page);

CREATE TABLE IF NOT EXISTS analytics_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
