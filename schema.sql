CREATE TABLE IF NOT EXISTS access_keys (
  key_hash TEXT PRIMARY KEY,
  github_user_id INTEGER,
  claimed_at TEXT
);

CREATE INDEX IF NOT EXISTS access_keys_owner_idx
  ON access_keys (github_user_id);

CREATE TABLE IF NOT EXISTS relay_tickets (
  token_hash TEXT PRIMARY KEY,
  github_user_id INTEGER NOT NULL,
  target_url TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS relay_tickets_expiry_idx
  ON relay_tickets (expires_at);

-- Only these two hashes are accepted. Keep the original keys out of the public repo.
INSERT OR IGNORE INTO access_keys (key_hash) VALUES
  ('16516088a4b7ab31481b299c52b48258e6cdc703e4bd22608cf79317315ed1ac'),
  ('589fdefa83600c539ceb17a0b5c8b8cd34fe64f3e7f4732c640f2174c797bfe9');

