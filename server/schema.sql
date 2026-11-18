-- The family photos store (Cloudflare D1, free plan).
-- A gift is a set of photos with a long random id; the id goes in the gift link.
CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

-- Each photo is a shrunk JPEG kept as base64 text, with the date printed under it.
CREATE TABLE IF NOT EXISTS photos (
  gift_id TEXT NOT NULL REFERENCES gifts (id),
  n INTEGER NOT NULL CHECK (n BETWEEN 1 AND 10),
  date_label TEXT NOT NULL,
  jpeg TEXT NOT NULL,
  PRIMARY KEY (gift_id, n)
);

-- The daily cap on new photo sets counts recent rows by time.
CREATE INDEX IF NOT EXISTS gifts_by_time ON gifts (created_at);
