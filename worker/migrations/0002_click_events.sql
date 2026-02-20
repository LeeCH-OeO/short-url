CREATE TABLE IF NOT EXISTS click_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  short_id TEXT NOT NULL,
  country TEXT,
  region TEXT,
  city TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (short_id) REFERENCES urls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_click_events_short_created_at
  ON click_events (short_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_events_short_country
  ON click_events (short_id, country);
