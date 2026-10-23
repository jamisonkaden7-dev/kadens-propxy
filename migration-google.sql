-- Apply this once to the original database, before schema.sql.
-- It preserves all existing key claims.
ALTER TABLE access_keys ADD COLUMN google_sub TEXT;
