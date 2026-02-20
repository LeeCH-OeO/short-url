CREATE TABLE IF NOT EXISTS urls (
  id TEXT PRIMARY KEY,
  destination_url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_urls (
  owner_id TEXT NOT NULL,
  short_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (owner_id, short_id),
  FOREIGN KEY (short_id) REFERENCES urls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_urls_owner_created_at
  ON user_urls (owner_id, created_at DESC);
